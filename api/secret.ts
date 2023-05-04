import type {VercelRequest, VercelResponse} from '@vercel/node';
import {kv} from "@vercel/kv";
import * as crypto from "crypto";

const HASH_ALGORITHM = 'sha512';
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';

const SECRET_VALUE_MAX_SIZE = 1024 * 1024 * 10; // 10 megabytes
const SECRET_TYPE_MAX_CHARS = 32;
const SECRET_TTL_MIN = 60 * 5; // 5 minutes
const SECRET_TTL_MAX = 60 * 60 * 24 * 14; // 14 days
const SECRET_TTL_DEFAULT = 60 * 60 * 24 * 7; // 7 days
const SECRET_PASSPHRASE_MAX_LENGTH = 32;
const SECRET_TOKEN_LENGTH = 32;

export default async (request: VercelRequest, response: VercelResponse) => {
    switch (request.method) {
        case 'POST':
            return handlePostSecret(request, response);
        case 'GET':
            return handleGetSecret(request, response);
        case 'DELETE':
            return handleDeleteSecret(request, response);
        default:
            return response.status(405).send({error: 'Method not allowed'});
    }
};

async function handlePostSecret(request: VercelRequest, response: VercelResponse) {
    const secretValue = request.body.value || '';
    if (!secretValue.length) return response.status(400)
        .send({error: `value must not be empty`});
    if (Buffer.byteLength(secretValue, 'utf8') > SECRET_VALUE_MAX_SIZE) return response.status(400)
        .send({error: `value must be less than ${SECRET_VALUE_MAX_SIZE} bytes`});

    const secretType = request.body.type || 'text';
    if (secretType.length > SECRET_TYPE_MAX_CHARS) return response.status(400)
        .send({error: `type must be less than ${SECRET_TYPE_MAX_CHARS} characters`});

    const secretTtl = Number.parseInt(request.body.ttl || SECRET_TTL_DEFAULT)
    if (secretTtl < SECRET_TTL_MIN) return response.status(400)
        .send({error: `ttl value must be greater than ${SECRET_TTL_MIN}`});
    if (secretTtl > SECRET_TTL_MAX) return response.status(400)
        .send({error: `ttl value must be less than ${SECRET_TTL_MAX}`});

    const secretPassphrase = request.body.passphrase || ''
    if (secretPassphrase.length > SECRET_PASSPHRASE_MAX_LENGTH) return response.status(400)
        .send({error: `passphrase length must be less than ${SECRET_PASSPHRASE_MAX_LENGTH}`});

    const secretToken = await addSecret({
        value: {
            type: secretType,
            value: secretValue,
        },
        ttl: secretTtl,
        passphrase: secretPassphrase,
    });

    return response.status(201)
        .send({
            token: secretToken,
            htmlUrl: `https://${request.headers.host}/secret/${secretToken}`,
        });
}

async function handleGetSecret(request: VercelRequest, response: VercelResponse) {
    const secretToken = firstValue(request.query.token) || ''
    if (secretToken.length !== SECRET_TOKEN_LENGTH) return response.status(400)
        .send({error: 'invalid token'});

    const secretPassphrase = firstValue(request.query.passphrase) || ''
    if (secretPassphrase.length > SECRET_PASSPHRASE_MAX_LENGTH) return response.status(400)
        .send({error: `passphrase length must be less than ${SECRET_PASSPHRASE_MAX_LENGTH}`});

    const secretValue = await getDelSecret(secretToken, secretPassphrase)
    if (!secretValue) return response.status(404)
        .send({error: 'secret not found'});

    return response.status(200)
        .send(secretValue);
}

async function handleDeleteSecret(request: VercelRequest, response: VercelResponse) {
    const secretToken = firstValue(request.query.token) || ''
    if (secretToken.length !== SECRET_TOKEN_LENGTH) return response.status(400)
        .send({error: 'invalid token'});

    const secretPassphrase = firstValue(request.query.passphrase) || ''
    if (secretPassphrase.length > SECRET_PASSPHRASE_MAX_LENGTH) return response.status(400)
        .send({error: `passphrase length must be less than ${SECRET_PASSPHRASE_MAX_LENGTH}`});

    const secretValue = await getDelSecret(secretToken, secretPassphrase)
    if (!secretValue) return response.status(404)
        .send({error: 'Secret not found'});

    return response.status(204)
        .send({});
}

// ----------------------------------------------------------------------------

function firstValue(value: any | any[]) {
    if (Array.isArray(value)) return value[0];
    return value;
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

function hash(value: string) {
    return crypto.createHash(HASH_ALGORITHM).update(value).digest('base64');
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

// ----------------------------------------------------------------------------

async function addSecret(params: { value: object, ttl: number, passphrase?: string }): Promise<string> {
    const token = generateRandomString(32)
    const tokenWithPassphrase = token + (params.passphrase || '')
    await kv.set(`secret:${hash(tokenWithPassphrase)}`,
        encrypt(JSON.stringify(params.value), tokenWithPassphrase),
        {ex: params.ttl},
    )
    return token;
}

async function getDelSecret(token: string, passphrase?: string): Promise<object | null> {
    const tokenWithPassphrase = token + (passphrase || '');
    const encryptedValue = await kv.getdel<string>(`secret:${hash(tokenWithPassphrase)}`);
    if (!encryptedValue) return null;

    return JSON.parse(decrypt(encryptedValue, tokenWithPassphrase));
}
