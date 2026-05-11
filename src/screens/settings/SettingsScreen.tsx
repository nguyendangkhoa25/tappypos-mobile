import { View, Text, TouchableOpacity } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../services/api';

export function SettingsScreen() {
  const { logout } = useAuthStore();

  async function handleLogout() {
    try { await authApi.logout(); } catch { /* ignore */ }
    await SecureStore.deleteItemAsync('tenant_id');
    useAuthStore.setState({ tenantId: null });
    await logout();
  }

  return (
    <View className="flex-1 bg-gray-50 items-center justify-center" style={{ gap: 16 }}>
      <Text className="text-gray-500">Cài đặt</Text>
      <TouchableOpacity
        testID="settings-logout-btn"
        onPress={handleLogout}
        className="px-6 py-3 rounded-xl border border-red-200"
        style={{ backgroundColor: '#fff1f2' }}
      >
        <Text className="text-red-500 font-semibold">Đăng xuất</Text>
      </TouchableOpacity>
    </View>
  );
}
