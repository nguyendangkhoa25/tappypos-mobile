# E2E Test Plan — Hair Salon · SHOP_OWNER

> **Shop type:** HAIR_SALON (Salon tóc / Làm tóc)  
> **Role:** SHOP_OWNER — all 23 features  
> **Credentials:** phone `0911000088` · password `HairSalon@2026` · shop `hair-56748`  
> **Platform:** iOS (physical device preferred)  
> **Legend:** ✅ pass · ❌ fail · ⚠️ partial · — not run  
> **Last run:** —  
> **Run order:** execute sections top-to-bottom; later sections depend on data created earlier

---

## Feature set (identical to NAIL_SHOP)

| # | Feature | Testable |
|---|---------|---------|
| 1 | DASHBOARD | ✅ |
| 2 | ORDER | ✅ |
| 3 | ORDER_VIEW_ALL | ✅ |
| 4 | MY_WORK | ✅ |
| 5 | PRODUCT | ✅ |
| 6 | POS | ✅ |
| 7 | CUSTOMER | ✅ |
| 8 | LOYALTY | ✅ |
| 9 | COMMISSION | ✅ |
| 10 | EMPLOYEE | ✅ |
| 11 | SALARY | ⚠️ no mobile screen |
| 12 | EXPENSE | ⚠️ tab stub |
| 13 | REVENUE | ⚠️ tab stub |
| 14 | USER | ⚠️ no mobile screen |
| 15 | APPOINTMENT | ✅ |
| 16 | NOTIFICATION | ✅ |
| 17 | FEEDBACK | ✅ |
| 18 | ACTIVITY_LOG | ✅ |
| 19 | SHOP_INFO | ✅ |
| 20 | PRINT_TEMPLATE | ✅ |
| 21 | BANK_ACCOUNT | ✅ |
| 22 | INVOICE | ⚠️ no mobile screen |
| 23 | ACCOUNTING | ⚠️ no mobile screen |

**Default roles:** SHOP_OWNER · MANAGER · TECHNICIAN (stylist/thợ tóc) · RECEPTIONIST · CASHIER

---

## Section 0 — Pre-flight

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| PRE-01 | Backend is reachable | `GET /api/actuator/health` → `UP` | — | |
| PRE-02 | Hair Salon tenant is ACTIVE | Confirmed in master dashboard | — | |
| PRE-03 | At least 2 hair services seeded | e.g. Cắt tóc nữ ngắn, Nhuộm màu | — | |
| PRE-04 | At least 1 non-owner staff member (TECHNICIAN/stylist) exists | For appointment assignment | — | |
| PRE-05 | At least 1 existing customer record | For appointment and loyalty tests | — | |
| PRE-06 | App installed cold on test device | ShopIdScreen shown on launch | — | |

---

## Section 1 — Auth

### 1.1 Shop ID entry

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| A-01 | Launch app cold | ShopIdScreen shown; input empty and focused | — | |
| A-02 | Submit empty field | Submit button disabled; no API call | — | |
| A-03 | Enter unknown tenant ID → submit | Inline error "Không tìm thấy cửa hàng" below input | — | |
| A-04 | Enter valid Hair Salon tenant ID → submit | → LoginScreen; shop name "Salon Tóc …" shown read-only | — | |
| A-05 | Kill and relaunch | → PinLoginScreen (if PIN set) or LoginScreen | — | |

### 1.2 Login

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| A-06 | Submit empty phone and password | Inline validation errors on both fields | — | |
| A-07 | Correct phone + wrong password | Inline error below password field | — | |
| A-08 | Valid credentials (PIN not yet set) | → PinSetupScreen | — | First run only |
| A-09 | Valid credentials (PIN set) | → PinLoginScreen | — | Subsequent runs |

### 1.3 PIN setup (first run)

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| A-10 | Enter 6-digit PIN | Confirmation step appears | — | |
| A-11 | Confirm with different PIN | Shake + "PIN không khớp"; fields cleared | — | |
| A-12 | Confirm with matching PIN | PIN saved; Dashboard shown | — | |

### 1.4 PIN login (subsequent runs)

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| A-13 | Enter wrong PIN | Remaining attempts shown | — | |
| A-14 | Enter correct PIN | Dashboard shown | — | |
| A-15 | Tap "Đăng nhập bằng mật khẩu" | → LoginScreen | — | |

---

## Section 2 — Navigation & feature gate

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| N-01 | Bottom tab bar | 5 tabs: Trang chủ · Bán hàng · Chi phí · Báo cáo · Cài đặt | — | |
| N-02 | Active tab colour | Accent colour on active; grey on others | — | |
| N-03 | Open More screen | 2 sections: Quản lý + Vận hành | — | |
| N-04 | "Quản lý" tiles | Sản phẩm · Kho hàng · Khách hàng · Combo · Danh mục · Mẫu in · Nhân viên | — | |
| N-05 | "Vận hành" tiles | Công việc của tôi · Hàng chờ · Hiệu suất · Lịch hẹn · Thông báo | — | |
| N-06 | Settings row at bottom of More | Visible | — | |
| N-07 | No PAWN / gold tiles | "Cầm đồ", "Giá vàng" absent | — | Hair Salon has no PAWN |
| N-08 | No VENDOR / purchase-order tiles | "Nhà cung cấp", "Nhập hàng" absent | — | |
| N-09 | Shop name in top bar | Displays salon name, not "Quản lý cửa hàng" | — | |

