import type {VercelRequest, VercelResponse} from '@vercel/node';
import * as secretStore from "../_lib/secret-store";
import {deleteSecret} from "../_lib/secret-store";
import {firstValueOf} from "../_lib/utils";

const SECRET_PASSPHRASE_MAX_LENGTH = 32;
const SECRET_TOKEN_LENGTH = 32;

export default async (request: VercelRequest, response: VercelResponse) => {
    switch (request.method) {
        case 'GET':
            return await handleGetSecret(request, response);
        default:
            return response.status(405)
                .send({error: 'Method not allowed'});
    }
};

async function handleGetSecret(request: VercelRequest, response: VercelResponse) {
    const secretToken = firstValueOf(request.query.token) || ''
    if (secretToken.length !== SECRET_TOKEN_LENGTH) return response.status(400)
        .send({error: 'invalid token'});

    const secretPassphrase = firstValueOf(request.query.passphrase) || ''
    if (secretPassphrase.length > SECRET_PASSPHRASE_MAX_LENGTH) return response.status(400)
        .send({error: `passphrase length must be less than ${SECRET_PASSPHRASE_MAX_LENGTH}`});

    const secretValue = await secretStore.getSecret({
        token: secretToken,
        passphrase: secretPassphrase,
    })

    if (!secretValue) return response.status(404)
        .send({error: 'secret not found or invalid passphrase'});

    if (secretValue === 'TOMBSTONE') return response.status(410)
        .send({error: 'secret has been read already'});

    if (request.query.check) {
        return response.status(204)
            .send('');
    }

    await secretStore.deleteSecret({
        token: secretToken,
        passphrase: secretPassphrase,
    });

    if (request.query.data === '' || request.query.data === 'true') {
        if (secretValue.type === 'file') {
            return response.status(200)
                .setHeader('Content-Type', 'application/octet-stream')
                .setHeader('Content-Disposition', `attachment; filename=${secretValue.name}`)
                .send(Buffer.from(secretValue.data, 'base64'));
        }

        return response.status(200)
            .setHeader('Content-Type', 'text/plain')
            .setHeader('Content-Disposition', `attachment; filename=${secretValue.name || 'secret'}.txt`)
            .send(secretValue.data);
    }

    return response.status(200)
        .send(JSON.stringify(secretValue, undefined, 2));
}
