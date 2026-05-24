import { useEffect, useRef, useState } from 'react';
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
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { TnCBody } from '../settings/TnCScreen';
import { PhoneInput } from '../../components/PhoneInput';
import { PasswordInput } from '../../components/PasswordInput';
import { LanguageChip } from '../../components/LanguageChip';
import { FontSizeChip } from '../../components/FontSizeChip';
import { useTypography } from '../../hooks/useTypography';
import { useFontSizeStore } from '../../store/fontSizeStore';
import { authExtApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import type { AuthScreenProps } from '../../types/navigation';


export function RegisterScreen({ navigation }: AuthScreenProps<'Register'>) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const typo = useTypography();
  const { setStoredPhone, setAuthenticated } = useAuthStore();

  useEffect(() => {
    const prev = useFontSizeStore.getState().fontScale;
    useFontSizeStore.setState({ fontScale: 'normal' });
    return () => { useFontSizeStore.setState({ fontScale: prev }); };
  }, []);

  const [rawPhone, setRawPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [tncAccepted, setTncAccepted] = useState(false);
  const [showTncModal, setShowTncModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ phone?: string; password?: string; confirm?: string }>({});
  const [phoneTaken, setPhoneTaken] = useState(false);

  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const validate = () => {
    const e: typeof errors = {};
    if (!rawPhone) e.phone = t('auth.register.phoneRequired');
    if (password.length < 8) e.password = t('auth.register.passwordTooShort');
    if (password !== confirmPassword) e.confirm = t('auth.register.confirmMismatch');
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleGoToLogin = () => {
    navigation.navigate('Login');
  };

  const handleRegister = async () => {
    if (!validate() || !tncAccepted) return;
    setLoading(true);
    try {
      const res = await authExtApi.register(rawPhone, password);
      const { accessToken, refreshToken, setupComplete } = res.data.data;
      await setStoredPhone(rawPhone);
      await setAuthenticated({ accessToken, refreshToken, setupComplete });
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 409) {
        setErrors({ phone: t('auth.register.phoneTaken') });
        setPhoneTaken(true);
      } else {
        setErrors({ phone: t('auth.register.error') });
        setPhoneTaken(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const passwordsMatch = confirmPassword.length > 0 && confirmPassword === password;
  const canSubmit = tncAccepted && !!rawPhone && !!password && !!confirmPassword && !loading;

  return (
    <>
      <KeyboardAvoidingView
        className="flex-1 bg-white dark:bg-gray-900"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Fixed header: back + title + subtitle (left) | language/font chips (right) */}
        <View
          style={{ paddingTop: insets.top + 10, paddingBottom: 10 }}
          className="flex-row items-start justify-between px-6 bg-white dark:bg-gray-900"
        >
          <View className="flex-1 mr-3">
            <View className="flex-row items-center gap-3 mb-1">
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MaterialCommunityIcons name="arrow-left" size={24} color="#374151" />
              </TouchableOpacity>
              <Text className={`${typo.heading} text-gray-900 dark:text-white`}>
                {t('auth.register.title')}
              </Text>
            </View>
            <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 mt-0.5`}>
              {t('auth.register.subtitle')}
            </Text>
          </View>
          <View className="items-end gap-2">
            <LanguageChip />
            <FontSizeChip />
          </View>
        </View>

        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-1 px-6 pt-6">

            {/* Phone */}
            <View className="mb-4">
              <Text className={`${typo.label} text-gray-700 dark:text-gray-300 mb-2`}>
                {t('auth.register.phoneLabel')}
              </Text>
              <PhoneInput
                value={rawPhone}
                onChangeRaw={(v) => { setRawPhone(v); setErrors((e) => ({ ...e, phone: undefined })); setPhoneTaken(false); }}
                placeholder="0901 234 567"
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
              />
              {errors.phone && (
                <View className="flex-row items-center mt-1 gap-1">
                  <Text className={`${typo.caption} text-red-500 flex-1`}>{errors.phone}</Text>
                  {phoneTaken && (
                    <TouchableOpacity onPress={() => navigation.replace('Login')}>
                      <Text className={`${typo.caption} text-primary font-semibold`}>{t('auth.register.loginHere')}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>

            {/* Password */}
            <View className="mb-4">
              <Text className={`${typo.label} text-gray-700 dark:text-gray-300 mb-2`}>
                {t('auth.register.passwordLabel')}
              </Text>
              <PasswordInput
                ref={passwordRef}
                value={password}
                onChangeText={(v) => { setPassword(v); setErrors((e) => ({ ...e, password: undefined })); }}
                placeholder={t('auth.register.passwordPlaceholder')}
                returnKeyType="next"
                onSubmitEditing={() => confirmRef.current?.focus()}
                showRules
              />
              {errors.password && (
                <Text className={`${typo.caption} text-red-500 mt-1`}>{errors.password}</Text>
              )}
            </View>

            {/* Confirm */}
            <View className="mb-6">
              <Text className={`${typo.label} text-gray-700 dark:text-gray-300 mb-2`}>
                {t('auth.register.confirmLabel')}
              </Text>
              <PasswordInput
                ref={confirmRef}
                value={confirmPassword}
                onChangeText={(v) => { setConfirmPassword(v); setErrors((e) => ({ ...e, confirm: undefined })); }}
                placeholder={t('auth.register.confirmPlaceholder')}
                returnKeyType="done"
                onSubmitEditing={handleRegister}
                showStrength={false}
              />
              {confirmPassword.length > 0 && (
                <View className="flex-row items-center gap-1 mt-1">
                  <MaterialCommunityIcons
                    name={passwordsMatch ? 'check-circle' : 'close-circle'}
                    size={14}
                    color={passwordsMatch ? '#059669' : '#ef4444'}
                  />
                  <Text className={`${typo.caption} ${passwordsMatch ? 'text-green-600' : 'text-red-500'}`}>
                    {passwordsMatch ? t('auth.register.passwordsMatch') : t('auth.register.passwordsNoMatch')}
                  </Text>
                </View>
              )}
              {errors.confirm && !confirmPassword.length && (
                <Text className={`${typo.caption} text-red-500 mt-1`}>{errors.confirm}</Text>
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
              <Text className={`${typo.caption} text-gray-600 dark:text-gray-300 flex-1 leading-5`}>
                {t('auth.register.tncText')}{' '}
                <Text
                  className={`${typo.label} text-primary`}
                  onPress={() => setShowTncModal(true)}
                >
                  {t('auth.register.tncLink')}
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
                  className={`${typo.labelBold} ${canSubmit ? 'text-white' : 'text-gray-400 dark:text-gray-500'}`}
                >
                  {t('auth.register.button')}
                </Text>
              )}
            </TouchableOpacity>

            <View className="flex-row justify-center mt-6">
              <Text className={`${typo.caption} text-gray-500 dark:text-gray-400`}>{t('auth.register.hasAccount')} </Text>
              <TouchableOpacity onPress={handleGoToLogin}>
                <Text className={`${typo.label} text-primary`}>{t('auth.register.loginLink')}</Text>
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
            <Text className={`${typo.section} text-gray-900 dark:text-white`}>
              {t('settings.tnc.title')}
            </Text>
            <TouchableOpacity onPress={() => setShowTncModal(false)}>
              <MaterialCommunityIcons name="close" size={24} color="#374151" />
            </TouchableOpacity>
          </View>
          <ScrollView
            className="flex-1 px-4"
            showsVerticalScrollIndicator={false}
            onMomentumScrollEnd={() => setTncAccepted(true)}
            contentContainerStyle={{ paddingBottom: 24 }}
          >
            <TnCBody />
          </ScrollView>
          <View className="px-6 pb-8 pt-4 border-t border-gray-100 dark:border-gray-700">
            <TouchableOpacity
              className="bg-primary rounded-2xl py-4 items-center"
              onPress={() => { setTncAccepted(true); setShowTncModal(false); }}
            >
              <Text className={`${typo.labelBold} text-white`}>{t('auth.register.tncAgree')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

