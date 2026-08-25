import bcrypt from "bcryptjs";

/**
 * Passcode hashing.
 *
 * bcrypt is the standard, adaptive password hash. A single fixed app-wide salt
 * is used so the resulting `passcode_hash` is deterministic — this lets the
 * hash double as the UNIQUE lookup key required by the schema while the raw
 * passcode is never stored or logged.
 *
 * Override the salt via `BCRYPT_SALT` in .env.local for production.
 */

const FALLBACK_SALT = "$2b$10$YmDYFfK1oYCQE7j3bqz6LO";

function getSalt(): string {
  return process.env.BCRYPT_SALT || FALLBACK_SALT;
}

/** Deterministic bcrypt hash — same passcode always yields the same hash. */
export function hashPasscode(passcode: string): string {
  return bcrypt.hashSync(passcode, getSalt());
}

/** Verifies a plaintext passcode against a stored bcrypt hash. */
export function verifyPasscode(passcode: string, hash: string): boolean {
  return bcrypt.compareSync(passcode, hash);
}
