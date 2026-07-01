import {
  randomBytes,
  createCipheriv,
  createDecipheriv,
  timingSafeEqual,
} from "node:crypto";

// App-layer field encryption for PII at rest (e.g. shipping phone/address),
// complementing TLS-in-transit (DATABASE_SSL) and the DB's own at-rest encryption.
// AES-256-GCM gives confidentiality + integrity (the auth tag detects tampering).
//
// Self-describing output — verification/decryption needs no external state:
//   v1$<iv-b64>$<authTag-b64>$<ciphertext-b64>

const SCHEME = "v1";
const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12; // 96-bit nonce, the GCM standard
const KEY_BYTES = 32; // AES-256

let _key: Buffer | null = null;

/**
 * ENCRYPTION_KEY must be a base64-encoded 32-byte key.
 * Generate one with: `openssl rand -base64 32`.
 */
function getKey(): Buffer {
  if (_key) return _key;
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) throw new Error("ENCRYPTION_KEY is not set");
  const key = Buffer.from(raw, "base64");
  if (key.length !== KEY_BYTES) {
    throw new Error(`ENCRYPTION_KEY must decode to ${KEY_BYTES} bytes (got ${key.length})`);
  }
  _key = key;
  return key;
}

/** True when an ENCRYPTION_KEY is configured — callers can skip encryption in dev. */
export function isEncryptionConfigured(): boolean {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) return false;
  try {
    return Buffer.from(raw, "base64").length === KEY_BYTES;
  } catch {
    return false;
  }
}

export function encryptField(plaintext: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return [
    SCHEME,
    iv.toString("base64"),
    authTag.toString("base64"),
    ciphertext.toString("base64"),
  ].join("$");
}

/**
 * Decrypt a value produced by encryptField. Returns null on any malformed input
 * or failed integrity check rather than throwing.
 */
export function decryptField(stored: string | null | undefined): string | null {
  if (!stored) return null;
  try {
    const [scheme, ivB64, tagB64, dataB64] = stored.split("$");
    if (scheme !== SCHEME) return null;
    const iv = Buffer.from(ivB64, "base64");
    const authTag = Buffer.from(tagB64, "base64");
    const ciphertext = Buffer.from(dataB64, "base64");
    const decipher = createDecipheriv(ALGORITHM, getKey(), iv);
    decipher.setAuthTag(authTag);
    const plaintext = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);
    return plaintext.toString("utf8");
  } catch {
    return null;
  }
}

/** Heuristic: does this string look like our encrypted envelope? */
export function isEncrypted(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith(SCHEME + "$");
}

/**
 * Constant-time equality for two encoded values — exported for callers that
 * need to compare secrets without leaking timing (kept alongside the crypto lib).
 */
export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}
