import { renderHook } from '@testing-library/react-native';
import { useAuthStore } from '../../store/authStore';
import { useFeature, useFeatures, useAnyFeature, useFeatureCheck } from '../../hooks/useFeature';

beforeEach(() => {
  useAuthStore.setState({ features: [] } as any);
});

describe('useFeature', () => {
  it('returns false when features is empty', () => {
    const { result } = renderHook(() => useFeature('ORDER'));
    expect(result.current).toBe(false);
  });

  it('returns true when the feature is present', () => {
    useAuthStore.setState({ features: ['ORDER', 'PRODUCT'] } as any);
    const { result } = renderHook(() => useFeature('ORDER'));
    expect(result.current).toBe(true);
  });

  it('returns false for a feature that is not in the list', () => {
    useAuthStore.setState({ features: ['PRODUCT'] } as any);
    const { result } = renderHook(() => useFeature('ORDER'));
    expect(result.current).toBe(false);
  });

  it('is case-sensitive', () => {
    useAuthStore.setState({ features: ['order'] } as any);
    const { result } = renderHook(() => useFeature('ORDER'));
    expect(result.current).toBe(false);
  });
});

describe('useFeatures', () => {
  it('returns true when all features are present', () => {
    useAuthStore.setState({ features: ['A', 'B', 'C'] } as any);
    const { result } = renderHook(() => useFeatures(['A', 'B']));
    expect(result.current).toBe(true);
  });

  it('returns false when any feature is missing', () => {
    useAuthStore.setState({ features: ['A'] } as any);
    const { result } = renderHook(() => useFeatures(['A', 'B']));
    expect(result.current).toBe(false);
  });

  it('returns true for empty feature array', () => {
    const { result } = renderHook(() => useFeatures([]));
    expect(result.current).toBe(true);
  });
});

describe('useAnyFeature', () => {
  it('returns true when at least one feature is present', () => {
    useAuthStore.setState({ features: ['A'] } as any);
    const { result } = renderHook(() => useAnyFeature(['A', 'B']));
    expect(result.current).toBe(true);
  });

  it('returns false when none of the features are present', () => {
    useAuthStore.setState({ features: ['C'] } as any);
    const { result } = renderHook(() => useAnyFeature(['A', 'B']));
    expect(result.current).toBe(false);
  });

  it('returns false for empty feature array', () => {
    const { result } = renderHook(() => useAnyFeature([]));
    expect(result.current).toBe(false);
  });
});

describe('useFeatureCheck', () => {
  it('returns a function that checks features', () => {
    useAuthStore.setState({ features: ['ORDER'] } as any);
    const { result } = renderHook(() => useFeatureCheck());
    expect(result.current('ORDER')).toBe(true);
    expect(result.current('PRODUCT')).toBe(false);
  });
});
