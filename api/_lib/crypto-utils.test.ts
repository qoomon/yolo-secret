import {describe, it, expect} from 'vitest';
import {timingSafeProveEqual} from './crypto-utils.ts';

describe('timingSafeProveEqual', () => {
    it('should return true for identical strings', () => {
        expect(timingSafeProveEqual('abc123', 'abc123')).toBe(true);
    });

    it('should return false for different strings of same length', () => {
        expect(timingSafeProveEqual('abc123', 'abc124')).toBe(false);
    });

    it('should return false for different strings of different length', () => {
        expect(timingSafeProveEqual('short', 'a-longer-string')).toBe(false);
    });

    it('should return false for empty vs non-empty strings', () => {
        expect(timingSafeProveEqual('', 'notempty')).toBe(false);
    });

    it('should return true for two empty strings', () => {
        expect(timingSafeProveEqual('', '')).toBe(true);
    });

    it('should handle base64-encoded proof strings', () => {
        const prove = 'dGVzdCBwcm9vZg==';
        expect(timingSafeProveEqual(prove, prove)).toBe(true);
        expect(timingSafeProveEqual(prove, 'ZGlmZmVyZW50IHZhbA==')).toBe(false);
    });

    it('should handle unicode strings safely', () => {
        expect(timingSafeProveEqual('héllo', 'héllo')).toBe(true);
        expect(timingSafeProveEqual('héllo', 'hèllo')).toBe(false);
    });
});
