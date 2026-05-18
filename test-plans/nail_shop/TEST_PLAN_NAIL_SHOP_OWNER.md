# E2E Test Plan — Nail Shop · SHOP_OWNER Role

> **Shop type:** NAIL_SHOP  
> **Role under test:** SHOP_OWNER (all 23 features)  
> **Test account:** phone `0982065218` · password `12345678x@X`  
> **Legend:** ✅ pass · ❌ fail · ⚠️ partial · — not run yet  
> **Run order:** sections must be executed top-to-bottom (each section may depend on data created earlier)

---

## Section 0 — Pre-flight checklist

| # | Check | Expected | Status |
|---|-------|----------|--------|
| PRE-01 | Backend is reachable | `GET /api/actuator/health` → `UP` | — |
| PRE-02 | Nail shop tenant exists and is ACTIVE | Confirmed in master dashboard | — |
| PRE-03 | At least 1 product/service exists in the shop | Seeded or created manually | — |
| PRE-04 | At least 1 staff member (non-owner) exists | Seeded or created via Staff screen | — |
| PRE-05 | App installed and cold-started | ShopIdScreen shows on launch | — |

---

## Section 1 — Auth

### 1.1 Login
| # | Step | Expected | Status |
|---|------|----------|--------|
| A-01 | Enter shop tenant ID → submit | LoginScreen shown; shop name displayed read-only | — |
| A-02 | Enter phone `0982065218` + password `12345678x@X` → submit | If PIN not set → PinSetupScreen; if PIN set → PinLoginScreen | — |
| A-03 | (First run) Set a 6-digit PIN; confirm matching PIN | PIN saved; Dashboard shown | — |
| A-04 | (Subsequent runs) Enter correct PIN | Dashboard shown immediately | — |
| A-05 | JWT `features` claim includes all 23 Nail Shop features | All tabs and menu items visible (see Section 2) | — |

---

## Section 2 — Navigation & feature visibility (SHOP_OWNER gate check)

