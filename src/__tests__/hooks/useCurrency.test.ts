import { renderHook } from '@testing-library/react-native';
import { useCurrency } from '../../hooks/useCurrency';

describe('useCurrency', () => {
  it('returns fmt function that formats VND', () => {
    const { result } = renderHook(() => useCurrency());
    expect(result.current.fmt(1000)).toMatch(/₫/);
  });

  it('returns đ symbol', () => {
    const { result } = renderHook(() => useCurrency());
    expect(result.current.symbol).toBe('đ');
  });

  it('returns VND as currency code', () => {
    const { result } = renderHook(() => useCurrency());
    expect(result.current.currency).toBe('VND');
  });

  it('fmt returns 0 ₫ for null', () => {
    const { result } = renderHook(() => useCurrency());
    expect(result.current.fmt(null)).toBe('0 ₫');
  });
});
