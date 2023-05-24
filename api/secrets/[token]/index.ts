import type {VercelRequest, VercelResponse} from '@vercel/node';
import * as secretStore from "../../_lib/secret-store";
import {firstValueOf} from "../../_lib/utils";
import {SECRET_PASSPHRASE_MAX_LENGTH, SECRET_TOKEN_LENGTH} from "../../_lib/config";
import {PasswordError} from "../../_lib/secret-store";

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
    const secretToken = firstValueOf(request.query.token) || ''
    if (secretToken.length !== SECRET_TOKEN_LENGTH) {
        response.status(400)
            .send({error: 'invalid token'});
        return;
    }

    const secretPassphrase = firstValueOf(request.query.passphrase) || ''
    if (secretPassphrase.length > SECRET_PASSPHRASE_MAX_LENGTH) {
        response.status(400)
            .send({error: `passphrase length must be less than ${SECRET_PASSPHRASE_MAX_LENGTH}`});
        return;
    }


    const secretData = await secretStore.getSecretData({
        token: secretToken,
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
