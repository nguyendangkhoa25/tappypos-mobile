---
name: TappyPOS Mobile — Screen Design Details
description: Per-screen UI design decisions, layout, components used, and API calls for all tappy-pos/mobile screens. Read alongside project_mobile_plan.md.
type: project
originSessionId: df315ccb-2945-419c-9cbb-2eed88eab878
---

## Pre-Stack Screens (RootNavigator level)

### SplashScreen
Full-screen primary green `#059669` background. Logo centred + "TappyPOS" wordmark + animated 3-dot loader. Minimum display 600ms (prevents flash even on fast devices). Runs `authStore.hydrate()` + `userStore.hydrate()` in parallel + `GET /api/app/version`. On complete → RootNavigator resolves destination. No user interaction.

### ForceUpdateScreen
Full-screen, same green bg as Splash. Logo + "Cần cập nhật ứng dụng" title + current/latest version lines + "Cập nhật ngay" button → `Linking.openURL(Platform.OS === 'ios' ? APP_STORE_URL : PLAY_STORE_URL)`. Cannot dismiss — back gesture disabled. Shown when `currentVersion < minVersion` from `GET /api/app/version`.
Soft update: amber dismissible banner at top of HomeScreen when `currentVersion < latestVersion` but ≥ `minVersion`.

---

## Auth Screens

### ShopIdScreen
Entry point when no `tenant_id` in SecureStore. Logo + brand + `ClearableInput` for shop ID (auto-lowercase, strip whitespace) + "Tiếp tục" button + "Đăng ký miễn phí" link.
- Calls `GET /api/tenants/{shopId}/status` on submit
- ACTIVE → save tenant_id → LoginScreen
- SUSPENDED → `alertStore` with support message
- NOT_FOUND → inline error below input (no alert modal)

### LoginScreen
Shop name + ID shown read-only at top. "Đổi cửa hàng" link top-left (clears tenant_id → ShopIdScreen). Phone field auto-formats `0901 234 567`. Password field with 👁️ toggle. Google + Apple OAuth buttons. "Đăng ký ngay" link to RegisterScreen.
- 401 → inline error below password field
- 403 (locked) → `alertStore` with support contact

### RegisterScreen
Phone + password (`PasswordInput` with live strength bar + 5-rule checklist) + confirm password + T&C checkbox (checkbox auto-checks when user scrolls to bottom of T&C modal sheet). Google + Apple OAuth. "Đăng nhập" link.
- 409 (phone exists) → inline error with "Đăng nhập?" link
- Success → JWT tenantId=null → OnboardingStack

### PinSetupScreen
Custom numpad (not system keyboard). 6 dot indicators. Two-phase (enter → confirm). Mismatch → shake animation + clear + hint. `expo-haptics` on each digit. "Bỏ qua, thiết lập sau" link shown only on `isFirstSetup=true`.

### PinLoginScreen
Shop name + "Xin chào, {nickname}". 6 dot indicators + custom numpad. Biometric auto-prompts on mount if enabled. 5 wrong PINs → 30-min lockout with countdown. "Quên PIN?" → ForgotPinScreen. "Đổi cửa hàng" clears tenant_id.

### ForgotPinScreen
Two steps inline: (1) verify current password, (2) new PIN via same numpad UI as PinSetupScreen.

### ForgotPasswordScreen
Phone number `ClearableInput` (pre-filled from LoginScreen via `prefillPhone` param). "Gửi yêu cầu" → `POST /api/auth/password-reset/request`. Success state: "Chúng tôi sẽ liên hệ trong vòng 24 giờ." Support contacts (phone + email) always visible as fallback below the form.

---

## Onboarding Screens

Progress bar at top of every step: dot indicators + "Bước N / 4" label.

### ShopTypeScreen (Step 0)
3×3 grid of shop type cards (emoji + name). Selected: emerald border + checkmark overlay + light emerald bg. `OTHER` → free-text field appears below grid. Required — no skip.

### Step1Screen
Fields: Biệt danh* (`ClearableInput`, used in "Chào X 👋"), Họ và tên, Tên cửa hàng*, Địa chỉ. `ReturnKeyType="next"` chains focus. Saves to `onboardingStore.setStep1()` on each keystroke. Inline validation on "Tiếp tục" (no alert modals).

### Step2Screen
Template list from `GET /api/product-templates?shopTypeCode=`. Top 5 pre-checked with default prices. Checkbox → `MoneyInput` focuses. Unchecked rows have disabled price input. "Thêm sản phẩm khác" adds blank row. JEWELRY dynamic-price items show "Theo giá vàng" label. Skippable.

### Step3Screen
`SuggestionChips` (emoji + color, ordered by shop type commonness, reorder on input). Tap chip → adds as row with `MoneyInput` focused + chip disappears. `ClearableInput` for custom names. "Thêm chi phí khác" for free-form rows. Skippable.

