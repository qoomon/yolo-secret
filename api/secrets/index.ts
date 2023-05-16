import type {VercelRequest, VercelResponse} from '@vercel/node';
// @ts-ignore
import formidable from 'formidable';
import * as fs from "fs";
import {IncomingMessage} from "http";
import * as secretStore from "../lib/secret-store";
import {SecretObject} from "../lib/secret-store";
import {base64DataUrlRegex} from "../lib/utils";

const SECRET_DATA_MAX_SIZE = 1024 * 1024 * 10 // 10 megabytes
const SECRET_DATA_MAX_CHARS = Math.floor(SECRET_DATA_MAX_SIZE / 3 * 4); // base64 encoded data char count
const SECRET_NAME_MAX_CHARS = 128; // 128 characters
const SECRET_TTL_MIN = 60 * 5; // 5 minutes
const SECRET_TTL_MAX = 60 * 60 * 24 * 14; // 14 days
const SECRET_TTL_DEFAULT = 60 * 60 * 24 * 7; // 7 days
const SECRET_PASSPHRASE_MAX_LENGTH = 32;


export default async (request: VercelRequest, response: VercelResponse) => {
    switch (request.method) {
        case 'POST':
            return handlePostSecret(request, response);
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
                        data: formData.fields.data as string || '',
                        name: formData.fields.name as string || 'secret',
                    },
                ttl: formData.fields.ttl ? Number.parseInt(formData.fields.ttl) : SECRET_TTL_DEFAULT,
                passphrase: formData.fields.passphrase || '',
            };

            break;
        }
        case 'application/json':
        case undefined: {
            if (!['', 'text', 'file'].includes(request.body.type)) return response.status(400)
                .send({error: `type field can only be 'text' or 'file'`});
            if (request.body.data === 'file' && !request.body.data.match(base64DataUrlRegex)) return response.status(400)
                .send({error: `data field must be a valid data url`});

            addSecretParams = {
                value: {
                    type: request.body.type || 'text',
                    data: request.body.data || '',
                    name: request.body.name || 'secret',
                },
                ttl: request.body.ttl ? Number.parseInt(request.body.ttl) : SECRET_TTL_DEFAULT,
                passphrase: request.body.passphrase || '',
            };
            break;
        }
        default:
            return response.status(415)
                .send({error: 'Unsupported media type'});
    }

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

    const secretToken = await secretStore.addSecret(addSecretParams);

    return response.status(201)
        .send({
            token: secretToken,
            htmlUrl: `${request.headers['x-forwarded-proto']}://${request.headers['x-forwarded-host']}#${secretToken}`,
        });
}

// ----------------------------------------------------------------------------
