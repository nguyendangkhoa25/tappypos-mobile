import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { pawnApi } from '../../services/api';
import { useTypography } from '../../hooks/useTypography';
import { useToastStore } from '../../store/toastStore';
import { useErrorAlert } from '../../hooks/useErrorAlert';
import { formatVnd } from '../../utils/format';

const PAWN_ITEM_TYPES: { code: string; emoji: string }[] = [
  { code: 'GOLD',        emoji: '🥇' },
  { code: 'ELECTRONICS', emoji: '📱' },
  { code: 'MOTORBIKE',   emoji: '🛵' },
  { code: 'CAR',         emoji: '🚗' },
  { code: 'WATCH',       emoji: '⌚' },
  { code: 'REAL_ESTATE', emoji: '🏠' },
  { code: 'GENERAL',     emoji: '📦' },
  { code: 'OTHER',       emoji: '🔧' },
];

// interestType int ↔ PawnInterestCalculation enum name
// Stored as int in shop_config; matches backend defaults (30 = DAILY_30)
type CalcMode = { code: 'DAILY_30' | 'DAILY_25' | 'MONTHLY' | 'BIWEEKLY'; value: number };

const CALC_MODES: CalcMode[] = [
  { code: 'DAILY_30',  value: 30 },
  { code: 'DAILY_25',  value: 25 },
  { code: 'MONTHLY',   value: 1  },
  { code: 'BIWEEKLY',  value: 15 },
];

// Live interest preview for the selected mode
function calcExample(mode: CalcMode['code'], rate: number): number {
  const principal = 10_000_000;
  const r = rate / 100;
  const days = 31;
  switch (mode) {
    case 'DAILY_30':  return Math.round(principal * r / 30 * days);
    case 'DAILY_25': {
      const full = Math.floor(days / 30);
      const rem  = days % 30;
      const daily = principal * r / 30;
      return Math.round(daily * 25 * full + daily * Math.min(rem, 25));
    }
    case 'MONTHLY':  return Math.round(principal * r * Math.ceil(days / 30));
    case 'BIWEEKLY': return Math.round(principal * r * Math.ceil(days / 15) / 2);
  }
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <View className="mx-3 mb-3 bg-white dark:bg-gray-800 rounded-2xl overflow-hidden">
      {children}
    </View>
  );
}

function SectionTitle({ title, hint }: { title: string; hint?: string }) {
  const typo = useTypography();
  return (
    <View className="px-4 pt-4 pb-2">
      <Text className={`${typo.captionBold} text-gray-500 dark:text-gray-400 uppercase tracking-wide`}>{title}</Text>
      {hint && <Text className={`${typo.caption} text-gray-400 dark:text-gray-500 mt-0.5`}>{hint}</Text>}
    </View>
  );
}

function SettingRow({
  label, children, hint, noBorder,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
  noBorder?: boolean;
}) {
  const typo = useTypography();
  return (
    <View className={`px-4 py-3 ${noBorder ? '' : 'border-b border-gray-50 dark:border-gray-700/50'}`}>
      <View className="flex-row items-center justify-between">
        <Text className={`${typo.caption} font-medium text-gray-800 dark:text-white flex-1 mr-3`}>{label}</Text>
        {children}
      </View>
      {hint && <Text className={`${typo.caption} text-gray-400 dark:text-gray-500 mt-1`}>{hint}</Text>}
    </View>
  );
}

