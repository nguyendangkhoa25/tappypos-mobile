# E2E Test Plan — Barber Shop · SHOP_OWNER Role

> **Shop type:** `BARBER_SHOP` (backendCode)  
> **Role under test:** SHOP_OWNER (all 23 features)  
> **Test account:** shop ID `barb-46304` · password `Shop@46304`  
> **Legend:** ✅ pass · ❌ fail · ⚠️ partial · — not run yet  
> **Run order:** sections must be executed top-to-bottom (each section may depend on data created earlier)

---

## Section 0 — Auth (register · login · logout · password · profile)

> Run this section **first** on a clean app state. Covers the complete identity lifecycle for a barber shop owner.

### 0.1 Register new account
| # | Step | Expected | Status |
|---|------|----------|--------|
| AU-01 | Cold-launch app → ShopIdScreen shown | "Mã cửa hàng" input + "Đăng ký cửa hàng mới" link visible | — |
| AU-02 | Tap "Đăng ký cửa hàng mới" | RegisterScreen shown | — |
| AU-03 | Submit with blank phone | Inline error: phone required | — |
| AU-04 | Submit with password < 8 chars | Inline error: password too short | — |
| AU-05 | Submit with mismatched confirm password | Inline error: passwords do not match; real-time mismatch indicator shown | — |
| AU-06 | Enter phone `0977000001` + password `Test@1234` + matching confirm | Password-match indicator turns green | — |
| AU-07 | Tap register button | Account created; onboarding Step 1 shown | — |
| AU-08 | Attempt register with already-taken phone | Inline error: số điện thoại đã được sử dụng | — |
| AU-09 | "Đã có tài khoản? Đăng nhập" link | Navigates back to LoginScreen | — |

### 0.2 Login — shop ID entry
| # | Step | Expected | Status |
|---|------|----------|--------|
| AU-10 | Cold-launch (clearState) → ShopIdScreen shown | `shop-id-input` visible | — |
| AU-11 | Submit blank shop ID | Submit button disabled or inline error | — |
| AU-12 | Enter unknown shop ID "nonexistent-xyz-99" → submit | `shop-id-error-not-found` shown: shop not found | — |
| AU-13 | Enter suspended shop ID (if test data available) | `shop-id-error-suspended` shown: amber warning | — |
| AU-14 | Network unreachable → submit | `shop-id-error-network` shown: network error | — |
| AU-15 | Enter valid shop ID `barb-46304` → submit (`shop-id-submit`) | LoginScreen shown; shop name "Tiệm Tóc & Salon Demo" displayed read-only | — |

### 0.3 Login — credentials
| # | Step | Expected | Status |
|---|------|----------|--------|
| AU-16 | LoginScreen: phone (`login-phone`) + wrong password → submit | `login-error` shown; stays on LoginScreen | — |
| AU-17 | Correct phone + wrong password → submit via Enter key | Error shown; no navigation | — |
| AU-18 | Enter correct phone `barb-46304` + password `Shop@46304` → submit (`login-submit`) | If PIN not set → PinSetupScreen; if PIN set → PinLoginScreen | — |
| AU-19 | "Đổi cửa hàng" link on LoginScreen | Returns to ShopIdScreen | — |

### 0.4 PIN setup (first login on device)
| # | Step | Expected | Status |
|---|------|----------|--------|
| AU-20 | PinSetupScreen shown after first successful password login | 6-dot PIN entry pad visible | — |
| AU-21 | Enter 6-digit PIN `123456` | Step 2: confirm PIN shown | — |
| AU-22 | Confirm with different PIN | Error: PINs do not match; re-enter | — |
| AU-23 | Confirm with same PIN `123456` | PIN saved; Dashboard shown | — |
| AU-24 | "Bỏ qua, thiết lập sau" (skip) | Dashboard shown without PIN; next launch goes straight to LoginScreen | — |

### 0.5 PIN login (subsequent sessions)
| # | Step | Expected | Status |
|---|------|----------|--------|
| AU-25 | Relaunch app (PIN already set) | PinLoginScreen shown; phone number pre-filled (read-only) | — |
| AU-26 | Enter wrong PIN | Error shake animation; attempt counter | — |
| AU-27 | Enter correct PIN `123456` | Dashboard shown | — |
| AU-28 | Biometric prompt (if Face ID / fingerprint enrolled + enabled) | System biometric dialog shown on launch | — |
| AU-29 | Successful biometric authentication | Dashboard shown without PIN entry | — |
| AU-30 | "Quên mã PIN?" link → ForgotPinScreen | Password re-entry screen shown | — |
| AU-31 | "Đổi cửa hàng" link | Returns to ShopIdScreen; clears stored session | — |

### 0.6 Forgot PIN (reset via password)
| # | Step | Expected | Status |
|---|------|----------|--------|
| AU-32 | ForgotPinScreen: enter current password `Shop@46304` | Password accepted | — |
| AU-33 | Enter new PIN `654321` + confirm `654321` | PIN updated | — |
| AU-34 | Confirm with mismatched PIN | Inline error | — |
| AU-35 | After reset → PinLoginScreen | New PIN `654321` works; old PIN `123456` rejected | — |

### 0.7 Forgot password
| # | Step | Expected | Status |
|---|------|----------|--------|
| AU-36 | "Quên mật khẩu?" link on LoginScreen | ForgotPasswordScreen shown | — |
| AU-37 | Enter registered phone + submit | "Liên hệ hỗ trợ" / support contact info shown (OTP/SMS not in MVP) | — |
| AU-38 | Enter unregistered phone + submit | Error: phone not found | — |
| AU-39 | Network error during submission | Network error message shown | — |

### 0.8 Change password (authenticated)
| # | Step | Expected | Status |
|---|------|----------|--------|
| AU-40 | Navigate Settings → Bảo mật → Đổi mật khẩu | ChangePasswordScreen shown | — |
| AU-41 | Enter current password (current placeholder) + new password `NewPass@99` + confirm | Form valid | — |
| AU-42 | Submit | Success alert: password updated | — |
| AU-43 | Enter wrong current password | Error: incorrect current password | — |
| AU-44 | New password < 8 chars | Inline validation error | — |
| AU-45 | New password ≠ confirm | Inline validation error | — |
| AU-46 | After change → logout → login with new password `NewPass@99` | Login succeeds | — |

### 0.9 View profile
| # | Step | Expected | Status |
|---|------|----------|--------|
| AU-47 | Navigate Settings → Tài khoản / Hồ sơ | ProfileScreen loads | — |
| AU-48 | Name, phone number, shop name, role (SHOP_OWNER) shown | Correct values from JWT / API | — |
| AU-49 | Language toggle VI → EN | All visible strings switch to English | — |
| AU-50 | Language toggle EN → VI | Reverts to Vietnamese | — |
| AU-51 | Subscription details visible (plan, expiry) | Shows TRIAL or current plan | — |

