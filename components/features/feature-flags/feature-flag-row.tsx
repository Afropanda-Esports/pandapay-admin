'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError } from '@/lib/api/client';
import {
  isFeatureFlagEffective,
  updateFeatureFlag,
} from '@/lib/api/feature-flags';
import type { FeatureFlag } from '@/lib/types';
import { cn } from '@/lib/utils';

function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) return '';
  const d = parseISO(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocalValue(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

interface FeatureFlagRowProps {
  flag: FeatureFlag;
  canManage: boolean;
}

export function FeatureFlagRow({
  flag,
  canManage,
}: Readonly<FeatureFlagRowProps>) {
  const queryClient = useQueryClient();
  const effective = isFeatureFlagEffective(flag);

  const [enabled, setEnabled] = useState(flag.enabled);
  const [activeFrom, setActiveFrom] = useState(toDatetimeLocalValue(flag.activeFrom));
  const [activeUntil, setActiveUntil] = useState(
    toDatetimeLocalValue(flag.activeUntil),
  );
  const [description, setDescription] = useState(flag.description ?? '');

  const hasScheduleChanges = useMemo(() => {
    const serverFrom = toDatetimeLocalValue(flag.activeFrom);
    const serverUntil = toDatetimeLocalValue(flag.activeUntil);
    const serverDesc = flag.description ?? '';
    return (
      activeFrom !== serverFrom ||
      activeUntil !== serverUntil ||
      description.trim() !== serverDesc.trim()
    );
  }, [activeFrom, activeUntil, description, flag]);

  const enableMutation = useMutation({
    mutationFn: (nextEnabled: boolean) =>
      updateFeatureFlag(flag.key, { enabled: nextEnabled }),
    onSuccess: (_data, nextEnabled) => {
      toast.success(`${flag.key} ${nextEnabled ? 'enabled' : 'disabled'}`);
      void queryClient.invalidateQueries({ queryKey: ['feature-flags'] });
    },
    onError: (err) => {
      setEnabled(flag.enabled);
      const message =
        err instanceof ApiError ? err.message : 'Could not update flag';
      toast.error(message);
    },
  });

  const scheduleMutation = useMutation({
    mutationFn: () =>
      updateFeatureFlag(flag.key, {
        activeFrom: fromDatetimeLocalValue(activeFrom),
        activeUntil: fromDatetimeLocalValue(activeUntil),
        description: description.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success(`Updated ${flag.key} schedule`);
      void queryClient.invalidateQueries({ queryKey: ['feature-flags'] });
    },
    onError: (err) => {
      const message =
        err instanceof ApiError ? err.message : 'Could not update flag';
      toast.error(message);
    },
  });

  const clearSchedule = useMutation({
    mutationFn: () =>
      updateFeatureFlag(flag.key, {
        activeFrom: null,
        activeUntil: null,
      }),
    onSuccess: () => {
      setActiveFrom('');
      setActiveUntil('');
      toast.success('Schedule cleared');
      void queryClient.invalidateQueries({ queryKey: ['feature-flags'] });
    },
    onError: (err) => {
      const message =
        err instanceof ApiError ? err.message : 'Could not clear schedule';
      toast.error(message);
    },
  });

  const isSaving =
    enableMutation.isPending ||
    scheduleMutation.isPending ||
    clearSchedule.isPending;

  const handleToggleEnabled = () => {
    const next = !enabled;
    setEnabled(next);
    enableMutation.mutate(next);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle className="font-mono text-base">{flag.key}</CardTitle>
          {flag.description ? (
            <p className="text-sm text-muted-foreground">{flag.description}</p>
          ) : null}
          <p className="text-xs text-muted-foreground">
            WhatsApp and other runtimes use <strong>Effective</strong> status
            (enabled plus schedule window), not the Enabled toggle alone.
          </p>
        </div>
        <Badge
          className={cn(
            'border-0',
            effective
              ? 'bg-success-100 text-success-700 hover:bg-success-100'
              : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-100',
          )}
        >
          {effective ? 'Effective' : 'Inactive'}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
          <div>
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              Enabled
            </span>
            <p className="font-medium">{flag.enabled ? 'Yes' : 'No'}</p>
          </div>
          <div>
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              Active from
            </span>
            <p className="font-medium">
              {flag.activeFrom
                ? format(parseISO(flag.activeFrom), 'PPpp')
                : '—'}
            </p>
          </div>
          <div>
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              Active until
            </span>
            <p className="font-medium">
              {flag.activeUntil
                ? format(parseISO(flag.activeUntil), 'PPpp')
                : '—'}
            </p>
          </div>
          <div>
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              Updated
            </span>
            <p className="font-medium">
              {format(parseISO(flag.updatedAt), 'PPpp')}
            </p>
          </div>
        </div>

        {canManage ? (
          <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <Label htmlFor={`${flag.key}-enabled`} className="text-sm">
                Enabled
              </Label>
              <Button
                id={`${flag.key}-enabled`}
                type="button"
                size="sm"
                variant={enabled ? 'default' : 'outline'}
                onClick={handleToggleEnabled}
                disabled={isSaving}
              >
                {enableMutation.isPending ? 'Saving…' : enabled ? 'On' : 'Off'}
              </Button>
              {hasScheduleChanges ? (
                <Badge variant="outline" className="text-amber-700">
                  Unsaved schedule changes
                </Badge>
              ) : null}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor={`${flag.key}-from`}>Active from</Label>
                <Input
                  id={`${flag.key}-from`}
                  type="datetime-local"
                  value={activeFrom}
                  onChange={(e) => setActiveFrom(e.target.value)}
                  disabled={isSaving}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`${flag.key}-until`}>Active until</Label>
                <Input
                  id={`${flag.key}-until`}
                  type="datetime-local"
                  value={activeUntil}
                  onChange={(e) => setActiveUntil(e.target.value)}
                  disabled={isSaving}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor={`${flag.key}-desc`}>Description</Label>
              <Input
                id={`${flag.key}-desc`}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={255}
                disabled={isSaving}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() => scheduleMutation.mutate()}
                disabled={isSaving || !hasScheduleChanges}
              >
                {scheduleMutation.isPending ? 'Saving…' : 'Save schedule'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => clearSchedule.mutate()}
                disabled={
                  clearSchedule.isPending ||
                  (!flag.activeFrom && !flag.activeUntil && !activeFrom && !activeUntil)
                }
              >
                Clear schedule
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Only Super Admins can change feature flags.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