export function PawnSettingsScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const typo = useTypography();
  const navigation = useNavigation();
  const qc = useQueryClient();
  const showError = useErrorAlert();
  const showToast = useToastStore((s) => s.show);

  const [rate, setRate]         = useState('');
  const [dueDays, setDueDays]   = useState('');
  const [modeValue, setModeValue] = useState(30); // interestType int
  const [acceptedTypes, setAcceptedTypes] = useState<Set<string>>(
    new Set(['GOLD', 'ELECTRONICS', 'MOTORBIKE', 'CAR', 'WATCH', 'REAL_ESTATE', 'GENERAL', 'OTHER']),
  );

  const { data, isLoading } = useQuery({
    queryKey: ['pawnSettings'],
    queryFn: () => pawnApi.getSettings().then((r) => r.data.data),
    staleTime: 5 * 60_000,
  });

  useEffect(() => {
    if (data) {
      setRate(data.interestRate ? String(data.interestRate) : '');
      setDueDays(data.dueDate ? String(data.dueDate) : '30');
      setModeValue(data.interestType || 30);
      if (data.acceptedTypes) {
        setAcceptedTypes(new Set(data.acceptedTypes.split(',').map((s) => s.trim()).filter(Boolean)));
      }
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: () =>
      pawnApi.saveSettings({
        interestRate: parseFloat(rate) || 0,
        interestType: modeValue,
        dueDate: parseInt(dueDays, 10) || 30,
        acceptedTypes: [...acceptedTypes].join(','),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pawnSettings'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast(t('pawn.settings.saved'), undefined, 'success');
      navigation.goBack();
    },
    onError: showError,
  });

  const selectedMode = CALC_MODES.find((m) => m.value === modeValue) ?? CALC_MODES[0];
  const rateNum = parseFloat(rate) || 3;
  const exampleInterest = calcExample(selectedMode.code, rateNum);
  const savedTypesStr = data?.acceptedTypes ?? 'GOLD,ELECTRONICS,MOTORBIKE,CAR,WATCH,REAL_ESTATE,GENERAL,OTHER';
  const isDirty = data
    ? rate !== String(data.interestRate ?? '') ||
      parseInt(dueDays, 10) !== data.dueDate ||
      modeValue !== data.interestType ||
      [...acceptedTypes].sort().join(',') !== savedTypesStr.split(',').map((s) => s.trim()).sort().join(',')
    : false;

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 dark:bg-gray-900" style={{ paddingTop: insets.top }}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-gray-50 dark:bg-gray-900"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4" style={{ paddingTop: insets.top + 12, paddingBottom: 12 }}>
        <View className="flex-row items-center mb-0.5">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="mr-3"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons name="chevron-left" size={26} color="#4f46e5" />
          </TouchableOpacity>
          <Text className={`${typo.heading} text-gray-900 dark:text-white flex-1`}>
            {t('pawn.settings.title')}
          </Text>
          <TouchableOpacity onPress={() => mutation.mutate()} disabled={mutation.isPending || !isDirty} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            {mutation.isPending ? <ActivityIndicator size="small" color="#4f46e5" /> : (
              <Text className={`${typo.labelBold} ${isDirty ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-300 dark:text-gray-600'}`}>
                {t('common.save')}
              </Text>
            )}
          </TouchableOpacity>
        </View>
        <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 mt-0.5`}>{t('pawn.settings.hint')}</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 4, paddingTop: 16, paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Default contract terms ─────────────────────────────────── */}
        <SectionCard>
          <SectionTitle title={t('pawn.form.contractSection')} />

          {/* Interest rate */}
          <SettingRow
            label={t('pawn.settings.defaultRate')}
            hint={t('pawn.settings.defaultRateHint')}
          >
            <View className="flex-row items-center border border-gray-200 dark:border-gray-600 rounded-xl overflow-hidden">
              <TextInput
                value={rate}
                onChangeText={setRate}
                keyboardType="decimal-pad"
                placeholder="3"
                placeholderTextColor="#9ca3af"
                className={`${typo.inputSize} text-gray-900 dark:text-white text-right px-3 py-2 w-20 bg-gray-50 dark:bg-gray-700`}
              />
              <View className="px-3 py-2 bg-gray-100 dark:bg-gray-600">
                <Text className={`${typo.label} text-gray-500 dark:text-gray-300`}>%</Text>
              </View>
            </View>
          </SettingRow>

          {/* Due days */}
          <SettingRow
            label={t('pawn.settings.defaultDueDate')}
            hint={t('pawn.settings.defaultDueDateHint')}
            noBorder
          >
            <View className="flex-row items-center border border-gray-200 dark:border-gray-600 rounded-xl overflow-hidden">
              <TextInput
                value={dueDays}
                onChangeText={setDueDays}
                keyboardType="numeric"
                placeholder="30"
                placeholderTextColor="#9ca3af"
                className={`${typo.inputSize} text-gray-900 dark:text-white text-right px-3 py-2 w-20 bg-gray-50 dark:bg-gray-700`}
              />
              <View className="px-3 py-2 bg-gray-100 dark:bg-gray-600">
                <Text className={`${typo.label} text-gray-500 dark:text-gray-300`}>{t('common.day')}</Text>
              </View>
            </View>
          </SettingRow>
        </SectionCard>

        {/* ── Interest calculation mode ──────────────────────────────── */}
        <SectionCard>
          <SectionTitle
            title={t('pawn.settings.calcModeSection')}
            hint={t('pawn.settings.calcModeHint')}
          />

          {CALC_MODES.map((m, i) => {
            const selected = m.value === modeValue;
            return (
              <TouchableOpacity
                key={m.code}
                onPress={() => setModeValue(m.value)}
                activeOpacity={0.7}
                className={`px-4 py-3 flex-row items-start ${
                  i < CALC_MODES.length - 1 ? 'border-b border-gray-50 dark:border-gray-700/50' : ''
                } ${selected ? 'bg-primary/5 dark:bg-primary/10' : ''}`}
              >
                {/* Radio indicator */}
                <View className={`w-5 h-5 rounded-full border-2 items-center justify-center mt-0.5 mr-3 ${
                  selected ? 'border-primary' : 'border-gray-300 dark:border-gray-600'
                }`}>
                  {selected && <View className="w-2.5 h-2.5 rounded-full bg-primary" />}
                </View>

                <View className="flex-1">
                  <Text className={`${typo.label} ${
                    selected ? 'text-primary' : 'text-gray-800 dark:text-white'
                  }`}>
                    {t(`pawn.settings.calcMode_${m.code}`)}
                  </Text>
                  <Text className={`${typo.caption} text-gray-400 dark:text-gray-500 mt-0.5`}>
                    {t(`pawn.settings.calcMode_${m.code}_desc`)}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </SectionCard>

        {/* ── Accepted pawn item types ──────────────────────────────── */}
        <SectionCard>
          <SectionTitle
            title={t('pawn.settings.acceptedTypesSection')}
            hint={t('pawn.settings.acceptedTypesHint')}
          />
          <View className="px-4 pb-4 flex-row flex-wrap gap-2">
            {PAWN_ITEM_TYPES.map((item) => {
              const isOn = acceptedTypes.has(item.code);
              return (
                <TouchableOpacity
                  key={item.code}
                  onPress={() => {
                    const next = new Set(acceptedTypes);
                    if (next.has(item.code)) { next.delete(item.code); } else { next.add(item.code); }
                    setAcceptedTypes(next);
                  }}
                  activeOpacity={0.75}
                  className={`flex-row items-center gap-1.5 rounded-xl border px-3 py-2 ${
                    isOn
                      ? 'bg-indigo-50 dark:bg-indigo-900/30 border-primary'
                      : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                  }`}
                >
                  {isOn && <MaterialCommunityIcons name="check" size={13} color="#4f46e5" />}
                  <Text className={`${typo.label}`}>{item.emoji}</Text>
                  <Text className={`${typo.caption} font-medium ${isOn ? 'text-primary' : 'text-gray-600 dark:text-gray-300'}`}>
                    {t(`onboarding.step2.pawn.types.${item.code}`)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </SectionCard>

        {/* ── Live interest preview ──────────────────────────────────── */}
        <SectionCard>
          <View className="px-4 py-4">
            <View className="flex-row items-center mb-3">
              <MaterialCommunityIcons name="calculator-variant-outline" size={16} color="#6b7280" style={{ marginRight: 6 }} />
              <Text className={`${typo.captionBold} text-gray-500 dark:text-gray-400 uppercase tracking-wide`}>
                {t('pawn.settings.exampleTitle')}
              </Text>
            </View>

            <Text className={`${typo.caption} text-gray-400 dark:text-gray-500 mb-3`}>
              {t('pawn.settings.examplePrincipal')}
            </Text>

            {CALC_MODES.map((m) => {
              const interest = calcExample(m.code, rateNum);
              const isSelected = m.value === modeValue;
              return (
                <View
                  key={m.code}
                  className={`flex-row justify-between py-2 ${
                    isSelected ? 'bg-primary/5 dark:bg-primary/10 -mx-4 px-4 rounded-xl' : ''
                  }`}
                >
                  <Text className={`${typo.caption} ${isSelected ? 'text-primary font-semibold' : 'text-gray-500 dark:text-gray-400'}`}>
                    {t(`pawn.settings.calcMode_${m.code}`)}
                  </Text>
                  <Text className={`${typo.labelBold} ${isSelected ? 'text-primary' : 'text-gray-700 dark:text-gray-300'}`}>
                    {formatVnd(interest)}
                  </Text>
                </View>
              );
            })}

            <View className="mt-3 pt-3 border-t border-gray-50 dark:border-gray-700">
              <Text className={`${typo.caption} text-gray-400 dark:text-gray-500`}>
                * Gốc 10.000.000 ₫ · {rateNum}%/tháng · 31 ngày
              </Text>
            </View>
          </View>
        </SectionCard>
      </ScrollView>

    </KeyboardAvoidingView>
  );
}