### 0.10 Update profile
| # | Step | Expected | Status |
|---|------|----------|--------|
| AU-52 | Navigate Settings → Cài đặt hồ sơ | ProfileUpdateScreen: nickname, full name, phone fields | — |
| AU-53 | Change nickname (nickname placeholder) "TocDep" → save | Success toast; nickname updated | — |
| AU-54 | Change full name (full name placeholder) "Nguyễn Văn Barber" → save | Success toast; name updated | — |
| AU-55 | Save with blank nickname | Validation error: required | — |
| AU-56 | Profile changes reflected across app | Updated name shown in profile header | — |

### 0.11 Logout
| # | Step | Expected | Status |
|---|------|----------|--------|
| AU-57 | Navigate Settings → tap logout button (`settings-logout-btn`) | Confirmation dialog: "Đăng xuất?" | — |
| AU-58 | Confirm logout | SecureStore cleared; ShopIdScreen shown | — |
| AU-59 | Cancel logout | Stays on current screen; session active | — |
| AU-60 | After logout → re-launch app | ShopIdScreen shown (no auto-login) | — |
| AU-61 | Re-enter shop ID `barb-46304` → login with credentials | Works normally; PIN setup offered again if cleared | — |

---

## Pre-flight checklist

| # | Check | Expected | Status |
|---|-------|----------|--------|
| PRE-01 | Backend is reachable | `GET /api/actuator/health` → `UP` | — |
| PRE-02 | Barber shop tenant `barb-46304` exists and is ACTIVE | Confirmed in master dashboard | — |
| PRE-03 | At least 1 service/product exists in the shop | Seeded or created manually | — |
| PRE-04 | At least 2 staff (technician01, receptionist01) exist | Seeded via API | — |
| PRE-05 | App installed and cold-started | ShopIdScreen shows on launch | — |

---

## Section 1 — Onboarding (new BARBER_SHOP registration)

> Tests the self-service onboarding flow for a brand-new barber shop owner who has never used TappyPOS. Run this section in isolation with a fresh app state and a clean (non-existing) shop ID.

### 1.1 Account registration
| # | Step | Expected | Status |
|---|------|----------|--------|
| OB-01 | Cold-launch app → ShopIdScreen shown | "TappyPOS" + "Mã cửa hàng" input visible | — |
| OB-02 | Tap "Đăng ký cửa hàng mới" | RegisterScreen shown | — |
| OB-03 | Enter phone number | Phone field accepts `09xx xxx xxx` format | — |
| OB-04 | Enter password + confirm (matching) | No validation error | — |
| OB-05 | Submit with mismatched passwords | Inline error: passwords do not match | — |
| OB-06 | Submit with valid phone + password | Account created; proceed to onboarding step 1 | — |

### 1.2 Step 1 — Shop info
| # | Step | Expected | Status |
|---|------|----------|--------|
| OB-07 | Onboarding Step 1 screen shown | Fields: nickname (username), full name, shop name, address | — |
| OB-08 | Submit without required fields (nickname, shop name blank) | Inline validation errors shown | — |
| OB-09 | Fill nickname `barbowner`, shop name `Barber Test`, address optional → continue | Step 2 shown | — |

### 1.3 Step 2 — Shop type selection
| # | Step | Expected | Status |
|---|------|----------|--------|
| OB-10 | Shop type screen shown | Group list with BEAUTY group visible | — |
| OB-11 | Tap BEAUTY group filter | Type list filters to beauty types | — |
| OB-12 | Select "Tiệm tóc nam" (BARBER_SHOP_MEN) or "Tiệm tóc & salon" (BARBER_SHOP) | Type highlighted; continue enabled | — |
| OB-13 | Tap "Tiếp tục" | Step 3 / service setup shown | — |

### 1.4 Step 3 — Services / products setup
| # | Step | Expected | Status |
|---|------|----------|--------|
| OB-14 | Service setup screen shown | Suggested services for BARBER_SHOP pre-populated (e.g. Cắt tóc nam, Gội đầu) | — |
| OB-15 | Edit price of first service | Price field accepts numeric input | — |
| OB-16 | Toggle off an unwanted service | Service removed from list | — |
| OB-17 | Add a custom service name + price | Custom service appears in list | — |
| OB-18 | Tap "Tiếp tục" with at least 1 service | Step 4 / staff setup shown | — |

### 1.5 Step 4 — Staff / chair setup
| # | Step | Expected | Status |
|---|------|----------|--------|
| OB-19 | Staff/chair setup screen shown | Option to add staff members; chair count input if applicable | — |
| OB-20 | Add a staff member (name + role TECHNICIAN) | Staff row appears | — |
| OB-21 | Tap "Hoàn tất" / complete onboarding | Dashboard shown; shop `barb-xxxxx` is now active | — |

### 1.6 Post-onboarding navigation check
| # | Step | Expected | Status |
|---|------|----------|--------|
| OB-22 | Bottom tab bar | 5 tabs visible: Trang chủ · Bán hàng · Chi phí · Báo cáo · Cài đặt | — |
| OB-23 | "Bán hàng" tab → BarberServiceScreen | Service grid shown (not POS grid, not table grid) | — |
| OB-24 | No PAWN / gold features visible | "Cầm đồ" and "Giá vàng" absent from all menus | — |
| OB-25 | No TABLE_SERVICE | No table-grid screen on Sell tab | — |

---

## Section 2 — Order Management (POS · ORDER · ORDER_VIEW_ALL)

> All scenarios use BarberServiceScreen as the POS entry point.

### 2.1 Golden path — walk-in customer, single service, cash
| # | Step | Expected | Status |
|---|------|----------|--------|
| OR-01 | Tap "Bán hàng" tab | BarberServiceScreen loads; service grid visible | — |
| OR-02 | Service grid shows barber services | Cards for Cắt tóc, Gội đầu, etc. visible | — |
| OR-03 | Tap a service card | AddItemSheet slides up with service name + price | — |
| OR-04 | Tap "Thêm vào đơn" | Service added to cart; cart bar appears with count 1 | — |
| OR-05 | Cart badge shows `1` | `barber-cart-count` testID visible with text "1" | — |
| OR-06 | Tap checkout button (`barber-checkout-btn`) | CheckoutSheet opens | — |
| OR-07 | "Phương thức thanh toán" section visible | CASH pre-selected by default | — |
| OR-08 | No customer assigned (walk-in) | Customer field shows empty or "Khách lẻ" | — |
| OR-09 | Tap "Hoàn tất đơn hàng" (`barber-place-order-btn`) | OrderSuccessScreen shown | — |
| OR-10 | "Đặt hàng thành công!" visible; order number shown | `order-success-number` testID visible | — |
| OR-11 | Tap "Đơn mới" | Cart cleared; back to BarberServiceScreen | — |

