# TappyPOS Mobile — Technical Specification & User Stories

> **Status:** Planning  
> **App:** Companion mobile app for the TappyPOS retail platform (`tappypos.vn`)  
> **Target users:** Shop owners of small Vietnamese businesses (phở shop, barber, café, small retail)  
> **Platform:** iOS + Android via Expo (React Native)  
> **Backend:** Existing Spring Boot API — no new endpoints required for MVP unless noted

---

## 1. Goals

The web app at `tappypos.vn` is already the full management tool. The mobile app answers a different need: **the owner is not always at a desk.** They need to:

- Glance at today's revenue between customers
- Process a sale from their phone or a counter tablet
- Check on orders that staff created
- Browse the product catalogue

The design bar is: *a 45-year-old phở shop owner should complete any task on the first try, on a phone, while standing.*

### Out of scope (mobile MVP)
- Admin: user management, shop config, salary generation, vendor/purchase orders
- Inventory adjustments
- Reports / export
- Push notifications (backend exists; mobile integration is Phase 2)

---

## 2. Target Persona

| Attribute | Detail |
|---|---|
| Role | `SHOP_OWNER` — JWT has `DASHBOARD`, `ORDER`, `POS`, `PRODUCT`, `CUSTOMER` features |
| Device | iPhone SE / Android mid-range, 375–390px width |
| Context | Standing, one hand, loud environment, slow 4G |
| Primary language | Vietnamese |
| Tech comfort | Low — must require zero onboarding |

All feature flags still come from the JWT `features` claim. A feature missing from the token hides the corresponding tab, exactly as the web app does.

---

## 3. Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | **Expo SDK 54** (managed workflow) | Same as tappy-hu; OTA updates, no Xcode/Android Studio for routine releases |
| Language | TypeScript | Type safety across API contracts |
| Navigation | **React Navigation 7** (stack + bottom tabs) | Already familiar; native-feel transitions |
| Server state | **TanStack React Query 5** | Cache, background refetch, optimistic updates; same as tappy-hu |
| Auth storage | **expo-secure-store** | Encrypted native keychain; stores access token + refresh token |
| HTTP | **Axios** | Interceptors for auth headers, token refresh queue, `X-Tenant-ID` |
| UI | **React Native Paper** or bare StyleSheet | Decision needed; Paper gives Material components fast, bare gives full control |
| Icons | `@expo/vector-icons` (MaterialCommunityIcons) | Already in tappy-hu |
| i18n | Custom key-value (mirror web pattern) | Vietnamese default, English toggle |
| Biometrics | `expo-local-authentication` | Face ID / fingerprint for re-login |
| Haptics | `expo-haptics` | Feedback on cart add, checkout success |

### API base URL
```
Production:  https://tappypos.vn/api
Dev proxy:   http://192.168.x.x:6868/api   (update per developer machine)
```

All requests carry:
```
Authorization: Bearer <accessToken>
X-Tenant-ID:   <tenantId>
Accept-Language: vi | en
```

---

## 4. Auth Architecture

### Login methods

| Method | How | When |
|---|---|---|
| **Phone + Password** | Phone as username, user-set password | Primary — registration and all logins |
| **Google** | OAuth via `expo-auth-session` | Alternative |
| **Apple** | Sign In with Apple (`expo-apple-authentication`) | Required on iOS |
| **PIN** | 6-digit PIN + optional Face ID/fingerprint | Fast unlock after first login on device |

> **Zalo OTP / SMS OTP** — deferred to backlog. Not in MVP.

After the first login via any method, the user is prompted to set a PIN. All subsequent sessions use **phone + PIN** or biometric. Password is only re-entered if the user resets their PIN ("Quên mã PIN?" → enter password → new PIN).

See `ONBOARDING_SPEC.md` §3 for the complete auth flow diagrams.

### Problem: HttpOnly cookies don't work in React Native
The backend issues the refresh token as an HttpOnly cookie (browser-only). React Native does not persist HttpOnly cookies across app restarts.

### Solution: `refreshInBody` login flag (one backend change)
Add an optional `refreshInBody: true` field to `POST /api/auth/login`. When true, the backend **also** includes the refresh token in the JSON response body (in addition to the cookie). The mobile app stores it in `expo-secure-store`. Existing browser clients are unaffected.

