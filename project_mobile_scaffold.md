---
name: TappyPOS Mobile Scaffold
description: Mobile app scaffold created for tappy-pos at tappy-pos/mobile/. Expo 54, NativeWind, React Navigation 7, TanStack Query 5, Zustand.
type: project
originSessionId: df315ccb-2945-419c-9cbb-2eed88eab878
---
tappy-pos/mobile/ was scaffolded from scratch (43 files) modelled on tappy-hu/mobile.

**Why:** Owner needs mobile access to dashboard, POS, orders, and products when not at desk.

**Stack:** Expo 54 managed, NativeWind (Tailwind for RN), React Navigation 7 (stack + bottom tabs), TanStack Query 5, Zustand (authStore + cartStore), Axios with X-Tenant-ID interceptor, expo-secure-store for tokens.

**Primary color:** #059669 (emerald green) — differentiated from tappy-hu's indigo.

**SecureStore keys:** `access_token`, `refresh_token`, `phone`, `tenant_id`, `pin_enabled`, `biometric_enabled`, `language`

**Auth flow:**
- First login → phone+password → tokens passed as PinSetup params → PIN setup (or skip) → setAuthenticated → app
- Return visits with PIN → PinLoginScreen → PIN or biometric → authApi.loginWithPin or refresh token
- ForgotPin → re-verify password → new PIN setup

**Feature-gated tabs:** DASHBOARD→Home, POS→POS, ORDER→Orders, PRODUCT→Products; Profile always shown. Features decoded from JWT by extractFeatures(accessToken) in authStore.setAuthenticated.

**Backend changes still needed for mobile** (beyond spec's refreshInBody):
1. `POST /auth/login`: add `refreshInBody` field to LoginRequest + skip Turnstile when `refreshInBody=true` (mobile can't render Turnstile widgets)
2. `POST /auth/refresh`: also accept `{ refreshToken }` in request body when no HttpOnly cookie
3. New endpoints: `POST /auth/phone-pin` (PIN login) and `POST /auth/pin/setup` (store PIN)

**To install and run:**
```bash
cd tappy-pos/mobile
cp .env.example .env
# Edit .env: set EXPO_PUBLIC_API_URL to your local IP
npm install
npx expo start
```

**Assets needed:** Create placeholder images in tappy-pos/mobile/assets/: icon.png, splash-icon.png, adaptive-icon.png, favicon.png.

**How to apply:** Read this for scaffold file locations. For the full implementation plan (registration, onboarding, store architecture) read `project_mobile_plan.md`. For coding conventions read `project_mobile_conventions.md`.
