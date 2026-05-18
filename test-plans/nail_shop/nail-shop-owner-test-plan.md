# E2E Test Plan — Nail Shop · SHOP_OWNER

> **Shop type:** NAIL_SHOP  
> **Role:** SHOP_OWNER — all 23 features  
> **Credentials:** phone `0982065218` · password `12345678x@X`  
> **Platform:** iOS (physical device preferred)  
> **Legend:** ✅ pass · ❌ fail · ⚠️ partial · — not run  
> **Last run:** —  
> **Run order:** execute sections top-to-bottom; later sections depend on data created earlier

---

## Section 0 — Pre-flight

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| PRE-01 | Backend is reachable | `GET /api/actuator/health` → status `UP` | — | |
| PRE-02 | Nail Shop tenant is ACTIVE | Confirmed in master dashboard | — | |
| PRE-03 | At least 2 services/products seeded | Required for POS and appointment tests | — | |
| PRE-04 | At least 1 non-owner staff member exists | Required for appointment employee assignment | — | |
| PRE-05 | At least 1 existing customer record | Required for appointment + loyalty tests | — | |
| PRE-06 | App installed cold on test device | ShopIdScreen shown on first launch | — | |

---

## Section 1 — Auth

### 1.1 Shop ID entry

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| A-01 | Launch app cold | ShopIdScreen shown; input empty and focused | — | |
| A-02 | Submit with empty field | Submit button disabled; no API call | — | |
| A-03 | Enter unknown tenant ID → submit | Inline error "Không tìm thấy cửa hàng" below input | — | |
| A-04 | Enter valid Nail Shop tenant ID → submit | Navigates to LoginScreen; shop name shown read-only | — | |
| A-05 | Kill and relaunch app | Goes directly to PinLoginScreen (if PIN set) or LoginScreen | — | |

### 1.2 Login

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| A-06 | Submit with empty phone and password | Inline validation errors on both fields | — | |
| A-07 | Correct phone + wrong password → submit | Inline error below password field | — | |
| A-08 | Login (PIN not yet set) | → PinSetupScreen | — | First run only |
| A-09 | Login (PIN already set) | → PinLoginScreen | — | Subsequent runs |

### 1.3 PIN setup (first run)

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| A-10 | Enter 6-digit PIN | Confirmation step appears | — | |
| A-11 | Confirm with different PIN | Shake + error "PIN không khớp"; fields cleared | — | |
| A-12 | Confirm with matching PIN | PIN saved; Dashboard shown | — | |

### 1.4 PIN login (subsequent runs)

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| A-13 | Enter wrong PIN | Remaining attempts count shown | — | |
| A-14 | Enter correct PIN | Dashboard shown | — | |
| A-15 | Tap "Đăng nhập bằng mật khẩu" | → LoginScreen | — | |

---

## Section 2 — Navigation & feature gate

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| N-01 | Bottom tab bar | 5 tabs: Trang chủ · Bán hàng · Chi phí · Báo cáo · Cài đặt | — | |
| N-02 | Active tab colour | Active tab icon tinted accent; others grey | — | |
| N-03 | Open More screen | 2 sections visible: Quản lý + Vận hành | — | |
| N-04 | "Quản lý" tiles | Sản phẩm · Kho hàng · Khách hàng · Combo · Danh mục · Mẫu in · Nhân viên | — | |
| N-05 | "Vận hành" tiles | Công việc của tôi · Hàng chờ · Hiệu suất · Lịch hẹn · Thông báo | — | |
| N-06 | Settings row at bottom of More | Visible | — | |
| N-07 | No PAWN / gold tiles | "Cầm đồ", "Giá vàng" absent from all menus | — | Nail shop has no PAWN |
| N-08 | No VENDOR / purchase-order tiles | "Nhà cung cấp", "Nhập hàng" absent | — | |
| N-09 | Shop name shown in top bar | After login, top bar displays the shop name, not "Quản lý cửa hàng" | — | |

---

## Section 3 — Dashboard

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| D-01 | Open Trang chủ tab | DashboardScreen loads; skeletons shown during fetch | — | |
| D-02 | KPI cards render | At least 3 cards: Doanh thu · Số đơn hàng · Khách hàng mới | — | |
| D-03 | Revenue card visible | SHOP_OWNER sees revenue (not restricted) | — | Confirms REVENUE feature |
| D-04 | Period: Hôm nay (default) | KPI values for today | — | |
| D-05 | Tap "Tuần này" | Values update to current week | — | |
| D-06 | Tap "Tháng này" | Values update to current month | — | |
| D-07 | Recent orders list | Up to 5 latest orders with number, amount, status badge | — | |
| D-08 | Tap a recent order | → OrderDetailScreen | — | |
| D-09 | Pull-to-refresh | KPI cards + recent orders both refetch | — | |
| D-10 | No orders yet | EmptyState on recent orders section (not blank) | — | |
| D-11 | Network error (airplane mode) | ErrorState + retry button shown | — | |

---

## Section 4 — POS / Bán hàng (BarberServiceScreen — Nail Shop specific)

> **Note:** Nail Shop loads `BarberServiceScreen`, NOT standard `POSScreen`. This screen has employee assignment, customer preferences banner, loyalty redemption, tip, VietQR bank transfer, and quick phrases.

### 4.1 Opening the POS

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| P-01 | Tap "Bán hàng" tab | BarberServiceScreen loads; product/service grid shown | — | |
| P-02 | Grid column toggle | Can switch between 2-col and 3-col grid; preference persisted | — | |
| P-03 | Category chips visible | Horizontal scrollable chips | — | |
| P-04 | Tap a category chip | Grid filters to matching services | — | |
| P-05 | Search by service name | Grid filters within 300 ms | — | |
| P-06 | Clear search | Full grid restored | — | |
| P-07 | No match | EmptyState shown | — | |

