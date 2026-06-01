// ─── Enums ────────────────────────────────────────────────────────────────────

export type OrderStatus = 'PENDING' | 'PAID' | 'FULFILLED' | 'EXPIRED' | 'FAILED';
export type PaymentMode = 'WALLET' | 'DIRECT_TRANSFER' | 'CRYPTO';
export type ProductCategory = 'GIFT_CARD' | 'GAME_TOP_UP' | 'AIRTIME';
export type AdminRole = 'SUPER_ADMIN' | 'ADMIN';
export type AuditAction =
  | 'WALLET_CREDIT'
  | 'WALLET_DEBIT'
  | 'ORDER_FULFILLED'
  | 'ORDER_FAILED'
  | 'ORDER_EXPIRED'
  | 'ADMIN_RESEND'
  | 'ADMIN_WALLET_CREDIT'
  | 'ADMIN_FORCE_FULFILL'
  | 'USER_CREATED'
  | 'PIN_SET'
  | 'PIN_LOCKED'
  | 'PIN_UNLOCKED'
  | 'ADMIN_LOGIN'
  | 'ADMIN_CREATED'
  | 'ADMIN_UPDATED'
  | 'ADMIN_DEACTIVATED'
  | 'ADMIN_PASSWORD_RESET'
  | 'ADMIN_PASSWORD_CHANGED'
  | 'PRODUCT_CREATED'
  | 'PRODUCT_UPDATED'
  | 'PRODUCT_PRICING_UPDATED'
  | 'PRODUCT_AVAILABILITY_CHANGED'
  | 'VOUCHERS_UPLOADED'
  | 'FX_RATE_UPDATED'
  | 'PRODUCTS_RECOMPUTED';

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export interface Stats {
  users: {
    total: number;
    newLast7Days: number;
  };
  orders: {
    total: number;
    pending: number;
    paid: number;
    fulfilled: number;
    failed: number;
    expired: number;
  };
  revenue: {
    totalNgn: number;
    last7DaysNgn: number;
  };
  vouchers: {
    total: number;
    available: number;
    used: number;
  };
}

// ─── Payments ─────────────────────────────────────────────────────────────────

export type PaymentMethod =
  | 'DEDICATED_NUBAN'
  | 'BANK_TRANSFER'
  | 'WALLET'
  | 'REFUND';

export interface UserPayment {
  id: string;
  method: PaymentMethod;
  amount: number;
  providerRef: string;
  orderId: string | null;
  confirmedAt: string;
}

// ─── Users ────────────────────────────────────────────────────────────────────

export interface UserListItem {
  id: string;
  whatsappNumber: string;
  displayName: string | null;
  createdAt: string;
  orderCount: number;
}

export interface PinStatus {
  failedAttempts: number;
  isLocked: boolean;
  lockedUntil: string | null;
}

export interface UserDetail extends UserListItem {
  paymentCount: number;
  pinStatus: PinStatus;
  recentOrders: Order[];
  virtualAccount: {
    accountNumber: string;
    bankName: string;
    accountName: string;
  } | null;
}

// ─── Orders ───────────────────────────────────────────────────────────────────

// Slim refs for the relations embedded in /admin/orders responses.
// Backend hydrates full entities; only these fields are actually rendered.
export interface OrderProductRef {
  id: string;
  name: string;
  category: ProductCategory;
  snapshotNgnPrice: string;
  currency: string;
  isAvailable: boolean;
}

export type PricingMode = 'GLOBAL_FX' | 'MANUAL_NGN';

export interface OrderUserRef {
  id: string;
  whatsappNumber: string;
  displayName: string | null;
  createdAt: string;
}

export interface Order {
  id: string;
  userId: string;
  productId: string;
  amount: string;
  paymentMode: PaymentMode;
  status: OrderStatus;
  paystackReference: string | null;
  expiresAt: string | null;
  createdAt: string;
  product?: OrderProductRef;
  user?: OrderUserRef;
}

export interface PaymentTimelineEntry {
  id: string;
  method: PaymentMethod;
  amount: string;
  providerRef: string;
  confirmedAt: string;
}

export interface OrderDetail extends Order {
  voucherAssigned: boolean;
  voucherIsUsed: boolean;
  rateSnapshot?: string | null;
  paystackDvaReference?: string | null;
  /** API field from GET /admin/orders/:id */
  payments?: PaymentTimelineEntry[];
  /** @deprecated Use `payments` */
  paymentTimeline?: PaymentTimelineEntry[];
}

// ─── Products ─────────────────────────────────────────────────────────────────

export interface VoucherStats {
  total: number;
  available: number;
  used: number;
}

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  currency: string;
  isAvailable: boolean;
  pricingMode: PricingMode;
  priceUsd: string | null;
  manualPriceNgn: string | null;
  snapshotNgnPrice: string;
  snapshotAt: string;
}

export interface ProductWithStats extends Product {
  voucherStats: VoucherStats;
}

// ─── Pricing ──────────────────────────────────────────────────────────────────

export interface ExchangeRate {
  ngnPerUsd: number;
  effectiveFrom: string;
  markupBps: number;
  oracleNgnPerUsd: number | null;
  setById: string | null;
  note: string | null;
}

export interface ExchangeRateHistoryItem extends ExchangeRate {
  id: string;
  createdAt: string;
}

// ─── Audit ────────────────────────────────────────────────────────────────────

export interface AuditLog {
  id: string;
  actor: string;
  action: AuditAction;
  metadata: Record<string, unknown>;
  createdAt: string;
}

// ─── Admin Users ──────────────────────────────────────────────────────────────

export interface AdminUser {
  id: string;
  email: string;
  displayName: string;
  role: AdminRole;
  isActive: boolean;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface AdminDirectoryItem {
  id: string;
  displayName: string;
  role: AdminRole;
}

/** Returned by `/api/auth/login` — JWT is stored in HttpOnly cookie only. */
export interface LoginResponse {
  must_change_password: boolean;
  role?: AdminRole;
  email?: string;
  display_name?: string;
}
