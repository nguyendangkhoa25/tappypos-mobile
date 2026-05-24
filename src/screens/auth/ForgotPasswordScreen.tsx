import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { isAxiosError } from 'axios';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PhoneInput } from '../../components/PhoneInput';
import { useSubmitting } from '../../hooks/useSubmitting';
import { useTypography } from '../../hooks/useTypography';
import { useAlertStore } from '../../store/alertStore';
import { authExtApi } from '../../services/api';
import type { AuthScreenProps } from '../../types/navigation';

export function ForgotPasswordScreen({ navigation, route }: AuthScreenProps<'ForgotPassword'>) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const typo = useTypography();
  const { show: showAlert } = useAlertStore();
  const [phone, setPhone] = useState(route.params?.prefillPhone?.replace(/\D/g, '') ?? '');
  const [submitting, withSubmit] = useSubmitting();

  const handleSend = () => withSubmit(async () => {
    const trimmed = phone.trim();
    if (!trimmed) return;
    try {
      const res = await authExtApi.requestPasswordReset(trimmed);
      const maskedPhone = res.data?.data?.maskedPhone ?? trimmed;
      navigation.navigate('OtpVerify', { phone: trimmed, maskedPhone });
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 429) {
        showAlert(t('auth.forgotPassword.rateLimitedTitle'), t('auth.forgotPassword.rateLimited'));
      } else {
        showAlert(t('auth.forgotPassword.networkErrorTitle'), t('auth.forgotPassword.networkError'));
      }
    }
  });

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
          {/* Back */}
          <TouchableOpacity
            className="mb-6 self-start"
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color="#374151" />
          </TouchableOpacity>

          {/* Zalo icon + title */}
          <View className="w-14 h-14 rounded-2xl bg-blue-50 items-center justify-center mb-4">
            <MaterialCommunityIcons name="message-text-outline" size={28} color="#0068ff" />
          </View>
          <Text className={`${typo.heading} text-gray-900 dark:text-white mb-1`}>
            {t('auth.forgotPassword.title')}
          </Text>
          <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 mb-8 leading-5`}>
            {t('auth.forgotPassword.subtitle')}
          </Text>

          {/* Phone input */}
          <View className="mb-6">
            <Text className={`${typo.label} text-gray-700 dark:text-gray-300 mb-2`}>
              {t('auth.forgotPassword.phoneLabel')}
            </Text>
            <PhoneInput
              value={phone}
              onChangeRaw={setPhone}
              placeholder="0901 234 567"
              returnKeyType="send"
              onSubmitEditing={handleSend}
            />
          </View>

          {/* Submit */}
          <TouchableOpacity
            className={`rounded-2xl py-4 items-center justify-center flex-row gap-x-2 ${
              submitting || !phone.trim() ? 'bg-gray-200 dark:bg-gray-700' : 'bg-primary active:opacity-80'
            }`}
            onPress={handleSend}
            disabled={submitting || !phone.trim()}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <MaterialCommunityIcons
                  name="send-outline"
                  size={17}
                  color={phone.trim() ? '#fff' : '#9ca3af'}
                />
                <Text className={`${typo.labelBold} ${!phone.trim() ? 'text-gray-400 dark:text-gray-500' : 'text-white'}`}>
                  {t('auth.forgotPassword.send')}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Hint */}
          <View className="mt-5 flex-row items-start gap-x-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3">
            <MaterialCommunityIcons name="information-outline" size={15} color="#3b82f6" style={{ marginTop: 1 }} />
            <Text className={`${typo.caption} text-blue-700 dark:text-blue-300 flex-1 leading-5`}>
              {t('auth.forgotPassword.hint')}
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
