import type {VercelRequest, VercelResponse} from '@vercel/node';
import * as secretStore from "../../_lib/secret-store.js";
import {firstValueOf} from "../../_lib/utils.js";
import {SECRET_ID_LENGTH, SECRET_PASSPHRASE_MAX_LENGTH, SECRET_PASSWORD_LENGTH} from "../../_lib/config";
import {PasswordError} from "../../_lib/secret-store.js";

export default async (request: VercelRequest, response: VercelResponse) => {
    switch (request.method) {
        case 'GET':
            await handleGetSecretData(request, response);
            break;
        default:
            response.status(405)
                .send({error: 'Method not allowed'});
    }
};

async function handleGetSecretData(request: VercelRequest, response: VercelResponse) {
    const secretId = firstValueOf(request.query.id) || ''
    const secretPassword = firstValueOf(request.query.password) || ''
    const secretPassphrase = firstValueOf(request.query.passphrase) || ''

    const secretData = await secretStore.getSecretData({
        id: secretId,
        password: secretPassword,
        passphrase: secretPassphrase,
    }).catch(error => {
        if (error instanceof PasswordError) {
            response.status(400)
                .send({error: 'invalid passphrase'});
            return;
        }
        throw error;
    });
    if (!secretData) return;

    if (!secretData) {
        response.status(404)
            .send({error: 'secret not found'});
        return;
    }

    if (request.query.raw === '' || request.query.raw === 'true') {
        if (secretData.type === 'file') {
            response.status(200)
                .setHeader('Content-Type', 'application/octet-stream')
                .setHeader('Content-Disposition', `attachment; filename=${secretData.name}`)
                .send(Buffer.from(secretData.data, 'base64'));
            return;
        }

        response.status(200)
            .setHeader('Content-Type', 'text/plain')
            .setHeader('Content-Disposition', `attachment; filename=secret.txt`)
            .send(secretData.data);
        return;
    }

    response.status(200)
        .send(JSON.stringify(secretData, undefined, 2));
}
