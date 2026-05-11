---
name: TappyPOS Mobile — Full Implementation Plan
description: Complete planning for tappy-pos/mobile including navigation, stores, backend requirements, quick order, combos, activity logging, report, gold prices, missing screens, and all screens. Read before any mobile implementation work.
type: project
originSessionId: df315ccb-2945-419c-9cbb-2eed88eab878
---

## Core Architecture Decisions

| Decision | Choice |
|---|---|
| Registration creates | User only — no tenant |
| Tenant creation | Deferred to onboarding Step 4 via `POST /api/tenants/self-provision` |
| JWT after registration | `tenantId: null`, `features: []` |
| JWT after onboarding | Real `tenantId` + `features[]` from subscription plan |
| OTP verification | Backlog — not in MVP |
| All shop types | Self-register; jewelry/pawn gets `PAWN` feature added |
| Onboarding data commit | Single atomic `self-provision` call at Step 4 |
| Wizard state persistence | Zustand `onboardingStore` with AsyncStorage persist middleware |
| Resume on app reopen | `lastCompletedStep` tracker in onboardingStore |
| Cross-device draft | Not supported MVP |
| Subscription on provision | MINIMAL plan, 1 year expiry, 1 user, default features |
| Post-onboarding landing | Home tab (Overview) |
| Post-login landing | Home tab (Overview) |

---

## RootNavigator State Machine

```
App opens → SplashScreen (min 600ms)
                │
          GET /api/app/version
          currentVersion < minVersion?
                │ yes → ForceUpdateScreen (block)
                │ no
          hydrate SecureStore
                │
     stored tenant_id?
          │           │
         no           yes → valid token?
          │                    │        │
          ▼                   no        yes
   ShopIdScreen          PIN enabled?  AppStack
   (universal entry)      │        │   Home tab
                         yes       no
                          │         │
                     PinLogin   LoginScreen
                     Screen     (shop pre-filled)
```

**State rules:**
- `no token + no stored phone` → ShopIdScreen
- `token + tenantId = null` → OnboardingStack
- `token + tenantId = real` → AppStack → Home tab
- Logout clears token but **keeps tenant_id** → next launch goes to LoginScreen
- "Đổi cửa hàng" clears tenant_id → navigates to ShopIdScreen

---

## Full Navigation Structure

```
AuthStack
├── ShopIdScreen           ← universal entry (validates tenant → LoginScreen or RegisterScreen)
├── LoginScreen            (shop name shown read-only; "Đổi cửa hàng" link; "Quên mật khẩu?" link)
├── RegisterScreen         (phone+password+T&C; Google/Apple OAuth)
├── PinLoginScreen         (shop shown read-only; biometric auto-prompt)
├── PinSetupScreen         (custom numpad; two-phase confirm; skip on first setup)
├── ForgotPinScreen        (verify password → new PIN)
└── ForgotPasswordScreen   (phone input → POST /auth/password-reset/request; support contacts as fallback)

OnboardingStack            (shown when tenantId = null)
├── ShopTypeScreen         ← 3×3 grid, required
├── Step1Screen            nickname* + fullName + shopName* + address
├── Step2Screen            product templates checklist + prices (skippable)
├── Step3Screen            fixed expenses with suggestion chips (skippable)
└── Step4Screen            summary (collapse >3 items) + confirm → self-provision

AppStack
├── BottomTabNavigator
│   ├── HomeTab       (DASHBOARD)   → HomeScreen
│   ├── SellingTab    (POS|ORDER)   → POSMainScreen → CartScreen → CheckoutScreen → OrderSuccessScreen
│   │                                ↕ top toggle
│   │                               → OrderListScreen → OrderDetailScreen
│   ├── ExpensesTab                 → ExpensesScreen
│   ├── ReportTab     (DASHBOARD)   → ReportScreen
│   └── SettingsTab                 → SettingsScreen
│
└── Modal stacks (over tab bar, accessed via ⋯ overflow menu)
    ├── CustomerStack      (CUSTOMER)        CustomerListScreen → CustomerDetailScreen → CustomerFormScreen (create/edit)
    ├── InventoryStack     (INVENTORY)       InventoryListScreen
    ├── ComboStack         (POS)             ComboListScreen → ComboEditScreen
    ├── PrintTemplateStack (SHOP_SETTING)    PrintTemplateListScreen → PrintTemplateDetailScreen
    └── GoldPriceStack     (PAWN)            GoldPriceScreen  ← JEWELRY shops only

Non-stack screens (rendered by RootNavigator before any stack):
├── SplashScreen           ← initial hydration, min 600ms display
└── ForceUpdateScreen      ← blocks app when version < minVersion

Settings sub-screens (pushed from SettingsScreen):
├── ProfileUpdateScreen
├── ChangePasswordScreen
├── ShopInfoScreen         (copy + share shop ID)
├── POSConfigScreen
├── DefaultExpensesScreen
├── SecurityScreen         (PIN toggle + biometric)
├── ThemeScreen
├── TnCScreen              (versioned; re-accept on update)
└── ActivityLogScreen
```

---

## Navigation Types

