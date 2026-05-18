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
├── ShopTypeScreen         ← grouped sections + 2-col grid, required (redesigned 2026-05-14)
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

## More Tab Items & Feature Gating

`MoreScreen` renders two grid sections + a full-width Settings row. Items with no `has()` guard are **always visible in the UI** — but their backend controllers still require a feature; missing it produces a 403 error.

**Section 1 — Quản lý (always-visible grid, no UI gate):**

| Item | UI gate | Backend feature required | 403 if missing? |
|---|---|---|---|
| 📦 Sản phẩm | None | `PRODUCT` | Yes |
| 🏭 Tồn kho | None | `INVENTORY` | Yes |
| 👥 Khách hàng | None | `CUSTOMER` | Yes |
| 🎁 Combo | None | `POS` | Yes |
| 🏷️ Danh mục | None | `PRODUCT` | Yes |
| 🖨️ Mẫu in | None | `PRINT_TEMPLATE` | Yes |
| 👤 Nhân viên | `has('USER')` | `USER` | Hidden |

**Section 2 — Vận hành (feature-gated grid):**

| Item | UI gate | Backend feature required | 403 if missing? |
|---|---|---|---|
| 💰 Giá vàng | `has('GOLD_PRICE') \|\| has('PAWN')` | `GOLD_PRICE` / `PAWN` | Hidden |
| 📋 Công việc của tôi | None | `MY_WORK` | Yes |
| 👁 Xem hàng đợi | `has('ORDER_VIEW_ALL')` | `ORDER_VIEW_ALL` | Hidden |
| 📊 Hiệu suất nhân viên | `has('ORDER_VIEW_ALL')` | `ORDER_VIEW_ALL` | Hidden |
| 📅 Lịch hẹn | `has('APPOINTMENT')` | `APPOINTMENT` | Hidden |
| 🔔 Thông báo | `has('NOTIFICATION')` | `NOTIFICATION` | Hidden |

> **Rule:** if an item has no UI gate, the feature must be in the tenant's JWT or the screen throws a 403 error on first API call. Always-visible items must always be in the effective feature intersection.

---

## Shop-Type Feature Matrix

### Service shops (Barber / Beauty)

Applies to: `BARBER_SHOP`, `BARBER_SHOP_MEN`, `HAIR_SALON`, `NAIL_SHOP`, `LASH_PMU_STUDIO`, `SPA_SHOP`, `MASSAGE_SHOP`, `BEAUTY_CLINIC`, `MAKEUP_STUDIO`.

All use the shared `serviceBase` tenant feature list.

**Tenant features (`serviceBase` in `OnboardingController`):**
```
DASHBOARD, ORDER, ORDER_VIEW_ALL, MY_WORK, PRODUCT, POS,
CUSTOMER, LOYALTY, COMMISSION, EMPLOYEE, SALARY, EXPENSE,
REVENUE, USER, APPOINTMENT, NOTIFICATION, FEEDBACK,
ACTIVITY_LOG, SHOP_INFO, PRINT_TEMPLATE, BANK_ACCOUNT,
INVOICE, ACCOUNTING, INVENTORY
```

**SHOP_OWNER role features (`TenantProvisioningService.ROLE_FEATURES`):**
```
DASHBOARD, ORDER, ORDER_VIEW_ALL, MY_WORK, PRODUCT, PROMOTION,
EMPLOYEE, SALARY, CUSTOMER, LOYALTY, INVOICE, ACCOUNTING, REVENUE, EXPENSE,
USER, SHOP_INFO, PRINT_TEMPLATE, BANK_ACCOUNT, VENDOR, INVENTORY, POS,
ACTIVITY_LOG, PAWN, COMMISSION, NOTIFICATION, FEEDBACK, APPOINTMENT
```

**Effective JWT features (tenant ∩ role — what the user actually gets):**

