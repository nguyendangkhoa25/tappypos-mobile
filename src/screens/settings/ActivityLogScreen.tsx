import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useInfiniteQuery } from '@tanstack/react-query';
import { activityLogApi, type ActivityLogEntry } from '../../services/api';
import type { SettingsScreenProps } from '../../types/navigation';

const CATEGORIES = [
  { key: '', labelKey: 'filterAll' },
  { key: 'ORDER', labelKey: 'filterOrder' },
  { key: 'PRODUCT', labelKey: 'filterProduct' },
  { key: 'CUSTOMER', labelKey: 'filterCustomer' },
  { key: 'EMPLOYEE', labelKey: 'filterEmployee' },
  { key: 'SETTING', labelKey: 'filterSetting' },
];

export function ActivityLogScreen({ navigation }: SettingsScreenProps<'ActivityLog'>) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [category, setCategory] = useState('');

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['activityLog', category],
    queryFn: ({ pageParam = 0 }) =>
      activityLogApi.list({ page: pageParam as number, category: category || undefined }).then((r) => r.data.data),
    getNextPageParam: (last, pages) =>
      pages.length < last.totalPages ? pages.length : undefined,
    initialPageParam: 0,
    staleTime: 60_000,
  });

  const entries = data?.pages.flatMap((p) => p.content) ?? [];

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const renderItem = ({ item }: { item: ActivityLogEntry }) => (
    <View className="bg-white dark:bg-gray-800 mx-4 mb-2 rounded-2xl px-4 py-3">
      <View className="flex-row items-start justify-between gap-2">
        <View className="flex-1">
          <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300">{item.action}</Text>
          <Text className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{item.description}</Text>
        </View>
        <View className={`px-2 py-0.5 rounded-full ${item.source === 'MOBILE' ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-gray-100 dark:bg-gray-700'}`}>
          <Text className={`text-xs font-medium ${item.source === 'MOBILE' ? 'text-blue-700 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>
            {item.source === 'MOBILE' ? t('settings.activityLog.sourceMobile') : t('settings.activityLog.sourceWeb')}
          </Text>
        </View>
      </View>
      <Text className="text-xs text-gray-400 mt-1">{formatDate(item.createdAt)}</Text>
    </View>
  );

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
            {t('settings.activityLog.title')}
          </Text>
        </View>
        <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-9">{t('settings.activityLog.hint')}</Text>
      </View>

      {/* Category filter */}
      <View className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
        <FlatList
          horizontal
          data={CATEGORIES}
          keyExtractor={(c) => c.key}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 8 }}
          renderItem={({ item: cat }) => {
            const active = category === cat.key;
            return (
              <TouchableOpacity
                onPress={() => setCategory(cat.key)}
                className={`px-4 py-1.5 rounded-full border ${
                  active ? 'bg-indigo-600 border-indigo-600' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600'
                }`}
              >
                <Text className={`text-sm font-medium ${active ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                  {t(`settings.activityLog.${cat.labelKey}`)}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#4f46e5" />
        </View>
      ) : entries.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <MaterialCommunityIcons name="clipboard-text-outline" size={56} color="#d1d5db" />
          <Text className="text-base font-semibold text-gray-400 mt-4 text-center">{t('settings.activityLog.empty')}</Text>
          <Text className="text-sm text-gray-400 mt-1 text-center">{t('settings.activityLog.emptyHint')}</Text>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(e) => e.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: insets.bottom + 16 }}
          onEndReached={() => { if (hasNextPage && !isFetchingNextPage) fetchNextPage(); }}
          onEndReachedThreshold={0.4}
          ListFooterComponent={isFetchingNextPage ? <ActivityIndicator color="#4f46e5" style={{ margin: 16 }} /> : null}
        />
      )}
    </View>
  );
}