```ts
export type AuthStackParamList = {
  ShopId: undefined;
  Login: undefined;
  Register: undefined;
  PinLogin: undefined;
  PinSetup: { isFirstSetup: boolean; pendingAccessToken?: string; pendingRefreshToken?: string };
  ForgotPin: undefined;
  ForgotPassword: { prefillPhone?: string };
};

export type OnboardingStackParamList = {
  ShopType: undefined;
  Step1: undefined;
  Step2: undefined;
  Step3: undefined;
  Step4: undefined;
};

export type AppTabParamList = {
  Home: undefined;
  Selling: undefined;
  Expenses: undefined;
  Report: undefined;
  Settings: undefined;
};

export type SellingStackParamList = {
  POSMain: undefined;
  Cart: undefined;
  Checkout: undefined;
  OrderSuccess: { orderId: string; orderNumber: string; total: number };
  OrderList: undefined;
  OrderDetail: { orderId: string };
};

export type CustomerStackParamList = {
  CustomerList: undefined;
  CustomerDetail: { customerId: string };
  CustomerForm: { customerId?: string };  // undefined = create mode
};

export type InventoryStackParamList = {
  InventoryList: undefined;
};

export type ComboStackParamList = {
  ComboList: undefined;
  ComboEdit: { comboId?: string };  // undefined = create mode
};

export type PrintTemplateStackParamList = {
  PrintTemplateList: undefined;
  PrintTemplateDetail: { templateId: string };
};

export type GoldPriceStackParamList = {
  GoldPrice: undefined;
};

export type SettingsStackParamList = {
  SettingsMain: undefined;
  ProfileUpdate: undefined;
  ChangePassword: undefined;
  ShopInfo: undefined;
  POSConfig: undefined;
  DefaultExpenses: undefined;
  Security: undefined;
  Display: undefined;       // theme + language + privacy mode (combined)
  TnC: undefined;
  ActivityLog: undefined;
  DeleteAccount: undefined;
};
```

---

## Tab Feature Gating

| Tab | Required feature | Hidden if absent |
|---|---|---|
| Home (Tổng quan) | `DASHBOARD` | Yes |
| Selling (Bán hàng) | `POS` or `ORDER` | Yes |
| Expenses (Chi phí) | — | Never hidden |
| Report (Báo cáo) | `DASHBOARD` | Yes |
| Settings (Cài đặt) | — | Never hidden |

---

## Overflow Menu (⋯) Items & Feature Gating

Bottom sheet, two groups separated by a divider. Empty groups (all items gated out) hide their divider.

**Group 1 — Quản lý:**

| Item | Feature | Hidden if absent |
|---|---|---|
| 📦 Sản phẩm | `PRODUCT` | Yes |
| 👥 Khách hàng | `CUSTOMER` | Yes |
| 🏭 Tồn kho | `INVENTORY` | Yes |
| 🖨️ Mẫu in | `SHOP_SETTING` | Yes |
| 💰 Giá vàng hôm nay | `PAWN` | Yes (JEWELRY shops only) |

**Group 2 — Cửa hàng:**

| Item | Feature | Hidden if absent |
|---|---|---|
| 🏪 Thông tin cửa hàng | — | Never |
| 🎛️ Cấu hình POS | `POS` | Yes |
| 💰 Chi phí cố định mặc định | — | Never |
| 📋 Combo sản phẩm | `POS` | Yes |

---

## Quick Order

Quick Order strip sits above the order list on the Selling tab (Orders view).

**Ordering logic:** combos (max 2 slots) → top sellers (fill to 5) → newest products (fallback if no history).

**Single-product tap flow:**
- No variants → Quick Checkout bottom sheet directly (qty stepper + note + payment method + confirm)
- Has variants → compact variant picker first → Quick Checkout sheet
- Dynamic-price (JEWELRY) → `DecimalInput` for gold weight → Quick Checkout sheet

**Combo tap flow:** Combo detail bottom sheet (item list, total, savings, qty stepper) → Quick Checkout.

**Quick Checkout** posts directly to `POST /api/orders` (bypasses cart) with `source: "QUICK_ORDER"`. On success: `UndoToast` "Đã tạo đơn #XXXX" with 5s undo (`DELETE /api/orders/{id}`). No navigation away — sheet dismisses, list refreshes in place.

Strip hidden entirely when shop has no products.

---

## Combo Products

Combo = named bundle of products + quantities + combined price (usually discounted).

**Entity:** `id, tenant_id, name, description, price, active, created_at`
**Items:** `combo_id, product_id, quantity`
**Order linkage:** `combo_id` nullable column on `order_items` for combo-level analytics.

"Tiết kiệm" = sum of individual prices − combo price. Green if positive; gray "Không giảm" if ≥ sum.

Managed from overflow menu → Combo sản phẩm. Surfaced in Quick Order strip.

ComboEditScreen: product picker sheet (multi-select, already-added items grayed), qty stepper per item (min 1, tap `−` at 1 → alertStore confirm remove), combo price `MoneyInput`, status toggle.

Validation: name non-empty + ≥ 2 products + price > 0.

---

## Activity Logging

Backend `ActivityLog` entity already exists.

**New `source` field:** `VARCHAR(20) DEFAULT 'WEB'`. Mobile Axios instance sends `X-Client-Source: MOBILE` header; backend writes `source = 'MOBILE'`.

**New endpoint:** `POST /api/activity-logs/event` — for client-side-only events with no other API call (THEME_CHANGE, TNC_ACCEPT, PRIVACY_MODE_TOGGLE). Accepts `{ action, description }`.

**Mobile actions logged:**

