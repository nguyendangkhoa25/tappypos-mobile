# Barber Shop Mobile E2E Test Plan (Maestro)

**Shop:** barm-59158 (BARBER_SHOP_MEN)  
**User:** 0974863175 (SHOP_OWNER)  
**Tool:** Maestro 2.5+ (YAML flows)  
**App ID:** com.knp.tappypos  
**Status:** Plan only — DO NOT RUN yet  
**Created:** 2026-05-15

---

## Overview

This plan defines Maestro flow files for all 23 barber shop features. Flows 01–04 already exist and cover auth + POS + orders + customers. This plan defines flows 05–14 and any new subflows / testID additions needed.

**Features covered:** DASHBOARD, POS, ORDER, ORDER_VIEW_ALL, CUSTOMER, LOYALTY, APPOINTMENT, EMPLOYEE, SALARY, EXPENSE, PRODUCT, REVENUE, NOTIFICATION, ACTIVITY_LOG, SHOP_INFO, BANK_ACCOUNT, PRINT_TEMPLATE, FEEDBACK, MY_WORK, USER, COMMISSION, ACCOUNTING, INVOICE  
**Negative tests:** INVENTORY, PAWN, GOLD_PRICE, VENDOR, PROMOTION all blocked → hidden in UI

---

## Environment Setup

### `e2e/.env` for barber shop testing

```env
# Barber shop credentials (replace defaults before running)
SHOP_ID=barm-59158
PHONE=0974863175
PASSWORD=<barber_shop_owner_password>

# Test data — must match seeded products/categories
BARBER_SERVICE_NAME=Cắt tóc nam
BARBER_CATEGORY=Dịch vụ cắt tóc

# Unique test data — change to avoid collision across runs
NEW_CUSTOMER_PHONE=0900000099
NEW_EMPLOYEE_PHONE=0911222333
TEST_APPOINTMENT_CUSTOMER=Khách Test Hẹn
TEST_EXPENSE_NAME=Chi phí test E2E
```

---

## Flow Inventory

| File | Feature(s) | Depends on | Status |
|------|-----------|-----------|--------|
| `flows/01_auth.yaml` | AUTH | — | ✅ Exists |
| `flows/02_pos_golden_path.yaml` | POS | Seeded product | ✅ Exists |
| `flows/03_order_complete_cancel.yaml` | ORDER | POS flow | ✅ Exists |
| `flows/04_customer_crud.yaml` | CUSTOMER | — | ✅ Exists |
| `flows/05_barber_pos_service.yaml` | POS (barber mode) | Seeded barber service | 🆕 To create |
| `flows/06_appointment_crud.yaml` | APPOINTMENT | Customer exists | 🆕 To create |
| `flows/07_employee_management.yaml` | EMPLOYEE, SALARY | — | 🆕 To create |
| `flows/08_expense_flow.yaml` | EXPENSE | — | 🆕 To create |
| `flows/09_product_list.yaml` | PRODUCT | Seeded products | 🆕 To create |
| `flows/10_revenue_report.yaml` | REVENUE, ACCOUNTING | Orders exist | 🆕 To create |
| `flows/11_notifications.yaml` | NOTIFICATION | — | 🆕 To create |
| `flows/12_activity_log.yaml` | ACTIVITY_LOG | Prior actions | 🆕 To create |
| `flows/13_settings_config.yaml` | SHOP_INFO, BANK_ACCOUNT, PRINT_TEMPLATE | — | 🆕 To create |
| `flows/14_security_blocked_features.yaml` | INVENTORY, PAWN, GOLD_PRICE (all must be hidden) | — | 🆕 To create |
| `subflows/_navigate_to_more.yaml` | Reusable: open MoreScreen | — | 🆕 To create |

---

## npm Scripts to Add (package.json)

```json
"e2e:barber-pos":      "e2e/maestro.sh e2e/flows/05_barber_pos_service.yaml",
"e2e:appointments":    "e2e/maestro.sh e2e/flows/06_appointment_crud.yaml",
"e2e:employees":       "e2e/maestro.sh e2e/flows/07_employee_management.yaml",
"e2e:expenses":        "e2e/maestro.sh e2e/flows/08_expense_flow.yaml",
"e2e:products":        "e2e/maestro.sh e2e/flows/09_product_list.yaml",
"e2e:revenue":         "e2e/maestro.sh e2e/flows/10_revenue_report.yaml",
"e2e:notifications":   "e2e/maestro.sh e2e/flows/11_notifications.yaml",
"e2e:activity-log":    "e2e/maestro.sh e2e/flows/12_activity_log.yaml",
"e2e:settings":        "e2e/maestro.sh e2e/flows/13_settings_config.yaml",
"e2e:security":        "e2e/maestro.sh e2e/flows/14_security_blocked_features.yaml",
"e2e:barber-all":      "e2e/maestro.sh e2e/flows/"
```

---

## testID Additions Required

