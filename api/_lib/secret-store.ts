import {kv} from "@vercel/kv";
import * as crypto from "crypto";
import {CipherGCMTypes} from "crypto";
import * as argon2 from "argon2";
import {
    SECRET_ID_LENGTH,
    SECRET_PASSPHRASE_MAX_ATTEMPTS, SECRET_PASSWORD_CHARACTERS, SECRET_PASSWORD_LENGTH,
    SECRET_TOMBSTONE_TTL,
} from "./config";


const ENCRYPTION_ALGORITHM: CipherGCMTypes = 'aes-256-gcm';

export async function addSecret(params: {
    data: SecretData,
    ttl: number,
    passphrase?: string
}): Promise<{ id: SecretId, password: string }> {
    const secretId = generatePassword(SECRET_ID_LENGTH, SECRET_PASSWORD_CHARACTERS);

    const encryptionPassword = generatePassword(SECRET_PASSWORD_LENGTH, SECRET_PASSWORD_CHARACTERS);

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

    const secretStoreKey = `secret:${secretId}`
    await kv.multi()
        .json.set(secretStoreKey, '$', secret)
        .expireat(secretStoreKey, secret.meta.expiresAt)
        .exec();

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

    const secretStoreKey = `secret:${params.id}`
    const secret: Secret = (await kv.json.get(secretStoreKey, '$'))?.[0];
    if (!secret || secret.meta.status !== 'UNREAD') return null;

    if (secret.passphrase || params.passphrase) {
        if (!secret.passphrase) throw new PasswordError('Unexpected passphrase');

        if (!params.passphrase || !await argon2.verify(secret.passphrase.hash, params.passphrase)) {
            const passphraseAttempts = (await kv.json.numincrby(secretStoreKey, '$.passphrase.attempts', 1))[0];
            if (passphraseAttempts >= SECRET_PASSPHRASE_MAX_ATTEMPTS) {
                console.debug('Delete Secret.data and Secret.passphrase due to too many passphrase attempts');
                const expiresAt = Math.floor(Date.now() / 1000 + SECRET_TOMBSTONE_TTL); // expires in 7 days
                await kv.multi()
                    .json.del(secretStoreKey, '$.data')
                    .json.del(secretStoreKey, '$.passphrase')
                    .json.del(secretStoreKey, '$.meta.passphrase')
                    .json.set(secretStoreKey, '$.meta.status', JSON.stringify('TOO_MANY_PASSPHRASE_ATTEMPTS' satisfies SecretStatus))
                    .json.set(secretStoreKey, '$.meta.expiresAt', expiresAt)
                    .expireat(secretStoreKey, expiresAt)
                    .exec();
            }

            throw new PasswordError('Invalid passphrase');
        }
    }
    const expiresAt = Math.floor(Date.now() / 1000 + SECRET_TOMBSTONE_TTL); // expires in 7 days
    await kv.multi()
        .json.del(secretStoreKey, '$.data')
        .json.del(secretStoreKey, '$.passphrase')
        .json.del(secretStoreKey, '$.meta.passphrase')
        .json.set(secretStoreKey, '$.meta.status', JSON.stringify('READ' satisfies SecretStatus))
        .json.set(secretStoreKey, '$.meta.expiresAt', expiresAt)
        .expireat(secretStoreKey, expiresAt)
        .exec();
    return decrypt(secret.data, params.password);
}

export async function getSecretMetaData(params: {
    id: SecretId,
}): Promise<SecretMetaData | null> {

    const secretStoreKey = `secret:${params.id}`

    return (await kv.json.get(secretStoreKey, '$.meta'))?.[0];
}

export async function deleteSecret(params: {
    id: SecretId,
}): Promise<boolean> {

    const secretStoreKey = `secret:${params.id}`

    const expiresAt = Math.floor(Date.now() / 1000 + SECRET_TOMBSTONE_TTL); // expires in 7 days
    await kv.multi()
        .json.del(secretStoreKey, '$.data')
        .json.del(secretStoreKey, '$.passphrase')
        .json.del(secretStoreKey, '$.meta.passphrase')
        .json.set(secretStoreKey, '$.meta.status', JSON.stringify('DELETED' satisfies SecretStatus))
        .json.set(secretStoreKey, '$.meta.expiresAt', expiresAt)
        .expireat(secretStoreKey, expiresAt)
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

function generatePassword(length, characters) {
    let result = '';
    const randomBytes = crypto.randomBytes(length);
    for (let i = 0; i < length; i++) {
        result += characters[randomBytes[i] % characters.length];
    }
    return result;
}

async function calculateArgon2Hash(password: string, salt: boolean = true) {
    return await argon2.hash(password, {
        type: argon2.argon2id,
        saltLength: 16,
        // if salt is undefined, argon2 will generate a random salt with saltLength
        salt: !salt ? Buffer.from("00000000") : undefined,
        memoryCost: 65536,     // Memory usage in KiB ~64MB
        timeCost: 4,           // Number of iterations
        parallelism: 2,        // Number of parallel threads
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
    constructor(message) {
        super(message);
        this.name = 'PasswordError';
    }
}