### 4.2 Adding services to cart

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| P-08 | Tap a service | Service detail bottom sheet slides up with note + employee + quantity fields | — | |
| P-09 | Quick phrase bar visible | Pre-defined phrases shown (e.g. nail design descriptions) | — | |
| P-10 | Tap a quick phrase | Phrase appended to note field | — | |
| P-11 | Assign an employee (technician) to the service | Employee avatar highlighted | — | |
| P-12 | Add note manually | Note field accepts free text | — | |
| P-13 | Change quantity (stepper) | Quantity increments / decrements | — | |
| P-14 | Tap "Thêm vào giỏ" | Item added; haptic; cart badge increments | — | |
| P-15 | Add same service again | Another line item added (separate employee can be assigned) | — | |
| P-16 | Cart badge shows total items | Correct count; also shows unique technician count | — | |

### 4.3 Cart review (inside BarberServiceScreen)

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| P-17 | Tap cart icon / view cart | Cart items list; each row shows service name, employee, note, price, qty | — | |
| P-18 | Increase/decrease qty in cart | Totals update live | — | |
| P-19 | Remove item from cart | Confirm dialog → item removed | — | |
| P-20 | Empty cart | EmptyState shown | — | |
| P-21 | Tap "Thanh toán" / checkout button | Checkout bottom sheet slides up | — | |

### 4.4 Checkout — customer selection

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| P-22 | Default customer | "Khách lẻ" (walk-in) pre-selected | — | Confirmed by pending-items fix |
| P-23 | Recent customers shown | Up to 6 recent customer chips visible | — | |
| P-24 | Tap a recent customer | Customer selected; preferences banner shown if they have allergies/hair type/preferred services | — | |
| P-25 | Search for customer by name/phone | Debounced search (350 ms); results shown | — | |
| P-26 | Tap search result | Customer selected and linked to order | — | |
| P-27 | Customer preferences banner | Shows allergies, hair type, preferred services if set | — | |
| P-28 | Clear customer selection back to walk-in | Walk-in restored | — | |

### 4.5 Checkout — payment methods

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| P-29 | 3 payment methods shown | Tiền mặt · Chuyển khoản · Khác | — | |
| P-30 | Select "Tiền mặt" | Cash fields appear: amount received + change calculator | — | |
| P-31 | Enter cash ≥ total | Change calculated correctly | — | |
| P-32 | Enter cash < total | Change shows 0 or shortfall | — | |
| P-33 | Select "Chuyển khoản" | Bank account picker appears | — | |
| P-34 | Bank account picker shows saved accounts | List of shop's bank accounts | — | |
| P-35 | Select a bank account | QR code generated via VietQR for the order total | — | |
| P-36 | QR code image visible | Customer can scan with banking app | — | |
| P-37 | Selected bank saved as last used | Next checkout pre-selects same bank | — | |
| P-38 | Payment method preference persisted | Next session opens with last used method | — | |

### 4.6 Checkout — tip, promo, loyalty

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| P-39 | Tip quick-select amounts shown | 10K · 20K · 50K · 100K chips | — | |
| P-40 | Tap a tip chip | Tip added to total | — | |
| P-41 | Tap tip chip again | Tip deselected | — | |
| P-42 | Enter promo code (valid) | Discount applied; total reduces | — | |
| P-43 | Enter promo code (invalid) | Error shown; total unchanged | — | |
| P-44 | Customer with loyalty points + program active | "Dùng điểm" toggle visible; shows available points | — | |
| P-45 | Enable loyalty redemption | Points discount calculated and deducted from total | — | |
| P-46 | Effective total = items + tip − loyalty discount | Correct | — | |

### 4.7 Order confirmation

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| P-47 | Tap "Xác nhận đơn hàng" | Spinner; server-side order flow completes; → OrderSuccessScreen | — | |
| P-48 | Network error during confirm | Alert shown; stays on checkout; can retry | — | |
| P-49 | OrderSuccessScreen shows order number + total | Correct values | — | |
| P-50 | Tap "Đơn hàng mới" | Returns to BarberServiceScreen; cart empty; badge gone | — | |

### 4.8 POS view toggle — Orders inline

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| P-51 | Tap Orders toggle in Bán hàng tab | Switches to inline OrderListScreen | — | |
| P-52 | Orders list works as normal | See OR section tests | — | |
| P-53 | Switch back to service grid view | Grid restored; cart state preserved | — | |

---

## Section 5 — Orders

### 5.1 Order list

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| OR-01 | Open OrderListScreen (More or inline POS) | List loads; order rows with number, amount, status badge | — | |
| OR-02 | Skeleton during load | Placeholder rows visible | — | |
| OR-03 | Status filters: Tất cả · Chờ xử lý · Đang xử lý · Hoàn thành · Đã huỷ | Each chip filters correctly | — | |
| OR-04 | Search by order number | Results filter | — | |
| OR-05 | Scroll to bottom | Next page loads (infinite scroll) | — | |
| OR-06 | Pull-to-refresh | Resets to page 1 and refetches | — | |
| OR-07 | **ORDER_VIEW_ALL** — orders from other staff accounts visible | SHOP_OWNER sees all tenant orders, not just own | — | Key verification |
| OR-08 | Empty state | EmptyState shown when no orders | — | |

