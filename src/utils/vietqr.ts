export function buildVietQrUrl(
  bank: string,
  accountNumber: string,
  accountName: string,
  amount: number,
  description = 'Thanh toan',
): string {
  const base = `https://img.vietqr.io/image/${bank}-${accountNumber}-compact2.png`;
  const params: string[] = [];
  if (accountName) params.push(`accountName=${encodeURIComponent(accountName)}`);
  if (amount > 0) params.push(`amount=${Math.round(amount)}`);
  if (description) params.push(`addInfo=${encodeURIComponent(description)}`);
  return params.length ? `${base}?${params.join('&')}` : base;
}
