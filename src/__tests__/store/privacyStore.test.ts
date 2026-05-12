import * as SecureStore from 'expo-secure-store';
import { usePrivacyStore } from '../../store/privacyStore';

const mock = SecureStore as jest.Mocked<typeof SecureStore> & { __reset: () => void; __set: (k: string, v: string) => void };

beforeEach(() => {
  mock.__reset();
  usePrivacyStore.setState({ isHidden: false });
});

describe('privacyStore — toggle', () => {
  it('toggles isHidden from false to true', async () => {
    await usePrivacyStore.getState().toggle();
    expect(usePrivacyStore.getState().isHidden).toBe(true);
  });

  it('toggles isHidden from true to false', async () => {
    usePrivacyStore.setState({ isHidden: true });
    await usePrivacyStore.getState().toggle();
    expect(usePrivacyStore.getState().isHidden).toBe(false);
  });

  it('persists the value to SecureStore', async () => {
    await usePrivacyStore.getState().toggle();
    expect(mock.setItemAsync).toHaveBeenCalledWith('privacy_hidden', 'true');
  });
});

describe('privacyStore — hydrate', () => {
  it('loads true from SecureStore', async () => {
    mock.__set('privacy_hidden', 'true');
    await usePrivacyStore.getState().hydrate();
    expect(usePrivacyStore.getState().isHidden).toBe(true);
  });

  it('loads false from SecureStore', async () => {
    mock.__set('privacy_hidden', 'false');
    await usePrivacyStore.getState().hydrate();
    expect(usePrivacyStore.getState().isHidden).toBe(false);
  });

  it('defaults to false when nothing stored', async () => {
    await usePrivacyStore.getState().hydrate();
    expect(usePrivacyStore.getState().isHidden).toBe(false);
  });
});