### 5.2 Order detail

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| OR-09 | Tap an order | OrderDetailScreen opens | — | |
| OR-10 | 4 info cards render | Items · Payment · Customer · Meta (date, staff, created by) | — | |
| OR-11 | Line items with service name, employee, note, qty, price | All fields shown | — | |
| OR-12 | Payment method and amount shown | Correct | — | |
| OR-13 | Assigned technician shown | Staff name visible | — | |
| OR-14 | PENDING — "Hoàn thành" + "Huỷ đơn" buttons in footer | Both visible | — | |
| OR-15 | Tap "Hoàn thành" → confirm | Status → COMPLETED; footer disappears | — | |
| OR-16 | Tap "Huỷ đơn" → confirm | Status → CANCELLED | — | |
| OR-17 | Tap "Huỷ đơn" → cancel dialog | Status unchanged | — | |
| OR-18 | COMPLETED order | Read-only; no action footer | — | |
| OR-19 | CANCELLED order | Read-only; no action footer | — | |

---

## Section 6 — Appointments (APPOINTMENT — Nail Shop critical)

### 6.1 Appointment list

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| AP-01 | Open AppointmentListScreen (More → Lịch hẹn) | Loads; today's date in header; skeletons then list | — | |
| AP-02 | Appointments grouped by hour | Hour label "09:00" with separator line; items below | — | |
| AP-03 | Card shows: customer name, phone, status badge, time, duration, service count, note (italic) | All fields render | — | |
| AP-04 | Status badge colours | PENDING=amber · CONFIRMED=indigo · CHECKED_IN=emerald · CANCELLED=grey · NO_SHOW=rose | — | |
| AP-05 | Finished appointments at 60% opacity | CANCELLED / NO_SHOW / CHECKED_IN dimmed | — | |
| AP-06 | Tap left chevron | Date −1 day; list refetches | — | |
| AP-07 | Tap right chevron | Date +1 day; list refetches | — | |
| AP-08 | Navigate 3+ days from today; "Hôm nay" link appears | Tap → jumps back to today | — | |
| AP-09 | Date with no appointments | EmptyState with hint | — | |
| AP-10 | Pull-to-refresh | Refetches | — | |
| AP-11 | Network error | ErrorState + retry | — | |
| AP-12 | Tap "+" in header or FAB | → AppointmentFormScreen (create mode) | — | |

### 6.2 Create appointment — form fields

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| AP-13 | Form header says "Lịch hẹn mới" | Correct | — | |
| AP-14 | Type customer name manually | Free text accepted | — | |
| AP-15 | Tap search icon | CustomerSearchModal slides up; auto-focus on search | — | |
| AP-16 | Type in customer search | Results filter with debounce | — | |
| AP-17 | Select a customer | Modal closes; name + phone auto-filled; customerId linked | — | |
| AP-18 | Walk-in (manual name, no customer link) | Name accepted; no customerId | — | |
| AP-19 | Date default = today (DD/MM/YYYY) | Correct | — | |
| AP-20 | Tap left/right date chevrons | Date shifts ±1 day | — | |
| AP-21 | Hour spinner ▲ | Hour +1 (wraps 23→0) | — | |
| AP-22 | Hour spinner ▼ | Hour −1 (wraps 0→23) | — | |
| AP-23 | Minute spinner ▲ | Minute +15; at 45 → 00 + hour +1 | — | |
| AP-24 | Minute spinner ▼ | Minute −15; at 00 → 45 + hour −1 | — | |
| AP-25 | Duration "−" at minimum (15 min) | Cannot go below 15 | — | |
| AP-26 | Duration "+" | Increases by 15 min | — | |
| AP-27 | Tap "Thêm dịch vụ" | ProductPickerModal slides up; search field auto-focused | — | |
| AP-28 | Search for a service | Results filter; name + duration shown | — | |
| AP-29 | Select a service | Modal closes; service row added; total duration auto-increases | — | |
| AP-30 | Add 2 different services | Both rows appear; total duration = sum | — | |
| AP-31 | Tap employee dropdown on service row | Employee picker modal; "— Chưa gán —" option at top | — | |
| AP-32 | Select an employee | Employee name shown on service row | — | |
| AP-33 | Select "— Chưa gán —" | Employee removed from row | — | |
| AP-34 | Tap "×" on service row | Service removed; duration reduced | — | |
| AP-35 | Add note | Multiline text accepted | — | |
| AP-36 | Tap "Lưu" with all fields | Spinner → success alert → back to list → new item appears | — | |

### 6.3 Create appointment — validation

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| AP-37 | Tap "Lưu" with empty customer name | Alert "Tên khách hàng là bắt buộc"; stays on form | — | |

### 6.4 Appointment detail — read

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| AP-38 | Tap appointment card | → AppointmentDetailScreen; appointment number in header | — | |
| AP-39 | Status badge correct colour | Matches status | — | |
| AP-40 | Customer info card: name + phone | Shown | — | |
| AP-41 | Date / time / duration card | Correct values | — | |
| AP-42 | Services section: name + assigned employee + price per row | All rows shown | — | |
| AP-43 | Total estimate at bottom of services | Sum of service prices | — | |
| AP-44 | Note section visible (if note set) | Note text displayed | — | |
| AP-45 | Loading state | Skeletons before data | — | |

