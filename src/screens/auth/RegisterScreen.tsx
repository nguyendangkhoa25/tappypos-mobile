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
  Modal,
} from 'react-native';
import { isAxiosError } from 'axios';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ClearableInput } from '../../components/ClearableInput';
import { PasswordInput } from '../../components/PasswordInput';
import { authExtApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import type { AuthScreenProps } from '../../types/navigation';

const TNC_TEXT = `ĐIỀU KHOẢN SỬ DỤNG TAPPYPOS\n\n1. Bằng cách đăng ký, bạn đồng ý sử dụng ứng dụng đúng mục đích quản lý cửa hàng hợp pháp.\n\n2. Chúng tôi thu thập dữ liệu cửa hàng để cung cấp dịch vụ. Dữ liệu của bạn được bảo mật và không chia sẻ với bên thứ ba mà không có sự đồng ý.\n\n3. Bạn chịu trách nhiệm bảo mật tài khoản và mã PIN của mình.\n\n4. TappyPOS có quyền tạm ngưng tài khoản vi phạm điều khoản sử dụng.\n\n5. Liên hệ hỗ trợ: support@tappypos.vn hoặc 0901 234 567.`;

export function RegisterScreen({ navigation }: AuthScreenProps<'Register'>) {
  const insets = useSafeAreaInsets();
  const { setStoredPhone } = useAuthStore();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [tncAccepted, setTncAccepted] = useState(false);
  const [showTncModal, setShowTncModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ phone?: string; password?: string; confirm?: string }>({});

  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const validate = () => {
    const e: typeof errors = {};
    if (!phone.trim()) e.phone = 'Nhập số điện thoại';
    if (password.length < 8) e.password = 'Mật khẩu phải có ít nhất 8 ký tự';
    if (password !== confirmPassword) e.confirm = 'Mật khẩu xác nhận không khớp';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    if (!validate() || !tncAccepted) return;
    setLoading(true);
    try {
      const res = await authExtApi.register(phone.trim(), password);
      const { accessToken, refreshToken } = res.data.data;
      await setStoredPhone(phone.trim());
      navigation.replace('PinSetup', {
        isFirstSetup: true,
        pendingAccessToken: accessToken,
        pendingRefreshToken: refreshToken,
      });
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 409) {
        setErrors({ phone: 'Số điện thoại đã được đăng ký.' });
      } else {
        setErrors({ phone: 'Đã xảy ra lỗi. Vui lòng thử lại.' });
      }
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = tncAccepted && !!phone && !!password && !!confirmPassword && !loading;

  return (
    <>
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
              Tạo tài khoản
            </Text>
            <Text className="text-sm text-gray-500 dark:text-gray-400 mb-8">
              Đăng ký miễn phí, bắt đầu ngay hôm nay
            </Text>

            {/* Phone */}
            <View className="mb-4">
              <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Số điện thoại *
              </Text>
              <ClearableInput
                value={phone}
                onChangeText={(v) => { setPhone(v); setErrors((e) => ({ ...e, phone: undefined })); }}
                onClear={() => setPhone('')}
                placeholder="0901 234 567"
                keyboardType="phone-pad"
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
              />
              {errors.phone && (
                <View className="flex-row items-center mt-1 gap-1">
                  <Text className="text-red-500 text-xs flex-1">{errors.phone}</Text>
                  {errors.phone.includes('đã được đăng ký') && (
                    <TouchableOpacity onPress={() => navigation.replace('Login')}>
                      <Text className="text-primary text-xs font-semibold">Đăng nhập?</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>

            {/* Password */}
            <View className="mb-4">
              <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Mật khẩu *
              </Text>
              <PasswordInput
                ref={passwordRef}
                value={password}
                onChangeText={(v) => { setPassword(v); setErrors((e) => ({ ...e, password: undefined })); }}
                placeholder="Tối thiểu 8 ký tự"
                returnKeyType="next"
                onSubmitEditing={() => confirmRef.current?.focus()}
                showRules
              />
              {errors.password && (
                <Text className="text-red-500 text-xs mt-1">{errors.password}</Text>
              )}
            </View>

            {/* Confirm */}
            <View className="mb-6">
              <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Xác nhận mật khẩu *
              </Text>
              <PasswordInput
                ref={confirmRef}
                value={confirmPassword}
                onChangeText={(v) => { setConfirmPassword(v); setErrors((e) => ({ ...e, confirm: undefined })); }}
                placeholder="Nhập lại mật khẩu"
                returnKeyType="done"
                onSubmitEditing={handleRegister}
              />
              {errors.confirm && (
                <Text className="text-red-500 text-xs mt-1">{errors.confirm}</Text>
              )}
            </View>

            {/* T&C */}
            <TouchableOpacity
              className="flex-row items-start gap-3 mb-6"
              onPress={() => setTncAccepted((v) => !v)}
              activeOpacity={0.7}
            >
              <View
                className={`w-5 h-5 rounded border-2 mt-0.5 items-center justify-center flex-shrink-0 ${
                  tncAccepted ? 'bg-primary border-primary' : 'border-gray-300 dark:border-gray-600'
                }`}
              >
                {tncAccepted && <MaterialCommunityIcons name="check" size={13} color="#fff" />}
              </View>
              <Text className="text-sm text-gray-600 dark:text-gray-300 flex-1 leading-5">
                Tôi đã đọc và đồng ý với{' '}
                <Text
                  className="text-primary font-semibold"
                  onPress={() => setShowTncModal(true)}
                >
                  Điều khoản sử dụng
                </Text>
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className={`rounded-2xl py-4 items-center justify-center ${
                canSubmit ? 'bg-primary active:opacity-80' : 'bg-gray-200 dark:bg-gray-700'
              }`}
              onPress={handleRegister}
              disabled={!canSubmit}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text
                  className={`font-bold text-base ${canSubmit ? 'text-white' : 'text-gray-400 dark:text-gray-500'}`}
                >
                  Đăng ký
                </Text>
              )}
            </TouchableOpacity>

            <View className="flex-row justify-center mt-6">
              <Text className="text-gray-500 dark:text-gray-400 text-sm">Đã có tài khoản? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text className="text-primary font-semibold text-sm">Đăng nhập</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={showTncModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowTncModal(false)}
      >
        <View className="flex-1 bg-white dark:bg-gray-900" style={{ paddingTop: insets.top + 16 }}>
          <View className="flex-row items-center justify-between px-6 mb-4">
            <Text className="text-lg font-bold text-gray-900 dark:text-white">
              Điều khoản sử dụng
            </Text>
            <TouchableOpacity onPress={() => setShowTncModal(false)}>
              <MaterialCommunityIcons name="close" size={24} color="#374151" />
            </TouchableOpacity>
          </View>
          <ScrollView
            className="flex-1 px-6"
            onMomentumScrollEnd={() => setTncAccepted(true)}
          >
            <Text className="text-sm text-gray-700 dark:text-gray-300 leading-6">{TNC_TEXT}</Text>
            <View style={{ height: 32 }} />
          </ScrollView>
          <View className="px-6 pb-8 pt-4 border-t border-gray-100 dark:border-gray-700">
            <TouchableOpacity
              className="bg-primary rounded-2xl py-4 items-center"
              onPress={() => { setTncAccepted(true); setShowTncModal(false); }}
            >
              <Text className="text-white font-bold text-base">Đồng ý & Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}
