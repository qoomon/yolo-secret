import {kv} from "@vercel/kv";
import * as crypto from "crypto";
import * as argon2 from "argon2";

const PASSWORD_LENGTH: number = 32;
const PASSWORD_CHARACTERS: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

const ENCRYPTION_ALGORITHM = 'aes-256-gcm';

export type SecretObject = { type: 'text' | 'file', data: string, name: string };

export async function addSecret(params: { value: SecretObject, ttl: number, passphrase?: string }): Promise<string> {
    const token = generatePassword(PASSWORD_LENGTH, PASSWORD_CHARACTERS);
    console.log("addSecret token:", token)
    const tokenWithPassphrase = token + (params.passphrase || '')
    console.log("addSecret tokenWithPassphrase:", tokenWithPassphrase)
    const tokenWithPassphraseHash = await hashPassword(tokenWithPassphrase);
    console.log("addSecret tokenWithPassphraseHash:", tokenWithPassphraseHash)
    const storeObject = params.value;
    const encryptedStoreValue = encrypt(JSON.stringify(storeObject), tokenWithPassphrase);
    await kv.set(`secret:${tokenWithPassphraseHash}`, encryptedStoreValue, {ex: params.ttl})
    return token;
}

export async function getDelSecret(params: { token: string, passphrase?: string }): Promise<SecretObject | null> {
    console.log("getSecret token:", params.token)
    const tokenWithPassphrase = params.token + (params.passphrase || '');
    console.log("getSecret tokenWithPassphrase:", tokenWithPassphrase)
    const tokenWithPassphraseHash = await hashPassword(tokenWithPassphrase);
    console.log("getSecret tokenWithPassphraseHash:", tokenWithPassphraseHash)
    const encryptedStoreValue = await kv.getdel<string>(`secret:${tokenWithPassphraseHash}`);
    if (!encryptedStoreValue) return null;
    return JSON.parse(decrypt(encryptedStoreValue, tokenWithPassphrase));
}

// ----------------------------------------------------------------------------

function generatePassword(length: number, characters?: string) {
    let result = '';
    crypto.randomBytes(length).forEach(randomByte => {
        result += characters[randomByte % characters.length];
    });
    return result;
}

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

async function hashPassword(password: string) {
    return await argon2.hash(password, {
        salt: Buffer.from("00000000"), // fix salt to generate deterministic hashes
        memoryCost: 65536,     // Memory usage in KiB ~64MB
        timeCost: 4,           // Number of iterations
        hashLength: 32,        // Hash output length in bytes
        parallelism: 2,        // Number of parallel threads
    });
}