### 6.5 Appointment detail — PENDING actions

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| AP-46 | "Xác nhận" button visible | Outline indigo button | — | |
| AP-47 | "Huỷ" + "Khách không đến" secondary buttons visible | Both shown | — | |
| AP-48 | Sticky "Check-in" button at bottom | Large indigo button | — | |
| AP-49 | Tap "Xác nhận" | Spinner → CONFIRMED; button disappears | — | |
| AP-50 | Tap "Huỷ" → confirm | → CANCELLED; all action buttons disappear | — | |
| AP-51 | Tap "Huỷ" → cancel dialog | Status unchanged | — | |
| AP-52 | Tap "Khách không đến" → confirm | → NO_SHOW | — | |
| AP-53 | Pencil edit icon in header | Tap → AppointmentFormScreen edit mode | — | |

### 6.6 Appointment detail — CONFIRMED actions

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| AP-54 | "Xác nhận" button gone; "Huỷ" + "Khách không đến" remain | Correct state | — | |
| AP-55 | Sticky "Check-in" button present | Visible | — | |
| AP-56 | Tap "Check-in" | Spinner → CHECKED_IN → success alert with "Mở POS" option | — | |
| AP-57 | Tap "Mở POS" in alert | → BarberServiceScreen with checkInPayload pre-loaded | — | |
| AP-58 | Pencil edit icon visible | Can edit | — | |

### 6.7 Appointment detail — terminal states

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| AP-59 | CHECKED_IN — no action buttons; no check-in; no edit pencil | Read-only; delete link also hidden | — | |
| AP-60 | CANCELLED — no action buttons; no check-in | Delete link shown | — | |
| AP-61 | CANCELLED — tap delete link | Confirm dialog → deleted → back to list | — | |
| AP-62 | NO_SHOW — same as CANCELLED | Delete available | — | |

### 6.8 Edit appointment

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| AP-63 | Open edit from PENDING | Form header "Chỉnh sửa lịch hẹn"; all fields pre-filled | — | |
| AP-64 | Change date + time → save | Updated detail shown | — | |
| AP-65 | Add/remove service → save | Services updated | — | |
| AP-66 | Change assigned employee on a service → save | New employee reflected | — | |

---

## Section 7 — My Work (MY_WORK)

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| MW-01 | Open MyWorkScreen (More → Công việc của tôi) | 2 tabs at top | — | |
| MW-02 | "Công việc của tôi" tab | Work items assigned to current user | — | |
| MW-03 | "Công việc khả dụng" tab | Unassigned / available items | — | |
| MW-04 | PENDING item — "Nhận việc" button | Tap → item moves to my queue | — | |
| MW-05 | My queue PENDING item — "Bắt đầu" button | Tap → status → IN_PROGRESS | — | |
| MW-06 | My queue PENDING item — "Trả lại" button | Tap → item returns to available | — | |
| MW-07 | IN_PROGRESS item — "Hoàn thành" | Tap → item completed | — | |
| MW-08 | IN_PROGRESS item — "Nhả" | Tap → item returns to available pool | — | |
| MW-09 | Empty "Công việc của tôi" | EmptyState shown | — | |
| MW-10 | Empty "Công việc khả dụng" | EmptyState shown | — | |
| MW-11 | Pull-to-refresh on both tabs | Refetch | — | |
| MW-12 | History icon in header | → MyWorkHistoryScreen | — | |

### 7.1 My Work History

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| MW-13 | MyWorkHistoryScreen loads | Work history list with filter bar | — | |
| MW-14 | Filter tabs: DAY · WEEK · MONTH · YEAR | Each tab updates date range label and data | — | |
| MW-15 | Bar chart visible | Chart reflects counts per period | — | |
| MW-16 | Navigate period ← → | Previous/next period loads; date label updates | — | |
| MW-17 | Empty period | EmptyState shown | — | |

---

## Section 8 — Staff Queue (QueueView)

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| SQ-01 | Open QueueView (More → Hàng chờ) | StaffQueueScreen loads | — | |
| SQ-02 | Stat chips: Waiting · In Progress · Done | Counts shown | — | |
| SQ-03 | Each staff card: avatar, name, colour, work items | Renders correctly | — | |
| SQ-04 | IN_PROGRESS items shown green; PENDING items amber | Correct badge colours | — | |
| SQ-05 | Pull-to-refresh | Refetches | — | |
| SQ-06 | Empty queue | Zero stats and no cards | — | |

---

## Section 9 — Customers (CUSTOMER + LOYALTY)

### 9.1 Customer list

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| CU-01 | Open CustomerListScreen (More → Khách hàng) | Paginated list; cards with name, phone, stats | — | |
| CU-02 | Search by name | Debounced filter | — | |
| CU-03 | Search by phone | Results filter | — | |
| CU-04 | Scroll to bottom | Next page loads | — | |
| CU-05 | Empty list | EmptyState shown | — | |

### 9.2 Create customer

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| CU-06 | Tap FAB | CustomerFormScreen (create mode); name auto-focused | — | |
| CU-07 | Submit without name | Validation error | — | |
| CU-08 | Fill name + phone + gender + DOB → submit | Customer created; list refreshes | — | |
| CU-09 | Submit without optional fields (phone, DOB) | Customer created with just name | — | |
| CU-10 | Enter duplicate phone (blur away) | Alert with existing customer name; option to clear or continue | — | |
| CU-11 | Fill allergies / hair type / preferred services (customer preferences) | Saved; shown in BarberServiceScreen banner at checkout | — | |

