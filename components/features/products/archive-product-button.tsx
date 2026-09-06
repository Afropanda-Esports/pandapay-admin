'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Archive, ArchiveRestore } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { archiveProduct, unarchiveProduct } from '@/lib/api/products';
import { usePermissions } from '@/hooks/use-permissions';

/**
 * CAT-004: archiving retires a product without erasing it.
 *
 * Reversible, so it sits at ADMIN level alongside create and edit — unlike
 * deletion, which is SUPER_ADMIN. It is deliberately separate from
 * `isAvailable`: that flag means "out of stock for now" and gets flipped
 * routinely, while this means "withdrawn" and keeps the order history intact.
 */
export function ArchiveProductButton({
  productId,
  archivedAt,
}: {
  productId: string;
  archivedAt: string | null;
}) {
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const archived = archivedAt !== null;

  const mutation = useMutation({
    mutationFn: () =>
      archived ? unarchiveProduct(productId) : archiveProduct(productId),
    onSuccess: () => {
      toast.success(
        archived
          ? 'Product restored to the catalog'
          : 'Product archived — it is no longer in the catalog',
      );
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : 'Failed to update the product',
      );
    },
  });

  if (!can('products:manage')) return null;

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => mutation.mutate()}
      disabled={mutation.isPending}
    >
      {archived ? (
        <ArchiveRestore className="mr-2 size-4" />
      ) : (
        <Archive className="mr-2 size-4" />
      )}
      {mutation.isPending
        ? 'Saving…'
        : archived
          ? 'Restore'
          : 'Archive'}
    </Button>
  );
}
