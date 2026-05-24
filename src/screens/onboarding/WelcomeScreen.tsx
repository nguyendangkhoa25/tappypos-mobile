import { useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useOnboardingStore } from '../../store/onboardingStore';
import { useTypography } from '../../hooks/useTypography';
import type { OnboardingScreenProps } from '../../types/navigation';

type StepKey = 'shopType' | 'basicInfo' | 'products' | 'expenses';
const STEPS: StepKey[] = ['shopType', 'basicInfo', 'products', 'expenses'];

export function WelcomeScreen({ navigation }: OnboardingScreenProps<'Welcome'>) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const typo = useTypography();
  const lastCompletedStep = useOnboardingStore((s) => s.lastCompletedStep);
  const isFocused = useIsFocused();

  // Mid-wizard restart: skip welcome when the store hydrates with prior progress.
  // Guard with isFocused so this never fires while Welcome is buried under other
  // screens — otherwise completeStep() calls during the active wizard session
  // would re-trigger replace() and duplicate ShopType in the navigation stack.
  useEffect(() => {
    if (isFocused && lastCompletedStep !== -1) {
      navigation.replace('ShopType');
    }
  }, [isFocused, lastCompletedStep, navigation]);

  return (
    <View
      className="flex-1 bg-emerald-50 dark:bg-gray-900"
      style={{ paddingTop: insets.top }}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-1 items-center justify-center px-6 py-10">
          {/* Icon */}
          <View
            className="w-28 h-28 rounded-3xl bg-primary items-center justify-center mb-7"
            style={{
              shadowColor: '#059669',
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.3,
              shadowRadius: 20,
              elevation: 12,
            }}
          >
            <MaterialCommunityIcons name="cash-register" size={60} color="white" />
          </View>

          {/* Title */}
          <Text
            className={`${typo.heading} text-gray-900 dark:text-white text-center mb-3`}
            style={{ fontWeight: '800', letterSpacing: -0.5, lineHeight: Math.round(typo.displaySize * 1.3) }}
          >
            {t('onboarding.welcome.title')}
          </Text>

          {/* Subtitle */}
          <Text
            className={`${typo.caption} text-gray-500 dark:text-gray-400 text-center leading-6 mb-8 max-w-xs`}
          >
            {t('onboarding.welcome.subtitle')}
          </Text>

          {/* Steps card */}
          <View
            className="w-full bg-white dark:bg-gray-800 rounded-2xl p-5 mb-5"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.06,
              shadowRadius: 8,
              elevation: 3,
            }}
          >
            {STEPS.map((step, i) => (
              <View
                key={step}
                className={`flex-row items-center gap-3 ${i < STEPS.length - 1 ? 'mb-3.5' : ''}`}
              >
                <View
                  className={`w-6 h-6 rounded-full items-center justify-center flex-shrink-0 ${
                    i === 0
                      ? 'bg-emerald-100 dark:bg-emerald-900/40'
                      : 'bg-emerald-50 dark:bg-emerald-900/20'
                  }`}
                >
                  <Text
                    className={`${typo.caption} font-bold`}
                    style={{ color: i === 0 ? '#065f46' : '#059669' }}
                  >
                    {i + 1}
                  </Text>
                </View>
                <Text
                  className={`${typo.label} flex-1 ${
                    i === 0
                      ? 'text-gray-900 dark:text-white font-semibold'
                      : 'text-gray-600 dark:text-gray-300'
                  }`}
                >
                  {t(`onboarding.welcome.steps.${step}`)}
                </Text>
              </View>
            ))}
          </View>

          {/* Time estimate */}
          <Text className={`${typo.caption} text-gray-400 dark:text-gray-500`}>
            {t('onboarding.welcome.timeEstimate')}
          </Text>
        </View>
      </ScrollView>

      {/* Footer CTAs */}
      <View
        className="px-6 pt-4 bg-emerald-50 dark:bg-gray-900 border-t border-emerald-100 dark:border-gray-800"
        style={{ paddingBottom: insets.bottom + 16, gap: 12 }}
      >
        {/* Primary: Create shop */}
        <TouchableOpacity
          className="bg-primary rounded-2xl py-4 items-center justify-center active:opacity-80"
          style={{
            shadowColor: '#059669',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 8,
            elevation: 5,
          }}
          onPress={() => navigation.navigate('ShopType')}
        >
          <Text className={`${typo.labelBold} text-white`}>
            {t('onboarding.welcome.cta')}
          </Text>
          <Text className="text-emerald-100 dark:text-emerald-200 text-xs mt-0.5 opacity-90">
            {t('onboarding.welcome.ctaHint')}
          </Text>
        </TouchableOpacity>

        {/* Secondary: Join existing shop */}
        <TouchableOpacity
          className="rounded-2xl py-4 items-center justify-center border-2 border-emerald-300 dark:border-emerald-700 active:opacity-70"
          onPress={() => navigation.navigate('JoinShop')}
        >
          <Text className={`${typo.labelBold} text-emerald-700 dark:text-emerald-400`}>
            {t('onboarding.welcome.joinShop')}
          </Text>
          <Text className="text-emerald-500 dark:text-emerald-500 text-xs mt-0.5">
            {t('onboarding.welcome.joinShopHint')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
