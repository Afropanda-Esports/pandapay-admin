// ─── Enums ────────────────────────────────────────────────────────────────────

export type OrderStatus = 'PENDING' | 'PAID' | 'FULFILLED' | 'EXPIRED' | 'FAILED';
export type PaymentMode = 'WALLET' | 'DIRECT_TRANSFER';
export type ProductCategory = 'GIFT_CARD' | 'GAME_TOP_UP' | 'AIRTIME';
export type AuditAction =
  | 'WALLET_CREDIT'
  | 'WALLET_DEBIT'
  | 'ORDER_FULFILLED'
  | 'ORDER_FAILED'
  | 'ORDER_EXPIRED'
  | 'ADMIN_RESEND'
  | 'USER_CREATED'
  | 'PIN_SET'
  | 'PIN_LOCKED'
  | 'PIN_UNLOCKED';

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

// ─── Users ────────────────────────────────────────────────────────────────────

export interface UserListItem {
  id: string;
  whatsappNumber: string;
  displayName: string | null;
  createdAt: string;
  walletBalance: number;
}

export interface PinStatus {
  failedAttempts: number;
  isLocked: boolean;
  lockedUntil: string | null;
}

export interface UserDetail extends UserListItem {
  pinStatus: PinStatus;
  recentOrders: Order[];
}

// ─── Orders ───────────────────────────────────────────────────────────────────

// Slim refs for the relations embedded in /admin/orders responses.
// Backend hydrates full entities; only these fields are actually rendered.
export interface OrderProductRef {
  id: string;
  name: string;
  category: ProductCategory;
  denomination: string;
  currency: string;
  isAvailable: boolean;
}

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

export interface OrderDetail extends Order {
  voucherAssigned: boolean;
  voucherIsUsed: boolean;
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
  denomination: string;
  currency: string;
  isAvailable: boolean;
}

export interface ProductWithStats extends Product {
  voucherStats: VoucherStats;
}

// ─── Audit ────────────────────────────────────────────────────────────────────

export interface AuditLog {
  id: string;
  actor: string;
  action: AuditAction;
  metadata: Record<string, unknown>;
  createdAt: string;
}