> **Backend change needed:** `AuthController.login()` + `AuthService.doAuthenticate()` — add `refreshInBody` to `LoginRequest`; if true, include `refreshToken` field in `AuthResponse`.

The new mobile-only endpoints (`/api/auth/otp/*`, `/api/auth/phone-pin`, `/api/auth/google`, `/api/auth/apple`, `/api/auth/pin/setup`) always return the refresh token in the response body — no `refreshInBody` flag needed for those.

### Token storage (mobile)
```
SecureStore key: "access_token"   → short-lived JWT
SecureStore key: "refresh_token"  → long-lived refresh token
SecureStore key: "tenant_id"      → active tenant
SecureStore key: "phone"          → stored phone number (auto-fills PIN login screen)
```

### Token refresh flow
Same as web: proactive refresh 1 min before expiry, queue in-flight requests during refresh. Implemented in Axios request interceptor.

### Tenant selection
The JWT `tenantId` claim identifies which shop the user belongs to. For MVP (single-tenant users), skip the selection screen. If a user has multiple tenants (future), show a shop picker after login.

---

## 5. Navigation Structure

```
RootNavigator
├── AuthStack (shown when no valid token)
│   ├── PhoneInputScreen     → phone entry + Zalo OTP, Google, Apple buttons
│   ├── OtpVerifyScreen      → 6-digit OTP input
│   ├── PinLoginScreen       → returning user: phone (pre-filled) + PIN pad + biometric
│   ├── PinSetupScreen       → first-time PIN creation (after OTP/Google/Apple)
│   ├── ShopTypeScreen       → new user only: simple vs complex gate
│   │   └── LeadCaptureSheet → complex shop lead capture overlay
│   └── OnboardingWizard     → 4-step setup wizard (see ONBOARDING_SPEC.md)
└── AppStack (shown when authenticated)
    └── BottomTabNavigator
        ├── HomeTab        → DashboardScreen
        ├── POSTab         → POSScreen (+ nested: CartScreen, CheckoutScreen)
        ├── OrdersTab      → OrderListScreen (+ nested: OrderDetailScreen)
        ├── ProductsTab    → ProductListScreen (+ nested: ProductDetailScreen)
        └── ProfileTab     → ProfileScreen
```

Tab visibility is driven by JWT features:
- `DASHBOARD` → HomeTab
- `POS` → POSTab
- `ORDER` → OrdersTab
- `PRODUCT` → ProductsTab

Profile tab is always shown.

---

## 6. User Stories

Stories use: **As** [persona] **I want** [action] **so that** [outcome]

Status legend: `[ ]` Not started · `[~]` In progress · `[x]` Done

---

### Epic A — Authentication & Session

| ID | Story | Acceptance Criteria | Status |
|---|---|---|---|
| A-1 | As an existing shop owner, I want to log in with my phone number and password so that I can access my shop | `LoginScreen`: phone + password. Shows Vietnamese error for wrong credentials. Stores tokens in SecureStore on success. | `[ ]` |
| A-2 | As a returning user, I want to log in instantly with my 6-digit PIN so that I don't retype my password every session | `PinLoginScreen` shown automatically when phone is stored in SecureStore. PIN pad + biometric shortcut. `POST /api/auth/phone-pin`. | `[ ]` |
| A-3 | As a returning user, I want to unlock the app with Face ID or fingerprint so that opening the app is one touch | Biometric prompt on `PinLoginScreen` load. Falls back to PIN if cancelled. `expo-local-authentication`. | `[ ]` |
| A-4 | As a new user after first login, I want to set a 6-digit PIN so that future sessions are instant | `PinSetupScreen` shown once after any first-time auth (password / Google / Apple). Confirm PIN step. `POST /api/auth/pin/setup`. | `[ ]` |
| A-5 | As a user who forgot their PIN, I want to reset it using my password so that I'm never permanently locked out | "Quên mã PIN?" on `PinLoginScreen` → enter password → new PIN setup. | `[ ]` |
| A-6 | As a user, I want the app to auto-refresh my session in the background so that I'm never logged out mid-task | Axios interceptor refreshes token proactively 60 s before expiry. In-flight requests queued and retried after refresh. | `[ ]` |
| A-7 | As a user, I want to see a friendly message when another device logs in and kicks me out so that I understand why I'm signed out | `DEVICE_SWITCHED` 401 clears SecureStore and navigates to `WelcomeScreen` with `"Tài khoản đã đăng nhập trên thiết bị khác"` message. | `[ ]` |
| A-8 | As a user, I want to log out so that my session is ended and the phone can be handed to someone else | Profile tab → Logout → confirm → `POST /api/auth/logout` → clears SecureStore → navigate to `WelcomeScreen`. | `[ ]` |

