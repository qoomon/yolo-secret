import type {VercelRequest, VercelResponse} from '@vercel/node';
import * as secretStore from "../../_lib/secret-store.js";
import {firstValueOf} from "../../_lib/utils.js";
import {SecretStoreError} from "../../_lib/secret-store.js";

export default async (request: VercelRequest, response: VercelResponse) => {
    switch (request.method) {
        case 'GET':
            await handleGetSecretEncryptedData(request, response);
            break;
        default:
            response.status(405)
                .send({error: 'Method not allowed'});
    }
};

async function handleGetSecretEncryptedData(request: VercelRequest, response: VercelResponse) {
    const secretId = firstValueOf(request.query.id) || '';
    const secretProve = firstValueOf(request.query.prove) || '';

    try {
        const encryptedData = await secretStore.getSecretEncryptedData({
            id: secretId, prove: secretProve,
        })

        if (!encryptedData) {
            response.status(404)
                .send({error: 'secret not found'});
            return;
        }

        response.status(200)
            .send({
                encryptedData,
            });
    } catch (error) {
        if (error instanceof SecretStoreError) {
            response.status(400)
                .send({error: error.message});
            return;
        }
        throw error;
    }
}