### 2.2 Assign technician to service
| # | Step | Expected | Status |
|---|------|----------|--------|
| OR-12 | Tap a service card | AddItemSheet shown | — |
| OR-13 | Staff picker visible in AddItemSheet | Barber/technician chips listed | — |
| OR-14 | Tap "technician01" chip | Staff assigned to this service item | — |
| OR-15 | Tap "Thêm vào đơn" | Cart item shows assigned staff name | — |
| OR-16 | Complete order | Order saved with `assignedEmployeeId` for that item | — |

### 2.3 Assign receptionist to service
| # | Step | Expected | Status |
|---|------|----------|--------|
| OR-17 | In AddItemSheet → staff picker | "receptionist01" visible in picker | — |
| OR-18 | Select "receptionist01" → add to cart | Cart item shows receptionist name | — |
| OR-19 | Complete checkout | Order saved with receptionist assignment | — |

### 2.4 Multiple products / services in one order
| # | Step | Expected | Status |
|---|------|----------|--------|
| OR-20 | Add "Cắt tóc nam" → then "Gội đầu" → then "Tỉa râu" | Cart count = 3 | — |
| OR-21 | Open CheckoutSheet | All 3 line items listed with individual prices | — |
| OR-22 | Total = sum of all items | Calculated total matches manual sum | — |
| OR-23 | Complete order | Order contains 3 items; order success shown | — |

### 2.5 Quick phrase note on service
| # | Step | Expected | Status |
|---|------|----------|--------|
| OR-24 | Open AddItemSheet for a service | Quick phrase bar shows: Cắt ngắn · Cắt dài · Tỉa râu · Hàn Quốc | — |
| OR-25 | Tap "Hàn Quốc" | Note field pre-filled with "Hàn Quốc" | — |
| OR-26 | Add item → view cart | Note "Hàn Quốc" visible on cart item | — |

### 2.6 Tip
| # | Step | Expected | Status |
|---|------|----------|--------|
| OR-27 | Open CheckoutSheet | Tip section visible: 10K · 20K · 50K · 100K chips | — |
| OR-28 | Tap "20.000" tip chip | Tip added; total increases by 20,000 ₫ | — |
| OR-29 | Total breakdown shows tip line | "+20.000 ₫" appears in summary | — |
| OR-30 | Complete order | Order amount includes tip | — |

### 2.7 Customer types
| # | Step | Expected | Status |
|---|------|----------|--------|
| OR-31 | Walk-in: no customer selected → complete order | Order saved as anonymous/walk-in; no customer linked | — |
| OR-32 | New customer: in CheckoutSheet tap customer picker → add new phone `0901111222` → name "Khách Mới" | New customer created inline; linked to order | — |
| OR-33 | Loyalty customer: search existing customer with points → select | Loyalty points visible in checkout; option to redeem shown | — |
| OR-34 | Redeem 50 points on loyalty customer | Points deducted from total; final amount reduced | — |

### 2.8 Payment methods
| # | Step | Expected | Status |
|---|------|----------|--------|
| OR-35 | Select CASH payment → complete | Order placed; success screen | — |
| OR-36 | Select BANK_TRANSFER → VietQR shown | QR code for configured bank account rendered | — |
| OR-37 | Complete bank transfer order | Order placed with payment method BANK_TRANSFER | — |

### 2.9 View and manage orders
| # | Step | Expected | Status |
|---|------|----------|--------|
| OR-38 | Navigate More → Đơn hàng | OrderListScreen loads; recent orders visible | — |
| OR-39 | Status filter chips: Tất cả · Hoàn thành · Đang xử lý · Đã hủy | Tap each filter → list updates | — |
| OR-40 | Search / filter by date | Orders narrow to selected period | — |
| OR-41 | Tap an order row (`order-row-0`) | OrderDetailScreen opens | — |
| OR-42 | ORDER_VIEW_ALL: all orders from all staff visible | SHOP_OWNER sees every order, not just their own | — |

### 2.10 Complete and cancel orders
| # | Step | Expected | Status |
|---|------|----------|--------|
| OR-43 | Open a PENDING order → tap "Hoàn tất" (`order-complete-btn`) | Status → COMPLETED; button disappears | — |
| OR-44 | Open a PENDING order → tap "Hủy đơn" (`order-cancel-btn`) | Confirmation dialog → confirm → status → CANCELLED | — |
| OR-45 | Attempt to cancel already-COMPLETED order | Cancel button absent or disabled | — |

---

## Section 3 — Customer Management (CUSTOMER · LOYALTY)

### 3.1 Customer list
| # | Step | Expected | Status |
|---|------|----------|--------|
| CU-01 | Navigate More → Khách hàng | CustomerListScreen loads; list with customer rows | — |
| CU-02 | Pull-to-refresh | List refetches | — |
| CU-03 | Empty state (no customers) | EmptyState component shown with friendly message | — |

### 3.2 Search
| # | Step | Expected | Status |
|---|------|----------|--------|
| CU-04 | Tap search input (`customer-search-input`) → type "Nguyễn" | List filters to matching names | — |
| CU-05 | Search by phone number "0901111222" | Matching customer row shown | — |
| CU-06 | Clear search | Full list restored | — |

### 3.3 Create customer
| # | Step | Expected | Status |
|---|------|----------|--------|
| CU-07 | Tap FAB (`customer-add-fab`) | CustomerFormScreen in create mode | — |
| CU-08 | Fill name (`customer-name`) "Trần Thị B" + phone (`customer-phone`) "0912345678" | Form valid | — |
| CU-09 | Submit (`customer-form-submit`) | Customer created; appears in list | — |
| CU-10 | Submit with blank name | Inline validation error | — |
| CU-11 | Submit with duplicate phone | Error: phone already exists | — |

### 3.4 View and edit customer
| # | Step | Expected | Status |
|---|------|----------|--------|
| CU-12 | Tap customer row (`customer-row-0`) | CustomerDetailScreen: stats header + order history | — |
| CU-13 | Order history shows orders linked to this customer | At least orders from Section 2 visible | — |
| CU-14 | Tap edit action | CustomerFormScreen pre-filled with existing data | — |
| CU-15 | Change name → save | Updated name shown in detail and list | — |

