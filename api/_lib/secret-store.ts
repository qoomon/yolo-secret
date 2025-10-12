import * as redis from 'redis';
import {SECRET_MAX_ATTEMPTS, SECRET_TOMBSTONE_TTL} from "./config.js";

const secretStore = await redis.createClient({url: process.env.REDIS_URL}).connect();
const secretStoreKeyFor = (id: string) => `secret:${id}`;

export async function addSecret(params: {
    id: SecretId,
    encryptedData: string,
    prove: string,
    ttl: number,
}): Promise<{ id: SecretId }> {

    const secret: Secret = {
        encryptedData: params.encryptedData,
        prove: params.prove,
        meta: {
            status: 'UNREAD',
            attemptsRemaining: SECRET_MAX_ATTEMPTS,
            expiresAt: ttl2ExpireAt(params.ttl),
        },
    };

    const secretKey = secretStoreKeyFor(params.id);

    if (await secretStore.exists(secretKey)) {
        throw new SecretStoreError('Id already exists');
    }

    await secretStore.multi()
        .json.set(secretKey, '$', secret)
        .expireAt(secretKey, secret.meta.expiresAt)
        .exec();

    return {id: params.id};
}

export async function getSecretEncryptedData(params: {
    id: SecretId,
    prove: string,
}): Promise<string | null> {
    const secretStoreKey = secretStoreKeyFor(params.id);
    const secret = (await secretStore.json.get(secretStoreKey, {
        path: '$',
    }))?.[0] as Secret;
    if (!secret || secret.meta.status !== 'UNREAD') return null;

    if (secret.prove !== params.prove) {
        const attemptsRemaining = (await secretStore.json.numIncrBy(secretStoreKey, '$.meta.attemptsRemaining', -1))[0] ?? 0;
        if (attemptsRemaining <= 0) {
            await deleteSecret({id: params.id, status: 'TOO_MANY_ATTEMPTS'});
        }

        throw new SecretStoreError('Invalid prove');
    }

    await deleteSecret({id: params.id, status: 'READ'});

    return secret.encryptedData;
}

export async function getSecretMetaData(params: {
    id: SecretId,
}): Promise<SecretMetaData | null> {
    const secretStoreKey = secretStoreKeyFor(params.id);
    return (await secretStore.json.get(secretStoreKey, {
        path: '$.meta',
    }))?.[0] as SecretMetaData;
}

export async function deleteSecret(params: {
    id: SecretId,
    status: SecretStatus,
}): Promise<boolean> {
    console.debug(`Delete secret ${params.id} due to ${params.status}`);

    const secretStoreKey = secretStoreKeyFor(params.id);
    const expiresAt = ttl2ExpireAt(SECRET_TOMBSTONE_TTL);
    await secretStore.multi()
        .json.del(secretStoreKey, {path: '$.encryptedData'})
        .json.del(secretStoreKey, {path: '$.prove'})
        .json.set(secretStoreKey, '$.meta.status', params.status)
        .json.set(secretStoreKey, '$.meta.expiresAt', expiresAt)
        .expireAt(secretStoreKey, expiresAt)
        .exec();

    return true;
}

function ttl2ExpireAt(ttl: number) {
    return Math.floor(Date.now() / 1000 + ttl);
}

// ----------------------------------------------------------------------------

export type SecretId = string;
export type SecretStatus = 'UNREAD' | 'READ' | 'TOO_MANY_ATTEMPTS' | 'DELETED'
export type Secret = {
    encryptedData: string,
    prove: string,
    meta: SecretMetaData,
};

export type SecretMetaData = {
    status: SecretStatus,
    expiresAt: number,
    attemptsRemaining: number,
}

export class SecretStoreError extends Error {
    constructor(message?: string) {
        super(message);
        this.name = 'SecretStoreError';
    }
}