### Step4Screen (Summary)
Three sections: shop info (edit link → Step1), products (edit link → Step2), expenses (edit link → Step3). Each list collapses at >3 items with "+ N khác ∨" toggle. Empty sections show "Chưa có… Thêm ngay →" tappable link.
- "Bắt đầu sử dụng" → button loading state → `POST /api/tenants/self-provision` → new JWT → `authStore.setAuthenticated` → `onboardingStore.reset()` → AppStack Home
- Error → `alertStore` with retry button

---

## Main App Screens

### HomeScreen (Overview)
**Header:** "Chào {nickname} 👋" + 👁️ privacy toggle. (🔔 bell moved to AppStack headerRight — see UX Improvements section.)
**Period chips:** Hôm qua / Hôm nay / Tuần / Tháng (no custom range — use Report for that). "Hôm qua" is second chip for quick last-day check.
**4 KPI cards (2×2):** Doanh thu, Đơn hàng, Chi phí, Lợi nhuận. Each shows trend vs prior equivalent period (↑ green / ↓ red / ─ gray). Privacy-aware.
**Trend bar chart:** BarChart component; granularity by period (hour/day); emerald bars; tap → tooltip.
**Subscription expiry banner:** amber, above greeting, when ≤ 30 days remaining; dismissible per session.
**Recent orders strip:** 3 rows; "Xem tất cả →" cross-tab navigates to Selling tab OrderList.
**Top products strip:** 3 rows; "Xem tất cả →" navigates to Report tab.
Skeleton shimmer while loading. `staleTime: 30_000` for KPIs; `staleTime: 0` for orders.

### POSMainScreen (Selling tab — Bán hàng view)
Top toggle: **[Bán hàng]** ↔ Đơn hàng (`sellingStore.activeView`). Toggle persists in-memory only (Zustand, no AsyncStorage — resets to POS on app reopen by design).

**Adaptive product grid:**
- Auto columns: `width < 390` → 2 cols; `width ≥ 390` → 3 cols (using `useWindowDimensions`)
- Manual toggle ▦ icon in header next to search; overrides auto; choice saved to `AsyncStorage('pos_grid_columns')` and survives restarts
- Re-reads saved preference on mount; falls back to auto if key absent

Search bar top. Category filter chips. Cart FAB bottom-right (item count badge + running total). Out-of-stock: reduced opacity + "Hết" overlay, still tappable. Tap → add to cart + haptic. Long-press → qty stepper popup.

**Note field quick phrases (KeyboardAccessoryView):** When note input is focused (at any checkout point), `SuggestionChips` slide in above keyboard from `KeyboardAccessoryView`. Chips are phrases configured in POSConfigScreen (default: "Khách quen", "Giao hàng tận nơi", "Đặt trước", "Không túi"). Tap chip → appends text (replaces if field empty). Managed via `react-native-keyboard-controller`'s `KeyboardStickyView` or `@flyerhq/react-native-keyboard-accessory-view`.

### CartScreen
Order items list with inline qty steppers and swipe-left remove. "Xóa tất cả" → `alertStore` confirm. Promo code input row. Tạm tính / Giảm giá / Tổng cộng summary. "Thanh toán" button with total.

### CheckoutScreen
**Payment method:** radio (Tiền mặt / Chuyển khoản / Thẻ). Pre-selected from `AsyncStorage('last_payment_method')` on mount; "Thẻ" is never pre-selected as default even if saved (Tiền mặt fallback). On payment confirmed: save chosen method to `AsyncStorage('last_payment_method')`.

**Tiền mặt specifics:**
- "Khách đưa" `MoneyInput` + auto "Tiền thối" calc
- Khách đưa < total → red "Thiếu X ₫"
- **"Đúng tiền" button** (right of "Khách đưa" label): fills `MoneyInput` with exact order total → shows "Tiền thối: 0 ₫"; only visible for Tiền mặt; styled as small secondary chip

**Chuyển khoản:** selecting → `BankTransferQRSheet` opens automatically.

**Customer row:** `SuggestionChips` (last 5 recent customers from `GET /api/customers/recent?limit=5`) above full customer search; tap chip → pre-fills; gated by `CUSTOMER`.

**Loyalty redemption:** if customer linked and has points > 0 → "Dùng điểm tích lũy" toggle row; on → "N điểm = X ₫" conversion + adds discount line to summary. Gated by `CUSTOMER`.

**Note field:** `KeyboardAccessoryView` quick phrases chips (same as POSMain).

**Submit:** "Xác nhận thanh toán" button disabled + spinner on first tap (double-tap prevention via `useSubmitting`). On success → OrderSuccessScreen. On failure → sticky amber banner "Đặt hàng thất bại. [Thử lại]"; cart NOT cleared; payload preserved in component state; "Thử lại" re-submits same payload; "Liên hệ hỗ trợ" link → system dialer.

### BankTransferQRSheet
Opens automatically when "Chuyển khoản" selected on CheckoutScreen.

**No bank account set up:** sheet shows prompt with "Thiết lập tài khoản ngân hàng" button → BankAccountListScreen.

