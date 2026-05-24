import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Keyboard,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { invitationApi, type InvitationPreviewResponse } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useTypography } from '../../hooks/useTypography';
import type { OnboardingScreenProps } from '../../types/navigation';

// ── Shop type → emoji ─────────────────────────────────────────────────────────

const SHOP_TYPE_EMOJI: Record<string, string> = {
  CONVENIENCE_STORE: '🏪',
  FOOD_BEVERAGE: '🍱',
  RESTAURANT: '🍜',
  COFFEE_SHOP: '☕',
  PUB: '🍺',
  FASHION: '👗',
  ELECTRONICS: '📱',
  BARBER_SHOP: '💇',
  BARBER_SHOP_MEN: '✂️',
  HAIR_SALON: '💁',
  NAIL_SHOP: '💅',
  LASH_PMU_STUDIO: '👁️',
  SPA_SHOP: '🧖',
  MASSAGE_SHOP: '🤲',
  BEAUTY_CLINIC: '🏥',
  MAKEUP_STUDIO: '💄',
  BOOK_STORE: '📚',
  PHARMACY: '💊',
  JEWELRY: '💍',
  PAWN_SHOP: '🏦',
  OTHER: '🏢',
};

// ── Countdown ─────────────────────────────────────────────────────────────────

function useCountdown(targetSeconds: number | null) {
  const [remaining, setRemaining] = useState(targetSeconds ?? 0);

  useEffect(() => {
    if (targetSeconds === null) return;
    setRemaining(targetSeconds);
    if (targetSeconds <= 0) return;
    const id = setInterval(() => setRemaining((s) => Math.max(0, s - 1)), 1_000);
    return () => clearInterval(id);
  }, [targetSeconds]);

  const m = Math.floor(remaining / 60);
  const s = remaining % 60;
  const formatted = m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${remaining}s`;
  return { remaining, formatted, expired: remaining === 0 && targetSeconds !== null };
}

// ── Screen ────────────────────────────────────────────────────────────────────

export function JoinShopScreen({ navigation }: OnboardingScreenProps<'JoinShop'>) {
  const { top, bottom } = useSafeAreaInsets();
  const { t } = useTranslation();
  const typo = useTypography();
  const { setAuthenticated } = useAuthStore();

  const [code, setCode] = useState('');
  const [preview, setPreview] = useState<InvitationPreviewResponse | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewSeconds, setPreviewSeconds] = useState<number | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { remaining, formatted, expired } = useCountdown(previewSeconds);

  // Preview mutation — fires on debounce as user types
  const previewMutation = useMutation({
    mutationFn: (c: string) => invitationApi.preview(c),
    onSuccess: (res) => {
      const data = res.data.data!;
      setPreview(data);
      setPreviewSeconds(data.secondsRemaining);
      setPreviewError(null);
    },
    onError: () => {
      setPreview(null);
      setPreviewSeconds(null);
      setPreviewError(t('onboarding.joinShop.invalidCode'));
    },
  });

  // Debounce preview when code reaches 6 chars
  useEffect(() => {
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length < 6) {
      setPreview(null);
      setPreviewError(null);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      previewMutation.mutate(trimmed);
    }, 400);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  // Join mutation
  const joinMutation = useMutation({
    mutationFn: () => invitationApi.join(code.trim().toUpperCase()),
    onSuccess: async (res) => {
      const data = res.data.data!;
      // Swap token — no logout required; setAuthenticated parses the JWT and
      // updates tenantId, features, and shopType from the new token claims.
      await setAuthenticated({ accessToken: data.accessToken });
      Alert.alert(
        t('onboarding.joinShop.successTitle'),
        t('onboarding.joinShop.successMessage', { shopName: preview?.shopName ?? '' }),
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate to the main app — RootNavigator will pick up new auth state
              // @ts-ignore root navigation
              navigation.reset({ index: 0, routes: [{ name: 'App' }] });
            },
          },
        ]
      );
    },
    onError: (err: any) => {
      const msg =
        err?.response?.data?.message ?? t('onboarding.joinShop.invalidCode');
      Alert.alert(t('common.error'), msg);
    },
  });

  const handleJoin = () => {
    if (!preview || expired) return;
    Keyboard.dismiss();
    Alert.alert(
      t('onboarding.joinShop.confirmTitle'),
      t('onboarding.joinShop.confirmMessage', {
        shopName: preview.shopName,
        roleName: t(`roles.${preview.roleName}`, { defaultValue: preview.roleName }),
      }),
      [
        { text: t('onboarding.joinShop.confirmNo'), style: 'cancel' },
        {
          text: t('onboarding.joinShop.confirmYes'),
          onPress: () => joinMutation.mutate(),
        },
      ]
    );
  };

  const isLookingUp = previewMutation.isPending && code.length >= 6;
  const canConfirm = !!preview && !expired && !joinMutation.isPending;

  return (
    <View className="flex-1 bg-emerald-50 dark:bg-gray-900">
      {/* Header */}
      <View
        className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4"
        style={{ paddingTop: top + 12, paddingBottom: 14 }}
      >
        <View>
          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              className="mr-2"
            >
              <MaterialCommunityIcons name="chevron-left" size={26} color="#059669" />
            </TouchableOpacity>
            <Text className={`${typo.heading} text-gray-900 dark:text-white flex-1`}>
              {t('onboarding.joinShop.title')}
            </Text>
          </View>
          <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 mt-0.5`}>
            {t('onboarding.joinShop.subtitle')}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ flexGrow: 1, padding: 20, paddingBottom: bottom + 32 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Code input */}
        <Text className={`${typo.labelBold} text-gray-700 dark:text-gray-300 mb-2`}>
          {t('onboarding.joinShop.codeLabel')}
        </Text>
        <View className="relative">
          <TextInput
            className="bg-white dark:bg-gray-800 rounded-2xl px-5 py-4 text-center border border-gray-200 dark:border-gray-600"
            style={{
              fontSize: typo.displaySize,
              fontWeight: '800',
              letterSpacing: 10,
              color: '#111827',
              fontFamily: 'monospace',
            }}
            placeholder={t('onboarding.joinShop.codePlaceholder')}
            placeholderTextColor="#d1d5db"
            value={code}
            onChangeText={(v) => setCode(v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={6}
            returnKeyType="done"
            onSubmitEditing={() => code.length >= 6 && previewMutation.mutate(code)}
          />
          {/* Spinner inside input */}
          {isLookingUp && (
            <View className="absolute right-4 self-center" style={{ top: '50%', marginTop: -10 }}>
              <ActivityIndicator size="small" color="#059669" />
            </View>
          )}
        </View>

        {/* Error state */}
        {previewError && (
          <View className="flex-row items-center gap-2 mt-3">
            <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#ef4444" />
            <Text className="text-red-500 text-sm">{previewError}</Text>
          </View>
        )}

        {/* Shop preview card */}
        {preview && !expired && (
          <View
            className="mt-5 bg-white dark:bg-gray-800 rounded-2xl p-5 border border-emerald-100 dark:border-emerald-800"
            style={{ shadowColor: '#059669', shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 }}
          >
            {/* Shop name + emoji */}
            <View className="flex-row items-center gap-3 mb-4">
              <Text style={{ fontSize: typo.displaySize }}>
                {SHOP_TYPE_EMOJI[preview.shopType] ?? '🏪'}
              </Text>
              <View className="flex-1">
                <Text
                  className={`${typo.section} text-gray-900 dark:text-white font-bold`}
                  numberOfLines={2}
                >
                  {preview.shopName}
                </Text>
              </View>
            </View>

            {/* Info rows */}
            <View className="gap-2">
              {/* Role */}
              <View className="flex-row items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                <Text className={`${typo.caption} text-gray-500 dark:text-gray-400`}>
                  {t('onboarding.joinShop.shopCard.role')}
                </Text>
                <View className="bg-emerald-100 dark:bg-emerald-900/40 rounded-full px-3 py-1">
                  <Text className="text-emerald-700 dark:text-emerald-300 font-semibold text-sm">
                    {t(`roles.${preview.roleName}`, { defaultValue: preview.roleName })}
                  </Text>
                </View>
              </View>

              {/* Countdown */}
              <View className="flex-row items-center justify-between py-2">
                <Text className={`${typo.caption} text-gray-500 dark:text-gray-400`}>
                  {t('onboarding.joinShop.shopCard.expires')}
                </Text>
                <View className="flex-row items-center gap-1">
                  <MaterialCommunityIcons
                    name="clock-outline"
                    size={14}
                    color={remaining < 60 ? '#ef4444' : '#059669'}
                  />
                  <Text
                    className={`${typo.label} font-bold`}
                    style={{ color: remaining < 60 ? '#ef4444' : '#059669' }}
                  >
                    {formatted}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Expired notice — distinct from "invalid code" so the user knows to request a fresh one */}
        {expired && preview && (
          <View className="mt-5 bg-red-50 dark:bg-red-900/20 rounded-2xl p-4 flex-row items-center gap-3">
            <MaterialCommunityIcons name="clock-alert-outline" size={22} color="#ef4444" />
            <Text className="text-red-600 dark:text-red-400 font-medium flex-1">
              {t('onboarding.joinShop.expiredCode')}
            </Text>
          </View>
        )}

        <View className="flex-1" />

        {/* Confirm button */}
        <TouchableOpacity
          onPress={handleJoin}
          disabled={!canConfirm}
          className="rounded-2xl py-4 items-center justify-center mt-6"
          style={{
            backgroundColor: canConfirm ? '#059669' : '#d1d5db',
            shadowColor: canConfirm ? '#059669' : 'transparent',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 8,
            elevation: canConfirm ? 5 : 0,
          }}
        >
          {joinMutation.isPending ? (
            <View className="flex-row items-center gap-2">
              <ActivityIndicator color="white" size="small" />
              <Text className="text-white font-semibold text-base">
                {t('onboarding.joinShop.joining')}
              </Text>
            </View>
          ) : (
            <Text className="text-white font-semibold text-base">
              {t('onboarding.joinShop.confirmBtn')}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
