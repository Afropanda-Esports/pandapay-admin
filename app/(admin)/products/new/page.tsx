'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

import { CreateProductForm } from '@/components/features/products/create-product-form';
import { PageHeader } from '@/components/shared/page-header';
import { RequirePermission } from '@/components/shared/require-permission';
import { Button } from '@/components/ui/button';
import { usePermissions } from '@/hooks/use-permissions';

/**
 * GBP-006 — create a product (Super Admin). Guarded three times: the proxy
 * redirects a non-Super-Admin away from this path, this page renders nothing
 * usable without `products:create`, and the backend's SuperAdminGuard refuses
 * the POST regardless.
 */
export default function NewProductPage() {
  const { role, isLoading } = usePermissions();

  const backLink = (
    <Button variant="ghost" size="sm" render={<Link href="/products" />}>
      <ArrowLeft className="size-4" />
      Back to products
    </Button>
  );

  return (
    <div>
      <PageHeader
        title="Create product"
        description="New products start unavailable: review the price, upload stock, then mark them available. A product in an inactive region stays hidden from customers."
        actions={backLink}
      />
      {isLoading ? null : (
        <RequirePermission
          permission="products:create"
          role={role}
          showForbidden
          forbiddenTitle="Super Admin only"
          forbiddenMessage="Only a Super Admin can create products."
        >
          <CreateProductForm />
        </RequirePermission>
      )}
    </div>
  );
}