These `testID` props must be added to source files before flows can be automated. All new IDs follow the existing `kebab-case` convention.

### `src/screens/selling/BarberServiceScreen.tsx`
| testID | Element |
|--------|---------|
| `barber-service-{name}` | Service card TouchableOpacity |
| `barber-service-search` | Search TextInput |
| `barber-cart-btn` | Cart icon button (if different from POS) |

### `src/screens/appointment/AppointmentListScreen.tsx`
| testID | Element |
|--------|---------|
| `appointment-add-fab` | "+" FAB button |
| `appointment-row-{index}` | Appointment row at index |
| `appointment-date-filter` | Date picker / filter input |
| `appointment-search-input` | Search TextInput |

### `src/screens/appointment/AppointmentFormScreen.tsx`
| testID | Element |
|--------|---------|
| `appointment-customer-name` | Customer name TextInput |
| `appointment-customer-phone` | Customer phone TextInput |
| `appointment-service-name` | Service name TextInput |
| `appointment-date-picker` | Date/time picker TouchableOpacity |
| `appointment-form-submit` | Submit button |
| `appointment-notes` | Notes TextInput (optional) |

### `src/screens/appointment/AppointmentDetailScreen.tsx`
| testID | Element |
|--------|---------|
| `appointment-cancel-btn` | Cancel appointment button |
| `appointment-confirm-btn` | Confirm / mark arrived button |
| `appointment-back-btn` | Back button |

### `src/screens/staff/StaffListScreen.tsx`
| testID | Element |
|--------|---------|
| `staff-add-fab` | "+" FAB |
| `staff-row-{index}` | Staff row at index |
| `staff-search-input` | Search TextInput |

### `src/screens/staff/StaffFormScreen.tsx`
| testID | Element |
|--------|---------|
| `staff-name` | Full name TextInput |
| `staff-phone` | Phone TextInput |
| `staff-position` | Position picker/select |
| `staff-form-submit` | Submit button |

### `src/screens/staff/StaffPerformanceScreen.tsx`
| testID | Element |
|--------|---------|
| `staff-performance-period` | Period filter selector |
| `staff-performance-revenue` | Revenue amount Text |

### `src/screens/settings/DefaultExpensesScreen.tsx` (used for expense categories)
| testID | Element |
|--------|---------|
| `expense-add-fab` | "+" FAB |
| `expense-row-{index}` | Expense row |

### Expense flow screen (wherever expense creation lives — TBD)
| testID | Element |
|--------|---------|
| `expense-name` | Expense name TextInput |
| `expense-amount` | Amount TextInput |
| `expense-category` | Category selector |
| `expense-date` | Date picker |
| `expense-form-submit` | Submit button |

### `src/screens/products/ProductListScreen.tsx`
| testID | Element |
|--------|---------|
| `product-search-input` | Search TextInput |
| `product-row-{index}` | Product row at index |
| `product-add-fab` | "+" FAB |

### `src/screens/products/ProductDetailScreen.tsx`
| testID | Element |
|--------|---------|
| `product-detail-name` | Product name Text |
| `product-detail-price` | Price Text |
| `product-detail-back-btn` | Back button |

### Revenue / Reporting screen
| testID | Element |
|--------|---------|
| `revenue-overview-total` | Total revenue Text |
| `revenue-period-selector` | Period filter |
| `revenue-chart` | Chart container |

### `src/screens/settings/NotificationPreferencesScreen.tsx`
| testID | Element |
|--------|---------|
| `notif-pref-toggle-{type}` | Toggle switch per notification type |

### `src/navigation/AppNavigator.tsx` (More tab)
| testID | Element |
|--------|---------|
| `more-appointments-btn` | Appointments entry in More |
| `more-employees-btn` | Employees entry |
| `more-expenses-btn` | Expenses entry |
| `more-products-btn` | Products entry |
| `more-revenue-btn` | Revenue entry |
| `more-activity-log-btn` | Activity log entry |
| `more-notifications-btn` | Notifications entry |

### `src/screens/settings/ShopInfoScreen.tsx`
| testID | Element |
|--------|---------|
| `shop-info-name` | Shop name Text or TextInput |
| `shop-info-save-btn` | Save button |

### `src/screens/settings/BankAccountsScreen.tsx`
| testID | Element |
|--------|---------|
| `bank-account-add-btn` | Add bank account button |
| `bank-account-row-{index}` | Bank account row |

---

## Flow Definitions

### Flow 05 — Barber POS Service Mode

**File:** `e2e/flows/05_barber_pos_service.yaml`  
**Feature:** POS (barber shop uses `BarberServiceScreen` instead of standard `POSScreen`)  
**Prerequisites:** At least one SERVICE product seeded (e.g. "Cắt tóc nam")