### 3.5 Delete customer
| # | Step | Expected | Status |
|---|------|----------|--------|
| CU-16 | From detail → delete action | Confirmation dialog | — |
| CU-17 | Confirm delete | Customer removed; back to list | — |
| CU-18 | Cancel delete | Customer not removed | — |

### 3.6 Loyalty points
| # | Step | Expected | Status |
|---|------|----------|--------|
| CU-19 | Open customer with existing loyalty points | CustomerLoyaltyScreen: `loyalty-balance` testID shows non-zero balance | — |
| CU-20 | Loyalty point history listed | Entries from past orders visible with earn/redeem amounts | — |
| CU-21 | Manual loyalty adjustment (if available on mobile) | Points adjusted; balance updates | — |

---

## Section 4 — Product Management (PRODUCT)

### 4.1 Product list
| # | Step | Expected | Status |
|---|------|----------|--------|
| PR-01 | Navigate More → Sản phẩm | ProductListScreen: 2-col grid with service/product cards | — |
| PR-02 | Category chips shown | Scrollable horizontal chip bar | — |
| PR-03 | Tap a category chip | Grid filters to that category | — |
| PR-04 | Pull-to-refresh | Grid refetches | — |

### 4.2 Search
| # | Step | Expected | Status |
|---|------|----------|--------|
| PR-05 | Tap search (`product-search-input`) → type "cắt" | Results filter in ≤ 300 ms (debounced) | — |
| PR-06 | Search non-existent name | EmptyState shown | — |
| PR-07 | Clear search → tap "Dịch vụ tóc" category | Category filter applies correctly | — |

### 4.3 Create product / service
| # | Step | Expected | Status |
|---|------|----------|--------|
| PR-08 | Tap FAB (`product-add-fab`) | ProductCreateScreen opens | — |
| PR-09 | Fill name "Nhuộm highlight", price 250000, unit "lần", category "Dịch vụ tóc" | Form valid | — |
| PR-10 | Submit | Product created; appears in grid | — |
| PR-11 | Submit with blank name | Inline validation error | — |
| PR-12 | Submit with negative price | Inline validation error | — |

### 4.4 View product detail
| # | Step | Expected | Status |
|---|------|----------|--------|
| PR-13 | Tap product card (`product-card-<id>`) | ProductDetailScreen: name, price (250.000 ₫), unit, category | — |
| PR-14 | Amount formatted as `250.000 ₫` | Dot-separated Vietnamese format | — |

### 4.5 Edit product
| # | Step | Expected | Status |
|---|------|----------|--------|
| PR-15 | From detail → edit action | ProductEditScreen pre-filled | — |
| PR-16 | Change price to 280000 → save | Updated price shown in detail | — |
| PR-17 | Changed price reflects in BarberServiceScreen | Service card shows new price | — |

### 4.6 Delete product
| # | Step | Expected | Status |
|---|------|----------|--------|
| PR-18 | Delete a product → confirm | Product removed from list and POS grid | — |
| PR-19 | Cancel delete | Product remains | — |

### 4.7 Categories
| # | Step | Expected | Status |
|---|------|----------|--------|
| PR-20 | Navigate More → Danh mục | CategoryListScreen loads | — |
| PR-21 | Create new category "Dưỡng tóc" | Category appears; can be selected on ProductCreateScreen | — |
| PR-22 | Filter product list by new category | Shows only products in that category | — |

---

## Section 5 — Expense Management (EXPENSE)

### 5.1 Expense list
| # | Step | Expected | Status |
|---|------|----------|--------|
| EX-01 | Tap "Chi phí" tab | ExpensesScreen loads; fixed and variable expenses listed | — |
| EX-02 | Period selector (Hôm nay / Tháng này / Năm nay) | Expense total updates per period | — |
| EX-03 | Fixed vs variable expense sections visible | Two sections or filter tabs shown | — |

### 5.2 Create expense
| # | Step | Expected | Status |
|---|------|----------|--------|
| EX-04 | Tap FAB (`expense-add-fab`) | Expense creation sheet/form shown | — |
| EX-05 | Fill description (`expense-desc-input`) "Thuê mặt bằng" | Input accepts text | — |
| EX-06 | Fill amount (`expense-amount-input`) "5000000" | Input accepts numeric | — |
| EX-07 | Select type FIXED | Fixed expense type selected | — |
| EX-08 | Tap save (`expense-save-btn`) | Expense created; appears in list | — |
| EX-09 | Create a VARIABLE expense "Mua kéo" 200000 | Appears under variable section | — |
| EX-10 | Submit with blank description | Inline error shown | — |
| EX-11 | Submit with zero amount | Inline error shown | — |

### 5.3 Search and filter expenses
| # | Step | Expected | Status |
|---|------|----------|--------|
| EX-12 | Filter by type FIXED | Only fixed expenses shown | — |
| EX-13 | Filter by type VARIABLE | Only variable expenses shown | — |
| EX-14 | Filter by date range (this month) | Expenses within range shown | — |

### 5.4 Edit and delete expense
| # | Step | Expected | Status |
|---|------|----------|--------|
| EX-15 | Tap an expense item → edit | Form pre-filled | — |
| EX-16 | Change amount → save | Updated amount shown | — |
| EX-17 | Delete expense → confirm | Expense removed from list | — |
| EX-18 | Cancel delete | Expense remains | — |

---

## Section 6 — Employee Management (EMPLOYEE)

### 6.1 Staff list
| # | Step | Expected | Status |
|---|------|----------|--------|
| ST-01 | Navigate More → Nhân viên | StaffListScreen: staff cards with name, role, status | — |
| ST-02 | `staff-row-0` visible (owner + pre-seeded staff) | At least 3 rows: owner, technician01, receptionist01 | — |
| ST-03 | Pull-to-refresh | List refetches | — |

### 6.2 Search staff
| # | Step | Expected | Status |
|---|------|----------|--------|
| ST-04 | Search staff by name "technician" | Matching rows shown | — |
| ST-05 | Search by role (if filter available) | Filter by TECHNICIAN shows only technicians | — |
| ST-06 | Clear search | Full list restored | — |

### 6.3 Create staff
| # | Step | Expected | Status |
|---|------|----------|--------|
| ST-07 | Tap FAB (`staff-add-fab`) | StaffFormScreen create mode: "Thêm nhân viên" | — |
| ST-08 | Fill fullName (`staff-fullname`) "Nguyễn Văn A" | Input accepts text | — |
| ST-09 | Fill username (`staff-username`) "barber_nva" | Input accepts text | — |
| ST-10 | Assign role TECHNICIAN | Role picker selects TECHNICIAN | — |
| ST-11 | Tap save (`staff-save-btn`) | Staff created; "Nguyễn Văn A" appears in list | — |
| ST-12 | Create RECEPTIONIST "Lê Thị C" username "rec_ltc" | Receptionist row appears | — |
| ST-13 | Submit with blank fullName | Inline validation error | — |

