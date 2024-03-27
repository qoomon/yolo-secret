import type {VercelRequest, VercelResponse} from '@vercel/node';
import * as secretStore from "../../_lib/secret-store.js";
import {firstValueOf} from "../../_lib/utils.js";
import {SECRET_ID_LENGTH} from "../../_lib/config";

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
    const secretId = firstValueOf(request.query.id) || ''

    const secretMetaData = await secretStore.getSecretMetaData({
        id: secretId,
    });

    if (!secretMetaData) {
        response.status(404)
            .send({error: 'secret not found'});
        return;
    }

    response.status(200)
        .send(secretMetaData);
}
