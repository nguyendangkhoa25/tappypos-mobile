import { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { orderApi, type WorkItemDTO } from '../../services/api';
import { useErrorAlert } from '../../hooks/useErrorAlert';
import { useTypography } from '../../hooks/useTypography';
import { useFeatureCheck } from '../../hooks/useFeature';
import { formatVnd, formatDateTime } from '../../utils/format';
import { Skeleton } from '../../components/Skeleton';
import { ErrorState } from '../../components/ErrorState';
import type { MyWorkScreenProps } from '../../types/navigation';

// Module-level map: tracks when we first saw/started an item as IN_PROGRESS this session.
// Survives component re-renders & navigation; cleared on app restart.
const inProgressSince = new Map<number, number>();

function getTodayParams() {
  const now = new Date();
  return { filterType: 'DAY', day: now.getDate(), month: now.getMonth() + 1, year: now.getFullYear() };
}

function elapsedMinutes(fromMs: number): number {
  return Math.max(0, Math.floor((Date.now() - fromMs) / 60_000));
}

function orderAgeMinutes(orderCreatedAt: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(orderCreatedAt).getTime()) / 60_000));
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({
  color,
  title,
  count,
  right,
}: {
  color: string;
  title: string;
  count: number;
  right?: React.ReactNode;
}) {
  const typo = useTypography();
  return (
    <View className="flex-row items-center px-4 mb-2 mt-5">
      <View style={{ width: 3, height: 14, borderRadius: 2, backgroundColor: color, marginRight: 8 }} />
      <Text
        className={`${typo.captionBold} uppercase tracking-widest flex-1`}
        style={{ color, letterSpacing: 0.8 }}
      >
        {title}
      </Text>
      <View
        style={{
          backgroundColor: color + '22',
          borderRadius: 99,
          paddingHorizontal: 8,
          paddingVertical: 2,
        }}
      >
        <Text className={`${typo.caption} font-bold`} style={{ color }}>{count}</Text>
      </View>
      {right && <View className="ml-3">{right}</View>}
    </View>
  );
}

// ─── Daily summary strip ──────────────────────────────────────────────────────

function DailySummaryStrip({
  inProgressCount,
  pendingCount,
  completedCount,
  totalRevenue,
  totalCommission,
  hasCommission,
}: {
  inProgressCount: number;
  pendingCount: number;
  completedCount: number;
  totalRevenue: number;
  totalCommission: number;
  hasCommission: boolean;
}) {
  const { t } = useTranslation();
  const typo = useTypography();

  return (
    <View className="mx-4 mt-4 bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
      {/* Status row */}
      <View className="flex-row mb-3">
        <View className="flex-1 flex-row items-center">
          <View className="w-2 h-2 rounded-full bg-blue-500 mr-2" />
          <Text className={`${typo.captionBold} text-blue-500`}>
            {inProgressCount} {t('myWork.labelInProgress')}
          </Text>
        </View>
        <View className="flex-1 flex-row items-center">
          <View className="w-2 h-2 rounded-full bg-amber-500 mr-2" />
          <Text className={`${typo.captionBold} text-amber-500`}>
            {pendingCount} {t('myWork.labelWaiting')}
          </Text>
        </View>
        <View className="flex-1 flex-row items-center">
          <View className="w-2 h-2 rounded-full bg-emerald-600 mr-2" />
          <Text className={`${typo.captionBold} text-emerald-600`}>
            {completedCount} {t('myWork.labelDone')}
          </Text>
        </View>
      </View>

      {/* Revenue row */}
      <View className="border-t border-gray-100 dark:border-gray-700 pt-3 flex-row items-center flex-wrap gap-x-2">
        <MaterialCommunityIcons name="cash" size={15} color="#059669" />
        <Text className={`${typo.labelBold} text-emerald-600`}>{formatVnd(totalRevenue)}</Text>
        {hasCommission && totalCommission > 0 && (
          <>
            <Text className={`${typo.caption} text-gray-300 dark:text-gray-600`}>·</Text>
            <MaterialCommunityIcons name="star-circle-outline" size={14} color="#f59e0b" />
            <Text className={`${typo.captionBold} text-amber-500`}>+{formatVnd(totalCommission)}</Text>
          </>
        )}
        <Text className={`${typo.caption} text-gray-400`}>{t('myWork.todayLabel')}</Text>
      </View>
    </View>
  );
}

// ─── IN_PROGRESS card ─────────────────────────────────────────────────────────

