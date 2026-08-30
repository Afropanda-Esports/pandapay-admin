// ─── Enums ────────────────────────────────────────────────────────────────────

export type OrderStatus =
  | 'PENDING'
  | 'PAID'
  | 'FULFILLED'
  | 'EXPIRED'
  | 'FAILED';
export type PaymentMode = 'WALLET' | 'DIRECT_TRANSFER' | 'CRYPTO';
export type OrderSource = 'whatsapp' | 'web_store' | 'agent';
export interface Category {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  createdAt: string;
}
export type AdminRole = 'SUPER_ADMIN' | 'ADMIN';
export type AuditAction =
  | 'WALLET_CREDIT'
  | 'WALLET_DEBIT'
  | 'ORDER_FULFILLED'
  | 'ORDER_FAILED'
  | 'ORDER_REFUNDED'
  | 'UNMATCHED_PAYMENT'
  | 'MANUAL_PAYMENT_CONFIRMED'
  | 'MANUAL_PAYMENT_SETTINGS_UPDATED'
  | 'ORDER_EXPIRED'
  | 'ADMIN_RESEND'
  | 'ADMIN_WALLET_CREDIT'
  | 'ADMIN_FORCE_FULFILL'
  | 'ADMIN_PURCHASE_CREATED'
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
  | 'PRODUCTS_RECOMPUTED'
  | 'FRAUD_REVIEWED'
  | 'CRYPTO_PAYMENT_RECEIVED'
  | 'FEATURE_FLAG_UPDATED'
  | 'VOUCHER_DELIVERY_FAILED';

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
    /** SUM(fx_markup_ngn) of FULFILLED orders — 2 dp string. Absent on pre-ORD-003 APIs. */
    fxMarkupNgn?: string;
    last7DaysFxMarkupNgn?: string;
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
  | 'REFUND'
  | 'CRYPTO_USDC'
  | 'MANUAL_BANK_TRANSFER';

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
  email: string | null;
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

export interface UserDirectoryItem {
  id: string;
  displayName: string | null;
  whatsappNumber: string;
  createdAt: string;
}

// ─── Orders ───────────────────────────────────────────────────────────────────

// Slim refs for the relations embedded in /admin/orders responses.
// Backend hydrates full entities; only these fields are actually rendered.
export interface OrderProductRef {
  id: string;
  name: string;
  categoryId: string;
  category?: Category;
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
  paymentCollectionMode?: 'PAYSTACK_AUTO' | 'MANUAL_BANK_TRANSFER';
  status: OrderStatus;
  source?: OrderSource;
  paystackReference: string | null;
  expiresAt: string | null;
  createdAt: string;
  product?: OrderProductRef;
  user?: OrderUserRef;
  /** Product pricing mode frozen at checkout. Null on pre-ORD-003 rows. */
  pricingMode?: PricingMode | null;
  priceUsd?: string | null;
  markupBps?: number | null;
  oracleNgnPerUsd?: string | null;
  fxMarkupNgn?: string | null;
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
  paymentException?: PaymentException | null;
}

export type PaymentExceptionStatus =
  | 'REFUND_INITIATED'
  | 'REFUND_FAILED'
  | 'RESOLVED';

export interface PaymentException {
  id: string;
  orderId: string;
  userId: string;
  expectedAmount: string;
  receivedAmount: string;
  excessAmount: string;
  paystackReference: string;
  status: PaymentExceptionStatus;
  paystackRefundRef: string | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
  resolutionNote: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Products ─────────────────────────────────────────────────────────────────

export interface Region {
  id: string;
  code: string;
  name: string;
  currency: string;
  isActive: boolean;
  createdAt: string;
}

export interface ProductBrand {
  id: string;
  regionId: string;
  categoryId: string;
  category?: Category;
  name: string;
  isActive: boolean;
  createdAt: string;
}

export interface VoucherStats {
  total: number;
  available: number;
  used: number;
}

export interface Product {
  id: string;
  brandId: string;
  name: string;
  categoryId: string;
  category?: Category;
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

// ─── Feature flags ────────────────────────────────────────────────────────────

export interface FeatureFlag {
  id: string;
  key: string;
  enabled: boolean;
  activeFrom: string | null;
  activeUntil: string | null;
  description: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Returned by `/api/auth/login` — JWT is stored in HttpOnly cookie only. */
export interface LoginResponse {
  must_change_password: boolean;
  role?: AdminRole;
  email?: string;
  display_name?: string;
}

// ─── Discount codes ───────────────────────────────────────────────────────────

export type DiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT';

/**
 * Not returned by the API — the backend has no `status` column, only
 * `isUsed`/`isRevoked`/`expiresAt`. Derive this client-side (see
 * discount-status-badge.tsx) mirroring the backend's own filter precedence.
 */
export type DiscountCodeStatus = 'ACTIVE' | 'USED' | 'EXPIRED' | 'REVOKED';

export interface DiscountCode {
  id: string;
  code: string;
  productId: string | null; // exactly one of productId/category is set
  categoryId: string | null;
  category?: Category | null;
  discountType: DiscountType;
  discountValue: string; // DECIMAL — string
  recipientLabel: string | null;
  expiresAt: string;
  isUsed: boolean;
  usedAt: string | null;
  usedByOrderId: string | null;
  isRevoked: boolean;
  revokedAt: string | null;
  revokedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GenerateDiscountCodesInput {
  count: number; // 1–500
  productId?: string;
  categoryId?: string;
  discountType: DiscountType;
  discountValue: number;
  expiresInDays?: number; // 1–90
  recipientLabel?: string;
}
