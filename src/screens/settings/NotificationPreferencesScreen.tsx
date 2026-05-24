import { useRef, useState, useEffect } from 'react';
import { View, Text, Switch, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToastStore } from '../../store/toastStore';
import { useErrorAlert } from '../../hooks/useErrorAlert';
import { notificationApi } from '../../services/api';
import { useTypography } from '../../hooks/useTypography';
import type { SettingsScreenProps } from '../../types/navigation';

type PrefsMap = Record<string, boolean>;

const PREF_GROUPS: { section: string; items: { key: string; labelKey: string }[] }[] = [
  {
    section: 'sectionOrder',
    items: [
      { key: 'NEW_ORDER', labelKey: 'newOrder' },
      { key: 'ORDER_CANCELLED', labelKey: 'orderCancelled' },
    ],
  },
  {
    section: 'sectionInventory',
    items: [
      { key: 'LOW_STOCK', labelKey: 'lowStock' },
      { key: 'OUT_OF_STOCK', labelKey: 'outOfStock' },
    ],
  },
  {
    section: 'sectionSystem',
    items: [
      { key: 'SYSTEM_UPDATE', labelKey: 'systemUpdate' },
      { key: 'PROMOTION', labelKey: 'promotionAlert' },
    ],
  },
];

export function NotificationPreferencesScreen({ navigation }: SettingsScreenProps<'NotificationPreferences'>) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const typo = useTypography();
  const qc = useQueryClient();
  const { show: showToast } = useToastStore();
  const showErrorAlert = useErrorAlert();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [prefs, setPrefs] = useState<PrefsMap | null>(null);

  const { data: prefsData, isLoading } = useQuery({
    queryKey: ['notifPreferences'],
    queryFn: () => notificationApi.getPreferences().then((r) => r.data.data),
    staleTime: 5 * 60_000,
  });

  useEffect(() => {
    if (prefsData && !prefs) setPrefs(prefsData);
  }, [prefsData]);

  const mutation = useMutation({
    mutationFn: (data: PrefsMap) => notificationApi.updatePreferences(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifPreferences'] });
      showToast(t('settings.notificationPreferences.saveSuccess'));
    },
    onError: showErrorAlert,
  });

  const togglePref = (key: string, value: boolean) => {
    const next = { ...(prefs ?? {}), [key]: value };
    setPrefs(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => mutation.mutate(next), 300);
  };

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <View
        className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4"
        style={{ paddingTop: insets.top + 12, paddingBottom: 12 }}
      >
        <View className="flex-row items-center mb-0.5">
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} className="mr-3">
            <MaterialCommunityIcons name="chevron-left" size={26} color="#4f46e5" />
          </TouchableOpacity>
          <Text className={`${typo.heading} text-gray-900 dark:text-white flex-1`}>
            {t('settings.notificationPreferences.title')}
          </Text>
        </View>
        <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 mt-0.5`}>{t('settings.notificationPreferences.hint')}</Text>
      </View>

      {isLoading || !prefs ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#4f46e5" />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 4, gap: 16 }}>
          {PREF_GROUPS.map((group) => (
            <View key={group.section} className="bg-white dark:bg-gray-800 rounded-2xl p-4">
              <Text className={`${typo.label} text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3`}>
                {t(`settings.notificationPreferences.${group.section}`)}
              </Text>
              <View className="gap-1">
                {group.items.map((item, idx) => (
                  <View key={item.key}>
                    <View className="flex-row items-center justify-between py-2">
                      <Text className={`${typo.caption} text-gray-900 dark:text-white flex-1 mr-4`}>
                        {t(`settings.notificationPreferences.${item.labelKey}`)}
                      </Text>
                      <Switch
                        value={prefs[item.key] ?? true}
                        onValueChange={(v) => togglePref(item.key, v)}
                        trackColor={{ true: '#4f46e5' }}
                        thumbColor="#fff"
                      />
                    </View>
                    {idx < group.items.length - 1 && (
                      <View className="h-px bg-gray-100 dark:bg-gray-700" />
                    )}
                  </View>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