function InProgressCard({
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
  const [, setTick] = useState(0);

  useEffect(() => {
    // Record the moment we first see this item as IN_PROGRESS (session approximation)
    if (!inProgressSince.has(item.itemId)) {
      inProgressSince.set(item.itemId, Date.now());
    }
    const interval = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(interval);
  }, [item.itemId]);

  const since = inProgressSince.get(item.itemId) ?? Date.now();
  const elapsed = elapsedMinutes(since);
  const hasProgress = item.durationMinutes > 0;
  const progress = hasProgress ? Math.min(elapsed / item.durationMinutes, 1) : 0;
  const isOverTime = hasProgress && elapsed > item.durationMinutes;

  return (
    <View
      testID={`mywork-task-${item.itemId}`}
      className="bg-white dark:bg-gray-800 rounded-2xl mx-4 mb-3 overflow-hidden shadow-sm"
      style={{ borderLeftWidth: 3, borderLeftColor: '#3b82f6' }}
    >
      <View className="p-4">
        {/* Title + elapsed badge */}
        <View className="flex-row justify-between items-start mb-1">
          <Text
            className={`${typo.labelBold} text-gray-900 dark:text-white flex-1 mr-2`}
            numberOfLines={1}
          >
            {item.productName}
          </Text>
          <View className="flex-row items-center bg-blue-50 dark:bg-blue-900/30 px-2.5 py-1 rounded-lg">
            <MaterialCommunityIcons name="clock-fast" size={12} color="#3b82f6" />
            <Text className={`${typo.caption} font-semibold`} style={{ color: '#3b82f6', marginLeft: 3 }}>
              {elapsed > 0 ? t('myWork.elapsedMin', { minutes: elapsed }) : t('myWork.justStarted')}
            </Text>
          </View>
        </View>

        {/* Order info */}
        <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 mb-2`}>
          {item.orderNumber}
          {' · '}
          {item.customerName ?? t('pos.walkIn')}
          {item.quantity > 1 ? ` · ×${item.quantity}` : ''}
        </Text>

        {/* Note */}
        {!!item.note && (
          <Text
            className={`${typo.caption} text-amber-600 dark:text-amber-400 italic mb-2`}
            numberOfLines={2}
          >
            → {item.note}
          </Text>
        )}

        {/* Progress bar */}
        {hasProgress && (
          <View className="mb-3">
            <View className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <View
                style={{
                  height: '100%',
                  width: `${progress * 100}%`,
                  backgroundColor: isOverTime ? '#ef4444' : '#3b82f6',
                  borderRadius: 99,
                }}
              />
            </View>
            <View className="flex-row justify-between mt-1">
              <Text className={`${typo.caption} text-gray-400`}>
                {t('myWork.expected', { minutes: item.durationMinutes })}
              </Text>
              {isOverTime ? (
                <Text className={`${typo.caption} font-semibold`} style={{ color: '#ef4444' }}>
                  +{elapsed - item.durationMinutes}p {t('myWork.overtime')}
                </Text>
              ) : (
                <Text className={`${typo.caption} text-gray-400`}>
                  ~{Math.max(0, item.durationMinutes - elapsed)}p {t('myWork.remaining')}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Amount + action buttons */}
        <View className="flex-row items-center gap-x-2">
          <Text className={`${typo.labelBold} text-gray-900 dark:text-white flex-1`}>
            {formatVnd(item.amount)}
          </Text>
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
            <Text className={`${typo.label} text-gray-700 dark:text-gray-300`}>
              {t('myWork.actionRelease')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ─── PENDING card ─────────────────────────────────────────────────────────────

function PendingCard({
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
  const ageMin = orderAgeMinutes(item.orderCreatedAt);
  const isUrgent = ageMin >= 15;

  return (
    <View
      testID={`mywork-task-${item.itemId}`}
      className="bg-white dark:bg-gray-800 rounded-2xl mx-4 mb-3 overflow-hidden shadow-sm"
      style={{ borderLeftWidth: 3, borderLeftColor: '#f59e0b' }}
    >
      <View className="p-4">
        {/* Title + waiting badge */}
        <View className="flex-row justify-between items-start mb-1">
          <Text
            className={`${typo.labelBold} text-gray-900 dark:text-white flex-1 mr-2`}
            numberOfLines={1}
          >
            {item.productName}
          </Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 99,
              backgroundColor: isUrgent ? '#fef2f2' : '#fffbeb',
            }}
          >
            <MaterialCommunityIcons
              name="clock-outline"
              size={12}
              color={isUrgent ? '#ef4444' : '#f59e0b'}
            />
            <Text
              className={`${typo.caption} font-semibold`}
              style={{ color: isUrgent ? '#ef4444' : '#f59e0b', marginLeft: 3 }}
            >
              {ageMin > 0 ? t('myWork.waitingMin', { minutes: ageMin }) : t('myWork.justNow')}
            </Text>
          </View>
        </View>

        {/* Order info */}
        <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 mb-2`}>
          {item.orderNumber}
          {' · '}
          {item.customerName ?? t('pos.walkIn')}
          {item.quantity > 1 ? ` · ×${item.quantity}` : ''}
        </Text>

        {/* Note */}
        {!!item.note && (
          <Text
            className={`${typo.caption} text-amber-600 dark:text-amber-400 italic mb-2`}
            numberOfLines={2}
          >
            → {item.note}
          </Text>
        )}

        {/* Expected duration */}
        {item.durationMinutes > 0 && (
          <View className="flex-row items-center mb-2">
            <MaterialCommunityIcons name="timer-sand" size={13} color="#9ca3af" />
            <Text className={`${typo.caption} text-gray-400 ml-1.5`}>
              {t('myWork.expected', { minutes: item.durationMinutes })}
            </Text>
          </View>
        )}

        {/* Amount + action buttons */}
        <View className="flex-row items-center gap-x-2">
          <Text className={`${typo.labelBold} text-gray-900 dark:text-white flex-1`}>
            {formatVnd(item.amount)}
          </Text>
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
            <Text className={`${typo.label} text-gray-700 dark:text-gray-300`}>
              {t('myWork.actionUnpick')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ─── AVAILABLE card ───────────────────────────────────────────────────────────

function AvailableCard({
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
  const ageMin = orderAgeMinutes(item.orderCreatedAt);

  return (
    <View className="bg-white dark:bg-gray-800 rounded-2xl mx-4 mb-3 p-4 shadow-sm">
      <View className="flex-row items-start mb-1">
        <View className="flex-1 mr-3">
          <Text
            className={`${typo.labelBold} text-gray-900 dark:text-white`}
            numberOfLines={1}
          >
            {item.productName}
          </Text>
          <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 mt-0.5`}>
            {item.orderNumber}
            {' · '}
            {item.customerName ?? t('pos.walkIn')}
            {item.quantity > 1 ? ` · ×${item.quantity}` : ''}
          </Text>
        </View>
        <Text className={`${typo.caption} text-gray-400 dark:text-gray-500`}>
          {ageMin > 0 ? t('myWork.agoMin', { minutes: ageMin }) : t('myWork.justNow')}
        </Text>
      </View>

      {!!item.note && (
        <Text
          className={`${typo.caption} text-amber-600 dark:text-amber-400 italic mb-1.5`}
          numberOfLines={2}
        >
          → {item.note}
        </Text>
      )}

      <View className="flex-row items-center justify-between mt-1">
        <View className="flex-row items-center gap-x-3">
          <Text className={`${typo.label} text-gray-900 dark:text-white`}>
            {formatVnd(item.amount)}
          </Text>
          {item.durationMinutes > 0 && (
            <View className="flex-row items-center">
              <MaterialCommunityIcons name="clock-outline" size={13} color="#9ca3af" />
              <Text className={`${typo.caption} text-gray-400 ml-1`}>
                {item.durationMinutes}p
              </Text>
            </View>
          )}
        </View>
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

// ─── COMPLETED TODAY mini-card ────────────────────────────────────────────────

function CompletedTodayCard({
  item,
  hasCommission,
}: {
  item: WorkItemDTO;
  hasCommission: boolean;
}) {
  const { t } = useTranslation();
  const typo = useTypography();

  return (
    <View className="bg-white dark:bg-gray-800 rounded-2xl mx-4 mb-2 px-4 py-3 shadow-sm">
      <View className="flex-row items-center">
        <MaterialCommunityIcons name="check-circle-outline" size={18} color="#059669" />
        <View className="flex-1 mx-2.5">
          <Text className={`${typo.label} text-gray-900 dark:text-white`} numberOfLines={1}>
            {item.productName}
          </Text>
          <Text className={`${typo.caption} text-gray-400 dark:text-gray-500`}>
            {item.orderNumber}
            {' · '}
            {item.customerName ?? t('pos.walkIn')}
          </Text>
        </View>
        <View className="items-end">
          <Text className={`${typo.captionBold} text-emerald-600`}>{formatVnd(item.amount)}</Text>
          {hasCommission && (item.commissionAmount ?? 0) > 0 && (
            <Text className={`${typo.caption} font-semibold`} style={{ color: '#f59e0b' }}>
              +{formatVnd(item.commissionAmount)}
            </Text>
          )}
        </View>
      </View>
      {!!item.completedAt && (
        <Text className={`${typo.caption} text-gray-400 mt-1`} style={{ marginLeft: 30 }}>
          {formatDateTime(item.completedAt)}
        </Text>
      )}
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export function MyWorkScreen({ navigation }: MyWorkScreenProps<'MyWorkMain'>) {
  const { t } = useTranslation();
  const typo = useTypography();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const showErrorAlert = useErrorAlert();
  const has = useFeatureCheck();
  const hasCommission = has('COMMISSION');
  const todayParams = getTodayParams();

  // ── Queries ──────────────────────────────────────────────────────────────────
  const {
    data: queueData,
    isLoading: queueLoading,
    isError: queueError,
    refetch: refetchQueue,
  } = useQuery({
    queryKey: ['workItems', 'pending'],
    queryFn: () => orderApi.pendingWorkItems().then((r) => r.data.data.content),
    staleTime: 30_000,
  });

  const {
    data: availableData,
    isLoading: availableLoading,
    isError: availableError,
    refetch: refetchAvailable,
  } = useQuery({
    queryKey: ['workItems', 'available'],
    queryFn: () => orderApi.availableWorkItems().then((r) => r.data.data.content),
    staleTime: 30_000,
  });

  const { data: completedToday, refetch: refetchCompleted } = useQuery({
    queryKey: ['workItems', 'completed', 'DAY', todayParams.day, todayParams.month, todayParams.year],
    queryFn: () => orderApi.completedWorkItems(todayParams).then((r) => r.data.data.content),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });

  const { data: summary, refetch: refetchSummary } = useQuery({
    queryKey: ['workItems', 'summary', 'DAY', todayParams.day, todayParams.month, todayParams.year],
    queryFn: () => orderApi.workItemSummary(todayParams).then((r) => r.data.data),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });

  // ── Derived lists ─────────────────────────────────────────────────────────────
  const inProgressItems = (queueData ?? []).filter((i) => i.status === 'IN_PROGRESS');
  const pendingItems = (queueData ?? []).filter((i) => i.status === 'PENDING');
  const availableItems = availableData ?? [];
  const completedItems = completedToday ?? [];

  // ── Mutations ─────────────────────────────────────────────────────────────────
  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['workItems'] });
  }, [queryClient]);

  const startMutation = useMutation({
    mutationFn: (itemId: number) => orderApi.startWorkItem(itemId),
    onSuccess: (_, itemId) => {
      inProgressSince.set(itemId, Date.now()); // accurate start time when user initiates
      invalidate();
    },
    onError: showErrorAlert,
  });

  const completeMutation = useMutation({
    mutationFn: (itemId: number) => orderApi.completeWorkItem(itemId),
    onSuccess: (_, itemId) => {
      inProgressSince.delete(itemId);
      invalidate();
    },
    onError: showErrorAlert,
  });

  const unpickMutation = useMutation({
    mutationFn: (itemId: number) => orderApi.unpickWorkItem(itemId),
    onSuccess: invalidate,
    onError: showErrorAlert,
  });

  const releaseMutation = useMutation({
    mutationFn: (itemId: number) => orderApi.releaseWorkItem(itemId),
    onSuccess: (_, itemId) => {
      inProgressSince.delete(itemId);
      invalidate();
    },
    onError: showErrorAlert,
  });

  const pickupMutation = useMutation({
    mutationFn: (itemId: number) => orderApi.pickupWorkItem(itemId),
    onSuccess: invalidate,
    onError: showErrorAlert,
  });

  const isMutating =
    startMutation.isPending ||
    completeMutation.isPending ||
    unpickMutation.isPending ||
    releaseMutation.isPending ||
    pickupMutation.isPending;

  function handleQueueAction(action: string, itemId: number) {
    if (action === 'start') startMutation.mutate(itemId);
    else if (action === 'complete') completeMutation.mutate(itemId);
    else if (action === 'unpick') unpickMutation.mutate(itemId);
    else if (action === 'release') releaseMutation.mutate(itemId);
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchQueue(), refetchAvailable(), refetchCompleted(), refetchSummary()]);
    setRefreshing(false);
  }, [refetchQueue, refetchAvailable, refetchCompleted, refetchSummary]);

  const isLoading = queueLoading || availableLoading;
  const isError = queueError || availableError;

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <View
        className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4"
        style={{ paddingTop: insets.top + 12, paddingBottom: 12 }}
      >
        <View>
          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              className="mr-3"
            >
              <MaterialCommunityIcons name="chevron-left" size={26} color="#4f46e5" />
            </TouchableOpacity>
            <Text className={`${typo.heading} text-gray-900 dark:text-white flex-1`}>
              {t('myWork.title')}
            </Text>
          </View>
          <Text className={`${typo.caption} text-gray-400 dark:text-gray-500 mt-0.5`}>
            {t('myWork.hint')}
          </Text>
        </View>
      </View>

      {/* Content */}
      {isLoading ? (
        <View className="px-4 pt-4 gap-y-3">
          <Skeleton height={78} borderRadius={16} />
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} height={130} borderRadius={16} />
          ))}
        </View>
      ) : isError ? (
        <ErrorState onRetry={onRefresh} />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#059669" />
          }
          contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        >
          {/* ── Today's summary ─────────────────────────────────────────── */}
          <DailySummaryStrip
            inProgressCount={inProgressItems.length}
            pendingCount={pendingItems.length}
            completedCount={summary?.completedCount ?? completedItems.length}
            totalRevenue={summary?.totalRevenue ?? 0}
            totalCommission={summary?.totalCommission ?? 0}
            hasCommission={hasCommission}
          />

          {/* ── All-clear banner ─────────────────────────────────────────── */}
          {inProgressItems.length === 0 &&
            pendingItems.length === 0 &&
            availableItems.length === 0 && (
              <View className="mx-4 mt-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl p-4 items-center">
                <Text className="text-2xl mb-1">☕</Text>
                <Text className={`${typo.label} text-center text-indigo-600 dark:text-indigo-400`}>
                  {t('myWork.allClear')}
                </Text>
              </View>
            )}

          {/* ── IN_PROGRESS ──────────────────────────────────────────────── */}
          {inProgressItems.length > 0 && (
            <>
              <SectionHeader
                color="#3b82f6"
                title={t('myWork.sectionInProgress')}
                count={inProgressItems.length}
              />
              {inProgressItems.map((item) => (
                <InProgressCard
                  key={item.itemId}
                  item={item}
                  onAction={handleQueueAction}
                  isPending={isMutating}
                />
              ))}
            </>
          )}

          {/* ── PENDING ──────────────────────────────────────────────────── */}
          {pendingItems.length > 0 && (
            <>
              <SectionHeader
                color="#f59e0b"
                title={t('myWork.sectionPending')}
                count={pendingItems.length}
              />
              {pendingItems.map((item) => (
                <PendingCard
                  key={item.itemId}
                  item={item}
                  onAction={handleQueueAction}
                  isPending={isMutating}
                />
              ))}
            </>
          )}

          {/* ── AVAILABLE ────────────────────────────────────────────────── */}
          <SectionHeader
            color="#6366f1"
            title={t('myWork.sectionAvailable')}
            count={availableItems.length}
          />
          {availableItems.length === 0 ? (
            <View className="mx-4 bg-white dark:bg-gray-800 rounded-2xl px-4 py-5 items-center shadow-sm">
              <Text className={`${typo.label} text-gray-400 dark:text-gray-500`}>
                {t('myWork.emptyAvailable')}
              </Text>
            </View>
          ) : (
            availableItems.map((item) => (
              <AvailableCard
                key={item.itemId}
                item={item}
                onPickup={(id) => pickupMutation.mutate(id)}
                isPending={isMutating}
              />
            ))
          )}

          {/* ── COMPLETED TODAY ───────────────────────────────────────────── */}
          <SectionHeader
            color="#059669"
            title={t('myWork.sectionCompletedToday')}
            count={summary?.completedCount ?? completedItems.length}
            right={
              <TouchableOpacity
                onPress={() => navigation.navigate('MyWorkHistory')}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Text className={`${typo.caption} text-indigo-500`}>{t('myWork.viewAll')}</Text>
              </TouchableOpacity>
            }
          />
          {completedItems.length === 0 ? (
            <View className="mx-4 bg-white dark:bg-gray-800 rounded-2xl px-4 py-5 items-center shadow-sm">
              <Text className={`${typo.label} text-gray-400 dark:text-gray-500`}>
                {t('myWork.emptyHistory')}
              </Text>
            </View>
          ) : (
            completedItems.map((item) => (
              <CompletedTodayCard key={item.itemId} item={item} hasCommission={hasCommission} />
            ))
          )}
        </ScrollView>
      )}

      {/* Global mutation loading overlay */}
      {isMutating && (
        <View className="absolute inset-0 items-center justify-center bg-black/10">
          <ActivityIndicator size="large" color="#4f46e5" />
        </View>
      )}
    </View>
  );
}
