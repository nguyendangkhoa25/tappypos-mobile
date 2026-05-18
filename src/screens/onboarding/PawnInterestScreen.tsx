import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useOnboardingStore } from '../../store/onboardingStore';
import { OnboardingHeader } from './OnboardingHeader';
import { useOnboardingFlow } from '../../hooks/useOnboardingFlow';
import { useTypography } from '../../hooks/useTypography';
import type { OnboardingScreenProps } from '../../types/navigation';

type CalcMode = 'DAILY_30' | 'DAILY_25' | 'MONTHLY' | 'BIWEEKLY';

const CALC_MODES: { code: CalcMode; icon: string }[] = [
  { code: 'DAILY_30',  icon: 'calendar-month-outline' },
  { code: 'DAILY_25',  icon: 'calendar-check-outline' },
  { code: 'MONTHLY',   icon: 'calendar-outline' },
  { code: 'BIWEEKLY',  icon: 'calendar-week-outline' },
];

export function PawnInterestScreen({ navigation }: OnboardingScreenProps<'PawnInterest'>) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const typo = useTypography();
  const { pawnInterestRate, pawnCalcMode, pawnDueDate, setPawnInterest } = useOnboardingStore();
  const { totalSteps, getStepIndex, getNextScreen } = useOnboardingFlow();

  const [rate, setRate] = useState(pawnInterestRate);
  const [calcMode, setCalcMode] = useState<CalcMode>((pawnCalcMode as CalcMode) || 'DAILY_30');
  const [dueDate, setDueDate] = useState(pawnDueDate || '30');

  const handleContinue = () => {
    setPawnInterest(rate, calcMode, dueDate);
    const next = getNextScreen('PAWN_INTEREST');
    if (next) navigation.navigate(next as any);
  };

  const handleSkip = () => {
    const next = getNextScreen('PAWN_INTEREST');
    if (next) navigation.navigate(next as any);
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white dark:bg-gray-900"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ paddingTop: insets.top }}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View className="px-6 pt-8">
          <OnboardingHeader
            step={getStepIndex('PAWN_INTEREST')}
            total={totalSteps}
            onBack={() => navigation.goBack()}
          />

          <Text className={`${typo.heading} text-gray-900 dark:text-white mt-6 mb-1`}>
            {t('onboarding.pawnInterest.title')}
          </Text>
          <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 mb-5`}>
            {t('onboarding.pawnInterest.subtitle')}
          </Text>

          <View className="mb-5 gap-1.5">
            {(
              [
                { icon: 'percent-outline',    key: 'onboarding.pawnInterest.hint1' },
                { icon: 'calculator-outline', key: 'onboarding.pawnInterest.hint2' },
                { icon: 'pencil-outline',     key: 'onboarding.pawnInterest.hint3' },
              ] as { icon: string; key: string }[]
            ).map(({ icon, key }) => (
              <View key={key} className="flex-row items-center gap-2">
                <MaterialCommunityIcons name={icon as any} size={13} color="#9ca3af" />
                <Text className={`${typo.caption} text-gray-400 dark:text-gray-500 flex-1 leading-4`}>
                  {t(key)}
                </Text>
              </View>
            ))}
          </View>

          {/* Interest rate */}
          <View className="mb-6">
            <Text className={`${typo.label} text-gray-700 dark:text-gray-300 mb-2`}>
              {t('onboarding.pawnInterest.rateLabel')}
            </Text>
            <View className="flex-row items-center bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 gap-2">
              <MaterialCommunityIcons name="percent-outline" size={18} color="#6b7280" />
              <TextInput
                className={`flex-1 ${typo.inputSize} text-gray-900 dark:text-white`}
                value={rate}
                onChangeText={setRate}
                placeholder={t('onboarding.pawnInterest.ratePlaceholder')}
                placeholderTextColor="#9ca3af"
                keyboardType="decimal-pad"
                returnKeyType="done"
              />
              <Text className={`${typo.caption} text-gray-400 dark:text-gray-500`}>%</Text>
            </View>
            <Text className={`${typo.caption} text-gray-400 dark:text-gray-500 mt-1 ml-1`}>
              {t('onboarding.pawnInterest.rateHint')}
            </Text>
          </View>

          {/* Calculation mode */}
          <View className="mb-6">
            <Text className={`${typo.label} text-gray-700 dark:text-gray-300 mb-2`}>
              {t('onboarding.pawnInterest.calcModeLabel')}
            </Text>
            <View className="gap-2">
              {CALC_MODES.map(({ code, icon }) => {
                const selected = calcMode === code;
                return (
                  <TouchableOpacity
                    key={code}
                    onPress={() => setCalcMode(code)}
                    className={`flex-row items-center gap-3 rounded-2xl px-4 py-3.5 border ${
                      selected
                        ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-400 dark:border-indigo-500'
                        : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                    }`}
                    activeOpacity={0.75}
                  >
                    <MaterialCommunityIcons
                      name={icon as any}
                      size={20}
                      color={selected ? '#6366f1' : '#9ca3af'}
                    />
                    <View className="flex-1">
                      <Text className={`${typo.label} ${
                        selected
                          ? 'text-indigo-700 dark:text-indigo-300'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}>
                        {t(`onboarding.pawnInterest.calcMode.${code}.label`)}
                      </Text>
                      <Text className={`${typo.caption} text-gray-400 dark:text-gray-500 mt-0.5 leading-4`}>
                        {t(`onboarding.pawnInterest.calcMode.${code}.desc`)}
                      </Text>
                    </View>
                    {selected && (
                      <MaterialCommunityIcons name="check-circle" size={18} color="#6366f1" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Due date (days) */}
          <View className="mb-4">
            <Text className={`${typo.label} text-gray-700 dark:text-gray-300 mb-2`}>
              {t('onboarding.pawnInterest.dueDateLabel')}
            </Text>
            <View className="flex-row items-center bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 gap-2">
              <MaterialCommunityIcons name="clock-outline" size={18} color="#6b7280" />
              <TextInput
                className={`flex-1 ${typo.inputSize} text-gray-900 dark:text-white`}
                value={dueDate}
                onChangeText={setDueDate}
                placeholder="30"
                placeholderTextColor="#9ca3af"
                keyboardType="number-pad"
                returnKeyType="done"
                maxLength={3}
              />
              <Text className={`${typo.caption} text-gray-400 dark:text-gray-500`}>
                {t('onboarding.pawnInterest.dueDateSuffix')}
              </Text>
            </View>
            <Text className={`${typo.caption} text-gray-400 dark:text-gray-500 mt-1 ml-1`}>
              {t('onboarding.pawnInterest.dueDateHint')}
            </Text>
          </View>
        </View>
      </ScrollView>

      <View
        className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-900 px-6 pt-4 border-t border-gray-100 dark:border-gray-700"
        style={{ paddingBottom: insets.bottom + 16 }}
      >
        <TouchableOpacity
          className="bg-primary rounded-2xl py-4 items-center justify-center active:opacity-80"
          onPress={handleContinue}
        >
          <Text className={`${typo.labelBold} text-white`}>
            {t('onboarding.common.continue')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity className="mt-2 py-2 items-center" onPress={handleSkip}>
          <Text className={`${typo.caption} text-gray-400 dark:text-gray-500`}>
            {t('onboarding.common.skip')}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
