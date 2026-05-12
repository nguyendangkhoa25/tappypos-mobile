import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '../../store/authStore';

const mock = SecureStore as jest.Mocked<typeof SecureStore> & { __reset: () => void; __set: (k: string, v: string) => void };

function makeToken(payload: object): string {
  const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(payload))))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `eyJhbGciOiJIUzI1NiJ9.${b64}.sig`;
}

beforeEach(() => {
  mock.__reset();
  useAuthStore.setState({
    isAuthenticated: false,
    storedPhone: null,
    pinEnabled: false,
    biometricEnabled: false,
    tenantId: null,
    features: [],
    deviceSwitchedMessage: null,
  });
});

describe('authStore — setAuthenticated', () => {
  it('sets isAuthenticated to true', async () => {
    const token = makeToken({ features: [], tenantId: 'shop1' });
    await useAuthStore.getState().setAuthenticated({ accessToken: token });
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it('extracts features from JWT', async () => {
    const token = makeToken({ features: ['ORDER', 'PRODUCT'] });
    await useAuthStore.getState().setAuthenticated({ accessToken: token });
    expect(useAuthStore.getState().features).toEqual(['ORDER', 'PRODUCT']);
  });

  it('extracts tenantId from JWT', async () => {
    const token = makeToken({ tenantId: 'myshop' });
    await useAuthStore.getState().setAuthenticated({ accessToken: token });
    expect(useAuthStore.getState().tenantId).toBe('myshop');
  });

  it('persists accessToken to SecureStore', async () => {
    const token = makeToken({ features: [] });
    await useAuthStore.getState().setAuthenticated({ accessToken: token });
    expect(mock.setItemAsync).toHaveBeenCalledWith('access_token', token);
  });

  it('persists refreshToken when provided', async () => {
    const token = makeToken({ features: [] });
    await useAuthStore.getState().setAuthenticated({ accessToken: token, refreshToken: 'rt-123' });
    expect(mock.setItemAsync).toHaveBeenCalledWith('refresh_token', 'rt-123');
  });
});

describe('authStore — logout', () => {
  it('sets isAuthenticated to false', async () => {
    useAuthStore.setState({ isAuthenticated: true, features: ['ORDER'], pinEnabled: true });
    await useAuthStore.getState().logout();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('clears features', async () => {
    useAuthStore.setState({ isAuthenticated: true, features: ['ORDER'] });
    await useAuthStore.getState().logout();
    expect(useAuthStore.getState().features).toEqual([]);
  });

  it('clears pinEnabled', async () => {
    useAuthStore.setState({ isAuthenticated: true, pinEnabled: true });
    await useAuthStore.getState().logout();
    expect(useAuthStore.getState().pinEnabled).toBe(false);
  });

  it('deletes access_token from SecureStore', async () => {
    await useAuthStore.getState().logout();
    expect(mock.deleteItemAsync).toHaveBeenCalledWith('access_token');
  });
});

describe('authStore — setPinEnabled', () => {
  it('sets pinEnabled to true and persists', async () => {
    await useAuthStore.getState().setPinEnabled(true);
    expect(useAuthStore.getState().pinEnabled).toBe(true);
    expect(mock.setItemAsync).toHaveBeenCalledWith('pin_enabled', 'true');
  });

  it('sets pinEnabled to false and removes from SecureStore', async () => {
    await useAuthStore.getState().setPinEnabled(false);
    expect(useAuthStore.getState().pinEnabled).toBe(false);
    expect(mock.deleteItemAsync).toHaveBeenCalledWith('pin_enabled');
  });
});

describe('authStore — hydrateFromStorage', () => {
  it('sets isAuthenticated based on stored token (no PIN)', async () => {
    const token = makeToken({ features: ['ORDER'] });
    mock.__set('access_token', token);
    await useAuthStore.getState().hydrateFromStorage();
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it('is not authenticated when access_token is missing', async () => {
    await useAuthStore.getState().hydrateFromStorage();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('is not authenticated when PIN is enabled (pin takes over)', async () => {
    const token = makeToken({ features: [] });
    mock.__set('access_token', token);
    mock.__set('phone', '0901234567');
    mock.__set('pin_enabled', 'true');
    await useAuthStore.getState().hydrateFromStorage();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().pinEnabled).toBe(true);
  });

  it('loads storedPhone from SecureStore', async () => {
    mock.__set('phone', '0901234567');
    await useAuthStore.getState().hydrateFromStorage();
    expect(useAuthStore.getState().storedPhone).toBe('0901234567');
  });
});

describe('authStore — clearDeviceSwitchedMessage', () => {
  it('clears the deviceSwitchedMessage', () => {
    useAuthStore.setState({ deviceSwitchedMessage: 'device_switched' });
    useAuthStore.getState().clearDeviceSwitchedMessage();
    expect(useAuthStore.getState().deviceSwitchedMessage).toBeNull();
  });
});
