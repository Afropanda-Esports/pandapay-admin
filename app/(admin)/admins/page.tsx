'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import {
  AlertCircle,
  Copy,
  KeyRound,
  Lock,
  RefreshCw,
  ShieldCheck,
  ShieldOff,
  Unlock,
  UserCog,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { CreateAdminDialog } from '@/components/features/admins/create-admin-dialog';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useMe } from '@/hooks/use-me';
import { ApiError } from '@/lib/api/client';
import {
  getAdmins,
  resetAdminPassword,
  updateAdmin,
} from '@/lib/api/admins';
import type { AdminUser } from '@/lib/types';

const SKELETON_KEYS = ['r1', 'r2', 'r3', 'r4'];

function RoleBadge({ role }: Readonly<{ role: AdminUser['role'] }>) {
  if (role === 'SUPER_ADMIN') {
    return (
      <Badge className="bg-info-100 text-info-700 hover:bg-info-100 border-0">
        <ShieldCheck className="size-3" />
        Super Admin
      </Badge>
    );
  }
  return (
    <Badge className="bg-neutral-100 text-neutral-500 hover:bg-neutral-100 border-0">
      Manager
    </Badge>
  );
}

function StatusBadge({ active }: Readonly<{ active: boolean }>) {
  return active ? (
    <Badge className="bg-success-100 text-success-700 hover:bg-success-100 border-0">
      Active
    </Badge>
  ) : (
    <Badge className="bg-error-100 text-error-700 hover:bg-error-100 border-0">
      Deactivated
    </Badge>
  );
}

function LastLoginCell({ at }: Readonly<{ at: string | null }>) {
  if (!at) {
    return <span className="text-xs text-muted-foreground">Never</span>;
  }
  const d = parseISO(at);
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span className="cursor-help text-xs text-muted-foreground">
            {formatDistanceToNow(d, { addSuffix: true })}
          </span>
        }
      />
      <TooltipContent>{format(d, 'PPpp')}</TooltipContent>
    </Tooltip>
  );
}

interface AdminRowProps {
  admin: AdminUser;
  isSelf: boolean;
}

