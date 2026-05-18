---
name: tappypos-mobile-typography-system
description: Font scale system (Small/Normal/Large) with 6-tier component categories. Rules for applying useTypography() to screens. Rollout status per screen.
metadata: 
  node_type: memory
  type: project
  originSessionId: 281073e0-78fa-4af6-81e6-e65eec915629
---

## Overview

User-selectable font scale stored in `fontSizeStore` (SecureStore key `fontScale`). Default: `'normal'`. Accessed via `useTypography()` hook which returns a `Typography` object.

**Files:**
- Store: `src/store/fontSizeStore.ts`
- Hook: `src/hooks/useTypography.ts`
- Settings UI: `src/screens/settings/DisplayScreen.tsx` (under "Cỡ chữ" section)
- Hydrated in: `src/navigation/RootNavigator.tsx`

---

## The 6 Tiers

| Tier | Role | Small | Normal | Large |
|---|---|---|---|---|
| `display` | Hero number — one per screen max | 26px | 36px | 48px |
| `heading` | Screen title, major KPI values | `text-lg font-black` 18px | `text-2xl font-black` 24px | `text-4xl font-black` 36px |
| `section` | Sheet/modal titles, card headers | `text-sm font-bold` 14px | `text-lg font-bold` 18px | `text-2xl font-bold` 24px |
| `body` | Primary list data (amounts) | `text-sm font-bold` 14px | `text-base font-bold` 16px | `text-xl font-bold` 20px |
| `label` | Tabs, sub-labels, buttons (semibold) | `text-xs font-semibold` 12px | `text-sm font-semibold` 14px | `text-lg font-semibold` 18px |
| `labelBold` | Item names, strong labels (bold) | `text-xs font-bold` 12px | `text-sm font-bold` 14px | `text-lg font-bold` 18px |
| `caption` | Dates, hints, metadata, subtitles | `text-xs` 12px | `text-sm` 14px | `text-base` 16px |
| `captionBold` | Section headers, uppercase labels | `text-xs font-bold` 12px | `text-sm font-bold` 14px | `text-base font-bold` 16px |

**Why:** Normal scale matches the Report screen design which the user validated as the reference. Small matches the compact style of Order/Expenses screens (pre-typography-system).

---

## Usage Pattern

```tsx
import { useTypography } from '../../hooks/useTypography';

export function SomeScreen() {
  const typo = useTypography();

  return (
    // heading + color classes — typo provides size/weight only
    <Text className={`${typo.heading} text-gray-900 dark:text-white`}>Title</Text>

    // display tier uses style prop (not className) for fontSize
    <Text className="text-white font-black"
          style={{ fontSize: typo.displaySize, lineHeight: typo.displayLineHeight }}>
      {formatVnd(revenue)}
    </Text>

    // captionBold with extra decoration classes
    <Text className={`${typo.captionBold} text-gray-500 uppercase tracking-widest`}>
      SECTION
    </Text>
  );
}
```

**Rules:**
- `typo` provides size + weight only — always append color and spacing classes
- `display` tier: always use `style={{ fontSize: typo.displaySize, lineHeight: typo.displayLineHeight }}` — max one per screen
- Sub-components outside the main component (memo rows, sheets) must call `useTypography()` themselves
- Add `typo` to `useMemo` deps array when it's used inside a memoized block
- Items NOT scaled: status badges (fixed 10px), decorative emojis, flag icons, icon components

---

## Component Tier Mapping (standard)

| Component | Tier |
|---|---|
| Screen title | `heading` |
| Screen subtitle / hint | `caption` |
| Tab labels (Revenue/Expenses) | `labelBold` |
| Period selector tabs | `label` |
| Filter chips | `captionBold` |
| Sheet/modal title | `section` |
| Sheet option rows | `label` |
| Sheet section label (uppercase) | `captionBold` |
| Sheet action button | `labelBold` |
| Active filter indicator label | `caption` |
| Active filter value | `captionBold` |
| Hero KPI amount | `display` |
| Hero KPI sub-label | `label` |
| KPI card value | `heading` |
| KPI card label | `caption` |
| List item name | `labelBold` |
| List item amount | `body` |
| List item date/meta | `caption` |
| Section header (uppercase) | `captionBold` |
| Item count ("12 mục") | `caption` |
| Empty state message | `label` |
| Privacy item title | `labelBold` |
| Privacy item hint | `caption` |
| Nav bar screen title (sub-screen) | `section` |
| Nav bar hint | `caption` |

---

## Screen Rollout Status

### Done ✅
| Screen | File |
|---|---|
| Display Settings | `settings/DisplayScreen.tsx` |
| Report | `main/ReportScreen.tsx` |

### Tier 1 — Core daily (do next) ⬜
| Screen | File |
|---|---|
| Dashboard | `dashboard/DashboardScreen.tsx` |
| Home | `main/HomeScreen.tsx` |
| Selling / POS entry | `main/SellingScreen.tsx` |
| POS Main | `selling/POSMainScreen.tsx` |
| POS Screen | `pos/POSScreen.tsx` |
| Cart | `pos/CartScreen.tsx` |
| Checkout | `pos/CheckoutScreen.tsx` |
| Order List | `orders/OrderListScreen.tsx` |
| Order Detail | `orders/OrderDetailScreen.tsx` |
| Expenses | `main/ExpensesScreen.tsx` |

### Tier 2 — Frequently visited ⬜
| Screen | File |
|---|---|
| Customer List | `customers/CustomerListScreen.tsx` |
| Customer Detail | `customers/CustomerDetailScreen.tsx` |
| Product List | `products/ProductListScreen.tsx` |
| Product Detail | `products/ProductDetailScreen.tsx` |
| Appointment List | `appointment/AppointmentListScreen.tsx` |
| Appointment Detail | `appointment/AppointmentDetailScreen.tsx` |
| More | `more/MoreScreen.tsx` |
| Settings | `settings/SettingsScreen.tsx` |

### Skip (different visual language or low traffic)
- Auth screens (Login, PIN, Register, ForgotPassword)
- Onboarding screens (one-time flow)
- Tools/calculators (low traffic)
- All Form/Edit screens (mostly inputs, not data display)
- Settings sub-screens that are form-heavy

**Why:** The typography system covers ~80% of daily usage with just 20 screens. Form screens have their own fixed layout standard (see [[project_mobile_conventions]]).
**How to apply:** Before implementing any new screen in Tier 1 or 2, apply `useTypography()` from the start. For existing screens, apply screen by screen — user tests after each before moving to next.
