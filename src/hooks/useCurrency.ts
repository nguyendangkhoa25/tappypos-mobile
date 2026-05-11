import { formatVnd } from '../utils/format';

export function useCurrency() {
  return {
    fmt: formatVnd,
    symbol: 'đ',
    currency: 'VND',
  };
}
