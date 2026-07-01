import { scrypt, randomBytes, timingSafeEqual, type ScryptOptions } from "node:crypto";

// Hand-rolled promise wrapper: promisify() collapses scrypt to its 3-arg
// overload and drops the options parameter we need for the cost factors.
function scryptAsync(
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options: ScryptOptions
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keylen, options, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey);
    });
  });
}

// ─── scrypt parameters ─────────────────────────────────────────────────────────
// N=2^15 (32768) is comfortably above OWASP's minimum (2^14) for interactive logins.
// maxmem must be raised above Node's 32MB default because scrypt memory ≈ 128 * N * r.
const KEYLEN = 64;
const SALT_BYTES = 16;
const PARAMS = { N: 32768, r: 8, p: 1, maxmem: 128 * 1024 * 1024 } as const;
const MIN_PASSWORD_LENGTH = 8;

export function isPasswordStrongEnough(password: string): boolean {
  return typeof password === "string" && password.length >= MIN_PASSWORD_LENGTH;
}

/**
 * Hash a password with scrypt. Returns a self-describing string that bundles the
 * algorithm, parameters, salt, and derived key so verification needs no other state:
 *   scrypt$N$r$p$<salt-b64>$<hash-b64>
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const derived = (await scryptAsync(
    password.normalize("NFKC"),
    salt,
    KEYLEN,
    PARAMS
  )) as Buffer;
  return [
    "scrypt",
    PARAMS.N,
    PARAMS.r,
    PARAMS.p,
    salt.toString("base64"),
    derived.toString("base64"),
  ].join("$");
}

/**
 * Verify a candidate password against a stored hash produced by hashPassword.
 * Constant-time comparison; returns false on any malformed input rather than throwing.
 */
export async function verifyPassword(
  password: string,
  stored: string | null | undefined
): Promise<boolean> {
  if (!stored) return false;
  try {
    const [scheme, nStr, rStr, pStr, saltB64, hashB64] = stored.split("$");
    if (scheme !== "scrypt") return false;

    const N = Number(nStr);
    const r = Number(rStr);
    const p = Number(pStr);
    if (!N || !r || !p) return false;

    const expected = Buffer.from(hashB64, "base64");
    const derived = (await scryptAsync(
      password.normalize("NFKC"),
      Buffer.from(saltB64, "base64"),
      expected.length,
      { N, r, p, maxmem: PARAMS.maxmem }
    )) as Buffer;

    return derived.length === expected.length && timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}