### 6.4 Edit staff
| # | Step | Expected | Status |
|---|------|----------|--------|
| ST-14 | Tap staff row → edit | StaffFormScreen pre-filled | — |
| ST-15 | Change role from TECHNICIAN to CASHIER → save | Role updated | — |

### 6.5 Delete staff
| # | Step | Expected | Status |
|---|------|----------|--------|
| ST-16 | Tap staff → delete (`staff-delete-btn`) → confirm | Staff removed from list | — |
| ST-17 | Staff removed from POS staff-picker | Deleted staff no longer appears in AddItemSheet staff picker | — |

---

## Section 7 — Report Management (REVENUE · EXPENSE · COMMISSION)

### 7.1 Revenue / sales report
| # | Step | Expected | Status |
|---|------|----------|--------|
| RP-01 | Tap "Báo cáo" tab | ReportScreen loads | — |
| RP-02 | Revenue section: total sales, order count shown | KPI cards render with non-zero values (seeded data) | — |
| RP-03 | Period picker: Hôm nay | Revenue reflects today's orders | — |
| RP-04 | Period picker: Tuần này | Revenue reflects this week | — |
| RP-05 | Period picker: Tháng này | Revenue reflects this month | — |
| RP-06 | Period picker: Năm nay | Revenue reflects full year (2025–2026 seeded data) | — |
| RP-07 | Revenue per product/service breakdown (if shown) | Top services listed with amounts | — |

### 7.2 Expense report
| # | Step | Expected | Status |
|---|------|----------|--------|
| RP-08 | Expense summary in report (or Chi phí tab) | Total fixed + variable expenses shown per period | — |
| RP-09 | Period matches selected period | Expenses filtered to same period as revenue | — |

### 7.3 Employee performance report (COMMISSION)
| # | Step | Expected | Status |
|---|------|----------|--------|
| RP-10 | Navigate More → Hiệu suất nhân viên | StaffPerformanceScreen loads | — |
| RP-11 | Cards per technician: `staff-perf-card-<name>` visible | technician01 and receptionist01 cards shown | — |
| RP-12 | Each card shows: revenue, order count, commission | Non-zero values for staff with assigned orders | — |
| RP-13 | Period selector works | Values update for selected period | — |
| RP-14 | Period: Năm 2025 | Shows full-year commission from seeded 2000 orders | — |

---

## Section 8 — Notification Management (NOTIFICATION)

| # | Step | Expected | Status |
|---|------|----------|--------|
| NO-01 | Navigate More → Thông báo | NotificationScreen loads | — |
| NO-02 | Notification rows listed (`notification-row-0`, etc.) | In-app notifications visible | — |
| NO-03 | Unread notifications visually distinct | Bold text or unread indicator | — |
| NO-04 | Tap a notification row | Navigates to relevant screen (order / appointment) | — |
| NO-05 | Notification marked as read after tap | Visual unread indicator removed | — |
| NO-06 | Empty state | EmptyState shown when no notifications | — |
| NO-07 | Pull-to-refresh | New notifications loaded | — |

> **Note:** Mark-as-unread and delete single notification actions are web admin features; mobile supports read-on-tap only.

---

## Section 9 — Feedback Management (FEEDBACK)

> Mobile scope: **submit** feedback. Viewing and replying to feedback is a MASTER_TENANT web-admin function — not available on mobile.

| # | Step | Expected | Status |
|---|------|----------|--------|
| FB-01 | Navigate Settings → Phản hồi | FeedbackScreen loads | — |
| FB-02 | Category picker shown | Options: Bug, Góp ý, Khác (or similar) | — |
| FB-03 | Select category "Góp ý" | Category selected | — |
| FB-04 | Fill message (`feedback-content-input`) "Mong có thể thêm tính năng nhắn tin cho khách" | Input accepts text | — |
| FB-05 | Tap submit (`feedback-submit-btn`) | Success snackbar: "Đã gửi phản hồi" | — |
| FB-06 | Submit with blank message | Inline validation error | — |
| FB-07 | Open FeedbackHistoryScreen | List of previously submitted feedbacks | — |

---

## Section 10 — Shop Info & Config (SHOP_INFO)

### 10.1 View and edit shop info
| # | Step | Expected | Status |
|---|------|----------|--------|
| SI-01 | Navigate Settings → Thông tin cửa hàng | ShopInfoScreen: name, address, phone, shop type shown | — |
| SI-02 | Shop type shows "Tiệm tóc & Salon" / "BARBER_SHOP" | Correct type reflected | — |
| SI-03 | Edit shop name → save | Updated name persists; reflected in header | — |
| SI-04 | Edit address → save | Updated address persists | — |
| SI-05 | Edit phone number → save | Updated phone persists | — |

### 10.2 POS config
| # | Step | Expected | Status |
|---|------|----------|--------|
| SI-06 | Navigate Settings → Cấu hình POS | POSConfigScreen loads | — |
| SI-07 | POS mode options visible | Barber/Service mode pre-selected for BARBER_SHOP | — |
| SI-08 | Save config | Settings persisted | — |

### 10.3 Display / theme
| # | Step | Expected | Status |
|---|------|----------|--------|
| SI-09 | Navigate Settings → Hiển thị | DisplayScreen loads | — |
| SI-10 | Toggle dark mode | App theme switches | — |
| SI-11 | Toggle back to light mode | App theme reverts | — |

---

## Section 11 — Appointment Management (APPOINTMENT)

### 11.1 Appointment list
| # | Step | Expected | Status |
|---|------|----------|--------|
| AP-01 | Navigate More → Lịch hẹn | AppointmentListScreen loads | — |
| AP-02 | Appointment cards (`appointment-card-0`) visible | Cards show customer name, time, service | — |
| AP-03 | Date navigation (previous/next day arrows) | List changes to selected date | — |

### 11.2 Create appointment
| # | Step | Expected | Status |
|---|------|----------|--------|
| AP-04 | Tap FAB (`appointment-add-fab`) | AppointmentFormScreen: "Đặt lịch hẹn" | — |
| AP-05 | Fill customer name (`appt-customer-name`) "Phạm Văn D" | Input accepts text | — |
| AP-06 | Fill customer phone (`appt-customer-phone`) "0933444555" | Input accepts phone | — |
| AP-07 | Select service | Service picker shows barber services | — |
| AP-08 | Assign technician (if picker available) | Technician01 selected for the appointment | — |
| AP-09 | Advance date using "›" chevron | Next day selected | — |
| AP-10 | Tap save (`appt-save-btn`) | Appointment saved; "Phạm Văn D" appears in list | — |
| AP-11 | Submit with blank customer name | Inline validation error | — |

