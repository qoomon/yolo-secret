import type {VercelRequest, VercelResponse} from '@vercel/node';
import * as  formidable from 'formidable';
import * as fs from "fs";
import * as secretStore from "../_lib/secret-store.js";
import {SecretData} from "../_lib/secret-store.js";
import {BASE64_REGEX} from "../_lib/utils.js";
import {
    SECRET_DATA_MAX_CHARS,
    SECRET_DATA_MAX_SIZE,
    SECRET_NAME_MAX_CHARS,
    SECRET_PASSPHRASE_MAX_LENGTH,
    SECRET_TTL_DEFAULT,
    SECRET_TTL_MAX, SECRET_TTL_MIN
} from "../_lib/config.js";


export default async (request: VercelRequest, response: VercelResponse) => {
    switch (request.method) {
        case 'POST':
            return await handlePostSecret(request, response);
        default:
            return response.status(405)
                .send({error: 'Method not allowed'});
    }
};

async function handlePostSecret(request: VercelRequest, response: VercelResponse) {
    let addSecretParams: { data: SecretData, ttl: number, passphrase?: string } = null

    switch (request.headers['content-type']?.split(';')[0].trim()) {
        case 'multipart/form-data': {
            const formData = await formidable.formidable({
                multiples: false,
                maxFiles: 1,
                maxFileSize: SECRET_DATA_MAX_SIZE,
                maxFields: 4,
            }).parse(request).then(([fields, files]) => ({fields, files}));

            if ((formData.fields.data && formData.files.data)
                || formData.fields.data.length > 1
                || formData.files.data.length > 1) return response.status(400)
                .send({error: `ambiguous data field`});
            if (formData.fields.ttl.length > 1) return response.status(400)
                .send({error: `ambiguous ttl field`});
            if (formData.fields.passphrase.length > 1) return response.status(400)
                .send({error: `ambiguous passphrase field`});
            if (formData.fields.name.length > 1) return response.status(400)
                .send({error: `ambiguous name field`});

            addSecretParams = {
                data: formData.files.data[0] ? {
                        type: 'file',
                        name: formData.fields.name?.[0] || formData.files.data[0].originalFilename,
                        data: fs.readFileSync(formData.files.data[0].filepath).toString('base64'),
                    } : {
                        type: 'text',
                        data: formData.fields.data?.[0] || '',
                    },
                ttl: formData.fields.ttl?.[0] ? Number.parseInt(formData.fields.ttl[0]) : SECRET_TTL_DEFAULT,
                passphrase: formData.fields.passphrase?.[0],
            };

            break;
        }
        case 'application/json':
        case undefined: {
            if (![undefined, 'text', 'file'].includes(request.body.type)) return response.status(400)
                .send({error: `type field can only be 'text' or 'file'`});

            if (request.body.type === 'file') {
                if (!request.body.data?.match(BASE64_REGEX)) return response.status(400)
                    .send({error: `file data field must be encoded as base64`});
                if (!request.body.name) return response.status(400)
                    .send({error: `file name field must not be empty`});
                if (request.body.name.length > SECRET_NAME_MAX_CHARS) return response.status(400)
                    .send({error: `file name field must be less than ${SECRET_NAME_MAX_CHARS} characters long`})
            }

            addSecretParams = {
                data: request.body.type === 'file'
                    ? {
                        type: 'file',
                        name: request.body.name || '',
                        data: request.body.data || '',
                    }
                    : {
                        type: 'text',
                        data: request.body.data || '',
                    },
                ttl: request.body.ttl
                    ? Number.parseInt(request.body.ttl)
                    : SECRET_TTL_DEFAULT,
                passphrase: request.body.passphrase,
            };
            break;
        }
        default:
            return response.status(415)
                .send({error: 'Unsupported media type'});
    }

    if (!addSecretParams.data.data.length) return response.status(400)
        .send({error: `data field must not be empty`});
    if (addSecretParams.data.data.length > SECRET_DATA_MAX_CHARS) return response.status(400)
        .send({error: `data field must be less than ${SECRET_DATA_MAX_CHARS} characters long`});

    if (addSecretParams.ttl < SECRET_TTL_MIN) return response.status(400)
        .send({error: `ttl value must be greater than ${SECRET_TTL_MIN}`});
    if (addSecretParams.ttl > SECRET_TTL_MAX) return response.status(400)
        .send({error: `ttl value must be less than ${SECRET_TTL_MAX}`});

    if (addSecretParams.passphrase?.length > SECRET_PASSPHRASE_MAX_LENGTH) return response.status(400)
        .send({error: `passphrase length must be less than ${SECRET_PASSPHRASE_MAX_LENGTH} characters long`});

    const secret = await secretStore.addSecret(addSecretParams);
    return response.status(201)
        .send({
            id: secret.id,
            password: secret.password,
            htmlUrl: `${request.headers['x-forwarded-proto']}://${request.headers['x-forwarded-host']}/${secret.id}#${secret.password}`,
        });
}
