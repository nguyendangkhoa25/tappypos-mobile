# Typography Rollout — All 89 Screens + 20 Inline Sheets = 109 Surfaces

Status: ✅ Done · ✅ Pending

Tier legend: `display` · `heading` · `section` · `body` · `labelBold` · `label` · `captionBold` · `caption` · `fixed`

---

| # | Status | Screen / Surface | Component | Tier |
|---|---|---|---|---|
| **— AUTH —** | | | | |
| 1 | ✅ | `auth/ShopIdScreen` | Screen title | `heading` |
| | | | Subtitle / hint | `caption` |
| | | | Field label | `label` |
| | | | Input hint | `caption` |
| | | | Submit button | `labelBold` |
| | | | Error message | `caption` |
| 2 | ✅ | `auth/LoginScreen` | Screen title | `heading` |
| | | | Subtitle | `caption` |
| | | | Field label | `label` |
| | | | Submit button | `labelBold` |
| | | | Link text (Quên mật khẩu) | `caption` |
| | | | Error message | `caption` |
| 3 | ✅ | `auth/RegisterScreen` | Screen title | `heading` |
| | | | Subtitle | `caption` |
| | | | Field label | `label` |
| | | | Submit button | `labelBold` |
| | | | TnC link | `caption` |
| | | | Error message | `caption` |
| 4 | ✅ | `auth/PinSetupScreen` | Screen title | `heading` |
| | | | Subtitle / instruction | `caption` |
| | | | PIN dot label | `caption` |
| | | | Action button | `labelBold` |
| 5 | ✅ | `auth/PinLoginScreen` | Screen title | `heading` |
| | | | Subtitle | `caption` |
| | | | Link (Quên PIN / Đổi cửa hàng) | `caption` |
| 6 | ✅ | `auth/ForgotPasswordScreen` | Screen title | `heading` |
| | | | Subtitle / hint | `caption` |
| | | | Field label | `label` |
| | | | Submit button | `labelBold` |
| 7 | ✅ | `auth/ForgotPinScreen` | Screen title | `heading` |
| | | | Subtitle / hint | `caption` |
| | | | Field label | `label` |
| | | | Submit button | `labelBold` |
| 8 | ✅ | `auth/ForgotShopIdScreen` | Screen title | `heading` |
| | | | Subtitle / hint | `caption` |
| | | | Field label | `label` |
| | | | Submit button | `labelBold` |
| **— ONBOARDING —** | | | | |
| 9 | ✅ | `onboarding/ShopTypeScreen` | Screen title | `heading` |
| | | | Subtitle | `caption` |
| | | | Shop type card label | `labelBold` |
| | | | Shop type card hint | `caption` |
| 10 | ✅ | `onboarding/Step1Screen` | Screen title | `heading` |
| | | | Subtitle | `caption` |
| | | | Field label | `label` |
| | | | Submit button | `labelBold` |
| 11 | ✅ | `onboarding/Step2Screen` | Screen title | `heading` |
| | | | Subtitle | `caption` |
| | | | Product card name | `labelBold` |
| | | | Product card price | `body` |
| | | | Empty state | `label` |
| | | | Action button | `labelBold` |
| 12 | ✅ | `onboarding/Step3Screen` | Screen title | `heading` |
| | | | Subtitle | `caption` |
| | | | Suggestion chip | `captionBold` |
| | | | Expense item name | `labelBold` |
| | | | Expense item amount | `body` |
| | | | Empty state | `label` |
| | | | Action button | `labelBold` |
| 13 | ✅ | `onboarding/Step4Screen` | Screen title | `heading` |
| | | | Subtitle | `caption` |
| | | | Section header | `captionBold` |
| | | | Summary item name | `labelBold` |
| | | | Summary item value | `body` |
| | | | Confirm button | `labelBold` |
| 14 | ✅ | `onboarding/PawnFeatureScreen` | Screen title | `heading` |
| | | | Subtitle / hint | `caption` |
| | | | Option label | `labelBold` |
| | | | Option hint | `caption` |
| | | | Action button | `labelBold` |
| 15 | ✅ | `onboarding/PawnInterestScreen` | Screen title | `heading` |
| | | | Subtitle / hint | `caption` |
| | | | Field label | `label` |
| | | | Action button | `labelBold` |
| 16 | ✅ | `onboarding/TableSetupScreen` | Screen title | `heading` |
| | | | Subtitle / hint | `caption` |
| | | | Table name | `labelBold` |
| | | | Table meta | `caption` |
| | | | Empty state | `label` |
| | | | Action button | `labelBold` |
| **— MAIN TABS —** | | | | |
| 17 | ✅ | `main/HomeScreen` | Greeting "Chào {{name}}!" | `heading` |
| | | | Shop name / subtitle | `caption` |
| | | | Quick action label | `label` |
| | | | KPI card value | `heading` |
| | | | KPI card label | `caption` |
| | | | Section header | `captionBold` |
| | | | Notification item title | `labelBold` |
| | | | Notification item meta | `caption` |
| | | | Empty state | `label` |
| 18 | ✅ | `main/ReportScreen` | Screen title | `heading` |
| | | | Subtitle / hint | `caption` |
| | | | Tab labels (Doanh thu / Chi phí) | `labelBold` |
| | | | Period selector tabs | `label` |
| | | | Active filter label "Đang xem:" | `caption` |
| | | | Active filter value | `captionBold` |
| | | | Filter chips | `captionBold` |
| | | | Hero KPI amount | `display` |
| | | | Hero KPI sub-label | `label` |
| | | | KPI card value | `heading` |
| | | | KPI card label | `caption` |
| | | | Section header | `captionBold` |
| | | | Item count | `caption` |
| | | | List item name | `labelBold` |
| | | | List item amount | `body` |
| | | | List item date / meta | `caption` |
| | | | Empty state | `label` |
| 19 | ✅ | `main/SellingScreen` | Screen title | `heading` |
| | | | Mode tab labels | `labelBold` |
| | | | Mode hint | `caption` |
| | | | Feature card label | `labelBold` |
| | | | Feature card hint | `caption` |
| 20 | ✅ | `main/ExpensesScreen` | Screen title | `heading` |
| | | | Hint | `caption` |
| | | | Period selector tabs | `label` |
| | | | Quick filter tabs | `label` |
| | | | Total amount | `display` |
| | | | Total label | `label` |
| | | | Section header (month) | `captionBold` |
| | | | Item count | `caption` |
| | | | Expense item name | `labelBold` |
| | | | Expense item amount | `body` |
| | | | Expense item date / type | `caption` |
| | | | Empty state | `label` |
| 21 | ✅ | `main/NotificationScreen` | Screen title | `heading` |
| | | | Hint | `caption` |
| | | | Item count | `caption` |
| | | | Notification title | `labelBold` |
| | | | Notification body | `caption` |
| | | | Notification time | `caption` |
| | | | Empty state | `label` |
| 22 | ✅ | `main/ExpenseAddScreen` | Nav bar title | `section` |
| | | | Nav bar hint | `caption` |
| | | | Suggestion chip | `captionBold` |
| | | | Field label | `label` |
| | | | Submit button | `labelBold` |
| **— DASHBOARD —** | | | | |
| 23 | ✅ | `dashboard/DashboardScreen` | Screen title | `heading` |
| | | | Greeting subtitle | `caption` |
| | | | Date / period label | `caption` |
| | | | Hero KPI amount | `display` |
| | | | Hero KPI sub-label | `label` |
| | | | KPI card value | `heading` |
| | | | KPI card label | `caption` |
| | | | Section header | `captionBold` |
| | | | Item count | `caption` |
| | | | List item name | `labelBold` |
| | | | List item amount | `body` |
| | | | List item meta | `caption` |
| | | | Empty state | `label` |
| **— SELLING / POS ENTRY —** | | | | |
| 24 | ✅ | `selling/POSMainScreen` | Nav bar title | `section` |
| | | | Nav bar hint | `caption` |
| | | | Tab labels (Sản phẩm / Đơn hàng) | `labelBold` |
| | | | Category filter chips | `captionBold` |
| | | | Product card name | `labelBold` |
| | | | Product card price | `body` |
| | | | Product card unit | `caption` |
| | | | Item count | `caption` |
| | | | Empty state | `label` |
| | | | Order summary count | `caption` |
| 25 | ✅ | `selling/BarberServiceScreen` | Nav bar title | `section` |
| | | | Category filter chips | `captionBold` |
| | | | Service name | `labelBold` |
| | | | Service price | `body` |
| | | | Service duration | `caption` |
| | | | Empty state | `label` |
| 26 | ✅ | `selling/TableGridScreen` | Nav bar title | `section` |
| | | | Section header | `captionBold` |
| | | | Table name / number | `labelBold` |
| | | | Table status | `caption` |
| | | | Empty state | `label` |
| **— POS FLOW —** | | | | |
| 27 | ✅ | `pos/POSScreen` | Nav bar title | `section` |
| | | | Section header | `captionBold` |
| | | | Category tab labels | `label` |
| | | | Filter chip | `captionBold` |
| | | | Product name | `labelBold` |
| | | | Product price | `body` |
| | | | Product unit | `caption` |
| | | | Empty state | `label` |
| 28 | ✅ | `pos/CartScreen` | Nav bar title | `section` |
| | | | Item count | `caption` |
| | | | Cart item name | `labelBold` |
| | | | Cart item unit price | `caption` |
| | | | Cart item subtotal | `body` |
| | | | Section header | `captionBold` |
| | | | Summary row label | `label` |
| | | | Summary row value | `body` |
| | | | Total amount | `heading` |
| | | | Empty state | `label` |
| | | | Checkout button | `labelBold` |
| 29 | ✅ | `pos/CheckoutScreen` | Nav bar title | `section` |
| | | | Section header | `captionBold` |
| | | | Payment method label | `labelBold` |
| | | | Payment method hint | `caption` |
| | | | Total amount | `display` |
| | | | Summary row label | `label` |
| | | | Summary row value | `body` |
| | | | Customer name | `labelBold` |
| | | | Customer meta | `caption` |
| | | | Confirm button | `labelBold` |
| 30 | ✅ | `pos/OrderSuccessScreen` | Success title | `heading` |
| | | | Amount | `display` |
| | | | Amount label | `label` |
| | | | Order meta | `caption` |
| | | | Action button | `labelBold` |
| **— ORDERS —** | | | | |
| 31 | ✅ | `orders/OrderListScreen` | Screen title | `heading` |
| | | | Hint | `caption` |
| | | | Quick filter tabs | `label` |
| | | | Item count | `caption` |
| | | | Order — customer name | `labelBold` |
| | | | Order — amount | `body` |
| | | | Order — date / meta | `caption` |
| | | | Status badge | `fixed` |
| | | | Empty state | `label` |
| 32 | ✅ | `orders/OrderDetailScreen` | Nav bar title | `section` |
| | | | Nav bar hint | `caption` |
| | | | Section header | `captionBold` |
| | | | Product name | `labelBold` |
| | | | Product qty × price | `caption` |
| | | | Product subtotal | `body` |
| | | | Summary row label | `label` |
| | | | Summary row value | `body` |
| | | | Total label | `labelBold` |
| | | | Total value | `heading` |
| | | | Customer name | `labelBold` |
| | | | Customer meta | `caption` |
| | | | Status badge | `fixed` |
| | | | Action button | `labelBold` |
| **— PRODUCTS —** | | | | |
| 33 | ✅ | `products/ProductListScreen` | Screen title | `heading` |
| | | | Hint | `caption` |
| | | | Category filter chips | `captionBold` |
| | | | Item count | `caption` |
| | | | Product name | `labelBold` |
| | | | Product price | `body` |
| | | | Product unit / stock | `caption` |
| | | | Empty state | `label` |
| 34 | ✅ | `products/ProductDetailScreen` | Nav bar title | `section` |
| | | | Product name (hero) | `heading` |
| | | | Price | `display` |
| | | | Price label | `label` |
| | | | Section header | `captionBold` |
| | | | Tab labels | `labelBold` |
| | | | Field label | `label` |
| | | | Field value | `labelBold` |
| | | | Stock quantity | `heading` |
| | | | Stock label | `caption` |
| | | | Attribute name | `label` |
| | | | Attribute value | `labelBold` |
| 35 | ✅ | `products/ProductCreateScreen` | Nav bar title | `section` |
| | | | Nav bar hint | `caption` |
| | | | Section header | `captionBold` |
| | | | Field label | `label` |
| | | | Submit button | `labelBold` |
| 36 | ✅ | `products/ProductEditScreen` | Nav bar title | `section` |
| | | | Nav bar hint | `caption` |
| | | | Section header | `captionBold` |
| | | | Field label | `label` |
| | | | Submit button | `labelBold` |
| 37 | ✅ | `products/CategoryListScreen` | Screen title | `heading` |
| | | | Hint | `caption` |
| | | | Item count | `caption` |
| | | | Category name | `labelBold` |
| | | | Category meta | `caption` |
| | | | Empty state | `label` |
| **— CUSTOMERS —** | | | | |
| 38 | ✅ | `customers/CustomerListScreen` | Screen title | `heading` |
| | | | Hint | `caption` |
| | | | Item count | `caption` |
| | | | Customer name | `labelBold` |
| | | | Customer phone / meta | `caption` |
| | | | Loyalty badge | `fixed` |
| | | | Empty state | `label` |
| 39 | ✅ | `customers/CustomerDetailScreen` | Nav bar title | `section` |
| | | | Customer name (hero) | `heading` |
| | | | Customer meta | `caption` |
| | | | Tab labels | `labelBold` |
| | | | Section header | `captionBold` |
| | | | Field label | `label` |
| | | | Field value | `labelBold` |
| | | | Order item name | `labelBold` |
| | | | Order item amount | `body` |
| | | | Order item date | `caption` |
| | | | Points balance | `heading` |
| | | | Points label | `caption` |
| | | | Empty state | `label` |
| 40 | ✅ | `customers/CustomerFormScreen` | Nav bar title | `section` |
| | | | Nav bar hint | `caption` |
| | | | Section header | `captionBold` |
| | | | Field label | `label` |
| | | | Submit button | `labelBold` |
| 41 | ✅ | `customers/CustomerLoyaltyScreen` | Nav bar title | `section` |
| | | | Points balance | `heading` |
| | | | Points label | `caption` |
| | | | Section header | `captionBold` |
| | | | Transaction item | `labelBold` |
| | | | Transaction meta | `caption` |
| | | | Empty state | `label` |
| **— APPOINTMENTS —** | | | | |
| 42 | ✅ | `appointment/AppointmentListScreen` | Screen title | `heading` |
| | | | Hint | `caption` |
| | | | Quick filter tabs | `label` |
| | | | Status filter chips | `captionBold` |
| | | | Item count | `caption` |
| | | | Appointment — customer name | `labelBold` |
| | | | Appointment — service / time | `caption` |
| | | | Appointment — amount | `body` |
| | | | Status badge | `fixed` |
| | | | Empty state | `label` |
| 43 | ✅ | `appointment/AppointmentDetailScreen` | Nav bar title | `section` |
| | | | Customer name (hero) | `heading` |
| | | | Date / time | `caption` |
| | | | Section header | `captionBold` |
| | | | Service name | `labelBold` |
| | | | Service duration / price | `caption` |
| | | | Service amount | `body` |
| | | | Staff name | `labelBold` |
| | | | Staff role | `caption` |
| | | | Total | `heading` |
| | | | Total label | `caption` |
| | | | Status badge | `fixed` |
| | | | Action button | `labelBold` |
| 44 | ✅ | `appointment/AppointmentFormScreen` | Nav bar title | `section` |
| | | | Nav bar hint | `caption` |
| | | | Section header | `captionBold` |
| | | | Field label | `label` |
| | | | Submit button | `labelBold` |
| **— STAFF —** | | | | |
| 45 | ✅ | `staff/StaffListScreen` | Screen title | `heading` |
| | | | Hint | `caption` |
| | | | Item count | `caption` |
| | | | Staff name | `labelBold` |
| | | | Staff role / meta | `caption` |
| | | | Empty state | `label` |
| 46 | ✅ | `staff/StaffQueueScreen` | Nav bar title | `section` |
| | | | Section header | `captionBold` |
| | | | Staff name | `labelBold` |
| | | | Queue status / wait time | `caption` |
| | | | Empty state | `label` |
| 47 | ✅ | `staff/StaffPerformanceScreen` | Nav bar title | `section` |
| | | | Period selector tabs | `label` |
| | | | KPI card value | `heading` |
| | | | KPI card label | `caption` |
| | | | Staff name | `labelBold` |
| | | | Staff amount / meta | `body` |
| | | | Empty state | `label` |
| 48 | ✅ | `staff/StaffFormScreen` | Nav bar title | `section` |
| | | | Nav bar hint | `caption` |
| | | | Section header | `captionBold` |
| | | | Field label | `label` |
| | | | Submit button | `labelBold` |
| **— PAWN —** | | | | |
| 49 | ✅ | `pawn/PawnListScreen` | Screen title | `heading` |
| | | | Hint | `caption` |
| | | | Quick filter tabs | `label` |
| | | | Item count | `caption` |
| | | | Pawn — customer name | `labelBold` |
| | | | Pawn — amount | `body` |
| | | | Pawn — date / meta | `caption` |
| | | | Status badge | `fixed` |
| | | | Empty state | `label` |
| 50 | ✅ | `pawn/PawnDetailScreen` | Nav bar title | `section` |
| | | | Nav bar hint | `caption` |
| | | | Section header | `captionBold` |
| | | | Field label | `label` |
| | | | Field value | `labelBold` |
| | | | Amount | `heading` |
| | | | Amount label | `caption` |
| | | | Status badge | `fixed` |
| | | | Action button | `labelBold` |
| 51 | ✅ | `pawn/PawnFormScreen` | Nav bar title | `section` |
| | | | Nav bar hint | `caption` |
| | | | Section header | `captionBold` |
| | | | Field label | `label` |
| | | | Submit button | `labelBold` |
| 52 | ✅ | `pawn/PawnSettingsScreen` | Nav bar title | `section` |
| | | | Section header | `captionBold` |
| | | | Field label | `label` |
| | | | Field value / hint | `caption` |
| | | | Save button | `labelBold` |
| **— COMBOS —** | | | | |
| 53 | ✅ | `combos/ComboListScreen` | Screen title | `heading` |
| | | | Hint | `caption` |
| | | | Item count | `caption` |
| | | | Combo name | `labelBold` |
| | | | Combo price / meta | `body` |
| | | | Empty state | `label` |
| 54 | ✅ | `combos/ComboEditScreen` | Nav bar title | `section` |
| | | | Nav bar hint | `caption` |
| | | | Section header | `captionBold` |
| | | | Field label | `label` |
| | | | Product in combo name | `labelBold` |
| | | | Product in combo price | `body` |
| | | | Submit button | `labelBold` |
| **— GOLD PRICE —** | | | | |
| 55 | ✅ | `gold/GoldPriceScreen` | Screen title | `heading` |
| | | | Hint | `caption` |
| | | | Gold type name | `labelBold` |
| | | | Buy / sell price | `body` |
| | | | Updated at | `caption` |
| | | | Empty state | `label` |
| **— INVENTORY —** | | | | |
| 56 | ✅ | `inventory/InventoryListScreen` | Screen title | `heading` |
| | | | Hint | `caption` |
| | | | Item count | `caption` |
| | | | Product name | `labelBold` |
| | | | Stock qty | `body` |
| | | | Stock meta | `caption` |
| | | | Empty state | `label` |
| **— PRINT TEMPLATES —** | | | | |
| 57 | ✅ | `print/PrintTemplateListScreen` | Screen title | `heading` |
| | | | Hint | `caption` |
| | | | Template name | `labelBold` |
| | | | Template meta | `caption` |
| | | | Empty state | `label` |
| 58 | ✅ | `print/PrintTemplateDetailScreen` | Nav bar title | `section` |
| | | | Section header | `captionBold` |
| | | | Field label | `label` |
| | | | Field value | `labelBold` |
| | | | Action button | `labelBold` |
| **— PROFILE —** | | | | |
| 59 | ✅ | `profile/ProfileScreen` | Screen title | `heading` |
| | | | User name (hero) | `heading` |
| | | | User role / meta | `caption` |
| | | | Section header | `captionBold` |
| | | | Menu row label | `labelBold` |
| | | | Menu row hint | `caption` |
| **— SCAN —** | | | | |
| 60 | ✅ | `scan/ScanScreen` | Nav bar title | `section` |
| | | | Hint / instruction | `caption` |
| | | | Result name | `labelBold` |
| | | | Result meta | `caption` |
| **— MY WORK —** | | | | |
| 61 | ✅ | `mywork/MyWorkScreen` | Screen title | `heading` |
| | | | Hint | `caption` |
| | | | Item count | `caption` |
| | | | Task name | `labelBold` |
| | | | Task meta | `caption` |
| | | | Empty state | `label` |
| 62 | ✅ | `mywork/MyWorkHistoryScreen` | Nav bar title | `section` |
| | | | Item count | `caption` |
| | | | Task name | `labelBold` |
| | | | Task meta | `caption` |
| | | | Empty state | `label` |
| **— MORE —** | | | | |
| 63 | ✅ | `more/MoreScreen` | Screen title | `heading` |
| | | | Section header | `captionBold` |
| | | | Menu row label | `labelBold` |
| | | | Menu row hint | `caption` |
| | | | Badge count | `fixed` |
| **— TOOLS —** | | | | |
| 64 | ✅ | `tools/UtilitiesScreen` | Screen title | `heading` |
| | | | Tool card label | `labelBold` |
| | | | Tool card hint | `caption` |
| 65 | ✅ | `tools/BillSplitterScreen` | Nav bar title | `section` |
| | | | Field label | `label` |
| | | | Result value | `heading` |
| | | | Result label | `caption` |
| 66 | ✅ | `tools/BreakevenScreen` | Nav bar title | `section` |
| | | | Field label | `label` |
| | | | Result value | `heading` |
| | | | Result label | `caption` |
| 67 | ✅ | `tools/BudgetRuleScreen` | Nav bar title | `section` |
| | | | Field label | `label` |
| | | | Result value | `heading` |
| | | | Result label | `caption` |
| 68 | ✅ | `tools/CurrencyConverterScreen` | Nav bar title | `section` |
| | | | Field label | `label` |
| | | | Result value | `heading` |
| | | | Result label | `caption` |
| 69 | ✅ | `tools/InterestCalculatorScreen` | Nav bar title | `section` |
| | | | Field label | `label` |
| | | | Result value | `heading` |
| | | | Result label | `caption` |
| 70 | ✅ | `tools/LoanCalculatorScreen` | Nav bar title | `section` |
| | | | Field label | `label` |
| | | | Result value | `heading` |
| | | | Result label | `caption` |
| 71 | ✅ | `tools/MarketGoldPricesScreen` | Nav bar title | `section` |
| | | | Gold type name | `labelBold` |
| | | | Buy / sell price | `body` |
| | | | Updated at | `caption` |
| | | | Empty state | `label` |
| 72 | ✅ | `tools/TaxCalculatorScreen` | Nav bar title | `section` |
| | | | Field label | `label` |
| | | | Result value | `heading` |
| | | | Result label | `caption` |
| **— SETTINGS —** | | | | |
| 73 | ✅ | `settings/SettingsScreen` | Screen title | `heading` |
| | | | Section header | `captionBold` |
| | | | Setting row label | `labelBold` |
| | | | Setting row hint / value | `caption` |
| | | | Toggle label | `labelBold` |
| | | | Destructive action label | `labelBold` |
| 74 | ✅ | `settings/DisplayScreen` | Nav bar title | `section` |
| | | | Section headers | `captionBold` |
| | | | Option card labels | `caption` |
| | | | Privacy item title | `labelBold` |
| | | | Privacy item hint | `caption` |
| 75 | ✅ | `settings/ProfileUpdateScreen` | Nav bar title | `section` |
| | | | Nav bar hint | `caption` |
| | | | Section header | `captionBold` |
| | | | Field label | `label` |
| | | | Save button | `labelBold` |
| 76 | ✅ | `settings/ShopInfoScreen` | Nav bar title | `section` |
| | | | Nav bar hint | `caption` |
| | | | Section header | `captionBold` |
| | | | Field label | `label` |
| | | | Save button | `labelBold` |
| 77 | ✅ | `settings/ChangePasswordScreen` | Nav bar title | `section` |
| | | | Field label | `label` |
| | | | Submit button | `labelBold` |
| | | | Error message | `caption` |
| 78 | ✅ | `settings/SecurityScreen` | Nav bar title | `section` |
| | | | Section header | `captionBold` |
| | | | Option label | `labelBold` |
| | | | Option hint | `caption` |
| 79 | ✅ | `settings/BankAccountsScreen` | Nav bar title | `section` |
| | | | Bank name | `labelBold` |
| | | | Account meta | `caption` |
| | | | Empty state | `label` |
| 80 | ✅ | `settings/LoyaltyConfigScreen` | Nav bar title | `section` |
| | | | Section header | `captionBold` |
| | | | Field label | `label` |
| | | | Tier name | `labelBold` |
| | | | Tier threshold | `body` |
| 81 | ✅ | `settings/POSConfigScreen` | Nav bar title | `section` |
| | | | Section header | `captionBold` |
| | | | Config label | `labelBold` |
| | | | Config hint | `caption` |
| 82 | ✅ | `settings/DefaultExpensesScreen` | Nav bar title | `section` |
| | | | Expense name | `labelBold` |
| | | | Expense amount | `body` |
| | | | Expense meta | `caption` |
| | | | Empty state | `label` |
| 83 | ✅ | `settings/NotificationPreferencesScreen` | Nav bar title | `section` |
| | | | Section header | `captionBold` |
| | | | Preference label | `labelBold` |
| | | | Preference hint | `caption` |
| 84 | ✅ | `settings/FeedbackScreen` | Nav bar title | `section` |
| | | | Section header | `captionBold` |
| | | | Field label | `label` |
| | | | Hint | `caption` |
| | | | Submit button | `labelBold` |
| 85 | ✅ | `settings/FeedbackHistoryScreen` | Nav bar title | `section` |
| | | | Item count | `caption` |
| | | | Feedback title | `labelBold` |
| | | | Feedback meta | `caption` |
| | | | Empty state | `label` |
| 86 | ✅ | `settings/ActivityLogScreen` | Nav bar title | `section` |
| | | | Item count | `caption` |
| | | | Log action | `labelBold` |
| | | | Log meta / time | `caption` |
| | | | Empty state | `label` |
| 87 | ✅ | `settings/SubscriptionScreen` | Nav bar title | `section` |
| | | | Plan name | `heading` |
| | | | Plan meta | `caption` |
| | | | Section header | `captionBold` |
| | | | Feature label | `labelBold` |
| | | | Feature hint | `caption` |
| 88 | ✅ | `settings/DeleteAccountScreen` | Nav bar title | `section` |
| | | | Warning text | `caption` |
| | | | Field label | `label` |
| | | | Destructive button | `labelBold` |
| 89 | ✅ | `settings/TnCScreen` | Nav bar title | `section` |
| | | | Body text | `caption` |
| **— INLINE SHEETS / MODALS —** | | | | |
| S1 | ✅ | `ReportScreen → ReportMoreSheet` | Sheet title | `section` |
| | | | Sheet section label | `captionBold` |
| | | | Sheet option rows | `label` |
| | | | Apply button | `labelBold` |
| S2 | ✅ | `DashboardScreen → MorePeriodsSheet` | Sheet title | `section` |
| | | | Sheet section label | `captionBold` |
| | | | Sheet option rows | `label` |
| | | | Apply button | `labelBold` |
| S3 | ✅ | `ExpensesScreen → filter sheet` | Sheet title | `section` |
| | | | Sheet option rows | `label` |
| | | | Apply button | `labelBold` |
| S4 | ✅ | `GoldPriceScreen → edit sheet` | Sheet title | `section` |
| | | | Field label | `label` |
| | | | Save button | `labelBold` |
| S5 | ✅ | `POSScreen → product add sheet` | Product name | `section` |
| | | | Price | `body` |
| | | | Qty label | `label` |
| | | | Add button | `labelBold` |
| S6 | ✅ | `CartScreen → customer picker sheet` | Sheet title | `section` |
| | | | Customer name | `labelBold` |
| | | | Customer meta | `caption` |
| | | | Empty state | `label` |
| S7 | ✅ | `PawnDetailScreen → PrintActionSheet` | Sheet title | `section` |
| | | | Action option | `labelBold` |
| | | | Action hint | `caption` |
| S8 | ✅ | `PawnDetailScreen → RedeemModal` | Modal title | `section` |
| | | | Amount | `heading` |
| | | | Field label | `label` |
| | | | Confirm button | `labelBold` |
| S9 | ✅ | `PawnDetailScreen → ForfeitModal` | Modal title | `section` |
| | | | Warning text | `caption` |
| | | | Confirm button | `labelBold` |
| S10 | ✅ | `PawnDetailScreen → RequestMoneyModal` | Modal title | `section` |
| | | | Field label | `label` |
| | | | Confirm button | `labelBold` |
| S11 | ✅ | `PawnDetailScreen → ExtendModal` | Modal title | `section` |
| | | | Field label | `label` |
| | | | New due date | `labelBold` |
| | | | Confirm button | `labelBold` |
| S12 | ✅ | `PawnDetailScreen → CancelModal` | Modal title | `section` |
| | | | Warning text | `caption` |
| | | | Confirm button | `labelBold` |
| S13 | ✅ | `BarberServiceScreen → AddItemSheet` | Sheet title | `section` |
| | | | Service name | `labelBold` |
| | | | Service price | `body` |
| | | | Staff selector label | `label` |
| | | | Add button | `labelBold` |
| S14 | ✅ | `BarberServiceScreen → CheckoutSheet` | Sheet title | `section` |
| | | | Summary label | `label` |
| | | | Total amount | `heading` |
| | | | Confirm button | `labelBold` |
| S15 | ✅ | `CustomerLoyaltyScreen → AdjustModal` | Modal title | `section` |
| | | | Field label | `label` |
| | | | Confirm button | `labelBold` |
| S16 | ✅ | `AppointmentFormScreen → CustomerSearchModal` | Modal title | `section` |
| | | | Customer name | `labelBold` |
| | | | Customer meta | `caption` |
| | | | Empty state | `label` |
| S17 | ✅ | `AppointmentFormScreen → ProductPickerModal` | Modal title | `section` |
| | | | Service name | `labelBold` |
| | | | Service price | `body` |
| | | | Empty state | `label` |
| S18 | ✅ | `CategoryListScreen → add category modal` | Modal title | `section` |
| | | | Field label | `label` |
| | | | Save button | `labelBold` |
| S19 | ✅ | `StaffFormScreen → CredentialModal` | Modal title | `section` |
| | | | Credential value | `labelBold` |
| | | | Hint | `caption` |
| | | | Close button | `labelBold` |
| S20 | ✅ | `LoyaltyConfigScreen → tier edit modal` | Modal title | `section` |
| | | | Field label | `label` |
| | | | Save button | `labelBold` |

---

## Summary

| | Count |
|---|---|
| Screens | 89 |
| Inline sheets / modals | 20 |
| **Total surfaces** | **109** |
| Done ✅ | 109 |
| Pending ⬜ | 0 |
