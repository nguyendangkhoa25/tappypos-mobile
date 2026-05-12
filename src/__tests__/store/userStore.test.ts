import { useUserStore } from '../../store/userStore';
import * as SecureStore from 'expo-secure-store';

const mock = SecureStore as jest.Mocked<typeof SecureStore> & { __reset: () => void; __set: (k: string, v: string) => void };

beforeEach(() => {
  mock.__reset();
  useUserStore.setState({ nickname: '', fullName: '', shopName: '' });
});

describe('userStore — individual setters', () => {
  it('setNickname updates state and persists', async () => {
    await useUserStore.getState().setNickname('Khoa');
    expect(useUserStore.getState().nickname).toBe('Khoa');
    expect(mock.setItemAsync).toHaveBeenCalledWith('nickname', 'Khoa');
  });

  it('setFullName updates state and persists', async () => {
    await useUserStore.getState().setFullName('Nguyen Dang Khoa');
    expect(useUserStore.getState().fullName).toBe('Nguyen Dang Khoa');
    expect(mock.setItemAsync).toHaveBeenCalledWith('full_name', 'Nguyen Dang Khoa');
  });

  it('setShopName updates state and persists', async () => {
    await useUserStore.getState().setShopName('My Shop');
    expect(useUserStore.getState().shopName).toBe('My Shop');
    expect(mock.setItemAsync).toHaveBeenCalledWith('shop_name', 'My Shop');
  });
});

describe('userStore — setAll', () => {
  it('updates all provided fields at once', async () => {
    await useUserStore.getState().setAll({ nickname: 'K', fullName: 'Full Name', shopName: 'Shop A' });
    const s = useUserStore.getState();
    expect(s.nickname).toBe('K');
    expect(s.fullName).toBe('Full Name');
    expect(s.shopName).toBe('Shop A');
  });

  it('only updates provided fields', async () => {
    useUserStore.setState({ nickname: 'Old', fullName: '', shopName: '' });
    await useUserStore.getState().setAll({ fullName: 'New Full' });
    expect(useUserStore.getState().nickname).toBe('Old');
    expect(useUserStore.getState().fullName).toBe('New Full');
  });

  it('persists each field to SecureStore', async () => {
    await useUserStore.getState().setAll({ nickname: 'N', shopName: 'S' });
    expect(mock.setItemAsync).toHaveBeenCalledWith('nickname', 'N');
    expect(mock.setItemAsync).toHaveBeenCalledWith('shop_name', 'S');
  });
});

describe('userStore — hydrate', () => {
  it('loads all fields from SecureStore', async () => {
    mock.__set('nickname', 'Stored Nick');
    mock.__set('full_name', 'Stored Full');
    mock.__set('shop_name', 'Stored Shop');
    await useUserStore.getState().hydrate();
    const s = useUserStore.getState();
    expect(s.nickname).toBe('Stored Nick');
    expect(s.fullName).toBe('Stored Full');
    expect(s.shopName).toBe('Stored Shop');
  });

  it('falls back to empty strings when nothing stored', async () => {
    await useUserStore.getState().hydrate();
    const s = useUserStore.getState();
    expect(s.nickname).toBe('');
    expect(s.fullName).toBe('');
    expect(s.shopName).toBe('');
  });
});

describe('userStore — clear', () => {
  it('resets all state to empty strings', async () => {
    useUserStore.setState({ nickname: 'A', fullName: 'B', shopName: 'C' });
    await useUserStore.getState().clear();
    const s = useUserStore.getState();
    expect(s.nickname).toBe('');
    expect(s.fullName).toBe('');
    expect(s.shopName).toBe('');
  });

  it('calls deleteItemAsync for all keys', async () => {
    await useUserStore.getState().clear();
    expect(mock.deleteItemAsync).toHaveBeenCalledWith('nickname');
    expect(mock.deleteItemAsync).toHaveBeenCalledWith('full_name');
    expect(mock.deleteItemAsync).toHaveBeenCalledWith('shop_name');
  });
});
