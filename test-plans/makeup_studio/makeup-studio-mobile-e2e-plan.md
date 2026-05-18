# Makeup Studio Mobile E2E Test Plan

## Overview

Full end-to-end test suite for **MAKEUP_STUDIO** shop type using Maestro.

MAKEUP_STUDIO has **identical `serviceBase` features to BARBER_SHOP_MEN and SPA_SHOP** — same 22 features, same blocked features, same UI screens. The POS sell tab shows `BarberServiceScreen` with makeup/bridal services.

Key difference from barber/spa: **bridal/wedding focus** — seeded services include high-value bridal packages (Trang điểm cô dâu ngày cưới 1.5tr, Gói cưới cao cấp 4.5tr), 5 service categories (no massage/waxing), and higher loyalty tier thresholds (Bạc at 5tr, Kim cương at 80tr).

---

## Credentials (mkup-92080)
- **SHOP_ID:** `mkup-92080` (MAKEUP_STUDIO)
- **PHONE:** `0922333444` (SHOP_OWNER role)
- **PASSWORD:** `admin123` (stored in `mobile/e2e/.env.makeup`)
- **Runner:** `mobile/e2e/maestro.makeup.sh` (reads `.env.makeup`)

---

## How to Run

```bash
cd /Users/nguyendangkhoa/kim-ngan-phat/tappy-pos/mobile

npm run e2e:makeup              # all 22 makeup flows

npm run e2e:mkup-auth           # mkup_01 — login
npm run e2e:mkup-pos            # mkup_02 — POS golden path
npm run e2e:mkup-orders         # mkup_03 — order complete/cancel
npm run e2e:mkup-customers      # mkup_04 — customer CRUD
npm run e2e:mkup-appointments   # mkup_05 — appointment CRUD
npm run e2e:mkup-staff          # mkup_06 — staff management
npm run e2e:mkup-expenses       # mkup_07 — expense (mỹ phẩm)
npm run e2e:mkup-products       # mkup_08 — product list + search
npm run e2e:mkup-revenue        # mkup_09 — revenue report
npm run e2e:mkup-notifications  # mkup_10 — notifications
npm run e2e:mkup-activity-log   # mkup_11 — activity log
npm run e2e:mkup-settings       # mkup_12 — settings config
npm run e2e:mkup-security       # mkup_13 — blocked features
npm run e2e:mkup-order-history  # mkup_14 — order history
npm run e2e:mkup-checkin-pos    # mkup_15 — appointment checkin → POS
npm run e2e:mkup-loyalty        # mkup_16 — customer loyalty
npm run e2e:mkup-staff-perf     # mkup_17 — staff performance + queue
npm run e2e:mkup-feedback       # mkup_18 — feedback submission
npm run e2e:mkup-mywork         # mkup_19 — my work screen
npm run e2e:mkup-print-bank     # mkup_20 — print templates + bank accounts
npm run e2e:mkup-bank-transfer  # mkup_21 — bank transfer payment
npm run e2e:mkup-categories     # mkup_22 — makeup categories (MKUP-SPECIFIC)
```

---

## Flow Inventory (22 flows)