---

## Section 3 — Dashboard

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| D-01 | Open Trang chủ tab | DashboardScreen loads; skeletons during fetch | — | |
| D-02 | KPI cards render | Doanh thu · Số đơn hàng · Khách hàng mới | — | |
| D-03 | Revenue card visible | SHOP_OWNER sees revenue figures | — | |
| D-04 | Period: Hôm nay (default) | Today's KPIs | — | |
| D-05 | Tap "Tuần này" | Values update to current week | — | |
| D-06 | Tap "Tháng này" | Values update to current month | — | |
| D-07 | Recent orders list | Up to 5 latest with number, amount, status badge | — | |
| D-08 | Tap a recent order | → OrderDetailScreen | — | |
| D-09 | Pull-to-refresh | Both KPIs and orders refetch | — | |
| D-10 | No orders yet | EmptyState on recent orders (not blank) | — | |
| D-11 | Airplane mode + open | ErrorState + retry shown | — | |

---

## Section 4 — POS / Bán hàng (BarberServiceScreen — Hair Salon)

> **Note:** Hair Salon loads `BarberServiceScreen` — same as Nail Shop. Quick phrases are hair-specific: **Uốn · Nhuộm · Duỗi · Gội đầu**.

### 4.1 Opening the POS

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| P-01 | Tap "Bán hàng" tab | BarberServiceScreen loads; hair service grid shown | — | |
| P-02 | Grid column toggle (2-col / 3-col) | Switches; preference persisted | — | |
| P-03 | Category chips visible | Horizontal scrollable chips | — | |
| P-04 | Tap a category chip | Grid filters | — | |
| P-05 | Search by service name | Grid filters within 300 ms | — | |
| P-06 | Clear search | Full grid restored | — | |
| P-07 | No match | EmptyState shown | — | |

### 4.2 Adding services to cart

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| P-08 | Tap a hair service | Service detail bottom sheet slides up | — | |
| P-09 | Quick phrase bar shows hair phrases | "Uốn", "Nhuộm", "Duỗi", "Gội đầu" chips shown | — | Hair Salon specific |
| P-10 | Tap a quick phrase | Phrase appended to note field | — | |
| P-11 | Assign a stylist (TECHNICIAN) to the service | Stylist avatar highlighted | — | |
| P-12 | Add custom note | Free text accepted | — | |
| P-13 | Adjust quantity via stepper | Qty updates | — | |
| P-14 | Tap "Thêm vào giỏ" | Item added; haptic; cart badge increments | — | |
| P-15 | Add second service (different stylist) | Second line in cart | — | |
| P-16 | Cart badge shows total + stylist count | Correct | — | |

### 4.3 Cart review

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| P-17 | Tap cart icon | Cart items list; service name, stylist, note, price, qty per row | — | |
| P-18 | Increase/decrease qty | Totals update live | — | |
| P-19 | Remove item | Confirm dialog → removed | — | |
| P-20 | Empty cart | EmptyState shown | — | |
| P-21 | Tap "Thanh toán" | Checkout bottom sheet opens | — | |

### 4.4 Checkout — customer selection

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| P-22 | Default customer | "Khách lẻ" (walk-in) pre-selected | — | |
| P-23 | Recent customers shown | Up to 6 recent chips | — | |
| P-24 | Tap a recent customer | Selected; preferences banner shown if set | — | |
| P-25 | Search customer by name/phone (350 ms debounce) | Results shown | — | |
| P-26 | Tap search result | Customer linked to order | — | |
| P-27 | Preferences banner | Shows hair type / allergies / preferred styles if set | — | Hair Salon context |
| P-28 | Clear back to walk-in | Walk-in restored | — | |

### 4.5 Checkout — payment methods

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| P-29 | 3 payment methods shown | Tiền mặt · Chuyển khoản · Khác | — | |
| P-30 | Select "Tiền mặt" | Cash received + change calculator fields appear | — | |
| P-31 | Enter cash ≥ total | Change calculated correctly | — | |
| P-32 | Enter cash < total | Change shows 0 or shortfall | — | |
| P-33 | Select "Chuyển khoản" | Bank account picker appears | — | |
| P-34 | Bank account picker shows saved accounts | Salon's bank accounts listed | — | |
| P-35 | Select a bank account | VietQR generated for order total | — | |
| P-36 | QR code image visible | Scannable by customer's banking app | — | |
| P-37 | Last-used bank saved | Next checkout pre-selects same bank | — | |
| P-38 | Last-used payment method persisted | Next session opens with last method | — | |

