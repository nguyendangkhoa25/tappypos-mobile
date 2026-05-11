import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Linking,
} from 'react-native';
import { isAxiosError } from 'axios';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ClearableInput } from '../../components/ClearableInput';
import { authExtApi } from '../../services/api';
import { SUPPORT } from '../../utils/constants';
import type { AuthScreenProps } from '../../types/navigation';

export function ForgotPasswordScreen({ navigation, route }: AuthScreenProps<'ForgotPassword'>) {
  const insets = useSafeAreaInsets();
  const [phone, setPhone] = useState(route.params?.prefillPhone ?? '');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSend = async () => {
    if (!phone.trim()) return;
    setError('');
    setLoading(true);
    try {
      await authExtApi.requestPasswordReset(phone.trim());
      setSent(true);
    } catch (err) {
      if (isAxiosError(err) && !err.response) {
        setError('Không thể kết nối. Kiểm tra mạng và thử lại.');
      } else {
        // Always show success-like message to avoid phone enumeration
        setSent(true);
      }
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
        contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 16, paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-1 px-6">
          <TouchableOpacity
            className="mb-6 self-start"
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color="#374151" />
          </TouchableOpacity>

          <Text className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            Quên mật khẩu
          </Text>
          <Text className="text-sm text-gray-500 dark:text-gray-400 mb-8 leading-5">
            Nhập số điện thoại đăng ký. Chúng tôi sẽ liên hệ hỗ trợ đặt lại mật khẩu trong vòng 24 giờ.
          </Text>

          {!sent ? (
            <>
              <View className="mb-6">
                <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Số điện thoại
                </Text>
                <ClearableInput
                  value={phone}
                  onChangeText={(v) => { setPhone(v); setError(''); }}
                  onClear={() => setPhone('')}
                  placeholder="0901 234 567"
                  keyboardType="phone-pad"
                  returnKeyType="send"
                  onSubmitEditing={handleSend}
                />
                {error ? <Text className="text-red-500 text-xs mt-1">{error}</Text> : null}
              </View>

              <TouchableOpacity
                className={`rounded-2xl py-4 items-center justify-center ${
                  loading || !phone.trim()
                    ? 'bg-gray-200 dark:bg-gray-700'
                    : 'bg-primary active:opacity-80'
                }`}
                onPress={handleSend}
                disabled={loading || !phone.trim()}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text
                    className={`font-bold text-base ${!phone.trim() ? 'text-gray-400 dark:text-gray-500' : 'text-white'}`}
                  >
                    Gửi yêu cầu
                  </Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <View className="bg-green-50 dark:bg-green-900/20 rounded-2xl p-5 items-center mb-6">
              <Text className="text-3xl mb-3">✅</Text>
              <Text className="text-base font-bold text-green-700 dark:text-green-300 text-center mb-1">
                Yêu cầu đã được ghi nhận
              </Text>
              <Text className="text-sm text-green-600 dark:text-green-400 text-center leading-5">
                Chúng tôi sẽ liên hệ trong vòng 24 giờ để hỗ trợ bạn đặt lại mật khẩu.
              </Text>
            </View>
          )}

          {/* Support contacts — always visible */}
          <View className="mt-6 bg-gray-50 dark:bg-gray-800 rounded-2xl p-4">
            <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Liên hệ hỗ trợ trực tiếp
            </Text>
            <TouchableOpacity
              className="flex-row items-center gap-3 py-2"
              onPress={() => Linking.openURL(`tel:${SUPPORT.phone}`)}
            >
              <MaterialCommunityIcons name="phone-outline" size={18} color="#4f46e5" />
              <Text className="text-primary font-medium text-sm">{SUPPORT.phone}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-row items-center gap-3 py-2"
              onPress={() => Linking.openURL(`mailto:${SUPPORT.email}`)}
            >
              <MaterialCommunityIcons name="email-outline" size={18} color="#4f46e5" />
              <Text className="text-primary font-medium text-sm">{SUPPORT.email}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
