---
name: TappyPOS Mobile — User Stories
description: All user stories for tappy-pos/mobile organized by feature area. Primary actor is the shop owner (chủ cửa hàng). Read alongside project_mobile_screens.md before implementing any screen.
type: project
originSessionId: df315ccb-2945-419c-9cbb-2eed88eab878
---

## Roles

- **Chủ cửa hàng (Shop Owner)** — primary user; registers, sets up shop, uses all features daily
- **Nhân viên (Staff)** — Phase 2; limited feature access; not in MVP scope

---

# Group A — Auth & Account

## Epic 1 — Registration & Shop Discovery

**US-01** As a shop owner, I want to enter a shop ID to find my shop, so that I can log in to the correct tenant without having to remember a long URL.

**US-02** As a shop owner, I want to see my shop name confirmed before logging in, so that I know I'm entering the right shop.

**US-03** As a shop owner, I want to register a new account with my phone number and a strong password, so that I can start using TappyPOS without a credit card or IT setup.

**US-04** As a shop owner, I want to register using my Google account, so that I can sign up faster without managing another password.

**US-05** As a shop owner on iPhone, I want to register using my Apple ID, so that I can sign up privately without sharing my email.

**US-06** As a shop owner, I want the registration form to show me in real time whether my password is strong enough, so that I don't get rejected after I finish filling in the form.

**US-07** As a shop owner, I want to read and accept the Terms & Conditions before creating my account, so that I understand what I'm agreeing to.

**US-08** As a shop owner, I want to be taken directly to shop setup after registering, so that I can start using the app without needing to find the setup flow myself.

**US-09** As a returning shop owner, I want to switch shops from the login screen, so that I can log in to a different tenant without reinstalling the app.

**Acceptance notes:**
- US-01: NOT_FOUND → inline error; SUSPENDED → alert with support contact
- US-06: strength bar shows Yếu / Trung bình / Khá / Mạnh; 5-rule checklist updates live
- US-07: T&C auto-checks when user scrolls to bottom of modal sheet

---

## Epic 2 — PIN & Biometric Login

**US-10** As a shop owner, I want to set up a 6-digit PIN after my first login, so that I can unlock the app quickly without typing my full password every time.

**US-11** As a shop owner, I want to skip PIN setup and do it later, so that I can get into the app right away on my first login.

**US-12** As a shop owner, I want to log in with my PIN on subsequent visits, so that opening the app only takes a few seconds.

**US-13** As a shop owner, I want to log in using Face ID or fingerprint, so that I don't even need to type my PIN.

**US-14** As a shop owner, I want to reset my PIN if I forget it by verifying my password, so that I'm never permanently locked out of my account.

**US-15** As a shop owner, I want the app to lock me out temporarily after 5 wrong PIN attempts, so that my account is protected if someone else picks up my phone.

**Acceptance notes:**
- US-10: custom numpad (not system keyboard); two-phase confirm; mismatch → shake animation
- US-13: biometric auto-prompts on screen mount; tap icon to re-prompt
- US-15: 30-minute lockout with visible countdown; after lockout → password verification instead of PIN

---

## Epic 21 — Forgot Password

**US-108** As a shop owner who forgot their password, I want to request a password reset from the login screen, so that I can regain access to my account without contacting support myself.

**US-109** As a shop owner, I want to see support contact details on the forgot password screen, so that I have an immediate alternative if the reset request doesn't come through.

**Acceptance notes:**
- US-108: "Quên mật khẩu?" link on LoginScreen prefills phone number; `POST /api/auth/password-reset/request`; MVP queues support ticket; Phase 2 sends OTP
- US-109: support phone + email always visible below the form regardless of request state

---

## Epic 22 — Language Selection

**US-110** As a shop owner who prefers English, I want to switch the app language to English, so that I can use the app comfortably if Vietnamese isn't my primary language.

**US-111** As a shop owner, I want my language preference to be remembered across sessions, so that I don't need to change it every time I open the app.

**Acceptance notes:**
- US-110: Settings → Hiển thị → Ngôn ngữ; 2 card options (🇻🇳 / 🇬🇧); applies immediately without restart
- US-111: stored in SecureStore under key `language`; loaded during hydration on splash

---

## Epic 24 — Account Deletion

**US-115** As a shop owner, I want to permanently delete my account and all my data, so that I can fully opt out of TappyPOS if I decide to stop using it.

**US-116** As a shop owner, I want the deletion process to require explicit confirmation, so that I cannot accidentally delete my account in a single tap.

**Acceptance notes:**
- US-115: `DELETE /api/users/me`; clears all SecureStore + AsyncStorage; required for App Store submission
- US-116: two-step: alertStore warning → full-screen confirmation screen requiring typing "XÁC NHẬN" exactly; button disabled until matched

---

# Group B — Onboarding

## Epic 3 — Onboarding Wizard

**US-16** As a new shop owner, I want to select my shop type from a visual grid, so that the app can suggest the right products and features for my business.

**US-17** As a new shop owner, I want to enter my nickname, full name, shop name, and address, so that the app feels personalised and my receipts have the correct shop details.

**US-18** As a new shop owner, I want to choose from suggested product templates and set my own prices, so that I don't have to type all my products from scratch.

**US-19** As a new shop owner, I want to add my fixed monthly expenses (rent, electricity, etc.) using quick-select chips, so that the app can show me my real profit from day one.

**US-20** As a new shop owner, I want to review everything before confirming, so that I can go back and fix mistakes without losing my input.

**US-21** As a new shop owner, I want the app to remember my progress if I close it mid-setup, so that I don't have to start over if I get interrupted.

**US-22** As a new shop owner, I want my shop, products, and expenses to be created in one step when I confirm, so that I can start selling immediately after setup.

**Acceptance notes:**
- US-18: dynamic-price items (JEWELRY) show "Theo giá vàng" label, no price input
- US-19: suggestion chips have emoji + color; ordered by shop-type commonness; reorder on typing
- US-20: Step 4 collapses lists >3 items; each section has a "Sửa" link back to that step; swipe-back keeps data
- US-21: `onboardingStore` persisted via AsyncStorage; resume navigates to `lastCompletedStep + 1`
- US-22: single `POST /api/tenants/self-provision`; returns `{ accessToken, tenantId, setupComplete: true }`; backend sets `tenants.setup_complete = TRUE`; all subsequent logins by any user of that shop return `setupComplete: true` — routing goes to App, never to wizard again

**US-152** As a staff member (or shop owner on a new device) of a shop that has already completed setup, I want the app to route me directly to the main app when I log in, so that I never see the onboarding wizard that was already completed by the shop owner.

**Acceptance notes (US-152):**
- `setupComplete` is a per-tenant (per-shop) server flag, not per-user or per-device
- Backend: `tenants.setup_complete BOOLEAN DEFAULT TRUE`; returned in every `AuthResponse` as `setupComplete`; `POST /auth/register` returns `false` (no shop yet); all other logins return tenant's DB value
- Mobile: `setup_complete` stored in SecureStore on every login; `RootNavigator` routes to onboarding only when `!setupComplete`; defaults to `true` for existing installs without the key (backward compat)
- Mid-wizard restart: user who registered but hasn't run selfProvision has `setup_complete = 'false'` in SecureStore → still routed to wizard on restart ✓

---

# Group C — Home & Reports

## Epic 4 — Overview (Home Screen)

**US-23** As a shop owner, I want to see today's revenue, number of orders, expenses, and profit at a glance when I open the app, so that I always know how the day is going.

**US-24** As a shop owner, I want to switch between today, this week, and this month views, so that I can check performance at different time scales quickly.

**US-25** As a shop owner, I want to see a trend bar chart of revenue by hour or day, so that I can spot my busiest periods without digging through order lists.

**US-26** As a shop owner, I want to see how my revenue compares to the previous period (e.g. ↑12% vs yesterday), so that I can tell at a glance if business is improving.

**US-27** As a shop owner, I want to hide all money amounts with one tap, so that I can show my phone to customers or staff without revealing sensitive figures.