### 9.3 Customer detail

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| CU-12 | Tap customer card | CustomerDetailScreen: stats header + order history | — | |
| CU-13 | Stats: total orders, total spent, loyalty points | Correct values | — | |
| CU-14 | Recent 5 orders section | Order rows with status + amount | — | |
| CU-15 | Tap a recent order | → OrderDetailScreen | — | |
| CU-16 | Edit button | CustomerFormScreen pre-filled | — | |
| CU-17 | Edit: change name → save | Updated | — | |
| CU-18 | Edit: add allergies / preferred services → save | Preferences saved; banner shown at POS | — | |
| CU-19 | Delete button | Confirm → deleted → back to list | — | |
| CU-20 | Delete "Khách lẻ" (walk-in) customer | Delete blocked — this customer cannot be deleted | — | Per pending-items requirement |
| CU-21 | Cancel delete dialog | Customer not deleted | — | |

### 9.4 Loyalty points (LOYALTY)

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| CU-22 | Open CustomerLoyaltyScreen from detail | Current points balance (large number) + tier card | — | |
| CU-23 | Tier card | Current tier name; progress bar toward next tier; remaining spend amount shown | — | |
| CU-24 | Transaction history list | Type · description · ±points · balance-after per row | — | |
| CU-25 | Scroll history | Pagination loads older records | — | |
| CU-26 | Empty history | "Không có giao dịch" shown | — | |
| CU-27 | Tap "Điều chỉnh" (adjust) | Adjustment panel opens | — | |
| CU-28 | Enter positive number (e.g. 50) + reason → confirm | Points added; balance updates; new ADJUSTED transaction appears | — | |
| CU-29 | Enter negative number (e.g. -20) + reason → confirm | Points deducted; balance updates | — | |
| CU-30 | Enter 0 or empty → confirm | Error "Điểm không hợp lệ"; no API call | — | |
| CU-31 | Enter non-numeric → confirm | Error shown | — | |

---

## Section 10 — Products (PRODUCT)

### 10.1 Product list

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| PR-01 | Open ProductListScreen (More → Sản phẩm) | 2-col grid; search + category chips | — | |
| PR-02 | Stock badge on each card | Level shown | — | |
| PR-03 | Search by name | Debounced filter | — | |
| PR-04 | Filter by category chip | Grid filters | — | |
| PR-05 | Empty search | EmptyState | — | |

### 10.2 Product detail

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| PR-06 | Tap a product | ProductDetailScreen opens | — | |
| PR-07 | Name, price, unit, stock, description shown | Correct | — | |
| PR-08 | "Thêm vào giỏ" FAB | Item added to cart; haptic; back | — | |

### 10.3 Create product — all product types

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| PR-09 | Open ProductCreateScreen | Type picker required; other fields greyed until type selected | — | |
| PR-10 | Tap type picker | Modal with all product types listed | — | |
| PR-11 | Select a **service** type (e.g. nail service) | Unit auto-set to default; `durationMinutes` field appears | — | |
| PR-12 | Fill name + price + unit + category + duration → save | Service product created with duration | — | |
| PR-13 | Select a **retail** product type (e.g. general product) | Standard price field shown; no duration field | — | |
| PR-14 | Fill name + price + unit + category → save | Retail product created | — | |
| PR-15 | Select a **dynamic-price** type (if available in Nail shop) | Price field hidden; "Theo giá vàng" amber badge shown | — | |
| PR-16 | Save dynamic-price product | Created with price=0; listed with "Theo giá vàng" badge | — | |
| PR-17 | Submit without selecting product type | Alert "Loại sản phẩm là bắt buộc" | — | |
| PR-18 | Submit without name | Validation error | — | |
| PR-19 | Price field: enter letters | Non-numeric stripped automatically | — | |
| PR-20 | Price preview shown | "= 150.000 ₫" preview below price field as user types | — | |

### 10.4 Edit product

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| PR-21 | Open ProductEditScreen from detail | Form pre-filled with existing values | — | |
| PR-22 | Change name → save | Updated in detail and in POS grid | — | |
| PR-23 | Change price → save | New price shown | — | |
| PR-24 | Change category → save | Product re-categorised | — | |
| PR-25 | Change duration → save | New duration shown in appointment service picker | — | |

---

## Section 11 — Categories (PRODUCT)

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| CA-01 | Open CategoryListScreen (More → Danh mục) | List of categories; each shows emoji, name, product count | — | |
| CA-02 | Loading state | Skeleton or spinner | — | |
| CA-03 | Empty list | EmptyState | — | |
| CA-04 | Tap "+" / add button | Create modal slides up | — | |
| CA-05 | Emoji picker: 18 options | Grid of emoji shown; tap one to select | — | |
| CA-06 | Currently selected emoji highlighted | Indigo border on selected | — | |
| CA-07 | Fill name → save | Category created with emoji; appears in list | — | |
| CA-08 | Submit without name | Save button disabled or validation error | — | |
| CA-09 | Tap pencil icon on existing category | Edit modal pre-filled with emoji + name | — | |
| CA-10 | Change emoji + name → save | Updated in list | — | |
| CA-11 | Tap delete icon on category with no products | Confirm → deleted | — | |
| CA-12 | Tap delete icon on category that has products | Alert shows product count warning before confirming | — | |
| CA-13 | Cancel delete | Category not deleted | — | |
| CA-14 | New category appears in POS category filter | After creation, chip visible in BarberServiceScreen | — | |

---

