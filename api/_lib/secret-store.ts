import * as redis from 'redis';
import * as crypto from "crypto";
import {CipherGCMTypes} from "crypto";
import * as argon2 from "argon2";
import cryptoRandomString from "crypto-random-string";
import {
    SECRET_ID_LENGTH,
    SECRET_PASSPHRASE_MAX_ATTEMPTS,
    SECRET_PASSWORD_LENGTH,
    SECRET_TOMBSTONE_TTL,
} from "./config.js";

const ENCRYPTION_ALGORITHM: CipherGCMTypes = 'aes-256-gcm';

const secretStore = await redis.createClient({url: process.env.REDIS_URL}).connect();
const secretStoreKeyFor = (id: string) => `secret:${id}`;

export async function addSecret(params: {
    data: SecretData,
    ttl: number,
    passphrase?: string
}): Promise<{ id: SecretId, password: string }> {

    const secretId = cryptoRandomString({length: SECRET_ID_LENGTH, type: "alphanumeric"});

    const encryptionPassword = cryptoRandomString({length: SECRET_PASSWORD_LENGTH, type: 'alphanumeric'});

    const secret: Secret = {
        data: encrypt(params.data, encryptionPassword),
        passphrase: params.passphrase ? {
            hash: await calculateArgon2Hash(params.passphrase),
            attempts: 0,
        } : undefined,
        meta: {
            status: 'UNREAD',
            expiresAt: Math.floor(Date.now() / 1000 + params.ttl),
            passphrase: params.passphrase ? true : undefined,
        },
    };

    const secretKey = secretStoreKeyFor(secretId);
    await secretStore.multi()
        .json.set(secretKey, '$', secret)
        .expireAt(secretKey, secret.meta.expiresAt)
        .exec()

    return {
        id: secretId,
        password: encryptionPassword,
    };
}

export async function getSecretData(params: {
    id: SecretId,
    password?: string,
    passphrase?: string,
}): Promise<SecretData | null> {

    const secretStoreKey = secretStoreKeyFor(params.id);
    const secret = (await secretStore.json.get(secretStoreKey))?.[0] as Secret;
    if (!secret || secret.meta.status !== 'UNREAD') return null;

    if (secret.passphrase || params.passphrase) {
        if (!secret.passphrase) throw new PasswordError('Unexpected passphrase');

        if (!params.passphrase || !await argon2.verify(secret.passphrase.hash, params.passphrase)) {
            const passphraseAttempts = (await secretStore.json.numIncrBy(secretStoreKey, '$.passphrase.attempts', 1))[0] as number;
            if (passphraseAttempts >= SECRET_PASSPHRASE_MAX_ATTEMPTS) {
                console.debug('Delete Secret.data and Secret.passphrase due to too many passphrase attempts');
                await deleteSecret({id: params.id, status: 'TOO_MANY_PASSPHRASE_ATTEMPTS'});
            }

            throw new PasswordError('Invalid passphrase');
        }
    }

    await deleteSecret({id: params.id, status: 'READ'});

    return decrypt(secret.data, params.password);
}

export async function getSecretMetaData(params: {
    id: SecretId,
}): Promise<SecretMetaData | null> {

    const secretStoreKey = secretStoreKeyFor(params.id);
    return (await secretStore.json.get(secretStoreKey, {
        path: '$.meta'
    }))?.[0] as SecretMetaData;
}

export async function deleteSecret(params: {
    id: SecretId,
    status: SecretStatus,
}): Promise<boolean> {
    const secretStoreKey = secretStoreKeyFor(params.id);
    const expiresAt = Math.floor(Date.now() / 1000 + SECRET_TOMBSTONE_TTL); // expires in 7 days
    await secretStore.multi()
        .json.del(secretStoreKey, {path: '$.data'})
        .json.del(secretStoreKey, {path: '$.passphrase'})
        .json.del(secretStoreKey, {path: '$.meta.passphrase'})
        .json.set(secretStoreKey, '$.meta.status', params.status)
        .json.set(secretStoreKey, '$.meta.expiresAt', expiresAt)
        .expireAt(secretStoreKey, expiresAt)
        .exec();

    return true;
}

// ----------------------------------------------------------------------------

function encrypt(data: SecretData, password: string) {
    const keySalt = crypto.randomBytes(16);
    const key = crypto.scryptSync(password, keySalt, 32);
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);

    const dataString = JSON.stringify(data);
    const encryptedData = cipher.update(dataString, 'utf8', 'base64')
        + cipher.final('base64');

    return [
        keySalt.toString('base64'),
        iv.toString('base64'),
        encryptedData,
        cipher.getAuthTag().toString('base64'),
    ].join(':');
}

function decrypt(encryptedValue: string, password: string): SecretData {
    const encryptedValueSplit = encryptedValue.split(':');
    if (encryptedValueSplit.length !== 4) throw new Error('Invalid encrypted value');

    const keySalt = Buffer.from(encryptedValueSplit[0], 'base64');
    const key = crypto.scryptSync(password, keySalt, 32);
    const iv = Buffer.from(encryptedValueSplit[1], 'base64');
    const encryptedData = encryptedValueSplit[2];
    const authTag = Buffer.from(encryptedValueSplit[3], 'base64');

    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    const dataString = decipher.update(encryptedData, 'base64', 'utf8')
        + decipher.final('utf8')
    return JSON.parse(dataString);
}

async function calculateArgon2Hash(password: string) {
    return await argon2.hash(password, {
        type: argon2.argon2id,
        hashLength: 32,        // Hash output length in bytes
    })
}

// ----------------------------------------------------------------------------

export type SecretId = string;
export type SecretStatus = 'UNREAD' | 'READ' | 'TOO_MANY_PASSPHRASE_ATTEMPTS' | 'DELETED'
export type Secret = {
    data?: string, // encrypted and base64 encoded SecretData
    passphrase?: { hash: string, attempts: number },
    meta: SecretMetaData,
};
export type SecretData = {
    type: 'text',
    data: string,
} | {
    type: 'file',
    name: string,
    data: string,
};
export type SecretMetaData = {
    status: SecretStatus,
    expiresAt: number,
    passphrase?: boolean,
}

export class PasswordError extends Error {
    constructor(message?: string) {
        super(message);
        this.name = 'PasswordError';
    }
}
