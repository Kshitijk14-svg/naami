/**
 * One-off / rerunnable bootstrap for an admin account, bypassing the normal
 * email-OTP signup round-trip (src/app/api/auth/{send-otp,verify-otp}) — useful
 * on a fresh deploy where there is no data yet, or outbound email isn't
 * confirmed working, but you still need to get into /admin.
 *
 * Reuses the app's own account-creation path (hashPassword + upsertUserWithPassword)
 * rather than inserting a row by hand, so the resulting account is byte-for-byte
 * what the real signup flow would have produced — same hash format, and the
 * same ROLE_ASSIGNMENTS (src/models/roles.ts) lookup applied on create.
 *
 * Usage:
 *   npx tsx src/db/createSuperAdmin.ts <email> <password> [name]
 *
 * Rerunning with a different password rotates that account's password — this
 * is also the recovery path if email-based "forgot password" isn't available yet.
 */
import { loadEnvConfig } from "@next/env";

// Must run before importing anything that reads process.env.DATABASE_URL —
// mirrors how drizzle.config.ts loads .env*, since this script (like that
// config) runs via bare `tsx`, outside Next.js's own env bootstrapping.
loadEnvConfig(process.cwd());

async function main() {
  const [, , email, password, name] = process.argv;

  if (!email || !password) {
    console.error("Usage: npx tsx src/db/createSuperAdmin.ts <email> <password> [name]");
    process.exitCode = 1;
    return;
  }

  const { isPasswordStrongEnough, hashPassword } = await import("@/lib/password");
  const { upsertUserWithPassword } = await import("@/db/queries/users");
  const { pools } = await import("@/lib/db");

  try {
    if (!isPasswordStrongEnough(password)) {
      console.error("Password must be at least 8 characters.");
      process.exitCode = 1;
      return;
    }

    const passwordHash = await hashPassword(password);
    const user = await upsertUserWithPassword(email, passwordHash, name ?? null);

    // Never log the password or its hash — only the outcome.
    console.log("OK:", { email: user.email, role: user.role });
  } finally {
    // Bare tsx run: nothing else keeps the process alive, but an open pg Pool
    // does — close it explicitly so the script actually exits.
    await pools.primary.end();
    if (pools.replica) await pools.replica.end();
  }
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exitCode = 1;
});