### 11.3 Search / filter appointments
| # | Step | Expected | Status |
|---|------|----------|--------|
| AP-12 | Navigate to a date with known appointment | Appointment card visible | — |
| AP-13 | Search by customer name (if search available) | Matching appointment shown | — |
| AP-14 | Filter by employee (if filter available) | Only appointments for selected technician shown | — |

### 11.4 Appointment detail & check-in
| # | Step | Expected | Status |
|---|------|----------|--------|
| AP-15 | Tap appointment card | AppointmentDetailScreen: customer info, service, time, status | — |
| AP-16 | Status is PENDING → `appt-checkin-btn` visible | "Check-in" button shown | — |
| AP-17 | Tap check-in | Status → CHECKED_IN; button state updates | — |
| AP-18 | Check-in populates POS with appointment data | BarberServiceScreen pre-loaded with appointment's service | — |

### 11.5 Cancel and delete appointment
| # | Step | Expected | Status |
|---|------|----------|--------|
| AP-19 | Open PENDING appointment → `appt-cancel-btn` → confirm "Hủy lịch" | Status → CANCELLED; check-in button gone | — |
| AP-20 | Delete cancelled appointment → confirm | Appointment removed from list | — |

---

## Section 12 — My Work (MY_WORK)

> **Concept:** Each order item can be assigned to a staff member. My Work is the staff member's personal task queue — they pick up available items, start them, complete them, or release them back to the pool.  
> **Roles tested:** SHOP_OWNER login (full view) + separate sessions for `technician01` and `receptionist01`.  
> **Pre-condition:** At least 2 pending orders with items assigned to no one (or to technician01) from seeded data.

### 12.1 Navigate to My Work
| # | Step | Expected | Status |
|---|------|----------|--------|
| MW-01 | Navigate More → tile `more-tile-mywork` ("Công việc của tôi") | MyWorkScreen loads | — |
| MW-02 | Two tabs visible | "Hàng chờ của tôi" (queue) · "Có thể nhận" (available) | — |
| MW-03 | History button visible (top-right) | Link to MyWorkHistoryScreen | — |
| MW-04 | Pull-to-refresh on queue tab | List refetches | — |

### 12.2 View My Work queue (SHOP_OWNER)
| # | Step | Expected | Status |
|---|------|----------|--------|
| MW-05 | Queue tab ("Hàng chờ của tôi") | Items picked up by this account listed; `mywork-task-<itemId>` cards visible | — |
| MW-06 | Each card shows: service name, order number, customer name, amount | Fields populated correctly | — |
| MW-07 | PENDING item: two action buttons shown | "Bắt đầu" (start) + "Trả lại" (unpick) | — |
| MW-08 | IN_PROGRESS item: two action buttons shown | "Hoàn thành" (complete) + "Thả ra" (release) | — |
| MW-09 | Empty queue | EmptyState: "Hàng chờ trống" message shown | — |

### 12.3 View available items
| # | Step | Expected | Status |
|---|------|----------|--------|
| MW-10 | Tap "Có thể nhận" tab | Available items list shown (items not yet picked by anyone) | — |
| MW-11 | Each card shows: service name, order number, customer name, amount, duration | Info correct | — |
| MW-12 | Each card has "Nhận" button | Pickup button visible | — |
| MW-13 | Empty available pool | EmptyState shown | — |

### 12.4 Pick up an item (technician)
| # | Step | Expected | Status |
|---|------|----------|--------|
| MW-14 | Login as `technician01` → More → Công việc của tôi | MyWorkScreen loads for technician01 | — |
| MW-15 | "Có thể nhận" tab → tap "Nhận" on a service card | Haptic feedback; item moves to queue tab | — |
| MW-16 | Queue tab now shows picked item with status PENDING | `mywork-task-<itemId>` card visible; "Bắt đầu" button shown | — |
| MW-17 | Item no longer appears in "Có thể nhận" tab | Available list updated; that item gone | — |

### 12.5 Start an item
| # | Step | Expected | Status |
|---|------|----------|--------|
| MW-18 | Queue tab → PENDING item → tap "Bắt đầu" | Status changes to IN_PROGRESS | — |
| MW-19 | Card now shows "Hoàn thành" + "Thả ra" buttons | PENDING actions replaced with IN_PROGRESS actions | — |
| MW-20 | "Bắt đầu" button no longer shown | Correct action set for IN_PROGRESS | — |

### 12.6 Complete an item
| # | Step | Expected | Status |
|---|------|----------|--------|
| MW-21 | IN_PROGRESS item → tap "Hoàn thành" | Item removed from queue | — |
| MW-22 | Item appears in history (MyWorkHistoryScreen) | Completed item listed with `completedAt` timestamp | — |
| MW-23 | Commission amount shown in history (COMMISSION feature) | "+X ₫ (Y%)" commission line visible if commissionRate > 0 | — |

### 12.7 Unpick an item (release from PENDING)
| # | Step | Expected | Status |
|---|------|----------|--------|
| MW-24 | Queue tab → PENDING item → tap "Trả lại" (unpick) | Item removed from queue | — |
| MW-25 | Item reappears in "Có thể nhận" tab | Available pool updated | — |
| MW-26 | Other staff (receptionist01) can now pick the released item | Item visible in receptionist01's available tab | — |

### 12.8 Release an item (release from IN_PROGRESS)
| # | Step | Expected | Status |
|---|------|----------|--------|
| MW-27 | IN_PROGRESS item → tap "Thả ra" (release) | Item removed from queue | — |
| MW-28 | Item reappears in "Có thể nhận" with status reset | Available for any staff to pick up | — |

### 12.9 Receptionist picks up an item
| # | Step | Expected | Status |
|---|------|----------|--------|
| MW-29 | Login as `receptionist01` → My Work → "Có thể nhận" | Available items shown | — |
| MW-30 | Tap "Nhận" on an available item | Item moves to receptionist01's queue as PENDING | — |
| MW-31 | Item no longer in technician01's available tab | Cross-account isolation correct | — |
| MW-32 | Receptionist01 completes item via "Bắt đầu" → "Hoàn thành" | Item moves to receptionist01's history | — |

