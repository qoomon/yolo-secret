import type {VercelRequest, VercelResponse} from '@vercel/node';
import * as secretStore from "../_lib/secret-store.js";
import {SecretStoreError} from "../_lib/secret-store.js";
import {
    SECRET_DATA_MAX_CHARS, SECRET_PROVE_MAX_CHARS,
    SECRET_TTL_DEFAULT,
    SECRET_TTL_MAX,
    SECRET_TTL_MIN
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
    const body = request.body || {};

    if (typeof body.id !== 'string') return response.status(400)
        .send({error: `id field must be a string`});
    if (body.id.length < 24) return response.status(400)
        .send({error: `id field must be at least 24 characters long`});
    if (body.id.length > 32) return response.status(400)
        .send({error: `id field must be less than 32 characters long`});

    if (typeof body.encryptedData !== 'string') return response.status(400)
        .send({error: `encryptedData field must be a string`});
    if (!body.encryptedData.length) return response.status(400)
        .send({error: `encryptedData field must not be empty`});
    if (body.encryptedData.length > SECRET_DATA_MAX_CHARS) return response.status(400)
        .send({error: `encryptedData field must be less than ${SECRET_DATA_MAX_CHARS} characters long`});

    if (typeof body.prove !== 'string') return response.status(400)
        .send({error: `prove field must be a string`});
    if (!body.prove.length) return response.status(400)
        .send({error: `prove field must not be empty`});
    if (body.prove.length > SECRET_PROVE_MAX_CHARS) return response.status(400)
        .send({error: `prove field must be less than ${SECRET_PROVE_MAX_CHARS} characters long`});

    const ttl = body.ttl != null
        ? Number(body.ttl)
        : SECRET_TTL_DEFAULT;

    if (!Number.isFinite(ttl)) return response.status(400)
        .send({error: `ttl value must be a valid number`});
    if (ttl < SECRET_TTL_MIN) return response.status(400)
        .send({error: `ttl value must be greater than ${SECRET_TTL_MIN}`});
    if (ttl > SECRET_TTL_MAX) return response.status(400)
        .send({error: `ttl value must be less than ${SECRET_TTL_MAX}`});

    try {
        const secret = await secretStore.addSecret({
            id: body.id,
            encryptedData: body.encryptedData,
            prove: body.prove,
            ttl,
        });

        return response.status(201)
            .send({id: secret.id});
    } catch (error) {
        if (error instanceof SecretStoreError) {
            return response.status(400)
                .send({error: error.message});
        }
        throw error;
    }
}
