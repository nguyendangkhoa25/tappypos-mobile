import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTypography } from '../../hooks/useTypography';
import { TNC_SECTIONS, TNC_VERSION, TNC_EFFECTIVE_DATE } from '../../utils/tnc';
import type { SettingsScreenProps } from '../../types/navigation';

type Props = SettingsScreenProps<'TnC'>;

// ── Shared renderer used by both TnCScreen and RegisterScreen modal ──────────

export function TnCBody() {
  const { t } = useTranslation();
  const typo = useTypography();

  return (
    <>
      {/* Intro statement */}
      <View className="bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl px-4 py-3 mb-6 flex-row gap-3 items-start">
        <MaterialCommunityIcons name="shield-check-outline" size={18} color="#4f46e5" style={{ marginTop: 1 }} />
        <Text className={`${typo.caption} text-indigo-700 dark:text-indigo-300 flex-1 leading-5`}>
          {t('tnc.intro')}
        </Text>
      </View>

      {/* Sections */}
      {TNC_SECTIONS.map((section, si) => (
        <View key={section.titleKey} className={si < TNC_SECTIONS.length - 1 ? 'mb-6' : 'mb-2'}>
          {/* Section heading */}
          <Text className={`${typo.section} text-gray-900 dark:text-white mb-3`}>
            {t(section.titleKey)}
          </Text>

          {/* Clauses */}
          <View className="gap-2">
            {section.itemKeys.map((itemKey) => (
              <View key={itemKey} className="flex-row items-start gap-2.5">
                <View className="w-1.5 h-1.5 rounded-full bg-indigo-400 dark:bg-indigo-500 mt-1.5 shrink-0" />
                <Text className={`${typo.caption} text-gray-700 dark:text-gray-300 flex-1 leading-6`}>
                  {t(itemKey)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ))}

      {/* Footer */}
      <View className="mt-6 pt-5 border-t border-gray-100 dark:border-gray-700">
        <Text className={`${typo.caption} text-gray-400 dark:text-gray-500 text-center`}>
          {t('tnc.version', { version: TNC_VERSION })} · {t('tnc.effectiveDate', { date: TNC_EFFECTIVE_DATE })}
        </Text>
      </View>
    </>
  );
}

// ── Full screen ───────────────────────────────────────────────────────────────

export function TnCScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const typo = useTypography();

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <View
        className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4"
        style={{ paddingTop: insets.top + 12, paddingBottom: 12 }}
      >
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            className="mr-3"
          >
            <MaterialCommunityIcons name="chevron-left" size={26} color="#4f46e5" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className={`${typo.heading} text-gray-900 dark:text-white`}>
              {t('settings.tnc.title')}
            </Text>
            <Text className={`${typo.caption} text-gray-400 dark:text-gray-500`}>
              {t('tnc.version', { version: TNC_VERSION })} · {t('tnc.effectiveDate', { date: TNC_EFFECTIVE_DATE })}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}
      >
        <TnCBody />
      </ScrollView>
    </View>
  );
}
