import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { isAxiosError } from 'axios';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PasswordInput } from '../../components/PasswordInput';
import { authApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useAlertStore } from '../../store/alertStore';
import { PinPad } from '../../components/PinPad';
import type { AuthScreenProps } from '../../types/navigation';

type Step = 'verify' | 'new_pin' | 'confirm_pin';

export function ForgotPinScreen({ navigation }: AuthScreenProps<'ForgotPin'>) {
  const insets = useSafeAreaInsets();
  const { show: showAlert } = useAlertStore();
  const { storedPhone, setAuthenticated, setPinEnabled } = useAuthStore();
  const [step, setStep] = useState<Step>('verify');
  const [password, setPassword] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerifyPassword = async () => {
    if (!password || !storedPhone) return;
    setLoading(true);
    try {
      const res = await authApi.login(storedPhone, password);
      const { accessToken, refreshToken } = res.data.data;
      await setAuthenticated({ accessToken, refreshToken });
      setStep('new_pin');
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 401) {
        showAlert('Sai mật khẩu', 'Mật khẩu không đúng. Vui lòng thử lại.');
      } else {
        showAlert('Lỗi', 'Không thể kết nối. Kiểm tra mạng và thử lại.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleNewPin = (value: string) => {
    setNewPin(value);
    if (value.length === 6) setTimeout(() => setStep('confirm_pin'), 200);
  };

  const handleConfirmPin = async (value: string) => {
    setConfirmPin(value);
    if (value.length !== 6) return;

    if (value !== newPin) {
      showAlert('Không khớp', 'Mã PIN xác nhận không đúng. Vui lòng thử lại.', [
        { label: 'OK', onPress: () => { setStep('new_pin'); setNewPin(''); setConfirmPin(''); } },
      ]);
      return;
    }

    setLoading(true);
    try {
      await authApi.setupPin(value);
    } catch {
      // Proceed even if endpoint missing
    }
    await setPinEnabled(true);
    setLoading(false);
    // Navigation happens automatically via RootNavigator state change
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white dark:bg-gray-900"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View
        className="flex-1 px-6"
        style={{ paddingTop: insets.top + 16 }}
      >
        <TouchableOpacity
          className="mb-8 self-start"
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="#374151" />
        </TouchableOpacity>

        <Text className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Quên mã PIN</Text>
        <Text className="text-sm text-gray-500 dark:text-gray-400 mb-10 leading-5">
          Xác thực mật khẩu rồi đặt mã PIN mới
        </Text>

        {step === 'verify' && (
          <>
            <View className="mb-6">
              <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Mật khẩu hiện tại
              </Text>
              <PasswordInput
                value={password}
                onChangeText={setPassword}
                placeholder="Nhập mật khẩu"
                returnKeyType="done"
                onSubmitEditing={handleVerifyPassword}
              />
            </View>

            <TouchableOpacity
              className={`rounded-2xl py-4 items-center ${
                loading || !password ? 'bg-gray-200 dark:bg-gray-700' : 'bg-primary active:opacity-80'
              }`}
              onPress={handleVerifyPassword}
              disabled={loading || !password}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text
                  className={`font-bold text-base ${!password ? 'text-gray-400 dark:text-gray-500' : 'text-white'}`}
                >
                  Xác thực
                </Text>
              )}
            </TouchableOpacity>
          </>
        )}

        {(step === 'new_pin' || step === 'confirm_pin') && (
          <View className="items-center mt-4">
            <Text className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
              {step === 'new_pin' ? 'Tạo mã PIN mới' : 'Xác nhận mã PIN'}
            </Text>
            <Text className="text-sm text-gray-500 dark:text-gray-400 mb-8 text-center">
              {step === 'new_pin'
                ? 'Đặt mã PIN 6 chữ số'
                : 'Nhập lại mã PIN để xác nhận'}
            </Text>
            <PinPad
              value={step === 'new_pin' ? newPin : confirmPin}
              onChange={step === 'new_pin' ? handleNewPin : handleConfirmPin}
              loading={loading}
            />
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
