import { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Ionicons } from '@expo/vector-icons';
import {
  orderApi,
  shopConfigApi,
  subscriptionApi,
  type KpiPreset,
} from '../../services/api';
import { formatVnd, formatDateTime } from '../../utils/format';
import { Skeleton } from '../../components/Skeleton';
import { ErrorState } from '../../components/ErrorState';
import { EmptyState } from '../../components/EmptyState';
import { BarChart } from '../../components/BarChart';
import { useNotificationBadge } from '../../hooks/useNotificationBadge';
import { useUserStore } from '../../store/userStore';
import { usePrivacyStore } from '../../store/privacyStore';
import type { HomeScreenProps } from '../../types/navigation';

function getDateRange(preset: KpiPreset): { from: string; to: string } {
  const now = new Date();
  const toISO = (d: Date) => d.toISOString().slice(0, 10);
  const today = toISO(now);

  if (preset === 'today') return { from: today, to: today };

  if (preset === 'yesterday') {
    const y = new Date(now);
    y.setDate(now.getDate() - 1);
    const yStr = toISO(y);
    return { from: yStr, to: yStr };
  }

  if (preset === 'week') {
    const day = now.getDay();
    const mon = new Date(now);
    mon.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
    return { from: toISO(mon), to: today };
  }

  return {
    from: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`,
    to: today,
  };
}

function getChartGranularity(preset: KpiPreset): 'hour' | 'day' | 'month' {
  if (preset === 'today' || preset === 'yesterday') return 'hour';
  if (preset === 'week') return 'day';
  return 'day';
}

const PRESETS: { key: KpiPreset; labelKey: string }[] = [
  { key: 'today', labelKey: 'dashboard.today' },
  { key: 'yesterday', labelKey: 'dashboard.yesterday' },
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

function StatCol({
  label,
  value,
  loading,
}: {
  label: string;
  value: number;
  loading: boolean;
}) {
  return (
    <View className="flex-1">
      <Text className="text-indigo-300 text-xs mb-0.5">{label}</Text>
      {loading ? (
        <Skeleton width="75%" height={18} borderRadius={4} variant="light" />
      ) : (
        <Text className="text-white text-base font-semibold">{value}</Text>
      )}
    </View>
  );
}

function TrendBadge({ pct, loading }: { pct: number | null; loading: boolean }) {
  if (loading || pct === null) return null;
  const up = pct >= 0;
  return (
    <View
      className={`flex-row items-center px-2 py-0.5 rounded-full ml-2 ${
        up ? 'bg-indigo-500/30' : 'bg-red-500/30'
      }`}
    >
      <Ionicons
        name={up ? 'trending-up' : 'trending-down'}
        size={12}
        color={up ? '#6ee7b7' : '#fca5a5'}
      />
      <Text className={`text-xs font-semibold ml-0.5 ${up ? 'text-indigo-200' : 'text-red-200'}`}>
        {up ? '+' : ''}
        {pct}%
      </Text>
    </View>
  );
}

export function DashboardScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { top, bottom } = useSafeAreaInsets();
  const [preset, setPreset] = useState<KpiPreset>('today');
  const unreadCount = useNotificationBadge();
  const { nickname, fullName, shopName } = useUserStore();
  const { isHidden, toggle } = usePrivacyStore();

  const displayName = nickname || fullName;
  const mask = (n: number) => (isHidden ? '••••' : formatVnd(n));

  const handleBellPress = () => {
    navigation.getParent()?.navigate('More', { screen: 'Notifications' } as any);
  };

  const dateRange = useMemo(() => getDateRange(preset), [preset]);
  const granularity = getChartGranularity(preset);

  // Current period KPI
  const {
    data: kpiData,
    isLoading: kpiLoading,
    isError: kpiError,
    refetch: refetchKpi,
    isRefetching: isKpiRefetching,
  } = useQuery({
    queryKey: ['dashboard-kpi', preset],
    queryFn: () =>
      orderApi.summary({ from: dateRange.from, to: dateRange.to }).then((r) => r.data.data),
    staleTime: 30_000,
  });

  // Yesterday KPI — only fetched when preset is 'today' to power trend arrow
  const yesterdayRange = useMemo(() => getDateRange('yesterday'), []);
  const { data: yesterdayKpi, isLoading: trendLoading } = useQuery({
    queryKey: ['dashboard-kpi', 'yesterday'],
    queryFn: () =>
      orderApi.summary({ from: yesterdayRange.from, to: yesterdayRange.to }).then((r) => r.data.data),
    enabled: preset === 'today',
    staleTime: 5 * 60_000,
  });

  const trendPct = useMemo<number | null>(() => {
    if (preset !== 'today' || !kpiData || !yesterdayKpi) return null;
    if (yesterdayKpi.totalRevenue === 0) return null;
    return Math.round(
      ((kpiData.totalRevenue - yesterdayKpi.totalRevenue) / yesterdayKpi.totalRevenue) * 100,
    );
  }, [preset, kpiData, yesterdayKpi]);

  // Recent orders
  const {
    data: ordersData,
    isLoading: ordersLoading,
    refetch: refetchOrders,
    isRefetching: isOrdersRefetching,
  } = useQuery({
    queryKey: ['dashboard-recent-orders'],
    queryFn: () => orderApi.list({ page: 0, size: 5 }).then((r) => r.data.data.content),
    staleTime: 30_000,
  });

  // Shop info
  const { data: shopConfig } = useQuery({
    queryKey: ['shop-config'],
    queryFn: () => shopConfigApi.getInfo().then((r) => r.data.data),
    staleTime: 5 * 60_000,
  });

  // Subscription status
  const { data: subscription } = useQuery({
    queryKey: ['subscription'],
    queryFn: () => subscriptionApi.getCurrent().then((r) => r.data.data),
    staleTime: 10 * 60_000,
  });

  // Revenue chart
  const { data: chartData = [] } = useQuery({
    queryKey: ['dashboard-chart', preset],
    queryFn: () =>
      orderApi.chart({ from: dateRange.from, to: dateRange.to, granularity }).then((r) => r.data.data),
    staleTime: 30_000,
  });

  const onRefresh = () => {
    refetchKpi();
    refetchOrders();
  };

  // Derived KPI values from orderApi.summary shape
  const totalRevenue = kpiData?.totalRevenue ?? 0;
  const totalOrders = kpiData?.orderCount ?? 0;
  const completedOrders = kpiData?.completedCount ?? 0;
  const pendingOrders = Math.max(0, totalOrders - completedOrders - (kpiData?.cancelledCount ?? 0));

  // Subscription banner
  const subBanner = useMemo(() => {
    if (!subscription) return null;
    if (subscription.status === 'EXPIRED') {
      return { text: t('dashboard.subscriptionExpired'), color: 'bg-red-500' };
    }
    if (subscription.status === 'ACTIVE') {
      const expiresDate = new Date(subscription.expiresAt);
      const daysLeft = Math.ceil((expiresDate.getTime() - Date.now()) / 86400000);
      if (daysLeft <= 7) {
        const formatted = expiresDate.toLocaleDateString('vi-VN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });
        return {
          text: t('dashboard.subscriptionExpiringSoon', { date: formatted }),
          color: 'bg-amber-500',
        };
      }
    }
    return null;
  }, [subscription, t]);

  if (kpiError) {
    return <ErrorState onRetry={refetchKpi} />;
  }

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <ScrollView
        contentContainerStyle={{ paddingBottom: bottom + 24 }}
        refreshControl={
          <RefreshControl
            refreshing={isKpiRefetching || isOrdersRefetching}
            onRefresh={onRefresh}
            tintColor="#4f46e5"
          />
        }
      >
        {/* Subscription expiry banner */}
        {subBanner && (
          <View className={`${subBanner.color} px-5 py-2.5 flex-row items-center gap-2`}>
            <MaterialCommunityIcons name="alert-circle-outline" size={16} color="white" />
            <Text className="text-white text-xs font-semibold flex-1">{subBanner.text}</Text>
          </View>
        )}

        {/* Header */}
        <View
          className="bg-primary px-5 pb-10"
          style={{ paddingTop: top + (subBanner ? 8 : 12) }}
        >
          {/* Row 1: greeting + bell */}
          <View className="flex-row items-center justify-between mb-1">
            <Text className="text-white text-2xl font-bold flex-1 mr-3" numberOfLines={1}>
              {displayName
                ? t('dashboard.greeting', { name: displayName })
                : t('dashboard.greetingDefault')}
            </Text>
            <TouchableOpacity
              onPress={handleBellPress}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="notifications-outline" size={22} color="white" />
              {unreadCount > 0 && (
                <View
                  className="absolute -top-1 -right-1 bg-red-500 rounded-full items-center justify-center"
                  style={{ minWidth: 16, height: 16, paddingHorizontal: 3 }}
                >
                  <Text className="text-white font-bold" style={{ fontSize: 9, lineHeight: 12 }}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Shop info */}
          <View className="flex-row items-center gap-1.5 mb-4">
            <Ionicons name="storefront-outline" size={12} color="rgba(199,210,254,0.8)" />
            <Text className="text-indigo-200 text-xs font-medium" numberOfLines={1}>
              {shopName || shopConfig?.shopName || t('dashboard.subtitle')}
              {shopConfig?.address ? ` · ${shopConfig.address}` : ''}
            </Text>
          </View>

          {/* Revenue hero + trend + eye toggle */}
          <Text className="text-indigo-200 text-xs mb-0.5">{t('dashboard.revenue')}</Text>
          <View className="flex-row items-center mb-1" style={{ gap: 10 }}>
            {kpiLoading ? (
              <Skeleton width="58%" height={34} borderRadius={8} variant="light" />
            ) : (
              <Text className="text-3xl font-bold text-white">{mask(totalRevenue)}</Text>
            )}
            <TrendBadge pct={trendPct} loading={trendLoading && preset === 'today'} />
            <TouchableOpacity onPress={toggle} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons
                name={isHidden ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color="rgba(255,255,255,0.7)"
              />
            </TouchableOpacity>
          </View>
          {preset === 'today' && trendPct !== null && (
            <Text className="text-indigo-300 text-xs mb-3">{t('dashboard.trendVsYesterday')}</Text>
          )}
          {preset !== 'today' || trendPct === null ? (
            <View className="mb-3" />
          ) : null}

          {/* 3-col stats */}
          <View className="flex-row">
            <StatCol label={t('dashboard.totalOrders')} value={totalOrders} loading={kpiLoading} />
            <StatCol label={t('dashboard.completed')} value={completedOrders} loading={kpiLoading} />
            <StatCol label={t('dashboard.pending')} value={pendingOrders} loading={kpiLoading} />
          </View>
        </View>

        {/* Period selector (overlaps header) */}
        <View className="mx-4 -mt-4 bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700 shadow-sm mb-4">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row">
              {PRESETS.map(({ key, labelKey }) => (
                <TouchableOpacity
                  key={key}
                  className={`px-5 py-3 items-center ${preset === key ? 'bg-primary' : ''}`}
                  onPress={() => setPreset(key)}
                >
                  <Text
                    className={`text-sm font-semibold ${
                      preset === key ? 'text-white' : 'text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {t(labelKey)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Trend chart */}
        {chartData.length > 0 && (
          <View className="mx-4 mb-4 bg-white dark:bg-gray-800 rounded-2xl px-4 pt-4 pb-2 shadow-sm border border-gray-100 dark:border-gray-700">
            <BarChart data={chartData} color="#4f46e5" granularity={granularity} />
          </View>
        )}

        {/* Quick access */}
        <View className="mx-4 mb-4">
          <TouchableOpacity
            testID="dashboard-customers-btn"
            className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm flex-row items-center"
            onPress={() => navigation.navigate('CustomerList')}
          >
            <View className="w-10 h-10 bg-primary-light rounded-full items-center justify-center mr-3">
              <MaterialCommunityIcons name="account-group-outline" size={22} color="#4f46e5" />
            </View>
            <Text className="text-base font-semibold text-gray-800 dark:text-gray-100 flex-1">
              {t('customers.title')}
            </Text>
            <MaterialCommunityIcons name="chevron-right" size={20} color="#d1d5db" />
          </TouchableOpacity>
        </View>

        {/* Recent orders */}
        <View className="mx-4">
          <Text className="text-base font-bold text-gray-800 dark:text-gray-100 mb-3">
            {t('dashboard.recentOrders')}
          </Text>

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
                className="bg-white dark:bg-gray-800 rounded-2xl px-4 py-3 mb-3 border border-gray-100 dark:border-gray-700 shadow-sm"
              >
                <View className="flex-row justify-between items-start">
                  <View className="flex-1">
                    <Text className="font-semibold text-gray-800 dark:text-gray-100">
                      #{order.orderNumber}
                    </Text>
                    <Text className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                      {order.customerName ?? t('pos.walkIn')} · {formatDateTime(order.createdAt)}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text className="font-bold text-gray-900 dark:text-gray-100">
                      {mask(order.total)}
                    </Text>
                    <View
                      className="mt-1 px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: (STATUS_COLORS[order.status] ?? '#6b7280') + '18',
                      }}
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
    </View>
  );
}
