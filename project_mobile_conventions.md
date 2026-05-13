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

## i18n Rules

**Hard rule: zero hard-coded user-facing strings in any .tsx file.**

```tsx
// WRONG
<Text>Ngày {item.paymentDate} hàng tháng</Text>
placeholder="VD: Cảm ơn quý khách!"
showToast('Đã lưu');

// CORRECT
<Text>{t('settings.defaultExpenses.paymentDateHint', { day: item.paymentDate })}</Text>
placeholder={t('printTemplates.detail.footerPlaceholder')}
showToast(t('common.saved'));
```

Both `en.json` and `vi.json` must always be kept in sync — add keys to both files in the same commit.

**JSON structure gotcha — avoid duplicate keys.**  
JSON allows the same key twice but only the last value is kept. The `auth.login` namespace was duplicated (bug fixed 2026-05-12). Every time you add keys, grep the file for the namespace first:
```bash
grep -n '"login"' src/i18n/locales/en.json   # must appear exactly once inside "auth"
```

**Key namespace map (actual file structure):**

```
common:   loading, retry, error, errorStateTitle, errorStateMsg,
          cancel, confirm, save, close, back, currency,
          saved, datePlaceholder

auth.login:   title, subtitle, phonePlaceholder, passwordPlaceholder,
              loginButton, loading, wrongCredentials, locked, networkError,
              shopLabel, changeShop, subtitleFull, subtitleOnboarding,
              backToShopId, phoneLabel, phoneInputHint, passwordLabel,
              passwordInput, forgotPassword, noAccount, registerLink,
              forceLoginError, unexpectedError, lockedSupport

auth.register:  title, subtitle, phoneLabel, passwordLabel,
                passwordPlaceholder, confirmLabel, confirmPlaceholder,
                passwordsMatch, passwordsNoMatch, tncText, tncLink,
                button, hasAccount, loginLink, loginHere,
                phoneRequired, passwordTooShort, confirmMismatch,
                phoneTaken, error, tncModalTitle, tncAgree, tncContent

printTemplates.detail:  nameLabel, namePlaceholder, contentLabel,
                        footerLabel, footerPlaceholder, footerDefault,
                        previewHint, showLogo, showAddress, showPhone,
                        showQR, showDate, showStaff, showNote

gold:     title, buyPrice, sellPrice, perChi, lastUpdated, history,
          noData, noDataHint, updateTitle, updateDate, updateBuy,
          updateSell, updateNote, updateNotePlaceholder, warnSellLtBuy,
          saveSuccess, buyLabel, sellLabel, datePlaceholder

settings.defaultExpenses:  title, addBtn, hint, empty, emptyHint,
                            deleteTitle, deleteMsg, deleteConfirm,
                            formTitle, nameLabel, namePlaceholder,
                            amountLabel, amountPlaceholder,
                            paymentDateLabel, paymentDatePlaceholder,
                            saveSuccess, deleteSuccess, paymentDateHint
```

Always use interpolation for dynamic values:
```tsx
t('home.greeting', { name: nickname })
t('settings.defaultExpenses.paymentDateHint', { day: item.paymentDate })
t('onboarding.step4.sectionProducts', { count: products.length })
```

**TNC / long legal text:** store in `auth.register.tncContent` (both locales). Never hard-code in component files.

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

## Color Tokens (tappy-pos specific)

- Primary: `#059669` (emerald green) — differentiates from tappy-hu indigo
- Primary light: `#d1fae5`
- Danger: `#ef4444`
- Warning: `#f59e0b`
- Info: `#3b82f6`

Defined in `tailwind.config.js` as `colors.primary`, `colors.danger`, etc.

**Why:** Decisions from tappy-hu review applied to tappy-pos/mobile on 2026-05-10.
**How to apply:** Follow these conventions in every new file added to tappy-pos/mobile.