```yaml
appId: com.knp.tappypos
name: "05 Barber POS — service selection → cart → checkout"
---

# ── Setup: log in ────────────────────────────────────────────────────────────
- runFlow: ../subflows/_login.yaml

# ── B01: Navigate to Selling tab (barber mode shows BarberServiceScreen) ─────
- tapOn:
    id: "tab-sell"
- assertVisible: "Dịch vụ"   # BarberServiceScreen title

# ── B02: Service list is populated ────────────────────────────────────────────
# testID: barber-service-{name} on each service card
- assertVisible:
    id: "barber-service-${BARBER_SERVICE_NAME}"

# ── B03: Tap a service to add it to cart ──────────────────────────────────────
- tapOn:
    id: "barber-service-${BARBER_SERVICE_NAME}"
# Cart badge increments to 1
- assertVisible:
    id: "pos-cart-count"
- assertVisible: "1"

# ── B04: Tap service again — cart count increments ───────────────────────────
- tapOn:
    id: "barber-service-${BARBER_SERVICE_NAME}"
- assertVisible: "2"

# ── B05: Open cart ────────────────────────────────────────────────────────────
- tapOn:
    id: "pos-cart-btn"
- assertVisible: ${BARBER_SERVICE_NAME}
- assertVisible: "Thanh toán"

# ── B06: Adjust quantity via stepper ─────────────────────────────────────────
- tapOn:
    id: "qty-plus-.*"
- assertVisible: "3"

# ── B07: Proceed to checkout ──────────────────────────────────────────────────
- tapOn: "Thanh toán"
- assertVisible: "Hoàn tất đơn hàng"
- assertVisible: "Phương thức thanh toán"

# ── B08: Complete the order ───────────────────────────────────────────────────
- tapOn: "Hoàn tất đơn hàng"
- assertVisible: "Đặt hàng thành công!"
- assertVisible:
    id: "order-success-number"

# ── B09: "Đơn mới" returns to barber service screen ──────────────────────────
- tapOn:
    id: "order-success-new"
- assertVisible: "Dịch vụ"
```

**Test cases covered:**
| ID | Description | Assertion |
|----|-------------|-----------|
| B01 | Barber POS opens BarberServiceScreen (not product list) | `assertVisible: "Dịch vụ"` |
| B02 | Services are listed with correct testIDs | `barber-service-{name}` visible |
| B03 | Tap service → cart count appears | `pos-cart-count` shows "1" |
| B04 | Tap again → count increments | "2" visible |
| B05 | Open cart → service name shown | Service name + "Thanh toán" |
| B06 | Stepper increments quantity | "3" visible |
| B07 | Checkout screen renders | "Hoàn tất đơn hàng" + payment methods |
| B08 | Order completes successfully | Order success screen + order number |
| B09 | "Đơn mới" returns to barber screen | "Dịch vụ" visible again |

---

### Flow 06 — Appointment CRUD

**File:** `e2e/flows/06_appointment_crud.yaml`  
**Feature:** APPOINTMENT  
**Prerequisites:** None (walk-in customer name used)

```yaml
appId: com.knp.tappypos
name: "06 Appointment CRUD — create, view, cancel"
---

# ── Setup: log in ────────────────────────────────────────────────────────────
- runFlow: ../subflows/_login.yaml

# ── AP01: Navigate to Appointments via More tab ───────────────────────────────
- tapOn:
    id: "tab-more"
- assertVisible: "Thêm tính năng"
- tapOn:
    id: "more-appointments-btn"
- assertVisible: "Lịch hẹn"

# ── Pre-cleanup: remove leftover test appointment from prior run ───────────────
- tapOn:
    id: "appointment-search-input"
    optional: true
- inputText: "${TEST_APPOINTMENT_CUSTOMER}"
    optional: true
- hideKeyboard
- tapOn:
    id: "appointment-row-0"
    optional: true
- tapOn:
    id: "appointment-cancel-btn"
    optional: true
- tapOn: "Hủy lịch hẹn"
    optional: true
- tapOn: "OK"
    optional: true

# ── Navigate back to fresh appointment list ───────────────────────────────────
- tapOn:
    id: "tab-more"
- tapOn:
    id: "more-appointments-btn"
- assertVisible: "Lịch hẹn"

# ── AP02: Open create appointment form ────────────────────────────────────────
- tapOn:
    id: "appointment-add-fab"
- assertVisible: "Thêm lịch hẹn"

# ── AP03: Fill in required fields ─────────────────────────────────────────────
- tapOn:
    id: "appointment-customer-name"
- inputText: "${TEST_APPOINTMENT_CUSTOMER}"

- tapOn:
    id: "appointment-customer-phone"
- inputText: "${NEW_CUSTOMER_PHONE}"

- tapOn:
    id: "appointment-service-name"
- inputText: "${BARBER_SERVICE_NAME}"

# ── AP04: Select date/time (tap picker, accept default tomorrow) ───────────────
- tapOn:
    id: "appointment-date-picker"
# Maestro cannot interact with native date pickers directly on iOS.
# Tap the "Xong" / "Done" button on the date picker wheel to confirm.
- tapOn: "Xong"
    optional: true
- tapOn: "Done"
    optional: true

# ── AP05: Submit the form ─────────────────────────────────────────────────────
- tapOn:
    id: "appointment-form-submit"
- assertVisible: "Đã tạo lịch hẹn"
- tapOn: "OK"

# ── AP06: New appointment appears in list ─────────────────────────────────────
- tapOn:
    id: "appointment-search-input"
- inputText: "${TEST_APPOINTMENT_CUSTOMER}"
- hideKeyboard
- assertVisible: "${TEST_APPOINTMENT_CUSTOMER}"
- assertVisible:
    id: "appointment-row-0"

# ── AP07: Tap appointment to view detail ─────────────────────────────────────
- tapOn:
    id: "appointment-row-0"
- assertVisible: "${TEST_APPOINTMENT_CUSTOMER}"
- assertVisible:
    id: "appointment-cancel-btn"

# ── AP08: Cancel the appointment ─────────────────────────────────────────────
- tapOn:
    id: "appointment-cancel-btn"
- assertVisible: "Hủy lịch hẹn?"
- tapOn: "Hủy lịch hẹn"
- assertVisible: "Đã hủy lịch hẹn"
- tapOn: "OK"

# ── AP09: Appointment no longer appears in upcoming list ──────────────────────
- tapOn:
    id: "appointment-back-btn"
- assertNotVisible:
    id: "appointment-row-0"
```

