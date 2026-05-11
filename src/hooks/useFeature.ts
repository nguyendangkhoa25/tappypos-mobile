import { useAuthStore } from '../store/authStore';

/** Check a single feature */
export function useFeature(featureName: string): boolean {
  return useAuthStore((s) => s.features.includes(featureName));
}

/** Returns a function `has(feature)` — useful in non-hook contexts or loops */
export function useFeatureCheck(): (feature: string) => boolean {
  const features = useAuthStore((s) => s.features);
  return (f: string) => features.includes(f);
}

/** All features must be present */
export function useFeatures(featureNames: string[]): boolean {
  return useAuthStore((s) => featureNames.every((f) => s.features.includes(f)));
}

/** At least one feature must be present */
export function useAnyFeature(featureNames: string[]): boolean {
  return useAuthStore((s) => featureNames.some((f) => s.features.includes(f)));
}

// Default export is useFeatureCheck for AppNavigator usage: `const has = useFeature()`
export { useFeatureCheck as default };
