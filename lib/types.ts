import type { PricingCurrency, VoucherCurrency } from '@/lib/money';

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
  /** CUR-001: renamed from `currency`. GBP-003: a pricing currency, GBP included. */
  baseCurrency: PricingCurrency;
  priceUsd?: string | null;
  /** GBP-001/003: face value in `baseCurrency` (null for naira products). */
  baseAmount?: string | null;
  isAvailable: boolean;
}

/**
 * PRICE-004 retired pricing modes. This type survives only to describe the
 * value frozen on orders placed before that — `orders.pricing_mode` is kept as
 * a legacy column because orders are financial records and are not rewritten.
 * No product carries one, and nothing new is ever written with one.
 */
export type LegacyPricingMode = 'GLOBAL_FX' | 'MANUAL_NGN';

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
  /**
   * The pricing mode frozen at checkout, on orders placed before PRICE-004.
   * Null on pre-ORD-003 rows and on every order placed since — `markupBps` and
   * `oracleNgnPerUsd` describe the pricing completely now.
   */
  pricingMode?: LegacyPricingMode | null;
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

/**
 * GBP-004 per-line pricing snapshot (`order_items`). With `quantity`, these
 * alone reproduce `lineTotal`. All snapshot fields are null on a legacy line.
 */
export interface OrderItemDetail {
  id: string;
  productId: string;
  nameSnapshot: string;
  skuSnapshot: string | null;
  /** The naira charged per unit, after the voucher. */
  unitAmount: string;
  quantity: number;
  lineTotal: string;
  baseCurrency: PricingCurrency | null;
  /** One unit's face value before any voucher (the naira price for NGN). */
  unitBaseAmount: string | null;
  /** This line's share of the voucher, in `baseCurrency`. */
  voucherBaseAllocated: string | null;
  /** Raw NGN per unit the line was priced at. Null for NGN. */
  ngnPerUnit: string | null;
  /** The markup actually charged (product's own, else the general). Null for NGN. */
  markupBpsApplied: number | null;
}

/**
 * GBP-004 order-level pricing snapshot. NULL on every field means a legacy
 * order (written before GBP-4, never backfilled).
 */
export interface OrderPricingSnapshot {
  baseCurrency?: PricingCurrency | null;
  baseAmountTotal?: string | null;
  ngnPerUnit?: string | null;
  fxRateId?: string | null;
  voucherAppliedBase?: string | null;
}

