import { useThemeStore } from '../../store/themeStore';
import * as SecureStore from 'expo-secure-store';

const mockSecureStore = SecureStore as jest.Mocked<typeof SecureStore> & { __reset: () => void; __set: (k: string, v: string) => void };

beforeEach(() => {
  mockSecureStore.__reset();
  useThemeStore.setState({ theme: 'system' });
});

describe('themeStore — setTheme', () => {
  it('updates theme in state', async () => {
    await useThemeStore.getState().setTheme('dark');
    expect(useThemeStore.getState().theme).toBe('dark');
  });

  it('persists theme to SecureStore', async () => {
    await useThemeStore.getState().setTheme('light');
    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith('theme', 'light');
  });

  it('can switch between all theme values', async () => {
    for (const t of ['light', 'dark', 'system'] as const) {
      await useThemeStore.getState().setTheme(t);
      expect(useThemeStore.getState().theme).toBe(t);
    }
  });
});

describe('themeStore — hydrate', () => {
  it('loads saved theme from SecureStore', async () => {
    mockSecureStore.__set('theme', 'dark');
    await useThemeStore.getState().hydrate();
    expect(useThemeStore.getState().theme).toBe('dark');
  });

  it('keeps system default when nothing is stored', async () => {
    await useThemeStore.getState().hydrate();
    expect(useThemeStore.getState().theme).toBe('system');
  });

  it('ignores unknown stored values', async () => {
    mockSecureStore.__set('theme', 'purple');
    await useThemeStore.getState().hydrate();
    expect(useThemeStore.getState().theme).toBe('system');
  });
});