| Category | Actions |
|---|---|
| Auth | LOGIN_PASSWORD, LOGIN_PIN, LOGIN_BIOMETRIC, LOGIN_GOOGLE, LOGIN_APPLE, LOGOUT, REGISTER, PIN_SETUP, PIN_RESET, PASSWORD_CHANGE, BIOMETRIC_ENABLE, BIOMETRIC_DISABLE |
| Onboarding | ONBOARDING_COMPLETE |
| Expenses | EXPENSE_CREATE, EXPENSE_UPDATE, EXPENSE_DELETE, EXPENSE_CLONE_DEFAULTS, DEFAULT_EXPENSE_UPDATE |
| Profile/Settings | PROFILE_UPDATE, SHOP_INFO_UPDATE, TNC_ACCEPT, THEME_CHANGE, PRIVACY_MODE_TOGGLE |
| POS/Orders | Logged automatically as side-effects of existing API calls |

`ACTIVITY_LOG` included in MINIMAL subscription.

ActivityLogScreen (Settings): date range filter + category chips (🔐 Đăng nhập · 🧾 Đơn hàng · 💸 Chi phí · ⚙️ Cài đặt). `📱 MOBILE` badge on source=MOBILE rows. `useInfiniteQuery`, `staleTime: 0`.

---

## Report Screen

Two top-level tabs: **Doanh thu** | **Chi phí**

Shared period selector above tabs: `[Ngày] [Tuần] [Tháng] [Năm] [⋯]`. `⋯` opens from-to picker with `DatePickerInput × 2`.

**Doanh thu tab:** 4 KPI cards (revenue, order count, avg value, completed/cancelled) + trend bar chart (emerald) + filter chips (payment method, status) + infinite order list → OrderDetail (cross-tab navigate).

