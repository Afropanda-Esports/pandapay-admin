'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { LogOut, Menu } from 'lucide-react';

import { useAuth } from '@/hooks/use-auth';
import { NAV_ITEMS } from '@/components/layout/nav-items';
import { Sidebar } from '@/components/layout/sidebar';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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

export function Header() {
  const pathname = usePathname();
  const { logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const title = deriveTitle(pathname);

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
                AD
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Signed in as admin
              </DropdownMenuLabel>
            </DropdownMenuGroup>
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