---

### Epic B — Dashboard (Home)

| ID | Story | Acceptance Criteria | Status |
|---|---|---|---|
| B-1 | As a shop owner, I want to see today's revenue at a glance when I open the app so that I know how the day is going | Hero card with today's total revenue (VND format). Pulls from existing `/api/dashboard/kpi` with `preset=today`. | `[ ]` |
| B-2 | As a shop owner, I want to see today's order counts (total, completed, pending) so that I know how busy we are | Three stat chips below the hero card: Tổng đơn / Hoàn thành / Chờ xử lý | `[ ]` |
| B-3 | As a shop owner, I want to switch the KPI period (today / this week / this month) so that I can check different time windows | Segmented control: Hôm nay · Tuần này · Tháng này. Updates all stats. | `[ ]` |
| B-4 | As a shop owner, I want to see the 5 most recent orders on the dashboard so that I can quickly check what's happening | Compact order list cards below the stats. Taps open OrderDetailScreen. | `[ ]` |
| B-5 | As a shop owner, I want the dashboard to refresh when I pull down so that I see up-to-date numbers | Pull-to-refresh re-fetches all dashboard queries via React Query `invalidateQueries`. | `[ ]` |
| B-6 | As a shop owner with no orders yet, I want to see a helpful empty state so that I understand what the screen is for | Empty state illustration + "Chưa có đơn hàng hôm nay" + "Tạo đơn mới" shortcut button | `[ ]` |

---

### Epic C — POS / Cashier

This is the highest-value feature for day-to-day use.

| ID | Story | Acceptance Criteria | Status |
|---|---|---|---|
| C-1 | As a shop owner, I want to search for a product by name or barcode so that I can quickly add it to the cart | Search input at top of POS screen. Debounced 300 ms. Calls `GET /api/products/search?q=...`. Shows product card with name, price, unit. | `[ ]` |
| C-2 | As a shop owner, I want to browse products by category so that I can find items without knowing the exact name | Category chips below the search bar. Tapping a category filters the product grid. | `[ ]` |
| C-3 | As a shop owner, I want to tap a product to add it to the cart so that I can build an order quickly | Tap product → adds qty 1 to cart. Cart badge on POSTab updates. Haptic feedback. | `[ ]` |
| C-4 | As a shop owner, I want to adjust quantities in the cart so that I can correct mistakes before checkout | Cart sheet (slide-up): shows items with +/− controls and swipe-to-remove. | `[ ]` |
| C-5 | As a shop owner, I want to see the cart total update as I add items so that I always know the running bill | Cart total is derived client-side from cart items. Updates instantly without a server call. | `[ ]` |
| C-6 | As a shop owner, I want to select a payment method (cash / transfer) at checkout so that I can record how the customer paid | Checkout screen: Cash · Chuyển khoản · Thẻ chips. Default = Cash. | `[ ]` |
| C-7 | As a shop owner, I want to see a cash change calculator when payment is cash so that I can quickly return the right change | Cash received input → "Tiền thừa: X ₫" shown instantly. | `[ ]` |
| C-8 | As a shop owner, I want to complete an order and see a success screen so that I know the sale was recorded | `POST /api/cart/checkout` → success animation → order number + total shown → "Đơn mới" button to restart | `[ ]` |
| C-9 | As a shop owner, I want to assign the sale to a walk-in customer or an existing customer so that loyalty points are tracked | Customer search field on checkout screen. Defaults to "Khách lẻ" (walk-in). Optional — can skip. | `[ ]` |
| C-10 | As a shop owner, I want to apply a promotion code at checkout so that discounted prices are applied correctly | Promo code input on checkout screen. Calls `/api/cart/apply-promotion`. Shows discount amount. | `[ ]` |
| C-11 | As a shop owner, I want to view or share a receipt after checkout so that the customer has proof of purchase | Receipt screen after checkout: order summary. Share button → `expo-sharing` with formatted text or PDF. | `[ ]` |
| C-12 | As a shop owner using a jewelry/gold shop, I want dynamic gold prices applied automatically so that I don't manually calculate | POS respects `dynamicPrice` product type. Price is computed by the backend at cart-add time (same as web). Mobile shows the live price on the product card. | `[ ]` |

