'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import type { ReactElement } from 'react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ApiError } from '@/lib/api/client';
import { usePermissions } from '@/hooks/use-permissions';

/**
 * One delete dialog for every level of the catalog — CAT-009 / CAT-010-FE.
 *
 * Categories, brands, lines and products all behave identically here: the
 * server refuses with a 409 whenever anything still references the row, and for
 * a catalog that has been live that refusal is the *usual* outcome rather than
 * the edge case. So the refusal is a first-class path — it shows what blocked
 * the delete and offers the action that actually works.
 *
 * Written once rather than four times, mirroring the shared reference guard on
 * the server. Four near-identical dialogs is four chances for one to forget the
 * 409 and drop the admin at a dead end.
 *
 * Hiding it behind `isSuperAdmin` is a convenience, not a permission —
 * `SuperAdminGuard` on the endpoint is the enforcement.
 */
export function DeleteCatalogRowDialog({
  name,
  noun,
  warning,
  onDelete,
  alternative,
  invalidateKeys,
  onDeleted,
  trigger,
}: {
  /** Shown to the admin so they can see what they are about to remove. */
  name: string;
  /** "category", "brand", "product line" — used in the prompt. */
  noun: string;
  /** What is lost, beyond the row itself. */
  warning?: string;
  onDelete: () => Promise<unknown>;
  /** The action a refusal points at, and its button label. */
  alternative?: { label: string; run: () => Promise<unknown> };
  invalidateKeys: string[][];
  onDeleted?: () => void;
  trigger?: ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const [blocked, setBlocked] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { isSuperAdmin } = usePermissions();

  const invalidate = () => {
    for (const key of invalidateKeys) {
      queryClient.invalidateQueries({ queryKey: key });
    }
  };

  const remove = useMutation({
    mutationFn: onDelete,
    onSuccess: () => {
      toast.success(`${name} deleted`);
      invalidate();
      setOpen(false);
      onDeleted?.();
    },
    onError: (err) => {
      // The 409 names what blocked it. Shown in the dialog rather than a toast,
      // because it is the message the admin needs while deciding what to do.
      if (err instanceof ApiError && err.status === 409) {
        setBlocked(err.message);
        return;
      }
      toast.error(err instanceof Error ? err.message : `Failed to delete ${noun}`);
    },
  });

  const fallback = useMutation({
    mutationFn: () => alternative?.run() ?? Promise.resolve(),
    onSuccess: () => {
      toast.success(`${name} is no longer in the catalog`);
      invalidate();
      setOpen(false);
      setBlocked(null);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'That did not work');
    },
  });

  const busy = remove.isPending || fallback.isPending;

  if (!isSuperAdmin) return null;

  const close = (next: boolean) => {
    if (busy) return;
    setOpen(next);
    if (!next) setBlocked(null);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogTrigger
        render={
          trigger ?? (
            <Button variant="outline" size="sm">
              <Trash2 className="mr-2 size-4" /> Delete
            </Button>
          )
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {blocked ? `This ${noun} cannot be deleted` : `Delete this ${noun}?`}
          </DialogTitle>
          <DialogDescription>
            {blocked ?? (
              <>
                <strong>{name}</strong> will be permanently removed.
                {warning ? ` ${warning}` : ''} This cannot be undone.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => close(false)} disabled={busy}>
            Cancel
          </Button>
          {blocked && alternative ? (
            <Button onClick={() => fallback.mutate()} disabled={busy}>
              {fallback.isPending ? 'Working…' : alternative.label}
            </Button>
          ) : blocked ? null : (
            <Button
              variant="destructive"
              onClick={() => remove.mutate()}
              disabled={busy}
            >
              {remove.isPending ? 'Deleting…' : 'Delete permanently'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
