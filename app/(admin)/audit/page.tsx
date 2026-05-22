'use client';

import { useQuery } from '@tanstack/react-query';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import {
  AlertCircle,
  CalendarIcon,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  X,
} from 'lucide-react';
import {
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
} from 'nuqs';
import { Fragment, Suspense, useState } from 'react';
import type { DateRange } from 'react-day-picker';

import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { PaginationControls } from '@/components/shared/pagination-controls';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { getAuditLogs } from '@/lib/api/audit';
import { getAdminDirectory } from '@/lib/api/admins';
import { cn } from '@/lib/utils';
import type {
  AdminDirectoryItem,
  AuditAction,
  AuditLog,
  PaginatedResponse,
} from '@/lib/types';

const PAGE_SIZE = 20;
const SKELETON_ROW_KEYS = ['r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7', 'r8'];
const ALL = '__all__';

const ACTION_VALUES = [
  'WALLET_CREDIT',
  'WALLET_DEBIT',
  'ORDER_FULFILLED',
  'ORDER_FAILED',
  'ORDER_EXPIRED',
  'ADMIN_RESEND',
  'ADMIN_WALLET_CREDIT',
  'ADMIN_FORCE_FULFILL',
  'USER_CREATED',
  'PIN_SET',
  'PIN_LOCKED',
  'PIN_UNLOCKED',
  'ADMIN_LOGIN',
  'ADMIN_CREATED',
  'ADMIN_UPDATED',
  'ADMIN_DEACTIVATED',
  'ADMIN_PASSWORD_RESET',
  'ADMIN_PASSWORD_CHANGED',
  'PRODUCT_CREATED',
  'PRODUCT_UPDATED',
  'PRODUCT_PRICING_UPDATED',
  'PRODUCT_AVAILABILITY_CHANGED',
  'VOUCHERS_UPLOADED',
  'FX_RATE_UPDATED',
  'PRODUCTS_RECOMPUTED',
] as const satisfies readonly AuditAction[];

const ACTION_LABEL: Record<AuditAction, string> = {
  WALLET_CREDIT: 'Wallet credit',
  WALLET_DEBIT: 'Wallet debit',
  ORDER_FULFILLED: 'Order fulfilled',
  ORDER_FAILED: 'Order failed',
  ORDER_EXPIRED: 'Order expired',
  ADMIN_RESEND: 'Admin resend',
  ADMIN_WALLET_CREDIT: 'Admin wallet credit',
  ADMIN_FORCE_FULFILL: 'Admin force fulfill',
  USER_CREATED: 'User created',
  PIN_SET: 'PIN set',
  PIN_LOCKED: 'PIN locked',
  PIN_UNLOCKED: 'PIN unlocked',
  ADMIN_LOGIN: 'Admin login',
  ADMIN_CREATED: 'Admin created',
  ADMIN_UPDATED: 'Admin updated',
  ADMIN_DEACTIVATED: 'Admin deactivated',
  ADMIN_PASSWORD_RESET: 'Admin password reset',
  ADMIN_PASSWORD_CHANGED: 'Admin password changed',
  PRODUCT_CREATED: 'Product created',
  PRODUCT_UPDATED: 'Product updated',
  PRODUCT_PRICING_UPDATED: 'Product pricing updated',
  PRODUCT_AVAILABILITY_CHANGED: 'Product availability changed',
  VOUCHERS_UPLOADED: 'Vouchers uploaded',
  FX_RATE_UPDATED: 'FX rate updated',
  PRODUCTS_RECOMPUTED: 'Products recomputed',
};

const ACTION_SELECT_ITEMS: Record<string, string> = {
  [ALL]: 'All actions',
  ...ACTION_LABEL,
};

