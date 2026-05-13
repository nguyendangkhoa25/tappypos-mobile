import { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAlertStore } from '../../store/alertStore';
import { notificationApi, type NotificationData } from '../../services/api';
import { formatDateTime } from '../../utils/format';

const FILTERS = [
  { key: '', labelKey: 'filterAll' },
  { key: 'UNREAD', labelKey: 'filterUnread' },
  { key: 'ORDER', labelKey: 'filterOrder' },
  { key: 'SYSTEM', labelKey: 'filterSystem' },
] as const;

export function NotificationScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { show: showAlert } = useAlertStore();
  const [filter, setFilter] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['notifications', filter],
    queryFn: () =>
      notificationApi
        .list({ unreadOnly: filter === 'UNREAD' || undefined })
        .then((r) => r.data.data),
    staleTime: 0,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationApi.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllMutation = useMutation({
    mutationFn: () => notificationApi.markAllRead(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const handleMarkAllRead = () => {
    showAlert(
      t('notifications.markAllReadTitle'),
      t('notifications.markAllReadMsg'),
      [
        { label: t('common.cancel'), style: 'cancel' },
        { label: t('notifications.markAllReadConfirm'), onPress: () => markAllMutation.mutate() },
      ],
    );
  };

  const typeFilter = (n: NotificationData) => {
    if (!filter || filter === 'UNREAD') return true;
    return n.type.startsWith(filter);
  };

  const notifications = (data?.content ?? []).filter(typeFilter);
  const totalUnread = data?.totalUnread ?? 0;

  const renderItem = ({ item }: { item: NotificationData }) => (
    <TouchableOpacity
      onPress={() => { if (!item.read) markReadMutation.mutate(item.id); }}
      className={`mx-4 mb-2 rounded-2xl px-4 py-3 ${item.read ? 'bg-white dark:bg-gray-800' : 'bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800'}`}
    >
      <View className="flex-row items-start gap-3">
        {!item.read && (
          <View className="w-2 h-2 rounded-full bg-indigo-500 mt-2 shrink-0" />
        )}
        {item.read && <View className="w-2 shrink-0" />}
        <View className="flex-1">
          <Text className={`text-sm font-semibold ${item.read ? 'text-gray-700 dark:text-gray-300' : 'text-gray-900 dark:text-white'}`}>
            {item.title}
          </Text>
          <Text className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 leading-5">{item.body}</Text>
          <Text className="text-xs text-gray-400 mt-1">{formatDateTime(item.createdAt)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <View
        className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4"
        style={{ paddingTop: insets.top + 12, paddingBottom: 0 }}
      >
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center gap-2">
            <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} className="mr-1">
              <MaterialCommunityIcons name="chevron-left" size={26} color="#4f46e5" />
            </TouchableOpacity>
            <Text className="text-xl font-bold text-gray-900 dark:text-white">
              {t('notifications.title')}
            </Text>
            {totalUnread > 0 && (
              <View className="bg-indigo-500 px-2 py-0.5 rounded-full">
                <Text className="text-white text-xs font-bold">{totalUnread}</Text>
              </View>
            )}
          </View>
          {totalUnread > 0 && (
            <TouchableOpacity
              onPress={handleMarkAllRead}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              disabled={markAllMutation.isPending}
            >
              {markAllMutation.isPending ? (
                <ActivityIndicator size="small" color="#4f46e5" />
              ) : (
                <Text className="text-sm text-indigo-600 font-semibold">{t('notifications.markAllRead')}</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
        <Text className="text-xs text-gray-500 dark:text-gray-400 mb-2">{t('notifications.hint')}</Text>
        {/* Filter chips */}
        <FlatList
          horizontal
          data={FILTERS}
          keyExtractor={(f) => f.key}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 10, gap: 8 }}
          renderItem={({ item: f }) => {
            const active = filter === f.key;
            return (
              <TouchableOpacity
                onPress={() => setFilter(f.key)}
                className={`px-4 py-1.5 rounded-full border ${active ? 'bg-indigo-600 border-indigo-600' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600'}`}
              >
                <Text className={`text-sm font-medium ${active ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                  {t(`notifications.${f.labelKey}`)}
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
      ) : notifications.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <MaterialCommunityIcons name="bell-outline" size={56} color="#d1d5db" />
          <Text className="text-base font-semibold text-gray-400 mt-4 text-center">{t('notifications.empty')}</Text>
          <Text className="text-sm text-gray-400 mt-1 text-center">
            {filter ? t('notifications.emptyFilterHint') : t('notifications.emptyHint')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(n) => n.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: insets.bottom + 16 }}
          refreshing={isLoading}
          onRefresh={refetch}
        />
      )}
    </View>
  );
}