### 4.6 Checkout — tip, promo, loyalty

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| P-39 | Tip quick-select chips | 10K · 20K · 50K · 100K | — | |
| P-40 | Tap a tip chip | Added to total | — | |
| P-41 | Tap again | Deselected | — | |
| P-42 | Valid promo code | Discount applied; total reduces | — | |
| P-43 | Invalid promo code | Error shown; total unchanged | — | |
| P-44 | Customer with loyalty points + active program | "Dùng điểm" toggle visible | — | |
| P-45 | Enable loyalty redemption | Points discount deducted from total | — | |
| P-46 | Effective total = items + tip − loyalty discount | Correct | — | |

### 4.7 Order confirmation

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| P-47 | Tap "Xác nhận đơn hàng" | Spinner; server flow; → OrderSuccessScreen | — | |
| P-48 | Network error during confirm | Alert; stays on checkout; can retry | — | |
| P-49 | OrderSuccessScreen shows order number + total | Correct | — | |
| P-50 | Tap "Đơn hàng mới" | → BarberServiceScreen; cart empty | — | |

### 4.8 POS view toggle — inline Orders

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| P-51 | Tap Orders toggle in Bán hàng | Inline OrderListScreen | — | |
| P-52 | Switch back to service grid | Grid restored; cart preserved | — | |

---

## Section 5 — Orders

### 5.1 Order list

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| OR-01 | Open OrderListScreen | List loads; row shows number, amount, status badge | — | |
| OR-02 | Skeleton during load | Placeholder rows visible | — | |
| OR-03 | Status filter chips: Tất cả · Chờ · Đang xử lý · Hoàn thành · Đã huỷ | Each filters correctly | — | |
| OR-04 | Search by order number | Results filter | — | |
| OR-05 | Scroll to bottom | Next page loads (infinite scroll) | — | |
| OR-06 | Pull-to-refresh | Resets to page 1 | — | |
| OR-07 | **ORDER_VIEW_ALL** — other staff orders visible | SHOP_OWNER sees all tenant orders | — | Key verification |
| OR-08 | Empty state | EmptyState shown | — | |

### 5.2 Order detail

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| OR-09 | Tap an order | OrderDetailScreen opens | — | |
| OR-10 | 4 info cards render | Items · Payment · Customer · Meta | — | |
| OR-11 | Service name, stylist, note, qty, price per line | All fields shown | — | |
| OR-12 | Payment method and amount shown | Correct | — | |
| OR-13 | Assigned stylist shown | Staff name visible | — | |
| OR-14 | PENDING — "Hoàn thành" + "Huỷ đơn" in footer | Both visible | — | |
| OR-15 | Tap "Hoàn thành" → confirm | → COMPLETED; footer disappears | — | |
| OR-16 | Tap "Huỷ đơn" → confirm | → CANCELLED | — | |
| OR-17 | Tap "Huỷ đơn" → cancel dialog | Status unchanged | — | |
| OR-18 | COMPLETED order | Read-only; no footer | — | |
| OR-19 | CANCELLED order | Read-only; no footer | — | |

---

## Section 6 — Appointments (APPOINTMENT — Hair Salon critical)

### 6.1 Appointment list

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| AP-01 | Open AppointmentListScreen (More → Lịch hẹn) | Loads; today's date; skeletons then list | — | |
| AP-02 | Grouped by hour | Hour label + separator; items below | — | |
| AP-03 | Card: customer name, phone, status badge, time, duration, service count, note | All render | — | |
| AP-04 | Status colours | PENDING=amber · CONFIRMED=indigo · CHECKED_IN=emerald · CANCELLED=grey · NO_SHOW=rose | — | |
| AP-05 | Finished appointments at 60% opacity | CANCELLED/NO_SHOW/CHECKED_IN dimmed | — | |
| AP-06 | Left chevron | Date −1 day; refetch | — | |
| AP-07 | Right chevron | Date +1 day; refetch | — | |
| AP-08 | "Hôm nay" link on distant date | Tap → back to today | — | |
| AP-09 | Date with no bookings | EmptyState with hint | — | |
| AP-10 | Pull-to-refresh | Refetches | — | |
| AP-11 | Network error | ErrorState + retry | — | |
| AP-12 | Tap "+" or FAB | → AppointmentFormScreen (create mode) | — | |

### 6.2 Create appointment — form fields

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| AP-13 | Form header "Lịch hẹn mới" | Correct | — | |
| AP-14 | Type customer name manually | Free text | — | |
| AP-15 | Tap search icon | CustomerSearchModal; auto-focused | — | |
| AP-16 | Type in search | Debounced filter | — | |
| AP-17 | Select a customer | Name + phone auto-filled; customerId linked | — | |
| AP-18 | Walk-in (manual name only) | Accepted without customerId | — | |
| AP-19 | Date default = today | Shown DD/MM/YYYY | — | |
| AP-20 | Date chevrons ← → | Shifts ±1 day | — | |
| AP-21 | Hour spinner ▲ | +1 (23 wraps to 0) | — | |
| AP-22 | Hour spinner ▼ | −1 (0 wraps to 23) | — | |
| AP-23 | Minute spinner ▲ | +15; at 45 → 00 + hour +1 | — | |
| AP-24 | Minute spinner ▼ | −15; at 00 → 45 + hour −1 | — | |
| AP-25 | Duration "−" at minimum (15 min) | Cannot go below 15 | — | |
| AP-26 | Duration "+" | +15 min steps | — | |
| AP-27 | Tap "Thêm dịch vụ" | ProductPickerModal; search auto-focused | — | |
| AP-28 | Search for a hair service | Name + duration shown | — | |
| AP-29 | Select a service | Row added; total duration auto-increases | — | |
| AP-30 | Add 2 services | Both rows; duration = sum | — | |
| AP-31 | Tap stylist dropdown on service row | Employee picker; "— Chưa gán —" at top | — | |
| AP-32 | Select a stylist | Name shown on row | — | |
| AP-33 | Select "— Chưa gán —" | Stylist removed | — | |
| AP-34 | Tap "×" on service row | Removed; duration reduced | — | |
| AP-35 | Add note | Multiline accepted | — | |
| AP-36 | Tap "Lưu" with all fields | Success alert → back to list → new item visible | — | |

