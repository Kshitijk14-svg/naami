export type Role = 'customer' | 'staff' | 'admin' | 'super_admin';

/**
 * Email -> role grants applied at account creation. Sourced from
 * SUPER_ADMIN_EMAIL rather than a committed literal, so the privileged identity
 * is not published in the repository and can differ per environment.
 */
export function roleForEmail(email: string): Role {
  const superAdmin = process.env.SUPER_ADMIN_EMAIL?.toLowerCase().trim();
  if (superAdmin && email.toLowerCase().trim() === superAdmin) return 'super_admin';
  return 'customer';
}

export const ROLE_REDIRECT: Record<Role, string> = {
  customer: '/',
  staff: '/admin',
  admin: '/admin',
  super_admin: '/admin',
};

export const ROLE_LABELS: Record<Role, string> = {
  customer: 'Customer',
  staff: 'Staff',
  admin: 'Admin',
  super_admin: 'Super Admin',
};