**US-28** As a shop owner, I want to see my 3 most recent orders on the home screen, so that I can quickly confirm the last sale was recorded correctly.

**US-29** As a shop owner, I want to see my top-selling products on the home screen, so that I know what to stock up on.

**US-30** As a shop owner, I want to see a warning banner when my subscription is about to expire, so that I have time to renew before the app stops working.

**Acceptance notes:**
- US-27: privacy toggle persisted via `privacyStore`; all money fields show `••••••` when hidden
- US-26: trend vs prior equivalent period; green ↑ / red ↓ / gray ─
- US-30: banner shown when ≤ 30 days remaining; dismissible per session only

---

## Epic 9 — Reports

**US-54** As a shop owner, I want to see a revenue summary (total, order count, average order value) for any date range I choose, so that I can evaluate business performance over any period.

**US-55** As a shop owner, I want to filter the revenue view by payment method or order status, so that I can understand how customers prefer to pay.

**US-56** As a shop owner, I want to see an expense summary alongside revenue for the same period, so that I can see my actual profit without switching screens.

**US-57** As a shop owner, I want to select a custom date range (from-to) for reports, so that I can analyse specific campaigns or events beyond the standard day/week/month/year options.

**US-58** As a shop owner, I want to tap an order row in the report to see its detail, so that I can investigate any outlier transaction.

**Acceptance notes:**
- US-57: `⋯` chip opens from-to picker with `DatePickerInput × 2`
- US-54/56: net vs revenue shown in Chi phí tab KPI cards

---

## Epic 42 — "Hôm qua" Period on HomeScreen

**US-141** As a shop owner, I want to check yesterday's revenue quickly from the home screen, so that I can review the previous day's performance when I open the app each morning.

**Acceptance notes:**
- Period chips updated: [Hôm nay][Hôm qua][Tuần][Tháng]
- "Hôm qua" = yesterday's full date range (00:00–23:59 previous day)
- Same dashboard summary + chart queries with adjusted from/to params
- Default selected chip remains "Hôm nay"

---

## Epic 57 — Time-Slot Revenue Breakdown

**US-172** As a street food stall owner, I want to see my revenue broken down by time slot (Sáng / Trưa / Chiều-Tối) on the home screen, so that I can tell which meal service is most profitable and decide when to open or close.

**Acceptance notes:**
- Three bands: Sáng 00:00–10:00, Trưa 10:00–14:00, Chiều-Tối 14:00–24:00 (configurable in Settings → Cấu hình POS)
- Shown as a horizontal bar chart below the KPI cards on HomeScreen; hidden when all bands = 0
- Data derived from existing `GET /api/orders/summary` filtered by time range — no new endpoint needed
- Only shown when `DASHBOARD` feature present; collapsible (collapsed state in AsyncStorage)
- Primarily targeted at `STREET_FOOD` shop types but available to all F&B shops

---

## Epic 59 — End-of-Day Summary

**US-174** As a street food stall owner, I want an automatic daily summary at closing time showing revenue, market expenses, and estimated profit, so that I know how the day went without having to navigate to the report screen.

**Acceptance notes:**
- Closing time configurable in Settings → Cấu hình POS → "Giờ chốt ngày" (default 21:00)
- At closing time, local notification fires: "Hôm nay bán X đơn — Thu X ₫ — Chi chợ X ₫ — Lãi ước tính X ₫"
- Tapping notification → HomeScreen with "Hôm nay" period pre-selected
- Uses `expo-notifications` scheduled daily; reschedules on each app open
- Requires notification permission; gracefully skipped if denied
- Only triggered on days with at least 1 order (no notification on rest days)

---

# Group D — POS & Selling

## Epic 5 — POS & Selling

**US-31** As a shop owner, I want to browse my products in a grid and tap to add them to a cart, so that I can build an order quickly while serving a customer.

**US-32** As a shop owner, I want to filter products by category, so that I can find the right item without scrolling through everything.

**US-33** As a shop owner, I want to see a running total in the cart button as I add items, so that I always know the order total before checkout.

**US-34** As a shop owner, I want to apply a promo code to a cart, so that I can give discounts to loyal customers.

**US-35** As a shop owner, I want to choose the payment method (cash, transfer, card) at checkout, so that I can record how each order was paid.

**US-36** As a shop owner taking cash, I want to enter the amount the customer gives me and see the change automatically calculated, so that I don't make errors when giving change.

**US-37** As a shop owner, I want to link an order to a customer, so that I can track purchase history and loyalty points for regular customers.

**US-38** As a shop owner, I want to print a receipt immediately after completing an order, so that I can hand it to the customer without extra steps.

**US-39** As a shop owner, I want the app to automatically return to a fresh POS after completing an order, so that I'm ready for the next customer within seconds.

**Acceptance notes:**
- US-36: change shown as "Tiền thối"; if amount < total → red "Thiếu X ₫"
- US-39: auto-navigate after 5s countdown; customer can tap "Đơn hàng mới" to go immediately

---

## Epic 6 — Quick Order

**US-40** As a shop owner, I want to see my top-selling products at the top of the orders screen, so that I can create a common order with one tap instead of navigating the full POS.

**US-41** As a shop owner, I want to complete a quick order from the top-sellers strip without leaving the orders screen, so that high-frequency sales (e.g. one coffee) take as few taps as possible.

**US-42** As a shop owner, I want to undo a quick order within 5 seconds if I tapped the wrong item, so that I don't create a duplicate or incorrect order.

**US-43** As a shop owner, I want to tap a combo in the quick order strip to see its contents and place the order in one sheet, so that I don't have to build the same bundle of items manually every time.

**Acceptance notes:**
- US-40: strip order: combos (max 2) → top sellers → newest products fallback; hidden if no products
- US-41: Quick Checkout bottom sheet stays on the same screen; list refreshes in place after confirm
- US-42: `UndoToast` with 5s window → `DELETE /api/orders/{id}`

---

## Epic 14 — Combo Products

**US-75** As a shop owner, I want to create a combo (a named bundle of products at a combined price), so that I can sell popular combinations as a single item.

**US-76** As a shop owner, I want to see how much a customer saves with a combo compared to buying items individually, so that I can use combos as a sales tool.

**US-77** As a shop owner, I want to temporarily hide a combo without deleting it, so that I can remove seasonal combos and bring them back later.

**US-78** As a shop owner, I want combos to appear in my quick order strip, so that I can sell a bundle in one tap just like a regular product.

**Acceptance notes:**
- US-75: minimum 2 products in a combo; validated on save
- US-76: "Tiết kiệm X ₫" shown green; "Không giảm" if no discount
- US-77: "Tạm ẩn" toggle hides from POS and quick order strip without deleting

---

## Epic 35 — Remember Last Payment Method

**US-132** As a shop owner, I want the app to remember which payment method I used last, so that I don't have to re-select it on every single order throughout the day.

**Acceptance notes:**
- Stored in `AsyncStorage` key `last_payment_method`; pre-selected on CheckoutScreen + Quick Checkout sheet on open
- Updated on every successful order creation
- Default: Tiền mặt (first time, no stored value)

---

## Epic 36 — Exact Amount Shortcut

**US-133** As a shop owner taking cash, I want a single "Đúng tiền" button when the customer pays exactly, so that I don't have to type the full amount just to get zero change.

**Acceptance notes:**
- "Đúng tiền" button appears next to the "Khách đưa" MoneyInput, visible only when payment method = Tiền mặt
- Tapping fills MoneyInput with exact order total → Tiền thối shows 0 ₫ immediately
- No new API needed; pure client-side

---

## Epic 37 — Quick Order One-Tap Confirm

**US-134** As a shop owner processing a frequent single-item order, I want the Quick Checkout sheet to show just the total and a confirm button by default, so that I can complete the order in one tap when qty = 1 and no note is needed.