---

### Epic D — Orders

| ID | Story | Acceptance Criteria | Status |
|---|---|---|---|
| D-1 | As a shop owner, I want to see all orders with their status so that I can monitor what's happening in the shop | Paginated order list. Status chips filter: Tất cả · Hoàn thành · Đang xử lý · Chờ xử lý · Đã hủy. | `[ ]` |
| D-2 | As a shop owner, I want to tap an order to see its full detail so that I know what was ordered and who placed it | OrderDetailScreen: order number, date, employee, items list, subtotal, discount, total, payment method, status. | `[ ]` |
| D-3 | As a shop owner, I want to mark a pending order as completed so that the order status is up to date | "Hoàn thành" button on detail screen for PENDING orders. Calls `PUT /api/orders/:id/complete`. | `[ ]` |
| D-4 | As a shop owner, I want to search orders by order number or customer name so that I can find a specific transaction quickly | Search bar above the order list. Debounced. Calls `GET /api/orders?search=...`. | `[ ]` |
| D-5 | As a shop owner, I want to load more orders as I scroll so that I can see historical data | Infinite scroll / load-more button. Page size 20. Appends to list on load more. | `[ ]` |

---

### Epic E — Products

| ID | Story | Acceptance Criteria | Status |
|---|---|---|---|
| E-1 | As a shop owner, I want to browse all products with name, price and stock status so that I know what's available | Product grid (2-column cards). Shows name, price (or "Theo giá vàng"), unit, stock status chip. | `[ ]` |
| E-2 | As a shop owner, I want to search products by name so that I can quickly find a specific item | Search bar at top. Debounced 300 ms. | `[ ]` |
| E-3 | As a shop owner, I want to filter products by category so that I can browse by type | Category chips row. Single-select. Clears on second tap. | `[ ]` |
| E-4 | As a shop owner, I want to tap a product to see its full details so that I can answer customer questions | ProductDetailScreen: name, price, unit, category, description, EAV attributes (if any), stock level (if INVENTORY feature present). | `[ ]` |
| E-5 | As a shop owner, I want to see an "Add to cart" shortcut on the product detail screen so that I can immediately start an order | Floating "Thêm vào giỏ" button on ProductDetailScreen. Navigates to POSTab with item pre-added. | `[ ]` |

---

### Epic F — Profile & Settings

| ID | Story | Acceptance Criteria | Status |
|---|---|---|---|
| F-1 | As a shop owner, I want to see my shop name and my profile on the Profile tab so that I can confirm which account is active | Profile screen: shop name, username, full name, role badge. | `[ ]` |
| F-2 | As a shop owner, I want to switch the app language between Vietnamese and English so that I can use it in my preferred language | Language toggle on Profile screen. Persists in AsyncStorage. Updates all labels instantly. | `[ ]` |
| F-3 | As a shop owner, I want to change my password from the mobile app so that I can maintain security | Change password form on Profile screen. Calls `PUT /api/profiles/password`. | `[ ]` |
| F-4 | As a shop owner, I want to see the app version number so that I can report it when asking for support | Version string from `expo-constants` shown at bottom of Profile screen. | `[ ]` |

---

### Epic G — More Screen & Shop Config Navigation

Reorganisation of the More tab to group features by purpose and promote shop config to a dedicated section (previously buried inside Settings).

**Implemented:** 2026-05-17

#### Navigation architecture

