import { useState, useCallback, useRef, useEffect } from 'react';
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
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { orderApi, type OrderSummary } from '../../services/api';
import { formatVnd, formatDateTime } from '../../utils/format';
import { PAGE_SIZE } from '../../utils/constants';
import { Skeleton } from '../../components/Skeleton';
import { ErrorState } from '../../components/ErrorState';
import { EmptyState } from '../../components/EmptyState';
import { QuickOrderStrip } from '../../components/QuickOrderStrip';
import { useSellingStore } from '../../store/sellingStore';
import type { OrdersScreenProps } from '../../types/navigation';

const STATUS_FILTERS = [
  { key: '', labelKey: 'orders.all' },
  { key: 'COMPLETED', labelKey: 'orders.completed' },
  { key: 'PROCESSING', labelKey: 'orders.processing' },
  { key: 'PENDING', labelKey: 'orders.pending' },
  { key: 'CANCELLED', labelKey: 'orders.cancelled' },
];

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: '#059669',
  PROCESSING: '#3b82f6',
  PENDING: '#f59e0b',
  CANCELLED: '#ef4444',
};

export function OrderListScreen({ navigation }: OrdersScreenProps<'OrderList'>) {
  const { t } = useTranslation();
  const { activeView, setActiveView } = useSellingStore();
  const insets = useSafeAreaInsets();
  const [status, setStatus] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [allOrders, setAllOrders] = useState<OrderSummary[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const isLoadingMore = useRef(false);
  const canLoadMore = useRef(false);

  const {
    data,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['orders', status, search, page],
    queryFn: async () => {
      const res = await orderApi.list({ status: status || undefined, search: search || undefined, page, size: PAGE_SIZE });
      const content = res.data.data.content;
      if (page === 0) {
        setAllOrders(content);
      } else {
        setAllOrders((prev) => [...prev, ...content]);
      }
      return res.data.data;
    },
  });

  const hasMore = data ? page < data.totalPages - 1 : false;

  useEffect(() => {
    if (!isFetching) isLoadingMore.current = false;
  }, [isFetching]);

  useEffect(() => {
    canLoadMore.current = false;
    const t = setTimeout(() => { canLoadMore.current = true; }, 400);
    return () => clearTimeout(t);
  }, [search, status]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setPage(0);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleStatusChange = (s: string) => {
    setStatus(s);
    setPage(0);
  };

  const commitSearch = () => {
    setSearch(searchInput);
    setPage(0);
  };

  const handleEndReached = () => {
    if (!canLoadMore.current || !hasMore || isFetching || isLoadingMore.current) return;
    isLoadingMore.current = true;
    setPage((p) => p + 1);
  };

  if (isError) return <ErrorState onRetry={refetch} />;

  return (
    <View className="flex-1 bg-gray-50" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="bg-white px-4 pt-3 pb-3 shadow-sm">
        {activeView === 'ORDERS' ? (
          <View className="flex-row bg-gray-100 rounded-2xl p-1 mb-3">
            <TouchableOpacity
              className="flex-1 rounded-xl py-2 items-center active:opacity-70"
              onPress={() => setActiveView('POS')}
            >
              <Text className="text-sm font-semibold text-gray-500">{t('selling.title')}</Text>
            </TouchableOpacity>
            <View className="flex-1 rounded-xl py-2 items-center bg-white">
              <Text className="text-sm font-semibold text-indigo-600">{t('orders.title')}</Text>
            </View>
          </View>
        ) : (
          <>
            <Text className="text-2xl font-bold text-gray-900">{t('orders.title')}</Text>
            <Text className="text-xs text-gray-500 mb-3 mt-0.5">{t('orders.hint')}</Text>
          </>
        )}

        {/* Search */}
        <View className="flex-row items-center gap-2 mb-3">
          <View className="flex-1 flex-row items-center bg-gray-100 rounded-xl px-3 py-2.5">
            <MaterialCommunityIcons name="magnify" size={20} color="#9ca3af" />
            <TextInput
              className="flex-1 ml-2 text-base text-gray-800"
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
            <Text className="text-white font-semibold text-sm">{t('orders.searchButton')}</Text>
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
                className={`text-sm font-medium ${status === item.key ? 'text-white' : 'text-gray-600'}`}
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
      ) : allOrders.length === 0 ? (
        <EmptyState icon="🧾" title={t('orders.noOrders')} description={t('orders.noOrdersHint')} />
      ) : (
        <FlatList
          data={allOrders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 16 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4f46e5" />
          }
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.3}
          renderItem={({ item, index }) => (
            <TouchableOpacity
              testID={`order-row-${index}`}
              className="bg-white rounded-2xl p-4 mb-3 border border-gray-100 shadow-sm active:opacity-80"
              onPress={() => navigation.navigate('OrderDetail', { orderId: item.id })}
            >
              <View className="flex-row justify-between items-start">
                <View className="flex-1">
                  <Text className="font-bold text-gray-900">#{item.orderNumber}</Text>
                  <Text className="text-sm text-gray-500 mt-0.5">
                    {item.customerName ?? t('pos.walkIn')}
                  </Text>
                  <Text className="text-xs text-gray-400 mt-0.5">{formatDateTime(item.createdAt)}</Text>
                </View>
                <View className="items-end">
                  <Text className="font-bold text-gray-900 text-base">{formatVnd(item.total)}</Text>
                  <View
                    className="mt-1.5 px-2.5 py-1 rounded-full"
                    style={{ backgroundColor: (STATUS_COLORS[item.status] ?? '#6b7280') + '20' }}
                  >
                    <Text
                      className="text-xs font-bold"
                      style={{ color: STATUS_COLORS[item.status] ?? '#6b7280' }}
                    >
                      {t(`orders.${item.status.toLowerCase()}` as never) ?? item.status}
                    </Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          )}
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
