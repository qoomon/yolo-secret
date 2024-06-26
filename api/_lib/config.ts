export const SECRET_ID_LENGTH = 16;
export const SECRET_PASSWORD_LENGTH = 32;
export const SECRET_DATA_MAX_SIZE = 1024 * 64  // 64 KB
export const SECRET_DATA_MAX_CHARS = Math.floor(SECRET_DATA_MAX_SIZE / 3 * 4); // base64 encoded data char count
export const SECRET_NAME_MAX_CHARS = 128; // 128 characters
export const SECRET_TTL_MIN = 60 * 5; // 5 minutes
export const SECRET_TTL_MAX = 60 * 60 * 24 * 14; // 14 days
export const SECRET_TTL_DEFAULT = 60 * 60 * 24 * 7; // 7 days
export const SECRET_TOMBSTONE_TTL = 60 * 60 * 24 * 7; // 7 days
export const SECRET_PASSPHRASE_MAX_LENGTH = 32;
export const SECRET_PASSPHRASE_MAX_ATTEMPTS = 3;