**Chi phí tab:** 4 KPI cards (total, fixed, variable, net vs revenue) + trend bar chart (red #ef4444) + filter chips (type: cố định/phát sinh, category) + expense list grouped by date → expense detail sheet.

Chart granularity: Ngày→hour, Tuần/Tháng→day, Năm→month.

`reportStore` (in-memory): period, from, to, activeTab, revenueFilters, expenseFilters.

`staleTime: 30_000` for KPI cards; `staleTime: 0` for lists.

---

## Gold Price Screen (JEWELRY + PAWN feature)

Accessible from overflow menu only when `features` includes `PAWN`. Shown as "💰 Giá vàng hôm nay" in overflow Group 1.

**GoldPriceScreen:** current buy/sell price cards + 7-day BarChart (buy price, emerald) + price history list (collapse >5 rows). "✏️ Cập nhật" header button → `UpdateGoldPriceSheet`.

**UpdateGoldPriceSheet:** date (`DatePickerInput`, default today) + buy price `MoneyInput` + sell price `MoneyInput` + note. Validation: sell ≥ buy (warn but don't block). Save → `POST /api/gold-prices` → `UndoToast`.

`staleTime: 30_000`. Gated by `PAWN` feature.

---

## Offline & Force Update

**OfflineBanner:** `@react-native-community/netinfo`; amber slide-in when `isConnected = false`; auto-refetches all queries on restore; rendered at root of AppNavigator + AuthNavigator.

**ForceUpdateScreen:** checked before hydration via `GET /api/app/version`. Compares `Constants.expoConfig.version` (expo-constants) against `minVersion`. Blocks app when below minimum. `APP_STORE_URL` + `PLAY_STORE_URL` constants in `src/utils/constants.ts`. Soft update banner (dismissible) when below `latestVersion`.

**SplashScreen:** full-screen primary green `#059669` + logo + animated dots. Minimum 600ms display to prevent flash. Rendered by RootNavigator before any stack mounts.

---

## Empty States — First-Use Copy

Every list screen must show this on first use (before any data exists):

| Screen | Icon | Title | CTA |
|---|---|---|---|
| HomeScreen | 🏪 | "Chào mừng đến TappyPOS!" | "Bắt đầu bán hàng →" |
| OrderListScreen | 🧾 | "Chưa có đơn hàng nào" | "Đến bán hàng →" |
| ExpensesScreen | 💸 | "Chưa có chi phí nào" | "+ Thêm chi phí" |
| ProductListScreen | 📦 | "Chưa có sản phẩm nào" | "+ Thêm sản phẩm" |
| CustomerListScreen | 👥 | "Chưa có khách hàng nào" | "+ Thêm khách hàng" |
| ComboListScreen | 🍱 | "Chưa có combo nào" | "+ Tạo combo" |
| ReportScreen | 📊 | "Chưa có dữ liệu báo cáo" | "Đến bán hàng →" |
| NotificationScreen | 🔔 | "Chưa có thông báo nào" | — |
| ActivityLogScreen | 📋 | "Chưa có hoạt động nào" | — |

Uses `EmptyState` component: large emoji (48px) + bold title + gray subtitle + optional CTA button.

---

## Account Deletion

Settings → Tài khoản → "Xóa tài khoản" (red text). Two-step confirmation:
1. `alertStore` warning listing what will be deleted
2. Full-screen `DeleteAccountScreen`: type "XÁC NHẬN" exactly → button enables → `DELETE /api/users/me` → clear all SecureStore + AsyncStorage → navigate to ShopIdScreen.

---

## Shop Types & Tenant ID Prefixes

| Code | Display Name | Prefix | Extra Features |
|---|---|---|---|
| `PHO_SHOP` | Quán phở | `pho` | — |
| `BARBER_SHOP` | Tiệm cắt tóc | `toc` | — |
| `CAFE` | Quán cà phê | `cf` | — |
| `GROCERY` | Cửa hàng tạp hóa | `tg` | `INVENTORY` |
| `BAKERY` | Tiệm bánh mì / bánh ngọt | `bm` | — |
| `RESTAURANT` | Quán ăn | `qa` | — |
| `FASHION` | Cửa hàng thời trang | `tt` | `INVENTORY` |
| `JEWELRY` | Tiệm vàng / Cầm đồ | `vang` | `PAWN`, `INVENTORY` |
| `OTHER` | Khác | `shop` | — |

Tenant ID format: `{prefix}-{4-char-random}` e.g. `pho-a7k2`

---

## Subscription Model (MINIMAL — created at self-provision)

```
started_at:  now()
expires_at:  now() + 1 year
max_users:   1
status:      ACTIVE
features:    DASHBOARD, POS, ORDER, PRODUCT, INVENTORY, CUSTOMER,
             NOTIFICATION, FEEDBACK, SHOP_SETTING, ACTIVITY_LOG
             (+ PAWN for JEWELRY type)
```

User limit: 1 user → 403 on second user attempt.
Expiry ≤ 30 days → amber banner on HomeScreen + amber badge in Settings → Gói dịch vụ.
Expired → Phase 2 enforcement.

---

## Onboarding Wizard

| Step | Screen | Content | Skip? | Required fields |
|---|---|---|---|---|
| 0 | ShopTypeScreen | 3×3 grid of shop type cards | No | shopTypeCode |
| 1 | Step1Screen | Nickname + Full name + Shop name + Address | No | nickname, shopName |
| 2 | Step2Screen | Product templates checklist + prices | Yes | price > 0 per checked item |
| 3 | Step3Screen | Fixed monthly expenses (chips + custom rows) + payment date | Yes | amount > 0 per added row |
| 4 | Step4Screen | Summary (collapse >3) + confirm → self-provision | No skip | — |

Step 2 product row: checkbox · name · MoneyInput (pre-filled default). Dynamic-price → "Theo giá vàng" label.
Step 3 chips: Thuê mặt bằng, Tiền điện, Tiền nước, Internet, Tiền gas, Lương nhân viên, Phí quản lý, Bảo hiểm. Each chip has emoji + color. Ordered by shop type commonness. Input reorders matching chips to top (diacritic-insensitive).
Step 4 collapse: first 3 + "+ N khác ∨" toggle. Empty sections show placeholder with link back to that step.

**Confirm:** `POST /api/tenants/self-provision` → new JWT → `authStore.setAuthenticated` → `onboardingStore.reset()` → AppStack Home tab.

**onboardingStore shape:**
```
lastCompletedStep: -1 | 0 | 1 | 2 | 3
shopTypeCode: string | null
step1: { nickname, fullName, shopName, address }
step2: { products: [{ templateId?, name, price, unit, dynamicPrice }] }
step3: { expenses: [{ name, monthlyAmount, paymentDate? }] }
actions: setShopType(), setStep1(), setStep2(), setStep3(), completeStep(n), reset()
```

---

## Zustand Store Architecture

| Store | Contents | Persist |
|---|---|---|
| `authStore` | isAuthenticated, tenantId, features, pinEnabled, biometricEnabled, storedPhone | SecureStore |
| `userStore` | nickname, fullName, shopName | SecureStore / API |
| `alertStore` | visible, title, message, buttons[] | None |
| `toastStore` | visible, message, onUndo? — 5s auto-dismiss | None |
| `privacyStore` | isHidden | SecureStore |
| `themeStore` | theme: 'light' \| 'dark' \| 'system' | SecureStore |
| `reportStore` | period, from, to, activeTab, revenueFilters, expenseFilters | None |
| `onboardingStore` | wizard draft + lastCompletedStep | AsyncStorage (persist middleware) |
| `cartStore` | items[], discount | None |
| `sellingStore` | activeView: 'POS' \| 'ORDERS' — Selling tab toggle state | None (in-memory only) |

---

## Global Infrastructure Components

| Component | Scope | Purpose |
|---|---|---|
| `SplashScreen` | RootNavigator | Hydration loading state; min 600ms; full-screen logo + animated dots |
| `ForceUpdateScreen` | RootNavigator | Blocks app when version < minVersion; "Cập nhật ngay" → App Store |
| `OfflineBanner` | AppNavigator + AuthNavigator root | Slides in when no connectivity; auto-refetches on restore |
| `BankTransferQRSheet` | CheckoutScreen | QR code + bank details when "Chuyển khoản" selected; react-native-qrcode-svg |

---

## Shared Components

| Component | Key behaviour |
|---|---|
| `FriendlyAlert` | Reads alertStore; never use `Alert.alert()` |
| `UndoToast` | Reads toastStore; 5s auto-dismiss; undo callback |
| `ClearableInput` | `forwardRef`; ✕ button; `ReturnKeyType` chaining |
| `MoneyInput` | `,` separator; ₫ badge; number-to-words; `forwardRef`; variants: form/modal/inline |
| `DecimalInput` | `.` separator; suffix badge (chỉ/kg/%); pads on blur; `forwardRef` |
| `PasswordInput` | 8-char min; strength bar (Yếu/Trung bình/Khá/Mạnh); 5-rule checklist |
| `DatePickerInput` | Custom calendar (no native); emerald #059669; ported from tappy-hu |
| `BarChart` | Custom RN Views; peak bar full opacity; others 0.6; tap tooltip; ported from tappy-hu |
| `Skeleton` | Shimmer loading placeholder |
| `SuggestionChips` | Emoji + color; ordered by commonness; diacritic-insensitive reorder on input |
| `EmptyState` | Icon + title + optional CTA button |
| `ErrorState` | Message + Retry button |

**Universal Suggestion Chip Rule:** all chip suggestion lists in the app use emoji + color, ordered by commonness for shop type, reorder on input (matching chips to top, diacritic-insensitive). Applies to: Step 3 expenses, Add Expense sheet, any future chip suggestions.

---

## Backend Additions Required (complete list)

| # | Endpoint / Entity | Notes |
|---|---|---|
| 1 | `GET /api/tenants/{shopId}/status` | Public. Returns `{ shopId, shopName, status: ACTIVE\|SUSPENDED\|NOT_FOUND }` |
| 2 | `POST /api/auth/register` | Public. Creates User only. Returns JWT with `tenantId: null`. |
| 3 | `GET /api/shop-types` | Public. Returns shop type list with code, name, tenantPrefix, iconKey, features[] |
| 4 | `GET /api/product-templates?shopTypeCode=` | User-auth, no tenant context needed |
| 5 | `GET /api/expense-suggestions?shopTypeCode=` | Public or user-auth. Returns suggested expense names ordered by commonness |
| 6 | `POST /api/tenants/self-provision` | User-auth. Creates Tenant + Subscription + seeds products/expenses + updates profile atomically. Returns fresh JWT. |
| 7 | `ShopType` entity + seed (9 types) | New entity |
| 8 | `ProductTemplate` entity + seed | New entity |
| 9 | `FixedExpense` entity | `id, tenant_id, name, monthly_amount, created_at` |
| 10 | `Subscription` entity | `tenant_id, plan, started_at, expires_at, max_users, status` |
| 11 | `POST /api/auth/login` `refreshInBody` flag | Add `refreshInBody: true` to return refresh token in body |
| 12 | `POST /api/auth/refresh` accept body token | Accept `{ refreshToken }` in body when no cookie |
| 13 | `POST /api/auth/phone-pin` | PIN login endpoint |
| 14 | `POST /api/auth/pin/setup` | Store user PIN |
| 15 | `POST /api/activity-logs/event` | User-auth. Client-side events (THEME_CHANGE, TNC_ACCEPT, etc.) |
| 16 | `source VARCHAR(20)` on `activity_logs` | `DEFAULT 'WEB'`; mobile sends `X-Client-Source: MOBILE` header |
| 17 | `GET /api/orders/summary` | `from`, `to`, `status?`, `paymentMethod?` → totals + counts |
| 18 | `GET /api/orders/chart` | `from`, `to`, `granularity (hour\|day\|month)` → `[{ label, value }]` |
| 19 | `GET /api/expenses/summary` | `from`, `to`, `type?` → fixed/variable totals + net vs revenue |
| 20 | `GET /api/expenses/chart` | `from`, `to`, `granularity` → `[{ label, value }]` |
| 21 | `GET /api/expenses` (paginated) | Add `from`, `to`, `type (FIXED\|VARIABLE)`, `category` filter params |
| 22 | Extend `GET /api/orders` | Add `from`, `to`, `paymentMethod`, `customerId` filter params (`customerId` used by CustomerDetailScreen order history) |
| 23 | `GET /api/dashboard/summary` | `period (today\|week\|month)` → `{ revenue, orderCount, expenses, profit, *Trend }` |
| 24 | `GET /api/combos` | `active=true/false`; returns list with items expanded |
| 25 | `POST /api/combos` | Create combo |
| 26 | `PUT /api/combos/{id}` | Update combo |
| 27 | `DELETE /api/combos/{id}` | Soft delete (`active=false`) |
| 28 | `GET /api/orders/top-products` | `limit`, `days` params → `[{ productId, name, price, orderCount }]`; used by Quick Order strip AND ProductListScreen "Bán chạy" section (same cache key) |
| 29 | `source VARCHAR(20)` on `orders` | `DEFAULT 'POS'`; quick order sets `QUICK_ORDER`; analytics split |
| 30 | `combo_id VARCHAR` nullable on `order_items` | Links item group to combo for analytics |
| 31 | `GET /api/subscriptions/current` | Returns `{ plan, status, startedAt, expiresAt, maxUsers, currentUsers, features[] }` |
| 32 | `GET /api/legal/tnc` | Returns `{ version, content, updatedAt }` |
| 33 | `GET /api/shop-config/banks` | Returns bank accounts for QR payment display at checkout |
| 34 | `DELETE /api/users/me` | Hard delete account + all tenant data; requires "XÁC NHẬN" confirmation client-side |
| 35 | `GET /api/app/version` | Returns `{ minVersion, latestVersion }`; checked on every app launch |
| 36 | `GET /api/gold-prices/current` | Current buy/sell price per chỉ for calling tenant; gated by `PAWN` |
| 37 | `GET /api/gold-prices/history?days=30` | Price history array; gated by `PAWN` |
| 38 | `POST /api/gold-prices` | Create/update price for a date `{ date, buyPrice, sellPrice, note }`; gated by `PAWN` |
| 39 | `POST /api/auth/password-reset/request` | Public. Accepts `{ phone }`; queues support ticket (MVP); Phase 2: sends OTP |
| 40 | `GET /api/categories` | Tenant categories list; gated by `PRODUCT` |
| 41 | `POST /api/categories` | Create category `{ name, emoji }`; gated by `PRODUCT` |
| 42 | `PUT /api/categories/{id}` | Update category; gated by `PRODUCT` |
| 43 | `DELETE /api/categories/{id}` | Delete (blocked if products exist); gated by `PRODUCT` |
| 44 | `POST /api/shop-config/banks` | Add bank account; gated by `SHOP_SETTING` |
| 45 | `PUT /api/shop-config/banks/{id}` | Update bank account; gated by `SHOP_SETTING` |
| 46 | `DELETE /api/shop-config/banks/{id}` | Delete bank account; gated by `SHOP_SETTING` |
| 47 | `PUT /api/shop-config/logo` | Upload shop logo (multipart/form-data); gated by `SHOP_SETTING` |
| 48 | `GET /api/shop-config/loyalty` | Returns `{ pointsPerUnit, unitValue }` (e.g. 100 pts = 10,000 ₫); gated by `CUSTOMER` |
| 49 | `PATCH /api/products/{id}/visibility` | `{ active: boolean }`; hides/shows product; gated by `PRODUCT` |
| 50 | `POST /api/feedback` | Submit feedback with category + content + images; gated by `FEEDBACK` |
| 51 | `GET /api/feedback/my` | User's own submitted feedback with status; gated by `FEEDBACK` |
| 52 | `GET /api/customers/recent?limit=5` | Last 5 customers who placed orders for this tenant; gated by `CUSTOMER` |
| 53 | `GET /api/customers/check-phone?phone=` | Check if phone already registered; returns `CustomerData | null`; gated by `CUSTOMER`; used by CustomerFormScreen conflict detection |
| 54 | `DELETE /api/customers/{id}` | Soft delete customer; gated by `CUSTOMER`; used by CustomerDetailScreen trash button |
| 55 | `PUT /api/orders/{id}/complete` | Mark PENDING/PROCESSING order as COMPLETED; returns updated OrderDetail; gated by `ORDER` |
| 56 | `POST /api/orders/{id}/cancel` | Cancel PENDING/PROCESSING order; returns updated OrderDetail; gated by `ORDER` |
| 57 | `DELETE /api/auth/pin` | Disable PIN for current user; gated by auth only; used by SecurityScreen PIN toggle-off |
| 58 | `GET /api/shop-config` | Returns full shop config (name, address, phone, description, logoUrl); gated by `SHOP_SETTING` |
| 59 | `PUT /api/shop-config` | Update shop info fields (name, address, phone, description); gated by `SHOP_SETTING` |
| 60 | `GET /api/shop-config/pos-config` | Returns POS config (mode, autoprint, denominations, VAT, quickPhrases[]); gated by `SHOP_SETTING` |
| 61 | `PUT /api/shop-config/pos-config` | Update POS config; auto-save with 500ms debounce from POSConfigScreen; gated by `SHOP_SETTING` |

---

## POST /api/tenants/self-provision Payload

```json
{
  "shopTypeCode": "PHO_SHOP",
  "shopName": "Quán phở Khoa",
  "address": "123 Lê Lợi, Q.1",
  "nickname": "Khoa",
  "fullName": "Nguyễn Đăng Khoa",
  "products": [
    { "name": "Phở bò tái", "price": 40000, "unit": "tô", "dynamicPrice": false }
  ],
  "expenses": [
    { "name": "Tiền thuê mặt bằng", "monthlyAmount": 5000000 }
  ]
}
```

Response: fresh JWT with real `tenantId`, `features[]`, `plan`, `planExpiresAt`.

---

## Settings Screen Structure

```
Settings
├── Tài khoản
│   ├── Thông tin cá nhân  (nickname, full name, avatar via ImagePicker)
│   ├── Đổi mật khẩu      (current → new; logout on success)
│   ├── Đăng xuất
│   └── Xóa tài khoản     (red text; 2-step: alertStore confirm → type "XÁC NHẬN" → DELETE /api/users/me)
├── Cửa hàng
│   ├── Thông tin cửa hàng (logo upload + name + address + phone + description; copy+share shop ID)
│   ├── Tài khoản ngân hàng (BankAccountListScreen — add/edit/delete; set default for QR)
│   ├── Cấu hình POS       (default mode, auto-print, denominations, VAT, quick order note phrases)
│   └── Chi phí cố định mặc định
├── Gói dịch vụ            (plan name, status badge, expiry, features chips, user count)
├── Bảo mật
│   ├── Mã PIN             (toggle off → alertStore confirm; "Đổi mã PIN")
│   ├── Sinh trắc học      (disabled if PIN off)
│   └── Tự khóa ứng dụng  (1 phút / 5 phút / 15 phút / Không bao giờ — AsyncStorage `lock_timeout_minutes`)
├── Hiển thị               (combined screen: theme + language + privacy mode)
│   ├── Giao diện          (light / dark / system — 3 cards)
│   ├── Ngôn ngữ           (Tiếng Việt 🇻🇳 / English 🇬🇧 — 2 cards; stored in SecureStore)
│   └── Chế độ riêng tư    (toggle revenue visibility)
├── Thông báo
│   └── Cài đặt thông báo  (NotificationPreferencesScreen — toggle per type)
├── Lịch sử hoạt động
├── Điều khoản sử dụng     (versioned; acceptance timestamp shown; re-accept on update)
├── Liên hệ & Hỗ trợ
│   ├── Hotline · Email · Zalo OA · Website (hardcoded SUPPORT constant)
│   └── Gửi phản hồi       (FeedbackScreen + FeedbackHistoryScreen — FEEDBACK feature)
└── Phiên bản ứng dụng     (static, non-pressable footer)
```

Subscription expiry ≤ 30 days → amber "Nâng cấp gói" button in Gói dịch vụ card.

---

## Milestone Plan

| Milestone | Backend | Mobile |
|---|---|---|
| M1 | Items 1–10: entities, seeds, register, shop-types, product-templates, self-provision, tenant status | — |
| M2 | — | ShopIdScreen, LoginScreen, RegisterScreen, RootNavigator |
| M3 | — | OnboardingStack (ShopType → Step4), onboardingStore |
| M4 | — | Shared components (FriendlyAlert, UndoToast, ClearableInput, MoneyInput, DecimalInput, DatePickerInput, BarChart, PasswordInput, SuggestionChips, Skeleton); stores (userStore, alertStore, toastStore, privacyStore, themeStore) |
| M5 | Items 13–14: PIN endpoints, items 11–12: refreshInBody | PinSetup, PinLogin, ForgotPin |
| M6 | Items 23–24: dashboard summary, chart endpoints | HomeScreen, ExpensesScreen, ReportScreen |
| M7 | Items 17–22: orders/expenses filters + chart + summary | SellingTab full (POS + Cart + Checkout + OrderSuccess + OrderList + OrderDetail) |
| M8 | Items 24–30: combos, top-products, order source | QuickOrder strip, ComboManagement screens |
| M9 | Items 15–16: activity-logs/event + source field | ActivityLogScreen, full SettingsStack sub-screens |
| M10 | Items 31–32: subscription, T&C | SubscriptionCard, TnCScreen, ContactScreen |
| M11 | Items 3–4 extended: customer, inventory endpoints | CustomerStack, InventoryScreen, PrintTemplateScreen |
| M12 | Items 33–39: bank QR, account delete, app version, gold prices, password reset | SplashScreen, ForceUpdateScreen, ForgotPasswordScreen, BankTransferQRSheet, GoldPriceScreen, DeleteAccountScreen, OfflineBanner, Language selector, first-use empty states |
| M13 | Items 40–51: categories, bank accounts, logo, loyalty, product visibility, feedback | CategoryListScreen, BankAccountListScreen, logo upload in ShopInfoScreen, points redemption at Checkout, product hide/show, FeedbackScreen, NotificationPreferencesScreen, receipt reprint on OrderDetail |
| M14 | Item 52: `GET /api/customers/recent` | UX polish: remember payment method, "Đúng tiền" button, checkout error recovery, double-tap prevention, adaptive POS grid + toggle, quick order note phrases, background PIN lock timeout, notification bell in AppStack header, recent customers at checkout, "Hôm qua" period chip, QR bank memory, sellingStore view memory, expense category frequency ordering |
| M15 | — | Google OAuth, Apple Sign In |

---

## UX Improvements (US-132–147)

These 14 improvements reduce friction and speed up common actions. All planned in M14.

### AsyncStorage Keys (UX-specific)
| Key | Type | Used by |
|---|---|---|
| `last_payment_method` | `'CASH' \| 'TRANSFER' \| 'CARD'` | CheckoutScreen, Quick Checkout sheet |
| `pos_grid_columns` | `2 \| 3` | POSMainScreen |
| `lock_timeout_minutes` | `1 \| 5 \| 15 \| null` | SecurityScreen, AppState listener |
| `last_qr_bank_id` | `string` | BankTransferQRSheet |
| `expense_category_counts` | `Record<string, number>` | AddExpenseSheet SuggestionChips |

### Background PIN Lock
`AppState` change listener in RootNavigator. When app goes to background: save timestamp to `AsyncStorage('backgroundTimestamp')`. On foreground: diff vs configured `lock_timeout_minutes`. If exceeded + PIN enabled → navigate to PinLoginScreen. If `lock_timeout_minutes = null` → never auto-lock. Default: null (never), user-configurable in SecurityScreen.

### Adaptive POS Grid
Auto-detect: `width < 390` → 2 cols; `width ≥ 390` → 3 cols. Manual toggle button (▦ icon) in POSMainScreen header persists choice to `AsyncStorage('pos_grid_columns')` and overrides auto-detect for session. Persisted value survives app restarts.

### Quick Order Note Phrases (KeyboardAccessoryView)
`SuggestionChips` above keyboard whenever note field is focused (in CheckoutScreen, Quick Checkout sheet, and OrderListScreen note). Default phrases configurable in POSConfigScreen — admin adds/removes. Stored in `shop_config`. Each chip tap inserts text (append if partial content, replace if empty). Uses `KeyboardAccessoryView` from `react-native-keyboard-controller` or `@flyerhq/react-native-keyboard-accessory-view`.

### Checkout Error Recovery
On `POST /api/orders` failure: do NOT clear cart or navigate away. Show sticky amber banner at top of CheckoutScreen: "Đặt hàng thất bại. [Thử lại]". "Thử lại" re-submits same payload. "Liên hệ hỗ trợ" link opens system dialer with SUPPORT.phone. Cart preserved until user explicitly clears it or order succeeds.

### Double-Tap Prevention
Any button that triggers a network request: disabled immediately on first tap + shows `ActivityIndicator`. Re-enabled only on response (success or error). Applies to: "Xác nhận thanh toán", "Bắt đầu sử dụng" (onboarding), "Gửi phản hồi", "Xóa tài khoản", Quick Checkout confirm, and all primary submit buttons. Use `useSubmitting` hook: `const [submitting, withSubmit] = useSubmitting()`.

### Notification Bell in App Header
`🔔` bell icon (with unread badge) placed in `AppStack` header (React Navigation's `headerRight`) so it appears on every main tab screen. Navigates to `NotificationScreen`. This replaces per-screen bell placement on HomeScreen.

### Recent Customers at Checkout
`GET /api/customers/recent?limit=5` returns last 5 customers who placed orders. Shown as `SuggestionChips` above the full customer search field at CheckoutScreen. Tap a chip → pre-fills customer. `staleTime: 60_000`.

## Known Remaining Gaps (not yet implemented)

These features are planned (in user stories) but not yet built:

### Mobile screens (stubs)
- **OfflineBanner** — `src/components/OfflineBanner.tsx` needs to be created; uses `@react-native-community/netinfo`; amber slide-in on disconnect + 503; rendered inside AuthNavigator + AppNavigator root
- **Notification bell header (US-139)** — `AppStack` `headerRight` currently absent; needs a `NotificationBell` component (badge count from `GET /notifications?unreadOnly=true`) added to each tab's `options.headerRight`
- **~33 stub screens remain** — onboarding stack, combo screens, inventory, print templates, gold prices, most settings sub-screens, report, feedback, notification preferences, etc.

### Fully implemented screens (as of 2026-05-11)
- **CustomerListScreen** — paginated FlatList, search, initials avatar, FAB → CustomerFormScreen
- **CustomerDetailScreen** — indigo header, stats bar (totalOrders/totalSpend/points from API), profile sections, recent orders list, edit/delete
- **CustomerFormScreen** — create + edit modes, 4 section cards (basic/social/prefs/id), gender toggle, phone conflict detection
- **OrderDetailScreen** — indigo header, sticky complete+cancel footer, payment icons, cash change display, cancellation card
- **POSScreen**, **DashboardScreen**, **ProfileScreen** — real implementations (previously mis-wired to stubs)

### Backend APIs still missing (not yet in Spring Boot backend)
| # | Endpoint | Status |
|---|---|---|
| 53 | `GET /api/customers/check-phone` | Mobile calls it; backend may need to add |
| 54 | `DELETE /api/customers/{id}` | Mobile calls it; backend may need to add |
| 55 | `PUT /api/orders/{id}/complete` | Mobile calls it; backend may need to add |
| 56 | `POST /api/orders/{id}/cancel` | Mobile calls it; backend may need to add |
| 57 | `DELETE /api/auth/pin` | Referenced by SecurityScreen; NOT in api.ts yet |
| 58 | `GET /api/shop-config` | Needed by ShopInfoScreen; NOT in api.ts yet |
| 59 | `PUT /api/shop-config` | Needed by ShopInfoScreen; NOT in api.ts yet |
| 60 | `GET /api/shop-config/pos-config` | Needed by POSConfigScreen; NOT in api.ts yet |
| 61 | `PUT /api/shop-config/pos-config` | Needed by POSConfigScreen; NOT in api.ts yet |

### api.ts type gaps
- `CheckoutRequest.customerId` typed as `number` — should be `string` (all IDs are UUID strings)
- `CheckoutRequest.redeemPoints?: boolean` — missing field needed for loyalty redemption (US-130)

### Fixed Bugs (2026-05-11)

| Bug | Fix |
|---|---|
| `POSScreen` orphaned — navigator pointed to 2-line stub | AppNavigator now imports `POSScreen` from `screens/pos/POSScreen.tsx` |
| `DashboardScreen` orphaned — Home tab used stub `HomeScreen` | AppNavigator now imports `DashboardScreen` from `screens/dashboard/DashboardScreen.tsx` |
| `ProfileScreen` orphaned — Settings `ProfileUpdate` route used stub | AppNavigator imports `ProfileScreen as ProfileUpdateScreen` from `screens/profile/ProfileScreen.tsx` |
| `setAuthenticated` left stale `tenant_id` in SecureStore when JWT `tenantId=null` | Now explicitly `deleteItemAsync('tenant_id')` when tenantId is null |
| Background PIN lock never fired — no default `lock_timeout_minutes` | Default is now 5 minutes when key not set in AsyncStorage |
| Soft update banner never shown — `latestVersion` from API was ignored | `RootNavigator` now reads `latestVersion`, renders `SoftUpdateBanner` (amber, dismissible) |
| `SellingScreen` unused import in AppNavigator | Removed |
| `CategoryNavigator` not exported from AppNavigator | Added `CategoryNavigator` export at end of `AppNavigator.tsx` |

## Backlog

- OTP phone verification
- Server-side onboarding draft (cross-device resume)
- Subscription expiry enforcement + upgrade/renewal flow
- Multi-shop tenant picker
- Change shop type post-registration
- `OTHER` shop type free-text custom name
- Push notifications (expo-notifications)
- Receipt sharing (expo-sharing)
- Barcode scanner for POS
- Order source analytics (WEB vs MOBILE split in Report)
- Combo-level sales analytics in Report top-products
- `ORDER_VIEW_ALL` sub-feature for staff scope limiting

**Why:** Decisions made across planning sessions 2026-05-10.
**How to apply:** Read before implementing any auth, onboarding, store, or screen work in tappy-pos/mobile. For per-screen design details read `project_mobile_screens.md`.
