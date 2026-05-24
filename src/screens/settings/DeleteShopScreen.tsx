import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { shopDeletionApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useTypography } from '../../hooks/useTypography';
import type { MoreScreenProps } from '../../types/navigation';

// ── Countdown for auto-logout ─────────────────────────────────────────────────

function useCountdown(seconds: number, active: boolean, onComplete: () => void) {
  const [remaining, setRemaining] = useState(seconds);
  const cbRef = useRef(onComplete);
  cbRef.current = onComplete;

  useEffect(() => {
    if (!active) return;
    setRemaining(seconds);
    const id = setInterval(() => {
      setRemaining((s) => {
        if (s <= 1) {
          clearInterval(id);
          cbRef.current();
          return 0;
        }
        return s - 1;
      });
    }, 1_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return remaining;
}

// ── Screen ────────────────────────────────────────────────────────────────────

export function DeleteShopScreen({ navigation }: MoreScreenProps<'DeleteShop'>) {
  const { top, bottom } = useSafeAreaInsets();
  const { t } = useTranslation();
  const typo = useTypography();
  const logout = useAuthStore((s) => s.logout);

  // The user must type this exact word to enable the confirm button
  const CONFIRM_WORD = t('deleteShop.confirmWord');  // "XOÁ"

  const [confirmInput, setConfirmInput] = useState('');
  const [deleted, setDeleted] = useState(false);
  const [reason, setReason] = useState('');

  const doLogout = useCallback(async () => {
    await logout();
    navigation.reset({ index: 0, routes: [{ name: 'MoreMain' }] });
  }, [logout, navigation]);

  // Countdown starts only after successful deletion
  const countdown = useCountdown(5, deleted, doLogout);

  const deleteMutation = useMutation({
    mutationFn: () =>
      shopDeletionApi.deleteShop({ confirmToken: 'DELETE', reason: reason.trim() || undefined }),
    onSuccess: () => {
      setDeleted(true);
    },
    onError: (error: any) => {
      const msg =
        error?.response?.data?.message ?? t('deleteShop.errorFailed');
      Alert.alert(t('common.error'), msg);
    },
  });

  const inputMatches = confirmInput.trim().toUpperCase() === CONFIRM_WORD.toUpperCase();

  const handleConfirm = () => {
    if (!inputMatches) return;
    Alert.alert(
      t('deleteShop.finalAlertTitle'),
      t('deleteShop.finalAlertMsg'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('deleteShop.finalAlertConfirm'),
          style: 'destructive',
          onPress: () => deleteMutation.mutate(),
        },
      ],
    );
  };

  // ── Success state — countdown to auto-logout ──────────────────────────────
  if (deleted) {
    return (
      <View className="flex-1 bg-gray-50 dark:bg-gray-900 items-center justify-center px-8">
        <View className="w-20 h-20 rounded-full bg-red-100 items-center justify-center mb-6">
          <MaterialCommunityIcons name="store-remove" size={40} color="#dc2626" />
        </View>
        <Text className={`${typo.heading} text-gray-900 dark:text-white text-center mb-3`}>
          {t('deleteShop.successTitle')}
        </Text>
        <Text className={`${typo.body} text-gray-500 dark:text-gray-400 text-center mb-8 leading-6`}>
          {t('deleteShop.successHint')}
        </Text>
        <View className="bg-red-50 dark:bg-red-900/20 rounded-2xl px-6 py-4 items-center">
          <Text className={`${typo.caption} text-red-600 dark:text-red-400 mb-1`}>
            {t('deleteShop.loggingOutIn')}
          </Text>
          <Text style={{ fontSize: typo.displaySize, fontWeight: '800', color: '#dc2626' }}>
            {countdown}
          </Text>
        </View>

        <TouchableOpacity
          onPress={doLogout}
          className="mt-6 px-8 py-3 bg-red-600 rounded-2xl"
        >
          <Text className="text-white font-semibold text-base">
            {t('deleteShop.logoutNow')}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Normal state — warning + confirmation form ────────────────────────────
  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <View
        className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4"
        style={{ paddingTop: top + 12, paddingBottom: 12 }}
      >
        <View className="flex-row items-center mb-1">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            className="mr-2"
          >
            <MaterialCommunityIcons name="chevron-left" size={26} color="#dc2626" />
          </TouchableOpacity>
          <Text className={`${typo.heading} text-red-600 dark:text-red-400 flex-1`}>
            {t('deleteShop.title')}
          </Text>
        </View>
        <Text className={`${typo.caption} text-gray-500 dark:text-gray-400`}>
          {t('deleteShop.subtitle')}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: bottom + 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Warning card */}
        <View className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-4 mb-5 border border-red-200 dark:border-red-800">
          <View className="flex-row items-center gap-2 mb-3">
            <MaterialCommunityIcons name="alert-octagon" size={22} color="#dc2626" />
            <Text className={`${typo.labelBold} text-red-700 dark:text-red-400`}>
              {t('deleteShop.warningTitle')}
            </Text>
          </View>
          {(t('deleteShop.warningItems', { returnObjects: true }) as string[]).map((item, i) => (
            <View key={i} className="flex-row items-start gap-2 mb-1.5">
              <Text className="text-red-500 mt-0.5">•</Text>
              <Text className={`${typo.caption} text-red-700 dark:text-red-300 flex-1 leading-5`}>
                {item}
              </Text>
            </View>
          ))}
        </View>

        {/* Irreversible notice */}
        <View className="flex-row items-center gap-2 bg-orange-50 dark:bg-orange-900/20 rounded-xl p-3 mb-5 border border-orange-200 dark:border-orange-800">
          <MaterialCommunityIcons name="lock-reset" size={18} color="#ea580c" />
          <Text className={`${typo.caption} text-orange-700 dark:text-orange-300 flex-1 leading-5`}>
            {t('deleteShop.irreversibleNotice')}
          </Text>
        </View>

        {/* Optional reason */}
        <Text className={`${typo.labelBold} text-gray-700 dark:text-gray-300 mb-2`}>
          {t('deleteShop.reasonLabel')}
        </Text>
        <TextInput
          value={reason}
          onChangeText={setReason}
          placeholder={t('deleteShop.reasonPlaceholder')}
          placeholderTextColor="#9ca3af"
          multiline
          numberOfLines={3}
          className={`bg-white dark:bg-gray-800 rounded-xl px-4 py-3 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 mb-5 ${typo.inputSize}`}
          style={{ textAlignVertical: 'top', minHeight: 72 }}
        />

        {/* Confirm input */}
        <Text className={`${typo.labelBold} text-gray-700 dark:text-gray-300 mb-1`}>
          {t('deleteShop.confirmLabel')}
        </Text>
        <Text className={`${typo.caption} text-gray-400 dark:text-gray-500 mb-2`}>
          {t('deleteShop.confirmHint', { word: CONFIRM_WORD })}
        </Text>
        <TextInput
          value={confirmInput}
          onChangeText={(v) => setConfirmInput(v.toUpperCase())}
          placeholder={CONFIRM_WORD}
          placeholderTextColor="#d1d5db"
          autoCapitalize="characters"
          returnKeyType="done"
          className={`bg-white dark:bg-gray-800 rounded-xl px-4 py-4 border mb-6 ${typo.inputSize}`}
          style={{
            fontWeight: '700',
            letterSpacing: 4,
            textAlign: 'center',
            borderColor: inputMatches ? '#dc2626' : '#e5e7eb',
            color: inputMatches ? '#dc2626' : '#111827',
          }}
        />

        {/* Confirm button */}
        <TouchableOpacity
          onPress={handleConfirm}
          disabled={!inputMatches || deleteMutation.isPending}
          className="rounded-2xl py-4 items-center justify-center"
          style={{
            backgroundColor:
              !inputMatches || deleteMutation.isPending ? '#d1d5db' : '#dc2626',
          }}
        >
          {deleteMutation.isPending ? (
            <View className="flex-row items-center gap-2">
              <ActivityIndicator color="white" size="small" />
              <Text className="text-white font-semibold text-base">
                {t('deleteShop.deleting')}
              </Text>
            </View>
          ) : (
            <Text
              className="font-semibold text-base"
              style={{ color: !inputMatches ? '#9ca3af' : 'white' }}
            >
              {t('deleteShop.confirmBtn')}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
