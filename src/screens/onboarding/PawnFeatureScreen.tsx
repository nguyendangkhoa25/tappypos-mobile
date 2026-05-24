import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useOnboardingStore } from '../../store/onboardingStore';
import { OnboardingHeader } from './OnboardingHeader';
import { useOnboardingFlow } from '../../hooks/useOnboardingFlow';
import { useTypography } from '../../hooks/useTypography';
import type { OnboardingScreenProps } from '../../types/navigation';

export function PawnFeatureScreen({ navigation }: OnboardingScreenProps<'PawnFeature'>) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const typo = useTypography();
  const { setHasPawnFeature } = useOnboardingStore();
  const { totalSteps, getStepIndex, getNextScreen } = useOnboardingFlow();

  const handleYes = () => {
    setHasPawnFeature(true);
    // Continue to PAWN_TYPES (next step in JEWELRY_STEPS)
    const next = getNextScreen('PAWN_FEATURE');
    if (next) navigation.navigate(next as any);
  };

  const handleNo = () => {
    setHasPawnFeature(false);
    // Jump past PAWN_TYPES and PAWN_INTEREST directly to EXPENSE_SETUP
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
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="px-6 pt-8 flex-1">
          <OnboardingHeader
            step={getStepIndex('PAWN_FEATURE')}
            total={totalSteps}
            onBack={() => navigation.goBack()}
          />

          <View className="items-center mt-8 mb-6">
            <View className="w-20 h-20 rounded-3xl bg-indigo-50 dark:bg-indigo-900/30 items-center justify-center mb-5">
              <MaterialCommunityIcons name="handshake-outline" size={40} color="#6366f1" />
            </View>
            <Text className={`${typo.heading} text-gray-900 dark:text-white text-center mb-2`}>
              {t('onboarding.pawnFeature.title')}
            </Text>
            <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 text-center leading-5 px-4`}>
              {t('onboarding.pawnFeature.subtitle')}
            </Text>
          </View>

          {/* YES card */}
          <TouchableOpacity
            onPress={handleYes}
            activeOpacity={0.8}
            className="bg-indigo-50 dark:bg-indigo-900/20 border-2 border-indigo-300 dark:border-indigo-600 rounded-3xl p-5 mb-4"
          >
            <View className="flex-row items-start gap-4">
              <View className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-800 items-center justify-center">
                <MaterialCommunityIcons name="check-bold" size={24} color="#6366f1" />
              </View>
              <View className="flex-1">
                <Text className={`${typo.body} text-indigo-700 dark:text-indigo-300 mb-1`}>
                  {t('onboarding.pawnFeature.yes')}
                </Text>
                <Text className={`${typo.caption} text-indigo-500 dark:text-indigo-400 leading-4`}>
                  {t('onboarding.pawnFeature.yesDesc')}
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color="#6366f1" />
            </View>
          </TouchableOpacity>

          {/* NO card */}
          <TouchableOpacity
            onPress={handleNo}
            activeOpacity={0.8}
            className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl p-5"
          >
            <View className="flex-row items-start gap-4">
              <View className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-700 items-center justify-center">
                <MaterialCommunityIcons name="storefront-outline" size={24} color="#6b7280" />
              </View>
              <View className="flex-1">
                <Text className={`${typo.body} text-gray-700 dark:text-gray-300 mb-1`}>
                  {t('onboarding.pawnFeature.no')}
                </Text>
                <Text className={`${typo.caption} text-gray-400 dark:text-gray-500 leading-4`}>
                  {t('onboarding.pawnFeature.noDesc')}
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color="#9ca3af" />
            </View>
          </TouchableOpacity>

          <View className="mt-5 bg-amber-50 dark:bg-amber-900/20 rounded-2xl px-4 py-3">
            <Text className={`${typo.caption} text-amber-700 dark:text-amber-400 leading-4 text-center`}>
              {t('onboarding.pawnFeature.hint')}
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
