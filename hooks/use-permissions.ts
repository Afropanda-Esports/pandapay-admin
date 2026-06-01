'use client';

import {
  hasPermission,
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
  type AdminPermission,
} from '@/lib/permissions';
import { useMe } from '@/hooks/use-me';
import type { AdminRole } from '@/lib/types';

export function usePermissions() {
  const { data: me, isLoading } = useMe();
  const role = me?.role ?? null;

  return {
    me,
    isLoading,
    role,
    roleLabel: role ? ROLE_LABELS[role] : '',
    roleDescription: role ? ROLE_DESCRIPTIONS[role] : '',
    isSuperAdmin: role === 'SUPER_ADMIN',
    isManager: role === 'ADMIN',
    can: (permission: AdminPermission) => hasPermission(role, permission),
  };
}

export function roleLabel(role: AdminRole): string {
  return ROLE_LABELS[role];
}
