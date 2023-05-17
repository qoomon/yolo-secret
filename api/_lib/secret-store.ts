import {kv} from "@vercel/kv";
import * as crypto from "crypto";
import {CipherGCMTypes} from "crypto";
import * as argon2 from "argon2";

const PASSWORD_LENGTH: number = 32;
const PASSWORD_CHARACTERS: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

const ENCRYPTION_ALGORITHM: CipherGCMTypes = 'aes-256-gcm';

export type SecretObject = { type: 'text' | 'file', data: string, name: string };
export type SecretToken = string;

export async function addSecret(params: {
    value: SecretObject,
    ttl: number,
    passphrase?: string
}): Promise<SecretToken> {
    const token = generatePassword(PASSWORD_LENGTH, PASSWORD_CHARACTERS);
    const encryptionPassword = token + (params.passphrase || '')
    const encryptionPasswordHash = await hashPassword(encryptionPassword);
    const storeObject = params.value;
    const encryptedStoreValue = encrypt(JSON.stringify(storeObject), encryptionPassword);
    await kv.set(`secret:${encryptionPasswordHash}`, encryptedStoreValue, {ex: params.ttl})
    return token;
}

export async function getDelSecret(params: {
    token: SecretToken,
    passphrase?: string
}): Promise<SecretObject | null> {
    const encryptionPassword = params.token + (params.passphrase || '');
    const encryptionPasswordHash = await hashPassword(encryptionPassword);
    const encryptedStoreValue = await kv.getdel<string>(`secret:${encryptionPasswordHash}`);
    if (!encryptedStoreValue) return null;
    // TODO keep tombstone on delete  for 14 days, to indicate this password was read already
    return JSON.parse(decrypt(encryptedStoreValue, encryptionPassword));
}


// ----------------------------------------------------------------------------

function encrypt(data: string, password: string) {
    const keySalt = crypto.randomBytes(16);
    const key = crypto.scryptSync(password, keySalt, 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
    const encryptedData = cipher.update(data, 'utf8', 'base64')
        + cipher.final('base64');

    return [
        keySalt.toString('base64'),
        iv.toString('base64'),
        encryptedData,
        cipher.getAuthTag().toString('base64'),
    ].join(':');
}

function decrypt(encryptedValue: string, password: string) {
    const encryptedValueSplit = encryptedValue.split(':');
    if (encryptedValueSplit.length !== 4) throw new Error('decrypt - Invalid value');

    const keySalt = Buffer.from(encryptedValueSplit[0], 'base64');
    const key = crypto.scryptSync(password, keySalt, 32);
    const iv = Buffer.from(encryptedValueSplit[1], 'base64');
    const encryptedData = encryptedValueSplit[2];
    const authTag = Buffer.from(encryptedValueSplit[3], 'base64');

    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    return decipher.update(encryptedData, 'base64', 'utf8')
        + decipher.final('utf8');
}

function generatePassword(length, characters) {
    let result = '';
    const randomBytes = crypto.randomBytes(length);
    for (let i = 0; i < length; i++) {
        result += characters[randomBytes[i] % characters.length];
    }
    return result;
}

async function hashPassword(password: string) {
    const argon2Hash = await argon2.hash(password, {
        version: 19,
        type: argon2.argon2id,
        salt: Buffer.from("00000000"), // need to be fixed salt, to generate deterministic hashes
        memoryCost: 65536,     // Memory usage in KiB ~64MB
        timeCost: 4,           // Number of iterations
        parallelism: 2,        // Number of parallel threads
        hashLength: 32,        // Hash output length in bytes
    })
    return argon2Hash.substring(argon2Hash.lastIndexOf('$') + 1);
}