**Normal flow:**
- QR code 240×240 generated client-side via `react-native-qrcode-svg` using full VietQR / EMVCo standard string (bankCode + accountNo + amount + reference)
- Amount = exact final checkout total (post-discounts, post-loyalty-redemption); re-generates live if total changes
- Reference format: `TAPPYPOS {HH:mm DD/MM}` (short, fits 50-char transfer description limit)
- Amount shown large + bold below QR; privacy mode shows `••••••` in label but QR encodes real amount (QR is for customer)
- Bank name + account number + holder name shown; 📋 copies account number to clipboard
- Bank account radio list (from `GET /api/shop-config/banks`); switching → QR re-generates immediately, amount unchanged
- **Bank memory:** on mount, pre-select bank from `AsyncStorage('last_qr_bank_id')`; if saved bank still in list → pre-selected; if absent/deleted → first bank in list. On selection change: save selected bank id to `AsyncStorage('last_qr_bank_id')`.
- "✅ Đã nhận được tiền" → owner manually verified payment → dismiss sheet → `POST /api/orders` with `paymentMethod: TRANSFER`
- No automatic payment verification in MVP
- `staleTime: 5 * 60_000` for bank list

Compatible with all Vietnamese banking apps: VCB Digibank, TCB Mobile, MoMo, ZaloPay, etc.

### OrderSuccessScreen
Full-screen: ✅ icon + order number + amount + payment method + change. "In biên nhận" (expo-print) + "Đơn hàng mới" (clears cart + back to POSMain). Auto-navigate after 5s countdown shown on button.

### OrderListScreen (Selling tab — Đơn hàng view)
**Quick Order strip** above list: 5 horizontal cards (combos first, then top sellers, then newest). `⋯` card → full catalogue. "Đơn mới +" button top-right → full POS flow.

**Quick Checkout sheet (one-tap quick order):**
- Opens when user taps a Quick Order card
- **Default qty = 1** — qty stepper shown but collapsed; expand arrow to adjust
- **Note field collapsed** — "Thêm ghi chú ↓" link, not visible by default
- **Payment method pre-selected** from `AsyncStorage('last_payment_method')` (Tiền mặt if none saved)
- "Xác nhận" button → double-tap prevention → `POST /api/orders` with `source: 'QUICK_ORDER'`
- On success: dismiss sheet + `UndoToast` "Đã tạo đơn #XXXX" (5s undo → `DELETE /api/orders/{id}`) + list refreshes in place
- On failure: sticky error banner inside sheet; sheet stays open; retry button

Order list: `FlatList`, pull-to-refresh, infinite scroll. Each row: order number + status badge + time + amount. Filter chips (payment method, status) + search.

### OrderDetailScreen ✅ (full rewrite 2026-05-11)
Indigo header (`bg-primary`): back arrow left + status badge (color-coded pill) right; `#orderNumber` bold + `createdAt` formatted below.

