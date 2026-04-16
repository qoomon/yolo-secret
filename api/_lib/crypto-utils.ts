import {timingSafeEqual} from 'crypto';

/**
 * Compares two proof strings in constant time to prevent timing attacks.
 */
export function timingSafeProveEqual(a: string, b: string): boolean {
    const encodedA = Buffer.from(a);
    const encodedB = Buffer.from(b);
    if (encodedA.length !== encodedB.length) {
        // Perform a dummy comparison to avoid leaking length info through timing
        timingSafeEqual(encodedA, encodedA);
        return false;
    }
    return timingSafeEqual(encodedA, encodedB);
}
