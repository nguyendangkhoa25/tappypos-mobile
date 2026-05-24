import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import i18n from '../i18n';
import { forceLogout } from './authSession';
import { useNetworkStore } from '../store/networkStore';

export const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://tappypos.vn/api';

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor ───────────────────────────────────────────────────────

api.interceptors.request.use(async (config) => {
  try {
    const [token, tenantId] = await Promise.all([
      SecureStore.getItemAsync('access_token'),
      SecureStore.getItemAsync('tenant_id'),
    ]);
    // Never send a stored token on credential-based auth endpoints — a stale token triggers
    // DEVICE_SWITCHED 401 from JwtAuthenticationFilter before the login logic runs.
    const isAuthEndpoint = /^\/auth\/(login|phone-pin|register|password-reset)/.test(config.url ?? '');
    if (token && !config.headers.Authorization && !isAuthEndpoint) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Never send X-Tenant-ID on login or register — backend resolves tenant from username globally
    // (findByUsernameGlobal), and register creates a brand-new tenant that doesn't exist yet.
    // Sending a stale stored tenant_id causes TENANT_NOT_FOUND on both flows.
    const isNoTenantEndpoint = /^\/auth\/(login(\/force)?|register)$/.test(config.url ?? '');
    if (tenantId && !config.headers['X-Tenant-ID'] && !isNoTenantEndpoint) {
      config.headers['X-Tenant-ID'] = tenantId;
    }
  } catch {
    // Keychain unavailable (e.g. missing entitlement in dev build) — proceed without auth headers
  }
  config.headers['Accept-Language'] = i18n.language ?? 'vi';
  return config;
});

// ── Response interceptor — handles 401 / refresh / DEVICE_SWITCHED ───────────

let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = [];

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token!)));
  failedQueue = [];
}

api.interceptors.response.use(
  (res) => {
    // Any successful response proves the server is up and the device is online.
    // Clear both flags immediately — don't wait for the next health-poll tick.
    const networkState = useNetworkStore.getState();
    if (networkState.isMaintenance) networkState.setMaintenance(false);
    if (networkState.isOffline)     networkState.setOffline(false);
    return res;
  },
  async (error) => {
    const original = error.config;

    if (!error.response) {
      // No response at all = request timed out or device lost connectivity.
      useNetworkStore.getState().setOffline(true);
    } else if (error.response.status === 502 || error.response.status === 503) {
      // Bad Gateway (502) or Service Unavailable (503) = server-side outage / maintenance.
      useNetworkStore.getState().setMaintenance(true);
    } else {
      // Any other HTTP error (400, 401, 404, 422 …) = server is reachable and responding.
      // Clear both flags: we're online and the server is up.
      const networkState = useNetworkStore.getState();
      if (networkState.isMaintenance) networkState.setMaintenance(false);
      if (networkState.isOffline)     networkState.setOffline(false);
    }

    // 410 Gone = shop has been soft-deleted. Force logout so the user lands on Welcome/Onboarding.
    if (error.response?.status === 410 && error.response?.data?.error === 'SHOP_DELETED') {
      await forceLogout('session_expired');
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !original.url?.startsWith('/auth/')) {
      // Device conflict — another device took over this session
      if (error.response?.data?.error === 'DEVICE_SWITCHED') {
        isRefreshing = false;
        processQueue(error, null);
        await forceLogout('device_switched');
        return Promise.reject(error);
      }

      if (!original._retry) {
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          }).then((token) => {
            original.headers.Authorization = `Bearer ${token}`;
            return api(original);
          });
        }

        original._retry = true;
        isRefreshing = true;

        try {
          const refreshToken = await SecureStore.getItemAsync('refresh_token');
          const phone = await SecureStore.getItemAsync('phone');
          if (!refreshToken) throw new Error('no_refresh_token');

          // Backend change required: accept { refreshToken } in request body when no cookie.
          // See MOBILE_SPEC.md §4 and backend AuthController.refreshToken().
          const storedTenantId = await SecureStore.getItemAsync('tenant_id');
          const { data } = await axios.post<ApiResponse<AuthData>>(
            `${BASE_URL}/auth/refresh`,
            { refreshToken },
            {
              params: phone ? { username: phone } : undefined,
              headers: {
                'Content-Type': 'application/json',
                'Accept-Language': i18n.language ?? 'vi',
                ...(storedTenantId ? { 'X-Tenant-ID': storedTenantId } : {}),
              },
            },
          );

          const { accessToken, refreshToken: newRefresh } = data.data;
          await Promise.all([
            SecureStore.setItemAsync('access_token', accessToken),
            ...(newRefresh ? [SecureStore.setItemAsync('refresh_token', newRefresh)] : []),
          ]);

          processQueue(null, accessToken);
          original.headers.Authorization = `Bearer ${accessToken}`;
          return api(original);
        } catch (refreshError) {
          processQueue(refreshError, null);
          await forceLogout('session_expired');
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }
    }

    return Promise.reject(error);
  },
);

// ── Types ─────────────────────────────────────────────────────────────────────

type ApiResponse<T> = { success: boolean; data: T; message: string | null };

type AuthData = {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  tokenType: string;
  username: string;
  setupComplete?: boolean;
};

type ProfileData = {
  username: string;
  fullName: string | null;
  shopName: string | null;
  roles: string[];
  avatarUrl: string | null;
};

// ── Auth API ──────────────────────────────────────────────────────────────────
// Backend changes needed for mobile (see MOBILE_SPEC.md §8):
//   1. LoginRequest: add `refreshInBody` field — when true, include refreshToken in response body
//      and skip Turnstile verification (mobile clients can't render Turnstile widgets).
//   2. AuthController.refreshToken(): also accept { refreshToken } from request body
//      when the HttpOnly cookie is absent.
//   3. New endpoints: POST /auth/phone-pin, POST /auth/pin/setup (mobile-only flows).

export const authApi = {
  login: (username: string, password: string) =>
    api.post<ApiResponse<AuthData>>('/auth/login', {
      username,
      password,
      rememberMe: true,
      refreshInBody: true,
    }),

  loginWithPin: (username: string, pin: string) =>
    api.post<ApiResponse<AuthData>>('/auth/phone-pin', { username, pin }),

  setupPin: (pin: string, token?: string) =>
    api.post<ApiResponse<null>>(
      '/auth/pin/setup',
      { pin },
      token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
    ),

  refresh: async (refreshToken: string, username?: string) => {
    const storedTenantId = await SecureStore.getItemAsync('tenant_id');
    return axios.post<ApiResponse<AuthData>>(
      `${BASE_URL}/auth/refresh`,
      { refreshToken },
      {
        params: username ? { username } : undefined,
        headers: {
          'Content-Type': 'application/json',
          ...(storedTenantId ? { 'X-Tenant-ID': storedTenantId } : {}),
        },
      },
    );
  },

  forceLogin: (username: string, password: string) =>
    api.post<ApiResponse<AuthData>>('/auth/login/force', {
      username,
      password,
      rememberMe: true,
      refreshInBody: true,
    }),

  logout: () => api.post<ApiResponse<null>>('/auth/logout'),

  changePassword: (currentPassword: string, newPassword: string) =>
    api.post<ApiResponse<null>>('/users/change-password', { oldPassword: currentPassword, newPassword }),

  deletePin: () => api.delete<ApiResponse<null>>('/auth/pin'),
};

// ── Profile API ───────────────────────────────────────────────────────────────

