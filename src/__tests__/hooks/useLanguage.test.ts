jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../i18n', () => ({
  language: 'vi',
  on: jest.fn(),
  off: jest.fn(),
  changeLanguage: jest.fn().mockResolvedValue(undefined),
}));

import { renderHook, act } from '@testing-library/react-native';
import { useLanguage } from '../../hooks/useLanguage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '../../i18n';

const asyncStorageMock = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const i18nMock = i18n as jest.Mocked<typeof i18n>;

beforeEach(() => jest.clearAllMocks());

describe('useLanguage', () => {
  it('returns vi as default language', () => {
    const { result } = renderHook(() => useLanguage());
    expect(result.current.language).toBe('vi');
  });

  it('registers and removes languageChanged listener', () => {
    const { unmount } = renderHook(() => useLanguage());
    expect(i18nMock.on).toHaveBeenCalledWith('languageChanged', expect.any(Function));
    unmount();
    expect(i18nMock.off).toHaveBeenCalledWith('languageChanged', expect.any(Function));
  });

  it('changeLanguage calls AsyncStorage.setItem and i18n.changeLanguage', async () => {
    const { result } = renderHook(() => useLanguage());
    await act(async () => {
      await result.current.changeLanguage('en');
    });
    expect(asyncStorageMock.setItem).toHaveBeenCalledWith('user_language', 'en');
    expect(i18nMock.changeLanguage).toHaveBeenCalledWith('en');
  });

  it('skips changeLanguage when saved value is neither vi nor en', async () => {
    asyncStorageMock.getItem.mockResolvedValueOnce('fr');
    // Render to trigger the boot check — i18n.changeLanguage should not be called
    renderHook(() => useLanguage());
    await act(async () => {});
    expect(i18nMock.changeLanguage).not.toHaveBeenCalled();
  });
});