## Section 12 — Inventory (PRODUCT)

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| INV-01 | Open InventoryListScreen (More → Kho hàng) | List of products with stock level; stat chips at top | — | |
| INV-02 | Stat chips: total · low · out | Correct counts | — | |
| INV-03 | Filter "Tất cả" | All products shown | — | |
| INV-04 | Filter "Sắp hết" (low) | Only low-stock products | — | |
| INV-05 | Filter "Hết hàng" (out) | Only out-of-stock products | — | |
| INV-06 | Pull-to-refresh | Refetches | — | |
| INV-07 | Tap a product row | Adjust stock modal slides up | — | |
| INV-08 | Adjust modal: product name shown | Correct | — | |
| INV-09 | Enter new quantity + reason (required) + note (optional) → confirm | Stock updated; list refreshes | — | |
| INV-10 | Adjust without quantity | Confirm button disabled | — | |
| INV-11 | Adjust without reason | Validation error | — | |

---

## Section 13 — Staff & Employees (EMPLOYEE + COMMISSION)

### 13.1 Staff list

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| ST-01 | Open StaffListScreen (More → Nhân viên) | Staff cards with name, role badge, active/locked indicator | — | |
| ST-02 | Role badge colours | SHOP_OWNER=indigo · TECHNICIAN=amber · RECEPTIONIST=green | — | |
| ST-03 | Pull-to-refresh | Refetches | — | |
| ST-04 | Empty list | EmptyState | — | |

### 13.2 Create staff

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| ST-05 | Tap FAB | StaffFormScreen (create mode) | — | |
| ST-06 | Username field shown (create only) | Editable | — | |
| ST-07 | Auto-generated password shown | Format `TAPPY-XXXX`; visible by default | — | |
| ST-08 | Toggle password visibility | Eye icon toggles show/hide | — | |
| ST-09 | Tap "Tạo lại" (regenerate) | New `TAPPY-XXXX` generated | — | |
| ST-10 | Tap copy icon | Password copied to clipboard; toast shown | — | |
| ST-11 | Role selection: TECHNICIAN | Tap role chip → highlighted | — | |
| ST-12 | Role selection: RECEPTIONIST | Tap → highlighted | — | |
| ST-13 | Submit with valid username + role | Staff created; credential modal shown with username + temp password | — | |
| ST-14 | Credential modal: copy button | Password copied to clipboard | — | |
| ST-15 | Close credential modal | Returns to staff list; new staff visible | — | |
| ST-16 | Submit with empty username | Validation error | — | |

### 13.3 Edit staff

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| ST-17 | Tap existing staff → edit icon | StaffFormScreen pre-filled (username not editable in edit mode) | — | |
| ST-18 | Change role → save | Updated role badge in list | — | |
| ST-19 | Toggle active/inactive | Confirm dialog → status toggled; card shows locked/inactive indicator | — | |
| ST-20 | Reset password | Confirm dialog → temp password modal shown with new password | — | |
| ST-21 | Copy new temp password in reset modal | Copied; toast shown | — | |

### 13.4 Staff performance (COMMISSION)

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| ST-22 | Open StaffPerformanceScreen (More → Hiệu suất) | Staff cards with metrics | — | |
| ST-23 | Metrics per staff: service count · revenue · avg duration · estimated commission | All columns shown | — | |
| ST-24 | Filter: DAY | Today's data | — | |
| ST-25 | Filter: WEEK | This week | — | |
| ST-26 | Filter: MONTH | This month | — | |
| ST-27 | Filter: YEAR | This year | — | |
| ST-28 | Navigate ← → (period navigation) | Previous/next period loads | — | |
| ST-29 | Pull-to-refresh | Refetches | — | |
| ST-30 | Staff with commission rate | Commission = revenue × rate shown | — | |

---

## Section 14 — Notifications (NOTIFICATION)

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| NO-01 | Open NotificationScreen (More → Thông báo) | List; unread count badge in header | — | |
| NO-02 | Filter chips: Tất cả · Chưa đọc · Đơn hàng · Hệ thống | All 4 visible | — | |
| NO-03 | Default filter: Tất cả | All notifications shown | — | |
| NO-04 | Tap "Chưa đọc" | Only unread items shown | — | |
| NO-05 | Tap "Đơn hàng" | Only ORDER-type notifications | — | |
| NO-06 | Tap "Hệ thống" | Only SYSTEM-type notifications | — | |
| NO-07 | Unread item style | Indigo-tinted background + indigo border + unread dot | — | |
| NO-08 | Read item style | White background; no dot | — | |
| NO-09 | Tap unread notification | Marked read; background becomes white; API call fires | — | |
| NO-10 | Tap already-read notification | No state change; no extra API call | — | |
| NO-11 | "Đánh dấu tất cả đã đọc" button visible when unread > 0 | Shown in header | — | |
| NO-12 | Tap "Đánh dấu tất cả đã đọc" | Confirm dialog | — | |
| NO-13 | Confirm mark-all-read | All items switch to read; unread count → 0; badge disappears | — | |
| NO-14 | Cancel mark-all-read dialog | Items unchanged | — | |
| NO-15 | Empty list | EmptyState shown | — | |
| NO-16 | Pull-to-refresh | Refetches | — | |

---

## Section 15 — Activity Log (ACTIVITY_LOG)

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| AL-01 | Open ActivityLogScreen (Settings → Nhật ký) | Audit entries with timestamp + action + user | — | |
| AL-02 | Actions from this test session appear | e.g. order created, customer added, appointment created | — | |
| AL-03 | Scroll / pagination | Older entries load | — | |
| AL-04 | Pull-to-refresh | Refetches | — | |

---

## Section 16 — Settings

### 16.1 Settings main screen

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| SE-01 | Open Settings (More → Cài đặt, or Settings tab) | SettingsScreen; shop name + avatar shown at top | — | |
| SE-02 | 4 sections present | Tài khoản · Cửa hàng · Tuỳ chọn · Hỗ trợ · Hệ thống | — | |
| SE-03 | Logout button at bottom | Visible | — | |

