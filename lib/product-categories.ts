import type { ProductCategory } from '@/lib/types';

export type ProductCategoryTab = 'ALL' | ProductCategory;

export const PRODUCT_CATEGORY_TABS: { value: ProductCategoryTab; label: string }[] =
  [
    { value: 'ALL', label: 'All' },
    { value: 'GIFT_CARD', label: 'Gift Cards' },
    { value: 'GAME_TOP_UP', label: 'Game Top-ups' },
    { value: 'AIRTIME', label: 'Airtime' },
    { value: 'CONSOLE_VOUCHER', label: 'Console Vouchers' },
    { value: 'ENTERTAINMENT', label: 'Entertainment' },
  ];

export const PRODUCT_CATEGORY_OPTIONS: {
  value: ProductCategory;
  label: string;
}[] = [
  { value: 'GIFT_CARD', label: 'Gift Card' },
  { value: 'GAME_TOP_UP', label: 'Game Top-up' },
  { value: 'AIRTIME', label: 'Airtime' },
  { value: 'CONSOLE_VOUCHER', label: 'Console Voucher' },
  { value: 'ENTERTAINMENT', label: 'Entertainment' },
];

export const CATEGORY_LABEL: Record<ProductCategory, string> = {
  GIFT_CARD: 'Gift Card',
  GAME_TOP_UP: 'Game Top-up',
  AIRTIME: 'Airtime',
  CONSOLE_VOUCHER: 'Console Voucher',
  ENTERTAINMENT: 'Entertainment',
};
