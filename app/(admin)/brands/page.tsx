'use client';

import { useQuery } from '@tanstack/react-query';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { format, parseISO } from 'date-fns';

import { CreateBrandDialog } from '@/components/features/brands/create-brand-dialog';
import { DeleteCatalogRowDialog } from '@/components/features/catalog/delete-catalog-row-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  deleteProductBrand,
  getProductBrands,
  getRegions,
  updateProductBrand,
} from '@/lib/api/products';

export default function BrandsPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['product-brands'],
    queryFn: () => getProductBrands(),
  });
  const { data: regions } = useQuery({
    queryKey: ['regions'],
    queryFn: getRegions,
    staleTime: 60_000,
  });

  const regionName = (id: string) =>
    regions?.find((region) => region.id === id)?.name ?? '—';

  return (
    <div>
      <PageHeader
        title="Brands"
        description="Platforms customers can buy from, scoped to a region. Brands cannot be deleted once created."
        actions={<CreateBrandDialog />}
      />

      {isError ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-16 text-muted-foreground">
          <AlertCircle className="size-8" />
          <p>Failed to load brands.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="mr-2 size-4" /> Retry
          </Button>
        </div>
      ) : isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !data || data.length === 0 ? (
        <EmptyState
          title="No brands"
          message="Create a brand before adding product lines or products."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Brand</th>
                <th className="px-3 py-2 font-medium">Region</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Created</th>
                <th className="px-3 py-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map((brand) => (
                <tr
                  key={brand.id}
                  className="border-t border-border/60 align-middle"
                >
                  <td className="px-3 py-2 font-medium">{brand.name}</td>
                  <td className="px-3 py-2">{regionName(brand.regionId)}</td>
                  <td className="px-3 py-2">
                    {brand.isActive ? (
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
                    {format(parseISO(brand.createdAt), 'PP')}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <DeleteCatalogRowDialog
                      name={brand.name}
                      noun="brand"
                      onDelete={() => deleteProductBrand(brand.id)}
                      alternative={{
                        label: 'Deactivate it instead',
                        run: () =>
                          updateProductBrand(brand.id, { isActive: false }),
                      }}
                      invalidateKeys={[['product-brands']]}
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