| Feature | In JWT? | What breaks if missing |
|---|---|---|
| `DASHBOARD` | ✓ | Home tab + Report tab disappear |
| `POS` | ✓ | Sell tab disappears; Combo menu + Cart APIs 403 |
| `ORDER` | ✓ | Sell tab disappears; order list 403 |
| `ORDER_VIEW_ALL` | ✓ | Queue View + Staff Performance hidden (by design) |
| `PRODUCT` | ✓ | Products + Categories menus 403 |
| `CUSTOMER` | ✓ | Customers menu 403 |
| `LOYALTY` | ✓ | Loyalty endpoints 403 on customer screen |
| `INVENTORY` | ✗ not in serviceBase | Inventory menu hidden (UI gate in MoreScreen) — service shops don't track product stock; master admin can grant on request |
| `APPOINTMENT` | ✓ | Appointments hidden from More (key feature for these shops) |
| `MY_WORK` | ✓ | My Work menu 403 |
| `PRINT_TEMPLATE` | ✓ | Print Templates menu 403 |
| `EMPLOYEE` | ✓ | Employee management 403 |
| `SALARY` | ✓ | Salary management 403 |
| `COMMISSION` | ✓ | Commission on checkout 403 |
| `EXPENSE` | ✓ | Expenses tab API 403 |
| `REVENUE` | ✓ | Report screen revenue data 403 |
| `USER` | ✓ | Staff menu hidden (by design — has UI gate) |
| `NOTIFICATION` | ✓ | Notifications hidden (by design — has UI gate) |
| `SHOP_INFO` | ✓ | Settings → Shop Info 403 |
| `PRINT_TEMPLATE` | ✓ | Print Templates 403 |
| `BANK_ACCOUNT` | ✓ | Settings → Bank Accounts 403 |
| `INVOICE` | ✓ | Invoice endpoints 403 |
| `ACCOUNTING` | ✓ | Accounting tab 403 |
| `ACTIVITY_LOG` | ✓ | Activity Log in Settings 403 |
| `FEEDBACK` | ✓ | Feedback submission 403 |
| `PROMOTION` | ✗ not in serviceBase | (not needed for service shops) |
| `VENDOR` | ✗ not in serviceBase | (not needed for service shops) |
| `PAWN` | ✗ not in serviceBase | (not needed) |
| `GOLD_PRICE` | ✗ not in serviceBase | (not needed) |

> **MoreScreen UI gates summary:** `USER`, `GOLD_PRICE`/`PAWN`, `ORDER_VIEW_ALL` (×2), `APPOINTMENT`, `NOTIFICATION`, and now **`INVENTORY`** are all conditionally rendered. Any feature not gated in UI but required by backend will 403 on first API call — avoid this pattern for new features.

### Login flow — how tenant is resolved (no X-Tenant-ID required)

The mobile app **never sends `X-Tenant-ID` on login or token refresh**. Username is unique across the platform; the backend auto-detects the tenant:

1. `POST /api/auth/login` arrives with no `X-Tenant-ID`.
2. Backend does a global user lookup (`ORDER BY tenant_id NULLS LAST`) — shop users come first, master users last.
3. If user has a `tenant_id`: backend restores `TenantContext`, then computes feature intersection using explicit `tenantId` bind param (not `current_tenant_id()` — that DB session var is NULL at this point).
4. If user has no `tenant_id` and has `MASTER_TENANT` or `AGENT` role: master login proceeds.
5. If user has no `tenant_id` and has only shop roles: **error 400 "Tài khoản chưa được liên kết với cửa hàng nào"** — never treated as master.

> **Critical backend gotcha:** `TenantRlsAspect` sets `app.current_tenant` once at `@Transactional` start. Mid-method calls to `tenantContext.setCurrentTenant()` update the ThreadLocal but NOT the DB session var. All role-feature queries in auth flows must use explicit `tenantId` bind params — see `RoleFeatureRepository.findActiveFeatureNamesByRoleNamesAndTenantId()`.

### Known issues fixed (2026-05-15)

| Issue | Root cause | Fix |
|---|---|---|
| Inventory menu → 403 for service shops | `INVENTORY` missing from `serviceBase` | Added `INVENTORY` to `serviceBase` in `OnboardingController` |
| Appointments hidden for barber/beauty owners | `APPOINTMENT` missing from `SHOP_OWNER` role | Added `APPOINTMENT` + `ORDER_VIEW_ALL` to `SHOP_OWNER` in `TenantProvisioningService.ROLE_FEATURES` |
| All tabs missing after login/refresh | Login without `X-Tenant-ID` → `TenantRlsAspect` set `app.current_tenant=NULL` → role-features query used `current_tenant_id()` → matched master roles only → empty JWT features | Backend: added `findActiveFeatureNamesByRoleNamesAndTenantId()` with explicit tenantId; `TenantFeatureService` uses it when tenant context is known |
| Orphaned shop user could get `isMasterUser: true` JWT | No guard when `user.tenantId == null` and user has shop role | Backend: `doAuthenticate()` + `refreshAccessToken()` now throw 400 if no tenant + no master/agent role |

