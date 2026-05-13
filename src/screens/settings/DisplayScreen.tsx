import { View, Text, TouchableOpacity, Switch, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemeStore, type ThemeChoice } from '../../store/themeStore';
import { usePrivacyStore } from '../../store/privacyStore';
import i18n from '../../i18n';
import type { SettingsScreenProps } from '../../types/navigation';

export function DisplayScreen({ navigation }: SettingsScreenProps<'Display'>) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { theme, setTheme } = useThemeStore();
  const { isHidden, toggle } = usePrivacyStore();

  const themes: { key: ThemeChoice; label: string; icon: string }[] = [
    { key: 'light', label: t('settings.displaySettings.themeLight'), icon: 'weather-sunny' },
    { key: 'dark', label: t('settings.displaySettings.themeDark'), icon: 'weather-night' },
    { key: 'system', label: t('settings.displaySettings.themeSystem'), icon: 'cellphone' },
  ];

  const langs: { key: string; label: string; flag: string }[] = [
    { key: 'vi', label: t('settings.displaySettings.langVi'), flag: '🇻🇳' },
    { key: 'en', label: t('settings.displaySettings.langEn'), flag: '🇬🇧' },
  ];

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <View
        className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4"
        style={{ paddingTop: insets.top + 12, paddingBottom: 12 }}
      >
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} className="mr-3">
            <MaterialCommunityIcons name="chevron-left" size={26} color="#4f46e5" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-gray-900 dark:text-white flex-1">
            {t('settings.displaySettings.title')}
          </Text>
        </View>
        <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-9">{t('settings.displaySettings.hint')}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        {/* Theme */}
        <View className="bg-white dark:bg-gray-800 rounded-2xl p-4">
          <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            {t('settings.displaySettings.sectionTheme')}
          </Text>
          <View className="flex-row gap-3">
            {themes.map((item) => {
              const selected = theme === item.key;
              return (
                <TouchableOpacity
                  key={item.key}
                  onPress={() => setTheme(item.key)}
                  className={`flex-1 rounded-xl py-4 items-center border-2 ${
                    selected
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                      : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700'
                  }`}
                >
                  <MaterialCommunityIcons
                    name={item.icon as any}
                    size={24}
                    color={selected ? '#4f46e5' : '#9ca3af'}
                  />
                  <Text
                    className={`text-xs font-medium mt-1 ${
                      selected ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {item.label}
                  </Text>
                  {selected && (
                    <MaterialCommunityIcons name="check-circle" size={14} color="#4f46e5" style={{ marginTop: 4 }} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Language */}
        <View className="bg-white dark:bg-gray-800 rounded-2xl p-4">
          <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            {t('settings.displaySettings.sectionLanguage')}
          </Text>
          <View className="flex-row gap-3">
            {langs.map((item) => {
              const selected = i18n.language === item.key;
              return (
                <TouchableOpacity
                  key={item.key}
                  onPress={() => i18n.changeLanguage(item.key)}
                  className={`flex-1 rounded-xl py-4 items-center border-2 ${
                    selected
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                      : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700'
                  }`}
                >
                  <Text style={{ fontSize: 28 }}>{item.flag}</Text>
                  <Text
                    className={`text-xs font-medium mt-1 ${
                      selected ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {item.label}
                  </Text>
                  {selected && (
                    <MaterialCommunityIcons name="check-circle" size={14} color="#4f46e5" style={{ marginTop: 4 }} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Privacy */}
        <View className="bg-white dark:bg-gray-800 rounded-2xl p-4">
          <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            {t('settings.displaySettings.sectionPrivacy')}
          </Text>
          <View className="flex-row items-center justify-between">
            <View className="flex-1 mr-4">
              <Text className="text-base font-medium text-gray-900 dark:text-white">
                {t('settings.displaySettings.privacyMode')}
              </Text>
              <Text className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {t('settings.displaySettings.privacyModeHint')}
              </Text>
            </View>
            <Switch
              value={isHidden}
              onValueChange={toggle}
              trackColor={{ true: '#4f46e5' }}
              thumbColor="#fff"
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