const ACTION_STYLES: Record<AuditAction, string> = {
  WALLET_CREDIT: 'bg-success-100 text-success-700 hover:bg-success-100',
  WALLET_DEBIT: 'bg-info-100 text-info-700 hover:bg-info-100',
  ORDER_FULFILLED: 'bg-success-100 text-success-700 hover:bg-success-100',
  ORDER_FAILED: 'bg-error-100 text-error-700 hover:bg-error-100',
  ORDER_EXPIRED: 'bg-neutral-100 text-neutral-500 hover:bg-neutral-100',
  ADMIN_RESEND: 'bg-info-100 text-info-700 hover:bg-info-100',
  ADMIN_WALLET_CREDIT: 'bg-success-100 text-success-700 hover:bg-success-100',
  ADMIN_FORCE_FULFILL: 'bg-success-100 text-success-700 hover:bg-success-100',
  USER_CREATED: 'bg-info-100 text-info-700 hover:bg-info-100',
  PIN_SET: 'bg-neutral-100 text-neutral-500 hover:bg-neutral-100',
  PIN_LOCKED: 'bg-warning-100 text-warning-700 hover:bg-warning-100',
  PIN_UNLOCKED: 'bg-success-100 text-success-700 hover:bg-success-100',
  ADMIN_LOGIN: 'bg-neutral-100 text-neutral-500 hover:bg-neutral-100',
  ADMIN_CREATED: 'bg-info-100 text-info-700 hover:bg-info-100',
  ADMIN_UPDATED: 'bg-info-100 text-info-700 hover:bg-info-100',
  ADMIN_DEACTIVATED: 'bg-warning-100 text-warning-700 hover:bg-warning-100',
  ADMIN_PASSWORD_RESET: 'bg-warning-100 text-warning-700 hover:bg-warning-100',
  ADMIN_PASSWORD_CHANGED: 'bg-success-100 text-success-700 hover:bg-success-100',
  PRODUCT_CREATED: 'bg-info-100 text-info-700 hover:bg-info-100',
  PRODUCT_UPDATED: 'bg-info-100 text-info-700 hover:bg-info-100',
  PRODUCT_PRICING_UPDATED: 'bg-info-100 text-info-700 hover:bg-info-100',
  PRODUCT_AVAILABILITY_CHANGED: 'bg-neutral-100 text-neutral-500 hover:bg-neutral-100',
  VOUCHERS_UPLOADED: 'bg-success-100 text-success-700 hover:bg-success-100',
  FX_RATE_UPDATED: 'bg-warning-100 text-warning-700 hover:bg-warning-100',
  PRODUCTS_RECOMPUTED: 'bg-info-100 text-info-700 hover:bg-info-100',
};

const auditListParsers = {
  actor: parseAsString,
  action: parseAsStringLiteral(ACTION_VALUES),
  from: parseAsString,
  to: parseAsString,
  page: parseAsInteger.withDefault(1),
};

function ActionBadge({ action }: Readonly<{ action: AuditAction }>) {
  return (
    <Badge className={cn('font-medium border-0', ACTION_STYLES[action])}>
      {ACTION_LABEL[action]}
    </Badge>
  );
}

type AdminLookup = Map<string, AdminDirectoryItem>;

function ActorCell({
  actor,
  adminLookup,
}: Readonly<{ actor: string; adminLookup: AdminLookup }>) {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-/.test(actor);
  if (!isUuid) {
    // 'system', 'admin' (legacy), or a WhatsApp number — display as-is.
    return <span className="font-mono text-xs">{actor}</span>;
  }

  const admin = adminLookup.get(actor);
  if (admin) {
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <span className="cursor-help text-xs">
              <span className="font-medium">{admin.displayName}</span>
              {admin.role === 'SUPER_ADMIN' && (
                <span className="ml-1 text-muted-foreground">(super)</span>
              )}
            </span>
          }
        />
        <TooltipContent>{actor}</TooltipContent>
      </Tooltip>
    );
  }

  // Unknown UUID — deactivated/deleted admin or a user UUID (PIN_SET, USER_CREATED).
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span className="cursor-help font-mono text-xs text-muted-foreground">
            {actor.slice(0, 8)}…
          </span>
        }
      />
      <TooltipContent>{actor}</TooltipContent>
    </Tooltip>
  );
}

