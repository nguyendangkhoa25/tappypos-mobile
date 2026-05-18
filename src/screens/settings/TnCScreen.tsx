import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { legalApi } from '../../services/api';
import { useTypography } from '../../hooks/useTypography';
import type { SettingsScreenProps } from '../../types/navigation';

export function TnCScreen({ navigation }: SettingsScreenProps<'TnC'>) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const typo = useTypography();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['tnc'],
    queryFn: () => legalApi.getTnC().then((r) => r.data.data),
    staleTime: 60 * 60_000,
  });

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <View
        className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 flex-row items-center px-4"
        style={{ paddingTop: insets.top + 12, paddingBottom: 12 }}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} className="mr-3">
          <MaterialCommunityIcons name="chevron-left" size={26} color="#4f46e5" />
        </TouchableOpacity>
        <Text className={`${typo.heading} text-gray-900 dark:text-white flex-1`}>
          {t('settings.tnc.title')}
        </Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#4f46e5" />
        </View>
      ) : isError ? (
        <View className="flex-1 items-center justify-center px-8">
          <MaterialCommunityIcons name="alert-circle-outline" size={48} color="#d1d5db" />
          <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 text-center mt-3`}>{t('settings.tnc.loadError')}</Text>
          <TouchableOpacity onPress={() => refetch()} className="mt-4 border border-indigo-600 px-5 py-2 rounded-xl">
            <Text className={`${typo.label} font-medium text-indigo-600`}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 24 }}>
          <View className="flex-row items-center justify-between mb-4">
            <Text className={`${typo.caption} text-gray-400`}>{t('settings.tnc.version', { version: data?.version ?? '1.0' })}</Text>
            <Text className={`${typo.caption} text-gray-400`}>{t('settings.tnc.updatedAt', { date: formatDate(data?.updatedAt ?? new Date().toISOString()) })}</Text>
          </View>
          <Text className={`${typo.caption} text-gray-700 dark:text-gray-300 leading-6`}>{data?.content ?? ''}</Text>
        </ScrollView>
      )}
    </View>
  );
}
