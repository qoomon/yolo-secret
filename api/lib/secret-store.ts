import * as crypto from "crypto";
import {kv} from "@vercel/kv";

const HASH_ALGORITHM = 'sha512';
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';

export type SecretObject = { type: 'text' | 'file', data: string, name: string };

export async function addSecret(params: { value: SecretObject, ttl: number, passphrase?: string }): Promise<string> {
    const token = generateRandomString(32)
    const tokenWithPassphrase = token + (params.passphrase || '')
    const storeObject = params.value;
    const encryptedStoreValue = encrypt(JSON.stringify(storeObject), tokenWithPassphrase);
    await kv.set(`secret:${hash(tokenWithPassphrase)}`, encryptedStoreValue, {ex: params.ttl})
    return token;
}

export async function getDelSecret(params: { token: string, passphrase?: string }): Promise<SecretObject | null> {
    const tokenWithPassphrase = params.token + (params.passphrase || '');
    const encryptedStoreValue = await kv.getdel<string>(`secret:${hash(tokenWithPassphrase)}`);
    if (!encryptedStoreValue) return null;
    return JSON.parse(decrypt(encryptedStoreValue, tokenWithPassphrase));
}

// ----------------------------------------------------------------------------

function generateRandomString(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    crypto.randomBytes(length).forEach(randomByte => {
        result += characters[randomByte % characters.length];
    });
    return result;
}

function encrypt(value: string, password: string) {
    const keySalt = crypto.randomBytes(16);
    const key = crypto.scryptSync(password, keySalt, 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
    const encrypted = cipher.update(value, 'utf8', 'base64')
        + cipher.final('base64');

    return [
        keySalt.toString('base64'),
        iv.toString('base64'),
        encrypted,
        cipher.getAuthTag().toString('base64')
    ].join(':');
}

function decrypt(value: string, password: string) {
    const valueSplit = value.split(':')
    if (valueSplit.length !== 4) throw new Error('decrypt - Invalid value');

    const keySalt = Buffer.from(valueSplit[0], 'base64');
    const key = crypto.scryptSync(password, keySalt, 32);
    const iv = Buffer.from(valueSplit[1], 'base64');
    const encrypted = valueSplit[2];
    const authTag = Buffer.from(valueSplit[3], 'base64');

    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    return decipher.update(encrypted, 'base64', 'utf8')
        + decipher.final('utf8');
}

function hash(value: string) {
    return crypto.createHash(HASH_ALGORITHM).update(value).digest('base64');
}