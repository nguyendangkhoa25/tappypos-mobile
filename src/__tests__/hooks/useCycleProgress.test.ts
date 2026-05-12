import { renderHook } from '@testing-library/react-native';
import { useCycleProgress } from '../../hooks/useCycleProgress';

describe('useCycleProgress — no dates', () => {
  it('returns todayLabel as a non-empty string', () => {
    const { result } = renderHook(() => useCycleProgress());
    expect(typeof result.current.todayLabel).toBe('string');
    expect(result.current.todayLabel.length).toBeGreaterThan(0);
  });

  it('returns null cycleLabel when no dates provided', () => {
    const { result } = renderHook(() => useCycleProgress());
    expect(result.current.cycleLabel).toBeNull();
  });

  it('returns -1 daysLeft when no dates provided', () => {
    const { result } = renderHook(() => useCycleProgress());
    expect(result.current.daysLeft).toBe(-1);
  });

  it('returns null progress when no dates provided', () => {
    const { result } = renderHook(() => useCycleProgress());
    expect(result.current.progress).toBeNull();
  });
});

describe('useCycleProgress — with dates', () => {
  const today = new Date();
  const futureEnd = new Date(today);
  futureEnd.setDate(today.getDate() + 30);

  const pastStart = new Date(today);
  pastStart.setDate(today.getDate() - 60);
  const pastEnd = new Date(today);
  pastEnd.setDate(today.getDate() - 1);

  function fmt(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  it('returns a cycleLabel string', () => {
    const start = fmt(pastStart);
    const end = fmt(futureEnd);
    const { result } = renderHook(() => useCycleProgress(start, end));
    expect(typeof result.current.cycleLabel).toBe('string');
    expect(result.current.cycleLabel!.includes('–')).toBe(true);
  });

  it('returns positive daysLeft for a future end date', () => {
    const start = fmt(pastStart);
    const end = fmt(futureEnd);
    const { result } = renderHook(() => useCycleProgress(start, end));
    expect(result.current.daysLeft).toBeGreaterThan(0);
  });

  it('returns -1 daysLeft when period has ended', () => {
    const start = fmt(pastStart);
    const end = fmt(pastEnd);
    const { result } = renderHook(() => useCycleProgress(start, end));
    expect(result.current.daysLeft).toBe(-1);
  });

  it('returns progress between 0 and 1 for active period', () => {
    const start = fmt(pastStart);
    const end = fmt(futureEnd);
    const { result } = renderHook(() => useCycleProgress(start, end));
    expect(result.current.progress).toBeGreaterThan(0);
    expect(result.current.progress!).toBeLessThanOrEqual(1);
  });

  it('returns progress of 1 for a fully elapsed period', () => {
    const start = fmt(pastStart);
    const end = fmt(pastEnd);
    const { result } = renderHook(() => useCycleProgress(start, end));
    expect(result.current.progress).toBe(1);
  });
});
