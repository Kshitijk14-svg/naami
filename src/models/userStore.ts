import { Role, ROLE_ASSIGNMENTS } from './roles';

export interface UserRecord {
  email: string;
  name?: string;
  role: Role;
  createdAt: number;
}

// PRODUCTION NOTE: This in-memory store resets on every server restart and
// does not work across multiple serverless function instances. Replace with
// Supabase, PlanetScale, or Upstash Redis before deploying to production.
const userStore = new Map<string, UserRecord>();

export function getOrCreateUser(email: string, name?: string): UserRecord {
  const normalized = email.toLowerCase().trim();

  if (userStore.has(normalized)) {
    return userStore.get(normalized)!;
  }

  const role: Role = ROLE_ASSIGNMENTS[normalized] ?? 'customer';
  const user: UserRecord = { email: normalized, name, role, createdAt: Date.now() };
  userStore.set(normalized, user);
  return user;
}

export function getUser(email: string): UserRecord | undefined {
  return userStore.get(email.toLowerCase().trim());
}
