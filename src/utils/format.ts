export function formatVnd(amount: number | null | undefined): string {
  if (amount == null) return '0 ₫';
  return amount.toLocaleString('vi-VN') + ' ₫';
}

/**
 * Format a decimal number using "," as thousands separator and "." as decimal separator.
 * e.g. formatDecimal(1.2) → "1.2"
 *      formatDecimal(0.32) → "0.32"
 *      formatDecimal(1234.567, 2) → "1,234.57"
 * Use for weight (chỉ, gram), quantities, rates — anything with decimal places.
 */
export function formatDecimal(value: number | null | undefined, decimals?: number): string {
  if (value == null) return '—';
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals ?? 4,
  });
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  // Parse YYYY-MM-DD manually to avoid timezone/engine quirks in React Native
  const parts = iso.split('T')[0].split('-').map(Number);
  if (parts.length < 3 || parts.some(isNaN)) return '—';
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  return d.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function maskPhone(phone: string): string {
  if (phone.length < 6) return phone;
  return phone.slice(0, 3) + ' **** ' + phone.slice(-3);
}

// ── Number-to-words (ported from tappy-hu) ────────────────────────────────────

const VI_UNITS = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

function readViTens(n: number): string {
  const t = Math.floor(n / 10);
  const u = n % 10;
  if (n < 20) return 'mười' + (u > 0 ? ' ' + (u === 5 ? 'lăm' : VI_UNITS[u]) : '');
  return VI_UNITS[t] + ' mươi' + (u > 0 ? ' ' + (u === 1 ? 'mốt' : u === 5 ? 'lăm' : VI_UNITS[u]) : '');
}

function readViHundreds(n: number): string {
  if (n < 10) return VI_UNITS[n];
  if (n < 100) return readViTens(n);
  const h = Math.floor(n / 100);
  const rem = n % 100;
  if (rem === 0) return VI_UNITS[h] + ' trăm';
  if (rem < 10) return VI_UNITS[h] + ' trăm lẻ ' + VI_UNITS[rem];
  return VI_UNITS[h] + ' trăm ' + readViTens(rem);
}

function numberToWordsVi(n: number): string {
  if (!n || n === 0) return '';
  const safe   = Math.floor(Math.abs(n));
  const ty     = Math.floor(safe / 1_000_000_000);
  const trieu  = Math.floor((safe % 1_000_000_000) / 1_000_000);
  const ngan   = Math.floor((safe % 1_000_000) / 1_000);
  const rem    = safe % 1_000;
  const parts: string[] = [];
  if (ty > 0)    parts.push(readViHundreds(ty) + ' tỷ');
  if (trieu > 0) parts.push(readViHundreds(trieu) + ' triệu');
  if (ngan > 0)  parts.push(readViHundreds(ngan) + ' ngàn');
  if (rem > 0) {
    if (parts.length > 0 && rem < 100) parts.push('lẻ ' + readViTens(rem));
    else parts.push(readViHundreds(rem));
  }
  const text = parts.join(' ') + ' đồng';
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const EN_ONES = [
  '', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen',
  'sixteen', 'seventeen', 'eighteen', 'nineteen',
];
const EN_TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

function readEnBelow1000(n: number): string {
  if (n < 20) return EN_ONES[n];
  if (n < 100) {
    const tens = Math.floor(n / 10);
    const units = n % 10;
    return EN_TENS[tens] + (units > 0 ? '-' + EN_ONES[units] : '');
  }
  const h = Math.floor(n / 100);
  const rem = n % 100;
  return EN_ONES[h] + ' hundred' + (rem > 0 ? ' ' + readEnBelow1000(rem) : '');
}

function numberToWordsEn(n: number): string {
  if (!n || n === 0) return '';
  const safe     = Math.floor(Math.abs(n));
  const billion  = Math.floor(safe / 1_000_000_000);
  const million  = Math.floor((safe % 1_000_000_000) / 1_000_000);
  const thousand = Math.floor((safe % 1_000_000) / 1_000);
  const rem      = safe % 1_000;
  const parts: string[] = [];
  if (billion > 0)  parts.push(readEnBelow1000(billion) + ' billion');
  if (million > 0)  parts.push(readEnBelow1000(million) + ' million');
  if (thousand > 0) parts.push(readEnBelow1000(thousand) + ' thousand');
  if (rem > 0)      parts.push(readEnBelow1000(rem));
  const text = parts.join(' ') + ' VND';
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Convert a number to spoken words. Useful for receipt amount-in-words line. */
export function numberToWords(n: number, lang?: string): string {
  return lang === 'en' ? numberToWordsEn(n) : numberToWordsVi(n);
}

// ── Multi-currency formatting (ported from tappy-hu) ─────────────────────────

const INTL_CURRENCIES = new Set(['USD', 'EUR', 'SGD', 'JPY', 'KRW']);

export function getCurrencySymbol(currency?: string): string {
  switch (currency?.toUpperCase()) {
    case 'USD': return '$';
    case 'EUR': return '€';
    case 'SGD': return 'S$';
    case 'JPY': return '¥';
    case 'KRW': return '₩';
    default:    return 'đ';
  }
}

/** Format a raw digit string with locale-appropriate thousands separators (for input display). */
export function formatMoneyDisplay(rawDigits: string, currency?: string): string {
  if (!rawDigits) return '';
  const sep = currency && INTL_CURRENCIES.has(currency.toUpperCase()) ? ',' : '.';
  return rawDigits.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
}

/** Format a number as a display amount with currency symbol. Defaults to VND. */
export function formatMoney(amount: number, currency?: string): string {
  const rounded = Math.round(amount);
  if (currency && INTL_CURRENCIES.has(currency.toUpperCase())) {
    const sym = getCurrencySymbol(currency);
    return sym + rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
  return rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' đ';
}
