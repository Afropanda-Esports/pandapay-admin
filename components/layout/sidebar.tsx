'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Logo } from '@/components/shared/logo';
import { cn } from '@/lib/utils';
import { NAV_ITEMS } from '@/components/layout/nav-items';
import { usePermissions } from '@/hooks/use-permissions';

interface SidebarProps {
  className?: string;
  onNavigate?: () => void;
}

export function Sidebar({ className, onNavigate }: Readonly<SidebarProps>) {
  const pathname = usePathname();
  const { can } = usePermissions();

  const visibleItems = NAV_ITEMS.filter((item) => can(item.permission));

  return (
    <aside
      className={cn(
        'flex h-full w-60 flex-col border-r border-border bg-sidebar text-sidebar-foreground',
        className,
      )}
    >
      <div className="flex h-14 items-center px-5 border-b border-border">
        <Link
          href="/dashboard"
          onClick={onNavigate}
          aria-label="PandaPay home"
          className="flex items-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <Logo variant="wordmark" priority className="h-7" />
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {visibleItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-border px-5 py-3 text-xs text-muted-foreground">
        v0.1.0
      </div>
    </aside>
  );
}
