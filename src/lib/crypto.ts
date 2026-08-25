import crypto from "node:crypto";

/**
 * AES-256-GCM document encryption.
 *
 * All document bodies are encrypted with a 256-bit key derived from the
 * `ENCRYPTION_KEY` environment variable before they touch the database.
 *
 * If `ENCRYPTION_KEY` is missing the module degrades gracefully to clear
 * text (so the app stays usable locally) but logs a server-side warning.
 */

const ALGORITHM = "aes-256-gcm";

let warnedOnce = false;

/**
 * Derives a stable 32-byte key from ENCRYPTION_KEY.
 * Accepts a 64-char hex string or any arbitrary secret (hashed with SHA-256).
 * Returns null when the env var is absent so callers can fall back to plaintext.
 */
function getKey(): Buffer | null {
  const secret = process.env.ENCRYPTION_KEY;

  if (!secret) {
    if (!warnedOnce) {
      console.warn(
        "[crypto] ENCRYPTION_KEY is not set — falling back to clear text. " +
          "Set ENCRYPTION_KEY in .env.local to enable AES-256-GCM encryption."
      );
      warnedOnce = true;
    }
    return null;
  }

  if (/^[0-9a-fA-F]{64}$/.test(secret)) {
    return Buffer.from(secret, "hex");
  }

  return crypto.createHash("sha256").update(secret).digest();
}

export type EncryptedPayload = {
  encryptedContent: string;
  iv: string;
  authTag: string;
};

export function isEncryptionEnabled(): boolean {
  return Boolean(process.env.ENCRYPTION_KEY);
}

/**
 * Encrypts a UTF-8 string using AES-256-GCM.
 * Falls back to clear text (with a one-time server warning) when no key is set.
 */
export function encrypt(plaintext: string): EncryptedPayload {
  const key = getKey();

  if (!key) {
    return { encryptedContent: plaintext, iv: "", authTag: "" };
  }

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  return {
    encryptedContent: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
  };
}

/**
 * Decrypts an AES-256-GCM payload back to a UTF-8 string.
 * Mirrors the clear-text fallback used by `encrypt`.
 */
export function decrypt(
  encryptedContent: string,
  iv: string,
  authTag: string
): string {
  const key = getKey();

  if (!key) {
    return encryptedContent;
  }

  if (!encryptedContent || !iv || !authTag) {
    return "";
  }

  try {
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      key,
      Buffer.from(iv, "base64")
    );
    decipher.setAuthTag(Buffer.from(authTag, "base64"));

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedContent, "base64")),
      decipher.final(),
    ]);

    return decrypted.toString("utf8");
  } catch (error) {
    console.error("[crypto] Failed to decrypt workspace content:", error);
    return "";
  }
}