export const profileApi = {
  getMe: () => api.get<ApiResponse<ProfileData>>('/profiles/me'),

  uploadAvatar: async (uri: string) => {
    const formData = new FormData();
    const filename = uri.split('/').pop() ?? 'avatar.jpg';
    const ext = filename.split('.').pop()?.toLowerCase() ?? 'jpg';
    const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
    // React Native FormData accepts the file as an object with uri/type/name
    formData.append('file', { uri, type: mime, name: filename } as unknown as Blob);
    return api.post<ApiResponse<ProfileData>>('/profiles/me/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  deleteAvatar: () => api.delete<ApiResponse<ProfileData>>('/profiles/me/avatar'),
};

// ── Employee API ──────────────────────────────────────────────────────────────

export type EmployeeData = {
  id: string;
  fullName: string;
  position: string | null;
  commissionRate: number | null;
};

export type EmployeeProfile = {
  id: number;
  fullName: string;
  nickName: string | null;
  phone: string | null;
  email: string | null;
  position: string | null;
  hireDate: string | null;
  baseWage: number | null;
  commissionRate: number | null;
  notes: string | null;
  userId: number | null;
  idCardNumber: string | null;
  idCardFullName: string | null;
  idCardSex: string | null;
  idCardNationality: string | null;
  idCardPlaceOfOrigin: string | null;
  idCardPlaceOfResidence: string | null;
  idCardDateOfBirth: string | null;
  idCardIssuedDate: string | null;
  idCardIssuedPlace: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  permanentAddress: string | null;
  avatarUrl: string | null;
};

export type CreateEmployeePayload = {
  fullName: string;
  nickName?: string;
  phone?: string;
  email?: string;
  position?: string;
  hireDate?: string;
  baseWage?: number;
  commissionRate?: number;
  notes?: string;
  userId?: number;
  idCardNumber?: string;
  idCardFullName?: string;
  idCardSex?: string;
  idCardNationality?: string;
  idCardPlaceOfOrigin?: string;
  idCardPlaceOfResidence?: string;
  idCardDateOfBirth?: string;
  idCardIssuedDate?: string;
  idCardIssuedPlace?: string;
  dateOfBirth?: string;
  gender?: string;
  permanentAddress?: string;
};

export type UpdateEmployeePayload = Partial<CreateEmployeePayload>;

export type EmployeeAnalyticsSummary = {
  totalRevenue: number;
  totalCommission: number;
  activeEmployeeCount: number;
  avgRevenuePerEmployee: number;
};

export type EmployeeRevenueRankItem = {
  employeeName: string;
  userId: string | null;
  orderCount: number;
  revenue: number;
};

export type EmployeeCommissionRankItem = {
  employeeId: string | null;
  employeeName: string;
  commission: number;
  orderCount: number;
  revenue: number;
};

export type EmployeeTrendPoint = {
  label: string;
  revenue: number;
  commission: number;
};

export type EmployeeAnalytics = {
  summary: EmployeeAnalyticsSummary;
  rankingRevenue: EmployeeRevenueRankItem[];
  rankingCommission: EmployeeCommissionRankItem[];
  trend: EmployeeTrendPoint[];
};

export const employeeApi = {
  listActive: () => api.get<ApiResponse<EmployeeData[]>>('/employees/all'),

  getByUserId: (userId: string | number) =>
    api.get<EmployeeProfile>(`/employees/by-user/${userId}`),

  create: (data: CreateEmployeePayload) =>
    api.post<EmployeeProfile>('/employees', data),

  update: (id: number, data: UpdateEmployeePayload) =>
    api.put<EmployeeProfile>(`/employees/${id}`, data),

  analytics: (params: { from: string; to: string; granularity?: string; limit?: number }) =>
    api.get<ApiResponse<EmployeeAnalytics>>('/employees/analytics', { params }),

  uploadAvatar: (id: number, uri: string) => {
    const formData = new FormData();
    const filename = uri.split('/').pop() ?? 'avatar.jpg';
    const ext = filename.split('.').pop()?.toLowerCase() ?? 'jpg';
    const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
    formData.append('file', { uri, type: mime, name: filename } as unknown as Blob);
    return api.post<ApiResponse<EmployeeProfile>>(`/employees/${id}/avatar`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  deleteAvatar: (id: number) =>
    api.delete<ApiResponse<EmployeeProfile>>(`/employees/${id}/avatar`),
};

// ── Dashboard API ─────────────────────────────────────────────────────────────

export type KpiPreset = 'today' | 'yesterday' | 'week' | 'lastMonth' | 'month' | 'year' | 'lastYear' | 'custom';

export type KpiData = {
  totalRevenue: number;
  totalOrders: number;
  completedOrders: number;
  pendingOrders: number;
};

// ── Product & Category API ────────────────────────────────────────────────────

export type ProductData = {
  id: string;
  name: string;
  price: number;
  unit: string;
  categoryIds: string[] | null;
  categoryNames: string[] | null;
  productTypeCode: string | null;
  productTypeName: string | null;
  description: string | null;
  inStock: boolean | null;
  stockQuantity: number | null;
  dynamicPrice: boolean;
  durationMinutes: number;
  status: string;
  imageUrl: string | null;
  commissionRate: number | null;
};

export type CategoryData = {
  id: string;
  name: string;
  emoji: string;
  productCount: number;
  outOfStockCount: number;
  revenueThisMonth: number;
};

export type ProductStatsDTO = {
  orderCount: number;
  qtySold: number;
  revenue: number;
  lastSoldAt: string | null;
  revenueThisMonth: number;
  revenueLastMonth: number;
  topCustomers: { name: string; orderCount: number; totalSpend: number }[];
  topEmployees: { name: string; orderCount: number }[];
};

export type ProductUpdatePayload = {
  name: string;
  price: number;
  unit: string;
  categoryIds: number[] | null;
  description: string | null;
  status: string;
  durationMinutes: number | null;
};

export type ProductSummary = {
  total: number;
  outOfStock: number;
  lowStock: number;
};

export type ProductTypeData = {
  id: string;
  name: string;
  code: string;
  description: string | null;
};

export type ProductCreatePayload = {
  productTypeId: number;
  sku: string;
  name: string;
  price: number;
  unit: string;
  categoryIds: number[] | null;
  description: string | null;
  status: string;
  durationMinutes: number | null;
  attributes: Record<string, unknown>;
};

export const productApi = {
  summary: () => api.get<ApiResponse<ProductSummary>>('/products/summary'),

  list: (params: { page?: number; size?: number; categoryId?: string; search?: string }) =>
    api.get<ApiResponse<{ content: ProductData[]; totalPages: number; totalElements: number }>>(
      '/products',
      { params: { page: 0, size: 30, ...params } },
    ),

  search: (params: { keyword: string; page?: number; size?: number }) =>
    api.get<ApiResponse<{ content: ProductData[]; totalPages: number; totalElements: number }>>(
      '/products/search',
      { params: { page: 0, size: 30, ...params } },
    ),

  getById: (id: string) =>
    api.get<ApiResponse<ProductData>>(`/products/${id}`),

  getStats: (id: string, days = 30) =>
    api.get<ApiResponse<ProductStatsDTO>>(`/products/${id}/stats`, { params: { days } }),

  update: (id: string, data: ProductUpdatePayload) =>
    api.put<ApiResponse<ProductData>>(`/products/${id}`, data),

  types: () =>
    api.get<ApiResponse<ProductTypeData[]>>('/products/types/all'),

  suggestSku: (name: string, typeCode: string) =>
    api.get<ApiResponse<string>>('/products/sku/suggest', { params: { name, typeCode } }),

  create: (data: ProductCreatePayload) =>
    api.post<ApiResponse<ProductData>>('/products', data),

  uploadImage: (id: string, uri: string) => {
    const form = new FormData();
    // React Native FormData accepts { uri, name, type } as a file entry
    form.append('file', { uri, name: 'product.jpg', type: 'image/jpeg' } as any);
    return api.post<ApiResponse<ProductData>>(`/products/${id}/image`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  deleteImage: (id: string) =>
    api.delete<ApiResponse<void>>(`/products/${id}/image`),
};

// ── Cart API ──────────────────────────────────────────────────────────────────

export type CartItemResponse = {
  id: string;
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  unit: string;
  subtotal: number;
  notes?: string | null;
  assignedEmployeeId: number | null;
  assignedEmployeeName: string | null;
  commissionRate: number | null;
  commissionAmount: number | null;
};

export type CartResponse = {
  cartId: string;
  items: CartItemResponse[];
  subtotal: number;
  totalDiscount: number;
  total: number;
  appliedPromotions: string[] | null;
};

export type CheckoutRequest = {
  paymentMethod: 'CASH' | 'BANK_TRANSFER' | 'CARD';
  amountPaid?: number;
  tip?: number;
  customerId?: string;
  /** Name for a one-off guest customer (no managed record). Only set when customerId is absent. */
  customerName?: string;
  notes?: string;
  loyaltyPointsToRedeem?: number;
  tableId?: number | null;
  tableLabel?: string | null;
  createAsInProgress?: boolean;
  /** ISO datetime string for takeaway pickup time (null = dine-in). */
  pickupTime?: string | null;
};

export type LoyaltyProgramDTO = {
  id: number | null;
  pointsPerAmount: number;
  amountPerPoints: number;
  redemptionPointsPerDiscount: number;
  redemptionDiscountAmount: number;
  minRedemptionPoints: number;
  isActive: boolean;
};

export type LoyaltyTierDTO = {
  id: number;
  name: string;
  minSpend: number;
  pointsMultiplier: number;
  color: string;
  description: string | null;
  sortOrder: number;
};

export type CustomerLoyaltySummaryDTO = {
  customerId: number;
  customerName: string;
  loyaltyPoints: number;
  totalSpent: number;
  currentTier: LoyaltyTierDTO | null;
  nextTier: LoyaltyTierDTO | null;
  amountToNextTier: number | null;
};

export type LoyaltyTransactionDTO = {
  id: number;
  customerId: number;
  orderId: number | null;
  type: 'EARNED' | 'REDEEMED' | 'ADJUSTED' | 'EXPIRED';
  points: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  createdAt: string;
};

export type CheckoutResponse = {
  orderId: string;
  orderNumber: string;
  total: number;
};

export const cartApi = {
  init: () => api.post<ApiResponse<CartResponse>>('/carts'),

  get: (cartId: string) => api.get<ApiResponse<CartResponse>>(`/carts/${cartId}`),

  addItem: (cartId: string, productId: string, quantity: number, unitPrice?: number, note?: string) =>
    api.post<ApiResponse<CartResponse>>(`/carts/${cartId}/items`, {
      productId,
      quantity,
      ...(unitPrice !== undefined && unitPrice > 0 ? { unitPrice } : {}),
      ...(note ? { notes: note } : {}),
    }),

  updateItemNote: (cartId: string, itemId: string | number, note: string | null) =>
    api.patch<ApiResponse<CartResponse>>(`/carts/${cartId}/items/${itemId}/note`, { note: note ?? null }),

  updateItem: (cartId: string, cartItemId: string, quantity: number) =>
    api.put<ApiResponse<CartResponse>>(`/carts/${cartId}/items/${cartItemId}`, { newQuantity: quantity }),

  removeItem: (cartId: string, cartItemId: string) =>
    api.delete<ApiResponse<CartResponse>>(`/carts/${cartId}/items/${cartItemId}`),

  applyPromo: (cartId: string, promoCode: string) =>
    api.post<ApiResponse<CartResponse>>(`/carts/${cartId}/promotion`, { promoCode }),

  updateCommission: (
    cartId: string,
    itemId: string,
    employeeId: string,
    commissionAmount?: number | null,
  ) =>
    api.patch<ApiResponse<CartResponse>>(`/carts/${cartId}/items/${itemId}/commission`, {
      assignedEmployeeId: employeeId,
      ...(commissionAmount !== undefined && commissionAmount !== null
        ? { commissionAmount }
        : {}),
    }),

  checkout: (cartId: string, req: CheckoutRequest) =>
    api.post<ApiResponse<CheckoutResponse>>(`/carts/${cartId}/checkout`, req),

  sendToKitchen: (
    cartId: string,
    tableId?: number,
    tableLabel?: string,
    pickupTime?: string | null,
  ) =>
    api.post<ApiResponse<{ orderId: string; orderNumber: string; tableLabel: string; status: string }>>(
      `/carts/${cartId}/send-to-kitchen`,
      { tableId: tableId ?? null, tableLabel: tableLabel ?? null, pickupTime: pickupTime ?? null },
    ),

  addCombo: (cartId: string, comboId: string) =>
    api.post<ApiResponse<CartResponse>>(`/carts/${cartId}/combos/${comboId}`),
};

// ── Order API ─────────────────────────────────────────────────────────────────

export type OrderStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'VOIDED';

export type OrderSummaryItem = {
  productName: string;
  quantity: number;
  unitPrice?: number;
  durationMinutes?: number | null;
  assignedEmployeeName?: string | null;
  note?: string | null;
  itemStatus?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | null;
};

export type OrderSummary = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  total: number;
  customerName: string | null;
  createdByName: string | null;
  createdAt: string;
  itemCount: number;
  items?: OrderSummaryItem[];
};

export type OrderItemDetail = {
  id?: number;
  productId?: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  unit: string;
  note?: string | null;
  itemStatus?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | null;
  assignedEmployeeId?: number | null;
  assignedEmployeeName?: string | null;
  /** Service duration in minutes (0 = no timer). */
  durationMinutes?: number | null;
};

export type OrderDetail = Omit<OrderSummary, 'items'> & {
  items: OrderItemDetail[];
  subtotal: number;
  discount: number;
  tipAmount: number | null;
  customerId: number | null;
  paymentMethod: string | null;
  note: string | null;
  amountPaid: number | null;
  changeAmount: number | null;
  cancelReason: string | null;
  cancelledBy: string | null;
  cancelledAt: string | null;
  voidReason: string | null;
  voidedBy: string | null;
  voidedAt: string | null;
};

export type WorkItemStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';

export type WorkItemDTO = {
  itemId: number;
  orderId: number;
  orderNumber: string;
  customerName: string | null;
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  durationMinutes: number;
  status: WorkItemStatus;
  completedAt: string | null;
  assignedEmployeeId: number | null;
  assignedEmployeeName: string | null;
  orderCreatedAt: string;
  commissionRate: number | null;
  commissionAmount: number | null;
  note?: string | null;
};

export type WorkItemSummaryDTO = {
  completedCount: number;
  totalRevenue: number;
  totalDurationMinutes: number;
  totalCommission: number;
};

export const orderApi = {
  list: (params: {
    status?: string;
    search?: string;
    page?: number;
    size?: number;
    customerId?: string;
    from?: string;
    to?: string;
    paymentMethod?: string;
  }) =>
    api.get<ApiResponse<{ content: OrderSummary[]; totalPages: number; totalElements: number }>>(
      '/orders',
      { params: { size: 20, ...params } },
    ),

  getById: (id: string) => api.get<ApiResponse<OrderDetail>>(`/orders/${id}`),

  /** Transition PENDING → IN_PROGRESS. Required before addItem / removeItem / payAndComplete. */
  start: (id: string) => api.put<ApiResponse<OrderDetail>>(`/orders/${id}/start`),

  complete: (id: string) => api.put<ApiResponse<OrderDetail>>(`/orders/${id}/complete`),

  cancel: (id: string, reason?: string) =>
    api.post<ApiResponse<OrderDetail>>(`/orders/${id}/cancel`, { reason }),
  void: (id: string, reason: string) =>
    api.post<ApiResponse<OrderDetail>>(`/orders/${id}/void`, { reason }),

  create: (req: {
    items: { productId: string; quantity: number }[];
    paymentMethod: 'CASH' | 'BANK_TRANSFER' | 'CARD';
    cashReceived?: number;
    customerId?: string;
    note?: string;
    source?: string;
    comboId?: string;
  }) => api.post<ApiResponse<{ orderId: string; orderNumber: string; total: number }>>('/orders', req),

  delete: (id: string) => api.delete<ApiResponse<null>>(`/orders/${id}`),

  topProducts: (params: { limit?: number; from?: string; to?: string; days?: number }) =>
    api.get<ApiResponse<{ name: string; orderCount: number; revenue: number; productId?: string }[]>>(
      '/orders/top-products',
      { params },
    ),

  topCustomers: (params: { limit?: number; from: string; to: string }) =>
    api.get<ApiResponse<{ name: string; orderCount: number; totalSpend: number; customerId: string }[]>>(
      '/orders/top-customers',
      { params },
    ),

  topCustomersByFrequency: (params: { limit?: number; from: string; to: string }) =>
    api.get<ApiResponse<{ name: string; orderCount: number; totalSpend: number; customerId: string }[]>>(
      '/orders/top-customers/by-frequency',
      { params },
    ),

  customerStats: (params: { from: string; to: string }) =>
    api.get<ApiResponse<{ total: number; newCount: number; returningCount: number }>>(
      '/orders/customer-stats',
      { params },
    ),

  topEmployees: (params: { limit?: number; from: string; to: string }) =>
    api.get<ApiResponse<{ name: string; orderCount: number; revenue: number; userId?: string }[]>>(
      '/orders/top-employees',
      { params },
    ),

  summary: (params: { from: string; to: string; status?: string; paymentMethod?: string }) =>
    api.get<ApiResponse<{
      totalRevenue: number;
      orderCount: number;
      avgOrderValue: number;
      completedCount: number;
      cancelledCount: number;
    }>>('/orders/summary', { params }),

  chart: (params: { from: string; to: string; granularity: 'hour' | 'day' | 'week' | 'month' | 'year' }) =>
    api.get<ApiResponse<{ label: string; value: number }[]>>('/orders/chart', { params }),

  filteredList: (params: { from?: string; to?: string; status?: string; paymentMethod?: string; page?: number; size?: number }) =>
    api.get<ApiResponse<{ content: OrderSummary[]; totalPages: number; totalElements: number }>>('/orders/list', { params: { size: 20, ...params } }),

  staffSummary: (params: { createdBy: string; from: string; to: string }) =>
    api.get<ApiResponse<{
      totalRevenue: number; orderCount: number; avgOrderValue: number;
      completedCount: number; cancelledCount: number;
    }>>('/orders/by-staff/summary', { params }),

  staffChart: (params: { createdBy: string; from: string; to: string; granularity: 'hour' | 'day' | 'week' | 'month' | 'year' }) =>
    api.get<ApiResponse<{ label: string; value: number }[]>>('/orders/by-staff/chart', { params }),

  staffOrders: (params: { createdBy: string; status?: string; from?: string; to?: string; page?: number; size?: number }) =>
    api.get<ApiResponse<{ content: OrderSummary[]; totalPages: number; totalElements: number }>>('/orders/by-staff', { params: { size: 10, ...params } }),

  workItems: (params?: { page?: number; size?: number }) =>
    api.get<ApiResponse<{ content: WorkItemDTO[]; totalPages: number }>>('/orders/work-items', { params: { size: 20, ...params } }),

  pendingWorkItems: (params?: { page?: number; size?: number }) =>
    api.get<ApiResponse<{ content: WorkItemDTO[]; totalPages: number }>>('/orders/work-items/pending', { params: { size: 20, ...params } }),

  availableWorkItems: (params?: { page?: number; size?: number }) =>
    api.get<ApiResponse<{ content: WorkItemDTO[]; totalPages: number }>>('/orders/work-items/available', { params: { size: 20, ...params } }),

  pickupWorkItem: (itemId: number) =>
    api.put<ApiResponse<WorkItemDTO>>(`/orders/work-items/${itemId}/pickup`),

  unpickWorkItem: (itemId: number) =>
    api.put<ApiResponse<WorkItemDTO>>(`/orders/work-items/${itemId}/unpick`),

  startWorkItem: (itemId: number) =>
    api.put<ApiResponse<WorkItemDTO>>(`/orders/work-items/${itemId}/start`),

  completeWorkItem: (itemId: number) =>
    api.put<ApiResponse<WorkItemDTO>>(`/orders/work-items/${itemId}/complete`),

  releaseWorkItem: (itemId: number) =>
    api.put<ApiResponse<WorkItemDTO>>(`/orders/work-items/${itemId}/release`),

  completedWorkItems: (params?: { filterType?: string; day?: number; month?: number; year?: number; keyword?: string; page?: number; size?: number }) =>
    api.get<ApiResponse<{ content: WorkItemDTO[]; totalPages: number }>>('/orders/work-items/completed', { params: { size: 20, ...params } }),

  workItemSummary: (params?: { filterType?: string; day?: number; month?: number; year?: number }) =>
    api.get<ApiResponse<WorkItemSummaryDTO>>('/orders/work-items/summary', { params }),

  workItemTrend: (params?: { filterType?: string; day?: number; month?: number; year?: number }) =>
    api.get<ApiResponse<{ label: string; count: number; revenue: number }[]>>('/orders/work-items/trend', { params }),

  addItem: (orderId: string, req: { productId: string; quantity: number; employeeId?: string; note?: string }) =>
    api.post<ApiResponse<OrderItemDetail>>(`/orders/${orderId}/items`, req),

  updateItemNote: (orderId: string, itemId: number, note: string | null) =>
    api.patch<ApiResponse<OrderItemDetail>>(`/orders/${orderId}/items/${itemId}/note`, { note: note ?? null }),

  removeItem: (orderId: string, itemId: number) =>
    api.delete<ApiResponse<null>>(`/orders/${orderId}/items/${itemId}`),

  updateItemQuantity: (orderId: string, itemId: number, quantity: number) =>
    api.patch<ApiResponse<OrderItemDetail>>(`/orders/${orderId}/items/${itemId}/quantity`, { quantity }),

  updateItemEmployee: (orderId: string, itemId: number, employeeId: string | null) =>
    api.patch<ApiResponse<OrderItemDetail>>(`/orders/${orderId}/items/${itemId}/employee`, { employeeId: employeeId ? Number(employeeId) : null }),

  updateMeta: (orderId: string, req: { tip?: number; customerId?: string | null; clearCustomer?: boolean; paymentMethod?: string }) =>
    api.patch<ApiResponse<OrderDetail>>(`/orders/${orderId}/meta`, req),

  payAndComplete: (orderId: string, req: { paymentMethod: string; amountPaid?: number }) =>
    api.put<ApiResponse<OrderDetail>>(`/orders/${orderId}/pay-and-complete`, req),

  getReceipt: (id: string) =>
    api.get<string>(`/orders/${id}/receipt`, { responseType: 'text' }),
};

// ── Kitchen API ───────────────────────────────────────────────────────────────

export type KitchenOrderItem = {
  id: number;
  productName: string;
  quantity: number;
  note?: string | null;
  itemStatus: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  durationMinutes?: number | null;
};

export type KitchenOrder = {
  id: string;
  orderNumber: string;
  tableLabel: string | null;
  createdAt: string;
  items: KitchenOrderItem[];
  /** ISO datetime string — set for takeaway orders, null for dine-in. */
  pickupTime?: string | null;
};

export const kitchenApi = {
  getOrders: () =>
    api.get<ApiResponse<KitchenOrder[]>>('/orders/kitchen'),

  bumpItem: (itemId: number) =>
    api.patch<ApiResponse<KitchenOrderItem>>(`/orders/kitchen/items/${itemId}/bump`),
};

// ── App version API ───────────────────────────────────────────────────────────

export const appApi = {
  getVersion: () =>
    api.get<ApiResponse<{ minVersion: string; latestVersion: string }>>('/app/version'),

  // Public version check — uses a plain axios instance (no auth interceptor) so a
  // 401 or missing endpoint never blocks startup.
  getVersionPublic: () =>
    axios.get<ApiResponse<{ minVersion: string; latestVersion: string }>>(
      `${BASE_URL}/app/version`,
      { timeout: 5_000 },
    ),
};

// ── Tenant / shop API ─────────────────────────────────────────────────────────

export type ShopStatus = 'ACTIVE' | 'SUSPENDED' | 'NOT_FOUND';

export type ShopType = {
  code: string;
  name: string;
  emoji: string;
  tenantPrefix: string;
  features: string[];
};

export type ProductTemplate = {
  id: string;
  name: string;
  nameEn?: string;
  emoji: string;
  price: number;
  unit: string;
  dynamicPrice: boolean;
  durationMinutes: number;
  categoryName: string | null;
};

export type ExpenseSuggestion = {
  name: string;
  nameEn?: string;
  emoji: string;
  color?: string;
  category?: string;
};

export const tenantApi = {
  checkStatus: (shopId: string) =>
    api.get<ApiResponse<{ shopId: string; shopName: string; status: ShopStatus }>>(
      `/tenants/${shopId}/status`,
    ),

  getShopTypes: () => api.get<ApiResponse<ShopType[]>>('/shop-types'),

  getProductTemplates: (shopTypeCode: string) =>
    api.get<ApiResponse<ProductTemplate[]>>('/product-templates', {
      params: { shopTypeCode },
    }),

  getExpenseSuggestions: (shopTypeCode: string) =>
    api.get<ApiResponse<ExpenseSuggestion[]>>('/expense-suggestions', {
      params: { shopTypeCode },
    }),

  selfProvision: (payload: {
    shopTypeCode: string;
    shopName: string;
    address: string;
    nickname: string;
    fullName: string;
    products: { templateId: string; name: string; price: number; unit: string; dynamicPrice: boolean }[];
    expenses: { name: string; monthlyAmount: number; category?: string; expenseType?: string; paymentDate?: number; note?: string }[];
    tables?: { tableNumber: string; capacity: number; location?: string }[];
    hasPawnFeature?: boolean;
    pawnTypes?: string[];
    pawnInterestRate?: string;
    pawnCalcMode?: string;
    pawnDueDate?: string;
    refreshInBody?: boolean;
  }) =>
    api.post<ApiResponse<{ accessToken: string; refreshToken?: string; tenantId: string; setupComplete: boolean }>>('/tenants/self-provision', payload),
};

// ── Auth additional endpoints ─────────────────────────────────────────────────

export const authExtApi = {
  register: (phone: string, password: string) =>
    api.post<ApiResponse<{ accessToken: string; refreshToken?: string; setupComplete?: boolean }>>('/auth/register', {
      phone,
      password,
      refreshInBody: true,
    }),

  requestPasswordReset: (phone: string) =>
    api.post<ApiResponse<{ maskedPhone: string }>>('/auth/password-reset/request', { phone }),

  verifyOtp: (phone: string, otp: string) =>
    api.post<ApiResponse<{ resetToken: string }>>('/auth/password-reset/verify', { phone, otp }),

  resetPassword: (resetToken: string, newPassword: string) =>
    api.post<ApiResponse<null>>('/auth/password-reset/reset', { resetToken, newPassword }),
};

// ── Subscription API ──────────────────────────────────────────────────────────

export type SubscriptionData = {
  plan: string;
  planDisplayName: string;
  status: 'ACTIVE' | 'EXPIRED' | 'SUSPENDED';
  startedAt: string;
  expiresAt: string;
  maxUsers: number | null;
  currentUsers: number;
  maxOrdersPerMonth: number | null;
  currentMonthOrders: number;
  pricePerMonth: number;
  features: string[];
};

export const subscriptionApi = {
  getCurrent: () => api.get<ApiResponse<SubscriptionData>>('/subscriptions/current'),
};

// ── Dashboard extended API ────────────────────────────────────────────────────

export const dashboardApi = {
  // Backend returns DashboardSummaryDTO directly (no ApiResponse wrapper)
  getKpi: (_preset: KpiPreset) =>
    api.get<KpiData>('/dashboard/summary'),
};

// ── Expense API ───────────────────────────────────────────────────────────────

export type ExpenseData = {
  id: string;
  amount: number;
  category: string;
  categoryDisplayName?: string;
  description: string;
  expenseDate: string; // YYYY-MM-DD
  paymentMethod?: string | null;
  referenceNumber?: string | null;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type ExpenseRequest = {
  amount: number;
  category: string;
  description: string;
  expenseDate: string;
  paymentMethod?: string | null;
  referenceNumber?: string | null;
};

export type DefaultExpense = {
  id: string;
  description: string;
  amount: number;
  category: string;
  categoryDisplayName: string;
  paymentDay: number | null;
  displayOrder: number;
};

export const expenseApi = {
  list: (params: {
    from?: string;
    to?: string;
    category?: string;
    page?: number;
    size?: number;
  }) =>
    api.get<ApiResponse<{ content: ExpenseData[]; totalPages: number; totalElements: number }>>(
      '/expenses',
      { params: { size: 30, ...params } },
    ),

  create: (data: ExpenseRequest) =>
    api.post<ApiResponse<ExpenseData>>('/expenses', data),

  update: (id: string, data: ExpenseRequest) =>
    api.put<ApiResponse<ExpenseData>>(`/expenses/${id}`, data),

  delete: (id: string) => api.delete<ApiResponse<null>>(`/expenses/${id}`),

  summary: (params: { from: string; to: string; type?: string }) =>
    api.get<ApiResponse<{
      total: number;
      fixed: number;
      variable: number;
      netVsRevenue: number;
    }>>('/expenses/summary', { params }),

  chart: (params: { from: string; to: string; granularity: 'hour' | 'day' | 'week' | 'month' | 'year' }) =>
    api.get<ApiResponse<{ label: string; value: number }[]>>('/expenses/chart', { params }),

  getDefaults: () => api.get<ApiResponse<DefaultExpense[]>>('/expenses/defaults'),

  createDefault: (data: { description: string; amount: number; category?: string; paymentDay?: number | null }) =>
    api.post<ApiResponse<DefaultExpense>>('/expenses/defaults', data),

  updateDefault: (id: string, data: { description?: string; amount?: number; category?: string; paymentDay?: number | null }) =>
    api.put<ApiResponse<DefaultExpense>>(`/expenses/defaults/${id}`, data),

  deleteDefault: (id: string) => api.delete<ApiResponse<null>>(`/expenses/defaults/${id}`),

  cloneDefaults: (month: string, ids?: string[]) =>
    api.post<ApiResponse<ExpenseData[]>>('/expenses/clone-defaults', { month, ids: ids ?? null }),

  /** Date-range expense-category breakdown */
  categoryBreakdown: (from: string, to: string) =>
    api.get<ApiResponse<ExpenseCategoryBreakdownItem[]>>('/expenses/category-breakdown/range', { params: { from, to } }),
};

// ── Revenue analytics API ─────────────────────────────────────────────────────

export type PaymentBreakdownItem = {
  paymentMethod: string;
  orderCount: number;
  totalAmount: number;
  percentage: number;
};

export type CategoryRevenueItem = {
  categoryName: string;
  orderCount: number;
  revenue: number;
  percentage: number;
};

export type ExpenseCategoryBreakdownItem = {
  category: string;
  categoryDisplayName: string;
  total: number;
  percentage: number;
};

export const revenueApi = {
  /** Payment method breakdown for a date range */
  paymentBreakdown: (from: string, to: string) =>
    api.get<ApiResponse<PaymentBreakdownItem[]>>('/revenue/payment-methods/range', { params: { from, to } }),

  /** Revenue by product category for a date range */
  categoryBreakdown: (from: string, to: string) =>
    api.get<ApiResponse<CategoryRevenueItem[]>>('/revenue/categories/range', { params: { from, to } }),
};

// ── Customer API ──────────────────────────────────────────────────────────────

export type CustomerData = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  gender: 'MALE' | 'FEMALE' | 'OTHER' | null;
  dateOfBirth: string | null;
  birthday: string | null;
  zaloId: string | null;
  facebookId: string | null;
  hairType: string | null;
  preferredServices: string | null;
  allergiesOrSensitivities: string | null;
  specialRequests: string | null;
  notes: string | null;
  note: string | null;
  idCardNumber: string | null;
  idCardFullName: string | null;
  idCardSex: string | null;
  idCardNationality: string | null;
  idCardPlaceOfOrigin: string | null;
  idCardPlaceOfResidence: string | null;
  idCardDateOfBirth: string | null;
  idCardIssuedDate: string | null;
  idCardIssuedPlace: string | null;
  permanentAddress: string | null;
  totalOrders: number;
  totalSpend: number;
  points: number;
  createdAt: string;
  walkIn?: boolean;
  avatarUrl: string | null;
};

export type CustomerFormPayload = {
  name: string;
  phone?: string;
  email?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  dateOfBirth?: string;
  zaloId?: string;
  facebookId?: string;
  hairType?: string;
  preferredServices?: string;
  allergiesOrSensitivities?: string;
  specialRequests?: string;
  notes?: string;
  idCardNumber?: string;
  idCardFullName?: string;
  idCardSex?: string;
  idCardNationality?: string;
  idCardPlaceOfOrigin?: string;
  idCardPlaceOfResidence?: string;
  idCardDateOfBirth?: string;
  idCardIssuedDate?: string;
  idCardIssuedPlace?: string;
  permanentAddress?: string;
};

export const customerApi = {
  list: (params: { search?: string; page?: number; size?: number }) =>
    api.get<ApiResponse<{ content: CustomerData[]; totalPages: number }>>(
      '/customers',
      { params: { size: 30, ...params } },
    ),

  getById: (id: string) => api.get<ApiResponse<CustomerData>>(`/customers/${id}`),

  create: (data: CustomerFormPayload) =>
    api.post<ApiResponse<CustomerData>>('/customers', data),

  update: (id: string, data: Partial<CustomerFormPayload>) =>
    api.put<ApiResponse<CustomerData>>(`/customers/${id}`, data),

  checkPhone: (phone: string) =>
    api.get<ApiResponse<CustomerData | null>>('/customers/check-phone', { params: { phone } }),

  delete: (id: string) => api.delete<ApiResponse<null>>(`/customers/${id}`),

  recent: (limit = 5) =>
    api.get<ApiResponse<CustomerData[]>>('/customers/recent', { params: { limit } }),

  /** Customers whose birthday falls in the current calendar month, sorted by day-of-month. */
  birthdaysThisMonth: () =>
    api.get<ApiResponse<CustomerData[]>>('/customers/birthdays/this-month'),

  orders: (id: string, page = 0, size = 15) =>
    api.get<ApiResponse<{ content: OrderSummary[]; totalPages: number; totalElements: number }>>(
      `/customers/${id}/orders`,
      { params: { page, size, sort: 'createdAt,desc' } },
    ),

  orderSummary: (id: string, from: string, to: string) =>
    api.get<ApiResponse<{
      totalRevenue: number;
      orderCount: number;
      completedCount: number;
      avgOrderValue: number;
      lastVisitDate: string | null;
      daysSinceLastVisit: number;
      favoriteService: string | null;
    }>>(
      `/customers/${id}/orders/summary`,
      { params: { from, to } },
    ),

  orderChart: (id: string, from: string, to: string, granularity: 'hour' | 'day' | 'week' | 'month' | 'year') =>
    api.get<ApiResponse<{ label: string; value: number }[]>>(
      `/customers/${id}/orders/chart`,
      { params: { from, to, granularity } },
    ),

  // ── List analytics ──────────────────────────────────────────────────────────

  analyticsSummary: (from: string, to: string) =>
    api.get<ApiResponse<{
      totalCustomers: number;
      activeCustomers: number;
      newCustomers: number;
      totalRevenue: number;
      avgSpend: number;
    }>>('/customers/analytics/summary', { params: { from, to } }),

  analyticsTrend: (from: string, to: string, granularity: string, metric: 'revenue' | 'visits' | 'new') =>
    api.get<ApiResponse<{ label: string; value: number }[]>>(
      '/customers/analytics/trend',
      { params: { from, to, granularity, metric } },
    ),

  analyticsRanking: (params: { limit?: number; allTime?: boolean; from?: string; to?: string }) =>
    api.get<ApiResponse<{ name: string; orderCount: number; totalSpend: number; customerId: string | null }[]>>(
      '/customers/analytics/ranking',
      { params: { limit: 10, ...params } },
    ),

  uploadAvatar: (id: string, uri: string) => {
    const formData = new FormData();
    const filename = uri.split('/').pop() ?? 'avatar.jpg';
    const ext = filename.split('.').pop()?.toLowerCase() ?? 'jpg';
    const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
    formData.append('file', { uri, type: mime, name: filename } as unknown as Blob);
    return api.post<ApiResponse<CustomerData>>(`/customers/${id}/avatar`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  deleteAvatar: (id: string) =>
    api.delete<ApiResponse<CustomerData>>(`/customers/${id}/avatar`),
};

// ── Shop config API ───────────────────────────────────────────────────────────

export type BankAccount = {
  id: number;
  bankBin: string | null;
  bankCode: string;
  bankName: string;
  bankShortName: string | null;
  accountNumber: string;
  accountName: string;
  isDefault: boolean;
};

export type ShopInfo = {
  shopName: string;
  address: string | null;
  phone: string | null;
  description: string | null;
  logoUrl: string | null;
  shopTypeCode: string | null;
  posMode: string | null;
  defaultTaxRate: number | null;
  taxAutoApply: boolean | null;
  cashDenominations: string | null;
};

export type PosConfig = {
  posMode: string | null;
  autoPrint: boolean;
  vatEnabled: boolean;
  cashDenominations: string | null;
  quickPhrases: string[];
};

// ── Shop config ───────────────────────────────────────────────────────────────

export const shopConfigApi = {
  getInfo: () => api.get<ApiResponse<ShopInfo>>('/shop-config'),

  updateInfo: (data: { shopName?: string; address?: string; phone?: string; description?: string }) =>
    api.put<ApiResponse<ShopInfo>>('/shop-config', data),

  getPosConfig: () => api.get<ApiResponse<PosConfig>>('/shop-config/pos-config'),

  updatePosConfig: (data: Partial<PosConfig>) =>
    api.put<ApiResponse<PosConfig>>('/shop-config/pos-config', data),

  getBanks: () => api.get<ApiResponse<BankAccount[]>>('/bank-accounts'),

  addBank: (data: { bankCode: string; bankName: string; accountNumber: string; accountName: string; bankBin?: string | null; bankShortName?: string | null }) =>
    api.post<ApiResponse<BankAccount>>('/bank-accounts', data),

  updateBank: (id: number, data: { bankCode?: string; bankName?: string; accountNumber?: string; accountName?: string }) =>
    api.put<ApiResponse<BankAccount>>(`/bank-accounts/${id}`, data),

  deleteBank: (id: number) => api.delete<ApiResponse<null>>(`/bank-accounts/${id}`),

  setDefaultBank: (id: number) => api.put<ApiResponse<null>>(`/bank-accounts/${id}/default`),

  getLoyalty: () =>
    api.get<ApiResponse<{ pointsPerUnit: number; unitValue: number }>>('/shop-config/loyalty'),

  uploadLogo: (formData: FormData) =>
    api.put<ApiResponse<{ logoUrl: string }>>('/shop-config/logo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

// ── Shop Info / E-Invoice API ─────────────────────────────────────────────────

export type EInvoiceVendor = 'SINVOICE' | 'BKAV' | 'MISA';

/** Fields returned by GET /shop-info relevant to e-invoice setup. */
export type EInvoiceConfig = {
  invoiceVendor: EInvoiceVendor | null;
  eInvoiceUsername: string | null;
  /** Never returned by the server (encrypted at rest) */
  eInvoicePassword: null;
  /** Never returned by the server (encrypted at rest) */
  eInvoiceKey: null;
  templateCode: string | null;
  invoiceSeries: string | null;
  /** Backend env-var — returned for info only, not user-editable */
  invoiceSystem: string | null;
};

export type FullShopInfo = EInvoiceConfig & {
  shopName: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  supplierTaxCode: string | null;
  companyName: string | null;
  defaultTaxRate: number | null;
};

export type InvoiceData = {
  id: number;
  invoiceNumber: string | null;
  status: string;
  invoiceVendor: string | null;
  totalAmount: number;
  createdAt: string;
};

export const shopInfoApi = {
  /** GET /shop-info — returns full shop info including e-invoice non-sensitive fields */
  get: () => api.get<ApiResponse<FullShopInfo>>('/shop-info'),

  /** PUT /shop-info — updates any subset of shop info, including e-invoice credentials */
  saveEInvoiceConfig: (data: {
    invoiceVendor?: string | null;
    eInvoiceUsername?: string;
    eInvoicePassword?: string;
    eInvoiceKey?: string;
    templateCode?: string;
    invoiceSeries?: string;
    // invoiceSystem is a backend env-var — never sent from the client
  }) => api.put<ApiResponse<FullShopInfo>>('/shop-info', data),
};

export const invoiceApi = {
  /** GET /invoices/order/{orderId} — check if an invoice already exists for this order */
  getByOrderId: (orderId: string) =>
    api.get<ApiResponse<InvoiceData>>(`/invoices/order/${orderId}`),

  /** POST /invoices — create a new invoice from a single order (minimal body; server fills defaults) */
  createFromOrder: (orderId: string) =>
    api.post<ApiResponse<InvoiceData>>('/invoices', {
      orderIds: [Number(orderId)],
      currencyCode: 'VND',
      taxPercentage: 0,
    }),

  /** PUT /invoices/{id}/issue — transmit the invoice to the external provider */
  issueInvoice: (invoiceId: number) =>
    api.put<ApiResponse<InvoiceData>>(`/invoices/${invoiceId}/issue`),
};

// ── Category API ──────────────────────────────────────────────────────────────

export const categoryApi = {
  list: () => api.get<ApiResponse<CategoryData[]>>('/categories'),

  create: (data: { name: string; emoji: string }) =>
    api.post<ApiResponse<CategoryData>>('/categories', data),

  update: (id: string, data: { name: string; emoji: string }) =>
    api.put<ApiResponse<CategoryData>>(`/categories/${id}`, data),

  delete: (id: string) => api.delete<ApiResponse<null>>(`/categories/${id}`),
};

// ── Product extended API ──────────────────────────────────────────────────────

export const productExtApi = {
  list: (params: { page?: number; size?: number; categoryId?: string; search?: string }) =>
    api.get<ApiResponse<{ content: ProductData[]; totalPages: number; totalElements: number }>>(
      '/products',
      { params: { page: 0, size: 30, ...params } },
    ),

  getById: (id: string) => api.get<ApiResponse<ProductData>>(`/products/${id}`),

  setVisibility: (id: string, active: boolean) =>
    api.patch<ApiResponse<null>>(`/products/${id}/visibility`, { active }),
};

// ── Combo API ─────────────────────────────────────────────────────────────────

export type ComboItem = { productId: string; productName: string; quantity: number; price: number };

export type ComboData = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  active: boolean;
  items: ComboItem[];
  totalIndividualPrice: number;
};

export type ComboAnalyticsSummary = {
  totalSold: number;
  totalRevenue: number;
  activeCount: number;
  avgOrderValue: number;
};

export type ComboRankingItem = {
  comboId: string;
  comboName: string;
  qtySold: number;
  revenue: number;
  orderCount: number;
};

export type ComboTrendPoint = {
  label: string;
  qtySold: number;
  revenue: number;
};

export type ComboAnalytics = {
  summary: ComboAnalyticsSummary;
  ranking: ComboRankingItem[];
  trend: ComboTrendPoint[];
};

export const comboApi = {
  list: (active?: boolean) =>
    api.get<ApiResponse<ComboData[]>>('/combos', {
      params: active !== undefined ? { active } : undefined,
    }),

  create: (data: Omit<ComboData, 'id' | 'totalIndividualPrice'>) =>
    api.post<ApiResponse<ComboData>>('/combos', data),

  update: (id: string, data: Partial<Omit<ComboData, 'id' | 'totalIndividualPrice'>>) =>
    api.put<ApiResponse<ComboData>>(`/combos/${id}`, data),

  delete: (id: string) => api.delete<ApiResponse<null>>(`/combos/${id}`),

  analytics: (params: { from: string; to: string; granularity?: string; limit?: number }) =>
    api.get<ApiResponse<ComboAnalytics>>('/combos/analytics', { params }),
};

// ── Inventory API ─────────────────────────────────────────────────────────────

export type InventoryItem = {
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  lowStockThreshold: number | null;
};

export const inventoryApi = {
  list: (params?: { status?: 'low' | 'out' }) =>
    api.get<ApiResponse<InventoryItem[]>>('/inventory', { params }),

  adjust: (productId: string, quantity: number, reason: string, note?: string) =>
    api.post<ApiResponse<InventoryItem>>('/inventory/adjust', { productId, quantity, reason, note }),
};

// ── Notification API ──────────────────────────────────────────────────────────

export type NotificationData = {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  linkTo?: string;
};

export const notificationApi = {
  list: (params?: { page?: number; unreadOnly?: boolean }) =>
    api.get<ApiResponse<{ content: NotificationData[]; totalUnread: number; totalPages: number }>>(
      '/notifications',
      { params },
    ),

  getUnreadCount: () =>
    api.get<ApiResponse<{ count: number }>>('/notifications/unread-count'),

  markRead: (id: string) => api.put<ApiResponse<null>>(`/notifications/${id}/read`),

  markAllRead: () => api.put<ApiResponse<null>>('/notifications/read-all'),

  getPreferences: () =>
    api.get<ApiResponse<Record<string, boolean>>>('/notifications/preferences'),

  updatePreferences: (prefs: Record<string, boolean>) =>
    api.put<ApiResponse<null>>('/notifications/preferences', prefs),
};

// ── Activity log API ──────────────────────────────────────────────────────────

export type ActivityLogEntry = {
  id: number;
  actorUsername: string;
  actorFullName: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  description: string;
  ipAddress: string | null;
  createdAt: string;
};

export const activityLogApi = {
  list: (params?: { page?: number; targetType?: string; from?: string; to?: string }) =>
    api.get<ApiResponse<{ content: ActivityLogEntry[]; totalPages: number }>>(
      '/activity-logs',
      { params: { size: 30, ...params } },
    ),

  logEvent: (action: string, description: string) =>
    api.post<ApiResponse<null>>('/activity-logs/event', { action, description }),
};

// ── Gold price API ────────────────────────────────────────────────────────────

export type GoldPrice = {
  date: string;
  buyPrice: number;
  sellPrice: number;
  note: string | null;
};

export const goldPriceApi = {
  getCurrent: () => api.get<ApiResponse<GoldPrice>>('/gold-prices/current'),

  getHistory: (days = 30) =>
    api.get<ApiResponse<GoldPrice[]>>('/gold-prices/history', { params: { days } }),

  create: (data: GoldPrice) => api.post<ApiResponse<GoldPrice>>('/gold-prices', data),
};

// ── Utilities API ─────────────────────────────────────────────────────────────

export type ExchangeRateItem = {
  currencyCode: string;
  buyRate: number | null;
  transferRate: number | null;
  sellRate: number | null;
  fetchedAt: string | null;
};

export type ExchangeRatesData = {
  source: string;
  fetchedAt: string | null;
  rates: ExchangeRateItem[];
};

export type MarketGoldPriceItem = {
  ktype: string;
  name: string;
  source: string;
  buyPrice: number | null;
  sellPrice: number | null;
  fetchedAt: string | null;
};

export type MarketGoldPricesData = {
  source: string;
  fetchedAt: string | null;
  prices: MarketGoldPriceItem[];
};

export const utilitiesApi = {
  getExchangeRates: () => api.get<ApiResponse<ExchangeRatesData>>('/utilities/exchange-rates'),
  getExchangeRateHistory: (currency: string, days = 7) =>
    api.get<ApiResponse<ExchangeRateItem[]>>('/utilities/exchange-rates/history', {
      params: { currency, days },
    }),
  getMarketGoldPrices: (source?: string) =>
    api.get<ApiResponse<MarketGoldPricesData>>('/utilities/market-gold-prices', {
      params: { source },
    }),
  getMarketGoldPricesHistory: (source?: string, ktype?: string, days = 7) =>
    api.get<ApiResponse<MarketGoldPriceItem[]>>('/utilities/market-gold-prices/history', {
      params: { source, ktype, days },
    }),
};

// ── Shop user (staff) API ─────────────────────────────────────────────────────

export type ShopUserRole = {
  id: number;
  name: string;
  description: string | null;
};

export type ShopUser = {
  id: string;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
  roles: ShopUserRole[];
  active: boolean;
  accountNonLocked: boolean;
  createdAt: string;
  /** Per-user feature overrides. Non-null = user has custom features; null = uses role defaults. */
  userFeatureNames: string[] | null;
};

export type CreateStaffPayload = {
  username: string;
  password: string;
  fullName: string;
  roleNames: string[];
  /**
   * Per-user feature overrides. When provided, these features are used in the JWT
   * instead of the role-based features (intersected with tenant features).
   * Omit to use role defaults.
   */
  featureNames?: string[];
};

export type UpdateStaffPayload = {
  fullName?: string;
  roleNames?: string[];
  /**
   * Per-user feature overrides.
   * null / undefined = no-op (keep existing).
   * [] = clear overrides (revert to role defaults).
   * [...] = set new override set.
   */
  featureNames?: string[] | null;
};

export const shopUserApi = {
  list: () =>
    api.get<ApiResponse<{ content: ShopUser[]; totalElements: number }>>('/users'),

  getById: (id: string) =>
    api.get<ApiResponse<ShopUser>>(`/users/${id}`),

  create: (data: CreateStaffPayload) =>
    api.post<ApiResponse<ShopUser>>('/users', data),

  update: (id: string, data: UpdateStaffPayload) =>
    api.put<ApiResponse<ShopUser>>(`/users/${id}`, data),

  toggleEnable: (id: string, enable: boolean) =>
    api.put<ApiResponse<null>>(`/users/${id}/enable`, null, { params: { enabled: enable } }),

  resetPassword: (id: string) =>
    api.post<ApiResponse<{ tempPassword: string }>>(`/users/${id}/reset-password`),

  /** Get all feature names the current tenant has subscribed to. Used for the feature-assignment matrix. */
  tenantFeatures: () =>
    api.get<ApiResponse<string[]>>('/users/tenant-features'),
};

// ── Legal API ─────────────────────────────────────────────────────────────────

export const legalApi = {
  getTnC: () =>
    api.get<ApiResponse<{ version: string; content: string; updatedAt: string }>>('/legal/tnc'),
};

// ── Feedback API ──────────────────────────────────────────────────────────────

export type FeedbackData = {
  id: string;
  category: 'BUG' | 'IDEA' | 'FEATURE' | 'OTHER';
  content: string;
  status: 'RECEIVED' | 'PROCESSING' | 'RESOLVED';
  createdAt: string;
};

export const feedbackApi = {
  submit: (data: { category: string; content: string }) =>
    api.post<FeedbackData>('/feedback', data),

  getMy: (page = 0, size = 50) =>
    api.get<{ content: FeedbackData[]; totalElements: number }>('/feedback/my', { params: { page, size } }),
};

// ── Print template API ────────────────────────────────────────────────────────

export type PrintTemplate = {
  id: string;
  name: string;
  type: string;
  isDefault: boolean;
  config: Record<string, unknown>;
  updatedAt: string;
};

export const printTemplateApi = {
  list: () => api.get<ApiResponse<PrintTemplate[]>>('/shop-config/print-templates'),

  getById: (id: string) => api.get<ApiResponse<PrintTemplate>>(`/shop-config/print-templates/${id}`),

  create: (data: Omit<PrintTemplate, 'id' | 'updatedAt'>) =>
    api.post<ApiResponse<PrintTemplate>>('/shop-config/print-templates', data),

  update: (id: string, data: Partial<Omit<PrintTemplate, 'id' | 'updatedAt'>>) =>
    api.put<ApiResponse<PrintTemplate>>(`/shop-config/print-templates/${id}`, data),

  delete: (id: string) => api.delete<ApiResponse<null>>(`/shop-config/print-templates/${id}`),

  setDefault: (id: string) =>
    api.put<ApiResponse<null>>(`/shop-config/print-templates/${id}/default`),
};

// ── Zalo message templates ────────────────────────────────────────────────────

export type ZaloMessageTemplate = {
  id: number;
  name: string;
  templateType: string;
  templateId: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SaveZaloMessageTemplateRequest = {
  name: string;
  templateId: string;
};

export const zaloTemplateApi = {
  list: (type = 'APPOINTMENT_REMINDER') =>
    api.get<ApiResponse<ZaloMessageTemplate[]>>('/shop-config/zalo-templates', { params: { type } }),

  getById: (id: number) =>
    api.get<ApiResponse<ZaloMessageTemplate>>(`/shop-config/zalo-templates/${id}`),

  create: (data: SaveZaloMessageTemplateRequest, type = 'APPOINTMENT_REMINDER') =>
    api.post<ApiResponse<ZaloMessageTemplate>>('/shop-config/zalo-templates', data, { params: { type } }),

  update: (id: number, data: SaveZaloMessageTemplateRequest) =>
    api.put<ApiResponse<ZaloMessageTemplate>>(`/shop-config/zalo-templates/${id}`, data),

  setDefault: (id: number, type = 'APPOINTMENT_REMINDER') =>
    api.put<ApiResponse<ZaloMessageTemplate>>(`/shop-config/zalo-templates/${id}/default`, {}, { params: { type } }),

  delete: (id: number) =>
    api.delete<ApiResponse<void>>(`/shop-config/zalo-templates/${id}`),
};

// ── Zalo OA API ───────────────────────────────────────────────────────────────

export type ZaloOaStatus = {
  connected: boolean;
  appId?: string;
  oaName?: string;      // display name of the OA, e.g. "Tiệm Cà Phê ABC"
  oaId?: string;        // Zalo OA page ID
  tokenExpiry?: string; // ISO datetime string
};

export const zaloOaApi = {
  getStatus: () =>
    api.get<ApiResponse<ZaloOaStatus>>('/shop-config/zalo-oa'),

  connect: (data: ({ appId: string; appSecret: string } | { accessToken: string }) & { oaName: string; oaId?: string }) =>
    api.post<ApiResponse<ZaloOaStatus>>('/shop-config/zalo-oa', data),

  disconnect: () =>
    api.delete<ApiResponse<void>>('/shop-config/zalo-oa'),
};

// ── Loyalty API ───────────────────────────────────────────────────────────────

export type SaveLoyaltyProgramRequest = {
  pointsPerAmount: number;
  amountPerPoints: number;
  redemptionPointsPerDiscount: number;
  redemptionDiscountAmount: number;
  minRedemptionPoints: number;
  isActive: boolean;
};

export type SaveLoyaltyTierRequest = {
  name: string;
  minSpend: number;
  pointsMultiplier: number;
  color: string;
  description?: string;
  sortOrder: number;
};

export const loyaltyApi = {
  getProgram: () => api.get<ApiResponse<LoyaltyProgramDTO>>('/loyalty/program'),
  saveProgram: (data: SaveLoyaltyProgramRequest) =>
    api.put<ApiResponse<LoyaltyProgramDTO>>('/loyalty/program', data),
  getTiers: () => api.get<ApiResponse<LoyaltyTierDTO[]>>('/loyalty/tiers'),
  createTier: (data: SaveLoyaltyTierRequest) =>
    api.post<ApiResponse<LoyaltyTierDTO>>('/loyalty/tiers', data),
  updateTier: (id: number, data: SaveLoyaltyTierRequest) =>
    api.put<ApiResponse<LoyaltyTierDTO>>(`/loyalty/tiers/${id}`, data),
  deleteTier: (id: number) => api.delete(`/loyalty/tiers/${id}`),
  getCustomerSummary: (customerId: string) =>
    api.get<ApiResponse<CustomerLoyaltySummaryDTO>>(`/loyalty/customers/${customerId}/summary`),
  getTransactions: (customerId: string, page = 0) =>
    api.get<ApiResponse<{ content: LoyaltyTransactionDTO[]; totalPages: number; totalElements: number }>>(
      `/loyalty/customers/${customerId}/transactions`,
      { params: { page, size: 20 } },
    ),
  adjustPoints: (customerId: string, points: number, description?: string) =>
    api.post<ApiResponse<LoyaltyTransactionDTO>>(`/loyalty/customers/${customerId}/adjust`, {
      points,
      description,
    }),
};

// ── User / profile extended ───────────────────────────────────────────────────

// ── Appointments ─────────────────────────────────────────────────────────────

export type AppointmentServiceItemData = {
  id: number;
  productId: number;
  productName: string;
  unitPrice: number;
  durationMinutes: number;
  assignedEmployeeId: number | null;
  assignedEmployeeName: string | null;
};

export type AppointmentData = {
  id: number;
  appointmentNumber: string;
  customerId: number | null;
  customerName: string;
  customerPhone: string | null;
  scheduledDate: string;       // 'YYYY-MM-DD'
  scheduledStartTime: string;  // 'HH:mm:ss'
  durationMinutes: number;
  status: 'PENDING' | 'CONFIRMED' | 'CHECKED_IN' | 'CANCELLED' | 'NO_SHOW';
  note: string | null;
  linkedOrderId: number | null;
  createdBy: string;
  createdAt: string;
  services: AppointmentServiceItemData[];
  /** Advisory employee-conflict warnings returned by create/update. Empty otherwise. */
  warnings: string[];
};

export type CheckInPayload = {
  appointmentId: number;
  appointmentNumber: string;
  customerId: number | null;
  customerName: string;
  customerPhone: string | null;
  services: AppointmentServiceItemData[];
};

export type AppointmentServiceRequest = {
  productId: number;
  productName: string;
  unitPrice?: number;
  durationMinutes?: number;
  assignedEmployeeId?: number;
  assignedEmployeeName?: string;
};

export type CreateAppointmentPayload = {
  customerId?: number;
  customerName: string;
  customerPhone?: string;
  scheduledDate: string;
  scheduledStartTime: string;
  durationMinutes?: number;
  note?: string;
  services?: AppointmentServiceRequest[];
};

export type UpdateAppointmentPayload = Partial<CreateAppointmentPayload>;

export type AppointmentAnalyticsSummary = {
  total: number;
  completedCount: number;
  completionRate: number; // 0.0–1.0
  cancelledCount: number;
  avgPerDay: number;
};

export type AppointmentTrendPoint = {
  label: string;
  total: number;
  completed: number;
  cancelled: number;
};

export type AppointmentRankItem = {
  name: string;
  count: number;
};

export type AppointmentAnalytics = {
  summary: AppointmentAnalyticsSummary;
  trend: AppointmentTrendPoint[];
  rankingServices: AppointmentRankItem[];
  rankingEmployees: AppointmentRankItem[];
};

export const appointmentApi = {
  list: (date: string, page = 0, size = 50) =>
    api.get<ApiResponse<{ content: AppointmentData[]; totalPages: number; totalElements: number }>>('/appointments', { params: { date, page, size } }),
  getById: (id: number) => api.get<ApiResponse<AppointmentData>>(`/appointments/${id}`),
  create: (data: CreateAppointmentPayload) => api.post<ApiResponse<AppointmentData>>('/appointments', data),
  update: (id: number, data: UpdateAppointmentPayload) => api.put<ApiResponse<AppointmentData>>(`/appointments/${id}`, data),
  confirm: (id: number) => api.put<ApiResponse<AppointmentData>>(`/appointments/${id}/confirm`),
  checkIn: (id: number) => api.post<ApiResponse<CheckInPayload>>(`/appointments/${id}/check-in`),
  cancel: (id: number) => api.put<ApiResponse<AppointmentData>>(`/appointments/${id}/cancel`),
  noShow: (id: number) => api.put<ApiResponse<AppointmentData>>(`/appointments/${id}/no-show`),
  delete: (id: number) => api.delete<ApiResponse<void>>(`/appointments/${id}`),
  /**
   * Returns appointment counts per day for the given date range.
   * Result: { countByDate: { "2026-05-18": 3, "2026-05-20": 1, ... } }
   * Days with zero appointments are omitted from the map.
   */
  weekSummary: (from: string, to: string) =>
    api.get<ApiResponse<{ countByDate: Record<string, number> }>>(
      '/appointments/week-summary', { params: { from, to } }),

  analytics: (params: { from: string; to: string; granularity?: string; limit?: number }) =>
    api.get<ApiResponse<AppointmentAnalytics>>('/appointments/analytics', { params }),
};

export const userApi = {
  getMe: () => api.get<ApiResponse<{
    username: string;
    fullName: string | null;
    nickname: string | null;
    shopName: string | null;
    roles: string[];
    lang: string | null;
  }>>('/profiles/me'),

  updateProfile: (data: { nickname?: string; fullName?: string }) =>
    api.put<ApiResponse<null>>('/profiles/me', data),

  updateLang: (username: string, lang: string) =>
    api.put<ApiResponse<null>>('/profiles/lang', { username, lang }),

  deleteAccount: () => api.delete<ApiResponse<null>>('/users/me'),
};

// ── Pawn API ──────────────────────────────────────────────────────────────────

export type PawnStatus = 'PAWNED' | 'REDEEMED' | 'FORFEITED' | 'CANCELLED';
export type PawnCategory = 'GENERAL' | 'ELECTRONICS' | 'VEHICLE' | 'WATCH' | 'REAL_ESTATE';
export type PawnInterestMode = 'DAILY_30' | 'DAILY_25' | 'MONTHLY' | 'BIWEEKLY';

export type PawnElectronicsDetail = {
  brand?: string; model?: string; serialNumber?: string; storageCapacity?: string;
  color?: string; conditionGrade?: string; accessoriesIncluded?: string;
  warrantyStatus?: string; purchaseYear?: number;
};
export type PawnVehicleDetail = {
  brand?: string; model?: string; engineCc?: number; yearOfManufacture?: number;
  licensePlate?: string; chassisNumber?: string; engineNumber?: string;
  conditionGrade?: string; color?: string;
};
export type PawnWatchDetail = {
  brand?: string; model?: string; serialNumber?: string; conditionGrade?: string;
  movement?: string; caseSize?: number; caseMaterial?: string;
};
export type PawnRealEstateDetail = {
  address?: string; area?: number; propertyType?: string; legalStatus?: string;
  certificateNumber?: string;
};
export type PawnGeneralDetail = {
  description?: string; conditionGrade?: string; brand?: string; model?: string;
};

export type ReqMoneyResponse = {
  pawnId: number; requestId: number; requestDate: string;
  requestAmount: number; interestAmount: number; heldDays: number;
};

export type PawnAudit = {
  actionId: number; actionType: string; actionTime: string;
  pawnStatus: PawnStatus; pawnAmount: number; interestRate: number;
  totalAmount?: number; interestAmount?: number; canceledReason?: string;
  forfeitedReason?: string; forfeitedAmount?: number; forfeitedDate?: string;
  redeemDate?: string; createdBy: string; createdAt: string;
};

export type PawnData = {
  pawnId: number;
  customerId?: number;
  customerName?: string;
  phone?: string;
  itemName: string;
  itemBrand?: string;
  itemType?: string;
  itemDescription?: string;
  itemValue?: number;
  itemWeight?: number;
  gemWeight?: number;
  pawnDate: string;
  pawnDueDate: string;
  pawnAmount: number;
  interestRate: number;
  interestCalcMode?: PawnInterestMode;
  heldDays: number;
  interestAmount?: number;
  mainInterestAmount?: number;
  totalAmount?: number;
  pawnStatus: PawnStatus;
  canceledReason?: string;
  forfeitedReason?: string;
  forfeitedDate?: string;
  forfeitedAmount?: number;
  redeemDate?: string;
  visible?: boolean;
  pawnCategory?: PawnCategory;
  electronicsDetail?: PawnElectronicsDetail;
  vehicleDetail?: PawnVehicleDetail;
  watchDetail?: PawnWatchDetail;
  realEstateDetail?: PawnRealEstateDetail;
  generalDetail?: PawnGeneralDetail;
  reqMoneys?: ReqMoneyResponse[];
  audits?: PawnAudit[];
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type PawnKPIs = {
  totalPawnedCount: number;
  totalPawnedAmount: number;
  dueTodayCount: number;
  dueTodayAmount: number;
  overdueCount: number;
  overdueAmount: number;
  newPawnsCount: number;
  newPawnsAmount: number;
  completedPawnCount: number;
  completedPawnAmount: number;
  forfeitedPawnCount: number;
  forfeitedPawnAmount: number;
  newRequestMoneyCount: number;
  newRequestMoneyAmount: number;
  interestPawnAmount: number;
};

export type PawnSetting = {
  interestRate: number;
  interestType: number; // 30=DAILY_30, 25=DAILY_25, 1=MONTHLY, 15=BIWEEKLY
  dueDate: number;
  /** Comma-separated accepted pawn item type codes, e.g. "GOLD,ELECTRONICS,WATCH" */
  acceptedTypes?: string;
};

export type PawnSearchRequest = {
  pawnStatuses?: PawnStatus[];
  searchWord?: string;
  customerId?: number;
  pawnCategory?: PawnCategory;
};

export type PawnSearchResponse = {
  content: PawnData[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  summary: { totalCount: number; totalWeight: number; totalAmount: number };
};

export type CreatePawnPayload = {
  customerId?: number;
  customerName?: string;
  visitingGuest?: boolean;
  itemName: string;
  itemBrand?: string;
  itemType?: string;
  itemDescription?: string;
  itemWeight?: number;
  gemWeight?: number;
  itemValue?: number;
  pawnDate: string;
  pawnDueDate: string;
  pawnAmount: number;
  interestRate: number;
  interestCalcMode?: PawnInterestMode;
  pawnCategory?: PawnCategory;
  electronicsDetail?: PawnElectronicsDetail;
  vehicleDetail?: PawnVehicleDetail;
  watchDetail?: PawnWatchDetail;
  realEstateDetail?: PawnRealEstateDetail;
  generalDetail?: PawnGeneralDetail;
};

export const pawnApi = {
  search: (req: PawnSearchRequest, page = 0, size = 50) =>
    api.post<ApiResponse<PawnSearchResponse>>(
      '/pawns/find',
      req,
      { params: { page, size, sort: 'pawnDueDate,asc' } },
    ),
  getById: (id: number) => api.get<ApiResponse<PawnData>>(`/pawns/${id}`),
  create: (data: CreatePawnPayload) => api.post<ApiResponse<PawnData>>('/pawns', data),
  update: (id: number, data: Partial<CreatePawnPayload>) =>
    api.put<ApiResponse<PawnData>>(`/pawns/${id}`, data),
  cancel: (id: number, reason: string) =>
    api.patch<ApiResponse<PawnData>>(`/pawns/${id}/cancel`, reason, {
      headers: { 'Content-Type': 'text/plain' },
    }),
  redeem: (id: number, redeemDate: string, interestCalcMode?: PawnInterestMode) =>
    api.post<ApiResponse<PawnData>>(`/pawns/${id}/redeem`, { redeemDate, interestCalcMode }),
  forfeit: (id: number, data: {
    forfeitedDate: string; forfeitedAmount: number;
    forfeitedReason?: string; totalAmount?: number; interestAmount?: number;
  }) => api.post<ApiResponse<PawnData>>(`/pawns/${id}/forfeit`, data),
  extend: (id: number, data: Partial<CreatePawnPayload>) =>
    api.put<ApiResponse<PawnData>>(`/pawns/${id}/extend`, data),
  requestMoney: (id: number, requestDate: string, requestAmount: number) =>
    api.post<ApiResponse<ReqMoneyResponse>>(`/pawns/${id}/request-money`, { requestDate, requestAmount }),
  getKPIs: () =>
    api.post<ApiResponse<PawnKPIs>>('/pawns/kpi-section', {}),
  export: (req: PawnSearchRequest) =>
    api.post('/pawns/export', req, { responseType: 'blob' }),
  setVisible: (id: number, visible: boolean) =>
    api.patch<ApiResponse<number>>(`/pawns/${id}/visible`, { visible }),
  getSettings: () => api.get<ApiResponse<PawnSetting>>('/pawns/settings'),
  saveSettings: (data: PawnSetting) =>
    api.post<ApiResponse<PawnSetting>>('/pawns/settings', data),
};

// ── Table API ─────────────────────────────────────────────────────────────────

export type TableStatus = 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'CLEANING';

export type ShopTable = {
  id: number;
  tableNumber: string;
  capacity: number;
  status: TableStatus;
  currentOrderId?: number;
  currentOrderNumber?: string;
  currentOrderTotal?: number;
  location?: string;
  displayOrder: number;
  elapsedMinutes?: number;
  /** Name of the party who reserved this table (only when status = RESERVED). */
  reservedFor?: string | null;
  /** Human-readable reservation time, e.g. "19:00" (only when status = RESERVED). */
  reservedTime?: string | null;
};

export const tableApi = {
  list: () => api.get<ApiResponse<ShopTable[]>>('/tables'),
  create: (data: { tableNumber: string; capacity: number; location?: string; displayOrder?: number }) =>
    api.post<ApiResponse<ShopTable>>('/tables', data),
  update: (id: number, data: { tableNumber?: string; capacity?: number; location?: string; displayOrder?: number }) =>
    api.put<ApiResponse<ShopTable>>(`/tables/${id}`, data),
  delete: (id: number) => api.delete<ApiResponse<null>>(`/tables/${id}`),
  /** Staff manually sets table status: RESERVED (with name+time), CLEANING, or AVAILABLE. */
  setStatus: (id: number, data: { status: TableStatus; reservedFor?: string; reservedTime?: string }) =>
    api.patch<ApiResponse<ShopTable>>(`/tables/${id}/status`, data),
};

// ── Commission API ────────────────────────────────────────────────────────────

export type CommissionItemDTO = {
  orderItemId: number;
  orderNumber: string;
  productName: string;
  quantity: number;
  amount: number;
  commissionRate: number;
  commissionAmount: number;
  completedAt: string;
};

export type MyCommissionDTO = {
  employeeId: number;
  employeeName: string;
  month: number;
  year: number;
  totalCommission: number;
  itemCount: number;
  items: CommissionItemDTO[];
};

export type EmployeeCommissionDTO = {
  employeeId: number;
  employeeName: string;
  totalCommission: number;
  itemCount: number;
};

export type CommissionReportDTO = {
  month: number;
  year: number;
  totalCommission: number;
  totalItemCount: number;
  employees: EmployeeCommissionDTO[];
};

export const commissionApi = {
  getMyCommission: (month: number, year: number) =>
    api.get<ApiResponse<MyCommissionDTO>>('/commission/me', { params: { month, year } }),

  getReport: (month: number, year: number) =>
    api.get<ApiResponse<CommissionReportDTO>>('/commission/report', { params: { month, year } }),
};

// ── Shop Invitations API ───────────────────────────────────────────────────────

export type InvitationCodeResponse = {
  code: string;
  roleName: string;
  features: string[];
  expiresAt: string;         // ISO-8601
  secondsRemaining: number;
};

export type InvitationPreviewResponse = {
  shopName: string;
  shopType: string;          // e.g. "NAIL_SHOP"
  roleName: string;
  expiresAt: string;         // ISO-8601
  secondsRemaining: number;
};

export type GenerateInvitationRequest = {
  roleName: string;
  features?: string[];
};

export const invitationApi = {
  /** Shop owner generates a 5-min invitation code (requires USER feature, tenant-scoped). */
  generate: (data: GenerateInvitationRequest) =>
    api.post<ApiResponse<InvitationCodeResponse>>('/shop-config/invitations', data),

  /** Preview shop info for a code without accepting (no tenant context needed). */
  preview: (code: string) =>
    api.get<ApiResponse<InvitationPreviewResponse>>('/invitations/preview', { params: { code } }),

  /** Accept an invitation — returns new accessToken + tenantId. */
  join: (code: string) =>
    api.post<ApiResponse<{ accessToken: string; tenantId: string }>>('/invitations/join', { code }),
};

// ── Shop deletion ─────────────────────────────────────────────────────────────

export const shopDeletionApi = {
  /**
   * Permanently soft-delete the authenticated shop owner's shop.
   * Requires USER feature + SHOP_OWNER role (enforced server-side).
   * confirmToken must equal "DELETE" (case-insensitive on server).
   */
  deleteShop: (data: { confirmToken: string; reason?: string }) =>
    api.delete<ApiResponse<null>>('/shop-config/delete-shop', { data }),
};
