import {
  decodeJwt,
  extractFeatures,
  extractTenantId,
  isTokenExpired,
  msUntilExpiry,
} from '../../utils/jwt';

function makeToken(payload: object): string {
  const json = JSON.stringify(payload);
  const b64 = btoa(unescape(encodeURIComponent(json)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return `eyJhbGciOiJIUzI1NiJ9.${b64}.fake_signature`;
}

const futureExp = Math.floor(Date.now() / 1000) + 3600;
const pastExp = Math.floor(Date.now() / 1000) - 3600;

describe('decodeJwt', () => {
  it('decodes a valid JWT', () => {
    const token = makeToken({ sub: 'user-1', features: ['ORDER', 'PRODUCT'] });
    const result = decodeJwt(token);
    expect(result).not.toBeNull();
    expect(result?.sub).toBe('user-1');
    expect(result?.features).toEqual(['ORDER', 'PRODUCT']);
  });

  it('returns null for a token with fewer than 3 parts', () => {
    expect(decodeJwt('only.two')).toBeNull();
  });

  it('returns null for a token with invalid base64 payload', () => {
    expect(decodeJwt('header.!!!invalid!!!.sig')).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(decodeJwt('')).toBeNull();
  });

  it('decodes exp field', () => {
    const token = makeToken({ sub: 'u', exp: futureExp });
    expect(decodeJwt(token)?.exp).toBe(futureExp);
  });
});

describe('extractFeatures', () => {
  it('returns features array from token', () => {
    const token = makeToken({ features: ['ORDER', 'INVENTORY', 'COMBO'] });
    expect(extractFeatures(token)).toEqual(['ORDER', 'INVENTORY', 'COMBO']);
  });

  it('returns empty array when features claim is absent', () => {
    const token = makeToken({ sub: 'user' });
    expect(extractFeatures(token)).toEqual([]);
  });

  it('returns empty array for an invalid token', () => {
    expect(extractFeatures('bad.token')).toEqual([]);
  });
});

describe('extractTenantId', () => {
  it('extracts tenantId from direct claim', () => {
    const token = makeToken({ tenantId: 'shop123' });
    expect(extractTenantId(token)).toBe('shop123');
  });

  it('extracts tenantId from tid array', () => {
    const token = makeToken({ tid: ['shop456'] });
    expect(extractTenantId(token)).toBe('shop456');
  });

  it('ignores master placeholder in tid array', () => {
    const token = makeToken({ tid: ['master'] });
    expect(extractTenantId(token)).toBeNull();
  });

  it('returns null when no tenantId claim exists', () => {
    const token = makeToken({ sub: 'user' });
    expect(extractTenantId(token)).toBeNull();
  });

  it('returns null for invalid token', () => {
    expect(extractTenantId('not.a.jwt')).toBeNull();
  });
});

describe('isTokenExpired', () => {
  it('returns false for a token with future expiry', () => {
    const token = makeToken({ exp: futureExp });
    expect(isTokenExpired(token)).toBe(false);
  });

  it('returns true for a token with past expiry', () => {
    const token = makeToken({ exp: pastExp });
    expect(isTokenExpired(token)).toBe(true);
  });

  it('returns true for a token with no exp claim', () => {
    const token = makeToken({ sub: 'u' });
    expect(isTokenExpired(token)).toBe(true);
  });

  it('returns true for an invalid token', () => {
    expect(isTokenExpired('invalid')).toBe(true);
  });
});

describe('msUntilExpiry', () => {
  it('returns a positive number for a future token', () => {
    const token = makeToken({ exp: futureExp });
    const ms = msUntilExpiry(token);
    expect(ms).toBeGreaterThan(0);
    expect(ms).toBeLessThanOrEqual(3600 * 1000 + 100);
  });

  it('returns a negative or zero number for an expired token', () => {
    const token = makeToken({ exp: pastExp });
    expect(msUntilExpiry(token)).toBeLessThanOrEqual(0);
  });

  it('returns 0 for a token with no exp', () => {
    const token = makeToken({ sub: 'u' });
    expect(msUntilExpiry(token)).toBe(0);
  });
});
