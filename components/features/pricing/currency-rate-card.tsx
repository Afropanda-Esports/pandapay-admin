'use client';

import { format, parseISO } from 'date-fns';
import { AlertTriangle, Coins } from 'lucide-react';

import { SetCurrencyRateDialog } from '@/components/features/pricing/set-currency-rate-dialog';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  canSetRate,
  managementLabel,
  rateAgeLabel,
  staleRateWarning,
} from '@/lib/currency-rates';
import { formatRatePerUnit } from '@/lib/money';
import type { CurrencyRatesOverview } from '@/lib/types';

type RateEntry = CurrencyRatesOverview['rates'][number];

/**
 * One converted currency's rate — GBP-005.
 *
 *   USD  automatic (oracle). Read-only for everyone.
 *   GBP  manual. Source, age, who set it, how many products it prices, a
 *        warning once it is older than 3 days, and "Set new rate" for a Super
 *        Admin only.
 */
export function CurrencyRateCard({
  entry,
  canManagePricing,
  affectedProducts,
  actorName,
  now,
  footnote,
}: Readonly<{
  entry: RateEntry;
  canManagePricing: boolean;
  affectedProducts: number;
  actorName: (id: string | null) => string;
  now: Date;
  footnote?: React.ReactNode;
}>) {
  const { currency, management, current } = entry;
  const stale =
    management === 'MANUAL'
      ? staleRateWarning(currency, current?.effectiveFrom ?? null, now)
      : null;
  const settable = canSetRate(management, canManagePricing);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Coins className="size-4" />
              {currency} → NGN
            </CardTitle>
            <CardDescription>
              {management === 'ORACLE'
                ? 'Set automatically from the oracle. Not editable here.'
                : 'A business rate set manually by a Super Admin.'}
            </CardDescription>
          </div>
          <Badge variant="secondary">{managementLabel(management)}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {current ? (
          <>
            <p className="font-heading text-3xl font-bold tabular-nums">
              {formatRatePerUnit(current.ngnPerUnit, currency)}
            </p>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
              <dt className="text-muted-foreground">Source</dt>
              <dd>{current.source}</dd>
              <dt className="text-muted-foreground">When</dt>
              <dd title={format(parseISO(current.effectiveFrom), 'PPpp')}>
                {rateAgeLabel(current.effectiveFrom, now)}
              </dd>
              {management === 'MANUAL' ? (
                <>
                  <dt className="text-muted-foreground">Set by</dt>
                  <dd>{actorName(current.setById)}</dd>
                  {current.note ? (
                    <>
                      <dt className="text-muted-foreground">Note</dt>
                      <dd>{current.note}</dd>
                    </>
                  ) : null}
                </>
              ) : null}
              <dt className="text-muted-foreground">Prices</dt>
              <dd>
                {affectedProducts} {currency} product
                {affectedProducts === 1 ? '' : 's'}
              </dd>
            </dl>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            No {currency}/NGN rate is set.{' '}
            {management === 'MANUAL'
              ? `${currency} products cannot be created or priced until a Super Admin sets one.`
              : 'Products in this currency cannot be priced until the oracle reports one.'}
          </p>
        )}

        {stale ? (
          <p className="flex items-start gap-2 rounded-md border border-warning-200 bg-warning-50 p-2 text-xs text-warning-700 dark:border-warning-700/40 dark:bg-warning-700/10">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            {stale}
          </p>
        ) : null}

        {footnote}

        {management === 'MANUAL' ? (
          settable ? (
            <div className="flex justify-end">
              <SetCurrencyRateDialog
                currency={currency}
                currentNgnPerUnit={current?.ngnPerUnit ?? null}
                affectedProducts={affectedProducts}
              />
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Only a Super Admin can set the {currency}/NGN rate.
            </p>
          )
        ) : null}
      </CardContent>
    </Card>
  );
}