The More tab (`MoreNavigator`) hosts all feature modules plus the Settings sub-navigator. Shop-config screens are now registered in both `MoreNavigator` and `SettingsNavigator` so they remain reachable from either path.

```
More tab (MoreNavigator)
├── MoreMain  (MoreScreen)
│   ├── Section "Danh mục"           → Products, Categories, Combos, Inventory*
│   ├── Section "Khách & Nhân viên"  → Customers, Appointments*, Staff*, Staff Performance*
│   ├── Section "Vận hành"           → My Work, Queue View*, Gold Price*, Notifications*
│   ├── Section "Cấu hình cửa hàng" (list rows)
│   │   → ShopInfo, POSConfig, BankAccounts*, DefaultExpenses, PrintTemplates, LoyaltyConfig*
│   └── Settings entry (row)  →  SettingsNavigator
└── [all sub-screens registered as MoreStack screens]

Settings screen (personal only)
├── Profile card
├── Account: Profile Update, Change Password, Security
├── Hiển thị & Thông báo: Display, Notification Preferences*
├── Hỗ trợ: Utilities Hub, Feedback*, Feedback History*, Hotline, Email, Zalo
└── Hệ thống: Activity Log, T&C, Delete Account

* gated by feature flag
```

| ID | Story | Acceptance Criteria | Status |
|---|---|---|---|
| G-1 | As a shop owner, I want shop-related config (POS, bank accounts, print templates, loyalty) grouped under "Cấu hình cửa hàng" in the More tab so that I don't have to dig into Settings to configure my shop | More screen shows a list-style "Cấu hình cửa hàng" section. All shop config screens are reachable from it. | `[x]` |
| G-2 | As a shop owner, I want the More screen to group catalogue and people features separately so that I can find what I need without scrolling a flat list | 4 labelled sections: Danh mục, Khách & Nhân viên, Vận hành, Cấu hình cửa hàng. | `[x]` |
| G-3 | As a shop owner, I want the Settings screen to contain only personal/account options so that shop config and personal config are clearly separated | Settings screen has no Shop section. Sections: Account (Profile Update, Change Password, Security), Hiển thị & Thông báo, Hỗ trợ, Hệ thống. | `[x]` |

---

### Epic H — Notification Triggers

In-app notification delivery for high-value shop events. Backend is polling-based (`GET /api/notifications/unread-count` every 30 s); no push infrastructure required.

**Implemented:** 2026-05-17  
**Recipients:** `SHOP_OWNER` and `MANAGER` roles within the tenant.

#### H-1 — New order created

| Attribute | Detail |
|---|---|
| Trigger | `CartServiceImpl.checkout()` — fires after order is persisted and activity log is written |
| Type | `Notification.NotificationType.ORDER` |
| Title | `notification.order.new.title` → `"Đơn hàng mới #<orderNumber>"` |
| Body | `notification.order.new.message` → `"Tổng cộng: <amount> ₫[ · <customerName>]"` |
| Delivery | `notificationService.pushToRolesAsync(...)` — fire-and-forget, never blocks checkout |

#### H-2 — Low stock threshold crossed

| Attribute | Detail |
|---|---|
| Trigger | `InventoryServiceImpl.removeStock()` — fires only when stock crosses **from above to at-or-below** the `reorderLevel` (edge-crossing, not on every decrement) |
| Condition | `stockBefore > reorderLevel && stockAfter <= reorderLevel` |
| Type | `Notification.NotificationType.LOW_STOCK` |
| Title | `notification.inventory.low_stock.title` → `"Hàng sắp hết: <productName>"` |
| Body | `notification.inventory.low_stock.message` → `"Còn <qty> đơn vị (ngưỡng tối thiểu: <reorderLevel>)"` |
| Delivery | `notificationService.pushToRolesAsync(...)` — fire-and-forget |

| ID | Story | Acceptance Criteria | Status |
|---|---|---|---|
| H-1 | As a shop owner or manager, I want to receive an in-app notification when a new order is placed so that I know sales activity in real time | Notification appears in the bell within ~30 s of checkout. Title includes order number; body includes total and customer name if not walk-in. | `[x]` |
| H-2 | As a shop owner or manager, I want to receive a low-stock alert the first time a product's stock drops to or below its reorder level so that I know when to restock | Notification fires exactly once per "restock → deplete" cycle; does not spam on every subsequent sale. | `[x]` |

