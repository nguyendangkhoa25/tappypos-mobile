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
    useNetworkStore.getState().setMaintenance(false);
    return res;
  },
  async (error) => {
    const original = error.config;

    if (error.response?.status === 503) {
      useNetworkStore.getState().setMaintenance(true);
    } else if (error.response) {
      useNetworkStore.getState().setMaintenance(false);
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
  role: string | null;
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
  dateOfBirth: string | null;
  gender: string | null;
  permanentAddress: string | null;
  idCardIssuedDate: string | null;
  idCardIssuedPlace: string | null;
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
  dateOfBirth?: string;
  gender?: string;
  permanentAddress?: string;
  idCardIssuedDate?: string;
  idCardIssuedPlace?: string;
};

export type UpdateEmployeePayload = Partial<CreateEmployeePayload>;

export const employeeApi = {
  listActive: () => api.get<ApiResponse<EmployeeData[]>>('/employees/active'),

  getByUserId: (userId: string | number) =>
    api.get<EmployeeProfile>(`/employees/by-user/${userId}`),

  create: (data: CreateEmployeePayload) =>
    api.post<EmployeeProfile>('/employees', data),

  update: (id: number, data: UpdateEmployeePayload) =>
    api.put<EmployeeProfile>(`/employees/${id}`, data),
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
};

export type CategoryData = {
  id: string;
  name: string;
  emoji: string;
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

  update: (id: string, data: ProductUpdatePayload) =>
    api.put<ApiResponse<ProductData>>(`/products/${id}`, data),

  types: () =>
    api.get<ApiResponse<ProductTypeData[]>>('/products/types/all'),

  suggestSku: (name: string, typeCode: string) =>
    api.get<ApiResponse<string>>('/products/sku/suggest', { params: { name, typeCode } }),

  create: (data: ProductCreatePayload) =>
    api.post<ApiResponse<ProductData>>('/products', data),
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
  customerId?: string;
  notes?: string;
  loyaltyPointsToRedeem?: number;
  tableId?: number | null;
  tableLabel?: string | null;
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

  addItem: (cartId: string, productId: string, quantity: number, unitPrice?: number) =>
    api.post<ApiResponse<CartResponse>>(`/carts/${cartId}/items`, {
      productId,
      quantity,
      ...(unitPrice !== undefined && unitPrice > 0 ? { unitPrice } : {}),
    }),

  updateItem: (cartId: string, cartItemId: string, quantity: number) =>
    api.put<ApiResponse<CartResponse>>(`/carts/${cartId}/items/${cartItemId}`, { newQuantity: quantity }),

  removeItem: (cartId: string, cartItemId: string) =>
    api.delete<ApiResponse<CartResponse>>(`/carts/${cartId}/items/${cartItemId}`),

  applyPromo: (cartId: string, promoCode: string) =>
    api.post<ApiResponse<CartResponse>>(`/carts/${cartId}/promotion`, { promoCode }),

  updateCommission: (cartId: string, itemId: string, employeeId: string) =>
    api.patch<ApiResponse<CartResponse>>(`/carts/${cartId}/items/${itemId}/commission`, {
      assignedEmployeeId: employeeId,
    }),

  checkout: (cartId: string, req: CheckoutRequest) =>
    api.post<ApiResponse<CheckoutResponse>>(`/carts/${cartId}/checkout`, req),

  sendToKitchen: (cartId: string, tableId?: number, tableLabel?: string) =>
    api.post<ApiResponse<{ orderId: string; orderNumber: string; tableLabel: string; status: string }>>(
      `/carts/${cartId}/send-to-kitchen`,
      { tableId: tableId ?? null, tableLabel: tableLabel ?? null },
    ),
};

// ── Order API ─────────────────────────────────────────────────────────────────

export type OrderStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export type OrderSummary = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  total: number;
  customerName: string | null;
  createdByName: string | null;
  createdAt: string;
  itemCount: number;
};

export type OrderItemDetail = {
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  unit: string;
};

