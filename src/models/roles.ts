export type Role = 'customer' | 'staff' | 'admin' | 'super_admin';

export const ROLE_ASSIGNMENTS: Record<string, Role> = {
  'kshitijmay14@gmail.com': 'super_admin',
};

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
