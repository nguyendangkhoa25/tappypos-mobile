---
name: TappyPOS Mobile — Coding & Design Conventions
description: Conventions derived from tappy-hu mobile review. Apply to all tappy-pos/mobile implementation work.
type: project
originSessionId: df315ccb-2945-419c-9cbb-2eed88eab878
---
## Source
Reviewed tappy-hu/mobile (Expo 54, NativeWind, React Navigation 7, TanStack Query 5, Zustand 5).
Apply the same patterns unless there is a specific reason to deviate.

---

## File & Folder Conventions

```
src/
├── components/       shared UI (PascalCase filenames)
├── hooks/            custom hooks (use* prefix)
├── i18n/
│   └── locales/      vi.json (primary), en.json
├── navigation/       RootNavigator, AuthNavigator, AppNavigator
├── screens/
│   ├── auth/
│   ├── onboarding/
│   └── main/         (dashboard, pos, orders, products, profile)
├── services/
│   ├── api.ts        single file, domain-grouped
│   └── authSession.ts  force logout registry
├── store/            *Store.ts files
├── types/
│   └── navigation.ts
└── utils/            format.ts, jwt.ts, etc.
```

---

## Naming

| Thing | Convention | Example |
|---|---|---|
| Component file | PascalCase | `ShopTypeScreen.tsx` |
| Hook file | camelCase, `use` prefix | `useFeature.ts` |
| Store file | camelCase, `Store` suffix | `authStore.ts` |
| Constants | UPPER_SNAKE_CASE | `BASE_URL`, `MINIMAL_FEATURES` |
| Types | PascalCase | `AuthStackParamList`, `ApiResp<T>` |
| Props type | local `type Props = {...}` | inside component file |

---

## TypeScript

- Strict mode enabled in tsconfig.json
- Every component has `type Props = {...}`
- API response wrapper: `type ApiResp<T> = { success: boolean; data: T; message: string | null }`
- Screen props: `NativeStackScreenProps<ParamList, ScreenName>` aliased as `AuthScreenProps<'Login'>` etc.
- Never use `any` — use `unknown` and narrow

---

## Import Order

