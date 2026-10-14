/**
 * @file src/auth/password.js
 *
 * Secure password hashing and verification using Node.js crypto.scrypt.
 * Scrypt is a standard, memory-hard key derivation function recommended
 * for password storage to resist ASIC and GPU brute-force attacks.
 */

import crypto from 'node:crypto';

const SCRYPT_PARAMS = {
  N: 16384, // CPU/memory cost parameter (2^14)
  r: 8,     // Block size parameter
  p: 1,     // Parallelization parameter
};
const KEY_LEN = 64; // 512 bits

/**
 * Hash a plaintext password with a unique cryptographically random salt.
 *
 * @param {string} password - Plaintext password to hash
 * @returns {string} Formatted hash string: scrypt$N$r$p$salt$derivedKey
 */
export function hashPassword(password) {
  if (!password || typeof password !== 'string') {
    throw new Error('Password must be a non-empty string');
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, KEY_LEN, SCRYPT_PARAMS);

  return `scrypt$${SCRYPT_PARAMS.N}$${SCRYPT_PARAMS.r}$${SCRYPT_PARAMS.p}$${salt}$${derivedKey.toString('hex')}`;
}

/**
 * Verify a plaintext password against a stored scrypt hash.
 * Uses timingSafeEqual to prevent side-channel timing attacks.
 *
 * @param {string} password - Plaintext password to verify
 * @param {string} storedHash - Stored hash string
 * @returns {boolean} True if password matches, false otherwise
 */
export function verifyPassword(password, storedHash) {
  if (!password || !storedHash || typeof storedHash !== 'string') {
    return false;
  }

  const parts = storedHash.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') {
    return false;
  }

  try {
    const N = parseInt(parts[1], 10);
    const r = parseInt(parts[2], 10);
    const p = parseInt(parts[3], 10);
    const salt = parts[4];
    const expectedKeyHex = parts[5];

    if (!salt || !expectedKeyHex || isNaN(N) || isNaN(r) || isNaN(p)) {
      return false;
    }

    const expectedKey = Buffer.from(expectedKeyHex, 'hex');
    const derivedKey = crypto.scryptSync(password, salt, expectedKey.length, { N, r, p });

    if (derivedKey.length !== expectedKey.length) {
      return false;
    }

    return crypto.timingSafeEqual(derivedKey, expectedKey);
  } catch {
    return false;
  }
}
