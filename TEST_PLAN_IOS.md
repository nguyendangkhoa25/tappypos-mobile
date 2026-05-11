# iOS Manual Test Plan — TappyPOS Mobile

> Test device: iPhone (physical preferred for biometrics, Push, haptics).  
> Prerequisites: backend running at dev URL; at least one tenant seeded with products, categories, customers.  
> Legend: ✅ pass · ❌ fail · ⚠️ partial · — skipped

---

## 1. Auth flows

> **TypeScript type check** — run `npx tsc --noEmit` from `tappy-pos/mobile/`  
> Last run: 2026-05-11 · Result: ✅ **0 errors** (all 7 auth screens compile clean)  
> Auth screens (all real implementations, not stubs):  
> ShopIdScreen (147 lines) · LoginScreen (214) · PinLoginScreen (226) · PinSetupScreen (119) · RegisterScreen (248) · ForgotPasswordScreen (145) · ForgotPinScreen (155)

### 1.1 Shop ID screen
| # | Step | Expected | Status |
|---|------|----------|--------|
| A01 | Launch cold app | ShopIdScreen is shown | — |
| A02 | Submit empty field | Button disabled / no API call | — |
| A03 | Enter unknown tenant ID | Inline error "Không tìm thấy cửa hàng" below input (no alert modal) | — |
| A04 | Enter suspended tenant ID | Alert "Cửa hàng đã bị khoá" with support contact | — |
| A05 | Enter valid tenant ID | Navigates to LoginScreen; tenant name shown read-only | — |
| A06 | Kill & relaunch with stored tenant | Goes directly to PinLoginScreen (if PIN enabled) or LoginScreen | — |

### 1.2 Login (phone + password)
| # | Step | Expected | Status |
|---|------|----------|--------|
| A07 | Submit empty phone/password | Inline validation errors shown | — |
| A08 | Wrong credentials | Inline error below password field | — |
| A09 | 5 consecutive wrong passwords | Account locked message | — |
| A10 | Device conflict (same account logged in elsewhere) | **Code**: 409 → auto force-login without confirmation modal (no "Đăng nhập bắt buộc" dialog — login proceeds immediately) | — |
| A11 | Force login | Evicts other session; user enters app | — |
| A12 | Correct credentials, PIN not set | Navigates to PinSetupScreen | — |
| A13 | Correct credentials, PIN set | Navigates to PinLoginScreen | — |
| A14 | Tap "Quên mật khẩu?" | Goes to ForgotPasswordScreen (phone pre-filled) | — |

### 1.3 PIN login
| # | Step | Expected | Status |
|---|------|----------|--------|
| A15 | Enter wrong PIN | Remaining attempts count shown | — |
| A16 | 5 wrong PINs | 30-min lockout timer displayed | — |
| A17 | Enter correct PIN | Enters app; Dashboard shown | — |
| A18 | Biometric prompt fires on open (if enrolled) | Biometric sheet appears; success logs in | — |
| A19 | Tap "Đăng nhập bằng mật khẩu" | Goes to LoginScreen | — |
| A20 | Tap "Quên PIN" | Goes to ForgotPinScreen | — |

### 1.4 PIN setup (first time)
| # | Step | Expected | Status |
|---|------|----------|--------|
| A21 | Enter 6-digit PIN | Confirmation step shown | — |
| A22 | Confirm with different PIN | Shake animation + clear + error hint "PIN không khớp" | — |
| A23 | Confirm with matching PIN | PIN saved; enters app | — |
| A24 | Tap "Bỏ qua" (first setup only) | Skips PIN; proceeds to app | — |

### 1.5 Register
> TypeScript: ✅ 0 errors · Last run: 2026-05-11

