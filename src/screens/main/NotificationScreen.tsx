import { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useAlertStore } from '../../store/alertStore';
import { useErrorAlert } from '../../hooks/useErrorAlert';
import { useTypography } from '../../hooks/useTypography';
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
  const typo = useTypography();
  const qc = useQueryClient();
  const { show: showAlert } = useAlertStore();
  const showErrorAlert = useErrorAlert();
  const [filter, setFilter] = useState('');
  const [localReadIds, setLocalReadIds] = useState<Set<string>>(new Set());

  const [isManualRefreshing, setIsManualRefreshing] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationApi.list().then((r) => r.data.data),
    staleTime: 0,
    placeholderData: keepPreviousData,
  });

  const onRefresh = useCallback(async () => {
    setIsManualRefreshing(true);
    await refetch();
    setIsManualRefreshing(false);
  }, [refetch]);

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationApi.markRead(id),
    onMutate: (id) => {
      setLocalReadIds((prev) => new Set([...prev, id]));
    },
    onError: (_err, id) => {
      setLocalReadIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
      showErrorAlert(_err);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllMutation = useMutation({
    mutationFn: () => notificationApi.markAllRead(),
    onMutate: () => {
      const unreadIds = (data?.content ?? []).filter((n) => !n.isRead).map((n) => n.id);
      setLocalReadIds((prev) => new Set([...prev, ...unreadIds]));
    },
    onError: (_err, _v, _ctx) => {
      setLocalReadIds(new Set());
      showErrorAlert(_err);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
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
    if (filter === 'UNREAD') return !n.isRead && !localReadIds.has(n.id);
    if (!filter) return true;
    return n.type.startsWith(filter);
  };

  const notifications = (data?.content ?? []).filter(typeFilter);
  const totalUnread = data?.totalUnread ?? 0;
  const hasUnread = notifications.some((n) => !n.isRead && !localReadIds.has(n.id));

  const renderMarkAllHeader = () => {
    if (!hasUnread) return null;
    return (
      <View className="flex-row justify-end px-4 mb-1">
        <TouchableOpacity
          onPress={handleMarkAllRead}
          disabled={markAllMutation.isPending}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          className="flex-row items-center gap-1"
        >
          {markAllMutation.isPending ? (
            <ActivityIndicator size="small" color="#6366f1" />
          ) : (
            <>
              <Text className={`${typo.captionBold} text-indigo-600 dark:text-indigo-400`}>
                {t('notifications.markAllRead')}
              </Text>
              <MaterialCommunityIcons name="check-all" size={14} color="#6366f1" />
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const renderItem = ({ item, index }: { item: NotificationData; index: number }) => {
    const isRead = item.isRead || localReadIds.has(item.id);
    return (
      <TouchableOpacity
        testID={`notification-row-${index}`}
        onPress={() => { if (!isRead) markReadMutation.mutate(item.id); }}
        className={`mx-4 mb-2 rounded-2xl px-4 py-3 ${isRead ? 'bg-white dark:bg-gray-800' : 'bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800'}`}
      >
        <View className="flex-row items-start gap-3">
          <View className="flex-1">
            <Text className={`${typo.label} ${isRead ? 'text-gray-700 dark:text-gray-300' : 'text-gray-900 dark:text-white'}`}>
              {item.title}
            </Text>
            <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 mt-0.5 leading-5`}>{item.message}</Text>
            <View className="flex-row items-center justify-between mt-1">
              <View className="flex-row items-center gap-1.5">
                <Text className={`${typo.caption} text-gray-400`}>{formatDateTime(item.createdAt)}</Text>
                {!isRead && (
                  <Text className={`${typo.caption} text-gray-400 italic`}>· {t('notifications.tapToRead')}</Text>
                )}
              </View>
              <MaterialCommunityIcons
                name={isRead ? 'check-all' : 'check'}
                size={16}
                color={isRead ? '#6366f1' : '#9ca3af'}
              />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

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
            <Text className={`${typo.section} text-gray-900 dark:text-white`}>
              {t('notifications.title')}
            </Text>
            {totalUnread > 0 && (
              <View className="bg-indigo-500 px-2 py-0.5 rounded-full">
                <Text className={`${typo.captionBold} text-white`}>{totalUnread}</Text>
              </View>
            )}
          </View>
        </View>
        <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 mb-2`}>{t('notifications.hint')}</Text>
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
                <Text className={`${typo.caption} font-medium ${active ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`}>
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
          <Text className={`${typo.body} text-gray-400 mt-4 text-center`}>{t('notifications.empty')}</Text>
          <Text className={`${typo.caption} text-gray-400 mt-1 text-center`}>
            {filter ? t('notifications.emptyFilterHint') : t('notifications.emptyHint')}
          </Text>
        </View>
      ) : (
        <FlatList
          showsVerticalScrollIndicator={false}
          data={notifications}
          keyExtractor={(n) => n.id}
          renderItem={renderItem}
          ListHeaderComponent={renderMarkAllHeader}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: insets.bottom + 16 }}
          refreshControl={<RefreshControl refreshing={isManualRefreshing} onRefresh={onRefresh} tintColor="#059669" />}
        />
      )}
    </View>
  );
}