### 6.3 Create appointment — validation

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| AP-37 | Tap "Lưu" with empty customer name | Alert "Tên khách hàng là bắt buộc" | — | |

### 6.4 Appointment detail — read

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| AP-38 | Tap appointment card | → AppointmentDetailScreen; appointment number in header | — | |
| AP-39 | Status badge correct colour | Matches | — | |
| AP-40 | Customer info: name + phone | Shown | — | |
| AP-41 | Date / time / duration | Correct | — | |
| AP-42 | Services: name + stylist + price per row | All rows | — | |
| AP-43 | Total estimate at bottom | Sum of service prices | — | |
| AP-44 | Note section (if set) | Displayed | — | |
| AP-45 | Loading state | Skeletons visible | — | |

### 6.5 Appointment detail — PENDING actions

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| AP-46 | "Xác nhận" button visible | Indigo outline button | — | |
| AP-47 | "Huỷ" + "Khách không đến" buttons visible | Both shown | — | |
| AP-48 | Sticky "Check-in" button at bottom | Large indigo button | — | |
| AP-49 | Tap "Xác nhận" | → CONFIRMED; button disappears | — | |
| AP-50 | Tap "Huỷ" → confirm | → CANCELLED; all buttons disappear | — | |
| AP-51 | Tap "Huỷ" → cancel dialog | Unchanged | — | |
| AP-52 | Tap "Khách không đến" → confirm | → NO_SHOW | — | |
| AP-53 | Pencil edit icon visible | → AppointmentFormScreen edit mode | — | |

### 6.6 Appointment detail — CONFIRMED actions

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| AP-54 | "Xác nhận" gone; "Huỷ" + "Khách không đến" remain | Correct state | — | |
| AP-55 | Sticky "Check-in" button present | Visible | — | |
| AP-56 | Tap "Check-in" | → CHECKED_IN → alert with "Mở POS" option | — | |
| AP-57 | Tap "Mở POS" | → BarberServiceScreen with checkInPayload pre-loaded | — | |
| AP-58 | Pencil icon visible | Can edit | — | |

### 6.7 Appointment detail — terminal states

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| AP-59 | CHECKED_IN | Read-only; no actions; no check-in; no edit; delete hidden | — | |
| AP-60 | CANCELLED | No actions; no check-in; delete link shown | — | |
| AP-61 | CANCELLED — tap delete | Confirm → deleted → back to list | — | |
| AP-62 | NO_SHOW | Same as CANCELLED | — | |

### 6.8 Edit appointment

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| AP-63 | Open edit from PENDING | Form pre-filled; header "Chỉnh sửa lịch hẹn" | — | |
| AP-64 | Change date + time → save | Updated in detail | — | |
| AP-65 | Add/remove service → save | Services updated | — | |
| AP-66 | Change assigned stylist → save | New stylist reflected | — | |

---

## Section 7 — My Work (MY_WORK)

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| MW-01 | Open MyWorkScreen | 2 tabs | — | |
| MW-02 | "Công việc của tôi" tab | Items assigned to current user | — | |
| MW-03 | "Công việc khả dụng" tab | Unassigned items | — | |
| MW-04 | PENDING — "Nhận việc" | Tap → moves to my queue | — | |
| MW-05 | My queue PENDING — "Bắt đầu" | → IN_PROGRESS | — | |
| MW-06 | My queue PENDING — "Trả lại" | → back to available | — | |
| MW-07 | IN_PROGRESS — "Hoàn thành" | → completed | — | |
| MW-08 | IN_PROGRESS — "Nhả" | → back to available | — | |
| MW-09 | Empty "Công việc của tôi" | EmptyState | — | |
| MW-10 | Empty "Công việc khả dụng" | EmptyState | — | |
| MW-11 | Pull-to-refresh both tabs | Refetch | — | |
| MW-12 | History icon | → MyWorkHistoryScreen | — | |

### 7.1 My Work History

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| MW-13 | MyWorkHistoryScreen loads | History list + filter bar | — | |
| MW-14 | Filter: DAY · WEEK · MONTH · YEAR | Each updates date label + data | — | |
| MW-15 | Bar chart visible | Reflects item counts per period | — | |
| MW-16 | Navigate ← → period | Previous/next period loads | — | |
| MW-17 | Empty period | EmptyState | — | |