| # | Step | Expected | Status |
|---|------|----------|--------|
| A25 | Navigate to RegisterScreen | Phone + Password + Confirm Password fields + T&C checkbox shown | ✅ code |
| A26 | Tap "Đăng ký" with empty fields | "Đăng ký" button disabled (`canSubmit = false`) until all 3 fields filled + T&C accepted | ✅ code |
| A26b | Enter password < 8 chars → submit | Inline error "Mật khẩu phải có ít nhất 8 ký tự" | ✅ code |
| A26c | Mismatched confirm password → submit | Inline error "Mật khẩu xác nhận không khớp" | ✅ code |
| A26d | Submit without accepting T&C | `handleRegister` returns early; no API call | ✅ code |
| A26e | Tap "Điều khoản sử dụng" link | T&C modal slides up (pageSheet); scrolling to bottom auto-checks checkbox | ✅ code |
| A26f | Tap "Đồng ý & Đóng" in modal | Modal closes; checkbox checked | ✅ code |
| A27 | Phone already registered (409) | Inline error "Số điện thoại đã được đăng ký." + "Đăng nhập?" link → replaces to LoginScreen | ✅ code |
| A28 | Valid phone + strong password + T&C → submit | Spinner on button; `POST /auth/register`; navigates to PinSetupScreen (`isFirstSetup: true`) | — manual |
| A29 | "Đã có tài khoản? Đăng nhập" link | Navigates to LoginScreen | ✅ code |

### 1.6 Forgot password / Forgot PIN
| # | Step | Expected | Status |
|---|------|----------|--------|
| A29 | ForgotPasswordScreen — enter phone → submit | **MVP**: success message "Chúng tôi sẽ liên hệ trong vòng 24 giờ."; support contacts always visible below (⚠️ OTP flow is Phase 2, not MVP) | — |
| A30 | ForgotPinScreen — step 1: verify password | Correct password advances to PIN entry step | — |
| A31 | ForgotPinScreen — step 2: enter + confirm new PIN | Matching PIN saved; navigates back to PinLoginScreen | — |

---

## 2. Onboarding

> ⚠️ **ALL STUBS** — ShopTypeScreen, Step1Screen–Step4Screen are all 2-line placeholder components. These tests cannot be executed until screens are implemented.

| # | Step | Expected | Status |
|---|------|----------|--------|
| O01 | First login with no shop data | ShopTypeScreen shown | ⚠️ stub |
| O02 | Select shop type | Navigates to Step1 | ⚠️ stub |
| O03 | Complete Steps 1–4 with valid inputs | Each step advances; Step4 completion enters app | ⚠️ stub |
| O04 | Back button on each step | Returns to previous step | ⚠️ stub |
| O05 | Submit Step with missing required field | Validation error; cannot advance | ⚠️ stub |

---

## 3. Bottom navigation tabs

> ⚠️ Note: HomeScreen, SellingScreen (tab entry point) and ExpensesScreen/ReportScreen are stubs. Tab bar structure is wired but most content tabs show placeholder text.