**Scrollable body — 4 white cards:**
1. **Chi tiết đơn hàng** — `InfoRow` grid: orderNumber, createdAt, employee (createdByName), customer (customerName or "Khách vãng lai"), payment method (with emoji: 💵/💳/🏦), note.
2. **Sản phẩm (N)** — item rows: productName + subtotal right; unitPrice × quantity unit below in gray.
3. **Tổng cộng** — subtotal + discount (amber, only if discount > 0) + total (bold, primary color). Cash section (only when paymentMethod=CASH and amountPaid != null): amountPaid + changeAmount (green, only if > 0).
4. **Cancellation card** (only when status=CANCELLED): red-tint bg (#fff1f2, border #fecdd3); close-circle icon + "ĐÃ HỦY" header; cancelReason, cancelledBy, cancelledAt (each in own sub-block, only if non-null).

**Sticky footer (only when `isActionable = status === 'PENDING' || 'PROCESSING'`):**
- "Hoàn thành" button (primary green, full width) — `completeMutation` → `setQueryData` + `invalidateQueries(['orders'])`
- "Hủy đơn" button (red outline, bg #fff1f2) — `Alert.alert` confirm → `cancelMutation`
- `anyMutating = completeMutation.isPending || cancelMutation.isPending` — disables both buttons; respective button shows `ActivityIndicator`

Loading: `Skeleton` placeholders in header + body cards. Error: `ErrorState` with retry.

`staleTime: 2 * 60_000`. `queryClient.setQueryData(['order', orderId], updated)` on mutation success (no full refetch).

API: `GET /api/orders/{id}`, `PUT /api/orders/{id}/complete`, `POST /api/orders/{id}/cancel`.

### ExpensesScreen
Period chips. Summary: total + fixed/variable breakdown + trend %. `BarChart` (red #ef4444). Filter chips (Tất cả / Cố định / Phát sinh + category dropdown). Expense list grouped by date. "+ Thêm" FAB / header button → `AddExpenseSheet`.
**Clone-defaults banner:** shown when fixed expenses empty but defaults exist → "Sao chép vào tháng này" button → `useExpenseClonePrompt` hook. Also auto-shown as `alertStore` on first open of month (once per month, `AsyncStorage` key).
Tap row → `ExpenseDetailSheet`. Swipe-left → Edit / Delete.

**`AddExpenseSheet` — personal frequency chips:** `SuggestionChips` for expense category use **personal frequency ordering**. Each time user selects a category, increment its count in `AsyncStorage('expense_category_counts')` (a `Record<string, number>`). On next open: sort chips by count descending (most-used first), then shop-type default order for ties. New users (all counts = 0) see shop-type default ordering. Diacritic-insensitive reorder on text input still applies on top of frequency sort.

### AddExpenseSheet
Type toggle (Phát sinh / Cố định). `SuggestionChips` for category (reorder on input). `MoneyInput` with number-to-words. `DatePickerInput` (default today). Note field. Cố định type → "Lưu vào chi phí mặc định" toggle.

### ReportScreen
Two tabs: **Doanh thu** | **Chi phí**. Shared period selector with `⋯` custom from-to picker.
**Doanh thu:** 4 KPI cards + trend bar (emerald) + payment/status filter chips + infinite order list → OrderDetail.
**Chi phí:** 4 KPI cards + trend bar (red) + type/category filter chips + expense list grouped by date → detail sheet.
`reportStore` in-memory. Period change recalculates from/to + invalidates all queries.

### NotificationScreen
Filter chips: Tất cả / Chưa đọc / Đơn hàng / Hệ thống. Unread dot on row left. Swipe-left: "Đánh dấu đã đọc" / "Xóa". Tap row → mark read + navigate to relevant screen. "Đọc tất cả" → `alertStore` confirm → `PUT /api/notifications/read-all`.

### SettingsScreen
Grouped list of settings rows. See `project_mobile_plan.md` → Settings Screen Structure for full tree.

---

## Settings Sub-Screens

### ProfileUpdateScreen
Avatar (initials fallback; tap → `ImagePicker`). Biệt danh* + Họ và tên fields. Số điện thoại read-only. "Lưu" header button, disabled until a field changes. → `PUT /api/users/profile` → `userStore` update + `UndoToast`.

### ChangePasswordScreen
Current password + new password (`PasswordInput`) + confirm. 401 on wrong current → inline error. Success → `alertStore` "Vui lòng đăng nhập lại" → logout → LoginScreen.

### ShopInfoScreen
Shop ID row: value + 📋 copy (`Clipboard`) + share icon (`Share.share`). Name*, address, phone, description fields. `UndoToast` "Đã sao chép mã cửa hàng" on copy.

### POSConfigScreen
POS mode radio (danh sách / quét mã / đặt bàn). Auto-print toggle. Denomination checkboxes (500k/200k/100k/50k/20k/10k). VAT radio (none / included / add %). Auto-saves with 500ms debounce.

**Quick order note phrases:** editable list of phrase chips shown above keyboard during note input. "+ Thêm cụm từ" → text input sheet (50 char max). Swipe-left to delete. "Khôi phục mặc định" resets to defaults. Saved in `shop_config` on backend.

### DefaultExpensesScreen
List of `default_fixed_expenses` templates. Swipe-left → Edit / Delete. "+ Thêm" → add sheet (no date field, saves to defaults only).

### SecurityScreen
PIN toggle (off → `alertStore` confirm → `DELETE /api/auth/pin`). "Đổi mã PIN" → PinSetupScreen. Biometric toggle (disabled if PIN off; enables → `LocalAuthentication.authenticateAsync` prompt first).

**Tự khóa ứng dụng (background PIN lock):**
- Row with current selection shown as value (e.g. "5 phút"); tap → single-select sheet: Không bao giờ / 1 phút / 5 phút / 15 phút
- Only shown when PIN is enabled (row hidden if PIN off)
- Saves to `AsyncStorage('lock_timeout_minutes')` — `null` = never, number = minutes
- **AppState listener (in RootNavigator):** on `background` → write `Date.now()` to `AsyncStorage('backgroundTimestamp')`; on `active` → read timestamp + configured timeout; if elapsed > timeout + PIN enabled → navigate to PinLoginScreen. Cleared on successful PIN entry.
- Default: null (never auto-lock)

### DisplayScreen (theme + language + privacy — combined)
**Giao diện:** 3 cards: ☀️ Sáng / 🌙 Tối / 📱 Tự động. Tap → `themeStore.setTheme()` → persisted + applied immediately + logs `THEME_CHANGE`.
**Ngôn ngữ:** 2 cards: 🇻🇳 Tiếng Việt / 🇬🇧 English. Tap → `i18n.changeLanguage()` + `SecureStore.setItemAsync('language', value)` → UI rerenders immediately + logs `LANGUAGE_CHANGE`.
**Chế độ riêng tư:** toggle switch → `privacyStore.setHidden()`.

### TnCScreen
Scrollable T&C content from `GET /api/legal/tnc`. Shows acceptance timestamp. "Đồng ý & Cập nhật" button appears only when server returns newer version than stored.

### ActivityLogScreen
Date range filter + category chips. Rows: action emoji + description + relative time + optional `📱 MOBILE` badge. `useInfiniteQuery`, `staleTime: 0`.

### DeleteAccountScreen
Full-screen (not a sheet). Red warning header. List of what will be deleted (✗) and kept (✓). `ClearableInput` for typing "XÁC NHẬN". "Xóa tài khoản" button disabled until input matches exactly (case-sensitive). On confirm → `DELETE /api/users/me` → clear all SecureStore + AsyncStorage → navigate to ShopIdScreen.
Accessed from Settings → Tài khoản → "Xóa tài khoản" (red text row). First shows `alertStore` warning → user confirms → navigates to DeleteAccountScreen.

### SubscriptionSection (within SettingsScreen, not a separate screen)
Card: plan name + status badge (🟢/🟡/🔴) + days remaining + expiry date + features chips + user count. "Nâng cấp gói" button when ≤ 30 days or expired. `staleTime: 5 * 60_000`.

### ContactSection (within SettingsScreen, not a separate screen)
Rows: 📞 Hotline (tel: link) · ✉️ Email (mailto: link) · 💬 Zalo OA (`WebBrowser.openBrowserAsync`) · 🌐 Website. All hardcoded in `src/utils/constants.ts` → `SUPPORT` object.

---

## Overflow Menu Screens (Modal Stacks)

### CustomerListScreen ✅ (implemented 2026-05-11)
Indigo header (`bg-primary`) + "Khách hàng" title + search `TextInput` (white/15 bg, rgba(255,255,255,0.6) placeholder). Paginated `FlatList` (`size=30`), `allItems` accumulator array in `useState`, `hasMore` flag. `CustomerCard` component: initials circle (`bg-primary-light`), name, phone row, stats row (totalOrders, points, totalSpend formatted). Pull-to-refresh resets `page` to 0 and clears `allItems`. FAB (bottom-right, primary green) → `navigation.navigate('CustomerForm', {})` (create mode). Empty state: `EmptyState` "Chưa có khách hàng nào". `staleTime: 60_000`. API: `GET /api/customers?search=&page=&size=30`.

### CustomerFormScreen ✅ (new screen, 2026-05-11)
`route.params.customerId` — `undefined` = create mode, string = edit mode. Header title: "Thêm khách hàng" / "Chỉnh sửa khách hàng". Edit mode: `useEffect` + `customerApi.getById(customerId!)` on mount → populates `FormState`; `Skeleton` shown while loading. 

**4 section cards:**
1. **Thông tin cơ bản** — Họ tên* (`ClearableInput`), Số điện thoại* (`ClearableInput`, numeric, `onBlur` → `handlePhoneBlur`), Email (`ClearableInput`, keyboard=email-address), Ngày sinh (`ClearableInput`, placeholder "YYYY-MM-DD")
2. **Mạng xã hội** — Zalo ID, Facebook ID — both `ClearableInput`
3. **Sở thích & ghi chú** — Loại tóc / Dịch vụ ưa thích (500-char counter) / Dị ứng / Yêu cầu đặc biệt / Ghi chú — all `ClearableInput` or multiline
4. **CCCD / Giấy tờ** — Số CCCD, Ngày cấp, Nơi cấp, Địa chỉ thường trú

**Gender row:** 3-button toggle (Nam / Nữ / Khác); selected = `bg-primary text-white`; unselected = `bg-gray-100 text-gray-600`.

**Phone conflict detection (`handlePhoneBlur`):** calls `customerApi.checkPhone(phone)` → if existing customer found and `existing.id !== customerId` (edit mode self-exclusion) → `Alert.alert` with conflict message + "Xem hồ sơ" button that navigates to that customer's detail.

**Submit:** `createMutation` or `updateMutation` → `invalidateQueries(['customers'])` + `setQueryData(['customer', id], updated)` → navigation.goBack(). `ActivityIndicator` replaces save button while pending.

### CustomerDetailScreen ✅ (implemented 2026-05-11)
Indigo header (`bg-primary`) + back arrow + edit icon (→ `CustomerForm` with customerId) + trash icon (→ `Alert.alert` confirm → `deleteMutation` → `invalidateQueries(['customers'])` → navigation.goBack()).

**Avatar:** large white/20 circle with first letter of name (white, bold, 32px).

**Stats bar:** 3 columns (Tổng đơn / Tổng chi tiêu / Điểm tích lũy) in frosted white panel, values from `CustomerData` fields (`totalOrders`, `totalSpend`, `points`). Privacy-mode aware.

**Profile sections (white cards):** only rendered when ≥1 field has non-null value — no empty cards shown. Uses `InfoRow` component (returns `null` when value is falsy). Sections: Thông tin cơ bản (phone, email, gender, birthday) · Mạng xã hội (zaloId, facebookId) · Sở thích (hairType, preferredServices, allergiesOrSensitivities, specialRequests, notes) · Giấy tờ (idCardNumber, idCardIssuedDate, idCardIssuedPlace, permanentAddress).

**Recent orders:** `useQuery` with `queryKey: ['customer-orders', customerId]`; calls `orderApi.list({ customerId, size: 5, page: 0 })`; shows 5 rows (orderNumber + status badge + date + total); "Xem tất cả →" navigates to OrderList filtered by customerId. Empty state "Chưa có đơn hàng nào".

**Member since:** `formatDate(customer.createdAt)` in footer.

`staleTime: 60_000` for customer profile; `staleTime: 0` for orders.

API: `GET /api/customers/{id}`, `GET /api/orders?customerId={id}&size=5&page=0`, `DELETE /api/customers/{id}`.

### InventoryListScreen
Summary header: total SKU / sắp hết / hết hàng counts. Filter chips (Tất cả / Sắp hết / Hết hàng). Rows: product + current stock + unit + status badge (🟢/🟡/🔴). Tap ✏️ → `StockAdjustmentSheet` (new qty `DecimalInput` + reason chips + note → `POST /api/inventory/adjust` + `UndoToast`).

### PrintTemplateListScreen
Template rows: icon + name + type badge + last updated. "Mặc định" badge. Swipe-left: "Đặt làm mặc định" / "Xóa" (can't delete default). "+ Thêm" → PrintTemplateDetailScreen (create mode).

### PrintTemplateDetailScreen
**Live preview pane** at top (updates on every field change; sample order data; monospace font; width by paper size).
Toggle fields (logo, shop name, address, phone, tax code, order number, time, cashier, customer name). "Lời chào cuối" `ClearableInput` (80 char limit with counter). Footer text (3 lines max). Paper size radio (58mm / 80mm). "In thử" → `expo-print`. Saves only on "Lưu" tap.

### ComboListScreen
Filter chips: Đang bán / Tạm ẩn. Rows: emoji + name + item preview + "Tiết kiệm X ₫" green label + status. Swipe-left: "Tạm ẩn" / "Xóa". "+ Thêm" → ComboEditScreen (create mode).

### ComboEditScreen (create + edit)
Name* + description. Product list rows (name + price + qty stepper; swipe/✕ removes; `−` at 1 → `alertStore` confirm). "Thêm sản phẩm" → `ProductPickerSheet` (multi-select; already-added items grayed out; category chips + search). "Tổng giá lẻ" auto-calc (gray). Combo price `MoneyInput`. "Tiết kiệm" diff auto-shown (green if positive). Status toggle. Validation: name + ≥2 products + price > 0.

### ComboDetailSheet (read-only, from Quick Order tap)
Bottom sheet: name + description + item list with prices + total lẻ + combo price + savings. Qty stepper (multiplies whole combo). Note + payment method. "Xác nhận" → Quick Checkout flow.

---

### GoldPriceScreen (PAWN feature — JEWELRY shops only)
Accessed from overflow menu → "💰 Giá vàng hôm nay" (only visible when `PAWN` feature present).
**Header:** "Giá vàng hôm nay" + last-updated timestamp + "✏️ Cập nhật" button.
**Price cards (2):** Mua vào (buy) + Bán ra (sell), each showing price per chỉ (3.75g).
**7-day BarChart:** buy price by day, emerald bars, tap → tooltip with date + value.
**History list:** date + buy + sell rows; collapse at >5 with "Xem thêm ∨".
**UpdateGoldPriceSheet:** `DatePickerInput` (default today) + buy `MoneyInput` + sell `MoneyInput` + note. Validation: sell ≥ buy (warn, don't block). Save → `POST /api/gold-prices` → `UndoToast`. `staleTime: 30_000`.

---

## ProductListScreen (via overflow or Products tab)

**"📊 Bán chạy" section (UI-calculated top sellers):**
- Collapsible horizontal scroll above main list; default open; collapsed state stored in `AsyncStorage('product_topsellers_expanded')`
- Data: `GET /api/orders/top-products?limit=5&days=30` — same endpoint and cache key as Quick Order strip (`staleTime: 5 * 60_000`)
- Each card: rank badge (#1–#5, gold/silver/bronze for top 3) + product name (1 line, ellipsis) + "X lần bán" count + small horizontal progress bar (top seller = full width, others proportional — **UI calculation**: `bar width = orderCount / maxOrderCount`)
- Tap card → scrolls to that product in the main list and flashes a highlight ring (500ms)
- Section hidden when top-products response is empty (no order history yet)
- "Ẩn ∧" / "Xem thêm ∨" toggle at section header right

Search + filter chips (Tất cả / Đang bán / Tạm ẩn / Hết hàng) + category dropdown. Rows: thumbnail (or emoji fallback) + name + price + category badge + stock status. Swipe-left: ✏️ Edit / 🗑 Delete / Tạm ẩn. "+ Thêm" → `AddProductSheet`.

**AddProductSheet / Edit:** name*, price `MoneyInput` (hidden for dynamic-price), unit chips (filtered by PRODUCT_TYPE_UNIT_CONFIG), category picker, `ImagePicker` (single photo). "Thêm thuộc tính nâng cao" toggle → EAV fields (collapsed by default).

**ProductDetailScreen:** hero image + name + price. Stock info + "Điều chỉnh tồn kho" (if INVENTORY). EAV attributes as label–value rows. "Đã bán N lần trong 30 ngày" stat. Edit / Delete buttons.

---

## Gap-Fill Screens (US-121–131)

### FeedbackScreen + FeedbackHistoryScreen (FEEDBACK feature)
**FeedbackScreen:** category chips (🐛 Lỗi / 💡 Góp ý / ✨ Tính năng / ❓ Khác) + multiline text area (500 char limit with counter) + `ImagePicker` up to 3 photos + "Gửi phản hồi" button. "Lịch sử phản hồi" link top-right.
**FeedbackHistoryScreen:** list of submitted items; each row: category icon + title preview + date + status badge (🔵 Đã tiếp nhận / 🟡 Đang xử lý / 🟢 Đã xử lý). `staleTime: 60_000`.
Accessible from Settings → Liên hệ & Hỗ trợ group → "Gửi phản hồi" row.
API: `POST /api/feedback`, `GET /api/feedback/my`. Gated by `FEEDBACK`.

### NotificationPreferencesScreen (NOTIFICATION feature)
Grouped toggle list. Groups: Đơn hàng (new order, cancelled) · Tồn kho (low stock, out of stock) · Hệ thống (subscription expiry, app update). All toggles auto-save on change with 300ms debounce → `PUT /api/notifications/preferences`. Accessible from Settings → new "Cài đặt thông báo" row under Thông báo section. Gated by `NOTIFICATION`.

### CategoryListScreen (PRODUCT feature)
Header: "Danh mục sản phẩm" + "+ Thêm". List rows: emoji + name + product count. Swipe-left: Edit / Delete. Delete blocked if category has products → `alertStore` with count message.
**AddEditCategorySheet:** emoji picker row (pre-set options) + name `ClearableInput`. Save → `POST/PUT /api/categories` → `invalidateQueries(['categories'])`.
API: `GET/POST/PUT/DELETE /api/categories`. Gated by `PRODUCT`. Accessible from ProductListScreen header or overflow menu → Sản phẩm.

### BankAccountListScreen (SHOP_SETTING feature)
Header: "Tài khoản ngân hàng" + "+ Thêm". Rows: bank icon + name + account number + account name + "Mặc định" badge. Swipe-left: Edit / "Đặt mặc định" / Delete.
**AddEditBankAccountSheet:** bank searchable picker (Vietnamese bank list) + account number + account name (auto-UPPERCASE) + branch (optional). Save → `POST/PUT /api/shop-config/banks`. Accessible from Settings → Cửa hàng → "Tài khoản ngân hàng". Gated by `SHOP_SETTING`.

### ShopInfoScreen (updated — logo upload added)
Logo section added at top: 120×120 circle with shop logo or 🏪 placeholder. "Chạm để thay đổi logo" label. Tap → `ImagePicker` → square crop → preview → uploaded via `PUT /api/shop-config/logo` (multipart). Max 2MB, PNG/JPG. All other fields unchanged.

### CheckoutScreen (updated — loyalty points redemption)
After customer row: if linked customer has points > 0, show "Dùng điểm tích lũy" toggle row. Toggle on → shows "N điểm = X ₫" conversion line + adds "Giảm (điểm)" discount line to summary. Conversion rate from `GET /api/shop-config/loyalty`. Toggle on adds `redeemPoints: true` to order payload. Gated by `CUSTOMER`.

### OrderDetailScreen (updated — receipt reprint)
"🖨️ In biên nhận" button added to action row at bottom. Always visible regardless of order status. Calls `expo-print` with default template + order data. No new API needed.

### ProductListScreen (updated — hide/show visibility)
Swipe-left gains "Tạm ẩn" action. Hidden products shown with 0.4 opacity + gray "Đã ẩn" badge. Swipe-left on hidden product → "Hiện lại". Filter chips updated: [Tất cả] [Đang bán] [Tạm ẩn] [Hết hàng]. Hidden products excluded from POS grid, quick order strip, combo product picker. `PATCH /api/products/{id}/visibility { active: boolean }`.

---

## Global UI Components

### OfflineBanner
Rendered at root of AppNavigator + AuthNavigator (above all screens). `@react-native-community/netinfo`. Amber slide-in from top when `isConnected = false`. Message: "📶 Không có kết nối mạng". Slides out on restore + auto-calls `queryClient.invalidateQueries()`. Second state for 503 API errors: "⚙️ Hệ thống đang bảo trì. Thử lại sau."

### First-Use Empty States
`EmptyState` component: 48px emoji illustration + bold title + gray subtitle (2 lines max) + optional CTA `TouchableOpacity` button.

| Screen | Emoji | Title | CTA label | CTA action |
|---|---|---|---|---|
| HomeScreen | 🏪 | Chào mừng đến TappyPOS! | Bắt đầu bán hàng | → POSMain |
| OrderListScreen | 🧾 | Chưa có đơn hàng nào | Đến bán hàng | → POSMain |
| ExpensesScreen | 💸 | Chưa có chi phí nào | + Thêm chi phí | open AddExpenseSheet |
| ProductListScreen | 📦 | Chưa có sản phẩm nào | + Thêm sản phẩm | open AddProductSheet |
| CustomerListScreen | 👥 | Chưa có khách hàng nào | + Thêm khách hàng | navigate to CustomerForm (create mode) |
| ComboListScreen | 🍱 | Chưa có combo nào | + Tạo combo | → ComboEdit (create) |
| ReportScreen | 📊 | Chưa có dữ liệu báo cáo | Đến bán hàng | → POSMain |
| NotificationScreen | 🔔 | Chưa có thông báo nào | — | — |
| ActivityLogScreen | 📋 | Chưa có hoạt động nào | — | — |

---

## UX Improvements Summary (US-132–147)

Quick cross-reference: where each UX improvement lives in the code.

| US | Improvement | File / Hook |
|---|---|---|
| US-132 | Remember last payment method | `CheckoutScreen` + `AsyncStorage('last_payment_method')` |
| US-133 | "Đúng tiền" exact amount button | `CheckoutScreen` (Tiền mặt branch only) |
| US-134 | Quick Order one-tap confirm | `OrderListScreen` Quick Checkout sheet |
| US-135 | Background PIN lock (AppState) | `RootNavigator` + `AsyncStorage('backgroundTimestamp')` |
| US-136 | Lock timeout config in Settings | `SecurityScreen` + `AsyncStorage('lock_timeout_minutes')` |
| US-137 | Checkout error recovery | `CheckoutScreen` (sticky banner, preserved payload) |
| US-138 | Double-tap prevention | `useSubmitting` hook — all primary submit buttons |
| US-139 | Notification bell on all tabs | `AppStack` `headerRight` (React Navigation option) |
| US-140 | Recent customers at checkout | `CheckoutScreen` chips from `GET /api/customers/recent` |
| US-141 | "Hôm qua" period chip on HomeScreen | `HomeScreen` period chip row |
| US-142 | Adaptive POS grid (auto 2→3 cols) | `POSMainScreen` `useWindowDimensions` |
| US-143 | Manual grid toggle + memory | `POSMainScreen` header + `AsyncStorage('pos_grid_columns')` |
| US-144 | Quick order note phrases | `POSConfigScreen` config + `KeyboardAccessoryView` in note fields |
| US-145 | Remember QR bank selection | `BankTransferQRSheet` + `AsyncStorage('last_qr_bank_id')` |
| US-146 | Selling tab view memory (in-memory) | `sellingStore` (Zustand, no persist) |
| US-147 | Expense category personal frequency | `AddExpenseSheet` + `AsyncStorage('expense_category_counts')` |
| US-148 | Customer order history with UI-calculated stats | `CustomerDetailScreen` — stats derived from `GET /api/orders?customerId={id}` list |
| US-149 | Top selling products on product page | `ProductListScreen` — "Bán chạy" section, reuses endpoint 28, UI-calculated progress bars |

---

## API Query staleTime Reference

| Data type | staleTime |
|---|---|
| Shop types, categories, product templates | `5 * 60_000` |
| Dashboard KPIs, chart data | `30_000` |
| Profile, user data, subscription | `60_000` or `5 * 60_000` |
| T&C content | `24 * 60 * 60_000` |
| Orders, expenses, notifications, activity log | `0` (always fresh) |
| Top products, combos | `5 * 60_000` |

---

## Missing api.ts Entries (not yet wired — needed by stub screens)

| Endpoint | Purpose | Screen |
|---|---|---|
| `DELETE /api/auth/pin` | Disable PIN | SecurityScreen |
| `GET /api/shop-config` | Read shop info | ShopInfoScreen |
| `PUT /api/shop-config` | Update shop info | ShopInfoScreen |
| `GET /api/shop-config/pos-config` | Read POS settings | POSConfigScreen |
| `PUT /api/shop-config/pos-config` | Update POS settings | POSConfigScreen |

Also fix in api.ts:
- `CheckoutRequest.customerId: number` → should be `string`
- `CheckoutRequest` missing `redeemPoints?: boolean` field (needed for US-130)

**Why:** Decisions made in planning session 2026-05-10; screen implementations updated 2026-05-11.
**How to apply:** Reference when implementing any screen in tappy-pos/mobile. For navigation structure and backend requirements read `project_mobile_plan.md`.