export type OrderDetail = OrderSummary & {
  items: OrderItemDetail[];
  subtotal: number;
  discount: number;
  paymentMethod: string | null;
  note: string | null;
  amountPaid: number | null;
  changeAmount: number | null;
  cancelReason: string | null;
  cancelledBy: string | null;
  cancelledAt: string | null;
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

  complete: (id: string) => api.put<ApiResponse<OrderDetail>>(`/orders/${id}/complete`),

  cancel: (id: string) => api.post<ApiResponse<OrderDetail>>(`/orders/${id}/cancel`),

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
    api.get<ApiResponse<{ name: string; orderCount: number; revenue: number }[]>>(
      '/orders/top-products',
      { params },
    ),

  topCustomers: (params: { limit?: number; from: string; to: string }) =>
    api.get<ApiResponse<{ name: string; orderCount: number; totalSpend: number; customerId: string }[]>>(
      '/orders/top-customers',
      { params },
    ),

  topEmployees: (params: { limit?: number; from: string; to: string }) =>
    api.get<ApiResponse<{ name: string; orderCount: number; revenue: number }[]>>(
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
    api.post<ApiResponse<null>>('/auth/password-reset/request', { phone }),
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
  name: string;
  monthlyAmount: number;
  paymentDate: number | null;
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

  createDefault: (data: Omit<DefaultExpense, 'id'>) =>
    api.post<ApiResponse<DefaultExpense>>('/expenses/defaults', data),

  updateDefault: (id: string, data: Partial<Omit<DefaultExpense, 'id'>>) =>
    api.put<ApiResponse<DefaultExpense>>(`/expenses/defaults/${id}`, data),

  deleteDefault: (id: string) => api.delete<ApiResponse<null>>(`/expenses/defaults/${id}`),

  cloneDefaults: (month: string) =>
    api.post<ApiResponse<ExpenseData[]>>('/expenses/clone-defaults', { month }),
};

// ── Customer API ──────────────────────────────────────────────────────────────

export type CustomerData = {
  id: string;
  name: string;
  phone: string;
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
  idCardIssuedDate: string | null;
  idCardIssuedPlace: string | null;
  permanentAddress: string | null;
  totalOrders: number;
  totalSpend: number;
  points: number;
  createdAt: string;
};

export type CustomerFormPayload = {
  name: string;
  phone: string;
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

  orderSummary: (id: string, from: string, to: string) =>
    api.get<ApiResponse<{ totalRevenue: number; orderCount: number; completedCount: number; avgOrderValue: number }>>(
      `/customers/${id}/orders/summary`,
      { params: { from, to } },
    ),

  orderChart: (id: string, from: string, to: string, granularity: 'day' | 'week' | 'month' | 'year') =>
    api.get<ApiResponse<{ label: string; value: number }[]>>(
      `/customers/${id}/orders/chart`,
      { params: { from, to, granularity } },
    ),
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
  id: string;
  action: string;
  description: string;
  source: 'WEB' | 'MOBILE';
  createdAt: string;
};

export const activityLogApi = {
  list: (params?: { page?: number; category?: string; from?: string; to?: string }) =>
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
  roles: ShopUserRole[];
  active: boolean;
  accountNonLocked: boolean;
  createdAt: string;
};

export type CreateStaffPayload = {
  username: string;
  password: string;
  fullName: string;
  roleNames: string[];
};

export type UpdateStaffPayload = {
  fullName?: string;
  roleNames?: string[];
};

export const shopUserApi = {
  list: () =>
    api.get<ApiResponse<{ content: ShopUser[]; totalElements: number }>>('/users'),

  create: (data: CreateStaffPayload) =>
    api.post<ApiResponse<ShopUser>>('/users', data),

  update: (id: string, data: UpdateStaffPayload) =>
    api.put<ApiResponse<ShopUser>>(`/users/${id}`, data),

  toggleEnable: (id: string, enable: boolean) =>
    api.put<ApiResponse<null>>(`/users/${id}/enable`, null, { params: { enabled: enable } }),

  resetPassword: (id: string) =>
    api.post<ApiResponse<{ tempPassword: string }>>(`/users/${id}/reset-password`),
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
};

export const userApi = {
  getMe: () => api.get<ApiResponse<{
    username: string;
    fullName: string | null;
    nickname: string | null;
    shopName: string | null;
    role: string | null;
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
  location?: string;
  displayOrder: number;
  elapsedMinutes?: number;
};

export const tableApi = {
  list: () => api.get<ApiResponse<ShopTable[]>>('/tables'),
  create: (data: { tableNumber: string; capacity: number; location?: string; displayOrder?: number }) =>
    api.post<ApiResponse<ShopTable>>('/tables', data),
  update: (id: number, data: { tableNumber?: string; capacity?: number; location?: string; displayOrder?: number }) =>
    api.put<ApiResponse<ShopTable>>(`/tables/${id}`, data),
  delete: (id: number) => api.delete<ApiResponse<null>>(`/tables/${id}`),
};