### 12.10 View My Work history
| # | Step | Expected | Status |
|---|------|----------|--------|
| MW-33 | Tap history button (top-right of MyWorkScreen) | MyWorkHistoryScreen loads | — |
| MW-34 | Completed items listed | Service name · order number · customer name · amount | — |
| MW-35 | Commission shown per item (COMMISSION feature) | "+X ₫ (Y%)" in amber for items with rate | — |
| MW-36 | Period filter: Hôm nay | Only today's completions shown | — |
| MW-37 | Period filter: Tuần này | This week's completions | — |
| MW-38 | Period filter: Tháng này | This month's completions | — |
| MW-39 | Bar chart rendered above list | Chart shows completion count per day/week bars | — |
| MW-40 | Empty history | EmptyState: "Chưa có công việc hoàn thành" | — |

### 12.11 View order detail from My Work item
| # | Step | Expected | Status |
|---|------|----------|--------|
| MW-41 | Work item card shows order number (e.g. "DH-000123") | Order number text visible on card | — |
| MW-42 | Navigate More → Đơn hàng → search by order number from work item | Matching order found | — |
| MW-43 | Tap order row → OrderDetailScreen | Full order detail: all items, customer, total, status | — |
| MW-44 | Order detail shows the work item's service | Item line visible in order; assigned staff name shown | — |

### 12.12 MY_WORK feature gate
| # | Step | Expected | Status |
|---|------|----------|--------|
| MW-45 | SHOP_OWNER (has MY_WORK) → More screen | `more-tile-mywork` tile visible | — |
| MW-46 | Role without MY_WORK feature (e.g. CASHIER if configured without it) | My Work tile absent from More screen | — |

> Combo feature (`ComboListScreen`, `ComboEditScreen`) — scenarios TBD when backend fully wired.

---

## Section 13 — Commission Management (COMMISSION)

> Commission is tracked per order item via staff assignment. The mobile view is **read-only reporting** — assignment happens at order creation time (Section 2.2). Direct commission-rate editing is a web admin function.

### 13.1 View commission report
| # | Step | Expected | Status |
|---|------|----------|--------|
| CM-01 | Navigate More → Hiệu suất nhân viên | StaffPerformanceScreen loads (same screen as §7.3) | — |
| CM-02 | Commission column per staff card shown | Amount in ₫ visible for technician01 | — |
| CM-03 | Period selector: Tháng này | Commission reflects this month's assigned orders | — |
| CM-04 | Period selector: Năm 2025 | Commission reflects 2000-order seeded year | — |
| CM-05 | Staff with 0 assigned orders shows 0 commission | Zero-state correctly shown | — |

### 13.2 Commission earned via order assignment
| # | Step | Expected | Status |
|---|------|----------|--------|
| CM-06 | Create order → assign "technician01" to service → complete | Commission record created for technician01 | — |
| CM-07 | StaffPerformanceScreen → technician01 commission incremented | Value higher than before | — |

### 13.3 Search commission by employee
| # | Step | Expected | Status |
|---|------|----------|--------|
| CM-08 | Tap technician01 performance card (if drilldown available) | Per-order commission history shown | — |
| CM-09 | Orders dated within selected period | Commission list matches period filter | — |

---

## Section 14 — Loyalty Management (LOYALTY · CUSTOMER)

### 14.1 Loyalty config
| # | Step | Expected | Status |
|---|------|----------|--------|
| LY-01 | Navigate Settings → Tích điểm | LoyaltyConfigScreen loads | — |
| LY-02 | Loyalty rule: points per 1,000 ₫ shown | Current earn rate displayed | — |
| LY-03 | Edit earn rate → save | Updated rate persists | — |

### 14.2 Loyalty point earn
| # | Step | Expected | Status |
|---|------|----------|--------|
| LY-04 | Create order with loyalty customer (has existing points) | After checkout: customer loyalty balance increased | — |
| LY-05 | CustomerLoyaltyScreen for that customer | `loyalty-balance` testID shows increased balance | — |
| LY-06 | Transaction history shows earn entry | "+X điểm" entry with order reference | — |

### 14.3 Loyalty point redemption
| # | Step | Expected | Status |
|---|------|----------|--------|
| LY-07 | Checkout with loyalty customer who has ≥ 50 points | "Dùng điểm tích lũy" option shown | — |
| LY-08 | Toggle / enter points to redeem (e.g. 50 points) | Discount applied to total | — |
| LY-09 | Total = items total − points discount | Correct deduction shown | — |
| LY-10 | Complete order | Customer balance decremented by redeemed points | — |
| LY-11 | LoyaltyScreen balance reflects deduction | `loyalty-balance` shows reduced amount | — |

### 14.4 Search loyalty by customer
| # | Step | Expected | Status |
|---|------|----------|--------|
| LY-12 | Customer list search → find customer with loyalty | CustomerLoyaltyScreen shows point history | — |
| LY-13 | Point history filtered by date (if available) | Entries within range shown | — |

---

## Section 15 — Salary Management (SALARY)

> **Mobile scope:** Salary generation and payment are web-admin functions. Mobile shows **read-only** salary records if the screen is implemented.

| # | Step | Expected | Status |
|---|------|----------|--------|
| SA-01 | Navigate Settings or More → Lương nhân viên (if tile exists) | Salary list screen loads | — |
| SA-02 | Salary records per staff per month listed | technician01, receptionist01 salary rows visible | — |
| SA-03 | Period selector: Tháng này | Salary for current month shown | — |
| SA-04 | Tap staff salary row | Detail: base salary + commission + total | — |
| SA-05 | SALARY feature absent → tile hidden | If SALARY not in JWT, menu tile not rendered | — |

> Full salary management (generate payroll, mark paid) is performed on the web frontend.

---

## Section 16 — Revenue Management (REVENUE)

| # | Step | Expected | Status |
|---|------|----------|--------|
| RV-01 | Tap "Báo cáo" tab | ReportScreen loads; revenue section visible | — |
| RV-02 | Revenue today | Matches sum of today's completed orders | — |
| RV-03 | Revenue this week | Aggregated from seeded + newly created orders | — |
| RV-04 | Revenue this month | Month-to-date total | — |
| RV-05 | Revenue year 2025 | Reflects 2,000 seeded orders (Jan–Dec 2025) | — |
| RV-06 | Revenue breakdown by product/service (if available) | Top earners: Cắt tóc, Gội đầu, etc. | — |
| RV-07 | Revenue breakdown by employee (if available) | technician01 vs receptionist01 contribution | — |
| RV-08 | Revenue by date: pick custom range (if available) | Filtered to selected start/end date | — |

---

## Section 17 — (Reserved)

---