function MetadataCell({
  metadata,
  expanded,
  onToggle,
}: Readonly<{
  metadata: Record<string, unknown>;
  expanded: boolean;
  onToggle: () => void;
}>) {
  const keys = Object.keys(metadata);
  if (keys.length === 0) {
    return <span className="text-muted-foreground">—</span>;
  }
  const Icon = expanded ? ChevronDown : ChevronRight;
  return (
    <button
      type="button"
      onClick={onToggle}
      className="inline-flex items-center gap-1 rounded text-left text-xs text-muted-foreground hover:text-foreground"
    >
      <Icon className="size-3.5" />
      {expanded ? 'Hide' : `${keys.length} field${keys.length === 1 ? '' : 's'}`}
    </button>
  );
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function TimeCell({ iso }: Readonly<{ iso: string }>) {
  const d = parseISO(iso);
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

function AuditTable({
  logs,
  adminLookup,
}: Readonly<{ logs: AuditLog[]; adminLookup: AdminLookup }>) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">Actor</th>
            <th className="px-3 py-2 font-medium">Action</th>
            <th className="px-3 py-2 font-medium">Metadata</th>
            <th className="px-3 py-2 font-medium">Time</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => {
            const isOpen = expanded === log.id;
            return (
              <Fragment key={log.id}>
                <tr className="border-t border-border/60 align-middle">
                  <td className="px-3 py-2">
                    <ActorCell actor={log.actor} adminLookup={adminLookup} />
                  </td>
                  <td className="px-3 py-2">
                    <ActionBadge action={log.action} />
                  </td>
                  <td className="px-3 py-2">
                    <MetadataCell
                      metadata={log.metadata}
                      expanded={isOpen}
                      onToggle={() => setExpanded(isOpen ? null : log.id)}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <TimeCell iso={log.createdAt} />
                  </td>
                </tr>
                {isOpen && (
                  <tr className="border-t border-border/60 bg-muted/30">
                    <td colSpan={4} className="px-3 py-3">
                      <pre className="overflow-x-auto rounded bg-background p-3 text-xs font-mono">
                        {safeStringify(log.metadata)}
                      </pre>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function AuditTableSkeleton() {
  return (
    <div className="rounded-lg border border-border">
      {SKELETON_ROW_KEYS.map((k) => (
        <div
          key={k}
          className="flex items-center gap-3 border-b border-border/60 px-3 py-3 last:border-b-0"
        >
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  );
}

interface AuditBodyProps {
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
  data: PaginatedResponse<AuditLog> | undefined;
  adminLookup: AdminLookup;
}

function AuditBody({
  isLoading,
  isError,
  refetch,
  data,
  adminLookup,
}: Readonly<AuditBodyProps>) {
  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-16 text-muted-foreground">
        <AlertCircle className="size-8" />
        <p>Failed to load audit log.</p>
        <Button variant="outline" size="sm" onClick={refetch}>
          <RefreshCw className="mr-2 size-4" /> Retry
        </Button>
      </div>
    );
  }
  if (isLoading || !data) return <AuditTableSkeleton />;
  if (data.data.length === 0) {
    return (
      <EmptyState
        title="No audit events match these filters"
        message="Adjust the filters above or wait for new activity."
      />
    );
  }
  return <AuditTable logs={data.data} adminLookup={adminLookup} />;
}

const safeParseDate = (value: string | null): Date | undefined => {
  if (!value) return undefined;
  const d = parseISO(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
};

const formatRangeLabel = (from?: Date, to?: Date) => {
  if (from && to) return `${format(from, 'dd MMM')} – ${format(to, 'dd MMM yyyy')}`;
  if (from) return `${format(from, 'dd MMM yyyy')} – …`;
  return 'Any date';
};

interface AuditFiltersProps {
  directory: AdminDirectoryItem[];
}

const SYSTEM_ACTOR = 'system';

function AuditFilters({ directory }: Readonly<AuditFiltersProps>) {
  const [filters, setFilters] = useQueryStates(auditListParsers, {
    shallow: false,
  });

  const fromDate = safeParseDate(filters.from);
  const toDate = safeParseDate(filters.to);
  const hasFilter =
    Boolean(filters.actor) ||
    Boolean(filters.action) ||
    Boolean(filters.from) ||
    Boolean(filters.to);

  // Items map for the actor Select. Order: All → system → admins (alpha by name).
  const actorSelectItems: Record<string, string> = { [ALL]: 'All actors' };
  actorSelectItems[SYSTEM_ACTOR] = 'System';
  for (const admin of directory) {
    actorSelectItems[admin.id] = admin.displayName;
  }
  // If the URL has an actor value that isn't in the directory (e.g. a user
  // UUID from a PIN_SET event, or a deactivated admin), keep it selectable
  // by including it as a raw-UUID entry.
  if (
    filters.actor &&
    filters.actor !== SYSTEM_ACTOR &&
    !directory.some((a) => a.id === filters.actor)
  ) {
    actorSelectItems[filters.actor] = `${filters.actor.slice(0, 8)}…`;
  }

  const handleActionChange = (value: string | null) => {
    setFilters({
      action: !value || value === ALL ? null : (value as AuditAction),
      page: 1,
    });
  };

  const handleActorChange = (value: string | null) => {
    setFilters({
      actor: !value || value === ALL ? null : value,
      page: 1,
    });
  };

  const handleRangeSelect = (range: DateRange | undefined) => {
    setFilters({
      from: range?.from ? format(range.from, 'yyyy-MM-dd') : null,
      to: range?.to ? format(range.to, 'yyyy-MM-dd') : null,
      page: 1,
    });
  };

  const handleReset = () => {
    setFilters({
      actor: null,
      action: null,
      from: null,
      to: null,
      page: 1,
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        items={ACTION_SELECT_ITEMS}
        value={filters.action ?? ALL}
        onValueChange={handleActionChange}
      >
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Action" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All actions</SelectItem>
          {ACTION_VALUES.map((a) => (
            <SelectItem key={a} value={a}>
              {ACTION_LABEL[a]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Popover>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              className="justify-start font-normal text-muted-foreground data-[has-value=true]:text-foreground"
              data-has-value={Boolean(fromDate || toDate)}
            >
              <CalendarIcon className="size-4" />
              {formatRangeLabel(fromDate, toDate)}
            </Button>
          }
        />
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            selected={{ from: fromDate, to: toDate }}
            onSelect={handleRangeSelect}
            numberOfMonths={2}
            defaultMonth={fromDate}
          />
        </PopoverContent>
      </Popover>

      <Select
        items={actorSelectItems}
        value={filters.actor ?? ALL}
        onValueChange={handleActorChange}
      >
        <SelectTrigger className="w-56">
          <SelectValue placeholder="Actor" />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(actorSelectItems).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilter && (
        <Button variant="ghost" size="sm" onClick={handleReset}>
          <X className="size-4" />
          Reset
        </Button>
      )}
    </div>
  );
}

function AuditContent() {
  const [state, setState] = useQueryStates(auditListParsers, {
    shallow: false,
  });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: [
      'audit-logs',
      state.actor,
      state.action,
      state.from,
      state.to,
      state.page,
    ],
    queryFn: () =>
      getAuditLogs({
        page: state.page,
        limit: PAGE_SIZE,
        actor: state.actor ?? undefined,
        action: state.action ?? undefined,
        from: state.from ?? undefined,
        to: state.to ?? undefined,
      }),
  });

  const { data: directory } = useQuery({
    queryKey: ['admin-directory'],
    queryFn: getAdminDirectory,
    staleTime: 5 * 60_000,
  });

  const adminLookup: AdminLookup = new Map(
    (directory ?? []).map((a) => [a.id, a]),
  );

  return (
    <div>
      <PageHeader
        title="Audit Log"
        description="Every admin and system action, in order."
      />

      <div className="mb-4">
        <AuditFilters directory={directory ?? []} />
      </div>

      <AuditBody
        isLoading={isLoading}
        isError={isError}
        refetch={refetch}
        data={data}
        adminLookup={adminLookup}
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

export default function AuditPage() {
  return (
    <Suspense
      fallback={
        <div>
          <PageHeader
            title="Audit Log"
            description="Every admin and system action, in order."
          />
          <AuditTableSkeleton />
        </div>
      }
    >
      <AuditContent />
    </Suspense>
  );
}
