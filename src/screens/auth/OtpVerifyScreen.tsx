import { useState, useEffect, useRef, useCallback } from 'react';
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
import { useSubmitting } from '../../hooks/useSubmitting';
import { useTypography } from '../../hooks/useTypography';
import { useAlertStore } from '../../store/alertStore';
import { authExtApi } from '../../services/api';
import type { AuthScreenProps } from '../../types/navigation';

const OTP_LENGTH = 6;
const OTP_TTL_SECS = 5 * 60;       // 5 minutes — matches backend
const RESEND_COOLDOWN_SECS = 60;    // user must wait 60 s between resends

export function OtpVerifyScreen({ navigation, route }: AuthScreenProps<'OtpVerify'>) {
  const { phone, maskedPhone } = route.params;
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const typo = useTypography();
  const { show: showAlert } = useAlertStore();

  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [locked, setLocked] = useState(false);
  const [submitting, withSubmit] = useSubmitting();
  const [resending, withResend] = useSubmitting();

  // Countdown for OTP expiry
  const [ttlSecs, setTtlSecs] = useState(OTP_TTL_SECS);
  // Cooldown before resend is allowed
  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN_SECS);

  const hiddenRef = useRef<TextInput>(null);
  const ttlRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Run once on mount: focus input and start both timers.
  // startTtlCountdown / startResendCooldown are useCallback([]) — stable refs;
  // focusHidden is intentionally excluded (plain fn, mount-only intent).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    focusHidden();
    startTtlCountdown();
    startResendCooldown();
    return () => {
      if (ttlRef.current) clearInterval(ttlRef.current);
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  const startTtlCountdown = useCallback(() => {
    if (ttlRef.current) clearInterval(ttlRef.current);
    setTtlSecs(OTP_TTL_SECS);
    ttlRef.current = setInterval(() => {
      setTtlSecs((s) => {
        if (s <= 1) {
          clearInterval(ttlRef.current!);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }, []);

  const startResendCooldown = useCallback(() => {
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    setResendCooldown(RESEND_COOLDOWN_SECS);
    cooldownRef.current = setInterval(() => {
      setResendCooldown((s) => {
        if (s <= 1) {
          clearInterval(cooldownRef.current!);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }, []);

  const focusHidden = () => {
    setTimeout(() => hiddenRef.current?.focus(), 200);
  };

  const fmtTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  // Handle input from hidden TextInput
  const handleOtpChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, OTP_LENGTH);
    setOtp(digits);
    setError('');
    if (digits.length === OTP_LENGTH) {
      handleVerify(digits);
    }
  };

  const handleVerify = (code = otp) => withSubmit(async () => {
    if (code.length !== OTP_LENGTH || ttlSecs === 0) return;
    setError('');
    try {
      const res = await authExtApi.verifyOtp(phone, code);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const resetToken = res.data.data.resetToken;
      navigation.navigate('ResetPassword', { resetToken });
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setOtp('');
      focusHidden();
      if (isAxiosError(err)) {
        if (err.response?.status === 429) {
          // Too many wrong attempts — lock the screen, alert user to resend
          setLocked(true);
          showAlert(
            t('auth.forgotPassword.otp.lockedTitle'),
            t('auth.forgotPassword.otp.locked'),
          );
        } else if (!err.response) {
          showAlert(t('auth.forgotPassword.networkErrorTitle'), t('auth.forgotPassword.networkError'));
        } else {
          // Wrong code but still has remaining attempts — inline feedback so user can retry
          const msg = err.response?.data?.message ?? t('auth.forgotPassword.otp.wrong');
          setError(msg);
        }
      } else {
        showAlert(t('auth.forgotPassword.networkErrorTitle'), t('auth.forgotPassword.networkError'));
      }
    }
  });

  const handleResend = () => withResend(async () => {
    setError('');
    setLocked(false);
    setOtp('');
    try {
      await authExtApi.requestPasswordReset(phone);
      Haptics.selectionAsync();
      startTtlCountdown();
      startResendCooldown();
      focusHidden();
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 429) {
        showAlert(t('auth.forgotPassword.rateLimitedTitle'), t('auth.forgotPassword.rateLimited'));
      } else {
        showAlert(t('auth.forgotPassword.networkErrorTitle'), t('auth.forgotPassword.networkError'));
      }
    }
  });

  const expired = ttlSecs === 0;
  const canResend = resendCooldown === 0 && !resending;

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white dark:bg-gray-900"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Hidden input captures keyboard input on iOS/Android */}
      <TextInput
        ref={hiddenRef}
        value={otp}
        onChangeText={handleOtpChange}
        keyboardType="number-pad"
        maxLength={OTP_LENGTH}
        className="absolute opacity-0 w-0 h-0"
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
      />

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
          <View className="w-14 h-14 rounded-2xl bg-indigo-50 items-center justify-center mb-4">
            <MaterialCommunityIcons name="shield-key-outline" size={28} color="#4f46e5" />
          </View>
          <Text className={`${typo.heading} text-gray-900 dark:text-white mb-1`}>
            {t('auth.forgotPassword.otp.title')}
          </Text>
          <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 mb-8 leading-5`}>
            {t('auth.forgotPassword.otp.subtitle', { maskedPhone })}
          </Text>

          {/* OTP boxes — tap anywhere to focus hidden input */}
          <TouchableOpacity
            activeOpacity={1}
            onPress={focusHidden}
            className="flex-row justify-center gap-x-3 mb-3"
          >
            {Array.from({ length: OTP_LENGTH }).map((_, i) => {
              const char = otp[i] ?? '';
              const isCursor = !locked && !expired && i === otp.length && otp.length < OTP_LENGTH;
              const filled = char !== '';
              return (
                <View
                  key={i}
                  className={`w-12 h-14 rounded-xl border-2 items-center justify-center ${
                    locked
                      ? 'border-red-200 bg-red-50 dark:bg-red-900/20'
                      : isCursor
                      ? 'border-indigo-500 bg-white dark:bg-gray-800'
                      : filled
                      ? 'border-indigo-300 bg-indigo-50 dark:bg-indigo-900/20'
                      : 'border-gray-200 bg-gray-50 dark:bg-gray-800 dark:border-gray-600'
                  }`}
                >
                  {filled ? (
                    <Text
                      className={`font-bold text-2xl ${
                        locked ? 'text-red-500' : 'text-indigo-600 dark:text-indigo-400'
                      }`}
                    >
                      {char}
                    </Text>
                  ) : isCursor ? (
                    <View className="w-0.5 h-6 bg-indigo-500 rounded-full" />
                  ) : null}
                </View>
              );
            })}
          </TouchableOpacity>

          {/* Wrong-code inline error (remaining attempts — user can still retry) */}
          {error ? (
            <Text className={`${typo.caption} text-red-500 mb-4 text-center`}>{error}</Text>
          ) : null}

          {/* Expired warning */}
          {expired && !locked ? (
            <View className="flex-row items-center gap-x-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5 mb-4">
              <MaterialCommunityIcons name="clock-alert-outline" size={15} color="#d97706" />
              <Text className={`${typo.caption} text-amber-700 dark:text-amber-400`}>
                {t('auth.forgotPassword.otp.expired')}
              </Text>
            </View>
          ) : null}

          {/* Countdown */}
          {!expired && !locked && (
            <View className="flex-row items-center justify-center gap-x-1.5 mb-5">
              <MaterialCommunityIcons name="clock-outline" size={14} color="#9ca3af" />
              <Text className={`${typo.caption} text-gray-400`}>
                {t('auth.forgotPassword.otp.expiresIn', { time: fmtTime(ttlSecs) })}
              </Text>
            </View>
          )}

          {/* Verify button */}
          {!expired && !locked && (
            <TouchableOpacity
              className={`rounded-2xl py-4 items-center justify-center mb-4 ${
                submitting || otp.length < OTP_LENGTH
                  ? 'bg-gray-200 dark:bg-gray-700'
                  : 'bg-primary active:opacity-80'
              }`}
              onPress={() => handleVerify()}
              disabled={submitting || otp.length < OTP_LENGTH}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className={`${typo.labelBold} ${otp.length < OTP_LENGTH ? 'text-gray-400 dark:text-gray-500' : 'text-white'}`}>
                  {t('auth.forgotPassword.otp.verify')}
                </Text>
              )}
            </TouchableOpacity>
          )}

          {/* Resend */}
          <TouchableOpacity
            className={`rounded-2xl py-3.5 items-center justify-center border flex-row gap-x-2 ${
              canResend
                ? 'border-indigo-200 bg-indigo-50 active:opacity-80'
                : 'border-gray-200 bg-gray-50 dark:bg-gray-800 dark:border-gray-700'
            }`}
            onPress={handleResend}
            disabled={!canResend}
          >
            {resending ? (
              <ActivityIndicator color="#4f46e5" size="small" />
            ) : (
              <>
                <MaterialCommunityIcons
                  name="refresh"
                  size={16}
                  color={canResend ? '#4f46e5' : '#9ca3af'}
                />
                <Text className={`${typo.label} ${canResend ? 'text-indigo-600' : 'text-gray-400 dark:text-gray-500'}`}>
                  {resendCooldown > 0
                    ? t('auth.forgotPassword.otp.resendIn', { secs: resendCooldown })
                    : t('auth.forgotPassword.otp.resend')}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
