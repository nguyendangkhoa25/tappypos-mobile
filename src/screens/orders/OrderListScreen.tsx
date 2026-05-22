import { useState, useCallback, useRef, useEffect, useMemo, memo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { orderApi, type OrderSummary } from '../../services/api';
import { formatVnd, formatDateTime } from '../../utils/format';
import { PAGE_SIZE } from '../../utils/constants';
import { Skeleton } from '../../components/Skeleton';
import { ErrorState } from '../../components/ErrorState';
import { EmptyState } from '../../components/EmptyState';
import { QuickOrderStrip } from '../../components/QuickOrderStrip';
import { BarChart, type ChartGranularity } from '../../components/BarChart';
import { useSellingStore } from '../../store/sellingStore';
import { useOfflineQueueStore } from '../../store/offlineQueueStore';
import { useTypography } from '../../hooks/useTypography';
import type { OrdersScreenProps } from '../../types/navigation';

type Period = 'day' | 'week' | 'month' | 'year';

function getPeriodRange(p: Period): { from: string; to: string; granularity: ChartGranularity } {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  if (p === 'day') {
    const today = ymd(now);
    return { from: today, to: today, granularity: 'hour' };
  }
  if (p === 'week') {
    const dow = now.getDay();
    const start = new Date(now);
    start.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1));
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { from: ymd(start), to: ymd(end), granularity: 'day' };
  }
  if (p === 'month') {
    const from = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { from, to: ymd(last), granularity: 'day' };
  }
  return { from: `${now.getFullYear()}-01-01`, to: `${now.getFullYear()}-12-31`, granularity: 'month' };
}

const PERIOD_TABS: { key: Period; labelKey: string }[] = [
  { key: 'day',   labelKey: 'orders.periodDay' },
  { key: 'week',  labelKey: 'orders.periodWeek' },
  { key: 'month', labelKey: 'orders.periodMonth' },
  { key: 'year',  labelKey: 'orders.periodYear' },
];

const STATUS_FILTERS = [
  { key: '', labelKey: 'orders.all' },
  { key: 'COMPLETED', labelKey: 'orders.completed' },
  { key: 'IN_PROGRESS', labelKey: 'orders.in_progress' },
  { key: 'PENDING', labelKey: 'orders.pending' },
  { key: 'CANCELLED', labelKey: 'orders.cancelled' },
];

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: '#059669',
  IN_PROGRESS: '#3b82f6',
  PENDING: '#f59e0b',
  CANCELLED: '#ef4444',
};

type OrderRowProps = {
  item: OrderSummary;
  index: number;
  onPress: (id: string) => void;
  statusLabel: (status: string) => string;
  walkInLabel: string;
};

