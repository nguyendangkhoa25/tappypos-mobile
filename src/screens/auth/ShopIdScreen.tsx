import { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ClearableInput } from '../../components/ClearableInput';
import { tenantApi } from '../../services/api';
import * as SecureStore from 'expo-secure-store';
import type { AuthScreenProps } from '../../types/navigation';

export function ShopIdScreen({ navigation }: AuthScreenProps<'ShopId'>) {
  const insets = useSafeAreaInsets();
  const [shopId, setShopId] = useState('');
  const [error, setError] = useState<'' | 'not_found' | 'suspended' | 'network'>('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const handleContinue = async () => {
    const id = shopId.trim().toLowerCase();
    if (!id) return;
    setError('');
    setLoading(true);
    try {
      const res = await tenantApi.checkStatus(id);
      const { status, shopName } = res.data.data;
      if (status === 'ACTIVE') {
        await Promise.all([
          SecureStore.setItemAsync('tenant_id', id),
          SecureStore.setItemAsync('shop_name', shopName),
        ]);
        navigation.replace('Login');
      } else if (status === 'SUSPENDED') {
        setError('suspended');
      } else {
        setError('not_found');
      }
    } catch (e) {
      console.error('[ShopId] request failed:', e);
      setError('network');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white dark:bg-gray-900"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 48, paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-1 px-6">
          {/* Logo */}
          <View className="items-center mb-12">
            <View className="w-20 h-20 bg-primary/10 rounded-3xl items-center justify-center mb-4">
              <MaterialCommunityIcons name="cash-register" size={40} color="#4f46e5" />
            </View>
            <Text className="text-3xl font-bold text-gray-900 dark:text-white">TappyPOS</Text>
            <Text className="text-base text-gray-500 dark:text-gray-400 mt-1">
              Quản lý cửa hàng thông minh
            </Text>
          </View>

          {/* Input */}
          <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Mã cửa hàng
          </Text>
          <ClearableInput
            ref={inputRef}
            testID="shop-id-input"
            value={shopId}
            onChangeText={(v) => {
              setShopId(v.toLowerCase().replace(/\s/g, ''));
              setError('');
            }}
            onClear={() => { setShopId(''); setError(''); }}
            placeholder="Nhập mã cửa hàng (vd: pho-a7k2)"
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
            returnKeyType="go"
            onSubmitEditing={handleContinue}
          />

          {error === 'not_found' && (
            <Text testID="shop-id-error-not-found" className="text-red-500 text-sm mt-2">
              Không tìm thấy cửa hàng với mã này. Kiểm tra lại hoặc đăng ký mới.
            </Text>
          )}
          {error === 'suspended' && (
            <View testID="shop-id-error-suspended" className="mt-2 bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3">
              <Text className="text-amber-700 dark:text-amber-300 text-sm font-medium">
                Cửa hàng đang tạm ngưng hoạt động.
              </Text>
              <Text className="text-amber-600 dark:text-amber-400 text-xs mt-1">
                Liên hệ hỗ trợ: 0901 234 567
              </Text>
            </View>
          )}
          {error === 'network' && (
            <Text testID="shop-id-error-network" className="text-red-500 text-sm mt-2">
              Không thể kết nối. Kiểm tra mạng và thử lại.
            </Text>
          )}

          <TouchableOpacity
            testID="shop-id-submit"
            className={`mt-6 rounded-2xl py-4 items-center justify-center ${
              loading || !shopId.trim()
                ? 'bg-gray-200 dark:bg-gray-700'
                : 'bg-primary active:opacity-80'
            }`}
            onPress={handleContinue}
            disabled={loading || !shopId.trim()}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text
                className={`font-bold text-base ${
                  !shopId.trim() ? 'text-gray-400 dark:text-gray-500' : 'text-white'
                }`}
              >
                Tiếp tục
              </Text>
            )}
          </TouchableOpacity>

          <View className="flex-row justify-center mt-6">
            <Text className="text-gray-500 dark:text-gray-400 text-sm">Chưa có tài khoản? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text className="text-primary font-semibold text-sm">Đăng ký miễn phí</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
