import type {VercelRequest, VercelResponse} from '@vercel/node';
// @ts-ignore
import formidable from 'formidable';
import {kv} from "@vercel/kv";
import * as crypto from "crypto";
import * as fs from "fs";
import {IncomingMessage} from "http";

type SecretObject = { type: 'text' | 'file', data: string, name: string };

const HASH_ALGORITHM = 'sha512';
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';

const SECRET_DATA_MAX_SIZE = 1024 * 1024 * 10 // 10 megabytes
const SECRET_DATA_MAX_CHARS = Math.floor(SECRET_DATA_MAX_SIZE / 3 * 4); // base64 encoded data char count
const SECRET_NAME_MAX_CHARS = 128; // 128 characters
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
        // case 'DELETE':
        //     return handleDeleteSecret(request, response);
        default:
            return response.status(405)
                .send({error: 'Method not allowed'});
    }
};

async function parseFormData(request: IncomingMessage, options: formidable.Options) {
    return await new Promise((resolve, reject) => {
        formidable(options).parse(request, (err: any, fields: formidable.Fields, files: formidable.Files) => {
            if (err) reject(err); else resolve({fields, files});
        });
    }) as { fields: formidable.Fields, files: formidable.Files };
}

async function handlePostSecret(request: VercelRequest, response: VercelResponse) {
    let addSecretParams: { value: SecretObject, ttl: number, passphrase?: string } = null

    switch (request.headers['content-type']?.split(';')[0].trim()) {
        case 'multipart/form-data': {
            const formData = await parseFormData(request, {
                multiples: false, maxFiles: 1, maxFileSize: SECRET_DATA_MAX_SIZE, maxFields: 4,
            });

            if ((formData.fields.data && formData.files.data)
                || Array.isArray(formData.fields.data)
                || Array.isArray(formData.files.data)) return response.status(400)
                .send({error: `ambiguous data field`});
            if (Array.isArray(formData.fields.ttl)) return response.status(400)
                .send({error: `ambiguous ttl field`});
            if (Array.isArray(formData.fields.passphrase)) return response.status(400)
                .send({error: `ambiguous passphrase field`});
            if (Array.isArray(formData.fields.name)) return response.status(400)
                .send({error: `ambiguous name field`});

            addSecretParams = {
                value: formData.files.data
                    ? {
                        type: 'file',
                        data: `data:${formData.files.data.mimetype};base64,` + fs.readFileSync(formData.files.data.filepath).toString('base64'),
                        name: formData.fields.name as string || formData.files.data.originalFilename,
                    }
                    : {
                        type: 'text',
                        data: formData.fields.value as string || '',
                        name: formData.fields.name as string || 'secret',
                    },
                ttl: formData.fields.ttl ? Number.parseInt(formData.fields.ttl) : SECRET_TTL_DEFAULT,
                passphrase: formData.fields.passphrase || '',
            }
            break;
        }
        case 'application/json':
        case undefined: {
            addSecretParams = {
                value: {
                    type: request.body.type || '',
                    data: request.body.data || '',
                    name: request.body.name || 'secret',
                },
                ttl: request.body.ttl ? Number.parseInt(request.body.ttl) : SECRET_TTL_DEFAULT,
                passphrase: request.body.passphrase || '',
            }
            break;
        }
        default:
            return response.status(415)
                .send({error: 'Unsupported media type'});
    }

    if (addSecretParams.value.type !== 'text' && addSecretParams.value.type !== 'file') return response.status(400)
        .send({error: `type field can only be 'text' or 'file'`});

    // TODO if type is file, check for data value for data url format (   // data:image/png;base64,...)

    if (!addSecretParams.value.data.length) return response.status(400)
        .send({error: `data field must not be empty`});
    if (addSecretParams.value.data.length > SECRET_DATA_MAX_CHARS) return response.status(400)
        .send({error: `data field must be less than ${SECRET_DATA_MAX_CHARS} characters long`});

    if (addSecretParams.value.name?.length > SECRET_NAME_MAX_CHARS) return response.status(400)
        .send({error: `name must be less than ${SECRET_NAME_MAX_CHARS} characters long`});

    if (addSecretParams.ttl < SECRET_TTL_MIN) return response.status(400)
        .send({error: `ttl value must be greater than ${SECRET_TTL_MIN}`});
    if (addSecretParams.ttl > SECRET_TTL_MAX) return response.status(400)
        .send({error: `ttl value must be less than ${SECRET_TTL_MAX}`});

    if (addSecretParams.passphrase.length > SECRET_PASSPHRASE_MAX_LENGTH) return response.status(400)
        .send({error: `passphrase length must be less than ${SECRET_PASSPHRASE_MAX_LENGTH}`});

    const secretToken = await addSecret(addSecretParams);

    return response.status(201)
        .send({
            token: secretToken,
            htmlUrl: `${request.headers['x-forwarded-proto']}://${request.headers['x-forwarded-host']}#${secretToken}`,
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

    if (request.query.data === '' || request.query.data === 'true') {
        console.log('request.query.data', request.query.data)
        if (secretValue.type === 'file') {
            // secretValue.data is a data url 'data:[<mimetype>][;base64],<data>'
            const [fileMetaData, fileData] = secretValue.data.split(',');
            const dataMatch = fileMetaData.match(/^data:(?<mimetype>[^;]*)(?:;(?<encoding>[^,]*))?$/);
            let dataBuffer = Buffer.from(fileData, dataMatch.groups.encoding as BufferEncoding);
            return response.status(200)
                .setHeader('Content-Type', dataMatch.groups.mimetype)
                .setHeader('Content-Length', dataBuffer.byteLength)
                .send(dataBuffer);
        }

        return response.status(200)
            .setHeader('Content-Type', 'text/plain')
            .send(secretValue.data);
    }

    return response.status(200)
        .send(secretValue);
}

// TODO
// async function handleDeleteSecret(request: VercelRequest, response: VercelResponse) {
//     const secretToken = firstValue(request.query.token) || ''
//     if (secretToken.length !== SECRET_TOKEN_LENGTH) return response.status(400)
//         .send({error: 'invalid token'});
//
//     const secretPassphrase = firstValue(request.query.passphrase) || ''
//     if (secretPassphrase.length > SECRET_PASSPHRASE_MAX_LENGTH) return response.status(400)
//         .send({error: `passphrase length must be less than ${SECRET_PASSPHRASE_MAX_LENGTH}`});
//
//     const secretValue = await getDelSecret(secretToken, secretPassphrase)
//     if (!secretValue) return response.status(404)
//         .send({error: 'Secret not found'});
//
//     return response.status(204)
//         .send({});
// }

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

async function addSecret(params: { value: SecretObject, ttl: number, passphrase?: string }): Promise<string> {
    const token = generateRandomString(32)
    const tokenWithPassphrase = token + (params.passphrase || '')
    const storeObject = params.value;
    const encryptedStoreValue = encrypt(JSON.stringify(storeObject), tokenWithPassphrase);
    await kv.set(`secret:${hash(tokenWithPassphrase)}`, encryptedStoreValue, {ex: params.ttl})
    return token;
}

async function getDelSecret(token: string, passphrase?: string): Promise<SecretObject | null> {
    const tokenWithPassphrase = token + (passphrase || '');
    const encryptedStoreValue = await kv.getdel<string>(`secret:${hash(tokenWithPassphrase)}`);
    if (!encryptedStoreValue) return null;
    return JSON.parse(decrypt(encryptedStoreValue, tokenWithPassphrase));
}