function AdminRow({ admin, isSelf }: Readonly<AdminRowProps>) {
  const queryClient = useQueryClient();
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  const setActive = useMutation({
    mutationFn: (next: boolean) =>
      updateAdmin(admin.id, { isActive: next }),
    onSuccess: (_, next) => {
      toast.success(next ? 'Admin reactivated' : 'Admin deactivated');
      queryClient.invalidateQueries({ queryKey: ['admins'] });
      queryClient.invalidateQueries({ queryKey: ['admin-directory'] });
    },
    onError: (err) => {
      const message =
        err instanceof ApiError ? err.message : 'Could not update admin';
      toast.error(message);
    },
  });

  const setRole = useMutation({
    mutationFn: (role: AdminUser['role']) =>
      updateAdmin(admin.id, { role }),
    onSuccess: (_, role) => {
      toast.success(
        role === 'SUPER_ADMIN'
          ? 'Promoted to Super Admin'
          : 'Demoted to Admin',
      );
      queryClient.invalidateQueries({ queryKey: ['admins'] });
      queryClient.invalidateQueries({ queryKey: ['admin-directory'] });
    },
    onError: (err) => {
      const message =
        err instanceof ApiError ? err.message : 'Could not update role';
      toast.error(message);
    },
  });

  const resetPwd = useMutation({
    mutationFn: () => resetAdminPassword(admin.id),
    onSuccess: (res) => {
      setTempPassword(res.temporaryPassword);
      queryClient.invalidateQueries({ queryKey: ['admins'] });
    },
    onError: (err) => {
      const message =
        err instanceof ApiError ? err.message : 'Could not reset password';
      toast.error(message);
    },
  });

  const handleCopyTemp = async () => {
    if (!tempPassword) return;
    try {
      await navigator.clipboard.writeText(tempPassword);
      toast.success('Password copied to clipboard');
    } catch {
      toast.error('Could not copy — copy manually');
    }
  };

  return (
    <>
      <tr className="border-t border-border/60 align-middle">
        <td className="px-3 py-2">
          <div className="font-medium">
            {admin.displayName}
            {isSelf && (
              <span className="ml-2 text-xs text-muted-foreground">(you)</span>
            )}
          </div>
        </td>
        <td className="px-3 py-2 text-xs text-muted-foreground break-all">
          {admin.email}
        </td>
        <td className="px-3 py-2">
          <RoleBadge role={admin.role} />
        </td>
        <td className="px-3 py-2">
          <StatusBadge active={admin.isActive} />
          {admin.mustChangePassword && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <span className="ml-2 inline-flex items-center gap-1 text-xs text-warning-700">
                    <KeyRound className="size-3" />
                    needs PW
                  </span>
                }
              />
              <TooltipContent>
                Will be required to set a new password on next login
              </TooltipContent>
            </Tooltip>
          )}
        </td>
        <td className="px-3 py-2">
          <LastLoginCell at={admin.lastLoginAt} />
        </td>
        <td className="px-3 py-2 text-right">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="sm">
                  <UserCog className="size-3.5" />
                  Actions
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="w-56">
              <ConfirmDialog
                trigger={
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <KeyRound className="size-4" />
                    Reset password
                  </DropdownMenuItem>
                }
                title="Reset this admin's password?"
                description={`A new one-time password will be generated for ${admin.email}. They will be forced to change it at next login.`}
                confirmLabel="Reset password"
                isPending={resetPwd.isPending}
                onConfirm={async () => {
                  await resetPwd.mutateAsync();
                }}
              />

              <DropdownMenuSeparator />

              {admin.role === 'SUPER_ADMIN' ? (
                <ConfirmDialog
                  trigger={
                    <DropdownMenuItem
                      onSelect={(e) => e.preventDefault()}
                      disabled={isSelf}
                    >
                      <ShieldOff className="size-4" />
                      Demote to Admin
                    </DropdownMenuItem>
                  }
                  title="Demote this Super Admin?"
                  description={`${admin.email} will lose super-admin privileges (admin user management, FX rate updates).`}
                  confirmLabel="Demote"
                  isPending={setRole.isPending}
                  onConfirm={async () => {
                    await setRole.mutateAsync('ADMIN');
                  }}
                />
              ) : (
                <ConfirmDialog
                  trigger={
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <ShieldCheck className="size-4" />
                      Promote to Super Admin
                    </DropdownMenuItem>
                  }
                  title="Promote to Super Admin?"
                  description={`${admin.email} will gain full admin privileges including managing other admins and updating the FX rate.`}
                  confirmLabel="Promote"
                  isPending={setRole.isPending}
                  onConfirm={async () => {
                    await setRole.mutateAsync('SUPER_ADMIN');
                  }}
                />
              )}

              <DropdownMenuSeparator />

              {admin.isActive ? (
                <ConfirmDialog
                  trigger={
                    <DropdownMenuItem
                      onSelect={(e) => e.preventDefault()}
                      disabled={isSelf}
                      className="text-destructive"
                    >
                      <Lock className="size-4" />
                      Deactivate
                    </DropdownMenuItem>
                  }
                  title="Deactivate this admin?"
                  description={`${admin.email} will be unable to log in. Their audit log entries are preserved. You can reactivate them later.`}
                  confirmLabel="Deactivate"
                  variant="destructive"
                  isPending={setActive.isPending}
                  onConfirm={async () => {
                    await setActive.mutateAsync(false);
                  }}
                />
              ) : (
                <ConfirmDialog
                  trigger={
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <Unlock className="size-4" />
                      Reactivate
                    </DropdownMenuItem>
                  }
                  title="Reactivate this admin?"
                  description={`${admin.email} will be able to log in again with their existing credentials.`}
                  confirmLabel="Reactivate"
                  isPending={setActive.isPending}
                  onConfirm={async () => {
                    await setActive.mutateAsync(true);
                  }}
                />
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </td>
      </tr>

      <Dialog
        open={tempPassword !== null}
        onOpenChange={(open) => !open && setTempPassword(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Password reset</DialogTitle>
            <DialogDescription>
              Share this one-time password with {admin.email} through a
              trusted channel. You will not see it again.
            </DialogDescription>
          </DialogHeader>

          <div className="my-4 rounded-lg border border-border bg-muted/40 p-4 space-y-2">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              Temporary password
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 select-all rounded bg-background px-3 py-2 font-mono text-sm">
                {tempPassword ?? ''}
              </code>
              <Button variant="outline" size="sm" onClick={handleCopyTemp}>
                <Copy className="size-3.5" />
                Copy
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {admin.email} must change this password on next login.
            </p>
          </div>

          <DialogFooter>
            <Button onClick={() => setTempPassword(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function AdminsTable({
  admins,
  meId,
}: Readonly<{ admins: AdminUser[]; meId: string | undefined }>) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">Name</th>
            <th className="px-3 py-2 font-medium">Email</th>
            <th className="px-3 py-2 font-medium">Role</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Last login</th>
            <th className="px-3 py-2 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {admins.map((admin) => (
            <AdminRow
              key={admin.id}
              admin={admin}
              isSelf={admin.id === meId}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AdminsTableSkeleton() {
  return (
    <div className="rounded-lg border border-border">
      {SKELETON_KEYS.map((k) => (
        <div
          key={k}
          className="flex items-center gap-3 border-b border-border/60 px-3 py-3 last:border-b-0"
        >
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-7 w-20" />
        </div>
      ))}
    </div>
  );
}

function ForbiddenState() {
  return (
    <div>
      <PageHeader
        title="Team"
        description="Super Admins manage operators (Managers and other Super Admins)."
      />
      <EmptyState
        title="Super admin access required"
        message="You don't have permission to view this page. Ask a super admin to grant you access."
      />
    </div>
  );
}

export default function AdminsPage() {
  const { data: me, isLoading: meLoading } = useMe();
  const isSuperAdmin = me?.role === 'SUPER_ADMIN';

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admins'],
    queryFn: getAdmins,
    enabled: isSuperAdmin,
  });

  if (meLoading) {
    return (
      <div>
        <PageHeader
          title="Admins"
          description="Manage who has access to the admin panel."
        />
        <AdminsTableSkeleton />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return <ForbiddenState />;
  }

  return (
    <div>
      <PageHeader
        title="Team"
        description="Super Admins manage operators (Managers and other Super Admins)."
        actions={<CreateAdminDialog />}
      />

      {isError ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-16 text-muted-foreground">
          <AlertCircle className="size-8" />
          <p>Failed to load admins.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="mr-2 size-4" /> Retry
          </Button>
        </div>
      ) : isLoading || !data ? (
        <AdminsTableSkeleton />
      ) : data.length === 0 ? (
        <EmptyState
          title="No admins yet"
          message="Invite your first admin to share workload."
        />
      ) : (
        <AdminsTable admins={data} meId={me?.id} />
      )}
    </div>
  );
}