export interface OrderDetail extends Order, OrderPricingSnapshot {
  items?: OrderItemDetail[];
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

export type SupportRequestStatus = 'OPEN' | 'RESOLVED';

export interface SupportRequest {
  id: string;
  userId: string;
  whatsappNumber: string;
  orderId: string | null;
  issueDescription: string;
  status: SupportRequestStatus;
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
  // CAT-007: brands are region-scoped only. The category columns were dropped
  // from the backend — a product carries its own category instead.
  name: string;
  isActive: boolean;
  createdAt: string;
}

/** A brand as `GET /admin/products/:id` embeds it, with its region (GBP-006). */
export type ProductBrandWithRegion = ProductBrand & { region?: Region };

export interface ProductLine {
  id: string;
  brandId: string;
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
  lineId: string;
  name: string;
  categoryId: string;
  category?: Category;
  /**
   * What this product is priced in. PRICE-004 made the **region** the source of
   * truth; this is a mirror the backend maintains, and it is not settable here.
   */
  baseCurrency: PricingCurrency;
  isAvailable: boolean;
  /**
   * PRICE-004: margin over cost, in basis points. `null` means the product
   * follows the global markup; `0` means sell at cost. The two are different
   * prices — see `lib/markup.ts`.
   */
  markupBps: number | null;
  /**
   * Legacy dollar field: the USD face value (mirror of `baseAmount`), a naira
   * product's declared value, and always null for GBP (GBP-003). Read the face
   * value from `baseAmount`.
   */
  priceUsd: string | null;
  /**
   * GBP-001/003: face value in `baseCurrency` — `"10.00"` is £10 for a GBP
   * product. Null for a naira product, whose price is `snapshotNgnPrice`.
   * Optional because a backend older than GBP-001 does not send it.
   */
  baseAmount?: string | null;
  snapshotNgnPrice: string;
  snapshotAt: string;
  /** GBP-006: required for admin-created products; null on older ones. */
  sku?: string | null;
  /** Relations the detail endpoint loads (`GET /admin/products/:id`). */
  brand?: ProductBrandWithRegion;
  line?: ProductLine;
  /**
   * CAT-004: when the product was retired, or null if it is still on sale.
   * Deliberately separate from `isAvailable`, which means "out of stock for
   * now" and gets flipped routinely.
   */
  archivedAt: string | null;
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

// ─── Currency rates (GBP-005) ─────────────────────────────────────────────────

/** One stored raw rate (`GET /admin/pricing/rates…`). No markup. */
export interface CurrencyRateView {
  id: string;
  currency: PricingCurrency;
  /** Raw NGN per one unit of `currency`. Decimal string, 4 dp. */
  ngnPerUnit: string;
  effectiveFrom: string;
  /** `ORACLE` (USD) or `MANUAL` (GBP). */
  source: string;
  setById: string | null;
  note: string | null;
  createdAt: string;
}

export type RateManagement = 'ORACLE' | 'MANUAL';

export interface CurrencyRatesOverview {
  /** The general markup every converted currency (USD, GBP) inherits. */
  generalMarkupBps: number;
  rates: Array<{
    currency: PricingCurrency;
    management: RateManagement;
    current: CurrencyRateView | null;
  }>;
}

export interface SetCurrencyRateInput {
  /** NGN per one unit, decimal string, ≤ 4 dp. */
  ngnPerUnit: string;
  note?: string;
  /** Required by the backend for a change of more than 10 % (DECISION R). */
  confirmLargeChange?: boolean;
}

export interface SetCurrencyRateResult {
  rate: CurrencyRateView;
  previousNgnPerUnit: string | null;
  changePercent: string | null;
  affected: number;
}

/** `details` of a `409 LARGE_RATE_CHANGE`. */
export interface LargeRateChangeDetails {
  currency: string;
  previousNgnPerUnit: string;
  proposedNgnPerUnit: string;
  /** Signed percent, 4 dp. */
  changePercent: string;
  direction: 'INCREASE' | 'DECREASE';
  thresholdPercent: string;
  previousEffectiveFrom: string;
  requiresConfirmation: boolean;
}

/** `POST /admin/pricing/preview` — the authoritative naira price. */
export interface PricePreviewRequest {
  regionId?: string;
  currency?: PricingCurrency;
  baseAmount: string;
  markupBps: number | null;
}

export interface PricePreview {
  currency: PricingCurrency;
  baseAmount: string;
  /** The RAW rate, no markup. */
  ngnPerUnit: string;
  rateEffectiveFrom: string;
  rateSource: string;
  globalMarkupBps: number;
  /** The markup actually applied: the product's own, or the general one. */
  effectiveMarkupBps: number;
  ngnPrice: string;
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

// ─── Voucher codes (VOUCH-001) ────────────────────────────────────────────────

/**
 * Not returned by the API — the backend has no `status` column, only
 * `isUsed`/`isRevoked`/`expiresAt`. Derive this client-side (see
 * voucher-status-badge.tsx) mirroring the backend's own filter precedence.
 */
export type VoucherCodeStatus = 'ACTIVE' | 'USED' | 'EXPIRED' | 'REVOKED';

export interface VoucherCode {
  id: string;
  code: string;
  /** Face value in `currency` — DECIMAL string, never a float. */
  value: string;
  /** Currency the voucher is denominated in — a voucher currency, never GBP (GBP-003). */
  currency: VoucherCurrency;
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

export interface GenerateVoucherCodesInput {
  count: number; // 1–500
  /** Face value in `currency`. */
  value: number;
  currency: VoucherCurrency;
  expiresInDays?: number; // 1–90
  recipientLabel?: string;
}
