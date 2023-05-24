import type {VercelRequest, VercelResponse} from '@vercel/node';
import * as secretStore from "../../_lib/secret-store";
import {firstValueOf} from "../../_lib/utils";
import {SECRET_PASSPHRASE_MAX_LENGTH, SECRET_TOKEN_LENGTH} from "../../_lib/config";

export default async (request: VercelRequest, response: VercelResponse) => {
    switch (request.method) {
        case 'GET':
            await handleGetSecretMetaData(request, response);
            break;
        default:
            response.status(405)
                .send({error: 'Method not allowed'});
    }
};

async function handleGetSecretMetaData(request: VercelRequest, response: VercelResponse) {
    const secretToken = firstValueOf(request.query.token) || ''
    if (secretToken.length !== SECRET_TOKEN_LENGTH) return response.status(400)
        .send({error: 'invalid token'});

    const secretMetaData = await secretStore.getSecretMetaData({
        token: secretToken,
    });

    if (!secretMetaData) {
        response.status(404)
            .send({error: 'secret not found'});
        return;
    }

    response.status(200)
        .send(secretMetaData);
}