| # | Step | Expected | Status |
|---|------|----------|--------|
| N01 | All 6 tabs visible (Home, Bán hàng, Chi phí, Báo cáo, Tiện ích, Settings) | Tab bar renders correctly, safe-area respected | — manual |
| N02 | Active tab icon is green (#059669) | Correct tint colour | — manual |
| N03 | Switching tabs reuses cached data (no full reload) | React Query staleTime respected | — manual |

---

## 4. Dashboard (Home tab)

> ✅ **Real** — DashboardScreen (181 lines): KPI cards with period selector, Skeleton loading, pull-to-refresh, ErrorState/EmptyState, recent 5 orders.

| # | Step | Expected | Status |
|---|------|----------|--------|
| D01 | Open Dashboard | KPI cards load (doanh thu, đơn hàng, khách hàng) | ✅ code |
| D02 | Toggle Hôm nay / Tuần này / Tháng này | KPI values update per preset | ✅ code |
| D03 | Pull-to-refresh | Refetches both KPI and recent orders | ✅ code |
| D04 | KPI fetch error | ErrorState shown with retry button | ✅ code |
| D05 | Recent orders list — tap an order | OrderDetail screen opens | ✅ code |
| D06 | Recent orders empty | EmptyState shown (not blank screen) | ✅ code |
| D07 | Loading state | Skeleton placeholders shown | ✅ code |

---

## 5. Selling — POS flow (critical path)

### 5.1 POS product list
> ✅ **Real** — `pos/POSScreen.tsx` (187 lines): product grid 2-col, debounced search (300ms), category chip filter, cart badge, haptic on add-to-cart, EmptyState/ErrorState, Skeleton.  
> ⚠️ Note: `selling/POSMainScreen.tsx` is a 2-line stub — the actual POS is `pos/POSScreen.tsx`.

| # | Step | Expected | Status |
|---|------|----------|--------|
| P01 | Open Bán hàng tab | POSScreen loads; product grid shown | ✅ code |
| P02 | Category filter bar visible | Scrollable horizontal chips | ✅ code |
| P03 | Tap a category | Grid filters to matching products | ✅ code |
| P04 | Search by product name | Debounced (300 ms); matching products shown | ✅ code |
| P05 | Clear search | Full list restored | ✅ code |
| P06 | Tap a product | Item added to cart; haptic feedback | ✅ code |
| P07 | Tap same product again | Quantity increments in cart badge | ✅ code |
| P08 | Cart badge count shown in header | Correct total item count | ✅ code |
| P09 | Product list error | ErrorState shown | ✅ code |
| P10 | No products match search | EmptyState shown | ✅ code |

### 5.2 Cart
> ✅ **Real** — `pos/CartScreen.tsx` (145 lines): FlatList, inline qty steppers (trash icon at qty=1), confirm dialog on remove, discount section, checkout button.

| # | Step | Expected | Status |
|---|------|----------|--------|
| P11 | Open cart from POS | CartScreen shows added items | ✅ code |
| P12 | Increase/decrease quantity | Total updates live | ✅ code |
| P13 | Remove an item (qty=1 → trash icon) | Alert.alert confirm dialog; item removed on confirm | ✅ code |
| P14 | Empty cart | EmptyState; "Bắt đầu bán hàng" CTA | ✅ code |
| P15 | Tap "Thanh toán" | Navigates to CheckoutScreen | ✅ code |
| P16 | Back to POS from Cart | Cart state preserved | ✅ code |

### 5.3 Checkout
> ✅ **Real** — `pos/CheckoutScreen.tsx` (239 lines): 4-step server flow (init → addItems → applyPromo → checkout), 3 payment method cards, promo code input, cash change calculator.

| # | Step | Expected | Status |
|---|------|----------|--------|
| P17 | CheckoutScreen shows order summary | Items, subtotal, total correct; 3 payment method cards shown | ✅ code |
| P18 | Select payment method | Selected card highlighted; cash method shows amount paid + change fields | ✅ code |
| P19 | Enter promo code | Applied via applyPromo API step; discount reflected in total | ✅ code |
| P20 | Confirm order | 4-step server flow completes; navigates to OrderSuccess | ✅ code |
| P21 | Network error during confirm | Alert shown; stays on Checkout | ✅ code |

### 5.4 Order success
> ✅ **Real** — `pos/OrderSuccessScreen.tsx` (41 lines): shows order number + total; single "Đơn hàng mới" button → popToTop.  
> ⚠️ Note: there is **no "Xem đơn hàng" button** in the current implementation — P24 is not implemented.

| # | Step | Expected | Status |
|---|------|----------|--------|
| P22 | OrderSuccessScreen rendered | Order number, total displayed | ✅ code |
| P23 | Tap "Đơn hàng mới" | Returns to POSMain via popToTop; cart cleared | ✅ code |
| P24 | Tap "Xem đơn hàng" | Opens OrderDetail | ⚠️ not implemented |

### 5.5 Order list & detail
> ✅ **Real** — `orders/OrderListScreen.tsx` (196 lines): pagination accumulator, status filter chips, search, infinite scroll.  
> ✅ **Real** — `orders/OrderDetailScreen.tsx` (340 lines): 4 white cards, sticky footer with complete+cancel actions, `queryClient.setQueryData` on success.

| # | Step | Expected | Status |
|---|------|----------|--------|
| P25 | OrderListScreen — list loads | Orders shown with status badge colours; filter chips work | ✅ code |
| P26 | Tap an order | OrderDetailScreen opens | ✅ code |
| P27 | OrderDetail — all fields render | Items, amounts, status, created time, payment method | ✅ code |
| P28 | OrderDetail PENDING/PROCESSING — "Hoàn thành" button | completeMutation fires; status updates to COMPLETED | ✅ code |
| P29 | OrderDetail PENDING/PROCESSING — "Huỷ đơn" button | Alert confirm → cancelMutation fires; status updates to CANCELLED | ✅ code |
| P30 | OrderDetail COMPLETED/CANCELLED | No action footer shown | ✅ code |

---

## 6. Expenses tab

> ⚠️ **STUB** — `main/ExpensesScreen.tsx` is a 2-line placeholder. All E-tests are blocked.

| # | Step | Expected | Status |
|---|------|----------|--------|
| E01 | Open Chi phí tab | Screen loads; expense list or empty state | ⚠️ stub |
| E02 | Add new expense | Form shown; submit creates record | ⚠️ stub |
| E03 | Pull-to-refresh | List refreshes | ⚠️ stub |

---

## 7. Report tab

> ⚠️ **STUB** — `main/ReportScreen.tsx` is a 2-line placeholder. All R-tests are blocked.

| # | Step | Expected | Status |
|---|------|----------|--------|
| R01 | Open Báo cáo tab | Report screen loads | ⚠️ stub |
| R02 | Date range picker | Changing range updates report data | ⚠️ stub |
| R03 | Loading state | Skeleton or spinner | ⚠️ stub |
| R04 | Error state | Retry visible | ⚠️ stub |

---

## 8. Tools tab

> ✅ **All tools screens are real implementations** — UtilitiesScreen + 7 calculators (Currency, Interest, Loan, Tax, BillSplitter, BudgetRule, Breakeven). All offline, no backend calls except CurrencyConverter.

### 8.0 Utilities hub
> ✅ **Real** — `tools/UtilitiesScreen.tsx` (147 lines): 2 groups, 7 cards in 47.5% grid layout.

| # | Step | Expected | Status |
|---|------|----------|--------|
| T01 | Open Tiện ích tab | UtilitiesScreen shows 2 groups, 7 cards in correct layout | ✅ code |
| T02 | All card icons and titles render | No missing translations | ✅ code |
| T03 | Tap each card | Navigates to correct screen | ✅ code |
| T04 | Back arrow on every tool screen | Returns to UtilitiesHub | ✅ code |

### 8.1 Currency Converter
> ✅ **Real** — `tools/CurrencyConverterScreen.tsx` (345 lines): VCB live rates via `utilitiesApi.getExchangeRates()`, region-default currency, custom rate toggle, direction toggle, error state with manual fallback.

| # | Step | Expected | Status |
|---|------|----------|--------|
| T05 | Open Currency Converter | Loading skeletons shown; rates load from VCB via backend | ✅ code |
| T06 | Currency chips displayed (USD, EUR, JPY…) | Region-default currency pre-selected | ✅ code |
| T07 | Tap a currency | Rate card updates to show Buy/Transfer/Sell | ✅ code |
| T08 | Last-updated timestamp shown | "Cập nhật lúc HH:mm · VCB" | ✅ code |
| T09 | Enter amount (FCY → VND) | Result card shows buy/transfer/sell rows | ✅ code |
| T10 | Toggle direction to VND → FCY | Result inverts; amount label changes | ✅ code |
| T11 | Tap pencil icon → custom rate toggle | TextInput with pre-filled rate appears | ✅ code |
| T12 | Enter custom rate | "1 USD = X VND" preview shown below | ✅ code |
| T13 | Calculate with custom rate | Result row labelled "Kết quả (tùy chỉnh)" | ✅ code |
| T14 | Deselect custom rate | Live rate card restored | ✅ code |
| T15 | API error state | "Không tải được tỷ giá · Thử lại" shown; manual rate input visible | ✅ code |
| T16 | Manual rate in error state + amount | Calculates correctly with custom rate | ✅ code |
| T17 | Retry button | Triggers refetch | ✅ code |

### 8.2 Interest Calculator
> ✅ **Real** — `tools/InterestCalculatorScreen.tsx` (203 lines): simple + compound, period table (monthly ≤12mo, yearly >12mo).

| # | Step | Expected | Status |
|---|------|----------|--------|
| T18 | Simple interest toggle | Total interest = P × R × T | ✅ code |
| T19 | Compound interest toggle | Compound formula applied; period table shown | ✅ code |
| T20 | Period table — >12 months | Yearly summary rows | ✅ code |
| T21 | Period table — ≤12 months | Monthly rows | ✅ code |
| T22 | Zero / empty input | No result shown; no crash | ✅ code |

### 8.3 Loan Calculator
> ✅ **Real** — `tools/LoanCalculatorScreen.tsx` (238 lines): reducing balance + EMI, >30% income warning, 6-row preview + expand, `compactMoney()` formatting.

| # | Step | Expected | Status |
|---|------|----------|--------|
| T23 | Reducing balance method | Payment schedule correct | ✅ code |
| T24 | EMI (equal instalment) method | Fixed monthly payment correct | ✅ code |
| T25 | Income field → >30% warning | Warning text shown in red | ✅ code |
| T26 | Preview 6 rows; tap "Xem thêm" | Full table expands | ✅ code |
| T27 | Summary row totals | Total interest + principal = total paid | ✅ code |

### 8.4 Tax Calculator (TNCN 2026)
> ✅ **Real** — `tools/TaxCalculatorScreen.tsx` (341 lines): 7 progressive brackets, 4 regions (I-IV), SI override, custom personal/dependent deductions, active bracket highlighting.

| # | Step | Expected | Status |
|---|------|----------|--------|
| T28 | Enter gross salary | BHXH 8%, BHYT 1.5%, BHTN 1% auto-calculated | ✅ code |
| T29 | Regional cap applied | SI capped at correct ceiling per region | ✅ code |
| T30 | Override SI toggle | Custom SI input accepted; overrides auto calc | ✅ code |
| T31 | Add/remove dependants | Each deduction of 4.4M applied | ✅ code |
| T32 | Progressive tax brackets | Tax rows sum to correct total TNCN; active bracket highlighted | ✅ code |
| T33 | Net salary = gross − SI − TNCN − other deductions | Correct | ✅ code |

### 8.5 Bill Splitter
> ✅ **Real** — `tools/BillSplitterScreen.tsx` (71 lines): MoneyInput, +/− stepper (MIN=2, MAX=20), ceil rounding, result shown when total > 0.

| # | Step | Expected | Status |
|---|------|----------|--------|
| T34 | Default 2 people | Amount per person = ⌈total/2⌉ | ✅ code |
| T35 | Increase to 20 people | Stepper capped at 20 | ✅ code |
| T36 | Decrease below 2 | Stepper capped at 2 | ✅ code |
| T37 | Fractional total | Ceil rounding applied | ✅ code |

### 8.6 Budget Rule
> ✅ **Real** — `tools/BudgetRuleScreen.tsx` (117 lines): 50/30/20 (3 buckets) + 6 Jars (6 buckets), segment toggle, progress bars, hint and disclaimer banners.

| # | Step | Expected | Status |
|---|------|----------|--------|
| T38 | 50/30/20 rule selected | 3 buckets with correct percentages | ✅ code |
| T39 | 6 Jars selected | 6 buckets shown | ✅ code |
| T40 | Enter monthly income | Each bucket shows amount and progress bar | ✅ code |
| T41 | Zero income | Bars empty; no crash | ✅ code |

### 8.7 Breakeven Analyzer
> ✅ **Real** — `tools/BreakevenScreen.tsx` (190 lines): 2 named options (upfront + monthly), breakeven months calc, 10-year cost comparison, "cheaper" verdict with savings amount.

| # | Step | Expected | Status |
|---|------|----------|--------|
| T42 | Fill option A and B | Breakeven month displayed (years + months formatted) | ✅ code |
| T43 | Option A always cheaper | "Không có điểm hoà vốn" message | ✅ code |
| T44 | Breakeven > 10 years | 10-year verdict shows correct cheaper option + savings | ✅ code |
| T45 | Missing required field | No result shown | ✅ code |

---

## 9. Overflow / modal stacks (accessed from overflow menu / hub)

### 9.1 Products
> ✅ **Real** — `products/ProductListScreen.tsx` (175 lines): 2-col grid, search + debounce, category filter chips, stock badge.  
> ✅ **Real** — `products/ProductDetailScreen.tsx` (138 lines): price, unit, stock, description, add-to-cart FAB with haptic.

| # | Step | Expected | Status |
|---|------|----------|--------|
| M01 | ProductListScreen loads | Product cards shown (2-col grid); search and filter chips visible | ✅ code |
| M02 | Tap product | ProductDetailScreen opens | ✅ code |
| M03 | Product detail — all attributes rendered | Category, unit, stock level, description; "Theo giá vàng" badge for dynamic-price products | ✅ code |
| M03b | Tap "Thêm vào giỏ" on product detail | Item added to cart; haptic; navigates back | ✅ code |

### 9.2 Categories
> ⚠️ **STUB** — `products/CategoryListScreen.tsx` is a 2-line placeholder.

| # | Step | Expected | Status |
|---|------|----------|--------|
| M04 | CategoryListScreen loads | Category list shown | ⚠️ stub |

### 9.3 Inventory
> ⚠️ **STUB** — `inventory/InventoryListScreen.tsx` is a 2-line placeholder.

| # | Step | Expected | Status |
|---|------|----------|--------|
| M05 | InventoryListScreen loads | Stock levels shown | ⚠️ stub |

### 9.4 Customers
> ✅ **Real** — `customers/CustomerListScreen.tsx` (201 lines): paginated FlatList, search, initials avatar, FAB → CustomerFormScreen.  
> ✅ **Real** — `customers/CustomerDetailScreen.tsx` (273 lines): header with stats, profile sections, recent 5 orders, edit + delete actions.  
> ✅ **Real** — `customers/CustomerFormScreen.tsx` (482 lines): create/edit, 4 section cards, gender toggle, phone conflict detection.

| # | Step | Expected | Status |
|---|------|----------|--------|
| M06 | CustomerListScreen loads | Customer cards with name, phone, stats | ✅ code |
| M06b | Search customers | Debounced search; results update | ✅ code |
| M07 | Tap customer | CustomerDetailScreen opens with header stats + orders | ✅ code |
| M07b | Delete customer from detail | Alert confirm → deleteMutation → goBack + cache invalidated | ✅ code |
| M07c | Edit customer from detail | CustomerFormScreen opens pre-filled | ✅ code |
| M07d | FAB on list → CustomerFormScreen | Create mode shown (blank form, autoFocus on name) | ✅ code |
| M07e | Phone conflict on form blur | Alert with existing customer name; option to clear or continue | ✅ code |

### 9.5 Combos
> ⚠️ **STUB** — `combos/ComboListScreen.tsx` and `combos/ComboEditScreen.tsx` are 2-line placeholders.

| # | Step | Expected | Status |
|---|------|----------|--------|
| M08 | ComboListScreen loads | Combos shown | ⚠️ stub |
| M09 | Tap Edit | ComboEditScreen opens; fields editable | ⚠️ stub |
| M10 | Save combo | Persisted; navigates back | ⚠️ stub |

### 9.6 Print templates
> ⚠️ **STUB** — `print/PrintTemplateListScreen.tsx` and `print/PrintTemplateDetailScreen.tsx` are 2-line placeholders.

| # | Step | Expected | Status |
|---|------|----------|--------|
| M11 | PrintTemplateListScreen | Templates listed | ⚠️ stub |
| M12 | Tap template | PrintTemplateDetailScreen opens | ⚠️ stub |

### 9.7 Gold price
> ⚠️ **STUB** — `gold/GoldPriceScreen.tsx` is a 2-line placeholder.

| # | Step | Expected | Status |
|---|------|----------|--------|
| M13 | GoldPriceScreen loads | Buy/sell gold prices displayed | ⚠️ stub |

---

## 10. Settings sub-screens

> ⚠️ **ALL STUBS** — Every dedicated settings screen is a 2-line placeholder: SettingsScreen, ShopInfoScreen, SecurityScreen, ChangePasswordScreen, ProfileUpdateScreen, POSConfigScreen, DisplayScreen, NotificationPreferencesScreen, ActivityLogScreen, FeedbackScreen, FeedbackHistoryScreen, BankAccountsScreen, DefaultExpensesScreen, SubscriptionScreen, DeleteAccountScreen, TnCScreen.  
> ✅ **Exception**: `profile/ProfileScreen.tsx` (271 lines) is REAL — covers logout, language toggle (VI/EN), and inline change password. These should be verified via Profile tab, not Settings.

| # | Screen | What to verify | Status |
|---|--------|----------------|--------|
| S01 | Profile Update | Edit fields; save persists | ⚠️ stub |
| S02 | Change Password (via ProfileScreen) | Old + new password; success alert; works inline in Profile tab | ✅ code |
| S03 | Shop Info | Shop name, address, phone editable | ⚠️ stub |
| S04 | POS Config | Mode toggle and other POS settings | ⚠️ stub |
| S05 | Default Expenses | Add/remove default expense categories | ⚠️ stub |
| S06 | Security | PIN change; biometric toggle | ⚠️ stub |
| S07 | Display | Language switch (VI/EN); verify UI re-renders | ⚠️ stub (but language toggle works in ProfileScreen) |
| S08 | Terms & Conditions | TnC content loads; scrollable | ⚠️ stub |
| S09 | Activity Log | Log entries load; timestamps correct | ⚠️ stub |
| S10 | Notification Preferences | Toggle per-type; persists | ⚠️ stub |
| S11 | Feedback | Submit feedback form | ⚠️ stub |
| S12 | Feedback History | Past submissions listed | ⚠️ stub |
| S13 | Subscription | Plan info shown | ⚠️ stub |
| S14 | Bank Accounts | List and add bank accounts | ⚠️ stub |
| S15 | Delete Account | Requires confirmation; destructive flow | ⚠️ stub |

---

## 11. Cross-cutting / non-functional

> Note: X-tests apply only to **real** screens. Skip for stub screens (Onboarding, Settings sub-screens, Expenses, Reports, Combos, Inventory, etc.).

| # | Area | What to verify |
|---|------|---------------|
| X01 | Safe area | No content hidden behind notch/home indicator on any screen |
| X02 | Keyboard avoidance | Input fields scroll into view when keyboard opens |
| X03 | Pull-to-refresh | Works on all list screens |
| X04 | Empty states | Every list screen shows an EmptyState when data is empty |
| X05 | Error states | Every data-fetching screen shows ErrorState + retry on network failure |
| X06 | Loading skeletons | Skeleton components shown during initial fetch |
| X07 | Haptics | Adding to cart triggers haptic; no crash on devices with no haptic engine |
| X08 | Token refresh | After 24 h of background, next action silently refreshes token |
| X09 | Logout | Clears SecureStore, authStore, cartStore; returns to ShopIdScreen |
| X10 | Language switch (VI ↔ EN) | All visible strings update immediately without restart |
| X11 | Offline / no internet | Network errors handled gracefully; no blank screens |
| X12 | Back gesture (swipe from edge) | Works on every screen without unexpected navigation jumps |
| X13 | Landscape orientation | Layout does not break (or is locked to portrait intentionally) |
| X14 | VoiceOver accessibility | Interactive elements reachable; labels meaningful |
| X15 | Large text (Accessibility → Display) | Layout does not overflow or clip |

---

## 12. Regression checklist after each release

> **Implementation status summary** (as of 2026-05-11):  
> ✅ Real: Auth (7 screens) · Dashboard · POSScreen · Cart · Checkout · OrderSuccess · OrderList · OrderDetail · CustomerList/Detail/Form · ProductList/Detail · Profile · 7 Tools screens  
> ⚠️ Stubs: Onboarding (5) · HomeScreen · SellingScreen · ExpensesScreen · ReportScreen · NotificationScreen · POSMainScreen · CategoryList · InventoryList · ComboList/Edit · PrintTemplates · GoldPrice · All settings sub-screens (15)

- [ ] **TypeScript**: `npx tsc --noEmit` → 0 errors before any release
- [ ] Full POS golden path: POS → add items → Cart → Checkout → OrderSuccess → back to POS
- [ ] Auth: ShopId → Login → PIN setup → PIN login → biometric
- [ ] Auth: ForgotPin — password verification → new PIN → PinLogin
- [ ] Currency Converter: rates load, custom rate, both directions
- [ ] TNCN tax: standard salary scenario matches expected net
- [ ] Tab bar: all 6 tabs reachable; no JS error on mount
- [ ] Profile: language switch (VI/EN); inline change password; logout
- [ ] Customer: create → search → view detail → edit → delete
- [ ] Order detail: complete action + cancel action from PENDING status
