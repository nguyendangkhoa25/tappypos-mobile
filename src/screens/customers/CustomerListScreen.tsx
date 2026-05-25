import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ScrollView,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { customerApi, type CustomerData } from '../../services/api';
import { AvatarImage } from '../../components/AvatarImage';
import { PAGE_SIZE } from '../../utils/constants';
import { formatVnd } from '../../utils/format';
import { useTypography } from '../../hooks/useTypography';
import { Skeleton } from '../../components/Skeleton';
import { TrendChart } from '../../components/TrendChart';
import { ErrorState } from '../../components/ErrorState';
import { ScreenSkeleton } from '../../components/ScreenSkeleton';
import type { ChartGranularity } from '../../components/BarChart';
import type { HomeScreenProps } from '../../types/navigation';

// ── Birthday helpers ───────────────────────────────────────────────────────────

/** Day-of-month from a YYYY-MM-DD string; 0 if missing. */
function birthdayDay(dob: string | null | undefined): number {
  if (!dob) return 0;
  const d = new Date(dob);
  return isNaN(d.getTime()) ? 0 : d.getDate();
}

/**
 * Sort comparator: upcoming days (>= today) first in ascending order,
 * then already-passed days ascending.
 */
function compareBirthdayDays(a: CustomerData, b: CustomerData, todayDay: number): number {
  const da = birthdayDay(a.dateOfBirth ?? a.birthday);
  const db = birthdayDay(b.dateOfBirth ?? b.birthday);
  const aUpcoming = da >= todayDay;
  const bUpcoming = db >= todayDay;
  if (aUpcoming !== bUpcoming) return aUpcoming ? -1 : 1; // upcoming first
  return da - db;
}

type PeriodKey = '30d' | '90d' | '180d' | '365d';
type TrendMetric = 'revenue' | 'visits' | 'new';

const RANK_COLORS = ['#f59e0b', '#9ca3af', '#cd7f32'];

function getPeriodDates(key: PeriodKey) {
  const to = new Date();
  const from = new Date(to);
  const days = key === '30d' ? 30 : key === '90d' ? 90 : key === '180d' ? 180 : 365;
  from.setDate(from.getDate() - days);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { from: fmt(from), to: fmt(to) };
}

type Props = HomeScreenProps<'CustomerList'>;

