import {describe, it, expect} from 'vitest';
import {generatePassword, createHash, encrypt, decrypt} from './crypto.ts';

describe('generatePassword', () => {
    it('should generate password of the requested length', () => {
        expect(generatePassword(1).length).toBe(1);
        expect(generatePassword(16).length).toBe(16);
        expect(generatePassword(32).length).toBe(32);
        expect(generatePassword(64).length).toBe(64);
    });

    it('should only contain alphanumeric characters', () => {
        const password = generatePassword(1000);
        expect(password).toMatch(/^[A-Za-z0-9]+$/);
    });

    it('should throw for length < 1', () => {
        expect(() => generatePassword(0)).toThrow('Password length must be a positive integer.');
        expect(() => generatePassword(-1)).toThrow('Password length must be a positive integer.');
    });

    it('should generate different passwords on successive calls', () => {
        const passwords = new Set(Array.from({length: 10}, () => generatePassword(32)));
        // With 62^32 possible passwords, collisions are astronomically unlikely
        expect(passwords.size).toBe(10);
    });

    it('should have reasonable character distribution (no modulo bias)', () => {
        // Generate a large sample and check distribution uniformity
        const sampleSize = 62_000;
        const password = generatePassword(sampleSize);
        const charCounts = new Map<string, number>();
        for (const char of password) {
            charCounts.set(char, (charCounts.get(char) ?? 0) + 1);
        }

        const expectedCount = sampleSize / 62; // ~1000 per character
        for (const [, count] of charCounts) {
            // Allow 20% deviation — generous but catches severe bias
            expect(count).toBeGreaterThan(expectedCount * 0.8);
            expect(count).toBeLessThan(expectedCount * 1.2);
        }
        // All 62 characters should appear
        expect(charCounts.size).toBe(62);
    });
});

describe('createHash', () => {
    it('should produce deterministic output for same inputs', async () => {
        const hash1 = await createHash('password123', 'salt-abc');
        const hash2 = await createHash('password123', 'salt-abc');
        expect(hash1).toBe(hash2);
    });

    it('should produce different output for different passwords', async () => {
        const hash1 = await createHash('password1', 'same-salt');
        const hash2 = await createHash('password2', 'same-salt');
        expect(hash1).not.toBe(hash2);
    });

    it('should produce different output for different salts', async () => {
        const hash1 = await createHash('same-password', 'salt1');
        const hash2 = await createHash('same-password', 'salt2');
        expect(hash1).not.toBe(hash2);
    });

    it('should produce a base64 encoded string', async () => {
        const hash = await createHash('test', 'salt');
        // Base64 string: only contains [A-Za-z0-9+/=]
        expect(hash).toMatch(/^[A-Za-z0-9+/=]+$/);
    });
});

describe('encrypt and decrypt', () => {
    it('should round-trip text correctly', async () => {
        const originalText = 'Hello, World! This is a secret message.';
        const password = 'strong-password-123';

        const encrypted = await encrypt({text: originalText}, password);
        expect(encrypted).toContain('-----BEGIN PGP MESSAGE-----');

        const decrypted = await decrypt(encrypted, password);
        expect(decrypted.data).toBe(originalText);
    });

    it('should fail to decrypt with wrong password', async () => {
        const encrypted = await encrypt({text: 'secret'}, 'correct-password');

        await expect(decrypt(encrypted, 'wrong-password'))
            .rejects.toThrow();
    });

    it('should preserve filename metadata', async () => {
        const password = 'test-pass';
        const encrypted = await encrypt(
            {text: 'file-content', filename: 'secret.txt'},
            password,
        );

        const decrypted = await decrypt(encrypted, password);
        expect(decrypted.data).toBe('file-content');
        expect(decrypted.filename).toBe('secret.txt');
    });
});
