'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
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
import { archiveProduct, deleteProduct } from '@/lib/api/products';
import { usePermissions } from '@/hooks/use-permissions';

/**
 * CAT-004 / CAT-010-FE — the first destructive control in the admin app.
 *
 * Deleting is refused by the server whenever anything references the product,
 * and for any catalog that has been live that is the *usual* outcome, not the
 * edge case. So the refusal is treated as a first-class path: it shows what
 * blocked the delete and offers archiving, which is the action that actually
 * works, rather than leaving the admin at a dead end.
 *
 * Hiding this behind `isSuperAdmin` is a convenience, not a permission —
 * `SuperAdminGuard` on the endpoint is the enforcement.
 */
export function DeleteProductDialog({
  productId,
  productName,
}: {
  productId: string;
  productName: string;
}) {
  const [open, setOpen] = useState(false);
  const [blocked, setBlocked] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const router = useRouter();
  const { isSuperAdmin } = usePermissions();

  const remove = useMutation({
    mutationFn: () => deleteProduct(productId),
    onSuccess: ({ deletedVouchers }) => {
      toast.success(
        deletedVouchers > 0
          ? `Product deleted, along with ${deletedVouchers} unused voucher${deletedVouchers === 1 ? '' : 's'}`
          : 'Product deleted',
      );
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setOpen(false);
      router.push('/products');
    },
    onError: (err) => {
      // A 409 names the orders, order items or used vouchers that blocked it.
      // Shown in the dialog rather than a toast, because it is the message the
      // admin needs while deciding what to do instead.
      if (err instanceof ApiError && err.status === 409) {
        setBlocked(err.message);
        return;
      }
      toast.error(err instanceof Error ? err.message : 'Failed to delete product');
    },
  });

  const archive = useMutation({
    mutationFn: () => archiveProduct(productId),
    onSuccess: () => {
      toast.success('Product archived — it is no longer in the catalog');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
      setOpen(false);
      setBlocked(null);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to archive product');
    },
  });

  const busy = remove.isPending || archive.isPending;

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
          <Button variant="outline" size="sm">
            <Trash2 className="mr-2 size-4" /> Delete
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {blocked ? 'This product cannot be deleted' : 'Delete this product?'}
          </DialogTitle>
          <DialogDescription>
            {blocked ?? (
              <>
                <strong>{productName}</strong> will be permanently removed,
                along with any unused voucher codes uploaded for it. This cannot
                be undone.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => close(false)} disabled={busy}>
            Cancel
          </Button>
          {blocked ? (
            <Button onClick={() => archive.mutate()} disabled={busy}>
              {archive.isPending ? 'Archiving…' : 'Archive it instead'}
            </Button>
          ) : (
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
