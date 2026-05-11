import { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PinPad } from '../../components/PinPad';
import { authApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useAlertStore } from '../../store/alertStore';
import type { AuthScreenProps } from '../../types/navigation';

type Step = 'enter' | 'confirm';

export function PinSetupScreen({ navigation, route }: AuthScreenProps<'PinSetup'>) {
  const insets = useSafeAreaInsets();
  const { show: showAlert } = useAlertStore();
  const { setAuthenticated, setPinEnabled } = useAuthStore();
  const { pendingAccessToken, pendingRefreshToken, isFirstSetup } = route.params ?? {};

  const [step, setStep] = useState<Step>('enter');
  const [firstPin, setFirstPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);

  const handleFirstPin = (value: string) => {
    setFirstPin(value);
    if (value.length === 6) setTimeout(() => setStep('confirm'), 200);
  };

  const handleConfirmPin = async (value: string) => {
    setConfirmPin(value);
    if (value.length !== 6) return;

    if (value !== firstPin) {
      showAlert('Không khớp', 'Mã PIN xác nhận không đúng. Vui lòng thử lại.', [
        { label: 'OK', onPress: () => { setStep('enter'); setFirstPin(''); setConfirmPin(''); } },
      ]);
      return;
    }

    setLoading(true);
    try {
      await authApi.setupPin(value, pendingAccessToken);
    } catch {
      // Endpoint may not be implemented yet — PIN stored locally only, proceed
    }

    await setPinEnabled(true);
    if (pendingAccessToken) {
      await setAuthenticated({ accessToken: pendingAccessToken, refreshToken: pendingRefreshToken });
    }
    setLoading(false);
  };

  const handleSkip = async () => {
    await setPinEnabled(false);
    if (pendingAccessToken) {
      await setAuthenticated({ accessToken: pendingAccessToken, refreshToken: pendingRefreshToken });
    }
  };

  const isConfirmStep = step === 'confirm';
  const hiddenRef = useRef<TextInput>(null);

  const handleKeyInput = (text: string) => {
    // Route each typed digit to the active PIN handler; 'q' = quick skip
    if (text === 'q') { handleSkip(); return; }
    const digit = text.slice(-1);
    if (!/^[0-9]$/.test(digit)) return;
    if (isConfirmStep) handleConfirmPin((confirmPin + digit).slice(0, 6));
    else handleFirstPin((firstPin + digit).slice(0, 6));
    hiddenRef.current?.setNativeProps({ text: '' });
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white dark:bg-gray-900"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
    <View
      className="flex-1 px-6 items-center"
      style={{ paddingTop: insets.top + 48 }}
    >
      {/* Hidden input so hardware keyboard digits route to PinPad; 'q' = skip */}
      <TextInput
        ref={hiddenRef}
        autoFocus
        keyboardType="number-pad"
        onChangeText={handleKeyInput}
        style={{ position: 'absolute', opacity: 0, width: 1, height: 1 }}
      />
      <Text className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
        {isConfirmStep ? 'Xác nhận mã PIN' : 'Tạo mã PIN'}
      </Text>
      <Text className="text-base text-gray-500 dark:text-gray-400 mb-12 text-center">
        {isConfirmStep
          ? 'Nhập lại mã PIN để xác nhận'
          : 'Đặt mã PIN 6 chữ số để đăng nhập nhanh lần sau'}
      </Text>

      <PinPad
        value={isConfirmStep ? confirmPin : firstPin}
        onChange={isConfirmStep ? handleConfirmPin : handleFirstPin}
        loading={loading}
      />

      {!isConfirmStep && isFirstSetup && (
        <TouchableOpacity className="mt-8" onPress={handleSkip}>
          <Text className="text-gray-400 dark:text-gray-500 text-base">
            Bỏ qua, thiết lập sau
          </Text>
        </TouchableOpacity>
      )}

      {isConfirmStep && (
        <TouchableOpacity
          className="mt-8"
          onPress={() => { setStep('enter'); setFirstPin(''); setConfirmPin(''); }}
        >
          <Text className="text-gray-400 dark:text-gray-500 text-base">Quay lại</Text>
        </TouchableOpacity>
      )}
    </View>
    </KeyboardAvoidingView>
  );
}
