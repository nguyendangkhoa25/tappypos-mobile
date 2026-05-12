describe('featureFlags', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
    jest.resetModules();
  });

  it('VOICE_ORDER_ENABLED is false when env var is absent', () => {
    process.env = { ...originalEnv, EXPO_PUBLIC_VOICE_ORDER_ENABLED: undefined };
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { VOICE_ORDER_ENABLED } = require('../../utils/featureFlags');
    expect(VOICE_ORDER_ENABLED).toBe(false);
  });

  it('VOICE_ORDER_ENABLED is true when env var is "true"', () => {
    process.env = { ...originalEnv, EXPO_PUBLIC_VOICE_ORDER_ENABLED: 'true' };
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { VOICE_ORDER_ENABLED } = require('../../utils/featureFlags');
    expect(VOICE_ORDER_ENABLED).toBe(true);
  });

  it('VOICE_EXPENSE_ENABLED is false when env var is absent', () => {
    process.env = { ...originalEnv, EXPO_PUBLIC_VOICE_EXPENSE_ENABLED: undefined };
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { VOICE_EXPENSE_ENABLED } = require('../../utils/featureFlags');
    expect(VOICE_EXPENSE_ENABLED).toBe(false);
  });

  it('VOICE_EXPENSE_ENABLED is true when env var is "true"', () => {
    process.env = { ...originalEnv, EXPO_PUBLIC_VOICE_EXPENSE_ENABLED: 'true' };
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { VOICE_EXPENSE_ENABLED } = require('../../utils/featureFlags');
    expect(VOICE_EXPENSE_ENABLED).toBe(true);
  });
});
