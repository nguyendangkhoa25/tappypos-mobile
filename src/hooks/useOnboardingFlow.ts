import { useOnboardingStore } from '../store/onboardingStore';
import { getBackendCode } from '../utils/shopTypes';
import { getOnboardingSteps, STEP_SCREEN, type OnboardingStep } from '../constants/onboardingSteps';

export function useOnboardingFlow() {
  const shopTypeCode = useOnboardingStore((s) => s.shopTypeCode);
  const backendCode = getBackendCode(shopTypeCode);
  const steps = getOnboardingSteps(backendCode);
  const totalSteps = steps.length;

  const getStepIndex = (step: OnboardingStep): number => steps.indexOf(step);

  const getNextScreen = (step: OnboardingStep): string | null => {
    const idx = steps.indexOf(step);
    if (idx < 0 || idx >= steps.length - 1) return null;
    return STEP_SCREEN[steps[idx + 1]];
  };

  return { totalSteps, backendCode, steps, getStepIndex, getNextScreen };
}
