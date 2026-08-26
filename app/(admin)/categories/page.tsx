'use client';

import { useQuery } from '@tanstack/react-query';
import { AlertCircle, RefreshCw } from 'lucide-react';

import { CreateCategoryDialog } from '@/components/features/categories/create-category-dialog';
import { EditCategoryDialog } from '@/components/features/categories/edit-category-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getCategories } from '@/lib/api/categories';
import { format, parseISO } from 'date-fns';

export default function CategoriesPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  });

  return (
    <div>
      <PageHeader
        title="Categories"
        description="Manage product categories used across the platform."
        actions={<CreateCategoryDialog />}
      />

      {isError ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-16 text-muted-foreground">
          <AlertCircle className="size-8" />
          <p>Failed to load categories.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="mr-2 size-4" /> Retry
          </Button>
        </div>
      ) : isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !data || data.length === 0 ? (
        <EmptyState
          title="No categories"
          message="Create your first category to get started."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Code</th>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Created</th>
                <th className="px-3 py-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map((cat) => (
                <tr
                  key={cat.id}
                  className="border-t border-border/60 align-middle"
                >
                  <td className="px-3 py-2 font-mono text-xs">{cat.code}</td>
                  <td className="px-3 py-2 font-medium">{cat.name}</td>
                  <td className="px-3 py-2">
                    {cat.isActive ? (
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
                    {format(parseISO(cat.createdAt), 'PP')}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <EditCategoryDialog category={cat} />
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
