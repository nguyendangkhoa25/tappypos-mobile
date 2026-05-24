import { useState, useRef } from 'react';
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
import { isAxiosError } from 'axios';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { PasswordInput } from '../../components/PasswordInput';
import { useSubmitting } from '../../hooks/useSubmitting';
import { useTypography } from '../../hooks/useTypography';
import { useAlertStore } from '../../store/alertStore';
import { useToastStore } from '../../store/toastStore';
import { authExtApi } from '../../services/api';
import type { AuthScreenProps } from '../../types/navigation';

export function ResetPasswordScreen({ navigation, route }: AuthScreenProps<'ResetPassword'>) {
  const { resetToken } = route.params;
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const typo = useTypography();
  const { show: showAlert } = useAlertStore();
  const { show: showToast } = useToastStore();
  const [submitting, withSubmit] = useSubmitting();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const confirmRef = useRef<TextInput>(null);

  const passwordsMatch = confirmPassword.length > 0 && newPassword === confirmPassword;
  const canSubmit = newPassword.length >= 8 && passwordsMatch;

  const handleSubmit = () => withSubmit(async () => {
    if (!canSubmit) return; // safety guard for keyboard-submit edge case
    try {
      await authExtApi.resetPassword(resetToken, newPassword);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast(t('auth.resetPassword.successToast'), undefined, 'success');
      // Clear the auth stack so Back doesn't return to OTP/reset screens
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      if (isAxiosError(err)) {
        if (!err.response) {
          showAlert(t('auth.forgotPassword.networkErrorTitle'), t('auth.forgotPassword.networkError'));
        } else if (err.response.status === 400) {
          // Likely expired/invalid reset token
          showAlert(
            t('auth.resetPassword.tokenExpiredTitle'),
            t('auth.resetPassword.tokenExpiredMsg'),
            [{ label: 'OK', onPress: () => navigation.reset({ index: 0, routes: [{ name: 'ForgotPassword' }] }) }],
          );
        } else {
          const msg = err.response?.data?.message ?? t('auth.forgotPassword.networkError');
          showAlert(t('auth.resetPassword.errorTitle'), msg);
        }
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

          {/* Icon + title */}
          <View className="w-14 h-14 rounded-2xl bg-green-50 items-center justify-center mb-4">
            <MaterialCommunityIcons name="lock-reset" size={28} color="#059669" />
          </View>
          <Text className={`${typo.heading} text-gray-900 dark:text-white mb-1`}>
            {t('auth.resetPassword.title')}
          </Text>
          <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 mb-8 leading-5`}>
            {t('auth.resetPassword.subtitle')}
          </Text>

          {/* New password */}
          <View className="mb-5">
            <Text className={`${typo.label} text-gray-700 dark:text-gray-300 mb-2`}>
              {t('auth.resetPassword.newPasswordLabel')}
            </Text>
            <PasswordInput
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder={t('auth.resetPassword.newPasswordPlaceholder')}
              showRules
              returnKeyType="next"
              onSubmitEditing={() => confirmRef.current?.focus()}
            />
          </View>

          {/* Confirm password */}
          <View className="mb-6">
            <Text className={`${typo.label} text-gray-700 dark:text-gray-300 mb-2`}>
              {t('auth.resetPassword.confirmPasswordLabel')}
            </Text>
            <PasswordInput
              ref={confirmRef}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder={t('auth.resetPassword.confirmPasswordPlaceholder')}
              showStrength={false}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />
            {/* Live match indicator — mirrors RegisterScreen pattern exactly */}
            {confirmPassword.length > 0 && (
              <View className="flex-row items-center gap-1 mt-1">
                <MaterialCommunityIcons
                  name={passwordsMatch ? 'check-circle' : 'close-circle'}
                  size={14}
                  color={passwordsMatch ? '#059669' : '#ef4444'}
                />
                <Text className={`${typo.caption} ${passwordsMatch ? 'text-green-600' : 'text-red-500'}`}>
                  {passwordsMatch ? t('auth.resetPassword.match') : t('auth.resetPassword.mismatch')}
                </Text>
              </View>
            )}
          </View>

          {/* Submit */}
          <TouchableOpacity
            className={`rounded-2xl py-4 items-center justify-center flex-row gap-x-2 ${
              submitting || !canSubmit
                ? 'bg-gray-200 dark:bg-gray-700'
                : 'bg-primary active:opacity-80'
            }`}
            onPress={handleSubmit}
            disabled={submitting || !canSubmit}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <MaterialCommunityIcons
                  name="check-circle-outline"
                  size={18}
                  color={canSubmit ? '#fff' : '#9ca3af'}
                />
                <Text className={`${typo.labelBold} ${!canSubmit ? 'text-gray-400 dark:text-gray-500' : 'text-white'}`}>
                  {t('auth.resetPassword.submit')}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Security note */}
          <View className="mt-5 flex-row items-start gap-x-2 bg-green-50 dark:bg-green-900/20 rounded-xl p-3">
            <MaterialCommunityIcons
              name="shield-check-outline"
              size={15}
              color="#059669"
              style={{ marginTop: 1 }}
            />
            <Text className={`${typo.caption} text-green-700 dark:text-green-300 flex-1 leading-5`}>
              {t('auth.resetPassword.securityNote')}
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
