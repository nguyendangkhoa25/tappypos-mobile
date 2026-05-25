# TappyPOS Mobile — Maestro E2E Tests

## Prerequisites


### 1. Install Maestro
```bash
curl -Ls "https://get.maestro.mobile.dev" | bash
```
`brew install maestro` installs the GUI app, **not** the CLI — use the curl installer above.
Verify: `maestro --version` (requires 2.5+)

### 2. Build and launch on iOS Simulator

> **Note:** This project uses `expo-dev-client` and cannot use the standard Expo Go app.
> Expo CLI's `npx expo run:ios` has a signing bug that misdetects the Simulator as a physical
> device. Use the `run-ios.sh` script instead.

**First time (or after Simulator erase):**
```bash
# From tappy-pos/mobile/
./run-ios.sh
```
This builds the native app with xcodebuild and installs it on the iPhone 15 Simulator.

**Every day after that:**
```bash
npx expo start
# Then press i to open on the iOS Simulator
```
The app stays installed between sessions — no rebuild needed unless you add a new native package.

**Only re-run `./run-ios.sh` when:**
- You add a new Expo package with native modules
- The Simulator is erased/reset (`Device → Erase All Content and Settings`)
- The app crashes on launch and won't open

### 3. Configure environment
```bash
cp e2e/.env.example e2e/.env
# Edit e2e/.env with real credentials
```

| Variable | Description |
|----------|-------------|
| `SHOP_ID` | Tenant slug (e.g. `my-shop`) |
| `PHONE` | Login phone or username |
| `PASSWORD` | Login password |
| `PRODUCT_NAME` | Name of a seeded product (e.g. `Cà phê sữa`) |
| `NEW_CUSTOMER_PHONE` | Phone for the test customer (use a unique number) |

> **Backend required** — flows 02–04 make real API calls. Run the backend at the dev URL configured in `src/services/api.ts`.

---

## Running flows

All commands run from the `tappy-pos/mobile/` directory.

```bash
# Run a single flow
npm run e2e:auth

# Run the full golden path
npm run e2e:pos

# Run all flows
npm run e2e

# Run a specific file directly (e2e/maestro.sh handles env loading)
e2e/maestro.sh e2e/flows/01_auth.yaml
```

---

## Flow inventory

| File | Tests | Depends on |
|------|-------|-----------|
| `flows/01_auth.yaml` | ShopId error, login error, PIN skip | Backend `/api/auth/login` |
| `flows/02_pos_golden_path.yaml` | Add product → cart → checkout → success | Seeded product (`PRODUCT_NAME`) |
| `flows/03_order_complete_cancel.yaml` | Order detail complete + cancel actions | Flow 02 creates the order |
| `flows/04_customer_crud.yaml` | Create → view → delete customer | Unique `NEW_CUSTOMER_PHONE` |

---

## testID reference

These `testID` props were added to source files for Maestro selectors:

| Screen | testID | Element |
|--------|--------|---------|
| `ShopIdScreen` | `shop-id-input` | Tenant slug TextInput |
| `ShopIdScreen` | `shop-id-submit` | "Tiếp tục" button |
| `ShopIdScreen` | `shop-id-error-not-found` | "Không tìm thấy" error text |
| `ShopIdScreen` | `shop-id-error-network` | Network error text |
| `LoginScreen` | `login-phone` | Phone TextInput |
| `LoginScreen` | `login-password` | Password TextInput |
| `LoginScreen` | `login-submit` | "Đăng nhập" button |
| `LoginScreen` | `login-error` | Inline error text |
| `AppNavigator` | `tab-home` | Dashboard bottom tab button |
| `AppNavigator` | `tab-selling` | Selling bottom tab button |
| `AppNavigator` | `tab-settings` | Settings bottom tab button |
| `DashboardScreen` | `dashboard-customers-btn` | "Khách hàng" quick-access card |
| `POSScreen` | `pos-order-list-btn` | Order history icon button |
| `POSScreen` | `pos-cart-btn` | Cart icon button |
| `POSScreen` | `pos-product-{name}` | Product card (e.g. `pos-product-Cà phê sữa`) |
| `POSScreen` | `pos-cart-count` | Cart item count badge Text |
| `CartScreen` | `qty-plus-{productId}` | Quantity increment button |
| `CheckoutScreen` | `payment-method-{KEY}` | Payment method button (CASH, CARD, BANK_TRANSFER) |
| `OrderSuccessScreen` | `order-success-number` | Order number Text |
| `OrderListScreen` | `order-filter-{STATUS}` | Status filter chip (PENDING, COMPLETED, etc.) |
| `OrderListScreen` | `order-row-{index}` | Order row at given index (0-based) |
| `OrderDetailScreen` | `order-detail-back-btn` | Back arrow button |
| `OrderDetailScreen` | `order-complete-btn` | "Hoàn thành" action button |
| `OrderDetailScreen` | `order-cancel-btn` | "Hủy đơn" action button |
| `CartScreen` | `cart-save-order-btn` | "Lưu đơn" (save as PENDING order) button |
| `SettingsScreen` | `settings-logout-btn` | Logout button (used by E2E subflow to reset auth state) |
| `CustomerListScreen` | `customer-search-input` | Search TextInput |
| `CustomerListScreen` | `customer-row-{index}` | Customer row at given index (0-based) |
| `CustomerListScreen` | `customer-add-fab` | Add customer FAB (+) button |
| `CustomerFormScreen` | `customer-name` | Name TextInput |
| `CustomerFormScreen` | `customer-phone` | Phone TextInput |
| `CustomerFormScreen` | `customer-form-submit` | Submit (add/save) button |
| `CustomerDetailScreen` | `customer-delete-btn` | Delete (trash) icon button |

---

## Troubleshooting

**`maestro test` can't find the app** — make sure the Simulator is running and the app is installed. Run `xcrun simctl list` to see available simulators.

**Flow fails at `assertVisible`** — open Maestro Studio for interactive debugging:
```bash
maestro studio
```

**PIN screen appears unexpectedly** — the `clearState: true` in `_login.yaml` wipes SecureStore. If the app caches state elsewhere (e.g. AsyncStorage), delete the app from the Simulator and reinstall.

**`assertVisible: "Bán hàng"` fails** — the Selling tab is gated by the `POS` or `ORDER` feature flag in the JWT. Ensure the test account has these features assigned.