---

## Section 8 — Staff Queue (QueueView)

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| SQ-01 | Open QueueView | Stat chips: Waiting · In Progress · Done | — | |
| SQ-02 | Staff cards with avatar, name, services | Renders correctly | — | |
| SQ-03 | IN_PROGRESS = green; PENDING = amber | Correct colours | — | |
| SQ-04 | Pull-to-refresh | Refetches | — | |
| SQ-05 | Empty queue | Zero stats | — | |

---

## Section 9 — Customers (CUSTOMER + LOYALTY)

### 9.1 Customer list

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| CU-01 | Open CustomerListScreen | Paginated cards | — | |
| CU-02 | Search by name | Debounced | — | |
| CU-03 | Search by phone | Results filter | — | |
| CU-04 | Scroll to bottom | Next page | — | |
| CU-05 | Empty list | EmptyState | — | |

### 9.2 Create customer

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| CU-06 | Tap FAB | CustomerFormScreen (create); name auto-focused | — | |
| CU-07 | Submit without name | Validation error | — | |
| CU-08 | Fill name + phone + gender + DOB → submit | Customer created | — | |
| CU-09 | Submit with name only (no phone/DOB) | Created with just name | — | |
| CU-10 | Duplicate phone (blur) | Alert with existing name | — | |
| CU-11 | Fill hair type / allergies / preferred styles | Saved; banner shown at POS checkout | — | Hair Salon: hair type instead of skin type |

### 9.3 Customer detail

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| CU-12 | Tap customer | CustomerDetailScreen: stats + order history | — | |
| CU-13 | Stats: total orders, total spent, loyalty points | Correct | — | |
| CU-14 | Recent 5 orders | Order rows with status + amount | — | |
| CU-15 | Tap recent order | → OrderDetailScreen | — | |
| CU-16 | Edit button | Pre-filled form | — | |
| CU-17 | Edit name → save | Updated | — | |
| CU-18 | Edit hair preferences → save | Saved; banner shown at POS | — | |
| CU-19 | Delete button | Confirm → deleted → back | — | |
| CU-20 | Delete "Khách lẻ" (walk-in) | Blocked — cannot delete walk-in | — | |
| CU-21 | Cancel delete | Customer not deleted | — | |

### 9.4 Loyalty points (LOYALTY)

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| CU-22 | Open CustomerLoyaltyScreen | Balance + tier card | — | |
| CU-23 | Tier card | Name + progress bar + remaining spend | — | |
| CU-24 | Transaction history | Type · ±points · balance-after per row | — | |
| CU-25 | Scroll history | Pagination | — | |
| CU-26 | Empty history | "Không có giao dịch" | — | |
| CU-27 | Tap "Điều chỉnh" | Adjustment panel opens | — | |
| CU-28 | Enter +50 + reason → confirm | Points added; transaction appears | — | |
| CU-29 | Enter −20 + reason → confirm | Points deducted | — | |
| CU-30 | Enter 0 / empty → confirm | Error "Điểm không hợp lệ" | — | |
| CU-31 | Non-numeric → confirm | Error shown | — | |

---

## Section 10 — Products (PRODUCT)

### 10.1 Product list

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| PR-01 | Open ProductListScreen | 2-col grid; search + category chips | — | |
| PR-02 | Stock badge per card | Shown | — | |
| PR-03 | Search by name | Debounced | — | |
| PR-04 | Filter by category | Grid filters | — | |
| PR-05 | Empty search | EmptyState | — | |

### 10.2 Product detail

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| PR-06 | Tap product | ProductDetailScreen | — | |
| PR-07 | Name, price, unit, stock, description | Correct | — | |
| PR-08 | "Thêm vào giỏ" FAB | Added to cart; haptic; back | — | |

### 10.3 Create product — all types

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| PR-09 | Open ProductCreateScreen | Type picker required; fields greyed until type selected | — | |
| PR-10 | Tap type picker | All product types in modal | — | |
| PR-11 | Select a **hair service** type (SERVICE) | Unit auto-set; `durationMinutes` field appears | — | |
| PR-12 | Fill name + price + unit + category + duration → save | Hair service created with duration | — | |
| PR-13 | Select a **retail** product type (e.g. BEAUTY/hair care product) | Standard fields; no duration | — | |
| PR-14 | Fill name + price + unit + category → save | Retail product created | — | |
| PR-15 | Select a **dynamic-price** type (if available) | Price hidden; "Theo giá vàng" badge | — | |
| PR-16 | Save dynamic-price product | Created with price=0 | — | |
| PR-17 | Submit without type | Alert "Loại sản phẩm là bắt buộc" | — | |
| PR-18 | Submit without name | Validation error | — | |
| PR-19 | Price field: letters entered | Non-numeric stripped | — | |
| PR-20 | Price preview | "= 500.000 ₫" shown as user types | — | |