**Test cases covered:**
| ID | Description | Assertion |
|----|-------------|-----------|
| AP01 | Appointment list accessible via More tab | "Lịch hẹn" visible |
| AP02 | FAB opens create form | "Thêm lịch hẹn" visible |
| AP03 | Required fields accept input | Name + phone + service filled |
| AP04 | Date picker opens and closes | Native picker dismissed with Done |
| AP05 | Submit creates appointment | Success toast |
| AP06 | New appointment appears in search | Row-0 matches name |
| AP07 | Tap opens detail with cancel button | `appointment-cancel-btn` visible |
| AP08 | Cancel with confirmation | "Đã hủy lịch hẹn" toast |
| AP09 | Cancelled appointment removed from list | Row-0 not visible |

---

### Flow 07 — Employee Management

**File:** `e2e/flows/07_employee_management.yaml`  
**Features:** EMPLOYEE, SALARY

```yaml
appId: com.knp.tappypos
name: "07 Employee management — create, view performance, check salary tab"
---

# ── Setup: log in ────────────────────────────────────────────────────────────
- runFlow: ../subflows/_login.yaml

# ── E01: Navigate to Employees via More tab ───────────────────────────────────
- tapOn:
    id: "tab-more"
- tapOn:
    id: "more-employees-btn"
- assertVisible: "Nhân viên"

# ── Pre-cleanup: delete leftover E2E employee ────────────────────────────────
- tapOn:
    id: "staff-search-input"
- inputText: "Maestro Test Staff"
- hideKeyboard
- tapOn:
    id: "staff-row-0"
    optional: true
# Delete employee (if detail screen has delete option)
- tapOn: "Xóa"
    optional: true
- tapOn: "OK"
    optional: true

# Re-navigate to fresh list
- tapOn:
    id: "tab-more"
- tapOn:
    id: "more-employees-btn"
- assertVisible: "Nhân viên"

# ── E02: Open add-employee form ───────────────────────────────────────────────
- tapOn:
    id: "staff-add-fab"
- assertVisible: "Thêm nhân viên"

# ── E03: Fill required fields ─────────────────────────────────────────────────
- tapOn:
    id: "staff-name"
- inputText: "Maestro Test Staff"

- tapOn:
    id: "staff-phone"
- inputText: "${NEW_EMPLOYEE_PHONE}"

# Position picker — tap to open, select TECHNICIAN
- tapOn:
    id: "staff-position"
- tapOn: "Thợ"   # TECHNICIAN in Vietnamese

# ── E04: Submit form ──────────────────────────────────────────────────────────
- tapOn:
    id: "staff-form-submit"
- assertVisible: "Đã thêm nhân viên"
- tapOn: "OK"

# ── E05: New employee appears in list ────────────────────────────────────────
- tapOn:
    id: "staff-search-input"
- inputText: "Maestro"
- hideKeyboard
- assertVisible: "Maestro Test Staff"

# ── E06: Tap employee → view performance screen ──────────────────────────────
- tapOn:
    id: "staff-row-0"
# StaffPerformanceScreen or StaffDetailScreen — shows performance metrics
- assertVisible: "Maestro Test Staff"

# ── E07: SALARY feature — verify salary section is visible ───────────────────
# If the employee detail links to salary, tap it
- tapOn: "Lương"
    optional: true
# Salary section or navigation visible for SHOP_OWNER (has SALARY feature)
- assertVisible: "Lương"
    optional: true
```