## Section 18 — Activity Log (ACTIVITY_LOG)

| # | Step | Expected | Status |
|---|------|----------|--------|
| AL-01 | Navigate Settings → Nhật ký hoạt động | ActivityLogScreen loads | — |
| AL-02 | Audit entries visible (`activity-entry-0`) | Rows with timestamp · action · user | — |
| AL-03 | Actions from this test session logged | e.g. "Tạo đơn hàng", "Thêm khách hàng", "Cập nhật sản phẩm" | — |
| AL-04 | Scroll / pagination | Older entries load on scroll | — |
| AL-05 | Filter by user (if available) | Entries by "barb-46304" (owner) vs staff accounts | — |
| AL-06 | Filter by action type (if available) | e.g. show only ORDER_CREATE entries | — |
| AL-07 | Filter by date (if available) | Entries from selected date only | — |
| AL-08 | Pull-to-refresh | Latest entries appear at top | — |

---

## Section 19 — Print Template Management (PRINT_TEMPLATE)

| # | Step | Expected | Status |
|---|------|----------|--------|
| PT-01 | Navigate More → Mẫu in | PrintTemplateListScreen loads | — |
| PT-02 | Template rows visible (`print-template-row-0`) | At least 1 default template shown | — |
| PT-03 | Tap template row | PrintTemplateDetailScreen: template content rendered | — |
| PT-04 | Template content includes shop name | `barb-46304` / "Tiệm Tóc & Salon Demo" visible | — |
| PT-05 | Edit template (if editable on mobile) | Content editable; save persists | — |
| PT-06 | Create new template (if FAB shown) | New template form → fill name + content → save | — |
| PT-07 | Delete template → confirm | Template removed from list | — |
| PT-08 | Cancel delete | Template remains | — |
| PT-09 | Pull-to-refresh | List refetches | — |

---

## Section 20 — Bank Account Management (BANK_ACCOUNT)

| # | Step | Expected | Status |
|---|------|----------|--------|
| BA-01 | Navigate Settings → Tài khoản ngân hàng | BankAccountsScreen loads | — |
| BA-02 | Existing bank accounts listed | Rows with bank name, account number, holder name | — |
| BA-03 | Add new bank account — tap FAB or "Thêm" | Bank account form shown | — |
| BA-04 | Select bank (e.g. Vietcombank) from picker | Bank picker opens; select bank | — |
| BA-05 | Fill account number "1234567890" + holder "NGUYEN VAN A" | Inputs accept text | — |
| BA-06 | Save | Account created; appears in list | — |
| BA-07 | Submit with blank account number | Inline validation error | — |
| BA-08 | Edit bank account | Form pre-filled; change holder name → save | — |
| BA-09 | Delete bank account → confirm | Account removed from list | — |
| BA-10 | Deleted account no longer shown in POS checkout QR picker | BANK_TRANSFER checkout uses remaining accounts only | — |

---

## Section 21 — Security & Profile

| # | Step | Expected | Status |
|---|------|----------|--------|
| SEC-01 | Navigate Settings → Bảo mật | SecurityScreen: PIN change + biometric toggle | — |
| SEC-02 | Change PIN: enter current → new 6-digit → confirm match | PIN updated; next login uses new PIN | — |
| SEC-03 | Change PIN: new ≠ confirm | Inline error | — |
| SEC-04 | Biometric toggle (Face ID / fingerprint) | Toggle switches; persists across restart | — |
| SEC-05 | Open ProfileScreen | Name, phone, shop name, role SHOP_OWNER shown | — |
| SEC-06 | Language toggle VI → EN | All visible strings switch to English | — |
| SEC-07 | Language toggle EN → VI | Reverts to Vietnamese | — |
| SEC-08 | Change password: old + new + confirm → submit | Success alert | — |
| SEC-09 | Logout (`settings-logout-btn`) → confirm | SecureStore cleared; ShopIdScreen shown | — |

---

## Section 22 — Cross-cutting (apply to all screens)

| # | Area | Expected | Status |
|---|------|----------|--------|
| X-01 | Safe area on notch device | No content hidden behind notch or home indicator | — |
| X-02 | Keyboard avoidance | Focused inputs scroll into view; keyboard does not cover content | — |
| X-03 | Pull-to-refresh on all list screens | Refetches without crash | — |
| X-04 | Empty states | EmptyState component shown when list has no data | — |
| X-05 | Error / offline state | ErrorState + retry shown on network failure | — |
| X-06 | Loading skeletons | Skeleton shown on initial fetch before data arrives | — |
| X-07 | Back gesture (swipe-from-edge on iOS) | Works on every screen without crash | — |
| X-08 | VND amount formatting | All amounts shown as `1.500.000 ₫` (dot-separated, ₫ suffix) | — |
| X-09 | Vietnamese labels | No raw feature codes or English keys exposed to the user | — |
| X-10 | Dark mode | All screens readable; no contrast issues | — |
| X-11 | PAWN / gold features absent | No "Cầm đồ", "Giá vàng" tile or screen accessible | — |
| X-12 | TABLE_SERVICE absent | No table-grid screen on Sell tab | — |

---

## Feature coverage summary

| Feature | Sections covered | Mobile scope |
|---------|-----------------|--------------|
| AUTH (register/login/logout/PIN/profile) | §0 | ✅ |
| DASHBOARD | §1.6, §7 | ✅ |
| ORDER | §2 | ✅ |
| ORDER_VIEW_ALL | OR-42 | ✅ |
| MY_WORK | §12 | ✅ |
| PRODUCT | §4 | ✅ |
| POS | §2 (BarberServiceScreen) | ✅ |
| CUSTOMER | §3 | ✅ |
| LOYALTY | §14, CU-19–21 | ✅ |
| COMMISSION | §13 | ✅ (read-only; assignment in §2.2) |
| EMPLOYEE | §6 | ✅ |
| SALARY | §15 | ⚠️ read-only on mobile |
| EXPENSE | §5 | ✅ |
| REVENUE | §16, §7.1 | ✅ |
| USER | — | ⚠️ no dedicated mobile screen |
| APPOINTMENT | §11 | ✅ |
| NOTIFICATION | §8 | ✅ |
| FEEDBACK | §9 | ✅ (submit only; reply is web-admin) |
| ACTIVITY_LOG | §18 | ✅ |
| SHOP_INFO | §10 | ✅ |
| PRINT_TEMPLATE | §19 | ✅ |
| BANK_ACCOUNT | §20 | ✅ |
| INVOICE | — | ⚠️ no dedicated mobile screen |
| ACCOUNTING | — | ⚠️ no dedicated mobile screen |
