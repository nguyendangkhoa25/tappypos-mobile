import {
  formatVnd,
  formatDate,
  formatDateTime,
  maskPhone,
  formatMoneyDisplay,
  numberToWords,
  getCurrencySymbol,
  formatMoney,
} from '../../utils/format';

describe('formatVnd', () => {
  it('returns 0 ₫ for null', () => {
    expect(formatVnd(null)).toBe('0 ₫');
  });

  it('returns 0 ₫ for undefined', () => {
    expect(formatVnd(undefined)).toBe('0 ₫');
  });

  it('returns 0 ₫ for zero', () => {
    expect(formatVnd(0)).toBe('0 ₫');
  });

  it('appends ₫ symbol', () => {
    expect(formatVnd(1000)).toMatch(/₫$/);
  });

  it('formats large amounts with thousand separators', () => {
    const result = formatVnd(1500000);
    expect(result).toMatch(/1[.,]500[.,]000/);
    expect(result).toMatch(/₫$/);
  });

  it('formats negative amounts', () => {
    expect(formatVnd(-500)).toMatch(/₫$/);
  });
});

describe('formatDate', () => {
  it('formats ISO date string to dd/MM/yyyy', () => {
    const result = formatDate('2024-03-15');
    expect(result).toContain('15');
    expect(result).toContain('03');
    expect(result).toContain('2024');
  });

  it('contains all date components', () => {
    const result = formatDate('2024-12-01');
    expect(result).toContain('01');
    expect(result).toContain('12');
    expect(result).toContain('2024');
  });
});

describe('formatDateTime', () => {
  it('contains date and time parts', () => {
    const result = formatDateTime('2024-03-15T14:30:00.000Z');
    expect(result).toContain('2024');
    expect(result).toMatch(/\d{2}:\d{2}/);
  });
});

describe('maskPhone', () => {
  it('leaves short phone unchanged', () => {
    expect(maskPhone('012')).toBe('012');
    expect(maskPhone('01234')).toBe('01234');
  });

  it('masks middle digits of a normal phone number', () => {
    const result = maskPhone('0901234567');
    expect(result.startsWith('090')).toBe(true);
    expect(result.endsWith('567')).toBe(true);
    expect(result).toContain('****');
  });

  it('preserves first 3 and last 3 characters', () => {
    const result = maskPhone('0123456789');
    expect(result.slice(0, 3)).toBe('012');
    expect(result.slice(-3)).toBe('789');
  });
});

describe('formatMoneyDisplay', () => {
  it('returns empty string for empty input', () => {
    expect(formatMoneyDisplay('')).toBe('');
  });

  it('formats a number with thousands separator dots (VND)', () => {
    expect(formatMoneyDisplay('1500000')).toBe('1.500.000');
  });

  it('formats single digit without separator', () => {
    expect(formatMoneyDisplay('5')).toBe('5');
  });

  it('formats thousands', () => {
    expect(formatMoneyDisplay('1000')).toBe('1.000');
  });

  it('uses comma separator for USD', () => {
    expect(formatMoneyDisplay('1500000', 'USD')).toBe('1,500,000');
  });
});

describe('numberToWords', () => {
  it('returns empty string for 0', () => {
    expect(numberToWords(0)).toBe('');
  });

  it('returns a non-empty string for positive numbers', () => {
    expect(numberToWords(1000)).not.toBe('');
  });

  it('contains ngàn for thousands in Vietnamese', () => {
    expect(numberToWords(5000, 'vi').toLowerCase()).toContain('ngàn');
  });

  it('contains triệu for millions in Vietnamese', () => {
    expect(numberToWords(2000000, 'vi').toLowerCase()).toContain('triệu');
  });

  it('contains VND for English mode', () => {
    expect(numberToWords(1000, 'en').toUpperCase()).toContain('VND');
  });

  it('contains thousand for English thousands', () => {
    expect(numberToWords(5000, 'en').toLowerCase()).toContain('thousand');
  });
});

describe('getCurrencySymbol', () => {
  it('returns ₫ for undefined', () => {
    expect(getCurrencySymbol()).toBe('đ');
  });

  it('returns $ for USD', () => {
    expect(getCurrencySymbol('USD')).toBe('$');
  });

  it('returns € for EUR', () => {
    expect(getCurrencySymbol('EUR')).toBe('€');
  });

  it('returns ₩ for KRW', () => {
    expect(getCurrencySymbol('KRW')).toBe('₩');
  });
});

describe('formatMoney', () => {
  it('formats VND by default with đ suffix', () => {
    expect(formatMoney(1500000)).toMatch(/đ$/);
  });

  it('formats USD with $ prefix', () => {
    expect(formatMoney(1500, 'USD')).toMatch(/^\$/);
  });

  it('rounds fractional amounts', () => {
    const result = formatMoney(100.6);
    expect(result).toContain('101');
  });
});