1. React / React Native
2. Third-party (expo-*, @tanstack/*, zustand, etc.)
3. Local: services → types → components → hooks → stores

---

## Zustand Store Pattern

```tsx
type State = { value: string; setValue: (v: string) => Promise<void>; hydrate: () => Promise<void> }

export const useXxxStore = create<State>((set) => ({
  value: '',
  setValue: async (v) => {
    await SecureStore.setItemAsync('key', v);
    set({ value: v });
  },
  hydrate: async () => {
    const v = await SecureStore.getItemAsync('key');
    set({ value: v ?? '' });
  },
}));
```

- Sensitive data → SecureStore
- Booleans stored as string 'true'/'false' in SecureStore
- UI state (modals, toasts) → in-memory only, no persistence
- Onboarding draft → AsyncStorage via `persist` middleware

---

## Alert & Toast — Never use Alert.alert()

```tsx
// WRONG
Alert.alert('Lỗi', 'Không tìm thấy cửa hàng');

// CORRECT
const { show } = useAlertStore();
show('Lỗi', 'Không tìm thấy cửa hàng', [{ label: 'OK' }]);

// Success feedback with undo
const { show: showToast } = useToastStore();
showToast('Đơn hàng đã hoàn thành', () => undoFn());
```

`<FriendlyAlert />` and `<UndoToast />` live at the root of AppNavigator/AuthNavigator and read from their stores.

---

## React Query Conventions

```tsx
// staleTime by data type
staleTime: 5 * 60_000   // static: shop types, categories
staleTime: 60_000        // profile, user data
staleTime: 30_000        // dashboard KPIs
staleTime: 0             // orders, transactions (always fresh)

// Gate on dependency
useQuery({
  queryKey: ['productTemplates', shopTypeCode],
  queryFn: ...,
  enabled: !!shopTypeCode,   // don't run until shopTypeCode set
})

// Invalidate after mutation
queryClient.invalidateQueries({ queryKey: ['orders'] });
```

---

## Dark Mode

Every component uses `dark:` Tailwind class variants:

```tsx
// Cards
className="bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700"

// Text
className="text-gray-900 dark:text-gray-100"
className="text-gray-500 dark:text-gray-400"

// Input
className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100"
```

`tailwind.config.js` must have `darkMode: 'class'` (already set).

---

## Input Components

All input components use `forwardRef` so parent screens can programmatically focus:

```tsx
type Props = Omit<TextInputProps, 'value'> & { value: string; onClear?: () => void }
const ClearableInputInner = forwardRef<TextInput, Props>((props, ref) => ...)
export const ClearableInput = forwardRef(ClearableInputInner);
```

---

## i18n Key Structure

```json
{
  "common": { "back", "error", "retry", "skip", "cancel", "ok", "save", "confirm" },
  "auth": {
    "shopId": { "title", "placeholder", "notFound", "suspended" },
    "login": { "title", "phone", "password", "submit" },
    "register": { "title", "alreadyHaveAccount" },
    "pinSetup": { "title", "subtitle", "confirmTitle" },
    "pinLogin": { "title", "forgotPin", "changeShop" }
  },
  "onboarding": {
    "shopType": { "title", "subtitle" },
    "step1": { "title", "nickname", "fullName", "shopName", "address" },
    "step2": { "title", "subtitle", "addProduct", "goldPrice" },
    "step3": { "title", "subtitle", "addExpense", "suggestions": {...} },
    "step4": { "title", "confirm", "products", "expenses", "collapseMore" }
  },
  "home": { "greeting": "Chào {{name}}!", "revenue", "orders" },
  "pos": {...}, "orders": {...}, "products": {...}, "profile": {...}
}
```

Always use interpolation for dynamic values: `t('home.greeting', { name: nickname })`

---

## Loading / Error / Empty Pattern

```tsx
// Standard screen structure
if (isError) return <ErrorState onRetry={refetch} />;

return (
  <View>
    {isLoading ? (
      <Skeleton height={80} borderRadius={12} />
    ) : !data?.length ? (
      <EmptyState icon="📦" title={t('orders.empty')} />
    ) : (
      <FlatList data={data} ... />
    )}
  </View>
);
```

Every list screen has: skeleton loading state + empty state with icon/message + error state with retry.
Pull-to-refresh on every scrollable list via `RefreshControl` with `tintColor="#059669"`.

---

## Privacy Mode (privacyStore)

Wrap all revenue/amount displays:

```tsx
const isHidden = usePrivacyStore((s) => s.isHidden);
<Text>{isHidden ? '••••••' : formatVnd(revenue)}</Text>
```

Toggle from Profile screen (eye icon). Useful when owner shows phone to customer.

---

## Date / Day Picker Components

Always reuse picker components from `tappy-hu/mobile/src/components/` — never use a bare `TextInput` for date or day input.

| Component | When to use | Source |
|---|---|---|
| `DayPickerModal` | Day-of-month selection (1–31) | `tappy-hu/mobile/src/components/DayPickerModal.tsx` |
| `DatePickerModal` | Full calendar date (YYYY-MM-DD) | `tappy-hu/mobile/src/components/DatePickerModal.tsx` |
| `DatePickerInput` | Inline date input with calendar modal | `tappy-hu/mobile/src/components/DatePickerInput.tsx` |

Copy the component file to `tappy-pos/mobile/src/components/` on first use. No external date library deps — all three components use only React Native primitives.

**Why:** Consistency with tappy-hu UX and avoids raw keyboard number entry for dates, which is error-prone on mobile.
**How to apply:** Any time a screen needs a date or day-of-month field, reach for one of these three components instead of `TextInput`.

---

## Form Screen Standard

All form screens (create/edit) follow this exact pattern. Reference: `CustomerFormScreen.tsx`, `ProductCreateScreen.tsx`, `ProductEditScreen.tsx`.

### Root structure

```tsx
<KeyboardAvoidingView
  className="flex-1 bg-gray-50 dark:bg-gray-900"
  behavior={Platform.OS === 'ios' ? 'padding' : undefined}
>
  {/* Header */}
  <View className="bg-primary px-6 pb-5" style={{ paddingTop: insets.top + 16 }}>
    <View className="flex-row items-center">
      <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <MaterialCommunityIcons name="arrow-left" size={24} color="white" />
      </TouchableOpacity>
      <Text className="text-base font-bold text-white flex-1 mx-3" numberOfLines={1}>{title}</Text>
    </View>
    <Text className="text-xs text-indigo-200 mt-1">{hint}</Text>
  </View>

  <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 16 }} keyboardShouldPersistTaps="handled">
    {/* Section cards go here */}
  </ScrollView>

  {/* Footer — NEVER put Save in the header */}
  <View className="px-4 pt-3 bg-gray-50 dark:bg-gray-900" style={{ paddingBottom: insets.bottom + 16 }}>
    <TouchableOpacity
      onPress={handleSave}
      disabled={isPending}
      className={`rounded-2xl py-4 items-center ${isPending ? 'bg-gray-300 dark:bg-gray-600' : 'bg-primary'}`}
    >
      {isPending ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-bold text-base">{t('common.save')}</Text>}
    </TouchableOpacity>
  </View>
</KeyboardAvoidingView>
```

### Section cards

```tsx
<View className="bg-white dark:bg-gray-800 rounded-2xl p-4 mb-4 border border-gray-100 dark:border-gray-700">
  <SectionHeader icon="information-outline" title={t('...')} />
  <FormField label={`${t('...')} *`}>
    <TextInput className="border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-3 bg-white dark:bg-gray-700 text-base text-gray-900 dark:text-white" placeholderTextColor="#9ca3af" {...props} />
  </FormField>
</View>
```

### Helper components (defined locally in each screen)

```tsx
function SectionHeader({ icon, title }: { icon: ...; title: string }) {
  return (
    <View className="flex-row items-center mb-3 mt-1">
      <MaterialCommunityIcons name={icon} size={15} color="#6b7280" style={{ marginRight: 6 }} />
      <Text className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{title}</Text>
    </View>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="mb-4">
      <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{label}</Text>
      {children}
    </View>
  );
}
```

### Standard input class

```
border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-3 bg-white dark:bg-gray-700 text-base text-gray-900 dark:text-white
```

Multiline inputs: add `text-sm` and `style={{ textAlignVertical: 'top', minHeight: 72 }}`.

### Rules

- **Save button always in footer**, never in header. Header has only back + title + hint.
- ScrollView: `contentContainerStyle={{ paddingBottom: 16 }}` — no horizontal padding; section cards are edge-to-edge.
- Each section card gets a `SectionHeader` with a `MaterialCommunityIcons` icon.
- Input background is `bg-white dark:bg-gray-700`, **not** `bg-gray-50 dark:bg-gray-700`.
- `px-3` on inputs, **not** `px-4`.
- Suffix/prefix boxes inside inputs (e.g. unit label): `bg-gray-50 dark:bg-gray-600 border-l border-gray-200 dark:border-gray-600`.
- Bottom sheet modals: `bg-white dark:bg-gray-800 rounded-t-3xl`.
- Add i18n keys for all `SectionHeader` titles under the feature namespace (e.g. `combos.sectionInfo`, `products.sectionType`).

**Why:** Established 2026-05-17 after restyling CustomerFormScreen, ProductCreateScreen, ProductEditScreen as reference screens, then applying the standard to ComboEditScreen, PawnFormScreen, AppointmentFormScreen, StaffFormScreen.

---

## Typography System

All content screens must use `useTypography()` instead of hardcoded Tailwind font-size classes.

```tsx
import { useTypography } from '../../hooks/useTypography';

const typo = useTypography();

// Use typo.X for size+weight; append color/spacing separately
<Text className={`${typo.heading} text-gray-900 dark:text-white`}>Title</Text>
<Text className={`${typo.caption} text-gray-500 dark:text-gray-400 mt-0.5`}>Hint</Text>

// display tier uses style prop
<Text className="text-white font-black"
      style={{ fontSize: typo.displaySize, lineHeight: typo.displayLineHeight }}>
  {formatVnd(revenue)}
</Text>
```

**6 tiers:** `display` (hero number), `heading` (title/KPI), `section` (modal title), `body` (amounts), `label`/`labelBold` (tabs/names/buttons), `caption`/`captionBold` (metadata/hints/section headers).

**3 scales:** Small (compact) / Normal (default, Report screen style) / Large (accessibility).

**Sub-components** that are defined outside the main component (e.g. `memo` rows, sheet components) must call `useTypography()` themselves — it cannot be passed as a prop.

**useMemo:** always add `typo` to the deps array when `typo` is used inside a memoized block.

**Fixed / never scaled:** status badges (10px), decorative emojis, flag icons, MaterialCommunityIcons.

**Rollout scope:** Tier 1 + Tier 2 screens only. Auth, Onboarding, Tools, Form/Edit screens are excluded.

See [[project_mobile_typography]] for full scale values, component-to-tier mapping, and screen rollout status.

**Why:** Established 2026-05-17 after validating the Report screen design as the "Normal" reference. The feature is US-169.

---

## Number Formatting Rules

All number display in the app must go through these functions from `src/utils/format.ts`:

| Function | Use for | Separator | Example |
|---|---|---|---|
| `formatVnd(amount)` | VND currency amounts | thousands: `.` · decimal: `,` (vi-VN) | `15.000.000 ₫` |
| `formatDecimal(value, decimals?)` | Weights, quantities, rates, any decimal number | thousands: `,` · decimal: `.` (en-US) | `1.2`, `0.32`, `1,234.57` |
| `formatMoney(amount, currency?)` | Multi-currency display with symbol | `,` for foreign, `.` for VND | `$1,234`, `25.000 đ` |

### Rules

- **Never** use `toLocaleString('vi-VN')` directly on a non-currency number — it produces `,` as decimal separator which is wrong for weights/quantities.
- **Never** hardcode `.toFixed(n)` for display — use `formatDecimal(value, n)` instead so thousands separators are included.
- **VND currency** (`formatVnd`): always integer, always has `₫` suffix. Never pass a decimal VND value.
- **Decimal numbers** (`formatDecimal`): weights (`chỉ`, `gram`, `kg`), quantities, percentages, exchange rates. Uses `.` as decimal separator so `1.2 chỉ` is unambiguous.
- **TextInput for decimal input**: always use `keyboardType="decimal-pad"` so the `.` key is visible on the keyboard.

### Usage examples

```tsx
import { formatVnd, formatDecimal } from '../../utils/format';

// VND price
<Text>{formatVnd(15_000_000)}</Text>           // → 15.000.000 ₫

// Gold weight
<Text>{formatDecimal(1.2)} chỉ</Text>          // → 1.2 chỉ
<Text>{formatDecimal(0.32)} chỉ</Text>         // → 0.32 chỉ

// Fixed decimal places
<Text>{formatDecimal(weight, 2)} chỉ</Text>    // → 1.20 chỉ

// Large decimal
<Text>{formatDecimal(1234.567, 2)}</Text>      // → 1,234.57
```

**Why:** Established 2026-05-18. Vietnamese locale uses `,` as decimal separator which is confusing for weight/quantity inputs (e.g. `1,2 chỉ` looks like a thousands-separated integer). Using `en-US` for non-currency decimals avoids ambiguity.
**How to apply:** Any new screen or component that displays a non-currency number with potential decimal places must use `formatDecimal`. Any new screen displaying VND must use `formatVnd`.

---

## Color Tokens (tappy-pos specific)

- Primary: `#059669` (emerald green) — differentiates from tappy-hu indigo
- Primary light: `#d1fae5`
- Danger: `#ef4444`
- Warning: `#f59e0b`
- Info: `#3b82f6`

Defined in `tailwind.config.js` as `colors.primary`, `colors.danger`, etc.

**Why:** Decisions from tappy-hu review applied to tappy-pos/mobile on 2026-05-10.
**How to apply:** Follow these conventions in every new file added to tappy-pos/mobile.
