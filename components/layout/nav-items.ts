import {
  LayoutDashboard,
  Users,
  ShoppingBag,
  Package,
  FileText,
  ShieldCheck,
  Coins,
  type LucideIcon,
} from 'lucide-react';
import type { AdminRole } from '@/lib/types';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  // If set, the item is only rendered when the authenticated admin's role matches.
  requiresRole?: AdminRole;
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Orders', href: '/orders', icon: ShoppingBag },
  { label: 'Users', href: '/users', icon: Users },
  { label: 'Products', href: '/products', icon: Package },
  { label: 'Pricing', href: '/pricing', icon: Coins },
  { label: 'Audit Log', href: '/audit', icon: FileText },
  {
    label: 'Admins',
    href: '/admins',
    icon: ShieldCheck,
    requiresRole: 'SUPER_ADMIN',
  },
];
