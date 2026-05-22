import { useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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

  // Mid-wizard restart: skip welcome after store hydrates from AsyncStorage
  useEffect(() => {
    if (lastCompletedStep !== -1) {
      navigation.replace('ShopType');
    }
  }, [lastCompletedStep, navigation]);

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
            className="text-gray-900 dark:text-white text-center mb-3"
            style={{ fontSize: 28, fontWeight: '800', letterSpacing: -0.5, lineHeight: 36 }}
          >
            {t('onboarding.welcome.title')}
          </Text>

          {/* Subtitle */}
          <Text
            className={`${typo.caption} text-gray-500 dark:text-gray-400 text-center leading-6 mb-8 max-w-xs`}
            style={{ fontSize: 15 }}
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
                    style={{
                      fontSize: 11,
                      fontWeight: '700',
                      color: i === 0 ? '#065f46' : '#059669',
                    }}
                  >
                    {i + 1}
                  </Text>
                </View>
                <Text
                  className={`flex-1 ${
                    i === 0
                      ? 'text-gray-900 dark:text-white font-semibold'
                      : 'text-gray-600 dark:text-gray-300'
                  }`}
                  style={{ fontSize: 14 }}
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

      {/* Footer CTA */}
      <View
        className="px-6 pt-4 bg-emerald-50 dark:bg-gray-900 border-t border-emerald-100 dark:border-gray-800"
        style={{ paddingBottom: insets.bottom + 16 }}
      >
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
        </TouchableOpacity>
      </View>
    </View>
  );
}