---

## 7. API Mapping

All endpoints are already live on the backend. No new endpoints needed for MVP except the `refreshInBody` login flag.

| Feature | Endpoint(s) |
|---|---|
| Login | `POST /api/auth/login` (add `refreshInBody: true`) |
| Refresh | `POST /api/auth/refresh` |
| Logout | `POST /api/auth/logout` |
| Dashboard KPI | `GET /api/dashboard/kpi?preset=today\|week\|month` |
| Recent orders | `GET /api/orders?page=0&size=5&sort=createdAt,desc` |
| Product list | `GET /api/products?page=0&size=30&categoryId=&search=` |
| Product detail | `GET /api/products/:id` |
| Categories | `GET /api/categories` |
| Cart (POS session) | `POST /api/cart/items`, `PUT /api/cart/items/:id`, `DELETE /api/cart/items/:id`, `GET /api/cart` |
| Apply promo | `POST /api/cart/apply-promotion` |
| Checkout | `POST /api/cart/checkout` |
| Order list | `GET /api/orders?status=&search=&page=0&size=20` |
| Order detail | `GET /api/orders/:id` |
| Complete order | `PUT /api/orders/:id/complete` |
| Profile | `GET /api/profiles/me`, `PUT /api/profiles/password` |

---

## 8. One Backend Change Required (MVP)

### `refreshInBody` flag on login

**File:** `backend/src/main/java/com/knp/model/dto/auth/LoginRequest.java`
```java
private Boolean refreshInBody;   // when true, refresh token returned in response body
```

**File:** `backend/src/main/java/com/knp/model/dto/auth/AuthResponse.java`
```java
private String refreshToken;     // populated only when refreshInBody=true
```

**File:** `backend/src/main/java/com/knp/service/auth/AuthService.java` — in `doAuthenticate()`:
```java
if (Boolean.TRUE.equals(loginRequest.getRefreshInBody())) {
    authResponse.setRefreshToken(refreshTokenValue);
}
```

This is the only backend change needed for the entire mobile MVP.

---

## 9. UI Design Principles

These apply to every screen:

- **Minimum tap target:** 44×44 pt (Apple HIG / Material guideline)
- **Vietnamese first:** All copy in Vietnamese; English on toggle
- **VND format:** `1.500.000 ₫` — always `toLocaleString('vi-VN')` equivalent
- **Loading state:** Every screen shows a skeleton or spinner while fetching; never blank
- **Empty state:** Every list has a friendly Vietnamese message + icon when empty
- **Error state:** Network errors show a "Thử lại" (retry) button, not a raw error string
- **Pull to refresh:** Every list screen supports `RefreshControl`
- **Bottom safe area:** All scrollable content respects `useSafeAreaInsets().bottom`
- **No floating text labels on icons** in bottom tabs — use icons + short labels (≤5 chars)

---

## 10. Phase Plan

### Phase 1 — MVP (this spec)
Auth · Dashboard · POS · Orders · Products · Profile

### Phase 2
- Push notifications (backend already built; NEW_ORDER and LOW_STOCK triggers implemented — see Epic H)
- Salary: employee views own payslip (`GET /api/salary?employeeId=me`)
- Customer lookup + loyalty points at checkout
- Inventory alerts widget on dashboard
- Barcode scanner for POS product search (`expo-barcode-scanner`)

### Phase 3
- Revenue chart widget
- Offline-capable product catalogue cache (SQLite via `expo-sqlite`)
- Tablet-optimised POS layout (two-column: product grid left, cart right)

---

## 11. Repository Setup (new repo)

Recommended: create `retail-platform-mobile/` as a sibling to `retail-platform/`, bootstrapped with:

```bash
npx create-expo-app@latest retail-platform-mobile --template blank-typescript
```

Reuse from `tappy-hu/mobile`:
- Axios instance with interceptor pattern (`services/api.ts`)
- SecureStore token helpers
- i18n key-value structure
- React Navigation bottom tab setup
- TanStack Query provider + `queryClient` setup
