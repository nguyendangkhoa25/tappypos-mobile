# Spa Shop Mobile E2E Test Plan

## Overview

Full end-to-end test suite for **SPA_SHOP** shop type using Maestro.

SPA_SHOP has **identical features to BARBER_SHOP_MEN** — same 22 features (`serviceBase`), same blocked features, same UI screens. The POS sell tab shows `BarberServiceScreen` with spa services instead of barber services.

Key difference from barber: the seeded spa services are distinct (Massage, Chăm sóc da mặt, Waxing, etc.) and the category tabs reflect spa categories. Flow 22 is SPA-SPECIFIC — verifying all 6 spa category tabs.

---

## Prerequisites

1. **Register a spa shop** via the app onboarding:
   - Launch app → enter a new Shop ID → Register → select "Spa / Thẩm mỹ viện" (🧖)
   - Note the generated SHOP_ID (format: `spa-XXXXX`)
   - Set phone and password during onboarding

2. **Update credentials** in `mobile/e2e/.env.spa`:
   ```env
   SHOP_ID=spa-XXXXX   # replace with actual spa shop ID
   PHONE=0000000000    # replace with actual phone
   PASSWORD=admin123
   ```

3. **Backend running** at `localhost:6868`

4. **Expo dev build** on simulator/device

5. **Maestro CLI** installed (`~/.maestro/bin/maestro`)

---

## How to Run

```bash
cd /Users/nguyendangkhoa/kim-ngan-phat/tappy-pos/mobile

# All 22 spa flows (note: maestro.spa.sh glob pattern)
npm run e2e:spa          # runs all spa_*.yaml files

# Individual flows
npm run e2e:spa-auth         # spa_01 — login
npm run e2e:spa-pos          # spa_02 — POS golden path
npm run e2e:spa-orders       # spa_03 — order complete/cancel
npm run e2e:spa-customers    # spa_04 — customer CRUD
npm run e2e:spa-appointments # spa_05 — appointment CRUD
npm run e2e:spa-staff        # spa_06 — staff management
npm run e2e:spa-expenses     # spa_07 — expense flow
npm run e2e:spa-products     # spa_08 — product list + search
npm run e2e:spa-revenue      # spa_09 — revenue report
npm run e2e:spa-notifications # spa_10 — notifications
npm run e2e:spa-activity-log # spa_11 — activity log
npm run e2e:spa-settings     # spa_12 — settings config
npm run e2e:spa-security     # spa_13 — blocked features
npm run e2e:spa-order-history # spa_14 — order history
npm run e2e:spa-checkin-pos  # spa_15 — appointment checkin → POS
npm run e2e:spa-loyalty      # spa_16 — customer loyalty
npm run e2e:spa-staff-perf   # spa_17 — staff performance + queue
npm run e2e:spa-feedback     # spa_18 — feedback submission
npm run e2e:spa-mywork       # spa_19 — my work screen
npm run e2e:spa-print-bank   # spa_20 — print templates + bank accounts
npm run e2e:spa-bank-transfer # spa_21 — bank transfer payment
npm run e2e:spa-categories   # spa_22 — spa service categories (SPA-SPECIFIC)
```

---

## Flow Inventory (22 flows)

| Script | File | Features Tested | SPA-Specific? |
|--------|------|-----------------|---------------|
| `e2e:spa-auth` | spa_01_auth | Auth + sell tab shows "Dịch vụ" | No |
| `e2e:spa-pos` | spa_02_pos_golden_path | **POS**: service card → AddItemSheet → CartBar → CheckoutSheet → order success | No |
| `e2e:spa-orders` | spa_03_order_complete_cancel | ORDER: seed via API → complete + cancel | No |
| `e2e:spa-customers` | spa_04_customer_crud | CUSTOMER: create, search, delete | No |
| `e2e:spa-appointments` | spa_05_appointment_crud | APPOINTMENT: create, cancel | No |
| `e2e:spa-staff` | spa_06_staff_management | USER: staff list + add form | No |
| `e2e:spa-expenses` | spa_07_expense_flow | EXPENSE: create spa supply expense | No |
| `e2e:spa-products` | spa_08_product_list | PRODUCT: search "massage", no INVENTORY tile | Partially |
| `e2e:spa-revenue` | spa_09_revenue_report | DASHBOARD/REVENUE: KPI + tab switch | No |
| `e2e:spa-notifications` | spa_10_notifications | NOTIFICATION: list + filter | No |
| `e2e:spa-activity-log` | spa_11_activity_log | ACTIVITY_LOG: list + filter | No |
| `e2e:spa-settings` | spa_12_settings_config | SHOP_INFO: shop info + POS config + bank accounts | No |
| `e2e:spa-security` | spa_13_security_blocked_features | No INVENTORY/GOLD_PRICE; APPOINTMENT visible; "Dịch vụ" in POS | No |
| `e2e:spa-order-history` | spa_14_order_history | ORDER + ORDER_VIEW_ALL: list, filter, detail | No |
| `e2e:spa-checkin-pos` | spa_15_appointment_checkin_pos | **Core spa workflow**: appointment → check-in → POS → complete order | No |
| `e2e:spa-loyalty` | spa_16_customer_loyalty | LOYALTY: points in customer detail | No |
| `e2e:spa-staff-perf` | spa_17_staff_performance_queue | ORDER_VIEW_ALL: staff performance + queue view | No |
| `e2e:spa-feedback` | spa_18_feedback_submission | FEEDBACK: category + content + submit | No |
| `e2e:spa-mywork` | spa_19_my_work_screen | MY_WORK: queue tab + available tab | No |
| `e2e:spa-print-bank` | spa_20_print_templates_bank_accounts | PRINT_TEMPLATE + BANK_ACCOUNT | No |
| `e2e:spa-bank-transfer` | spa_21_bank_transfer_payment_walkin | BANK_TRANSFER payment + walk-in customer | No |
| `e2e:spa-categories` | **spa_22_service_categories** | **SPA-UNIQUE**: all 6 spa category tabs in POS | **YES** |

