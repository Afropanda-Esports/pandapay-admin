'use client';

import { useQuery } from '@tanstack/react-query';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { format, parseISO } from 'date-fns';

import { DeleteCatalogRowDialog } from '@/components/features/catalog/delete-catalog-row-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  deleteProductLine,
  getProductBrands,
  getProductLines,
  getRegions,
  updateProductLine,
} from '@/lib/api/products';
import { brandLabel } from '@/lib/catalog-forms';

export default function ProductLinesPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['product-lines'],
    queryFn: () => getProductLines(),
  });
  const { data: brands } = useQuery({
    queryKey: ['product-brands'],
    queryFn: () => getProductBrands(),
    staleTime: 60_000,
  });

  const { data: regions } = useQuery({
    queryKey: ['regions'],
    queryFn: getRegions,
    staleTime: 60_000,
  });

  // Same reason as the create dialog: one brand row per region means the bare
  // name does not identify which brand a line belongs to.
  const brandName = (id: string) => {
    const brand = brands?.find((candidate) => candidate.id === id);
    return brand ? brandLabel(brand, regions) : '—';
  };

  return (
    <div>
      <PageHeader
        title="Product lines"
        description="Groups of products under a brand, shown to customers in WhatsApp. New lines are added via deployment scripts so vocabulary can be updated alongside."
      />

      {isError ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-16 text-muted-foreground">
          <AlertCircle className="size-8" />
          <p>Failed to load product lines.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="mr-2 size-4" /> Retry
          </Button>
        </div>
      ) : isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !data || data.length === 0 ? (
        <EmptyState
          title="No product lines"
          message="Create a line under a brand before adding products to it."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Line</th>
                <th className="px-3 py-2 font-medium">Brand</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Created</th>
                <th className="px-3 py-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map((line) => (
                <tr
                  key={line.id}
                  className="border-t border-border/60 align-middle"
                >
                  <td className="px-3 py-2 font-medium">{line.name}</td>
                  <td className="px-3 py-2">{brandName(line.brandId)}</td>
                  <td className="px-3 py-2">
                    {line.isActive ? (
                      <Badge className="bg-success-100 text-success-700 hover:bg-success-100 border-0">
                        Active
                      </Badge>
                    ) : (
                      <Badge className="bg-neutral-100 text-neutral-500 hover:bg-neutral-100 border-0">
                        Inactive
                      </Badge>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {format(parseISO(line.createdAt), 'PP')}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <DeleteCatalogRowDialog
                      name={line.name}
                      noun="product line"
                      onDelete={() => deleteProductLine(line.id)}
                      alternative={{
                        label: 'Deactivate it instead',
                        run: () =>
                          updateProductLine(line.id, { isActive: false }),
                      }}
                      invalidateKeys={[['product-lines']]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
