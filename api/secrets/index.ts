import type {VercelRequest, VercelResponse} from '@vercel/node';
import * as secretStore from "../_lib/secret-store.js";
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
    if (request.body.id?.length < 24) return response.status(400)
        .send({error: `id field must be at least 24 characters long`});
    if (request.body.id?.length > 32) return response.status(400)
        .send({error: `id field must be less than 32 characters long`});

    if (!request.body.encryptedData?.length) return response.status(400)
        .send({error: `encryptedData field must not be empty`});
    if (request.body.encryptedData?.length > SECRET_DATA_MAX_CHARS) return response.status(400)
        .send({error: `encryptedData field must be less than ${SECRET_DATA_MAX_CHARS} characters long`});

    if (!request.body.prove) return response.status(400)
        .send({error: `prove field must not be empty`});
    if (request.body.prove?.length > SECRET_PROVE_MAX_CHARS) return response.status(400)
        .send({error: `prove field must be less than ${SECRET_PROVE_MAX_CHARS} characters long`});

    if (request.body.ttl < SECRET_TTL_MIN) return response.status(400)
        .send({error: `ttl value must be greater than ${SECRET_TTL_MIN}`});
    if (request.body.ttl > SECRET_TTL_MAX) return response.status(400)
        .send({error: `ttl value must be less than ${SECRET_TTL_MAX}`});

    const secret = await secretStore.addSecret({
        id: request.body.id,
        encryptedData: request.body.encryptedData,
        prove: request.body.prove,
        ttl: request.body.ttl
            ? Number.parseInt(request.body.ttl)
            : SECRET_TTL_DEFAULT,
    });

    return response.status(201)
        .send({id: secret.id});
}
