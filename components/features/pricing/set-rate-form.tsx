'use client';

import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { Percent } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useDebounceValue } from 'usehooks-ts';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { ApiError } from '@/lib/api/client';
import { previewPrice, setRate } from '@/lib/api/pricing';
import { getProducts } from '@/lib/api/products';
import {
  formatBpsAsPercent,
  generalMarkupFollowers,
  parsePercentToBps,
} from '@/lib/markup';
import { formatMoney, formatProductPrice, isConvertedCurrency } from '@/lib/money';
import type { ProductWithStats } from '@/lib/types';

/** How many affected products get an individual backend preview. */
const PREVIEW_LIMIT = 8;

/**
 * The general markup — GBP-005. It lives on `exchange_rates` (unchanged) and
 * applies to every CONVERTED currency: USD and GBP products that do not set
 * their own markup. Naira products never move.
 *
 * The form previews a handful of affected products by asking the backend what
 * each would cost at the proposed markup (`POST /admin/pricing/preview`, with
 * that markup) — the same function the save will reprice with. It computes no
 * price itself.
 */
export function SetRateForm({
  currentMarkupBps,
}: Readonly<{ currentMarkupBps: number }>) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(formatBpsAsPercent(currentMarkupBps).replace('%', ''));
  const [note, setNote] = useState('');

  const parsed = parsePercentToBps(draft);
  const draftBps = parsed.bps ?? null;
  const changed = draftBps !== null && draftBps !== currentMarkupBps;
  const [debouncedBps] = useDebounceValue(changed ? draftBps : null, 400);

  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: () => getProducts(),
    staleTime: 60_000,
  });
  const followers = generalMarkupFollowers(products ?? []);
  const sample = (products ?? [])
    .filter(
      (p) =>
        !p.archivedAt &&
        p.markupBps === null &&
        isConvertedCurrency(p.baseCurrency) &&
        p.baseAmount,
    )
    .slice(0, PREVIEW_LIMIT);

  const previews = useQueries({
    queries: sample.map((p) => ({
      queryKey: ['price-preview', 'general-markup', p.id, p.baseAmount, debouncedBps],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        previewPrice(
          {
            currency: p.baseCurrency,
            baseAmount: p.baseAmount as string,
            // The product inherits the general markup, so at the proposed
            // general markup its effective markup IS the proposed value.
            markupBps: debouncedBps,
          },
          signal,
        ),
      enabled: debouncedBps !== null,
      retry: false,
      staleTime: 0,
    })),
  });

  const mutation = useMutation({
    mutationFn: (markupBps: number) =>
      setRate({ markupBps, note: note.trim() || undefined }),
    onSuccess: (res) => {
      toast.success(
        `General markup set to ${formatBpsAsPercent(res.rate.markupBps)}. Repriced ${res.affected} product${res.affected === 1 ? '' : 's'}.`,
      );
      void queryClient.invalidateQueries({ queryKey: ['pricing-rate'] });
      void queryClient.invalidateQueries({ queryKey: ['pricing-rate-history'] });
      void queryClient.invalidateQueries({ queryKey: ['currency-rates'] });
      void queryClient.invalidateQueries({ queryKey: ['products'] });
      void queryClient.invalidateQueries({ queryKey: ['price-preview'] });
      setNote('');
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'Failed to update the markup');
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Percent className="size-4" />
          General markup
        </CardTitle>
        <CardDescription>
          Applied over the raw rate to every USD and GBP product that does not
          set its own markup. Naira products are not affected.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            if (draftBps !== null) mutation.mutate(draftBps);
          }}
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="markup-value">Markup (%)</FieldLabel>
              <Input
                id="markup-value"
                type="text"
                inputMode="decimal"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                disabled={mutation.isPending}
              />
              {parsed.error ? (
                <FieldError className="text-error-700">{parsed.error}</FieldError>
              ) : null}
            </Field>

            <Field>
              <FieldLabel htmlFor="rate-note">Note (optional)</FieldLabel>
              <Input
                id="rate-note"
                placeholder="e.g. weekly review, market move"
                maxLength={255}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                disabled={mutation.isPending}
              />
            </Field>

            <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3 text-xs">
              <p>
                {followers.following} product{followers.following === 1 ? '' : 's'}{' '}
                follow{followers.following === 1 ? 's' : ''} the general markup
                {followers.following > 0
                  ? ` (${followers.byCurrency.USD} USD, ${followers.byCurrency.GBP} GBP)`
                  : ''}
                {followers.following === 0
                  ? ' — changing it moves nothing today.'
                  : ' and will be repriced from their own currency’s rate.'}
              </p>
              {followers.overriding > 0 ? (
                <p className="text-muted-foreground">
                  {followers.overriding} product
                  {followers.overriding === 1 ? '' : 's'} set their own markup and
                  will not move.
                </p>
              ) : null}
              {changed && sample.length > 0 ? (
                <ProposedPrices
                  products={sample}
                  results={previews}
                  pending={debouncedBps !== draftBps}
                  hidden={followers.following - sample.length}
                />
              ) : null}
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={mutation.isPending || !changed || parsed.error !== undefined}
              >
                {mutation.isPending ? 'Saving…' : 'Save & reprice'}
              </Button>
            </div>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}

function ProposedPrices({
  products,
  results,
  pending,
  hidden,
}: Readonly<{
  products: ProductWithStats[];
  results: ReadonlyArray<{ data?: { ngnPrice: string }; isError: boolean }>;
  pending: boolean;
  hidden: number;
}>) {
  return (
    <>
      <table className="w-full">
        <thead className="text-muted-foreground">
          <tr>
            <th className="py-1 text-left font-normal">Product</th>
            <th className="py-1 text-right font-normal">Face value</th>
            <th className="py-1 text-right font-normal">Now</th>
            <th className="py-1 text-right font-normal">At new markup</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p, i) => {
            const result = results[i];
            let next = '…';
            if (!pending && result?.data) next = formatMoney(result.data.ngnPrice, 'NGN');
            else if (!pending && result?.isError) next = 'unavailable';
            return (
              <tr key={p.id} className="border-t border-border/40">
                <td className="py-1">{p.name}</td>
                <td className="py-1 text-right tabular-nums">{formatProductPrice(p)}</td>
                <td className="py-1 text-right tabular-nums">
                  {formatMoney(p.snapshotNgnPrice, 'NGN')}
                </td>
                <td className="py-1 text-right tabular-nums">{next}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {hidden > 0 ? (
        <p className="text-muted-foreground">
          + {hidden} more product{hidden === 1 ? '' : 's'} (not previewed).
        </p>
      ) : null}
      <p className="text-muted-foreground">
        Prices from the backend at the proposed markup and today’s rates.
      </p>
    </>
  );
}
