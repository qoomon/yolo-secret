import * as openpgp from 'openpgp/lightweight';

export async function createHash(password: string, salt: string) {
    const hashLength = 32;

    const key = await crypto.subtle.importKey(
        'raw', // Format of the key data
        new TextEncoder().encode(password),
        {name: 'PBKDF2'}, // The algorithm the key will be used with
        false, // Not extractable
        ['deriveBits'] // Usage for the key
    );

    const derivedBits = await crypto.subtle.deriveBits(
        {
            name: 'PBKDF2',
            salt: new TextEncoder().encode(salt),
            iterations: 1_000_000,
            hash: 'SHA-512'
        },
        key,
        hashLength * 8
    );

    return btoa(String.fromCharCode(...new Uint8Array(derivedBits)));
}


export async function encrypt(
    message: { text: string, filename?: string, date?: Date },
    password: string,
) {
    return await openpgp.encrypt({
        message: await openpgp.createMessage(message),
        passwords: [password],
        format: 'armored',
        config: {
            aeadProtect: true,
            preferredCompressionAlgorithm: openpgp.enums.compression.zip,
        }
    });
}

export async function decrypt(armoredMessage: string, password: string) {
    return await openpgp.decrypt({
        message: await openpgp.readMessage({
            armoredMessage,
            config: {
                aeadProtect: true,
            }
        }),
        passwords: [password],
    });
}

export function generatePassword(length: number) {
    if (length < 1) {
        throw new Error("Password length must be a positive integer.");
    }

    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const digits = '0123456789';
    const charset = uppercase + lowercase + digits;

    // Use rejection sampling to avoid modulo bias.
    // We find the largest multiple of charset.length that fits in a Uint32
    // and reject any random values >= that threshold.
    const maxValid = Math.floor(0x100000000 / charset.length) * charset.length;
    const maxUint32BatchSize = 16384; // getRandomValues limit: 65536 bytes = 16384 Uint32 values
    const result: string[] = [];
    while (result.length < length) {
        const needed = Math.min(length - result.length, maxUint32BatchSize);
        const randomValues = crypto.getRandomValues(new Uint32Array(needed));
        for (const randomNumber of randomValues) {
            if (randomNumber >= maxValid) continue; // reject to avoid bias
            result.push(charset[randomNumber % charset.length]);
            if (result.length >= length) break;
        }
    }
    return result.join('');
}
