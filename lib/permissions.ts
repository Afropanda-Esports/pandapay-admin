import type { AdminRole } from '@/lib/types';

/** Fine-grained admin capabilities (UI + documented API expectations). */
export type AdminPermission =
  | 'dashboard:view'
  | 'orders:view'
  | 'orders:manage'
  | 'users:view'
  | 'users:manage'
  | 'products:view'
  | 'products:manage'
  | 'products:pricing'
  | 'pricing:view'
  | 'pricing:manage'
  | 'fraud:view'
  | 'fraud:manage'
  | 'audit:view'
  | 'admins:manage';

const MANAGER_PERMISSIONS: AdminPermission[] = [
  'dashboard:view',
  'orders:view',
  'orders:manage',
  'users:view',
  'users:manage',
  'products:view',
  'products:manage',
  'pricing:view',
  'fraud:view',
  'fraud:manage',
  'audit:view',
];

const SUPER_ADMIN_PERMISSIONS: AdminPermission[] = [
  ...MANAGER_PERMISSIONS,
  'products:pricing',
  'pricing:manage',
  'admins:manage',
];

const ROLE_PERMISSIONS: Record<AdminRole, ReadonlySet<AdminPermission>> = {
  SUPER_ADMIN: new Set(SUPER_ADMIN_PERMISSIONS),
  ADMIN: new Set(MANAGER_PERMISSIONS),
};

export function hasPermission(
  role: AdminRole | null | undefined,
  permission: AdminPermission,
): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role].has(permission);
}

export const ROLE_LABELS: Record<AdminRole, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Manager',
};

export const ROLE_DESCRIPTIONS: Record<AdminRole, string> = {
  SUPER_ADMIN:
    'Full root access — team management, global FX, product pricing modes, and all day-to-day operations.',
  ADMIN:
    'Day-to-day operations — orders, users, catalog stock, fraud review, and audit (no team or global FX changes).',
};
