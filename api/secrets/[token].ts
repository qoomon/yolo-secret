import type {VercelRequest, VercelResponse} from '@vercel/node';
// @ts-ignore
import formidable from 'formidable';
import {IncomingMessage} from "http";
import * as secretStore from "../lib/secret-store";
import {base64DataUrlRegex} from "../lib/utils";

const SECRET_PASSPHRASE_MAX_LENGTH = 32;
const SECRET_TOKEN_LENGTH = 32;

export default async (request: VercelRequest, response: VercelResponse) => {
    switch (request.method) {
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

async function handleGetSecret(request: VercelRequest, response: VercelResponse) {
    const secretToken = firstValue(request.query.token) || ''
    if (secretToken.length !== SECRET_TOKEN_LENGTH) return response.status(400)
        .send({error: 'invalid token'});

    const secretPassphrase = firstValue(request.query.passphrase) || ''
    if (secretPassphrase.length > SECRET_PASSPHRASE_MAX_LENGTH) return response.status(400)
        .send({error: `passphrase length must be less than ${SECRET_PASSPHRASE_MAX_LENGTH}`});

    const secretValue = await secretStore.getDelSecret({
        token: secretToken,
        passphrase: secretPassphrase,
    })

    if (!secretValue) return response.status(404)
        .send({error: 'secret not found'});

    if (request.query.data === '' || request.query.data === 'true') {
        if (secretValue.type === 'file') {
            const secretValueDataParts = secretValue.data.match(base64DataUrlRegex).groups;
            return response.status(200)
                .setHeader('Content-Type', secretValueDataParts.mimetype)
                .setHeader('Content-Disposition', `attachment; filename=${secretValue.name}`)
                .send(Buffer.from(secretValueDataParts.data, 'base64'));
        }

        return response.status(200)
            .setHeader('Content-Type', 'text/plain')
            .setHeader('Content-Disposition', `attachment; filename=${secretValue.name}.txt`)
            .send(secretValue.data);
    }

    return response.status(200)
        .send(JSON.stringify(secretValue, undefined, 2));
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