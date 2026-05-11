import {
  LayoutDashboard,
  Users,
  ShoppingBag,
  Package,
  FileText,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Orders', href: '/orders', icon: ShoppingBag },
  { label: 'Users', href: '/users', icon: Users },
  { label: 'Products', href: '/products', icon: Package },
  { label: 'Audit Log', href: '/audit', icon: FileText },
];
