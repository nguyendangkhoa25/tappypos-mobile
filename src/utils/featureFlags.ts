// Feature flags — controlled via EXPO_PUBLIC_* env vars.
// Set to 'true' (string) in .env to enable; defaults to false.

export const VOICE_ORDER_ENABLED =
  process.env.EXPO_PUBLIC_VOICE_ORDER_ENABLED === 'true';

export const VOICE_EXPENSE_ENABLED =
  process.env.EXPO_PUBLIC_VOICE_EXPENSE_ENABLED === 'true';
