'use client';

import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { AlertCircle, RefreshCw, Search } from 'lucide-react';
import Link from 'next/link';
import { parseAsInteger, parseAsString, useQueryStates } from 'nuqs';
import { Suspense, useEffect, useState } from 'react';
import { useDebounceValue } from 'usehooks-ts';

import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { PaginationControls } from '@/components/shared/pagination-controls';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { getUsers } from '@/lib/api/users';
import type { PaginatedResponse, UserListItem } from '@/lib/types';

const PAGE_SIZE = 20;
const SKELETON_ROW_KEYS = ['r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7', 'r8'];

const userListParsers = {
  search: parseAsString,
  page: parseAsInteger.withDefault(1),
};

function TruncatedId({ id }: Readonly<{ id: string }>) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span className="cursor-help font-mono text-xs">
            {id.slice(0, 8)}…
          </span>
        }
      />
      <TooltipContent>{id}</TooltipContent>
    </Tooltip>
  );
}

function UsersTable({ users }: Readonly<{ users: UserListItem[] }>) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">User</th>
            <th className="px-3 py-2 font-medium">Display Name</th>
            <th className="px-3 py-2 font-medium">WhatsApp</th>
            <th className="px-3 py-2 font-medium text-right">Orders</th>
            <th className="px-3 py-2 font-medium">Joined</th>
            <th className="px-3 py-2 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr
              key={user.id}
              className="border-t border-border/60 align-middle"
            >
              <td className="px-3 py-2">
                <TruncatedId id={user.id} />
              </td>
              <td className="px-3 py-2">
                {user.displayName ?? (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
              <td className="px-3 py-2">
                <span className="font-mono text-xs">{user.whatsappNumber}</span>
              </td>
              <td className="px-3 py-2 text-right tabular-nums">
                {user.orderCount}
              </td>
              <td className="px-3 py-2 text-xs text-muted-foreground">
                {format(parseISO(user.createdAt), 'dd MMM yyyy')}
              </td>
              <td className="px-3 py-2 text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  render={<Link href={`/users/${user.id}`} />}
                >
                  View
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function UsersTableSkeleton() {
  return (
    <div className="rounded-lg border border-border">
      {SKELETON_ROW_KEYS.map((k) => (
        <div
          key={k}
          className="flex items-center gap-3 border-b border-border/60 px-3 py-3 last:border-b-0"
        >
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-7 w-16" />
        </div>
      ))}
    </div>
  );
}

interface UsersBodyProps {
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
  data: PaginatedResponse<UserListItem> | undefined;
}

function UsersBody({ isLoading, isError, refetch, data }: Readonly<UsersBodyProps>) {
  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-16 text-muted-foreground">
        <AlertCircle className="size-8" />
        <p>Failed to load users.</p>
        <Button variant="outline" size="sm" onClick={refetch}>
          <RefreshCw className="mr-2 size-4" /> Retry
        </Button>
      </div>
    );
  }
  if (isLoading || !data) return <UsersTableSkeleton />;
  if (data.data.length === 0) {
    return (
      <EmptyState
        title="No users found"
        message="Adjust the search or wait for new sign-ups."
      />
    );
  }
  return <UsersTable users={data.data} />;
}

function UsersContent() {
  const [state, setState] = useQueryStates(userListParsers, {
    shallow: false,
  });
  const [draft, setDraft] = useState(state.search ?? '');
  const [debouncedDraft] = useDebounceValue(draft, 300);

  useEffect(() => {
    const next = debouncedDraft.trim();
    const current = state.search ?? '';
    if (next === current) return;
    setState({ search: next || null, page: 1 });
  }, [debouncedDraft, state.search, setState]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['users', state.page, state.search ?? ''],
    queryFn: () =>
      getUsers({
        page: state.page,
        limit: PAGE_SIZE,
        search: state.search ?? undefined,
      }),
  });

  return (
    <div>
      <PageHeader
        title="Users"
        description="Search and manage WhatsApp customers."
      />

      <div className="mb-4 flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Search by phone or name"
            className="pl-8"
          />
        </div>
      </div>

      <UsersBody
        isLoading={isLoading}
        isError={isError}
        refetch={refetch}
        data={data}
      />

      {data && data.data.length > 0 && (
        <div className="mt-4">
          <PaginationControls
            page={state.page}
            limit={PAGE_SIZE}
            total={data.total}
            onPageChange={(page) => setState({ page })}
          />
        </div>
      )}
    </div>
  );
}

export default function UsersPage() {
  return (
    <Suspense
      fallback={
        <div>
          <PageHeader
            title="Users"
            description="Search and manage WhatsApp customers."
          />
          <UsersTableSkeleton />
        </div>
      }
    >
      <UsersContent />
    </Suspense>
  );
}
