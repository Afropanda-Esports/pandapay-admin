'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { KeyRound, LogOut, Menu, ShieldCheck } from 'lucide-react';

import { useAuth } from '@/hooks/use-auth';
import { useMe } from '@/hooks/use-me';
import { usePermissions } from '@/hooks/use-permissions';
import { NAV_ITEMS } from '@/components/layout/nav-items';
import { Sidebar } from '@/components/layout/sidebar';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

function deriveTitle(pathname: string): string {
  const item = NAV_ITEMS.find(
    (i) => pathname === i.href || pathname.startsWith(`${i.href}/`),
  );
  return item?.label ?? '';
}

function initialsFor(name: string | undefined, email: string | undefined): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts.at(-1)![0]).toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return 'AD';
}

export function Header() {
  const pathname = usePathname();
  const { logout } = useAuth();
  const { data: me } = useMe();
  const { roleLabel, isSuperAdmin } = usePermissions();
  const [mobileOpen, setMobileOpen] = useState(false);
  const title = deriveTitle(pathname);

  const initials = initialsFor(me?.displayName, me?.email);

  return (
    <header className="flex h-14 items-center gap-3 border-b border-border bg-background px-4 md:px-6">
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger
          aria-label="Open navigation"
          className="md:hidden inline-flex h-8 w-8 items-center justify-center rounded-md text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <Menu className="h-5 w-5" />
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-60">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <Sidebar
            onNavigate={() => setMobileOpen(false)}
            className="w-full border-r-0"
          />
        </SheetContent>
      </Sheet>

      <h1 className="text-base font-semibold tracking-tight">{title}</h1>

      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="User menu"
            className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {me?.displayName ?? 'Admin'}
                  </span>
                  {me?.role ? (
                    <Badge
                      className={
                        isSuperAdmin
                          ? 'bg-info-100 text-info-700 hover:bg-info-100 border-0 text-[10px] px-1.5 py-0'
                          : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-100 border-0 text-[10px] px-1.5 py-0'
                      }
                    >
                      {isSuperAdmin ? (
                        <ShieldCheck className="size-3" />
                      ) : null}
                      {roleLabel}
                    </Badge>
                  ) : null}
                </div>
                <div className="text-xs font-normal text-muted-foreground break-all">
                  {me?.email ?? '—'}
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<Link href="/change-password" />}>
              <KeyRound className="h-4 w-4" />
              Change password
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-destructive">
              <LogOut className="h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
