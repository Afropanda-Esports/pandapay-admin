import {
  LayoutDashboard,
  Users,
  ShoppingBag,
  Receipt,
  Package,
  FileText,
  ShieldCheck,
  ShieldAlert,
  Coins,
  Flag,
  AlertTriangle,
  Tag,
  type LucideIcon,
} from 'lucide-react';
import type { AdminPermission } from '@/lib/permissions';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  permission: AdminPermission;
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, permission: 'dashboard:view' },
  { label: 'Orders', href: '/orders', icon: ShoppingBag, permission: 'orders:view' },
  { label: 'Transactions', href: '/transactions', icon: Receipt, permission: 'orders:view' },
  { label: 'Users', href: '/users', icon: Users, permission: 'users:view' },
  { label: 'Products', href: '/products', icon: Package, permission: 'products:view' },
  { label: 'Pricing', href: '/pricing', icon: Coins, permission: 'pricing:view' },
  { label: 'Fraud Review', href: '/fraud', icon: ShieldAlert, permission: 'fraud:view' },
  {
    label: 'Payment exceptions',
    href: '/payment-exceptions',
    icon: AlertTriangle,
    permission: 'orders:view',
  },
  { label: 'Feature Flags', href: '/feature-flags', icon: Flag, permission: 'feature-flags:view' },
  {
    label: 'Discount Codes',
    href: '/discount-codes',
    icon: Tag,
    permission: 'discount-codes:view',
  },
  { label: 'Audit Log', href: '/audit', icon: FileText, permission: 'audit:view' },
  {
    label: 'Team',
    href: '/admins',
    icon: ShieldCheck,
    permission: 'admins:manage',
  },
];
