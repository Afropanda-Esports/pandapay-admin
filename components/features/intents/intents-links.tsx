'use client';

import { Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { safeExplorerHref, shortHash } from '@/lib/intents-format';
import type { IntentsTxHash } from '@/lib/types';

export function CopyButton({
  value,
  label,
}: Readonly<{ value: string; label: string }>) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-6 shrink-0 px-1"
      aria-label={`Copy ${label}`}
      onClick={() => {
        void navigator.clipboard.writeText(value).then(() => {
          toast.success(`${label} copied`);
        });
      }}
    >
      <Copy className="size-3.5" />
    </Button>
  );
}

/** Opens in a new tab only for https URLs; anything else is plain text. */
export function ExplorerLink({
  href,
  children,
}: Readonly<{ href: string | null; children: React.ReactNode }>) {
  const safe = safeExplorerHref(href);
  if (!safe) return <span className="font-mono text-xs">{children}</span>;
  return (
    <a
      href={safe}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 font-mono text-xs text-primary underline-offset-4 hover:underline"
    >
      {children}
      <ExternalLink className="size-3" />
    </a>
  );
}

export function TxHashLinks({
  hashes,
}: Readonly<{ hashes: IntentsTxHash[] }>) {
  if (hashes.length === 0) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  return (
    <span className="inline-flex flex-col items-end gap-0.5">
      {hashes.map((tx) => (
        <span key={tx.hash} title={tx.hash}>
          <ExplorerLink href={tx.explorerUrl}>{shortHash(tx.hash)}</ExplorerLink>
        </span>
      ))}
    </span>
  );
}