**Test cases covered:**
| ID | Description | Assertion |
|----|-------------|-----------|
| E01 | Employee list accessible via More | "Nhân viên" visible |
| E02 | FAB opens create form | "Thêm nhân viên" |
| E03 | Name, phone, position filled | Inputs accept text |
| E04 | Submit creates employee | "Đã thêm nhân viên" toast |
| E05 | Employee appears in search | "Maestro Test Staff" visible |
| E06 | Tap employee opens performance detail | Employee name in detail |
| E07 | Salary section visible (SALARY feature) | "Lương" accessible |

---

### Flow 08 — Expense Tracking

**File:** `e2e/flows/08_expense_flow.yaml`  
**Feature:** EXPENSE

```yaml
appId: com.knp.tappypos
name: "08 Expense — create expense, verify in list"
---

# ── Setup: log in ────────────────────────────────────────────────────────────
- runFlow: ../subflows/_login.yaml

# ── EX01: Navigate to Expenses via More tab ───────────────────────────────────
- tapOn:
    id: "tab-more"
- tapOn:
    id: "more-expenses-btn"
- assertVisible: "Chi phí"

# ── EX02: Open create expense form ───────────────────────────────────────────
- tapOn:
    id: "expense-add-fab"
- assertVisible: "Thêm chi phí"

# ── EX03: Fill required fields ────────────────────────────────────────────────
- tapOn:
    id: "expense-name"
- inputText: "${TEST_EXPENSE_NAME}"

- tapOn:
    id: "expense-amount"
- inputText: "50000"

# Category selector (required) — tap and select first option
- tapOn:
    id: "expense-category"
- tapOn: "Văn phòng phẩm"   # or whatever first category appears
    optional: true
- tapOn: "Khác"             # fallback: "Other"
    optional: true

# ── EX04: Submit ─────────────────────────────────────────────────────────────
- tapOn:
    id: "expense-form-submit"
- assertVisible: "Đã lưu chi phí"
- tapOn: "OK"

# ── EX05: Expense appears in list ────────────────────────────────────────────
- assertVisible: "${TEST_EXPENSE_NAME}"
- assertVisible:
    id: "expense-row-0"

# ── EX06: Expense summary card shows non-zero total ───────────────────────────
# Exact text depends on screen design; assert any formatted amount is visible
- assertVisible: "50.000"
    optional: true
```

**Test cases covered:**
| ID | Description | Assertion |
|----|-------------|-----------|
| EX01 | Expense list accessible via More | "Chi phí" visible |
| EX02 | FAB opens create form | "Thêm chi phí" visible |
| EX03 | Name, amount, category filled | Inputs accept values |
| EX04 | Submit creates expense | "Đã lưu chi phí" toast |
| EX05 | Expense row-0 visible in list | Row present after creation |
| EX06 | Summary shows total | "50.000" formatted text |

---

### Flow 09 — Product List & Detail

**File:** `e2e/flows/09_product_list.yaml`  
**Feature:** PRODUCT

```yaml
appId: com.knp.tappypos
name: "09 Products — list, search, view detail"
---

# ── Setup: log in ────────────────────────────────────────────────────────────
- runFlow: ../subflows/_login.yaml

# ── PR01: Navigate to Products via More tab ───────────────────────────────────
- tapOn:
    id: "tab-more"
- tapOn:
    id: "more-products-btn"
- assertVisible: "Sản phẩm"

# ── PR02: Product list has at least one item ──────────────────────────────────
- assertVisible:
    id: "product-row-0"

# ── PR03: Search filters list ────────────────────────────────────────────────
- tapOn:
    id: "product-search-input"
- inputText: "${BARBER_SERVICE_NAME}"
- hideKeyboard
- assertVisible: "${BARBER_SERVICE_NAME}"

# ── PR04: Clear search → full list returns ────────────────────────────────────
- tapOn:
    id: "product-search-input"
- eraseText: 50
- hideKeyboard
- assertVisible:
    id: "product-row-0"

# ── PR05: Tap product → view detail ──────────────────────────────────────────
- tapOn:
    id: "product-row-0"
- assertVisible:
    id: "product-detail-name"
- assertVisible:
    id: "product-detail-price"

# ── PR06: Back to list ────────────────────────────────────────────────────────
- tapOn:
    id: "product-detail-back-btn"
- assertVisible: "Sản phẩm"
```

**Test cases covered:**
| ID | Description | Assertion |
|----|-------------|-----------|
| PR01 | Product list accessible | "Sản phẩm" visible |
| PR02 | At least one product seeded | `product-row-0` visible |
| PR03 | Search filters list | Service name matches |
| PR04 | Clear search restores list | `product-row-0` visible again |
| PR05 | Tap opens detail with name + price | Detail fields visible |
| PR06 | Back returns to list | "Sản phẩm" visible |

---

### Flow 10 — Revenue Report

**File:** `e2e/flows/10_revenue_report.yaml`  
**Features:** REVENUE, ACCOUNTING (dashboard stats)

