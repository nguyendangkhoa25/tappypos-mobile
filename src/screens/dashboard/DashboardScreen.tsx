import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { dashboardApi, orderApi, type KpiPreset, type KpiData } from '../../services/api';
import { formatVnd, formatDateTime } from '../../utils/format';
import { Skeleton } from '../../components/Skeleton';
import { ErrorState } from '../../components/ErrorState';
import { EmptyState } from '../../components/EmptyState';
import type { HomeScreenProps } from '../../types/navigation';

const PRESETS: { key: KpiPreset; labelKey: string }[] = [
  { key: 'today', labelKey: 'dashboard.today' },
  { key: 'week', labelKey: 'dashboard.thisWeek' },
  { key: 'month', labelKey: 'dashboard.thisMonth' },
];

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: '#059669',
  PROCESSING: '#3b82f6',
  PENDING: '#f59e0b',
  CANCELLED: '#ef4444',
};

type Props = HomeScreenProps<'Dashboard'>;

export function DashboardScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [preset, setPreset] = useState<KpiPreset>('today');
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: kpiData,
    isLoading: kpiLoading,
    isError: kpiError,
    refetch: refetchKpi,
  } = useQuery({
    queryKey: ['dashboard-kpi', preset],
    queryFn: () => dashboardApi.getKpi(preset).then((r) => r.data),
  });

  const {
    data: ordersData,
    isLoading: ordersLoading,
    refetch: refetchOrders,
  } = useQuery({
    queryKey: ['dashboard-recent-orders'],
    queryFn: () =>
      orderApi
        .list({ page: 0, size: 5 })
        .then((r) => r.data.data.content),
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchKpi(), refetchOrders()]);
    setRefreshing(false);
  };

  if (kpiError) {
    return <ErrorState onRetry={refetchKpi} />;
  }

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4f46e5" />}
    >
      {/* Header */}
      <View className="bg-primary px-6 pt-16 pb-6">
        <Text className="text-white text-lg font-bold">{t('dashboard.title')}</Text>
      </View>

      {/* Period selector */}
      <View className="flex-row bg-white mx-4 mt-4 rounded-xl overflow-hidden border border-gray-100">
        {PRESETS.map(({ key, labelKey }) => (
          <TouchableOpacity
            key={key}
            className={`flex-1 py-3 items-center ${preset === key ? 'bg-primary' : 'bg-white'}`}
            onPress={() => setPreset(key)}
          >
            <Text
              className={`text-sm font-semibold ${preset === key ? 'text-white' : 'text-gray-500'}`}
            >
              {t(labelKey)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Revenue hero card */}
      <View className="mx-4 mt-4 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <Text className="text-gray-500 text-sm mb-1">{t('dashboard.revenue')}</Text>
        {kpiLoading ? (
          <Skeleton height={40} width={180} borderRadius={8} />
        ) : (
          <Text className="text-4xl font-bold text-gray-900">
            {formatVnd(kpiData?.totalRevenue)}
          </Text>
        )}
      </View>

      {/* Stat chips */}
      <View className="flex-row mx-4 mt-3 gap-3">
        {[
          { labelKey: 'dashboard.totalOrders', value: kpiData?.totalOrders },
          { labelKey: 'dashboard.completed', value: kpiData?.completedOrders },
          { labelKey: 'dashboard.pending', value: kpiData?.pendingOrders },
        ].map(({ labelKey, value }) => (
          <View
            key={labelKey}
            className="flex-1 bg-white rounded-2xl p-4 items-center border border-gray-100 shadow-sm"
          >
            {kpiLoading ? (
              <Skeleton height={28} width={40} borderRadius={6} />
            ) : (
              <Text className="text-2xl font-bold text-gray-900">{value ?? 0}</Text>
            )}
            <Text className="text-xs text-gray-500 mt-1 text-center">{t(labelKey)}</Text>
          </View>
        ))}
      </View>

      {/* Quick access */}
      <View className="mx-4 mt-4">
        <TouchableOpacity
          testID="dashboard-customers-btn"
          className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex-row items-center"
          onPress={() => navigation.navigate('CustomerList')}
        >
          <View className="w-10 h-10 bg-primary-light rounded-full items-center justify-center mr-3">
            <MaterialCommunityIcons name="account-group-outline" size={22} color="#4f46e5" />
          </View>
          <Text className="text-base font-semibold text-gray-800 flex-1">{t('customers.title')}</Text>
          <MaterialCommunityIcons name="chevron-right" size={20} color="#d1d5db" />
        </TouchableOpacity>
      </View>

      {/* Recent orders */}
      <View className="mx-4 mt-4">
        <Text className="text-base font-bold text-gray-800 mb-3">{t('dashboard.recentOrders')}</Text>

        {ordersLoading && (
          <View className="gap-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} height={72} borderRadius={16} />
            ))}
          </View>
        )}

        {!ordersLoading && (!ordersData || ordersData.length === 0) && (
          <EmptyState icon="🧾" title={t('dashboard.noOrdersToday')} />
        )}

        {!ordersLoading &&
          ordersData?.map((order) => (
            <View
              key={order.id}
              className="bg-white rounded-2xl px-4 py-3 mb-3 border border-gray-100 shadow-sm"
            >
              <View className="flex-row justify-between items-start">
                <View className="flex-1">
                  <Text className="font-semibold text-gray-800">#{order.orderNumber}</Text>
                  <Text className="text-sm text-gray-500 mt-0.5">
                    {order.customerName ?? t('pos.walkIn')} · {formatDateTime(order.createdAt)}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="font-bold text-gray-900">{formatVnd(order.total)}</Text>
                  <View
                    className="mt-1 px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: (STATUS_COLORS[order.status] ?? '#6b7280') + '18' }}
                  >
                    <Text
                      className="text-xs font-semibold"
                      style={{ color: STATUS_COLORS[order.status] ?? '#6b7280' }}
                    >
                      {t(`orders.${order.status.toLowerCase()}` as never) ?? order.status}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          ))}
      </View>
    </ScrollView>
  );
}
