import {timingSafeEqual} from 'crypto';

/**
 * Compares two proof strings in constant time to prevent timing attacks.
 */
export function timingSafeProveEqual(a: string, b: string): boolean {
    const encodedA = Buffer.from(a);
    const encodedB = Buffer.from(b);
    if (encodedA.length !== encodedB.length) {
        // Compare encodedA against encodedB padded/truncated to same length
        // to consume constant time regardless of length mismatch
        const paddedB = Buffer.alloc(encodedA.length);
        encodedB.copy(paddedB, 0, 0, Math.min(encodedA.length, encodedB.length));
        timingSafeEqual(encodedA, paddedB);
        return false;
    }
    return timingSafeEqual(encodedA, encodedB);
}