**Acceptance notes:**
- Default state: product name + total + pre-selected (remembered) payment method + "Xác nhận" button
- Qty stepper + note field collapsed behind "+ Thêm ghi chú / Đổi số lượng" expand link
- Expand link auto-expands if qty > 1 (e.g. combo with 2 combo units)
- Payment method pre-filled from remembered last payment method (US-132)

---

## Epic 39 — Checkout Error Recovery

**US-137** As a shop owner, I want the app to preserve my order and let me retry if the checkout fails, so that I don't lose a sale when there's a brief network issue after the customer has already paid.

**US-138** As a shop owner, I want all confirm buttons to be disabled immediately after I tap them, so that I can never accidentally create a duplicate order by tapping twice.

**Acceptance notes:**
- US-137: full order payload preserved in CheckoutScreen state; on API failure → persistent error banner "Tạo đơn thất bại" + "Thử lại" (re-submits same payload) + "Tạo đơn thủ công" (opens lightweight manual entry fallback); banner stays until resolved
- US-138: all primary action buttons (Xác nhận thanh toán, Xác nhận đơn hàng, Lưu chi phí, Lưu sản phẩm, Bắt đầu sử dụng) disable + show spinner immediately on first tap; re-enable only on error response

---

## Epic 43 — Adaptive POS Grid

**US-142** As a shop owner with many products, I want the POS product grid to use 3 columns on larger phones, so that I can see more products without scrolling and serve customers faster.

**US-143** As a shop owner, I want to manually toggle the product grid density, so that I can choose the layout that works best for my screen size and eyesight.

**Acceptance notes:**
- US-142: `useWindowDimensions()` — auto 2 cols if width < 390px, 3 cols if ≥ 390px
- US-143: ⊞/🔲 toggle icon in POS header; overrides auto; preference stored in AsyncStorage key `pos_grid_columns`; options: Auto / 2 / 3
- Product card height adjusts proportionally to maintain readable text at 3 cols

---

## Epic 44 — Order Note Quick Phrases

**US-144** As a shop owner, I want quick-phrase chips above the keyboard when typing an order note, so that I can add common instructions (e.g. "Cắt ngắn", "Ít đá") with one tap instead of typing.

**Acceptance notes:**
- Chips appear above keyboard when note field is focused (KeyboardAccessoryView pattern)
- Tapping appends chip text to note field (not replaces)
- Default phrases per shop type (hardcoded client-side in `src/utils/quickPhrases.ts`): barber = ["Cắt ngắn", "Cắt dài", "Tỉa râu", "Hàn Quốc"]; café = ["Ít đá", "Nhiều đá", "Không đường", "Ít ngọt"]
- Configurable in Settings → Cấu hình POS → "Ghi chú nhanh" (add/remove/reorder custom phrases)
- Used on: CheckoutScreen note field + Quick Checkout sheet note field

---

## Epic 46 — Selling Tab View Memory

**US-146** As a shop owner, I want the Selling tab to remember whether I was on the POS view or Orders view when I switch to another tab and come back, so that I don't lose my context mid-session.

**Acceptance notes:**
- `sellingStore` (Zustand, in-memory — no persist): `activeView: 'pos' | 'orders'`
- Preserved across tab switches within the same app session
- Resets to `'pos'` on app restart (intentional — POS is the default start-of-day state)

---

## Epic 53 — Sold-Out Quick Toggle

**US-168** As a shop owner, I want to long-press a product card in the POS grid to instantly mark it as "Hết hàng" or restore it to "Đang bán", so that I can manage availability in under 2 seconds without leaving the POS.

**US-168b** As a shop owner, I want the app to prompt me at the start of each day if any products are still marked as sold-out from yesterday, so that I can restore them in one tap before service begins.

**Acceptance notes:**
- Long-press on any product card → bottom action sheet reads current state:
  - If active: shows **"Hết hàng 🔴"** option → marks sold-out
  - If sold-out: shows **"Còn hàng lại 🟢"** option → restores
  - Always shows Cancel
- "Hết hàng" → `PATCH /api/products/{id}/visibility { active: false }` + optimistic UI (card fades, red "Hết" badge overlaid) + saved to `sold_out_log` in AsyncStorage: `{ productId, name, markedAt: ISODate }`
- "Còn hàng lại" → `PATCH /api/products/{id}/visibility { active: true }` + card restores full opacity + removes entry from `sold_out_log`
- Sold-out cards remain visible in POS grid (faded + badge) so owner can tap to restore without navigating elsewhere
- Haptic feedback on long-press trigger (`ImpactFeedbackStyle.Medium`)
- **Morning prompt**: on first app open of the day, if `sold_out_log` contains entries from a previous date → alert: "Bạn có X món đang tắt từ hôm qua. Mở lại tất cả?" → [Mở lại] batch-restores all + clears log / [Bỏ qua] clears log (owner keeps them hidden consciously)
- Available to **all shop types** — not street food only; gated by `PRODUCT`

---

## Epic 55 — Cash Default for Street Food

**US-170** As a street food stall owner, I want the checkout to pre-select "Tiền mặt" as the payment method by default, so that I don't need to tap anything for my most common transaction type.

**Acceptance notes:**
- For `STREET_FOOD_*` shop types: initial value of `last_payment_method` in AsyncStorage is seeded to `CASH` on first login (instead of showing no selection)
- Subsequent orders: `last_payment_method` still updates normally (US-132) — if owner switches to bank transfer, that is remembered
- No new setting, no mode toggle — purely a shop-type-aware default seed
- "Đúng tiền" shortcut (US-133) already exists and works alongside this

---

## Epic 56 — Take-Away Queue Number

**US-173** As a street food stall owner, I want each completed order to display a large sequential queue number, so that I can call out the number verbally when the order is ready without needing a physical ticket printer.

**Acceptance notes:**
- After successful checkout, SuccessScreen shows queue number in large font (96px) centered on screen: "Số **42**"
- Queue number = daily sequential order count (1, 2, 3…); resets at midnight
- Derived from `orderNumber` suffix returned by backend — no new field needed
- Screen stays visible until owner taps "Đơn hàng mới" or the 5s auto-dismiss countdown
- Queue number also shown in OrderListScreen row and OrderDetailScreen for the day's orders
- Toggled on/off in Settings → Cấu hình POS → "Hiển thị số thứ tự" (on by default for STREET_FOOD shop types)

---

# Group E — Orders

## Epic 7 — Order Management

**US-44** As a shop owner, I want to view my order history filtered by date, payment method, and status, so that I can find a specific order quickly.

**US-45** As a shop owner, I want to tap an order to see its full details (items, payment, customer), so that I can answer customer queries or resolve disputes.

**US-46** As a shop owner, I want to cancel or complete an order from the detail screen, so that I can manage order status directly on my phone without using the web dashboard.

**Acceptance notes (US-45, US-46):**
- OrderDetailScreen: indigo header + status badge; 4 cards (order meta, items, totals, cancellation)
- Cash payment: shows amountPaid + changeAmount (green) when paymentMethod=CASH
- Cancellation card: red-tint bg, shows cancelReason + cancelledBy + cancelledAt
- Sticky footer (only for PENDING or PROCESSING): "Hoàn thành" (primary green) + "Hủy đơn" (red outline)
- Both buttons disabled when any mutation pending; respective button shows spinner
- `PUT /api/orders/{id}/complete` + `POST /api/orders/{id}/cancel`
- On success: `queryClient.setQueryData(['order', orderId], updated)` + `invalidateQueries(['orders'])` — no full refetch

---

## Epic 29 — Receipt Reprint

**US-124** As a shop owner, I want to reprint a receipt for any past order, so that I can give customers a copy when they ask for one after the sale.

**Acceptance notes:**
- "🖨️ In biên nhận" button added to OrderDetailScreen action row
- Always shown regardless of order status
- Uses `expo-print` with default print template + order data; no new API needed

---

# Group F — Products & Inventory

## Epic 12 — Products

**US-68** As a shop owner, I want to add a new product with a name, price, unit, and category quickly from my phone, so that I can keep my menu up to date without using a computer.