---

## All 22 Features Covered

| Feature | Flow | Notes |
|---------|------|-------|
| DASHBOARD | spa_09 | Revenue KPIs |
| ORDER | spa_03, spa_14 | Complete, cancel, history |
| ORDER_VIEW_ALL | spa_14, spa_17 | All orders + staff performance |
| MY_WORK | spa_19 | Queue and available tabs |
| PRODUCT | spa_08 | Service list + search |
| POS | spa_02, spa_15, spa_21, spa_22 | Spa service checkout |
| CUSTOMER | spa_04 | CRUD |
| LOYALTY | spa_16 | Points balance |
| COMMISSION | spa_17 | Via staff performance screen |
| EMPLOYEE | spa_06 | Staff list |
| SALARY | spa_17 | Via staff performance |
| EXPENSE | spa_07 | Spa supply expense |
| REVENUE | spa_09 | Revenue report |
| USER | spa_06 | Staff management |
| APPOINTMENT | spa_05, spa_15 | CRUD + check-in workflow |
| NOTIFICATION | spa_10 | List + filter |
| FEEDBACK | spa_18 | Submit feedback |
| ACTIVITY_LOG | spa_11 | List + filter |
| SHOP_INFO | spa_12 | Settings screens |
| PRINT_TEMPLATE | spa_20 | Template list |
| BANK_ACCOUNT | spa_20, spa_21 | Bank accounts + transfer payment |
| INVOICE | (covered by spa_02 via order → invoice flow) | |
| ACCOUNTING | (stub — no controller yet) | |

**Blocked (negative tests):**
- INVENTORY → tile absent in More (spa_08, spa_13)
- PAWN → tile absent
- GOLD_PRICE → tile absent (spa_13)
- VENDOR → absent in More (spa_13)
- PROMOTION → absent

---

## Spa-Specific Seed Data

### Services (24 pre-built, SKU SPA-001 to SPA-024)

| Category | Services |
|----------|----------|
| Massage | Massage thư giãn toàn thân (60p/90p), Massage đầu & cổ, Massage bàn chân, Massage đá nóng, Massage aroma |
| Chăm sóc da mặt | Cơ bản, Chuyên sâu, Nặn mụn, Lột da hóa học, Đắp mặt nạ |
| Chăm sóc cơ thể | Tẩy tế bào chết, Ủ dưỡng thể trắng da, Quấn nóng giảm eo, Dưỡng ẩm tay chân |
| Waxing & Triệt lông | Wax nách, Wax chân (bắp đùi / toàn chân), Wax bikini, Wax mặt |
| Điều trị đặc biệt | Trị nám tàn nhang, Trị mụn lưng |
| Combo & Liệu trình | Combo Mặt + Massage 90p, Liệu trình 5 buổi chăm sóc da |

### Loyalty Tiers
Đồng (0₫) → Bạc (2tr) → Vàng (10tr) → Kim cương (50tr)

---

## Files

| Type | Path |
|------|------|
| Spa env | `mobile/e2e/.env.spa` |
| Spa runner | `mobile/e2e/maestro.spa.sh` |
| Spa flows | `mobile/e2e/flows/spa_01_*.yaml` – `spa_22_*.yaml` |
| Shared subflows | `mobile/e2e/subflows/_login.yaml`, `_navigate_to_more.yaml`, `_create_pending_orders.yaml` |
| This plan | `mobile/test-reports/spa-shop-mobile-e2e-plan.md` |

---

## Differences from Barber Shop Flows

| Aspect | Barber | Spa |
|--------|--------|-----|
| Shop ID prefix | `barm-` | `spa-` |
| Service names | Cắt tóc, Gội đầu, Cạo mặt... | Massage, Chăm sóc da mặt... |
| Categories | Barber-specific | 6 spa categories |
| Flow 02 (POS) | Uses `barber-service-.*` testID | Same testID (BarberServiceScreen shared) |
| Flow 08 (products) | Search "cắt" | Search "massage" |
| Flow 22 | Bank transfer (barber) | **Service categories** (spa-unique) |
| testIDs | All shared | All identical |
| Blocked features | Same (INVENTORY, PAWN, GOLD_PRICE, VENDOR) | Same |