### 10.4 Edit product

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| PR-21 | Open ProductEditScreen | Pre-filled | — | |
| PR-22 | Change name → save | Updated in detail + POS grid | — | |
| PR-23 | Change price → save | New price shown | — | |
| PR-24 | Change category → save | Re-categorised | — | |
| PR-25 | Change duration → save | New duration in appointment picker | — | |

---

## Section 11 — Categories (PRODUCT)

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| CA-01 | Open CategoryListScreen | List: emoji · name · product count per row | — | |
| CA-02 | Loading state | Skeleton or spinner | — | |
| CA-03 | Empty list | EmptyState | — | |
| CA-04 | Tap "+" | Create modal | — | |
| CA-05 | 18 emoji options in picker | Grid shown | — | |
| CA-06 | Selected emoji highlighted | Indigo border | — | |
| CA-07 | Fill name → save | Category created; in list | — | |
| CA-08 | Submit without name | Save disabled or validation error | — | |
| CA-09 | Tap pencil on category | Edit modal pre-filled | — | |
| CA-10 | Change emoji + name → save | Updated | — | |
| CA-11 | Delete category with no products | Confirm → deleted | — | |
| CA-12 | Delete category with products | Warning with product count before confirm | — | |
| CA-13 | Cancel delete | Not deleted | — | |
| CA-14 | New category appears in POS filter | Chip visible in BarberServiceScreen | — | |

---

## Section 12 — Inventory (PRODUCT)

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| INV-01 | Open InventoryListScreen | Products with stock; stat chips | — | |
| INV-02 | Stat chips: total · low · out | Correct counts | — | |
| INV-03 | Filter "Tất cả" | All products | — | |
| INV-04 | Filter "Sắp hết" (low) | Low-stock only | — | |
| INV-05 | Filter "Hết hàng" (out) | Out-of-stock only | — | |
| INV-06 | Pull-to-refresh | Refetches | — | |
| INV-07 | Tap product row | Adjust stock modal | — | |
| INV-08 | Modal: product name shown | Correct | — | |
| INV-09 | Enter qty + reason + note → confirm | Stock updated | — | |
| INV-10 | Adjust without quantity | Confirm button disabled | — | |
| INV-11 | Adjust without reason | Validation error | — | |

---

## Section 13 — Staff / Employees (EMPLOYEE + COMMISSION)

### 13.1 Staff list

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| ST-01 | Open StaffListScreen | Cards with name, role badge, status | — | |
| ST-02 | Role colours | SHOP_OWNER=indigo · TECHNICIAN=amber · RECEPTIONIST=green | — | |
| ST-03 | Pull-to-refresh | Refetches | — | |
| ST-04 | Empty list | EmptyState | — | |

### 13.2 Create staff

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| ST-05 | Tap FAB | StaffFormScreen create mode | — | |
| ST-06 | Username field editable | Correct | — | |
| ST-07 | Auto-generated password `TAPPY-XXXX` visible | Shown by default | — | |
| ST-08 | Toggle password visibility | Eye icon works | — | |
| ST-09 | Tap "Tạo lại" (regenerate) | New `TAPPY-XXXX` password | — | |
| ST-10 | Tap copy icon | Copied; toast shown | — | |
| ST-11 | Select role TECHNICIAN (stylist) | Chip highlighted | — | |
| ST-12 | Select role RECEPTIONIST | Chip highlighted | — | |
| ST-13 | Submit valid | Staff created; credential modal shows username + temp password | — | |
| ST-14 | Copy in credential modal | Copied to clipboard | — | |
| ST-15 | Close modal | Back to list; new staff visible | — | |
| ST-16 | Submit with empty username | Validation error | — | |

### 13.3 Edit staff

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| ST-17 | Tap existing staff → edit | Pre-filled; username not editable | — | |
| ST-18 | Change role → save | Updated badge in list | — | |
| ST-19 | Toggle active/inactive | Confirm → status toggled; card shows indicator | — | |
| ST-20 | Reset password | Confirm → new temp password modal | — | |
| ST-21 | Copy in reset modal | Copied; toast | — | |

### 13.4 Staff performance (COMMISSION)

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| ST-22 | Open StaffPerformanceScreen | Cards with metrics per stylist | — | |
| ST-23 | Columns: service count · revenue · avg duration · commission | All shown | — | |
| ST-24 | Filter DAY | Today | — | |
| ST-25 | Filter WEEK | This week | — | |
| ST-26 | Filter MONTH | This month | — | |
| ST-27 | Filter YEAR | This year | — | |
| ST-28 | Navigate ← → period | Previous/next period | — | |
| ST-29 | Pull-to-refresh | Refetches | — | |
| ST-30 | Staff with commission rate | Commission = revenue × rate | — | |

---