> **Existing tenants provisioned before 2026-05-15** need a DB patch to add missing features + fresh login to get a new JWT.

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

Specific shop type IDs live in `mobile/src/utils/shopTypes.ts` (`SPECIFIC_SHOP_TYPES`). They map to backend `ShopType` enum codes. Groups shown on ShopTypeScreen:

| Group | Specific IDs (mobile) | Backend Code | Notes |
|---|---|---|---|
| FOOD | PHO_SHOP, RICE_SHOP, NOODLE_SHOP, BUN_BO, HOT_POT, BANH_MI, EATERY, RESTAURANT | `RESTAURANT` | — |
| DRINKS | CAFE, BUBBLE_TEA, JUICE_BAR | `COFFEE_SHOP` | — |
| GROCERY | GROCERY, MINI_MART | `CONVENIENCE_STORE` | INVENTORY feature |
| GROCERY | VEGETABLE_SHOP, MEAT_SHOP, BAKERY | `FOOD_BEVERAGE` | — |
| FASHION | CLOTHING, SHOE_SHOP, ACCESSORIES | `FASHION` | INVENTORY feature |
| BEAUTY | MENS_BARBER | `BARBER_SHOP_MEN` | ⚠️ was `BARBER_SHOP` (fixed 2026-05-14) |
| BEAUTY | HAIR_SALON | `HAIR_SALON` | ⚠️ was `BARBER_SHOP` (fixed 2026-05-14) |
| BEAUTY | NAIL_STUDIO | `NAIL_SHOP` | — |
| BEAUTY | SPA | `SPA_SHOP` | — |
| BEAUTY | LASH_PMU | `LASH_PMU_STUDIO` | New 2026-05-14 |
| BEAUTY | MASSAGE | `MASSAGE_SHOP` | New 2026-05-14 |
| BEAUTY | BEAUTY_CLINIC | `BEAUTY_CLINIC` | New 2026-05-14 |
| BEAUTY | MAKEUP_STUDIO | `MAKEUP_STUDIO` | New 2026-05-14 |
| HEALTH | PHARMACY, TRAD_MEDICINE | `PHARMACY` | — |
| GOLD | JEWELRY | `JEWELRY` | PAWN feature |
| GOLD | PAWN | `PAWN_SHOP` | PAWN feature |
| ELECTRONICS | PHONE_SHOP, COMPUTER_SHOP, APPLIANCES | `ELECTRONICS` | INVENTORY feature |
| SERVICES | CAR_WASH, LAUNDRY, PET_SHOP, FLOWER_SHOP, STATIONERY, GYM, OTHER | `OTHER` | — |

Backend `OnboardingController.PREFIX_MAP` assigns tenant ID prefixes (e.g. `barm` for BARBER_SHOP_MEN, `hair` for HAIR_SALON, `lash` for LASH_PMU_STUDIO, `mass` for MASSAGE_SHOP, `bcln` for BEAUTY_CLINIC, `mkup` for MAKEUP_STUDIO).

`getBackendCode(shopTypeId)` resolves any specific ID or broad backend code to the canonical backend code. All new beauty codes added to `BACKEND_CODE_MAP` for explicit pass-through.

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
| 0 | ShopTypeScreen | Grouped sections + 2-col grid (redesigned 2026-05-14) | No | shopTypeCode |
| 1 | Step1Screen | Nickname + Full name + Shop name + Address | No | nickname, shopName |
| 2 | Step2Screen | Product suggestion chips + add form (name/price/unit) | Yes | — |
| 3 | Step3Screen | Expense suggestion chips + add form (name/amount/type/date) | Yes | — |
| 4 | Step4Screen | Summary (collapse >3) + confirm → self-provision | No skip | — |

**Step 2:** suggestion chips from `GET /api/product-templates?shopTypeCode=` — tap to fill form; dynamic-price products show amber "Theo giá vàng" panel instead of price input. Chip labels locale-aware (`nameEn` in English). Form fill always uses Vietnamese `name` (becomes business data).

**Step 3:** suggestion chips from `GET /api/expense-suggestions?shopTypeCode=` — tap to fill form + captures API's `category` field into `selectedSuggestionCategory` state (replaces old hardcoded `EXPENSE_CATEGORY_MAP`). Payment day picker. Chip labels locale-aware (`nameEn` in English).
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
