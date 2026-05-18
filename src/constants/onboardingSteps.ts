export type OnboardingStep =
  | 'SHOP_INFO'
  | 'PAWN_FEATURE'
  | 'PAWN_TYPES'
  | 'PAWN_INTEREST'
  | 'PRODUCT_SETUP'
  | 'TABLE_SETUP'
  | 'EXPENSE_SETUP'
  | 'REVIEW';

export const STEP_SCREEN: Record<OnboardingStep, string> = {
  SHOP_INFO:     'Step1',
  PAWN_FEATURE:  'PawnFeature',
  PAWN_TYPES:    'Step2',
  PAWN_INTEREST: 'PawnInterest',
  PRODUCT_SETUP: 'Step2',
  TABLE_SETUP:   'TableSetup',
  EXPENSE_SETUP: 'Step3',
  REVIEW:        'Step4',
};

// Pawn shops: always have pawn — ask for types + interest directly
const PAWN_CODES    = new Set(['PAWN_SHOP']);
// Jewelry shops: ask YES/NO first, then conditionally configure
const JEWELRY_CODES = new Set(['JEWELRY']);
const FNB_CODES     = new Set([
  'RESTAURANT', 'COFFEE_SHOP', 'FOOD_BEVERAGE',
  'PUB', 'PUB_SEAFOOD', 'PUB_GOAT', 'PUB_BEEF',
]);

const FNB_STEPS:     OnboardingStep[] = ['SHOP_INFO', 'PRODUCT_SETUP', 'TABLE_SETUP', 'EXPENSE_SETUP', 'REVIEW'];
const PAWN_STEPS:    OnboardingStep[] = ['SHOP_INFO', 'PAWN_TYPES', 'PAWN_INTEREST', 'EXPENSE_SETUP', 'REVIEW'];
// PAWN_FEATURE gate is listed even though YES/NO skips PAWN_TYPES + PAWN_INTEREST dynamically
const JEWELRY_STEPS: OnboardingStep[] = ['SHOP_INFO', 'PAWN_FEATURE', 'PAWN_TYPES', 'PAWN_INTEREST', 'EXPENSE_SETUP', 'REVIEW'];
const DEFAULT_STEPS: OnboardingStep[] = ['SHOP_INFO', 'PRODUCT_SETUP', 'EXPENSE_SETUP', 'REVIEW'];

export function getOnboardingSteps(backendCode: string | null | undefined): OnboardingStep[] {
  if (!backendCode) return DEFAULT_STEPS;
  if (PAWN_CODES.has(backendCode))    return PAWN_STEPS;
  if (JEWELRY_CODES.has(backendCode)) return JEWELRY_STEPS;
  if (FNB_CODES.has(backendCode))     return FNB_STEPS;
  return DEFAULT_STEPS;
}