## Section 14 — Notifications (NOTIFICATION)

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| NO-01 | Open NotificationScreen | List; unread count badge | — | |
| NO-02 | Filter chips: Tất cả · Chưa đọc · Đơn hàng · Hệ thống | All 4 visible | — | |
| NO-03 | Default: Tất cả | All shown | — | |
| NO-04 | "Chưa đọc" | Unread only | — | |
| NO-05 | "Đơn hàng" | ORDER-type only | — | |
| NO-06 | "Hệ thống" | SYSTEM-type only | — | |
| NO-07 | Unread style | Indigo bg + border + dot | — | |
| NO-08 | Read style | White bg; no dot | — | |
| NO-09 | Tap unread | Marked read; bg → white | — | |
| NO-10 | Tap already-read | No change | — | |
| NO-11 | "Đánh dấu tất cả đã đọc" visible when unread > 0 | Shown | — | |
| NO-12 | Tap mark-all-read | Confirm dialog | — | |
| NO-13 | Confirm | All → read; badge disappears | — | |
| NO-14 | Cancel | Unchanged | — | |
| NO-15 | Empty | EmptyState | — | |
| NO-16 | Pull-to-refresh | Refetches | — | |

---

## Section 15 — Activity Log (ACTIVITY_LOG)

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| AL-01 | Open ActivityLogScreen | Audit entries: timestamp + action + user | — | |
| AL-02 | Session actions visible | Order/customer/appointment created this session | — | |
| AL-03 | Pagination | Older entries load | — | |
| AL-04 | Pull-to-refresh | Refetches | — | |

---

## Section 16 — Settings

### 16.1 Settings main screen

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| SE-01 | Open Settings | SettingsScreen; salon name + avatar at top | — | |
| SE-02 | All sections present | Tài khoản · Cửa hàng · Tuỳ chọn · Hỗ trợ · Hệ thống | — | |
| SE-03 | Logout button at bottom | Visible | — | |

### 16.2 Profile update

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| SE-04 | Tap "Cập nhật hồ sơ" | ProfileUpdateScreen; fields pre-filled | — | |
| SE-05 | Edit full name → save | Updated in Settings header | — | |

### 16.3 Change password

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| SE-06 | Tap "Đổi mật khẩu" | ChangePasswordScreen | — | |
| SE-07 | Current + new + confirm (matching) → submit | Success | — | |
| SE-08 | Wrong current password | API error shown | — | |
| SE-09 | New ≠ confirm | Inline error | — | |

### 16.4 Shop info (SHOP_INFO)

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| SE-10 | Tap "Thông tin cửa hàng" | Name, address, phone, type "Salon tóc" | — | |
| SE-11 | Edit salon name → save | Updated | — | |

### 16.5 Bank accounts (BANK_ACCOUNT)

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| SE-12 | Open BankAccountsScreen | List of saved accounts | — | |
| SE-13 | Add: bank + account number + holder → save | Appears in list; available in POS QR picker | — | |
| SE-14 | Missing required fields | Validation error | — | |

### 16.6 POS Config

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| SE-15 | Open POSConfigScreen | Config options load | — | |
| SE-16 | Toggle a setting | Persists | — | |

### 16.7 Default Expenses

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| SE-17 | Open DefaultExpensesScreen | Default categories list | — | |
| SE-18 | Add a category | Appears in list; used as suggestion | — | |

### 16.8 Security (PIN)

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| SE-19 | Open SecurityScreen | PIN change + biometric toggle | — | |
| SE-20 | Current PIN correct → step 2 | Advances | — | |
| SE-21 | New + matching confirm | PIN updated | — | |
| SE-22 | Wrong current PIN | Error; stays on step 1 | — | |
| SE-23 | New ≠ confirm | "PIN không khớp" | — | |

### 16.9 Display / Language

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| SE-24 | Open DisplayScreen | Language toggle visible | — | |
| SE-25 | Toggle VI → EN | All strings switch immediately | — | |
| SE-26 | Toggle EN → VI | Reverts | — | |

### 16.10 Notification Preferences

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| SE-27 | Open NotificationPreferencesScreen | Per-type toggles | — | |
| SE-28 | Toggle a type off | Saved (debounced 300 ms) | — | |
| SE-29 | Toggle back on | Restored | — | |

### 16.11 Feedback (FEEDBACK)

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| SE-30 | Open FeedbackScreen | Category + message fields | — | |
| SE-31 | Submit without message | Validation error | — | |
| SE-32 | Category + message → submit | Success | — | |
| SE-33 | Open FeedbackHistoryScreen | Past submissions listed | — | |

### 16.12 Support contacts

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| SE-34 | Hotline row | Tap → phone dialler opens | — | |
| SE-35 | Email row | Tap → mail app | — | |
| SE-36 | Zalo row | Tap → Zalo OA | — | |

### 16.13 Print templates (PRINT_TEMPLATE)

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| SE-37 | Open PrintTemplateListScreen | Templates listed | — | |
| SE-38 | Tap a template | PrintTemplateDetailScreen | — | |

### 16.14 Subscription

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| SE-39 | Open SubscriptionScreen | Plan name + expiry + max users | — | |
| SE-40 | Matches actual plan | Correct | — | |

### 16.15 Terms & Conditions

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| SE-41 | Open TnCScreen | Scrollable content | — | |

### 16.16 Delete account

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| SE-42 | Open DeleteAccountScreen | Warning shown | — | |
| SE-43 | Cancel | Returns to settings | — | |

---