**US-69** As a shop owner, I want to edit a product's price or details, so that I can update my menu when costs change.

**US-70** As a shop owner, I want to see all my products in a searchable, filterable list, so that I can find and manage any product quickly.

**US-71** As a shop owner, I want to see how many times a product has been ordered in the last 30 days on its detail screen, so that I know which products to promote or discontinue.

---

## Epic 13 — Inventory

**US-72** As a shop owner with a product-based shop, I want to see my current stock levels at a glance, so that I know what needs restocking before I run out.

**US-73** As a shop owner, I want to see which products are low on stock or out of stock, so that I can prioritise restocking.

**US-74** As a shop owner, I want to manually adjust a product's stock with a reason (incoming stock, stocktake, damage), so that my inventory figures stay accurate.

**Acceptance notes:**
- US-72/73: status badges 🟢 Còn hàng / 🟡 Sắp hết (≤ reorder threshold) / 🔴 Hết hàng
- Inventory tab only visible when shop has `INVENTORY` feature

---

## Epic 30 — Product Category Management

**US-125** As a shop owner, I want to create and manage product categories with a name and emoji, so that I can organise my menu and make it easier for me to find products in the POS.

**US-126** As a shop owner, I want to be warned before deleting a category that still has products assigned to it, so that I don't accidentally break my product organisation.

**Acceptance notes:**
- US-125: CategoryListScreen; emoji picker row + name field; swipe-left Edit/Delete; `GET/POST/PUT/DELETE /api/categories`; gated by `PRODUCT`
- US-126: delete blocked when category has products → `alertStore` with count; user must reassign or delete products first
- Accessible from ProductListScreen header icon or overflow menu → Sản phẩm

---

## Epic 34 — Product Visibility

**US-131** As a shop owner, I want to temporarily hide a product from the POS and order screens without deleting it, so that I can remove seasonal or unavailable items and bring them back later.

**Acceptance notes:**
- Swipe-left on ProductListScreen → "Tạm ẩn" action; hidden products shown with reduced opacity + "Đã ẩn" badge
- Swipe-left on hidden product → "Hiện lại" action
- Filter chips in ProductListScreen: [Đang bán] [Tạm ẩn] [Hết hàng]
- Hidden products excluded from POS grid, quick order strip, combo product picker
- `PATCH /api/products/{id}/visibility { active: boolean }`; gated by `PRODUCT`

---

## Epic 49 — Top Selling Products on Product Page

**US-149** As a shop owner, I want to see my top-selling products highlighted on the product page, so that I can identify my bestsellers at a glance without navigating to the Report screen.

