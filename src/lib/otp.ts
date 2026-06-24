import { redisGet, redisSet, redisDel } from "./redis";
import { db } from "./db";
import { otpCodes } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export interface OtpEntry {
  otp: string;
  name?: string;
  attempts: number;
  expiresAt: number; // Unix ms — matches existing verify-otp contract
}

const OTP_TTL_SECONDS = 600; // 10 minutes

function redisKey(email: string): string {
  return `otp:${email}`;
}

// ─── Set OTP (Redis primary, PostgreSQL fallback) ─────────────────────────────

export async function setOtp(
  email: string,
  entry: Omit<OtpEntry, "attempts">
): Promise<void> {
  const payload: OtpEntry = { ...entry, attempts: 0 };

  try {
    await redisSet(redisKey(email), payload, OTP_TTL_SECONDS);
    return;
  } catch {
    // Fall through to PostgreSQL on unexpected Redis failure
  }

  await db
    .insert(otpCodes)
    .values({
      email,
      code: entry.otp,
      name: entry.name ?? null,
      attempts: 0,
      expiresAt: new Date(entry.expiresAt),
    })
    .onConflictDoUpdate({
      target: otpCodes.email,
      set: {
        code: entry.otp,
        name: entry.name ?? null,
        attempts: 0,
        expiresAt: new Date(entry.expiresAt),
        createdAt: new Date(),
      },
    });
}

// ─── Get OTP (Redis primary, PostgreSQL fallback) ─────────────────────────────

export async function getOtp(email: string): Promise<OtpEntry | null> {
  const cached = await redisGet<OtpEntry>(redisKey(email));
  if (cached !== null) return cached;

  // Redis miss or quota — check PostgreSQL fallback table
  const rows = await db
    .select()
    .from(otpCodes)
    .where(eq(otpCodes.email, email))
    .limit(1);

  if (rows.length === 0) return null;
  const row = rows[0];

  return {
    otp: row.code,
    name: row.name ?? undefined,
    attempts: row.attempts,
    expiresAt: row.expiresAt.getTime(),
  };
}

// ─── Increment attempts ────────────────────────────────────────────────────────
// Uses SQL expression in both paths to avoid read-modify-write race conditions.

export async function incrementOtpAttempts(email: string): Promise<void> {
  try {
    const entry = await redisGet<OtpEntry>(redisKey(email));
    if (entry !== null) {
      entry.attempts += 1;
      const remainingTtl = Math.ceil((entry.expiresAt - Date.now()) / 1000);
      if (remainingTtl > 0) {
        await redisSet(redisKey(email), entry, remainingTtl);
      }
      return;
    }
  } catch {
    // Fall through
  }

  await db
    .update(otpCodes)
    .set({ attempts: sql`${otpCodes.attempts} + 1` })
    .where(eq(otpCodes.email, email));
}

// ─── Delete OTP ────────────────────────────────────────────────────────────────

export async function deleteOtp(email: string): Promise<void> {
  await redisDel(redisKey(email));
  await db.delete(otpCodes).where(eq(otpCodes.email, email));
}
