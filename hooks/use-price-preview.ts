'use client';

import { useQuery } from '@tanstack/react-query';
import { useDebounceValue } from 'usehooks-ts';

import { previewPrice } from '@/lib/api/pricing';
import type { PreviewRequestResult, PreviewState } from '@/lib/pricing-edit';
import type { PricePreview } from '@/lib/types';

/**
 * The authoritative naira price for a converted product's draft inputs —
 * `POST /admin/pricing/preview`, debounced (GBP-005). The console never
 * computes the price itself; it shows this, and Save/Create wait for it.
 *
 * `state` is `idle` when there is nothing to preview (NGN, or invalid input),
 * `loading` while the debounced request is pending or in flight — including the
 * moment the inputs change, so a stale figure cannot be saved against new
 * inputs — then `ready` or `error`.
 */
export function usePricePreview(input: PreviewRequestResult): {
  state: PreviewState;
  preview: PricePreview | undefined;
  error: unknown;
} {
  const key = input.request ? JSON.stringify(input.request) : null;
  const [debouncedKey] = useDebounceValue(key, 350);

  const query = useQuery({
    queryKey: ['price-preview', debouncedKey],
    queryFn: ({ signal }) =>
      previewPrice(JSON.parse(debouncedKey as string), signal),
    enabled: debouncedKey !== null,
    // A rate can change at any moment; never show an old answer as current.
    staleTime: 0,
    retry: false,
  });

  if (key === null) return { state: 'idle', preview: undefined, error: null };
  if (key !== debouncedKey || query.isFetching) {
    return { state: 'loading', preview: undefined, error: null };
  }
  if (query.isError) return { state: 'error', preview: undefined, error: query.error };
  if (query.data) return { state: 'ready', preview: query.data, error: null };
  return { state: 'loading', preview: undefined, error: null };
}
