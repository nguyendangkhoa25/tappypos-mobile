import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { orderApi, type WorkItemDTO } from '../../services/api';
import { useErrorAlert } from '../../hooks/useErrorAlert';
import { useTypography } from '../../hooks/useTypography';
import { formatVnd } from '../../utils/format';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { Skeleton } from '../../components/Skeleton';
import type { MyWorkScreenProps } from '../../types/navigation';

type Tab = 'queue' | 'available';

const STATUS_COLOR: Record<string, string> = {
  PENDING: '#f59e0b',
  IN_PROGRESS: '#3b82f6',
  COMPLETED: '#059669',
};

function WorkItemCard({
  item,
  onAction,
  isPending,
}: {
  item: WorkItemDTO;
  onAction: (action: string, itemId: number) => void;
  isPending: boolean;
}) {
  const { t } = useTranslation();
  const typo = useTypography();
  const statusColor = STATUS_COLOR[item.status] ?? '#6b7280';
  const statusLabel =
    item.status === 'PENDING' ? t('myWork.statusPending') : t('myWork.statusInProgress');

  return (
    <View testID={`mywork-task-${item.itemId}`} className="bg-white dark:bg-gray-800 rounded-2xl mx-4 mb-3 p-4 shadow-sm">
      <View className="flex-row justify-between items-start mb-2">
        <View className="flex-1 mr-3">
          <Text className={`${typo.labelBold} text-gray-900 dark:text-white`} numberOfLines={1}>
            {item.productName}
          </Text>
          <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 mt-0.5`}>
            {item.orderNumber} · {item.customerName ?? t('pos.walkIn')}
          </Text>
        </View>
        <View style={{ backgroundColor: statusColor + '22', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 3 }}>
          <Text style={{ color: statusColor, fontSize: 12, fontWeight: '600' }}>{statusLabel}</Text>
        </View>
      </View>

      <View className="flex-row items-center mb-3 gap-x-3">
        <Text className={`${typo.label} text-gray-900 dark:text-white`}>
          {formatVnd(item.amount)}
        </Text>
        {item.durationMinutes > 0 && (
          <View className="flex-row items-center">
            <MaterialCommunityIcons name="clock-outline" size={14} color="#6b7280" />
            <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 ml-1`}>
              {t('myWork.duration', { minutes: item.durationMinutes })}
            </Text>
          </View>
        )}
        {item.quantity > 1 && (
          <Text className={`${typo.caption} text-gray-400`}>×{item.quantity}</Text>
        )}
      </View>

      <View className="flex-row gap-x-2">
        {item.status === 'PENDING' && (
          <>
            <TouchableOpacity
              onPress={() => onAction('start', item.itemId)}
              disabled={isPending}
              className="flex-1 bg-indigo-600 py-2 rounded-xl items-center"
            >
              <Text className={`${typo.label} text-white`}>{t('myWork.actionStart')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onAction('unpick', item.itemId)}
              disabled={isPending}
              className="flex-1 bg-gray-100 dark:bg-gray-700 py-2 rounded-xl items-center"
            >
              <Text className={`${typo.label} text-gray-700 dark:text-gray-300`}>{t('myWork.actionUnpick')}</Text>
            </TouchableOpacity>
          </>
        )}
        {item.status === 'IN_PROGRESS' && (
          <>
            <TouchableOpacity
              onPress={() => onAction('complete', item.itemId)}
              disabled={isPending}
              className="flex-1 bg-indigo-600 py-2 rounded-xl items-center"
            >
              <Text className={`${typo.label} text-white`}>{t('myWork.actionComplete')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onAction('release', item.itemId)}
              disabled={isPending}
              className="flex-1 bg-gray-100 dark:bg-gray-700 py-2 rounded-xl items-center"
            >
              <Text className={`${typo.label} text-gray-700 dark:text-gray-300`}>{t('myWork.actionRelease')}</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

function AvailableItemCard({
  item,
  onPickup,
  isPending,
}: {
  item: WorkItemDTO;
  onPickup: (itemId: number) => void;
  isPending: boolean;
}) {
  const { t } = useTranslation();
  const typo = useTypography();

  return (
    <View className="bg-white dark:bg-gray-800 rounded-2xl mx-4 mb-3 p-4 shadow-sm">
      <View className="flex-row justify-between items-start mb-2">
        <View className="flex-1 mr-3">
          <Text className={`${typo.labelBold} text-gray-900 dark:text-white`} numberOfLines={1}>
            {item.productName}
          </Text>
          <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 mt-0.5`}>
            {item.orderNumber} · {item.customerName ?? t('pos.walkIn')}
          </Text>
        </View>
        {item.durationMinutes > 0 && (
          <View className="flex-row items-center bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-lg">
            <MaterialCommunityIcons name="clock-outline" size={13} color="#6b7280" />
            <Text className={`${typo.caption} text-gray-600 dark:text-gray-300 ml-1`}>
              {t('myWork.duration', { minutes: item.durationMinutes })}
            </Text>
          </View>
        )}
      </View>

      <View className="flex-row items-center justify-between">
        <Text className={`${typo.label} text-gray-900 dark:text-white`}>
          {formatVnd(item.amount)}
        </Text>
        <TouchableOpacity
          onPress={() => onPickup(item.itemId)}
          disabled={isPending}
          className="bg-indigo-600 px-5 py-2 rounded-xl"
        >
          <Text className={`${typo.label} text-white`}>{t('myWork.actionPickup')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export function MyWorkScreen({ navigation }: MyWorkScreenProps<'MyWorkMain'>) {
  const { t } = useTranslation();
  const typo = useTypography();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('queue');
  const [refreshing, setRefreshing] = useState(false);
  const showErrorAlert = useErrorAlert();

  const { data: queueData, isLoading: queueLoading, isError: queueError, refetch: refetchQueue } = useQuery({
    queryKey: ['workItems', 'pending'],
    queryFn: () => orderApi.pendingWorkItems().then((r) => r.data.data.content),
    staleTime: 30_000,
  });

  const { data: availableData, isLoading: availableLoading, isError: availableError, refetch: refetchAvailable } = useQuery({
    queryKey: ['workItems', 'available'],
    queryFn: () => orderApi.availableWorkItems().then((r) => r.data.data.content),
    staleTime: 30_000,
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['workItems'] });
  }, [queryClient]);

  const startMutation = useMutation({
    mutationFn: (itemId: number) => orderApi.startWorkItem(itemId),
    onSuccess: invalidate,
    onError: showErrorAlert,
  });

  const completeMutation = useMutation({
    mutationFn: (itemId: number) => orderApi.completeWorkItem(itemId),
    onSuccess: invalidate,
    onError: showErrorAlert,
  });

  const unpickMutation = useMutation({
    mutationFn: (itemId: number) => orderApi.unpickWorkItem(itemId),
    onSuccess: invalidate,
    onError: showErrorAlert,
  });

  const releaseMutation = useMutation({
    mutationFn: (itemId: number) => orderApi.releaseWorkItem(itemId),
    onSuccess: invalidate,
    onError: showErrorAlert,
  });

  const pickupMutation = useMutation({
    mutationFn: (itemId: number) => orderApi.pickupWorkItem(itemId),
    onSuccess: invalidate,
    onError: showErrorAlert,
  });

  const isMutating =
    startMutation.isPending || completeMutation.isPending ||
    unpickMutation.isPending || releaseMutation.isPending || pickupMutation.isPending;

  function handleQueueAction(action: string, itemId: number) {
    if (action === 'start') startMutation.mutate(itemId);
    else if (action === 'complete') completeMutation.mutate(itemId);
    else if (action === 'unpick') unpickMutation.mutate(itemId);
    else if (action === 'release') releaseMutation.mutate(itemId);
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchQueue(), refetchAvailable()]);
    setRefreshing(false);
  }, [refetchQueue, refetchAvailable]);

  const isLoading = tab === 'queue' ? queueLoading : availableLoading;
  const isError = tab === 'queue' ? queueError : availableError;
  const items = tab === 'queue' ? (queueData ?? []) : (availableData ?? []);

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <View
        className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4"
        style={{ paddingTop: insets.top + 12, paddingBottom: 12 }}
      >
        <View className="flex-row justify-between items-center">
          <View className="flex-row items-center flex-1">
            <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} className="mr-3">
              <MaterialCommunityIcons name="chevron-left" size={26} color="#4f46e5" />
            </TouchableOpacity>
            <Text className={`${typo.heading} text-gray-900 dark:text-white flex-1`}>{t('myWork.title')}</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('MyWorkHistory')}>
            <MaterialCommunityIcons name="history" size={24} color="#4f46e5" />
          </TouchableOpacity>
        </View>
        <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 mt-0.5 mb-3`}>{t('myWork.hint')}</Text>

        {/* Tab toggle */}
        <View className="flex-row bg-gray-100 dark:bg-gray-700 rounded-xl p-1">
          {([
            { key: 'queue' as Tab, label: t('myWork.tabMyQueue') },
            { key: 'available' as Tab, label: t('myWork.tabAvailable') },
          ]).map((tabItem) => (
            <TouchableOpacity
              key={tabItem.key}
              onPress={() => setTab(tabItem.key)}
              className={`flex-1 py-2 rounded-lg items-center ${tab === tabItem.key ? 'bg-white dark:bg-gray-800 shadow-sm' : ''}`}
            >
              <Text className={`${typo.label} ${tab === tabItem.key ? 'text-indigo-600' : 'text-gray-500 dark:text-gray-400'}`}>
                {tabItem.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Content */}
      {isLoading ? (
        <View className="px-4 pt-4 gap-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} height={112} borderRadius={16} />)}
        </View>
      ) : isError ? (
        <ErrorState onRetry={tab === 'queue' ? refetchQueue : refetchAvailable} />
      ) : (
        <FlatList
          showsVerticalScrollIndicator={false}
          data={items as WorkItemDTO[]}
          keyExtractor={(item) => String(item.itemId)}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: insets.bottom + 20 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <EmptyState
              icon={tab === 'queue' ? '📋' : '🙌'}
              title={tab === 'queue' ? t('myWork.emptyMyQueue') : t('myWork.emptyAvailable')}
            />
          }
          renderItem={({ item }) =>
            tab === 'queue' ? (
              <WorkItemCard
                item={item as WorkItemDTO}
                onAction={handleQueueAction}
                isPending={isMutating}
              />
            ) : (
              <AvailableItemCard
                item={item as WorkItemDTO}
                onPickup={(id) => pickupMutation.mutate(id)}
                isPending={isMutating}
              />
            )
          }
        />
      )}

      {isMutating && (
        <View className="absolute inset-0 items-center justify-center">
          <ActivityIndicator size="large" color="#4f46e5" />
        </View>
      )}
    </View>
  );
}