**Acceptance notes:**
- "📊 Bán chạy" section at the top of `ProductListScreen`, above the main product list
- Reuses `GET /api/orders/top-products?limit=5&days=30` — already endpoint 28, same data as Quick Order strip
- Each card in horizontal scroll: rank badge (#1, #2…) + product name + "X lần bán" + small progress bar (max seller = 100%, others proportional) — all **UI-calculated** from the `orderCount` values returned
- Section collapsible ("Ẩn ∧" / "Xem ∨" toggle); collapsed state saved to `AsyncStorage('product_topsellers_expanded')`, default open
- Tap card → scrolls to that product in the main list (highlight flash)
- Section hidden entirely when no order history (empty `top-products` response)
- `staleTime: 5 * 60_000` (same cache key as Quick Order strip — shared)
- No new backend endpoint needed

---

# Group G — Customers

## Epic 11 — Customer Management

**US-63** As a shop owner, I want to save customer information (name, phone, birthday, email, gender, social links, preferences, ID card) when they first visit, so that I can build a complete profile for regular customers.

**US-64** As a shop owner, I want to search customers by name or phone number, so that I can find a customer record quickly when they're standing at the counter.

**US-65** As a shop owner, I want to see a customer's full order history and total spending, so that I can reward my best customers.

**US-66** As a shop owner, I want to call a customer directly from their profile, so that I don't have to switch to the phone app to contact them.

**US-67** As a shop owner, I want to see customers filtered by "khách quen" (5+ orders), so that I can identify my loyal regulars at a glance.

**US-150** As a shop owner, I want to edit a customer's information at any time, so that I can keep their profile accurate as their details change.

**US-151** As a shop owner, I want to delete a customer record when it is no longer needed, so that my customer list stays clean and accurate.

**Acceptance notes (US-63, US-150):**
- CustomerFormScreen handles both create and edit modes (`customerId` param undefined = create, string = edit)
- 4 section cards: Thông tin cơ bản / Mạng xã hội / Sở thích & ghi chú / CCCD
- Gender shown as 3-button toggle (Nam / Nữ / Khác); selected = primary color
- Phone conflict check on blur: `GET /api/customers/check-phone` — warns if already taken by different customer
- Edit mode pre-fills from `GET /api/customers/{id}` on mount; shows Skeleton while loading
- `POST /api/customers` (create) or `PUT /api/customers/{id}` (update); gated by `CUSTOMER`

**Acceptance notes (US-151):**
- Trash icon in CustomerDetailScreen header → `Alert.alert` confirm → `DELETE /api/customers/{id}`
- On success: `invalidateQueries(['customers'])` + navigation.goBack()
- Gated by `CUSTOMER`

---

## Epic 33 — Loyalty Points Redemption

**US-130** As a shop owner, I want customers to be able to redeem their loyalty points as a discount at checkout, so that the points system actually benefits them and encourages repeat visits.

**Acceptance notes:**
- "Dùng điểm tích lũy" toggle appears on CheckoutScreen only when order linked to customer with points > 0
- Conversion rate from `GET /api/shop-config/loyalty`; e.g. 100 points = 10,000 ₫
- Toggle on → adds discount line item + `redeemPoints: true` in order payload → backend deducts points
- Gated by `CUSTOMER`

---

## Epic 41 — Recent Customers at Checkout

**US-140** As a shop owner, I want to see my last 5 customers as quick-tap chips when linking a customer at checkout, so that I can attach a regular customer to their order in one tap instead of searching.

**Acceptance notes:**
- Customer picker sheet: "Khách gần đây" horizontal chip row (avatar + name) above search bar
- Chips show last 5 distinct customers linked to completed orders, ordered by most recent
- Tapping a chip selects that customer immediately — no sheet navigation needed
- Falls back to search-only if no orders with customers yet
- API: `GET /api/customers/recent?limit=5` (new endpoint, item 52)

---

## Epic 48 — Customer Order History Summary

**US-148** As a shop owner, I want to see a customer's full order history with a per-order summary, so that I can understand how much they buy and what they order without leaving the customer screen.

**Acceptance notes:**
- `CustomerDetailScreen` fetches `GET /api/orders?customerId={id}` (paginated, newest first)
- Each row: order number + date + status badge + item summary (e.g. "Phở bò × 2, Nước chanh × 1" — max 2 items shown, "+ N khác" if more) + total amount
- 3 stat cards (Tổng đơn hàng, Tổng chi tiêu, Đơn trung bình) are **UI-calculated** from the full fetched list: count rows, sum totals, divide
- Stats recalculate as more pages load (infinite scroll)
- No dedicated stats endpoint needed — all derived from order list data
- `staleTime: 0` for order list; `staleTime: 60_000` for customer profile
- Tap row → `OrderDetailScreen`
- Empty state: "Chưa có đơn hàng nào" (same `EmptyState` component)

---

# Group H — Expenses

## Epic 8 — Expenses

**US-47** As a shop owner, I want to record a business expense (rent, electricity, supplies) with a category, amount, payment date, and note, so that I have a complete picture of my costs.

**US-48** As a shop owner, I want category suggestions shown as chips when adding an expense, so that I can categorise quickly without typing.

**US-49** As a shop owner, I want to see my total expenses for the month broken down into fixed vs variable, so that I can identify where my money is going.

**US-50** As a shop owner, I want to see an expense trend chart by day/week/month/year, so that I can spot unusual spikes in spending.

**US-51** As a shop owner, I want to define my recurring fixed expenses once (rent, electricity, etc.) as defaults, so that I don't have to re-enter them every month.

**US-52** As a shop owner, I want the app to prompt me to copy my fixed expense defaults into the new month, so that my monthly tracking is complete without manual data entry.

**US-53** As a shop owner, I want to update or delete an expense I recorded incorrectly, so that my reports stay accurate.

**Acceptance notes:**
- US-48: chips have emoji + color; ordered by shop-type commonness; reorder on typing (diacritic-insensitive)
- US-52: auto-prompt once per month on first Expenses screen open (AsyncStorage key); also available via manual "Sao chép" button; both use `useExpenseClonePrompt` hook
- US-51: "Cố định" type in Add sheet + "Lưu vào chi phí mặc định" toggle

---

## Epic 47 — Expense Category Personal Frequency

**US-147** As a shop owner who records the same expense categories repeatedly, I want the suggestion chips to learn my most-used categories and show them first, so that I find my common categories without scanning the full list.

**Acceptance notes:**
- Usage tracked in AsyncStorage key `expense_category_counts`: `{ [categoryName]: number }`
- Incremented on every expense save
- Chip order: personal frequency desc → shop-type default order → others
- Diacritic-insensitive input reorder still applies on top of frequency order
- No backend needed — purely client-side learning

---

## Epic 54 — Shop-Type Expense Category Ordering

**US-169** As a street food stall owner, I want the expense category chips to show market-related categories (Nguyên liệu, Chi chợ, Thực phẩm) first when I add an expense, so that I can categorise my daily market purchases without scrolling past irrelevant options.

**Acceptance notes:**
- `STREET_FOOD_DEFAULT_EXPENSE_ORDER` constant in `expenseCategories.ts` defines initial chip order for STREET_FOOD shop types: `['Nguyên liệu', 'Chi chợ', 'Thực phẩm', 'Điện nước', 'Nhân công', ...]`
- Applied as the baseline chip order on first use (before personal frequency data accumulates from US-147)
- Once the owner has recorded ≥5 expenses, frequency-based ordering (US-147) takes over naturally
- No new screen or button — purely a constant that controls initial ordering in the existing expense add sheet
- Applied for all F&B and STREET_FOOD shop types; other shop types keep the existing generic ordering

---

# Group I — Notifications

## Epic 10 — Notifications

**US-59** As a shop owner, I want to see a notification badge on the bell icon showing how many unread messages I have, so that I never miss an important alert.

**US-60** As a shop owner, I want to tap a notification to go directly to the relevant screen (e.g. order detail, subscription page), so that I can act on it immediately.

**US-61** As a shop owner, I want to mark individual notifications as read or mark all as read at once, so that my notification list stays clean.

**US-62** As a shop owner, I want to filter notifications by type (orders, system alerts), so that I can focus on what matters most at any given moment.

**Acceptance notes:**
- US-59: unread count polled every 30s via `refetchInterval`
- US-60: navigation target determined by notification type

---

## Epic 28 — Notification Preferences

**US-123** As a shop owner, I want to choose which types of notifications I receive, so that I only get alerts that are relevant to how I run my shop.

**Acceptance notes:**
- Grouped toggles: Đơn hàng (new order, cancelled) · Tồn kho (low stock, out of stock) · Hệ thống (subscription expiry, app update)
- Auto-saves on toggle with 300ms debounce → `PUT /api/notifications/preferences`
- Accessible from Settings → row "Cài đặt thông báo" under Thông báo group
- Gated by `NOTIFICATION`; `staleTime: 5 * 60_000`

---

## Epic 40 — Notification Bell on All Tabs

**US-139** As a shop owner, I want to see the notification bell and its unread count from any tab, so that I don't miss alerts when I'm on the Selling or Expenses screen for hours.

**Acceptance notes:**
- Bell icon moved from HomeScreen header to AppStack-level header (right side), visible on all 5 tabs
- HomeScreen no longer has its own bell — it inherits the AppStack header bell
- Unread badge count still polled every 30s

---

# Group J — Payments & Finance

## Epic 23 — Bank Transfer QR at Checkout

**US-112** As a shop owner, I want to show my bank account QR code to customers who pay by transfer, so that they can scan and pay without me reading out my account number.

**US-113** As a shop owner with multiple bank accounts, I want to choose which account to display the QR for, so that I can direct payment to the account I prefer for that transaction.

**US-114** As a shop owner, I want the transfer reference to be auto-generated with the order number, so that I can match incoming transfers to orders without guessing.

**Acceptance notes:**
- US-112: QR opens automatically when "Chuyển khoản" selected; generated client-side via `react-native-qrcode-svg` using full VietQR/EMVCo standard; encodes bankCode + accountNo + **exact final order total** + reference; QR re-generates live if total changes (e.g. loyalty toggle); no bank account set up → prompt with setup link shown instead of QR
- US-113: bank accounts from `GET /api/shop-config/banks`; radio list; switching account → QR re-generates immediately with same amount
- US-114: reference format `TAPPYPOS {HH:mm DD/MM}` (not order number — order not created yet when QR shown; fits 50-char bank transfer description limit)
- Privacy mode: amount label shows `••••••` but QR still encodes real amount (QR is for customer to scan)
- "Đã nhận được tiền" = manual confirmation by owner after verifying in banking app → creates order with `paymentMethod: TRANSFER`

---

## Epic 31 — Bank Account Management

**US-127** As a shop owner, I want to add and manage my bank accounts in the app, so that customers can scan the correct QR code when paying by transfer.

**US-128** As a shop owner, I want to set a default bank account for QR payments, so that the right account appears automatically at checkout without me choosing every time.

**Acceptance notes:**
- US-127: BankAccountListScreen; Add/Edit sheet: bank picker (searchable) + account number + account name (auto-UPPERCASE) + branch (optional); `POST/PUT/DELETE /api/shop-config/banks`; gated by `SHOP_SETTING`
- US-128: "Đặt mặc định" action on non-default rows; default shown in QR sheet first
- Accessible from Settings → Cửa hàng → "Tài khoản ngân hàng"

---

## Epic 45 — Remember QR Bank Selection

**US-145** As a shop owner who regularly uses a non-default bank account for transfers, I want the QR sheet to remember which bank I selected last, so that I don't have to switch accounts on every transfer order.

**Acceptance notes:**
- `lastSelectedBankId` stored in AsyncStorage key `last_qr_bank_id`
- Pre-selected on BankTransferQRSheet open; falls back to default bank if stored ID no longer exists
- Updated on every bank selection change within the sheet

---

# Group K — Settings & Shop Config

## Epic 15 — Print Templates

**US-79** As a shop owner, I want to customise my receipt to show my shop name, address, and a thank-you message, so that my receipts look professional.

**US-80** As a shop owner, I want to preview the receipt before saving my changes, so that I can see exactly what will be printed without wasting paper.

**US-81** As a shop owner, I want to print a test receipt from the template editor, so that I can verify the layout on my actual thermal printer.

**US-82** As a shop owner, I want to choose between 58mm and 80mm paper sizes, so that the receipt fits my printer model correctly.

**US-83** As a shop owner, I want to set one template as the default, so that it's used automatically after every sale without me choosing it each time.

**Acceptance notes:**
- US-80: live preview pane updates on every toggle/text change using sample order data
- US-81: "In thử" → `expo-print` with sample data

---

## Epic 16 — Settings & Profile

**US-84** As a shop owner, I want to update my nickname and profile photo, so that the app greets me by the name I prefer.

**US-85** As a shop owner, I want to change my password from within the app, so that I can keep my account secure without contacting support.

**US-86** As a shop owner, I want to update my shop name and address, so that my receipts and customer-facing information stay current.

**US-87** As a shop owner, I want to copy or share my shop ID from the settings, so that I can tell new staff or customers how to find my shop in the app.

**US-88** As a shop owner, I want to configure POS defaults (default mode, auto-print, cash denominations, VAT), so that checkout works the way my shop operates without me adjusting it every day.

**US-89** As a shop owner, I want to switch the app between light and dark mode (or follow system setting), so that the screen is comfortable in any lighting condition.

**US-90** As a shop owner, I want to see my current subscription plan, expiry date, and which features are included, so that I'm never surprised by features being unavailable.

**US-91** As a shop owner, I want to see a contact number and email for TappyPOS support within the app, so that I can get help without searching online.

**US-92** As a shop owner, I want to read the Terms & Conditions from within the app and see when I accepted them, so that I can review my agreement at any time.

**US-93** As a shop owner, I want to enable or disable the privacy mode (hide all revenue figures) from the Settings screen, so that I can toggle it even when I'm not on the home screen.

**Acceptance notes:**
- US-85: on success → alert "Vui lòng đăng nhập lại" → auto logout
- US-87: copy → `Clipboard`; share → `Share.share` with shop URL
- US-88: all POS config changes auto-save with 500ms debounce

---

## Epic 32 — Shop Logo Upload

**US-129** As a shop owner, I want to upload my shop's logo, so that it appears on printed receipts and makes my business look more professional.

**Acceptance notes:**
- Logo upload section at top of ShopInfoScreen; `ImagePicker` → square crop → circle preview
- Formats: PNG/JPG; max 2MB; uploaded via `PUT /api/shop-config/logo` (multipart/form-data)
- Gated by `SHOP_SETTING`

---

# Group L — Security

## Epic 17 — Security (PIN & Biometric Settings)

**US-94** As a shop owner, I want to turn off my PIN from Settings if I no longer want it, so that I can go back to password-only login.

**US-95** As a shop owner, I want to change my PIN from Settings without having to log out, so that I can rotate my PIN periodically.

**US-96** As a shop owner, I want to enable biometric login from Settings after initially skipping it, so that I can add fingerprint or Face ID at any time.

**Acceptance notes:**
- US-94: `alertStore` confirmation required before disabling PIN
- US-96: biometric toggle disabled if PIN is off; enabling biometric requires PIN to be on first

---

## Epic 38 — Background PIN Lock Timeout

**US-135** As a shop owner, I want the app to automatically lock and require my PIN when it returns from the background after a set time, so that my shop data is protected when I leave my phone unattended.

**US-136** As a shop owner, I want to choose how long the app waits before locking (1 min / 5 min / 15 min / Never), so that I can balance security with convenience based on how I work.

**Acceptance notes:**
- `AppState` listener: stores `backgroundTimestamp` in AsyncStorage on `background`; on `active` checks `now - backgroundTimestamp > lockTimeout`
- If exceeded → navigate to PinLoginScreen (or password if PIN disabled)
- Default lock timeout: 5 minutes
- Only applies when PIN is enabled
- Configurable from Settings → Bảo mật → "Tự động khoá" (new row below PIN toggle)
- SecureStore key: `lock_timeout` (values: `1`, `5`, `15`, `never`)

---

# Group M — App Infrastructure

## Epic 18 — Activity Log

**US-97** As a shop owner, I want to see a history of all actions taken in my account (logins, orders, settings changes), so that I can audit what happened if something looks wrong.

**US-98** As a shop owner, I want to filter the activity log by date range and action type, so that I can find a specific event quickly without scrolling through everything.

**US-99** As a shop owner, I want to see whether an action was taken from the mobile app or the web dashboard, so that I can understand how my shop is being accessed.

**Acceptance notes:**
- US-99: `📱 MOBILE` badge shown on entries where `source = MOBILE`
- US-97: `ACTIVITY_LOG` included in MINIMAL plan; log viewer in Settings → "Lịch sử hoạt động"

---

## Epic 19 — Subscription

**US-100** As a shop owner, I want to see my subscription status, plan name, and expiry date in Settings, so that I know when I need to renew.

**US-101** As a shop owner, I want to see exactly which features are included in my current plan, so that I understand what I'm paying for.

**US-102** As a shop owner, I want to be warned 30 days before my subscription expires with a banner on the home screen and an indicator in Settings, so that I have enough time to renew without disruption.

**Acceptance notes:**
- US-100/101: `GET /api/subscriptions/current` → card in Settings → Gói dịch vụ
- US-102: banner dismissible per session; amber color; "Liên hệ để gia hạn →" link to contact section

---

## Epic 20 — App Launch & Reliability

**US-103** As a shop owner, I want to see a branded loading screen when the app opens, so that there is no blank flash or disorienting jump while my session is being restored.

**US-104** As a shop owner, I want to be prompted to update the app when my version is no longer supported, so that I don't encounter broken features or API errors without knowing why.

**US-105** As a shop owner, I want to see a soft notification when a newer version is available (but not required), so that I can update at a convenient time without being blocked.

**US-106** As a shop owner, I want to see a clear banner when my phone has no internet connection, so that I understand why data isn't loading instead of seeing blank or stale screens.

**US-107** As a shop owner, I want the app to automatically refresh data when my connection is restored, so that I don't need to manually pull-to-refresh after going back online.

**Acceptance notes:**
- US-103: SplashScreen min 600ms; primary green bg; animated dots; runs hydration + version check in parallel
- US-104: `GET /api/app/version`; cannot dismiss; "Cập nhật ngay" → App Store / Play Store
- US-106: `@react-native-community/netinfo`; amber banner slides in from top; does not block interaction

---

## Epic 26 — First-Use Empty States

**US-120** As a new shop owner who just completed onboarding, I want every empty screen to tell me what it's for and give me a direct action to get started, so that I'm never confused by a blank list without knowing what to do next.

**Acceptance notes:**
- Every list screen has `EmptyState` component with emoji + title + subtitle + CTA button
- CTAs are contextually correct: empty orders → "Đến bán hàng"; empty products → "+ Thêm sản phẩm"; etc.
- See `project_mobile_screens.md` → Global UI Components → First-Use Empty States for full table

---

## Epic 27 — Feedback

**US-121** As a shop owner, I want to submit feedback or report a bug to the TappyPOS team from within the app, so that I can improve the product without having to find an external channel.

**US-122** As a shop owner, I want to see the status of feedback I've previously submitted, so that I know whether my report has been received and acted on.

**Acceptance notes:**
- US-121: category chips (🐛 Lỗi / 💡 Góp ý / ✨ Tính năng / ❓ Khác); text area 500 chars; up to 3 photo attachments; `POST /api/feedback`; gated by `FEEDBACK`
- US-122: status badges 🔵 Đã tiếp nhận / 🟡 Đang xử lý / 🟢 Đã xử lý; `GET /api/feedback/my`
- Accessible from Settings → Liên hệ & Hỗ trợ → "Gửi phản hồi"

---

## Epic 58 — Offline Queue (Orders & Expenses)

**US-175** As a street food stall owner with unreliable 4G, I want to continue taking orders and logging expenses even when my internet is down, so that I never lose a sale or a market cost entry during a connection drop.

**Acceptance notes:**

**Infrastructure:**
- Install `@react-native-community/netinfo`; wire `OfflineBanner` (already exists, currently unused) into root layout — renders amber bar "📴 Đang ngoại tuyến" when offline
- `offlineQueueStore` — Zustand store persisted to AsyncStorage; holds two arrays: `pendingOrders: OfflineOrder[]` and `pendingExpenses: OfflineExpense[]`
- `useOfflineSync` hook — listens to NetInfo; on reconnect drains both queues sequentially

**POS while offline:**
- Product grid renders from React Query cache (stale data — no refetch attempted while offline)
- Cart and checkout work normally
- At checkout: if offline → save `{ items, total, paymentMethod, tableId, createdAt }` to `pendingOrders` instead of calling API
- `OrderSuccessScreen` still shows with "📴 Đã lưu tạm" badge instead of order number
- Pending orders shown at top of `OrderListScreen` with "⏳" badge; revenue KPI on HomeScreen includes them optimistically
- **Disabled while offline**: promo code field hidden, loyalty toggle hidden, customer picker hidden (require server validation)

**Expenses while offline:**
- Expense add sheet works normally
- On save: if offline → save `{ name, amount, category, expenseType, date, note }` to `pendingExpenses`
- Expense shown in list immediately with "⏳" badge; monthly total includes it optimistically
- On reconnect: `POST /api/expenses` for each pending expense before orders (expenses are simpler, no conflict risk)

**Sync on reconnect:**
- Process `pendingExpenses` first, then `pendingOrders`, one by one
- Each success: remove from queue; show running toast "✅ Đã đồng bộ X / Y"
- Each failure: mark item "❌ Lỗi" with retry / discard options (shown in respective list screens)
- Edge case — empty cache (first ever open offline): product grid shows `EmptyState` "Kết nối mạng lần đầu để tải sản phẩm"
- `OFFLINE_MODE` feature flag (new; included by default for all F&B and STREET_FOOD plans)

---

# Group N — Vertical (Shop-Type Specific)

## Epic 25 — Gold Prices (JEWELRY shops)

**US-117** As a jewelry shop owner, I want to see the current gold buy and sell prices per chỉ, so that I know the day's rates when serving customers without looking them up elsewhere.

**US-118** As a jewelry shop owner, I want to update today's gold price in the app, so that all gold-product calculations and pawn valuations use the correct current rate.

**US-119** As a jewelry shop owner, I want to see a 7-day price history chart, so that I can spot trends and explain price changes to customers.

**Acceptance notes:**
- US-117/118/119: only visible when `PAWN` feature in JWT (JEWELRY shop type)
- US-118: `POST /api/gold-prices`; validation warns if sell price < buy price; `UndoToast` on save
- Accessed from overflow menu → "💰 Giá vàng hôm nay"

---

## Epic 50 — Barber Queue Status Badge (BARBER_SHOP only)

**US-153** As a barber shop owner, I want to see how many services are currently waiting and in-progress at the top of the selling screen, so that I can gauge shop busyness at a glance before creating a new order.

**Acceptance notes:**
- `QueueStatusBadge` in `BarberServiceScreen` header; two pills: amber "N chờ" (PENDING) + indigo "N đang làm" (IN_PROGRESS)
- Both pills hidden when counts are zero
- Data from `orderApi.pendingWorkItems({ size: 100 })`; `staleTime: 30_000`; invalidated after every checkout
- Only shown on `BARBER_SHOP` (inside `BarberServiceScreen`); no feature gate beyond `POS`/`ORDER`

---

## Epic 51 — Barber Employee Commission Assignment (BARBER_SHOP + EMPLOYEE feature)

**US-154** As a barber shop owner, I want to assign a staff member to each service when I add it to an order, so that the system can track which employee performed each service for commission and performance reports.

**US-155** As a barber shop owner, I want employee assignment to be optional at add time, so that I can create an order quickly without blocking on staff selection when the shop is busy.

**Acceptance notes:**
- Employee picker appears in `AddItemSheet` only for service items (`durationMinutes > 0`); hidden for retail products (qty stepper shown instead)
- `ScrollView` of avatar chips (initials circle + last word of name); selected chip turns indigo; tap again to deselect
- Label shows "Thợ thực hiện (tuỳ chọn)"; no validation error if none selected
- On checkout: for each `CartItem` with a non-null employee, `cartApi.updateCommission(cartId, newItemId, employeeId)` called after `cartApi.addItem()` using the `knownItemIds` diff pattern to identify the newly added item
- Employee list from `employeeApi.listActive()`; `staleTime: 5 * 60_000`; entire picker hidden when `!has('EMPLOYEE')`

---

## Epic 52 — F&B Shop Types & Table Management

**US-156** As a F&B shop owner (pub/beer house), I want to register my shop under a specific sub-type (Quán nhậu, Quán nhậu hải sản, Quán nhậu chuyên dê, Quán nhậu chuyên bò) during onboarding, so that the system seeds my product catalogue with relevant categories (hải sản, thịt dê, bia & rượu, etc.) automatically.

**US-157** As a F&B shop owner, I want a dedicated "Table Setup" step in my onboarding wizard (step 3 of 5), so that I can auto-generate N tables (e.g. "Bàn 1"–"Bàn 10") or add tables manually (with number, capacity, and area/location), before I continue to expenses.

**US-158** As a F&B shop owner who hasn't set up tables yet, I want to skip the table setup step during onboarding, so that I can finish registration quickly and add tables later from Settings.

**US-159** As a F&B shop owner with TABLE_SERVICE enabled, I want the POS home screen to show a colour-coded table grid (3 columns) instead of the product list, so that I can see at a glance which tables are free (green), occupied (red), reserved (amber), or being cleaned (gray).

**US-160** As a F&B shop owner, I want to tap a green (available) table to start an order for that table, so that the POS product screen opens pre-assigned to that table without extra navigation steps.

**US-161** As a F&B shop owner taking an order, I want to see the selected table's name displayed as a green badge in the POS header, so that I always know which table I am adding products for.

**US-162** As a F&B shop owner, I want to tap the table badge in the POS header to deselect the table, so that I can return to the table grid to choose a different table.

**US-163** As a F&B shop owner, I want the table status to change to OCCUPIED (red) automatically the moment I submit an order for it ("Gọi món"), so that my staff can see the table is busy without manually updating anything.

**US-164** As a F&B shop owner, I want to tap an occupied (red) table in the grid to jump directly to the live order for that table, so that I can review or complete the order without searching through the order list.

**US-165** As a F&B shop owner, I want the table status to revert to AVAILABLE (green) automatically when the order is completed or cancelled, so that staff always see an accurate table map.

**US-166** As a F&B shop owner with tables in multiple areas (e.g. "Trong nhà", "Ngoài sân"), I want location filter tabs at the top of the table grid, so that I can quickly focus on a single area instead of scrolling through all tables.

**US-167** As a F&B shop owner, I want to manage tables from the Settings screen (add, rename, change capacity, delete), so that I can keep the table grid up to date as my layout changes over time.

**Acceptance notes:**
- TABLE_SERVICE feature flag gates the TableController (GET/POST/PUT/DELETE /tables) and the mobile table grid routing
- `POSMainScreen` renders `<TableGridScreen />` when `FB_TABLE_CODES.includes(shopTypeCode) && has('TABLE_SERVICE') && !tableId`; renders `<POSScreen />` when `tableId` is set in cartStore — no navigation push, just a re-render
- `cartStore.setTable(id, tableNumber)` / `setTable(null, null)` drives the inline switch
- `clearCart()` resets `tableId: null, tableLabel: null` so after `sendToKitchen` the grid is shown again automatically
- Table status colors: AVAILABLE → green border (`border-green-400`), OCCUPIED → red border + light red bg, RESERVED → amber, CLEANING → gray
- `staleTime: 30_000` for tableApi.list in TableGridScreen
- Location filter tabs shown only when ≥2 distinct location values exist in the table list
- Delete table blocked by backend when status ≠ AVAILABLE (returns 400)
- 5-step onboarding header for F&B; 4-step for all other shop types; driven by `isFnbShop(backendCode)`
- `selfProvision` payload includes `tables: [...] | undefined`; backend seeds shop_table rows via `seedOnboardingTables()`

---

## Epic 60 — Street Food / Sidewalk Eatery Shop Types

**US-176** As a street food stall owner, I want to register my shop under a specific sub-type (Quán bún/phở, Cơm bình dân, Bánh mì, Xôi & bánh) during onboarding, so that the system seeds my product catalogue with relevant menu items and categories automatically.

**Acceptance notes:**
- 4 new backend shop type codes: `STREET_FOOD_NOODLE`, `STREET_FOOD_RICE`, `STREET_FOOD_BANH_MI`, `STREET_FOOD_XOI`
- All 4 types: no TABLE_SERVICE (no assigned seating); OFFLINE_MODE enabled; STREET_FOOD flag set in JWT
- Seed categories per type:

| Type | Categories seeded |
|---|---|
| STREET_FOOD_NOODLE | Phở & Bún, Thêm (giò, trứng, rau), Đồ uống |
| STREET_FOOD_RICE | Món chính, Cơm & Canh, Thêm (trứng, đồ chua), Đồ uống |
| STREET_FOOD_BANH_MI | Bánh mì nhân, Thêm (pate, chả, rau), Đồ uống |
| STREET_FOOD_XOI | Xôi mặn, Xôi ngọt, Bánh & Chè, Đồ uống |

- Onboarding: 4-step wizard (no TableSetup step); `isFnbShop()` returns false for STREET_FOOD types so TABLE_SERVICE onboarding is skipped
- Mobile shopTypes.ts: add `STREET_FOOD` group with 4 entries; `isStreetFoodShop(backendCode)` helper controls chi chợ shortcut + time-slot revenue + queue number defaults
- POS home shows standard product grid (no table grid) for all STREET_FOOD types

---

## Final Story Map (complete)

| Group | Epic | Stories | Feature Gate | Priority |
|---|---|---|---|---|
| **Auth & Account** | Registration & Shop Discovery | US-01–09 | — | MVP |
| | PIN & Biometric Login | US-10–15 | — | MVP |
| | Forgot Password | US-108–109 | — | MVP |
| | Language Selection | US-110–111 | — | MVP |
| | Account Deletion | US-115–116 | — | MVP |
| **Onboarding** | Onboarding Wizard | US-16–22, US-152 | — | MVP |
| **Home & Reports** | Overview | US-23–30 | DASHBOARD | MVP |
| | Reports | US-54–58 | DASHBOARD | MVP |
| | "Hôm qua" Period | US-141 | DASHBOARD | MVP |
| | Time-Slot Revenue Breakdown | US-172 | DASHBOARD | MVP (F&B / Street Food) |
| | End-of-Day Summary | US-174 | — | MVP (Street Food) |
| **POS & Selling** | POS & Selling | US-31–39 | POS | MVP |
| | Quick Order | US-40–43 | POS | MVP |
| | Combo Products | US-75–78 | POS | MVP |
| | Remember Payment Method | US-132 | POS | MVP |
| | Exact Amount Shortcut | US-133 | POS | MVP |
| | Quick Order One-Tap | US-134 | POS | MVP |
| | Checkout Error Recovery | US-137–138 | POS | MVP |
| | Adaptive POS Grid | US-142–143 | POS | MVP |
| | Order Note Quick Phrases | US-144 | POS | MVP |
| | Selling Tab View Memory | US-146 | POS | MVP |
| | Sold-Out Quick Toggle | US-168 | PRODUCT | MVP (Street Food) |
| | Cash-Only Express Checkout | US-170–171 | POS | MVP (Street Food) |
| | Take-Away Queue Number | US-173 | POS | MVP (Street Food) |
| **Orders** | Order Management | US-44–46 | ORDER | MVP |
| | Receipt Reprint | US-124 | ORDER | MVP |
| **Products & Inventory** | Products | US-68–71 | PRODUCT | MVP |
| | Inventory | US-72–74 | INVENTORY | MVP |
| | Product Category Management | US-125–126 | PRODUCT | MVP |
| | Product Visibility | US-131 | PRODUCT | MVP |
| | Top Selling Products | US-149 | PRODUCT | MVP |
| **Customers** | Customer Management | US-63–67, US-150–151 | CUSTOMER | MVP |
| | Loyalty Points Redemption | US-130 | CUSTOMER | MVP |
| | Recent Customers at Checkout | US-140 | CUSTOMER | MVP |
| | Customer Order History Summary | US-148 | CUSTOMER | MVP |
| **Expenses** | Expenses | US-47–53 | — | MVP |
| | Expense Category Frequency | US-147 | — | MVP |
| | Chi Chợ Market Expense Shortcut | US-169 | — | MVP (F&B / Street Food) |
| **Notifications** | Notifications | US-59–62 | NOTIFICATION | MVP |
| | Notification Preferences | US-123 | NOTIFICATION | MVP |
| | Notification Bell All Tabs | US-139 | NOTIFICATION | MVP |
| **Payments & Finance** | Bank Transfer QR | US-112–114 | SHOP_SETTING | MVP |
| | Bank Account Management | US-127–128 | SHOP_SETTING | MVP |
| | Remember QR Bank | US-145 | SHOP_SETTING | MVP |
| **Settings & Config** | Print Templates | US-79–83 | SHOP_SETTING | MVP |
| | Settings & Profile | US-84–93 | — | MVP |
| | Shop Logo Upload | US-129 | SHOP_SETTING | MVP |
| **Security** | Security Settings | US-94–96 | — | MVP |
| | Background PIN Lock | US-135–136 | — | MVP |
| **App Infrastructure** | Activity Log | US-97–99 | ACTIVITY_LOG | MVP |
| | Subscription | US-100–102 | — | MVP |
| | App Launch & Reliability | US-103–107 | — | MVP |
| | First-Use Empty States | US-120 | — | MVP |
| | Feedback | US-121–122 | FEEDBACK | MVP |
| | Offline Order Queue | US-175 | OFFLINE_MODE | MVP (F&B / Street Food) |
| **Vertical — Shop-Type Specific** | Gold Prices | US-117–119 | PAWN | MVP (JEWELRY only) |
| | Barber Queue Status Badge | US-153 | POS / ORDER | MVP (BARBER_SHOP only) |
| | Barber Employee Commission | US-154–155 | EMPLOYEE | MVP (BARBER_SHOP only) |
| | F&B Shop Types & Table Management | US-156–167 | TABLE_SERVICE | MVP (F&B shops only) |
| | Street Food Shop Types | US-176 | — | MVP (Street Food only) |

**Total: 177 user stories across 60 epics, 14 groups.**

**Why:** Written in planning sessions 2026-05-10. US-132–147 added after UX review. US-148–149 added for customer order history and top-sellers. US-150–151 added 2026-05-11 for edit/delete customer. US-153–155 added 2026-05-13 for barber-specific features. US-156–167 added 2026-05-15 for F&B shop types and table management. US-168–176 added 2026-05-15 for street food / sidewalk eatery shop type. US-168b added, US-169/170/175 revised 2026-05-15 after design review (sold-out toggle all shop types; chi chợ via expense chip ordering; cash default seed; offline covers expenses too). Epics grouped by domain 2026-05-15.
**How to apply:** Reference during implementation to verify feature completeness. Each story maps to one or more screens in `project_mobile_screens.md`.

**Feature coverage check:**
| JWT Feature | Stories | Gap |
|---|---|---|
| DASHBOARD | US-23–30, US-54–58, US-141, US-172 | ✅ |
| POS | US-31–43, US-75–78, US-88, US-132–134, US-137–138, US-142–144, US-146, US-168, US-170–171, US-173 | ✅ |
| ORDER | US-44–46, US-124 | ✅ |
| PRODUCT | US-68–71, US-125–126, US-131, US-149, US-168 | ✅ |
| INVENTORY | US-72–74 | ✅ |
| CUSTOMER | US-63–67, US-130, US-140, US-148, US-150–151 | ✅ |
| NOTIFICATION | US-59–62, US-123, US-139 | ✅ |
| FEEDBACK | US-121–122 | ✅ |
| SHOP_SETTING | US-79–83, US-86–88, US-112–114, US-127–129, US-145 | ✅ |
| ACTIVITY_LOG | US-97–99 | ✅ |
| PAWN | US-117–119 | ✅ |
| EMPLOYEE | US-154–155 | ✅ |
| TABLE_SERVICE | US-156–167 | ✅ |
| OFFLINE_MODE | US-175 | ✅ |

**Why:** Written in planning sessions 2026-05-10. US-121–131 added after full feature gap analysis. TABLE_SERVICE, EMPLOYEE, and OFFLINE_MODE rows added 2026-05-15.
**How to apply:** Reference during implementation to verify feature completeness. Each story maps to one or more screens in `project_mobile_screens.md`.
