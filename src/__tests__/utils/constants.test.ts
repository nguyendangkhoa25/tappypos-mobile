import { SHOP_TYPES, SUPPORT, APP_STORE_URL, PLAY_STORE_URL, JEWELRY_SHOP_TYPE_CODE } from '../../utils/constants';

describe('SHOP_TYPES', () => {
  it('has at least one entry', () => {
    expect(SHOP_TYPES.length).toBeGreaterThan(0);
  });

  it('every entry has required fields', () => {
    for (const st of SHOP_TYPES) {
      expect(typeof st.code).toBe('string');
      expect(typeof st.name).toBe('string');
      expect(typeof st.emoji).toBe('string');
      expect(typeof st.tenantPrefix).toBe('string');
    }
  });

  it('has an OTHER fallback type', () => {
    expect(SHOP_TYPES.some((s) => s.code === 'OTHER')).toBe(true);
  });

  it('JEWELRY_SHOP_TYPE_CODE matches an entry', () => {
    expect(SHOP_TYPES.some((s) => s.code === JEWELRY_SHOP_TYPE_CODE)).toBe(true);
  });

  it('all codes are unique', () => {
    const codes = SHOP_TYPES.map((s) => s.code);
    expect(new Set(codes).size).toBe(codes.length);
  });
});

describe('SUPPORT', () => {
  it('has a phone number', () => {
    expect(typeof SUPPORT.phone).toBe('string');
    expect(SUPPORT.phone.length).toBeGreaterThan(0);
  });

  it('has an email', () => {
    expect(SUPPORT.email).toMatch(/@/);
  });

  it('has a website URL', () => {
    expect(SUPPORT.website).toMatch(/^https?:\/\//);
  });
});

describe('store URLs', () => {
  it('APP_STORE_URL starts with https', () => {
    expect(APP_STORE_URL).toMatch(/^https:\/\//);
  });

  it('PLAY_STORE_URL starts with https', () => {
    expect(PLAY_STORE_URL).toMatch(/^https:\/\//);
  });
});