> Verify all features visible — nothing hidden, nothing extra (no PAWN, no GOLD_PRICE, no VENDOR, no INVENTORY_ADJ since Nail Shop doesn't have them).

| # | Step | Expected | Status |
|---|------|----------|--------|
| N-01 | Bottom tab bar | 5 tabs visible: Trang chủ · Bán hàng · Chi phí · Báo cáo · Cài đặt (or equivalent) | — |
| N-02 | Open "Thêm" / overflow menu (MoreScreen) | Shows: Sản phẩm, Khách hàng, Lịch hẹn, Đơn hàng, Nhân viên, Thông báo, Combo, Mẫu in, Nhật ký | — |
| N-03 | PAWN / gold items absent | No "Cầm đồ" or "Giá vàng" in any menu | — |
| N-04 | VENDOR / INVENTORY items absent | No "Nhà cung cấp" or "Nhập hàng" in any menu | — |

---

## Section 3 — Dashboard

| # | Step | Expected | Status |
|---|------|----------|--------|
| D-01 | Dashboard loads | KPI cards render: doanh thu, số đơn, khách hàng mới | — |
| D-02 | Period selector: Hôm nay → Tuần này → Tháng này | KPI values change per period | — |
| D-03 | Recent orders list (bottom of Dashboard) | Shows up to 5 latest orders with status badges | — |
| D-04 | Tap a recent order | Opens OrderDetailScreen | — |
| D-05 | Pull-to-refresh | KPIs and recent orders refetch | — |
| D-06 | SHOP_OWNER KPIs include revenue figures | Revenue (doanh thu) card visible and non-zero if orders exist | — |

---

## Section 4 — POS / Selling (golden path for Nail Shop)

### 4.1 Product selection
| # | Step | Expected | Status |
|---|------|----------|--------|
| P-01 | Tap "Bán hàng" tab | POSScreen loads; product/service grid shown | — |
| P-02 | Category chips visible | Scrollable horizontal chips; tap one filters grid | — |
| P-03 | Search for a service by name | Results filter within 300 ms (debounced) | — |
| P-04 | Tap a product/service | Added to cart; haptic; cart badge increments | — |
| P-05 | Tap same product again | Quantity increments; badge updates | — |

### 4.2 Cart
| # | Step | Expected | Status |
|---|------|----------|--------|
| P-06 | Open cart | CartScreen shows item(s); qty steppers visible | — |
| P-07 | Increase quantity via stepper | Total updates live | — |
| P-08 | Decrease to 1 → trash icon appears | Tap trash → confirm dialog → item removed | — |
| P-09 | Tap "Thanh toán" | CheckoutScreen opens | — |

### 4.3 Checkout & order creation
| # | Step | Expected | Status |
|---|------|----------|--------|
| P-10 | CheckoutScreen shows summary | Line items, subtotal, total correct | — |
| P-11 | Select "Tiền mặt" payment | Cash amount input + change calculator shown | — |
| P-12 | Select "Chuyển khoản" payment | Bank transfer method highlighted | — |
| P-13 | Tap "Xác nhận" | 4-step server flow completes; OrderSuccessScreen shown | — |
| P-14 | OrderSuccessScreen shows order number + total | Correct values | — |
| P-15 | Tap "Đơn hàng mới" | Returns to POS; cart cleared | — |

### 4.4 Assign technician at checkout (Nail Shop specific)
| # | Step | Expected | Status |
|---|------|----------|--------|
| P-16 | At checkout, technician/staff assignment visible | Staff picker shown (if implemented in CheckoutScreen) | — |
| P-17 | Select a staff member | Order linked to that staff (visible in OrderDetail) | — |

---

## Section 5 — Orders

### 5.1 Order list (ORDER_VIEW_ALL — sees ALL staff orders)
| # | Step | Expected | Status |
|---|------|----------|--------|
| OR-01 | Open OrderListScreen | All tenant orders shown (not limited to own) | — |
| OR-02 | Status filter chips: PENDING · PROCESSING · COMPLETED · CANCELLED | Each chip filters correctly | — |
| OR-03 | Search by order number or customer name | Results filter | — |
| OR-04 | Scroll to bottom | Next page loads (infinite scroll) | — |
| OR-05 | Orders created by other staff are visible | Confirms ORDER_VIEW_ALL is active for SHOP_OWNER | — |

### 5.2 Order detail — actions
| # | Step | Expected | Status |
|---|------|----------|--------|
| OR-06 | Tap a PENDING order | OrderDetailScreen opens; items, amounts, status shown | — |
| OR-07 | Tap "Hoàn thành" | Confirm → status → COMPLETED; footer disappears | — |
| OR-08 | Tap a PENDING order → "Huỷ đơn" | Confirm dialog → status → CANCELLED | — |
| OR-09 | Open COMPLETED order | No action footer; read-only view | — |
| OR-10 | Order detail shows assigned technician | Staff name visible (if assigned at checkout) | — |

---

## Section 6 — Appointments (APPOINTMENT — Nail Shop critical flow)

### 6.1 Appointment list
| # | Step | Expected | Status |
|---|------|----------|--------|
| AP-01 | Open AppointmentListScreen (via More menu) | List loads; date/status filters visible | — |
| AP-02 | Filter by date (today) | Only today's appointments shown | — |
| AP-03 | Filter by status | PENDING / CONFIRMED / COMPLETED / CANCELLED chips work | — |
| AP-04 | Empty state (no appointments) | EmptyState shown; CTA to create | — |
| AP-05 | Pull-to-refresh | List refetches | — |

### 6.2 Create appointment
| # | Step | Expected | Status |
|---|------|----------|--------|
| AP-06 | Tap FAB / "Tạo lịch hẹn" | AppointmentFormScreen opens | — |
| AP-07 | Select customer (existing) | Customer search/picker works | — |
| AP-08 | Select service/product | Service picker works | — |
| AP-09 | Select date + time | Date/time picker works; past time blocked | — |
| AP-10 | Assign technician/staff | Staff picker shows available staff | — |
| AP-11 | Add notes | Note field accepts text | — |
| AP-12 | Submit with all required fields | Appointment created; list refreshes | — |
| AP-13 | Submit with missing required field | Inline validation error shown | — |

### 6.3 Appointment detail & management
| # | Step | Expected | Status |
|---|------|----------|--------|
| AP-14 | Tap an appointment | AppointmentDetailScreen opens; all fields shown | — |
| AP-15 | Confirm a PENDING appointment | Status → CONFIRMED | — |
| AP-16 | Complete a CONFIRMED appointment | Status → COMPLETED | — |
| AP-17 | Cancel an appointment | Confirm dialog → CANCELLED | — |
| AP-18 | Edit appointment (reschedule) | Form pre-filled; save updates record | — |

---

## Section 7 — Customers (CUSTOMER + LOYALTY)

### 7.1 Customer list & search
| # | Step | Expected | Status |
|---|------|----------|--------|
| CU-01 | Open CustomerListScreen | Cards with name, phone, stats | — |
| CU-02 | Search by name or phone | Debounced; results filter | — |
| CU-03 | Scroll to bottom | Next page loads | — |

### 7.2 Create customer
| # | Step | Expected | Status |
|---|------|----------|--------|
| CU-04 | Tap FAB | CustomerFormScreen in create mode | — |
| CU-05 | Fill name + phone + gender | Valid form | — |
| CU-06 | Submit | Customer created; list refreshes | — |
| CU-07 | Duplicate phone number | Conflict alert with existing customer name | — |

### 7.3 Customer detail
| # | Step | Expected | Status |
|---|------|----------|--------|
| CU-08 | Tap a customer | CustomerDetailScreen: stats header + order history | — |
| CU-09 | Edit customer | Pre-filled form; save persists | — |
| CU-10 | Delete customer | Confirm dialog → deleted; back to list | — |

### 7.4 Loyalty points (LOYALTY)
| # | Step | Expected | Status |
|---|------|----------|--------|
| CU-11 | Open CustomerLoyaltyScreen from customer detail | Loyalty point balance and history shown | — |
| CU-12 | Points balance reflects completed orders | Balance matches expected from order totals | — |

---

## Section 8 — Products (PRODUCT)

### 8.1 Product list
| # | Step | Expected | Status |
|---|------|----------|--------|
| PR-01 | Open ProductListScreen | 2-col grid; search + category chips | — |
| PR-02 | Search by product name | Results filter | — |
| PR-03 | Filter by category | Grid filters | — |
| PR-04 | Tap a product | ProductDetailScreen opens | — |

### 8.2 Product detail
| # | Step | Expected | Status |
|---|------|----------|--------|
| PR-05 | ProductDetailScreen renders | Name, price, unit, stock, description | — |
| PR-06 | "Thêm vào giỏ" FAB | Item added to cart; haptic | — |

### 8.3 Create product (SHOP_OWNER only)
| # | Step | Expected | Status |
|---|------|----------|--------|
| PR-07 | Tap "Tạo sản phẩm" | ProductCreateScreen opens | — |
| PR-08 | Fill name + price + unit + category | Valid form | — |
| PR-09 | Submit | Product created; appears in list | — |
| PR-10 | Missing required field | Inline validation error | — |

### 8.4 Edit product
| # | Step | Expected | Status |
|---|------|----------|--------|
| PR-11 | Open product → edit action | ProductEditScreen pre-filled | — |
| PR-12 | Change price → save | Updated price shown in detail and POS | — |

### 8.5 Categories
| # | Step | Expected | Status |
|---|------|----------|--------|
| PR-13 | Open CategoryListScreen | Categories listed | — |
| PR-14 | Create new category | Form → save → appears in list | — |

---

## Section 9 — Staff / Employees (EMPLOYEE + COMMISSION)

### 9.1 Staff list
| # | Step | Expected | Status |
|---|------|----------|--------|
| ST-01 | Open StaffListScreen | Staff cards with name, role, status | — |
| ST-02 | Search staff by name | Results filter | — |

### 9.2 Create / edit staff
| # | Step | Expected | Status |
|---|------|----------|--------|
| ST-03 | Tap FAB | StaffFormScreen in create mode | — |
| ST-04 | Fill name + phone + role (TECHNICIAN) | Valid form | — |
| ST-05 | Submit | Staff created; list refreshes | — |
| ST-06 | Tap existing staff → edit | Pre-filled form; save updates | — |

### 9.3 Staff performance (COMMISSION)
| # | Step | Expected | Status |
|---|------|----------|--------|
| ST-07 | Open StaffPerformanceScreen | Revenue, order count, commission per staff | — |
| ST-08 | Period selector works | Values update per selected period | — |

### 9.4 Staff queue (Nail Shop — who serves next)
| # | Step | Expected | Status |
|---|------|----------|--------|
| ST-09 | Open StaffQueueScreen | Queue list with staff positions | — |
| ST-10 | Reorder queue | Drag or action changes position | — |

---

## Section 10 — Notifications (NOTIFICATION)

| # | Step | Expected | Status |
|---|------|----------|--------|
| NO-01 | Open NotificationScreen | List of in-app notifications | — |
| NO-02 | Unread notifications highlighted | Visual distinction for unread | — |
| NO-03 | Tap a notification | Navigates to relevant screen (order/appointment) | — |
| NO-04 | Mark as read | Read state persists | — |
| NO-05 | Empty state (no notifications) | EmptyState shown | — |

---

## Section 11 — Activity Log (ACTIVITY_LOG)

| # | Step | Expected | Status |
|---|------|----------|--------|
| AL-01 | Open ActivityLogScreen | Audit entries with timestamp + action + user | — |
| AL-02 | Entries reflect actions taken in this session | e.g., order created, customer added | — |
| AL-03 | Scroll / pagination | Older entries load | — |

---

## Section 12 — Settings (SHOP_OWNER-only)

### 12.1 Shop info (SHOP_INFO)
| # | Step | Expected | Status |
|---|------|----------|--------|
| SE-01 | Open ShopInfoScreen | Shop name, address, phone, type shown | — |
| SE-02 | Edit shop name → save | Updated name persists | — |

### 12.2 Bank accounts (BANK_ACCOUNT)
| # | Step | Expected | Status |
|---|------|----------|--------|
| SE-03 | Open BankAccountsScreen | List of bank accounts | — |
| SE-04 | Add new bank account | Form → save → appears in list | — |

### 12.3 Security (PIN management)
| # | Step | Expected | Status |
|---|------|----------|--------|
| SE-05 | Open SecurityScreen | PIN change option + biometric toggle visible | — |
| SE-06 | Change PIN: enter current → new → confirm | New PIN saved; next login uses new PIN | — |

### 12.4 Feedback (FEEDBACK)
| # | Step | Expected | Status |
|---|------|----------|--------|
| SE-07 | Open FeedbackScreen | Category + message form | — |
| SE-08 | Submit feedback | Success message shown | — |

### 12.5 Subscription
| # | Step | Expected | Status |
|---|------|----------|--------|
| SE-09 | Open SubscriptionScreen | Current plan, expiry date, max users shown | — |

### 12.6 Print templates (PRINT_TEMPLATE)
| # | Step | Expected | Status |
|---|------|----------|--------|
| SE-10 | Open PrintTemplateListScreen | Templates listed | — |
| SE-11 | Tap a template | PrintTemplateDetailScreen opens; content shown | — |

---

## Section 13 — Profile & session

| # | Step | Expected | Status |
|---|------|----------|--------|
| PF-01 | Open ProfileScreen | Name, phone, shop name, role shown | — |
| PF-02 | Language toggle VI → EN | All visible strings switch to English immediately | — |
| PF-03 | Language toggle EN → VI | Reverts to Vietnamese | — |
| PF-04 | Change password inline | Old + new + confirm → success alert | — |
| PF-05 | Logout | Alert confirm → SecureStore cleared → ShopIdScreen shown | — |

---

## Section 14 — Cross-cutting (apply to all real screens)

| # | Area | Expected | Status |
|---|------|----------|--------|
| X-01 | Safe area on notch device | No content hidden behind notch or home bar | — |
| X-02 | Keyboard avoidance | Inputs scroll into view when keyboard opens | — |
| X-03 | Pull-to-refresh on all list screens | Refetches without crash | — |
| X-04 | Empty states | All list screens show EmptyState when no data | — |
| X-05 | Error / offline state | ErrorState + retry shown on network failure | — |
| X-06 | Loading skeletons | Skeleton shown on initial fetch for all data screens | — |
| X-07 | Back gesture | Swipe-from-edge works on every screen | — |
| X-08 | Amount formatting | All VND amounts shown as `1.500.000 ₫` (dot-separated) | — |
| X-09 | Vietnamese labels | No raw feature codes or English keys exposed to user | — |

---

## Nail Shop SHOP_OWNER — feature coverage summary

| Feature | Sections covered | Testable |
|---------|-----------------|---------|
| DASHBOARD | §3 | ✅ |
| ORDER | §5 | ✅ |
| ORDER_VIEW_ALL | OR-05 | ✅ |
| MY_WORK | — | ⚠️ not in plan (scope TBD) |
| PRODUCT | §8 | ✅ |
| POS | §4 | ✅ |
| CUSTOMER | §7.1–7.3 | ✅ |
| LOYALTY | §7.4 | ✅ |
| COMMISSION | §9.3 | ✅ |
| EMPLOYEE | §9.1–9.2 | ✅ |
| SALARY | — | ⚠️ not in plan (no mobile screen yet) |
| EXPENSE | — | ⚠️ tab stub |
| REVENUE | — | ⚠️ tab stub |
| USER | — | ⚠️ not in plan (no mobile screen yet) |
| APPOINTMENT | §6 | ✅ |
| NOTIFICATION | §10 | ✅ |
| FEEDBACK | §12.4 | ✅ |
| ACTIVITY_LOG | §11 | ✅ |
| SHOP_INFO | §12.1 | ✅ |
| PRINT_TEMPLATE | §12.6 | ✅ |
| BANK_ACCOUNT | §12.2 | ✅ |
| INVOICE | — | ⚠️ no dedicated mobile screen |
| ACCOUNTING | — | ⚠️ no dedicated mobile screen |