### 16.2 Profile update

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| SE-04 | Tap avatar or "Cập nhật hồ sơ" | → ProfileUpdateScreen; fields pre-filled | — | |
| SE-05 | Edit full name → save | Updated; shown back in Settings header | — | |

### 16.3 Change password (from Settings)

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| SE-06 | Tap "Đổi mật khẩu" | → ChangePasswordScreen | — | |
| SE-07 | Fill current + new + confirm (matching) → submit | Success message | — | |
| SE-08 | Wrong current password | Error from API | — | |
| SE-09 | New ≠ confirm | Inline error | — | |

### 16.4 Shop info (SHOP_INFO)

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| SE-10 | Tap "Thông tin cửa hàng" | ShopInfoScreen; name, address, phone, type shown | — | |
| SE-11 | Edit shop name → save | Updated | — | |

### 16.5 Bank accounts (BANK_ACCOUNT)

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| SE-12 | Tap "Tài khoản ngân hàng" | BankAccountsScreen; list of accounts | — | |
| SE-13 | Add new: bank name + account number + holder → save | Appears in list; available in POS QR picker | — | |
| SE-14 | Missing required fields | Validation error | — | |

### 16.6 POS Config

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| SE-15 | Tap "Cấu hình POS" | POSConfigScreen loads | — | |
| SE-16 | Toggle POS mode or settings | Config updated; persists | — | |

### 16.7 Default Expenses

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| SE-17 | Tap "Chi phí mặc định" | DefaultExpensesScreen loads | — | |
| SE-18 | Add a default expense category | Appears in list; used as suggestion in expense creation | — | |

### 16.8 Security (SECURITY / PIN)

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| SE-19 | Tap "Bảo mật" | SecurityScreen; PIN change section + biometric toggle | — | |
| SE-20 | Change PIN: enter current PIN → advance | Step 2 shown | — | |
| SE-21 | Enter new + matching confirm PIN | PIN updated; success | — | |
| SE-22 | Wrong current PIN | Error; stays on step 1 | — | |
| SE-23 | New PIN ≠ confirm | Error "PIN không khớp" | — | |

### 16.9 Display / Language

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| SE-24 | Tap "Giao diện" (Display) | DisplayScreen loads | — | |
| SE-25 | Toggle language VI → EN | All visible strings switch to English | — | |
| SE-26 | Toggle EN → VI | Reverts to Vietnamese | — | |

### 16.10 Notification preferences

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| SE-27 | Tap "Thông báo" in Settings | NotificationPreferencesScreen; toggles per notification type | — | |
| SE-28 | Toggle a type off | Preference saved (debounced 300 ms); API call fires | — | |
| SE-29 | Toggle back on | Preference restored | — | |

### 16.11 Feedback (FEEDBACK)

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| SE-30 | Tap "Phản hồi" | FeedbackScreen; category + message fields | — | |
| SE-31 | Submit without message | Validation error | — | |
| SE-32 | Select category + write message → submit | Success; navigated away | — | |
| SE-33 | Tap "Lịch sử phản hồi" | FeedbackHistoryScreen; past submissions listed | — | |

### 16.12 Support contacts

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| SE-34 | Hotline row visible | Tap → opens phone dialler | — | |
| SE-35 | Email row visible | Tap → opens mail app | — | |
| SE-36 | Zalo row visible | Tap → opens Zalo OA | — | |

### 16.13 Print templates (PRINT_TEMPLATE)

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| SE-37 | Tap "Mẫu in" | PrintTemplateListScreen; templates listed | — | |
| SE-38 | Tap a template | PrintTemplateDetailScreen; content shown | — | |

### 16.14 Subscription

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| SE-39 | Tap "Đăng ký" / Subscription entry | SubscriptionScreen; plan name + expiry + max users | — | |
| SE-40 | Subscription info matches shop's actual plan | Correct | — | |

### 16.15 Terms & Conditions

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| SE-41 | Tap "Điều khoản sử dụng" | TnCScreen loads; scrollable content | — | |

### 16.16 Delete account

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| SE-42 | Tap "Xoá tài khoản" | DeleteAccountScreen; warning shown | — | |
| SE-43 | Cancel delete | Returns to settings | — | |

---

## Section 17 — Profile & session (from Profile screen)

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| PF-01 | Open ProfileScreen | Name, phone, role (SHOP_OWNER), shop name shown | — | |
| PF-02 | Language toggle VI → EN | All strings switch to English immediately | — | |
| PF-03 | Language toggle EN → VI | Reverts | — | |
| PF-04 | Inline change password (if in ProfileScreen) | Same flow as SE-07 | — | |
| PF-05 | Tap "Đăng xuất" | Confirm dialog shown | — | |
| PF-06 | Confirm logout | SecureStore cleared; cartStore cleared; → ShopIdScreen | — | |
| PF-07 | Cancel logout | Stays on ProfileScreen | — | |

---

## Section 18 — Tools (Tiện ích)