function CustomerCard({
  item,
  index,
  onPress,
}: {
  item: CustomerData;
  index: number;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const typo = useTypography();
  return (
    <TouchableOpacity
      testID={`customer-row-${index}`}
      onPress={onPress}
      activeOpacity={0.75}
      className="bg-white dark:bg-gray-800 rounded-2xl p-4 mb-3 border border-gray-100 dark:border-gray-700"
    >
      <View className="flex-row items-center">
        <View className="mr-3">
          <AvatarImage uri={item.avatarUrl} name={item.name} size={44} color="#4f46e5" />
        </View>
        <View className="flex-1">
          <Text className={`${typo.labelBold} text-gray-900 dark:text-white`} numberOfLines={1}>
            {item.name}
          </Text>
          {!!item.phone && (
            <Text className={`${typo.caption} text-gray-500 dark:text-gray-400`}>{item.phone}</Text>
          )}
        </View>
        <MaterialCommunityIcons name="chevron-right" size={20} color="#d1d5db" />
      </View>

      <View className="flex-row mt-3 pt-3 border-t border-gray-50 dark:border-gray-700" style={{ gap: 16 }}>
        <View className="flex-row items-center">
          <MaterialCommunityIcons name="shopping-outline" size={14} color="#9ca3af" style={{ marginRight: 4 }} />
          <Text className={`${typo.caption} text-gray-500 dark:text-gray-400`}>
            {item.totalOrders} {t('customers.orders')}
          </Text>
        </View>
        <View className="flex-row items-center">
          <MaterialCommunityIcons name="star-outline" size={14} color="#9ca3af" style={{ marginRight: 4 }} />
          <Text className={`${typo.caption} text-gray-500 dark:text-gray-400`}>
            {item.points} {t('customers.points')}
          </Text>
        </View>
        {item.totalSpend > 0 && (
          <View className="flex-row items-center flex-1 justify-end">
            <Text className={`${typo.captionBold} text-indigo-600 dark:text-indigo-400`}>
              {formatVnd(item.totalSpend)}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

export function CustomerListScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const typo = useTypography();
  const { top, bottom } = useSafeAreaInsets();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [allItems, setAllItems] = useState<CustomerData[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const isLoadingMore = useRef(false);
  const canLoadMore = useRef(false);

  // ── Birthday this month ───────────────────────────────────────────────────────
  const todayDay = useMemo(() => new Date().getDate(), []);
  const { data: birthdayCustomers = [] } = useQuery({
    queryKey: ['customers', 'birthdays-this-month'],
    queryFn: () => customerApi.birthdaysThisMonth().then((r) => r.data.data),
    staleTime: 60 * 60_000, // 1 h — birthday list only changes when a customer's DOB is edited
  });
  const sortedBirthdays = useMemo(
    () => [...birthdayCustomers].sort((a, b) => compareBirthdayDays(a, b, todayDay)),
    [birthdayCustomers, todayDay],
  );

  // ── Analytics state ──────────────────────────────────────────────────────────
  const [analyticsOpen, setAnalyticsOpen] = useState(true);
  const [analyticsPeriod, setAnalyticsPeriod] = useState<PeriodKey>('30d');
  const [trendMetric, setTrendMetric] = useState<TrendMetric>('revenue');
  const [chartGranularity, setChartGranularity] = useState<ChartGranularity>('day');
  const [rankingAllTime, setRankingAllTime] = useState(true);

  const periodDates = useMemo(() => getPeriodDates(analyticsPeriod), [analyticsPeriod]);

  const { data: analyticsSummary, isLoading: summaryLoading } = useQuery({
    queryKey: ['customerAnalyticsSummary', periodDates.from, periodDates.to],
    queryFn: () => customerApi.analyticsSummary(periodDates.from, periodDates.to).then((r) => r.data.data),
    staleTime: 5 * 60_000,
    enabled: analyticsOpen,
  });

  const { data: trendData, isFetching: trendFetching } = useQuery({
    queryKey: ['customerAnalyticsTrend', periodDates.from, periodDates.to, chartGranularity, trendMetric],
    queryFn: () => customerApi.analyticsTrend(periodDates.from, periodDates.to, chartGranularity, trendMetric).then((r) => r.data.data),
    staleTime: 5 * 60_000,
    enabled: analyticsOpen,
    placeholderData: (prev) => prev,
  });

  const { data: rankingData, isLoading: rankingLoading } = useQuery({
    queryKey: ['customerAnalyticsRanking', rankingAllTime, periodDates.from, periodDates.to],
    queryFn: () => customerApi.analyticsRanking({
      limit: 5,
      allTime: rankingAllTime,
      from: periodDates.from,
      to: periodDates.to,
    }).then((r) => r.data.data),
    staleTime: 5 * 60_000,
    enabled: analyticsOpen,
    placeholderData: (prev) => prev,
  });

  const { isLoading, isError, isFetching, refetch, data } = useQuery({
    queryKey: ['customers', search, page],
    queryFn: async () => {
      const res = await customerApi.list({ search: search || undefined, page, size: PAGE_SIZE });
      const { content, totalPages } = res.data.data;
      if (page === 0) {
        setAllItems(content);
      } else {
        setAllItems((prev) => [...prev, ...content]);
      }
      return res.data.data;
    },
    staleTime: 120_000,
  });

  const hasMore = data ? page < data.totalPages - 1 : false;

  useEffect(() => {
    if (!isFetching) isLoadingMore.current = false;
  }, [isFetching]);

  useEffect(() => {
    canLoadMore.current = false;
    const t = setTimeout(() => { canLoadMore.current = true; }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const commitSearch = () => {
    setSearch(searchInput);
    setPage(0);
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setPage(0);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleEndReached = () => {
    if (!canLoadMore.current || !hasMore || isFetching || isLoadingMore.current) return;
    isLoadingMore.current = true;
    setPage((p) => p + 1);
  };

  const PERIODS: PeriodKey[] = ['30d', '90d', '180d', '365d'];
  const METRICS: { key: TrendMetric; label: string }[] = [
    { key: 'revenue', label: t('customers.analytics.metricRevenue') },
    { key: 'visits',  label: t('customers.analytics.metricVisits') },
    { key: 'new',     label: t('customers.analytics.metricNew') },
  ];

  const birthdaySection = sortedBirthdays.length > 0 ? (
    <View className="mb-3">
      {/* Section label */}
      <View className="flex-row items-center mb-2" style={{ gap: 6 }}>
        <Text className={typo.body}>🎂</Text>
        <Text className={`${typo.captionBold} text-rose-500 dark:text-rose-400 uppercase tracking-wide`}>
          {t('customers.birthdayThisMonth')}
        </Text>
        <View className="flex-1 h-px bg-rose-100 dark:bg-rose-900/40 ml-1" />
      </View>

      {/* Horizontal scroll cards */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 10, paddingRight: 4 }}
      >
        {sortedBirthdays.map((c) => {
          const day = birthdayDay(c.dateOfBirth ?? c.birthday);
          const isToday = day === todayDay;
          const hasPassed = day < todayDay;
          const daysUntil = isToday ? 0 : day - todayDay;

          return (
            <TouchableOpacity
              key={c.id}
              onPress={() => navigation.navigate('CustomerDetail', { customerId: c.id })}
              activeOpacity={0.8}
              className={`rounded-2xl p-3 border items-center ${
                isToday
                  ? 'bg-rose-50 dark:bg-rose-900/30 border-rose-200 dark:border-rose-700'
                  : hasPassed
                  ? 'bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-700'
                  : 'bg-white dark:bg-gray-800 border-indigo-100 dark:border-indigo-800'
              }`}
              style={{ width: 96 }}
            >
              {/* Avatar */}
              <View className="relative mb-2">
                <AvatarImage uri={c.avatarUrl} name={c.name} size={44} color={isToday ? '#f43f5e' : '#4f46e5'} />
                {/* Birthday emoji badge */}
                <View
                  className="absolute -bottom-1 -right-1 rounded-full items-center justify-center"
                  style={{ width: 20, height: 20, backgroundColor: isToday ? '#f43f5e' : hasPassed ? '#9ca3af' : '#4f46e5' }}
                >
                  <Text className={typo.caption}>{isToday ? '🎂' : '🎁'}</Text>
                </View>
              </View>

              {/* Name */}
              <Text
                className={`${typo.captionBold} text-center ${isToday ? 'text-rose-600 dark:text-rose-400' : 'text-gray-800 dark:text-gray-100'}`}
                numberOfLines={1}
              >
                {c.name}
              </Text>

              {/* Day label */}
              <Text
                className={`${typo.caption} text-center mt-0.5 ${
                  isToday
                    ? 'text-rose-500 dark:text-rose-400 font-semibold'
                    : hasPassed
                    ? 'text-gray-400'
                    : 'text-indigo-500 dark:text-indigo-400'
                }`}
              >
                {isToday
                  ? t('customers.birthdayToday')
                  : hasPassed
                  ? t('customers.birthdayDay', { day })
                  : t('customers.birthdayIn', { days: daysUntil })}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  ) : null;

  const analyticsHeader = (
    <View className="mb-2">
      {/* Birthday section */}
      {birthdaySection}

      {/* Toggle bar */}
      <TouchableOpacity
        testID="customer-analytics-toggle"
        onPress={() => setAnalyticsOpen((o) => !o)}
        className="flex-row items-center justify-between bg-white dark:bg-gray-800 rounded-2xl px-4 py-3 border border-gray-100 dark:border-gray-700 mb-3"
        activeOpacity={0.8}
      >
        <View className="flex-row items-center" style={{ gap: 8 }}>
          <MaterialCommunityIcons name="chart-bar" size={16} color="#4f46e5" />
          <Text className={`${typo.labelBold} text-gray-800 dark:text-gray-100`}>
            {t('customers.analytics.title')}
          </Text>
        </View>
        <MaterialCommunityIcons
          name={analyticsOpen ? 'chevron-up' : 'chevron-down'}
          size={20}
          color="#9ca3af"
        />
      </TouchableOpacity>

      {analyticsOpen && (
        <View style={{ gap: 12 }}>
          {/* Period selector */}
          <View className="flex-row" style={{ gap: 8 }}>
            {PERIODS.map((p) => (
              <TouchableOpacity
                key={p}
                onPress={() => setAnalyticsPeriod(p)}
                className={`flex-1 py-1.5 rounded-full border items-center ${
                  analyticsPeriod === p
                    ? 'bg-indigo-600 border-indigo-600'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600'
                }`}
              >
                <Text className={`${typo.captionBold} ${analyticsPeriod === p ? 'text-white' : 'text-gray-600 dark:text-gray-300'}`}>
                  {t(`customers.analytics.period${p}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* 4 summary tiles */}
          {summaryLoading ? (
            <View className="flex-row flex-wrap" style={{ gap: 10 }}>
              {[0, 1, 2, 3].map((i) => <Skeleton key={i} height={80} style={{ flex: 1, minWidth: '45%' }} borderRadius={16} />)}
            </View>
          ) : (
            <View className="flex-row flex-wrap" style={{ gap: 10 }}>
              {([
                { key: 'totalCustomers',  value: analyticsSummary?.totalCustomers,  icon: 'account-group-outline' as const, color: '#4f46e5', bg: '#e0e7ff' },
                { key: 'activeCustomers', value: analyticsSummary?.activeCustomers, icon: 'account-check-outline' as const, color: '#059669', bg: '#d1fae5' },
                { key: 'newCustomers',    value: analyticsSummary?.newCustomers,    icon: 'account-plus-outline' as const,  color: '#0891b2', bg: '#cffafe' },
                { key: 'totalRevenue',    value: analyticsSummary?.totalRevenue,    icon: 'cash-multiple' as const,          color: '#d97706', bg: '#fef3c7' },
              ] as const).map(({ key, value, icon, color, bg }) => (
                <View key={key} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 px-3 py-3" style={{ minWidth: '45%', flex: 1 }}>
                  <View className="w-8 h-8 rounded-full items-center justify-center mb-2" style={{ backgroundColor: bg }}>
                    <MaterialCommunityIcons name={icon} size={16} color={color} />
                  </View>
                  <Text className={`${typo.label} font-bold text-gray-900 dark:text-white`} numberOfLines={1}>
                    {value == null ? '—' : key === 'totalRevenue' ? formatVnd(value as number) : String(value)}
                  </Text>
                  <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 mt-0.5`}>{t(`customers.analytics.${key}`)}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Trend chart */}
          <View className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
            {/* Metric toggle */}
            <View className="flex-row mb-3" style={{ gap: 8 }}>
              {METRICS.map((m) => (
                <TouchableOpacity
                  key={m.key}
                  onPress={() => setTrendMetric(m.key)}
                  className={`px-3 py-1 rounded-full border ${
                    trendMetric === m.key
                      ? 'bg-indigo-600 border-indigo-600'
                      : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                  }`}
                >
                  <Text className={`${typo.captionBold} ${trendMetric === m.key ? 'text-white' : 'text-gray-600 dark:text-gray-300'}`}>
                    {m.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ opacity: trendFetching ? 0.55 : 1 }}>
              <TrendChart
                data={trendData ?? []}
                color="#4f46e5"
                granularity={chartGranularity}
                allowedGranularities={['day', 'week', 'month', 'year']}
                onGranularityChange={setChartGranularity}
              />
            </View>
          </View>

          {/* Ranking */}
          <View className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
            {/* Header row */}
            <View className="flex-row items-center justify-between px-4 pt-3 pb-2">
              <View className="flex-row items-center" style={{ gap: 6 }}>
                <MaterialCommunityIcons name="trophy-outline" size={15} color="#f59e0b" />
                <Text className={`${typo.captionBold} text-gray-500 dark:text-gray-400 uppercase tracking-wide`}>
                  {t('customers.analytics.rankingTitle')}
                </Text>
              </View>
              {/* All-time / Period toggle */}
              <View className="flex-row bg-gray-100 dark:bg-gray-700 rounded-full p-0.5" style={{ gap: 2 }}>
                {([true, false] as const).map((isAllTime) => (
                  <TouchableOpacity
                    key={String(isAllTime)}
                    onPress={() => setRankingAllTime(isAllTime)}
                    className={`px-3 py-1 rounded-full ${rankingAllTime === isAllTime ? 'bg-white dark:bg-gray-600 shadow-sm' : ''}`}
                  >
                    <Text className={`${typo.captionBold} ${rankingAllTime === isAllTime ? 'text-gray-800 dark:text-white' : 'text-gray-400'}`}>
                      {isAllTime ? t('customers.analytics.allTime') : t('customers.analytics.byPeriod')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Rows */}
            {rankingLoading ? (
              <View className="px-4 pb-3" style={{ gap: 8 }}>
                {[0, 1, 2].map((i) => <Skeleton key={i} height={44} borderRadius={10} />)}
              </View>
            ) : !rankingData?.length ? (
              <View className="py-8 items-center">
                <Text className={`${typo.caption} text-gray-400`}>{t('customers.noCustomers')}</Text>
              </View>
            ) : (
              rankingData.map((c, i) => (
                <TouchableOpacity
                  key={c.customerId ?? c.name}
                  onPress={c.customerId ? () => navigation.navigate('CustomerDetail', { customerId: c.customerId! }) : undefined}
                  className={`flex-row items-center px-4 py-3 ${i < rankingData.length - 1 ? 'border-b border-gray-50 dark:border-gray-700' : ''}`}
                  activeOpacity={c.customerId ? 0.7 : 1}
                >
                  {/* Rank badge */}
                  <View
                    className="w-7 h-7 rounded-full items-center justify-center mr-3"
                    style={{ backgroundColor: (RANK_COLORS[i] ?? '#e5e7eb') + '30' }}
                  >
                    <Text className={typo.captionBold} style={{ color: RANK_COLORS[i] ?? '#6b7280', fontWeight: '800' }}>
                      {i + 1}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className={`${typo.label} text-gray-800 dark:text-gray-100`} numberOfLines={1}>{c.name}</Text>
                    <Text className={`${typo.caption} text-gray-400`}>{c.orderCount} {t('customers.analytics.ordersUnit')}</Text>
                  </View>
                  <Text className={`${typo.labelBold} text-indigo-600 dark:text-indigo-400`}>{formatVnd(c.totalSpend)}</Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>
      )}
    </View>
  );

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <View
        className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4"
        style={{ paddingTop: top + 12, paddingBottom: 12 }}
      >
        <View className="flex-row items-center mb-0.5">
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} className="mr-2">
            <MaterialCommunityIcons name="chevron-left" size={26} color="#4f46e5" />
          </TouchableOpacity>
          <Text className={`${typo.heading} text-gray-900 dark:text-white flex-1`}>{t('customers.title')}</Text>
          <TouchableOpacity onPress={() => navigation.navigate('CustomerForm', {})} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialCommunityIcons name="plus" size={24} color="#4f46e5" />
          </TouchableOpacity>
        </View>
        <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 mb-3 mt-0.5`}>{t('customers.hint')}</Text>

        {/* Search */}
        <View className="flex-row items-center gap-2">
          <View className="flex-1 flex-row items-center bg-gray-100 dark:bg-gray-700 rounded-xl px-3 py-2.5">
            <MaterialCommunityIcons name="magnify" size={20} color="#9ca3af" />
            <TextInput
              testID="customer-search-input"
              className={`flex-1 ml-2 ${typo.inputSize} text-gray-800 dark:text-white`}
              placeholder={t('customers.searchPlaceholder')}
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
            <Text className={`${typo.label} text-white`}>{t('customers.searchButton')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {isError ? (
        <ErrorState onRetry={() => { setPage(0); refetch(); }} />
      ) : isLoading && page === 0 ? (
        <ScreenSkeleton count={4} cardHeight={88} />
      ) : (
        <FlatList
          showsVerticalScrollIndicator={false}
          data={allItems}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 4, paddingBottom: bottom + 80 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#059669" />
          }
          ListHeaderComponent={analyticsHeader}
          renderItem={({ item, index }) => (
            <CustomerCard
              item={item}
              index={index}
              onPress={() => navigation.navigate('CustomerDetail', { customerId: item.id })}
            />
          )}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={
            !isLoading ? (
              <View className="items-center py-16">
                <MaterialCommunityIcons name="account-group-outline" size={48} color="#d1d5db" />
                <Text className={`${typo.body} text-gray-400 mt-3`}>{t('customers.noCustomers')}</Text>
                <Text className={`${typo.caption} text-gray-400 mt-1`}>{t('customers.noCustomersHint')}</Text>
              </View>
            ) : null
          }
          ListFooterComponent={
            isFetching && page > 0 ? (
              <View className="py-4 items-center">
                <ActivityIndicator size="small" color="#4f46e5" />
              </View>
            ) : null
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        testID="customer-add-fab"
        onPress={() => navigation.navigate('CustomerForm', {})}
        activeOpacity={0.85}
        className="absolute right-5 w-14 h-14 bg-indigo-600 rounded-full items-center justify-center shadow-lg"
        style={{ bottom: bottom + 16, elevation: 6, shadowColor: '#4f46e5', shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } }}
      >
        <MaterialCommunityIcons name="plus" size={28} color="white" />
      </TouchableOpacity>
    </View>
  );
}