const OrderRow = memo(function OrderRow({ item, index, onPress, statusLabel, walkInLabel }: OrderRowProps) {
  const typo = useTypography();
  return (
    <TouchableOpacity
      testID={`order-row-${index}`}
      className="bg-white rounded-2xl p-4 mb-3 border border-gray-100 shadow-sm active:opacity-80"
      onPress={() => onPress(item.id)}
    >
      <View className="flex-row justify-between items-start">
        <View className="flex-1">
          <Text className={`${typo.label} font-bold text-gray-900`}>#{item.orderNumber}</Text>
          <Text className={`${typo.caption} text-gray-500 mt-0.5`}>{item.customerName ?? walkInLabel}</Text>
          <Text className={`${typo.caption} text-gray-400 mt-0.5`}>{formatDateTime(item.createdAt)}</Text>
        </View>
        <View className="items-end">
          <Text className={`${typo.labelBold} text-gray-900`}>{formatVnd(item.total)}</Text>
          <View
            className="mt-1.5 px-2.5 py-1 rounded-full"
            style={{ backgroundColor: (STATUS_COLORS[item.status] ?? '#6b7280') + '20' }}
          >
            <Text
              className={typo.captionBold}
              style={{ color: STATUS_COLORS[item.status] ?? '#6b7280' }}
            >
              {statusLabel(item.status)}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
});

export function OrderListScreen({ navigation }: OrdersScreenProps<'OrderList'>) {
  const { t } = useTranslation();
  const typo = useTypography();
  const { activeView, setActiveView } = useSellingStore();
  const { pendingOrders } = useOfflineQueueStore();
  const visiblePendingOrders = useMemo(
    () => pendingOrders.filter((o) => o.status !== 'error'),
    [pendingOrders],
  );
  const insets = useSafeAreaInsets();
  const [period, setPeriod] = useState<Period>('day');
  const { from, to, granularity } = useMemo(() => getPeriodRange(period), [period]);
  const [status, setStatus] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [allOrders, setAllOrders] = useState<OrderSummary[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const isLoadingMore = useRef(false);
  const canLoadMore = useRef(false);

  const { data: summary } = useQuery({
    queryKey: ['ordersSummary', from, to],
    queryFn: () => orderApi.summary({ from, to }).then((r) => r.data.data),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });

  const { data: chartData = [] } = useQuery({
    queryKey: ['ordersChart', from, to, granularity],
    queryFn: () => orderApi.chart({ from, to, granularity }).then((r) => r.data.data),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });

  const {
    data,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['orders', status, search, page, from, to],
    queryFn: async () => {
      const res = await orderApi.list({ status: status || undefined, search: search || undefined, page, size: PAGE_SIZE, from, to });
      const content = res.data.data.content;
      if (page === 0) {
        setAllOrders(content);
      } else {
        setAllOrders((prev) => [...prev, ...content]);
      }
      return res.data.data;
    },
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });

  const hasMore = data ? page < data.totalPages - 1 : false;

  useEffect(() => {
    if (!isFetching) isLoadingMore.current = false;
  }, [isFetching]);

  useEffect(() => {
    canLoadMore.current = false;
    const timer = setTimeout(() => { canLoadMore.current = true; }, 400);
    return () => clearTimeout(timer);
  }, [search, status, from]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setPage(0);
    setAllOrders([]);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handlePeriodChange = useCallback((p: Period) => {
    setPeriod(p);
    setPage(0);
  }, []);

  const handleStatusChange = useCallback((s: string) => {
    setStatus(s);
    setPage(0);
  }, []);

  const commitSearch = useCallback(() => {
    setSearch(searchInput);
    setPage(0);
  }, [searchInput]);

  const handleEndReached = useCallback(() => {
    if (!canLoadMore.current || !hasMore || isFetching || isLoadingMore.current) return;
    isLoadingMore.current = true;
    setPage((p) => p + 1);
  }, [hasMore, isFetching]);

  const statusLabel = useCallback((s: string) =>
    t(`orders.${s.toLowerCase()}` as never) ?? s, [t]);

  const navigateToDetail = useCallback((id: string) => {
    navigation.navigate('OrderDetail', { orderId: id });
  }, [navigation]);

  const listHeader = useMemo(() => (
    <>
      {chartData.length > 0 && (
        <View className="bg-white rounded-2xl px-4 pt-4 pb-2 mb-3">
          <BarChart data={chartData} color="#4f46e5" granularity={granularity} />
        </View>
      )}
      {visiblePendingOrders.length > 0 && status === '' ? (
        <View className="mb-3">
          {visiblePendingOrders.map((order) => (
            <View
              key={order.id}
              className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-2"
            >
              <View className="flex-row justify-between items-start">
                <View className="flex-1 mr-3">
                  <View className="flex-row items-center gap-2 mb-1">
                    <MaterialCommunityIcons name="clock-outline" size={14} color="#d97706" />
                    <Text className={`${typo.captionBold} text-amber-700`}>
                      {t('orders.pendingSync')}
                    </Text>
                  </View>
                  <Text className={`${typo.caption} text-amber-600`} numberOfLines={1}>
                    {order.items.map((i) => `${i.name} ×${i.quantity}`).join(', ')}
                  </Text>
                  <Text className={`${typo.caption} text-amber-500 mt-0.5`}>{formatDateTime(order.createdAt)}</Text>
                </View>
                <Text className={`${typo.label} font-bold text-amber-800`}>{formatVnd(order.total)}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </>
  ), [chartData, granularity, visiblePendingOrders, status, t, typo]);

  const listEmpty = useMemo(() => (
    visiblePendingOrders.length === 0 || status !== '' ? (
      <EmptyState icon="🧾" title={t('orders.noOrders')} description={t('orders.noOrdersHint')} />
    ) : null
  ), [visiblePendingOrders.length, status, t]);

  const walkInLabel = t('pos.walkIn');

  const renderItem = useCallback(({ item, index }: { item: OrderSummary; index: number }) => (
    <OrderRow
      item={item}
      index={index}
      onPress={navigateToDetail}
      statusLabel={statusLabel}
      walkInLabel={walkInLabel}
    />
  ), [navigateToDetail, statusLabel, walkInLabel]);

  if (isError) return <ErrorState onRetry={refetch} />;

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <View className="bg-white dark:bg-gray-800 px-4 pb-3 shadow-sm" style={{ paddingTop: insets.top + 12 }}>
        <Text className={`${typo.heading} text-gray-900`}>{t('orders.title')}</Text>
        <Text className={`${typo.caption} text-gray-500 mt-0.5 ${activeView === 'ORDERS' ? 'mb-2' : 'mb-3'}`}>{t('orders.hint')}</Text>
        {activeView === 'ORDERS' && (
          <View className="flex-row bg-gray-100 rounded-2xl p-1 mb-3">
            <TouchableOpacity
              className="flex-1 rounded-xl py-2 items-center active:opacity-70"
              onPress={() => setActiveView('POS')}
            >
              <Text className={`${typo.label} text-gray-500`}>{t('selling.title')}</Text>
            </TouchableOpacity>
            <View className="flex-1 rounded-xl py-2 items-center bg-white">
              <Text className={`${typo.label} text-indigo-600`}>{t('orders.title')}</Text>
            </View>
          </View>
        )}

        {/* Period tabs */}
        <View className="flex-row gap-1.5 mb-3">
          {PERIOD_TABS.map(({ key, labelKey }) => {
            const active = period === key;
            return (
              <TouchableOpacity
                key={key}
                onPress={() => handlePeriodChange(key)}
                className={`flex-1 py-1.5 rounded-xl items-center ${active ? 'bg-indigo-600' : 'bg-gray-100'}`}
              >
                <Text className={`${typo.captionBold} ${active ? 'text-white' : 'text-gray-500'}`}>
                  {t(labelKey)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Summary KPI */}
        {summary && (
          <View className="flex-row gap-2 mb-3">
            <View className="flex-1 bg-gray-50 rounded-xl p-2.5 items-center">
              <Text className={`${typo.labelBold} text-gray-900`} numberOfLines={1}>{formatVnd(summary.totalRevenue)}</Text>
              <Text className={`${typo.caption} text-gray-500 text-center mt-0.5`}>{t('orders.totalRevenue')}</Text>
            </View>
            <View className="flex-1 bg-gray-50 rounded-xl p-2.5 items-center">
              <Text className={`${typo.labelBold} text-indigo-600`}>{summary.orderCount}</Text>
              <Text className={`${typo.caption} text-gray-500 text-center mt-0.5`}>{t('orders.orderCount')}</Text>
            </View>
            <View className="flex-1 bg-gray-50 rounded-xl p-2.5 items-center">
              <Text className={`${typo.labelBold} text-emerald-600`} numberOfLines={1}>{formatVnd(summary.avgOrderValue)}</Text>
              <Text className={`${typo.caption} text-gray-500 text-center mt-0.5`}>{t('orders.avgOrderValue')}</Text>
            </View>
          </View>
        )}

        {/* Search */}
        <View className="flex-row items-center gap-2 mb-3">
          <View className="flex-1 flex-row items-center bg-gray-100 rounded-xl px-3 py-2.5">
            <MaterialCommunityIcons name="magnify" size={20} color="#9ca3af" />
            <TextInput
              className={`flex-1 ml-2 ${typo.inputSize} text-gray-800`}
              placeholder={t('orders.searchPlaceholder')}
              placeholderTextColor="#9ca3af"
              value={searchInput}
              onChangeText={setSearchInput}
              returnKeyType="search"
              onSubmitEditing={commitSearch}
            />
            {searchInput.length > 0 && (
              <TouchableOpacity
                onPress={() => { setSearchInput(''); setSearch(''); setPage(0); }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MaterialCommunityIcons name="close-circle" size={18} color="#9ca3af" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            onPress={commitSearch}
            className="bg-indigo-600 rounded-xl px-4 py-2.5 items-center justify-center"
            activeOpacity={0.8}
          >
            <Text className={`${typo.label} text-white`}>{t('orders.searchButton')}</Text>
          </TouchableOpacity>
        </View>

        {/* Status chips */}
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={STATUS_FILTERS}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => (
            <TouchableOpacity
              testID={`order-filter-${item.key || 'all'}`}
              className={`mr-2 px-4 py-1.5 rounded-full border ${
                status === item.key ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-gray-200'
              }`}
              onPress={() => handleStatusChange(item.key)}
            >
              <Text
                className={`${typo.caption} font-medium ${status === item.key ? 'text-white' : 'text-gray-600'}`}
              >
                {t(item.labelKey)}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <QuickOrderStrip onOrderCreated={onRefresh} />

      {isLoading && page === 0 ? (
        <View className="px-4 pt-4 gap-3">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} height={88} borderRadius={16} />)}
        </View>
      ) : (
        <FlatList
          showsVerticalScrollIndicator={false}
          data={allOrders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 16 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#059669" />
          }
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.3}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={listEmpty}
          renderItem={renderItem}
          ListFooterComponent={
            isFetching && page > 0 ? (
              <View className="py-4 items-center">
                <ActivityIndicator size="small" color="#4f46e5" />
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}