> Tools are accessible from Settings → Tiện ích. All calculators are offline; no backend required except Currency Converter.

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| TL-01 | Open UtilitiesScreen | 2 groups; 7 tool cards in 47.5% grid | — | |
| TL-02 | Tap Currency Converter | Rates load from VCB via backend; loading skeleton shown | — | |
| TL-03 | Select a currency; enter amount | Result shows buy/transfer/sell rows | — | |
| TL-04 | Toggle direction VND → FCY | Result inverts | — | |
| TL-05 | Custom rate toggle → enter manual rate | Result labelled "tùy chỉnh" | — | |
| TL-06 | Interest Calculator — simple + compound | Totals calculated correctly | — | |
| TL-07 | Loan Calculator — reducing balance + EMI | Schedule shown; >30% income warning fires | — | |
| TL-08 | Tax Calculator — enter gross salary | BHXH/BHYT/BHTN auto-calculated; progressive brackets shown | — | |
| TL-09 | Bill Splitter — stepper min 2, max 20 | Per-person amount ceil-rounded | — | |
| TL-10 | Budget Rule — 50/30/20 and 6 Jars toggle | Correct bucket amounts | — | |
| TL-11 | Breakeven — fill option A + B | Breakeven month shown | — | |

---

## Section 19 — Cross-cutting / non-functional

| ID | Area | Expected | Status |
|----|------|----------|--------|
| X-01 | Safe area | No content behind notch or home indicator on any screen | — |
| X-02 | Keyboard avoidance | Inputs scroll into view; not obscured | — |
| X-03 | Pull-to-refresh on all list screens | Spinner + refetch; no crash | — |
| X-04 | Empty states | EmptyState component always shown when list is empty; never blank screen | — |
| X-05 | Error / offline | ErrorState + retry shown; no crash or white screen | — |
| X-06 | Loading skeletons | Skeleton placeholders on every data-fetching screen | — |
| X-07 | Haptics | Add to cart fires haptic; no crash on haptic-less device | — |
| X-08 | Back gesture | Swipe-from-edge on every screen; no nav stack corruption | — |
| X-09 | Amount formatting | `1.500.000 ₫` (dot thousands; ₫ symbol) throughout | — |
| X-10 | Vietnamese labels | No raw feature codes or API keys exposed to user | — |
| X-11 | Dark mode | Toggle system dark mode; all screens render; no invisible text/icons | — |
| X-12 | Token refresh | Background 30+ min → return and act → token silently refreshed | — |
| X-13 | Tab state | Switching tabs within staleTime does not trigger unnecessary refetch | — |
| X-14 | Confirm before destructive actions | Delete customer, cancel order, cancel appointment, logout: all show confirm dialog | — |
| X-15 | Portrait lock / landscape | Layout doesn't break or is gracefully locked to portrait | — |
| X-16 | Toast messages | Create/update/delete success shows toast (not just an alert) | — |
| X-17 | Hint message on Create Order (bug check) | Nail shop Create Order shows standard hint message | — | Bug #1 in pending-items |

---

## Section 20 — Regression checklist (run before every release)

- [ ] `npx tsc --noEmit` → 0 errors  
- [ ] **Auth:** shop ID → login → PIN setup → PIN login  
- [ ] **POS golden path (Nail):** BarberServiceScreen → add service + assign technician → select customer → cash checkout → OrderSuccess → back with empty cart  
- [ ] **POS with QR:** add service → select bank transfer → verify QR generated  
- [ ] **Loyalty at checkout:** customer with points → enable redemption → verify discount applied to total  
- [ ] **Appointment golden path:** create (linked customer + 2 services + employee) → confirm → check-in → POS redirect  
- [ ] **ORDER_VIEW_ALL:** order list shows orders from other staff accounts  
- [ ] **Walk-in customer:** attempt delete "Khách lẻ" → blocked  
- [ ] **Customer:** create → save with allergies/preferences → verify preferences banner at POS checkout  
- [ ] **Staff:** create TECHNICIAN with auto-password → credential modal shown  
- [ ] **Product:** create service type with duration → appears in appointment service picker  
- [ ] **Category:** create with emoji → appears in POS filter chips  
- [ ] **Inventory:** adjust stock → updated level shown  
- [ ] **Notifications:** receive one → unread highlight → mark all read  
- [ ] **Language switch:** VI → EN on Profile; all strings change  
- [ ] **Logout:** clears session → ShopIdScreen  

---

## Coverage summary

| Feature | Sections | Cases | Testable |
|---------|---------|-------|---------|
| DASHBOARD | §3 | 11 | ✅ |
| ORDER | §5 | 11 | ✅ |
| ORDER_VIEW_ALL | OR-07 | 1 | ✅ |
| MY_WORK | §7 | 17 | ✅ |
| PRODUCT | §10, §11 | 39 | ✅ |
| POS (BarberServiceScreen) | §4 | 53 | ✅ |
| CUSTOMER | §9.1–9.3 | 21 | ✅ |
| LOYALTY | §9.4 | 10 | ✅ |
| COMMISSION | §13.4 | 9 | ✅ |
| EMPLOYEE | §13.1–13.3 | 21 | ✅ |
| APPOINTMENT | §6 | 66 | ✅ |
| NOTIFICATION | §14 | 16 | ✅ |
| ACTIVITY_LOG | §15 | 4 | ✅ |
| SHOP_INFO | §16.4 | 2 | ✅ |
| BANK_ACCOUNT | §16.5 | 3 | ✅ |
| PRINT_TEMPLATE | §16.13 | 2 | ✅ |
| FEEDBACK | §16.11 | 4 | ✅ |
| SALARY | — | 0 | ⚠️ no mobile screen |
| EXPENSE | — | 0 | ⚠️ tab stub |
| REVENUE | — | 0 | ⚠️ tab stub |
| USER | — | 0 | ⚠️ no mobile screen |
| INVOICE | — | 0 | ⚠️ no mobile screen |
| ACCOUNTING | — | 0 | ⚠️ no mobile screen |
| Cross-cutting | §19 | 17 | ✅ |
| Tools (bonus) | §18 | 11 | ✅ |
| **Total** | | **~318** | |
