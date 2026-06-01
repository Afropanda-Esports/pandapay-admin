'use client';

import { ShieldOff } from 'lucide-react';

import { EmptyState } from '@/components/shared/empty-state';
import {
  hasPermission,
  type AdminPermission,
} from '@/lib/permissions';
import type { AdminRole } from '@/lib/types';

interface RequirePermissionProps {
  permission: AdminPermission;
  role: AdminRole | null | undefined;
  children: React.ReactNode;
  /** When false, render nothing instead of the default forbidden state. */
  showForbidden?: boolean;
  forbiddenTitle?: string;
  forbiddenMessage?: string;
}

export function RequirePermission({
  permission,
  role,
  children,
  showForbidden = false,
  forbiddenTitle = 'Access restricted',
  forbiddenMessage = 'Your role does not include permission for this action. Contact a Super Admin if you need access.',
}: Readonly<RequirePermissionProps>) {
  if (hasPermission(role, permission)) {
    return <>{children}</>;
  }

  if (!showForbidden) {
    return null;
  }

  return (
    <EmptyState
      icon={ShieldOff}
      title={forbiddenTitle}
      message={forbiddenMessage}
    />
  );
}