| Script | File | Features Tested | MKUP-Specific? |
|--------|------|-----------------|----------------|
| `e2e:mkup-auth` | mkup_01_auth | Auth + sell tab shows "Dịch vụ" | No |
| `e2e:mkup-pos` | mkup_02_pos_golden_path | POS: service card → checkout → success | No |
| `e2e:mkup-orders` | mkup_03_order_complete_cancel | ORDER: seed via API → complete + cancel | No |
| `e2e:mkup-customers` | mkup_04_customer_crud | CUSTOMER CRUD | No |
| `e2e:mkup-appointments` | mkup_05_appointment_crud | APPOINTMENT: create, cancel | No |
| `e2e:mkup-staff` | mkup_06_staff_management | USER: staff list + add | No |
| `e2e:mkup-expenses` | mkup_07_expense_flow | EXPENSE: mỹ phẩm makeup expense | Partially |
| `e2e:mkup-products` | mkup_08_product_list | PRODUCT: search "trang điểm", no INVENTORY | Partially |
| `e2e:mkup-revenue` | mkup_09_revenue_report | DASHBOARD/REVENUE: KPIs | No |
| `e2e:mkup-notifications` | mkup_10_notifications | NOTIFICATION | No |
| `e2e:mkup-activity-log` | mkup_11_activity_log | ACTIVITY_LOG | No |
| `e2e:mkup-settings` | mkup_12_settings_config | SHOP_INFO: shop info + bank | No |
| `e2e:mkup-security` | mkup_13_security_blocked_features | No INVENTORY/GOLD_PRICE; APPOINTMENT present | No |
| `e2e:mkup-order-history` | mkup_14_order_history | ORDER + ORDER_VIEW_ALL | No |
| `e2e:mkup-checkin-pos` | mkup_15_appointment_checkin_pos | **Core workflow**: appt → check-in → POS → complete | No |
| `e2e:mkup-loyalty` | mkup_16_customer_loyalty | LOYALTY: points balance | No |
| `e2e:mkup-staff-perf` | mkup_17_staff_performance_queue | ORDER_VIEW_ALL: staff perf + queue | No |
| `e2e:mkup-feedback` | mkup_18_feedback_submission | FEEDBACK: submit | No |
| `e2e:mkup-mywork` | mkup_19_my_work_screen | MY_WORK: queue + available tabs | No |
| `e2e:mkup-print-bank` | mkup_20_print_templates_bank_accounts | PRINT_TEMPLATE + BANK_ACCOUNT | No |
| `e2e:mkup-bank-transfer` | mkup_21_bank_transfer_payment_walkin | BANK_TRANSFER + walk-in customer | No |
| `e2e:mkup-categories` | **mkup_22_service_categories** | **MKUP-UNIQUE**: 5 makeup category tabs verified | **YES** |

---

## All 22 Features Covered

DASHBOARD, ORDER, ORDER_VIEW_ALL, MY_WORK, PRODUCT, POS, CUSTOMER, LOYALTY, COMMISSION, EMPLOYEE, SALARY, EXPENSE, REVENUE, USER, APPOINTMENT, NOTIFICATION, FEEDBACK, ACTIVITY_LOG, SHOP_INFO, PRINT_TEMPLATE, BANK_ACCOUNT, INVOICE, ACCOUNTING

**Blocked (negative):** INVENTORY, PAWN, GOLD_PRICE, VENDOR, PROMOTION

---

## Makeup Studio Seed Data (makeup_studio.sql)

### 5 Service Categories + 20 Services (MK-001 to MK-020)

| Category | Services |
|----------|----------|
| Trang điểm ngày thường | Nhẹ nhàng hàng ngày, K-makeup, Retouching |
| Trang điểm đi tiệc | Ban ngày, Tối/event, Chụp ảnh, Tốt nghiệp, Halloween/cosplay |
| Trang điểm cô dâu | Trial, Ngày cưới, Cao cấp (airbrush), Phụ dâu, Mẹ cô dâu |
| Làm tóc & Phụ kiện | Búi tóc, Tóc tiệc, Tóc cô dâu, Vương miện/phụ kiện |
| Combo & Gói cưới | Combo makeup+tóc, Gói cưới cơ bản (2.5tr), Gói cưới cao cấp (4.5tr) |

### Loyalty Tiers (higher thresholds = bridal studio clientele)
- Đồng (0₫) → Bạc (5tr) → Vàng (20tr) → Kim cương (80tr)

---

## Differences from Barber / Spa Flows

| Aspect | Barber/Spa | Makeup Studio |
|--------|-----------|---------------|
| Shop ID prefix | `barm-` / `spa-` | `mkup-` |
| Service names | Cắt tóc / Massage | Trang điểm, Cô dâu, Búi tóc |
| Category count | 5–6 | **5** |
| Category names | Spa/barber-specific | Trang điểm ngày thường, đi tiệc, cô dâu, Làm tóc, Combo |
| Flow 08 search | "cắt" / "massage" | **"trang điểm"** |
| Flow 07 expense | "Dầu massage" / general | **"Mỹ phẩm makeup"** |
| Flow 22 | Barber/Spa categories | **5 makeup categories** + bridal package check |
| Loyalty Bạc threshold | 2tr (spa) | **5tr** |
| Loyalty Kim cương threshold | 50tr (spa) | **80tr** |
| testIDs | All shared | All identical |

---

## Files

| Type | Path |
|------|------|
| Makeup env | `mobile/e2e/.env.makeup` |
| Makeup runner | `mobile/e2e/maestro.makeup.sh` |
| Makeup flows | `mobile/e2e/flows/mkup_01_*.yaml` – `mkup_22_*.yaml` |
| Shared subflows | `_login.yaml`, `_navigate_to_more.yaml`, `_create_pending_orders.yaml` |
| This plan | `mobile/test-reports/makeup-studio-mobile-e2e-plan.md` |