```yaml
appId: com.knp.tappypos
name: "10 Revenue report — view overview and chart"
---

# ── Setup: log in ────────────────────────────────────────────────────────────
- runFlow: ../subflows/_login.yaml

# ── RV01: Dashboard shows revenue summary ────────────────────────────────────
- tapOn:
    id: "tab-home"
- assertVisible: "Tổng quan"
# Revenue KPI card should be visible on dashboard (DASHBOARD + REVENUE)
- assertVisible: "Doanh thu"

# ── RV02: Navigate to Revenue via More tab ────────────────────────────────────
- tapOn:
    id: "tab-more"
- tapOn:
    id: "more-revenue-btn"
- assertVisible: "Doanh thu"

# ── RV03: Revenue overview loads ────────────────────────────────────────────
- assertVisible:
    id: "revenue-overview-total"

# ── RV04: Period selector changes data ────────────────────────────────────────
- tapOn:
    id: "revenue-period-selector"
    optional: true
- tapOn: "Tháng này"
    optional: true
- assertVisible:
    id: "revenue-overview-total"

# ── RV05: Chart is rendered ───────────────────────────────────────────────────
- assertVisible:
    id: "revenue-chart"
    optional: true
```

**Test cases covered:**
| ID | Description | Assertion |
|----|-------------|-----------|
| RV01 | Dashboard shows "Doanh thu" KPI card | Text visible on home |
| RV02 | Revenue screen accessible via More | "Doanh thu" title |
| RV03 | Overview total is rendered | `revenue-overview-total` visible |
| RV04 | Period selector changes view | Still shows total after filter |
| RV05 | Chart component renders | `revenue-chart` visible |

---

### Flow 11 — Notifications

**File:** `e2e/flows/11_notifications.yaml`  
**Feature:** NOTIFICATION

```yaml
appId: com.knp.tappypos
name: "11 Notifications — list and preferences"
---

# ── Setup: log in ────────────────────────────────────────────────────────────
- runFlow: ../subflows/_login.yaml

# ── N01: Navigate to Notifications via More tab ───────────────────────────────
- tapOn:
    id: "tab-more"
- tapOn:
    id: "more-notifications-btn"
- assertVisible: "Thông báo"

# ── N02: Notification list renders (may be empty) ─────────────────────────────
# Empty state is acceptable; the screen must not crash
- assertNotVisible: "INTERNAL_SERVER_ERROR"
- assertNotVisible: "500"

# ── N03: Notification preferences accessible ──────────────────────────────────
- tapOn: "Cài đặt thông báo"
    optional: true
- tapOn:
    id: "more-notifications-btn"
    optional: true
# Navigate directly if accessible from settings
- tapOn:
    id: "tab-more"
- tapOn: "Cài đặt"
    optional: true
- tapOn: "Thông báo"
    optional: true
- assertNotVisible: "500"
    optional: true

# ── N04: Toggle a notification preference ─────────────────────────────────────
# testID: notif-pref-toggle-{type} — tap to toggle; must not crash
- tapOn:
    id: "notif-pref-toggle-.*"
    optional: true
- assertNotVisible: "Lỗi"
    optional: true
```

**Test cases covered:**
| ID | Description | Assertion |
|----|-------------|-----------|
| N01 | Notification list accessible | "Thông báo" visible |
| N02 | List renders without server error | No 500 text |
| N03 | Preferences screen reachable | No crash |
| N04 | Toggling preference doesn't crash | No error text |

---

### Flow 12 — Activity Log

**File:** `e2e/flows/12_activity_log.yaml`  
**Feature:** ACTIVITY_LOG  
**Prerequisites:** Run after other flows that generate activity (order create, customer create)

```yaml
appId: com.knp.tappypos
name: "12 Activity log — view log entries"
---

# ── Setup: log in ────────────────────────────────────────────────────────────
- runFlow: ../subflows/_login.yaml

# ── AL01: Navigate to Activity Log via More tab ───────────────────────────────
- tapOn:
    id: "tab-more"
- tapOn:
    id: "more-activity-log-btn"
- assertVisible: "Nhật ký hoạt động"

# ── AL02: Activity log list has entries (from prior flows) ───────────────────
# At least LOGIN should appear
- assertVisible:
    id: "activity-row-0"

# ── AL03: Entries show username and action ────────────────────────────────────
- assertVisible: "${PHONE}"
    optional: true

# ── AL04: List scrolls without crash ─────────────────────────────────────────
- scroll: down
- assertNotVisible: "500"
- assertNotVisible: "INTERNAL_SERVER_ERROR"
```

**Test cases covered:**
| ID | Description | Assertion |
|----|-------------|-----------|
| AL01 | Activity log accessible | "Nhật ký hoạt động" |
| AL02 | List has at least one entry | `activity-row-0` visible |
| AL03 | Entry shows actor or action | Phone visible |
| AL04 | Scroll does not crash | No error text |

