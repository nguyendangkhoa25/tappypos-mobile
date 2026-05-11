import { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { isAxiosError } from 'axios';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PinPad } from '../../components/PinPad';
import { authApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useAlertStore } from '../../store/alertStore';
import { useUserStore } from '../../store/userStore';
import { maskPhone } from '../../utils/format';
import type { AuthScreenProps } from '../../types/navigation';

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 30 * 60 * 1000;

export function PinLoginScreen({ navigation }: AuthScreenProps<'PinLogin'>) {
  const insets = useSafeAreaInsets();
  const { show: showAlert } = useAlertStore();
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [canBiometric, setCanBiometric] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [remainingSecs, setRemainingSecs] = useState(0);
  const { storedPhone, biometricEnabled, setAuthenticated } = useAuthStore();
  const nickname = useUserStore((s) => s.nickname);
  const autoPrompted = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hiddenRef = useRef<TextInput>(null);

  useEffect(() => {
    checkBiometric();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  useEffect(() => {
    if (lockedUntil) {
      timerRef.current = setInterval(() => {
        const secs = Math.ceil((lockedUntil - Date.now()) / 1000);
        if (secs <= 0) {
          setLockedUntil(null);
          setAttempts(0);
          setRemainingSecs(0);
          if (timerRef.current) clearInterval(timerRef.current);
        } else {
          setRemainingSecs(secs);
        }
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [lockedUntil]);

  useEffect(() => {
    if (pin.length === 6) handlePinLogin(pin);
  }, [pin]);

  const checkBiometric = async () => {
    const [hasHardware, isEnrolled, hasRefresh] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
      SecureStore.getItemAsync('refresh_token').then(Boolean),
    ]);
    const available = hasHardware && isEnrolled && hasRefresh && biometricEnabled;
    setCanBiometric(available);
    if (available && !autoPrompted.current) {
      autoPrompted.current = true;
      setTimeout(() => handleBiometric(), 400);
    }
  };

  const handlePinLogin = async (enteredPin: string) => {
    if (!storedPhone || lockedUntil) return;
    setLoading(true);
    try {
      const res = await authApi.loginWithPin(storedPhone, enteredPin);
      const { accessToken, refreshToken } = res.data.data;
      setAttempts(0);
      await setAuthenticated({ accessToken, refreshToken });
    } catch (err) {
      setPin('');
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);

      if (isAxiosError(err) && err.response?.status === 423) {
        showAlert('Tài khoản bị khóa', 'Quá nhiều lần nhập sai. Vui lòng đăng nhập bằng mật khẩu.', [
          { label: 'Đăng nhập', onPress: () => navigation.navigate('Login') },
        ]);
      } else if (newAttempts >= MAX_ATTEMPTS) {
        const until = Date.now() + LOCKOUT_MS;
        setLockedUntil(until);
        showAlert(
          'Tạm khóa 30 phút',
          'Nhập sai quá nhiều lần. Thử lại sau 30 phút hoặc đăng nhập bằng mật khẩu.',
          [
            { label: 'Đăng nhập', onPress: () => navigation.navigate('Login') },
            { label: 'Đợi', style: 'cancel' },
          ],
        );
      } else {
        showAlert(
          'Sai mã PIN',
          `Còn ${MAX_ATTEMPTS - newAttempts} lần thử trước khi tạm khóa.`,
          [{ label: 'Thử lại' }],
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBiometric = async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Xác thực để đăng nhập',
        cancelLabel: 'Hủy',
        disableDeviceFallback: false,
      });
      if (!result.success) return;

      const refreshToken = await SecureStore.getItemAsync('refresh_token');
      if (!refreshToken) {
        setCanBiometric(false);
        showAlert('Lỗi', 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        return;
      }

      setLoading(true);
      const res = await authApi.refresh(refreshToken, storedPhone ?? undefined);
      const { accessToken, refreshToken: newRefresh } = res.data.data;
      await setAuthenticated({ accessToken, refreshToken: newRefresh });
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 401) {
        await SecureStore.deleteItemAsync('refresh_token');
        setCanBiometric(false);
        showAlert('Phiên hết hạn', 'Vui lòng nhập mã PIN hoặc đăng nhập lại.');
      } else {
        showAlert('Lỗi xác thực', 'Không thể xác thực. Vui lòng dùng mã PIN.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChangeShop = async () => {
    await SecureStore.deleteItemAsync('tenant_id');
    await SecureStore.deleteItemAsync('shop_name');
    navigation.replace('ShopId');
  };

  const isLocked = !!lockedUntil;

  const handleKeyInput = (text: string) => {
    if (text === 'l') { navigation.navigate('Login'); return; }
    const digit = text.slice(-1);
    if (!/^[0-9]$/.test(digit)) return;
    setPin((p) => (p + digit).slice(0, 6));
    hiddenRef.current?.setNativeProps({ text: '' });
  };

  return (
    <View
      className="flex-1 bg-white dark:bg-gray-900 px-6 items-center"
      style={{ paddingTop: insets.top + 32 }}
    >
      {/* Hidden input: digits → PIN, 'l' → Login screen */}
      <TextInput
        ref={hiddenRef}
        autoFocus
        keyboardType="number-pad"
        onChangeText={handleKeyInput}
        style={{ position: 'absolute', opacity: 0, width: 1, height: 1 }}
      />
      {/* Top bar */}
      <View className="w-full flex-row justify-between items-center mb-8">
        <View />
        <TouchableOpacity onPress={handleChangeShop}>
          <Text className="text-sm text-primary font-semibold">Đổi cửa hàng</Text>
        </TouchableOpacity>
      </View>

      <Text className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
        {nickname ? `Xin chào, ${nickname} 👋` : 'Nhập mã PIN'}
      </Text>
      {storedPhone && (
        <Text className="text-base text-gray-500 dark:text-gray-400 mb-12">
          {maskPhone(storedPhone)}
        </Text>
      )}

      {isLocked ? (
        <View className="items-center mt-8">
          <Text className="text-4xl mb-4">🔒</Text>
          <Text className="text-base font-semibold text-gray-700 dark:text-gray-300 text-center mb-2">
            Tạm khóa {Math.floor(remainingSecs / 60)}:{String(remainingSecs % 60).padStart(2, '0')}
          </Text>
          <Text className="text-sm text-gray-500 dark:text-gray-400 text-center">
            Quá nhiều lần nhập sai
          </Text>
          <TouchableOpacity className="mt-6" onPress={() => navigation.navigate('Login')}>
            <Text className="text-primary font-semibold">Đăng nhập bằng mật khẩu</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <PinPad
          value={pin}
          onChange={setPin}
          loading={loading}
          onBiometric={canBiometric ? handleBiometric : undefined}
        />
      )}

      {!isLocked && (
        <>
          <TouchableOpacity className="mt-8" onPress={() => navigation.navigate('ForgotPin')}>
            <Text className="text-primary text-base">Quên mã PIN?</Text>
          </TouchableOpacity>
          <TouchableOpacity className="mt-4" onPress={() => navigation.navigate('Login')}>
            <Text className="text-gray-400 dark:text-gray-500 text-sm">Đăng nhập bằng mật khẩu</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}
