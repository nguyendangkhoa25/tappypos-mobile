# CLAUDE.md — TappyPOS Mobile

React Native (Expo SDK 54) mobile app for TappyPOS. Targets iOS and Android.

## Quick Commands

```bash
# Start Metro bundler (Expo Go / dev client)
npx expo start

# Run on iOS simulator
npx expo run:ios

# Run on Android emulator
npx expo run:android

# TypeScript check (required before marking any task complete)
npx tsc --noEmit

# Unit tests
npm test
npm run test:coverage
```

## iOS Deployment (TestFlight)

### Every release — 2 commands only

```bash
# 1. Build in EAS cloud (~10-15 min, free tier)
eas build --platform ios --profile production

# 2. Submit to TestFlight (auto-uploads the latest build)
eas submit --platform ios --latest
```

After submit, testers open the **TestFlight** app on their iPhone and tap **Update**.

### Key config

| Field | Value |
|-------|-------|
| Bundle ID | `com.knp.tappypos` |
| Apple Team | `JANRX6WR5A` (Khoa Nguyen Individual) |
| EAS Project ID | `168f3eaa-01dd-4c17-8a08-19f4648c757e` |
| App Store Connect App ID | `6770521683` |
| EAS account | `nguyendangkhoa25` |

EAS credentials (Distribution Certificate + Provisioning Profile) are stored in Expo cloud — no local keychain setup needed.

### Adding testers

**Internal testers** (team members — no review wait):
1. [appstoreconnect.apple.com/users](https://appstoreconnect.apple.com/users) → invite with Developer role
2. TestFlight → Internal Testing → add their email

**External testers** (anyone else):
- TestFlight → External Testing group → add email
- First build requires Apple beta review (~1-2 days); subsequent builds go straight through

## API Connection

Production: `https://tappypos.vn/api` (set in `src/services/api.ts` as `BASE_URL` default)

Override for local dev: create `.env.local` with:
```
EXPO_PUBLIC_API_URL=http://YOUR_LOCAL_IP:6868/api
```

## Project Structure

```
src/
  screens/       # One file per screen
  components/    # Shared UI components
  services/      # api.ts (Axios + interceptors), authSession.ts
  store/         # Zustand stores
  hooks/         # React Query hooks per domain
  i18n/          # Vietnamese (vi) + English (en) translations
  utils/         # Constants, formatters, helpers
e2e/             # Maestro flow files
```

## iOS Entitlements

`ios/TappyPOS/TappyPOS.entitlements` — current active entitlements:
- `aps-environment: production` — push notifications
- `com.apple.developer.applesignin: [Default]` — Sign in with Apple

`keychain-access-groups` was intentionally removed (not needed for `expo-secure-store`; was causing provisioning profile mismatch).

## Key Decisions

- **NativeWind v4** for styling (Tailwind classes in JSX)
- **React Query v5** for all server state; `keepPreviousData` pattern via `placeholderData`
- **Zustand** for client-only state (auth session, network, cart)
- **expo-secure-store** for token storage (replaces AsyncStorage for sensitive data)
- **i18next** for i18n; default locale `vi`, falls back to `en`
- `RefreshControl` uses a separate manual boolean state — never `isRefetching` from a `keepPreviousData` query (causes spinner to never dismiss)