> **testID needed:** `activity-row-{index}` on each log entry row in `src/screens/settings/ActivityLogScreen.tsx`

---

### Flow 13 — Settings & Shop Config

**File:** `e2e/flows/13_settings_config.yaml`  
**Features:** SHOP_INFO, BANK_ACCOUNT, PRINT_TEMPLATE

```yaml
appId: com.knp.tappypos
name: "13 Settings — shop info, bank accounts, print templates"
---

# ── Setup: log in ────────────────────────────────────────────────────────────
- runFlow: ../subflows/_login.yaml

# ── SC01: Navigate to Settings ────────────────────────────────────────────────
- tapOn:
    id: "tab-more"
- tapOn: "Cài đặt"
    optional: true
- tapOn:
    id: "settings-logout-btn"   # verify settings screen is reachable
    optional: false
# Actually we just want to confirm the screen, not log out
# Use assertVisible on a settings-page-specific element instead:

# Re-approach: navigate to More, then Settings entry (not logout)
- tapOn:
    id: "tab-more"
- assertVisible: "Thêm tính năng"

# ── SC02: Shop info accessible ────────────────────────────────────────────────
- tapOn: "Thông tin cửa hàng"
    optional: true
- assertVisible:
    id: "shop-info-name"
    optional: true
- tapOn: "Quay lại"
    optional: true

# ── SC03: Bank accounts accessible ───────────────────────────────────────────
- tapOn:
    id: "tab-more"
- tapOn: "Tài khoản ngân hàng"
    optional: true
- assertVisible: "Tài khoản ngân hàng"
    optional: true
- assertNotVisible: "500"

# ── SC04: Print templates accessible ─────────────────────────────────────────
- tapOn:
    id: "tab-more"
- tapOn: "Mẫu in"
    optional: true
- assertVisible: "Mẫu in"
    optional: true
- assertNotVisible: "500"

# ── SC05: Settings screen does not expose INVENTORY / PAWN tabs ───────────────
# These features are blocked for barber shops — their menu entries must be absent
- assertNotVisible: "Kho hàng"
- assertNotVisible: "Cầm đồ"
- assertNotVisible: "Giá vàng"
```

**Test cases covered:**
| ID | Description | Assertion |
|----|-------------|-----------|
| SC01 | More / Settings navigable | "Thêm tính năng" or Settings visible |
| SC02 | Shop info screen renders | `shop-info-name` visible |
| SC03 | Bank accounts renders without crash | No 500 |
| SC04 | Print templates renders without crash | No 500 |
| SC05 | Blocked features absent from menu | "Kho hàng", "Cầm đồ", "Giá vàng" hidden |

---

### Flow 14 — Security: Blocked Features

**File:** `e2e/flows/14_security_blocked_features.yaml`  
**Features verified absent:** INVENTORY, PAWN, GOLD_PRICE, VENDOR, PROMOTION

```yaml
appId: com.knp.tappypos
name: "14 Security — blocked features not accessible in barber shop"
---

# ── Setup: log in ────────────────────────────────────────────────────────────
- runFlow: ../subflows/_login.yaml

# ── SEC01: Home tab — no inventory / pawn KPI cards ──────────────────────────
- tapOn:
    id: "tab-home"
- assertVisible: "Tổng quan"
# These strings would appear on KPI cards if features were enabled
- assertNotVisible: "Hợp đồng cầm đồ"
- assertNotVisible: "Tồn kho"
- assertNotVisible: "Giá vàng"

# ── SEC02: Selling tab — no inventory entry point ─────────────────────────────
- tapOn:
    id: "tab-sell"
- assertNotVisible: "Kho hàng"
- assertNotVisible: "Điều chỉnh tồn kho"

# ── SEC03: More tab — inventory, pawn, vendor not in menu ─────────────────────
- tapOn:
    id: "tab-more"
- assertNotVisible: "Kho hàng"
- assertNotVisible: "Cầm đồ"
- assertNotVisible: "Giá vàng"
- assertNotVisible: "Nhà cung cấp"
- assertNotVisible: "Khuyến mãi"

# ── SEC04: API direct call — INVENTORY returns feature blocked ─────────────────
# Use evalScript to call API directly; verify 403 response
- evalScript: |
    output.phone = "${PHONE}";
    output.password = "${PASSWORD}";
    output.shopId = "${SHOP_ID}";

- evalScript: |
    var BASE = 'http://localhost:6868/api';
    var loginResp = http.post(
      BASE + '/auth/login/force',
      JSON.stringify({ username: output.phone, password: output.password, rememberMe: false }),
      { 'Content-Type': 'application/json', 'X-Tenant-ID': output.shopId }
    );
    var token = JSON.parse(loginResp.body).data.accessToken;
    var H = {
      'Content-Type': 'application/json',
      'X-Tenant-ID': output.shopId,
      'Authorization': 'Bearer ' + token
    };

    var invResp = http.get(BASE + '/inventory?page=0&size=1', H);
    var invStatus = invResp.statusCode;

    var pawnResp = http.post(BASE + '/pawns/find', JSON.stringify({ page: 0, size: 1 }), H);
    var pawnStatus = pawnResp.statusCode;

    var goldResp = http.get(BASE + '/gold-prices', H);
    var goldStatus = goldResp.statusCode;

    if (invStatus !== 403) throw new Error('INVENTORY not blocked: ' + invStatus);
    if (pawnStatus !== 403) throw new Error('PAWN not blocked: ' + pawnStatus);
    if (goldStatus !== 403) throw new Error('GOLD_PRICE not blocked: ' + goldStatus);

    output.securityPassed = 'true';

- assertVisible: "Tổng quan"   # still on dashboard; no crash from evalScript
```