## Section 17 — Profile & session

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| PF-01 | Open ProfileScreen | Name, phone, role SHOP_OWNER, salon name | — | |
| PF-02 | Language VI → EN | All strings switch | — | |
| PF-03 | Language EN → VI | Reverts | — | |
| PF-04 | Inline change password | Same as SE-07 | — | |
| PF-05 | Tap "Đăng xuất" | Confirm dialog | — | |
| PF-06 | Confirm logout | SecureStore cleared; cartStore cleared; → ShopIdScreen | — | |
| PF-07 | Cancel logout | Stays on ProfileScreen | — | |

---

## Section 18 — Tools (Tiện ích)

| ID | Step | Expected | Status | Notes |
|----|------|----------|--------|-------|
| TL-01 | Open UtilitiesScreen | 2 groups; 7 tool cards | — | |
| TL-02 | Currency Converter | Rates load from VCB; select currency + amount → result | — | |
| TL-03 | Direction toggle VND → FCY | Result inverts | — | |
| TL-04 | Custom rate | Result labelled "tùy chỉnh" | — | |
| TL-05 | Interest Calculator simple + compound | Totals correct | — | |
| TL-06 | Loan Calculator — EMI + reducing balance | Schedule shown; >30% income warning | — | |
| TL-07 | Tax Calculator — gross salary | BHXH/BHYT/BHTN auto-calc; brackets shown | — | |
| TL-08 | Bill Splitter — min 2 / max 20 | Per-person amount ceil-rounded | — | |
| TL-09 | Budget Rule — 50/30/20 and 6 Jars | Correct bucket amounts | — | |
| TL-10 | Breakeven — option A + B | Breakeven month shown | — | |

---

## Section 19 — Cross-cutting / non-functional

| ID | Area | Expected | Status |
|----|------|----------|--------|
| X-01 | Safe area | No content behind notch/home bar on any screen | — |
| X-02 | Keyboard avoidance | Inputs scroll into view | — |
| X-03 | Pull-to-refresh all lists | Spinner + refetch; no crash | — |
| X-04 | Empty states | EmptyState always shown; never blank | — |
| X-05 | Error / offline | ErrorState + retry; no crash | — |
| X-06 | Loading skeletons | Skeletons on every initial data fetch | — |
| X-07 | Haptics | Add to cart fires haptic | — |
| X-08 | Back gesture | Swipe-from-edge on every screen | — |
| X-09 | Amount formatting | `1.500.000 ₫` throughout | — |
| X-10 | Vietnamese labels | No raw codes exposed | — |
| X-11 | Dark mode | All screens render correctly | — |
| X-12 | Token refresh | 30+ min background → silent refresh | — |
| X-13 | Tab state | No unnecessary refetch within staleTime | — |
| X-14 | Confirm before destructive actions | Delete / cancel / logout all show dialogs | — |
| X-15 | Portrait / landscape | Layout doesn't break | — |
| X-16 | Toast messages | Success toasts on create/update/delete | — |
| X-17 | Hint message on Create Order | Standard hint message visible (bug check) | — |

---

## Section 20 — Regression checklist (run before every release)

- [ ] `npx tsc --noEmit` → 0 errors
- [ ] **Auth:** shop ID → login → PIN setup → PIN login
- [ ] **POS golden path (Hair Salon):** BarberServiceScreen → add hair service + assign stylist → select customer → cash checkout → OrderSuccess → back with empty cart
- [ ] **POS with QR:** hair service → bank transfer → VietQR generated
- [ ] **Quick phrases:** "Uốn", "Nhuộm", "Duỗi", "Gội đầu" chips shown in service bottom sheet
- [ ] **Loyalty at checkout:** customer with points → enable redemption → discount applied to total
- [ ] **Appointment golden path:** create (linked customer + 2 services + stylist) → confirm → check-in → POS redirect
- [ ] **ORDER_VIEW_ALL:** order list shows orders from other staff
- [ ] **Walk-in customer:** attempt delete "Khách lẻ" → blocked
- [ ] **Customer preferences:** save hair type/allergies → preferences banner shown at POS
- [ ] **Staff:** create TECHNICIAN (stylist) with auto-password → credential modal shown
- [ ] **Product:** create hair service type with duration → in appointment service picker
- [ ] **Category:** create with emoji → appears in POS filter chips
- [ ] **Inventory:** adjust stock → updated
- [ ] **Notifications:** unread highlight → mark all read
- [ ] **Language switch:** VI → EN; all strings change
- [ ] **Logout:** clears session → ShopIdScreen

---

## Coverage summary

| Feature | Sections | Cases | Testable |
|---------|---------|-------|---------|
| DASHBOARD | §3 | 11 | ✅ |
| ORDER | §5 | 11 | ✅ |
| ORDER_VIEW_ALL | OR-07 | 1 | ✅ |
| MY_WORK | §7 | 17 | ✅ |
| PRODUCT | §10–§12 | 39 | ✅ |
| POS (BarberServiceScreen) | §4 | 52 | ✅ |
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
| Tools | §18 | 10 | ✅ |
| **Total** | | **~316** | |
