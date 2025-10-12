import * as openpgp from 'openpgp/lightweight';

export async function createHash(password: string, salt: string) {
    const hashLength = 32;

    const key = await window.crypto.subtle.importKey(
        'raw', // Format of the key data
        new TextEncoder().encode(password),
        {name: 'PBKDF2'}, // The algorithm the key will be used with
        false, // Not extractable
        ['deriveBits'] // Usage for the key
    );

    const derivedBits = await window.crypto.subtle.deriveBits(
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

// TODO use stronger password generator
export function generatePassword(length: number) {
    if (length < 1) {
        throw new Error("Password length must be a positive integer.");
    }

    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const digits = '0123456789';
    const charset = uppercase + lowercase + digits;

    const randomValues = crypto.getRandomValues(new Uint32Array(length));
    return Array.from(randomValues).map((randomNumber) => {
        const randomIndex = randomNumber % charset.length;
        return charset[randomIndex];
    }).join('');
}