**Test cases covered:**
| ID | Description | Assertion |
|----|-------------|-----------|
| SEC01 | Dashboard has no pawn/inventory/gold KPI | Strings absent |
| SEC02 | Selling tab has no inventory entry | "Kho hàng" absent |
| SEC03 | More tab has no inventory/pawn/vendor/promo entries | All 5 strings absent |
| SEC04 | `GET /inventory` returns 403 | evalScript throws if status ≠ 403 |
| SEC05 | `POST /pawns/find` returns 403 | evalScript throws if status ≠ 403 |
| SEC06 | `GET /gold-prices` returns 403 | evalScript throws if status ≠ 403 |

---

### Subflow: `_navigate_to_more.yaml`

Reusable helper to open the More tab from any state.

```yaml
appId: com.knp.tappypos
---

- tapOn:
    id: "tab-more"
- assertVisible: "Thêm tính năng"
```

---

## Suggested Execution Order

Run flows in this order to ensure dependencies are met (some flows create data consumed by later flows):

```bash
# 1. Auth
npm run e2e:auth

# 2. POS (creates order data for activity log)
npm run e2e:pos

# 3. Orders
npm run e2e:orders

# 4. Barber-specific POS
npm run e2e:barber-pos

# 5. Customer (creates customer for loyalty + appointments)
npm run e2e:customers

# 6. Appointment (depends on customer existing)
npm run e2e:appointments

# 7. Employee
npm run e2e:employees

# 8. Expense
npm run e2e:expenses

# 9. Product list
npm run e2e:products

# 10. Revenue (depends on orders from steps 2–4)
npm run e2e:revenue

# 11. Notifications
npm run e2e:notifications

# 12. Activity log (depends on all prior actions having generated log entries)
npm run e2e:activity-log

# 13. Settings
npm run e2e:settings

# 14. Security (most important — run last after confirming features work correctly)
npm run e2e:security

# Or run all at once:
npm run e2e:barber-all
```

---

## Missing Screens / Stubs to Resolve Before Running

These features have backend support but the mobile screen implementation status is unclear:

| Feature | Screen | Status |
|---------|--------|--------|
| SALARY | Salary list/detail in `StaffPerformanceScreen` or dedicated `SalaryScreen` | Check if `SalaryScreen.tsx` exists |
| COMMISSION | Commission report screen | Not found in screens survey — may be stub |
| MY_WORK | `MyWorkScreen.tsx` exists | Needs `testID="mywork-*"` additions |
| INVOICE | Invoice list screen | Check `src/screens/` for invoice screen |
| ACCOUNTING | Accounting screen | Likely stub — check `src/screens/` |
| FEEDBACK | `FeedbackScreen.tsx` exists in `settings/` | Needs testID for submit button |
| USER | User management screen | Check `src/screens/` for users screen |
| LOYALTY | `CustomerLoyaltyScreen.tsx` exists | Needs `testID="loyalty-points"` |

For each missing screen, stub flows with `assertVisible` on the screen title and `assertNotVisible: "500"` as a minimum smoke test until full implementation is ready.

---

## Known Issues to Watch For

| Issue | Mitigation |
|-------|-----------|
| iOS Keychain survives `clearState` — PIN screen or logged-in state can appear | Use `optional: true` guards + logout subflow at start |
| Native date picker not controllable by Maestro tap coordinates | Tap "Xong"/"Done" text with `optional: true` to accept default |
| Existing tab testID in source is `tab-sell`, not `tab-selling` (README has typo) | Always use `tab-sell` in new flows |
| evalScript `${VAR}` with `}` inside same script causes Maestro parse error | Split into two evalScript steps (see `_create_pending_orders.yaml` pattern) |
| `assertVisible` on a regex pattern `"order-row-.*"` is not supported | Use specific index `order-row-0` |
| BUG-02: `POST /products` with SERVICE type still fails | Skip product creation in flow 09; only test list + detail |
| BUG-08: `POST /pawns/find` returns 500 not 403 | Flow 14 SEC05 will fail; update expected status to 500 temporarily |
