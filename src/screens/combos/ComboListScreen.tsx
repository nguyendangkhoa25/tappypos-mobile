import { useState, useCallback, memo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useAlertStore } from '../../store/alertStore';
import { useToastStore } from '../../store/toastStore';
import { useErrorAlert } from '../../hooks/useErrorAlert';
import {
  comboApi,
  type ComboData,
  type ComboRankingItem,
  type ComboTrendPoint,
} from '../../services/api';
import { useTypography } from '../../hooks/useTypography';
import { ErrorState } from '../../components/ErrorState';
import { ScreenSkeleton } from '../../components/ScreenSkeleton';
import { TrendChart } from '../../components/TrendChart';
import { formatVnd } from '../../utils/format';
import type { ChartGranularity } from '../../components/BarChart';
import type { ComboScreenProps } from '../../types/navigation';

// ── Period helpers ─────────────────────────────────────────────────────────────

type PeriodKey = '30d' | '90d' | '180d' | '365d';

function getPeriod(key: PeriodKey): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  const days = key === '30d' ? 30 : key === '90d' ? 90 : key === '180d' ? 180 : 365;
  from.setDate(from.getDate() - days);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { from: fmt(from), to: fmt(to) };
}

function granularityForPeriod(key: PeriodKey): ChartGranularity {
  return key === '30d' ? 'day' : key === '90d' ? 'week' : 'month';
}

// ── Analytics section ──────────────────────────────────────────────────────────

type ChartMetric = 'revenue' | 'qty';

function KpiCard({
  label,
  value,
  color = 'indigo',
}: {
  label: string;
  value: string;
  color?: 'indigo' | 'emerald' | 'amber' | 'default';
}) {
  const typo = useTypography();
  const bg =
    color === 'indigo'
      ? 'bg-indigo-50 dark:bg-indigo-900/20'
      : color === 'emerald'
      ? 'bg-emerald-50 dark:bg-emerald-900/20'
      : color === 'amber'
      ? 'bg-amber-50 dark:bg-amber-900/20'
      : 'bg-gray-50 dark:bg-gray-700/50';
  const text =
    color === 'indigo'
      ? 'text-indigo-600 dark:text-indigo-400'
      : color === 'emerald'
      ? 'text-emerald-600 dark:text-emerald-400'
      : color === 'amber'
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-gray-800 dark:text-gray-200';
  return (
    <View className={`flex-1 ${bg} rounded-xl p-2.5 items-center`}>
      <Text className={`${typo.labelBold} ${text}`} numberOfLines={1}>
        {value}
      </Text>
      <Text className={`${typo.captionBold} text-gray-500 dark:text-gray-400 mt-0.5 text-center`}>
        {label}
      </Text>
    </View>
  );
}

function AnalyticsSection() {
  const { t } = useTranslation();
  const typo = useTypography();

  const [periodKey, setPeriodKey] = useState<PeriodKey>('90d');
  const [chartMetric, setChartMetric] = useState<ChartMetric>('revenue');
  const [chartGranularity, setChartGranularity] = useState<ChartGranularity>(() =>
    granularityForPeriod('90d'),
  );

  const period = getPeriod(periodKey);

  const { data: analytics, isFetching } = useQuery({
    queryKey: ['combo-analytics', period.from, period.to, chartGranularity],
    queryFn: () =>
      comboApi
        .analytics({ from: period.from, to: period.to, granularity: chartGranularity })
        .then((r) => r.data.data),
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
  });

  const handlePeriodChange = (key: PeriodKey) => {
    setPeriodKey(key);
    setChartGranularity(granularityForPeriod(key));
  };

  const summary = analytics?.summary;
  const ranking: ComboRankingItem[] = analytics?.ranking ?? [];
  const trend: ComboTrendPoint[] = analytics?.trend ?? [];

  const chartData = trend.map((p) => ({
    label: p.label,
    value: chartMetric === 'revenue' ? p.revenue : p.qtySold,
  }));

  const PERIOD_LABELS: Record<PeriodKey, string> = {
    '30d': '30 ngày',
    '90d': '3 tháng',
    '180d': '6 tháng',
    '365d': '1 năm',
  };

  return (
    <View className="mx-4 mb-3">
      {/* ── Summary KPIs ── */}
      <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 mb-3">
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center gap-2">
            <MaterialCommunityIcons name="chart-bar" size={18} color="#4f46e5" />
            <Text className={`${typo.labelBold} text-gray-900 dark:text-white`}>
              {t('combos.analytics.title')}
            </Text>
          </View>
          {isFetching && <ActivityIndicator size="small" color="#4f46e5" />}
        </View>

        {/* Period chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, marginBottom: 12 }}
        >
          {(Object.keys(PERIOD_LABELS) as PeriodKey[]).map((key) => {
            const active = periodKey === key;
            return (
              <TouchableOpacity
                key={key}
                onPress={() => handlePeriodChange(key)}
                className={`px-3 py-1 rounded-full border ${
                  active
                    ? 'bg-indigo-600 border-indigo-600'
                    : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                }`}
              >
                <Text
                  className={`${typo.captionBold} ${
                    active ? 'text-white' : 'text-gray-500 dark:text-gray-300'
                  }`}
                >
                  {PERIOD_LABELS[key]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* KPI row */}
        <View className="flex-row gap-2">
          <KpiCard
            label={t('combos.analytics.totalSold')}
            value={summary ? String(summary.totalSold) : '–'}
            color="indigo"
          />
          <KpiCard
            label={t('combos.analytics.totalRevenue')}
            value={summary ? formatVnd(summary.totalRevenue) : '–'}
            color="emerald"
          />
          <KpiCard
            label={t('combos.analytics.activeCount')}
            value={summary ? String(summary.activeCount) : '–'}
            color="amber"
          />
          <KpiCard
            label={t('combos.analytics.avgOrderValue')}
            value={summary ? formatVnd(summary.avgOrderValue) : '–'}
            color="default"
          />
        </View>
      </View>

      {/* ── Trend chart ── */}
      {chartData.length > 0 && (
        <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 mb-3">
          <View className="flex-row items-center gap-2 mb-3">
            <MaterialCommunityIcons name="chart-line" size={18} color="#4f46e5" />
            <Text className={`${typo.labelBold} text-gray-900 dark:text-white flex-1`}>
              {t('combos.analytics.trendTitle')}
            </Text>
            {/* Metric toggle */}
            <View className="flex-row gap-1">
              {(['revenue', 'qty'] as ChartMetric[]).map((m) => {
                const active = chartMetric === m;
                return (
                  <TouchableOpacity
                    key={m}
                    onPress={() => setChartMetric(m)}
                    className={`px-2.5 py-1 rounded-full border ${
                      active
                        ? 'bg-indigo-600 border-indigo-600'
                        : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                    }`}
                  >
                    <Text
                      className={`${typo.captionBold} ${
                        active ? 'text-white' : 'text-gray-500 dark:text-gray-300'
                      }`}
                    >
                      {m === 'revenue' ? t('combos.analytics.revenue') : t('combos.analytics.qty')}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
          <TrendChart
            data={chartData}
            color="#4f46e5"
            granularity={chartGranularity}
            allowedGranularities={['day', 'week', 'month']}
            onGranularityChange={setChartGranularity}
          />
        </View>
      )}

      {/* ── Ranking ── */}
      {ranking.length > 0 && (
        <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 mb-3">
          <View className="flex-row items-center gap-2 mb-3">
            <MaterialCommunityIcons name="trophy-outline" size={18} color="#4f46e5" />
            <Text className={`${typo.labelBold} text-gray-900 dark:text-white`}>
              {t('combos.analytics.rankingTitle')}
            </Text>
          </View>
          <View style={{ gap: 10 }}>
            {ranking.map((item, index) => (
              <View key={item.comboId} className="flex-row items-center gap-3">
                {/* Rank badge */}
                <View
                  className={`w-7 h-7 rounded-full items-center justify-center ${
                    index === 0
                      ? 'bg-amber-100 dark:bg-amber-900/30'
                      : index === 1
                      ? 'bg-gray-100 dark:bg-gray-700'
                      : 'bg-gray-50 dark:bg-gray-800'
                  }`}
                >
                  <Text
                    className={`${typo.captionBold} ${
                      index === 0
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {index + 1}
                  </Text>
                </View>
                {/* Name + metrics */}
                <View className="flex-1">
                  <Text
                    className={`${typo.label} text-gray-800 dark:text-gray-200`}
                    numberOfLines={1}
                  >
                    {item.comboName}
                  </Text>
                  <View className="flex-row gap-3 mt-0.5">
                    <Text className={`${typo.caption} text-gray-500 dark:text-gray-400`}>
                      {t('combos.analytics.rankingQty', { count: item.qtySold })}
                    </Text>
                    <Text className={`${typo.caption} text-indigo-600 dark:text-indigo-400`}>
                      {formatVnd(item.revenue)}
                    </Text>
                  </View>
                </View>
                {/* Order count badge */}
                <View className="bg-indigo-50 dark:bg-indigo-900/20 px-2 py-0.5 rounded-full">
                  <Text className={`${typo.captionBold} text-indigo-600 dark:text-indigo-400`}>
                    {t('combos.analytics.rankingOrders', { count: item.orderCount })}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Empty state for analytics */}
      {!isFetching && summary && summary.totalSold === 0 && (
        <View className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 mb-3 items-center">
          <MaterialCommunityIcons name="chart-bar" size={40} color="#d1d5db" />
          <Text className={`${typo.body} text-gray-400 dark:text-gray-500 mt-3 text-center`}>
            {t('combos.analytics.noData')}
          </Text>
        </View>
      )}
    </View>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────────

export function ComboListScreen({ navigation }: ComboScreenProps<'ComboList'>) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const typo = useTypography();
  const qc = useQueryClient();
  const { show: showAlert } = useAlertStore();
  const { show: showToast } = useToastStore();
  const showErrorAlert = useErrorAlert();
  const [showActive, setShowActive] = useState<boolean | undefined>(true);
  const [search, setSearch] = useState('');
  const [analyticsExpanded, setAnalyticsExpanded] = useState(false);

  const [isManualRefreshing, setIsManualRefreshing] = useState(false);

  // Always load all combos — filter client-side so counts are accurate across all chips
  const { data: allCombos = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['combos'],
    queryFn: () => comboApi.list(undefined).then((r) => r.data.data),
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
  });

  const onRefresh = useCallback(async () => {
    setIsManualRefreshing(true);
    await refetch();
    setIsManualRefreshing(false);
  }, [refetch]);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => comboApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['combos'] });
      showToast(t('combos.deleteSuccess'));
    },
    onError: showErrorAlert,
  });

  const toggleMutation = useMutation({
    mutationFn: (combo: ComboData) => comboApi.update(combo.id, { active: !combo.active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['combos'] }),
    onError: showErrorAlert,
  });

  const handleDelete = (combo: ComboData) => {
    showAlert(t('combos.deleteTitle'), t('combos.deleteMsg'), [
      { label: t('common.cancel'), style: 'cancel' },
      { label: t('combos.deleteConfirm'), style: 'destructive', onPress: () => deleteMutation.mutate(combo.id) },
    ]);
  };

  const filters: { active: boolean | undefined; labelKey: string }[] = [
    { active: undefined, labelKey: 'filterAll' },
    { active: true,      labelKey: 'filterActive' },
    { active: false,     labelKey: 'filterHidden' },
  ];

  // Search-filtered full list — counts derived from this (cross-count: respects search, not active/hidden)
  const searchFiltered = search.trim()
    ? allCombos.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.description ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : allCombos;

  const countAll    = searchFiltered.length;
  const countActive = searchFiltered.filter((c) =>  c.active).length;
  const countHidden = searchFiltered.filter((c) => !c.active).length;

  // Apply active/hidden chip filter for the actual list
  const displayedCombos =
    showActive === undefined ? searchFiltered :
    showActive               ? searchFiltered.filter((c) =>  c.active) :
                               searchFiltered.filter((c) => !c.active);

  const chipCounts: Record<string, number> = {
    'undefined': countAll,
    'true':      countActive,
    'false':     countHidden,
  };

  const savings = (combo: ComboData) => combo.totalIndividualPrice - combo.price;

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <View
        className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4"
        style={{ paddingTop: insets.top + 12, paddingBottom: 0 }}
      >
        <View className="flex-row items-center justify-between mb-0.5">
          <View className="flex-row items-center flex-1">
            <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} className="mr-3">
              <MaterialCommunityIcons name="chevron-left" size={26} color="#4f46e5" />
            </TouchableOpacity>
            <Text className={`${typo.heading} text-gray-900 dark:text-white flex-1`}>{t('combos.title')}</Text>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate('ComboEdit', {})}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons name="plus" size={24} color="#4f46e5" />
          </TouchableOpacity>
        </View>
        <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 mb-3 mt-0.5`}>{t('combos.hint')}</Text>
        {/* Search */}
        <View className="flex-row items-center bg-gray-100 dark:bg-gray-700 rounded-xl px-3 py-2.5 mb-3">
          <MaterialCommunityIcons name="magnify" size={20} color="#9ca3af" />
          <TextInput
            className={`flex-1 ml-2 ${typo.inputSize} text-gray-800 dark:text-gray-100`}
            placeholder={t('combos.searchPlaceholder')}
            placeholderTextColor="#9ca3af"
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialCommunityIcons name="close-circle" size={18} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>
        <View className="flex-row gap-2 pb-3">
          {filters.map((f) => {
            const active = showActive === f.active;
            const count  = chipCounts[String(f.active)] ?? 0;
            return (
              <TouchableOpacity
                key={String(f.active)}
                onPress={() => setShowActive(f.active)}
                className={`flex-row items-center gap-1.5 px-3.5 py-1.5 rounded-full border ${active ? 'bg-indigo-600 border-indigo-600' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600'}`}
              >
                <Text className={`${typo.caption} font-medium ${active ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                  {t(`combos.${f.labelKey}`)}
                </Text>
                {allCombos.length > 0 && (
                  <View className={`rounded-full px-1.5 py-0.5 min-w-[18px] items-center ${active ? 'bg-white/25' : 'bg-gray-100 dark:bg-gray-700'}`}>
                    <Text className={`${typo.captionBold} ${active ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`}>{count}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {isError ? (
        <ErrorState onRetry={refetch} />
      ) : isLoading ? (
        <ScreenSkeleton count={4} cardHeight={110} />
      ) : (
        <FlatList
          showsVerticalScrollIndicator={false}
          data={displayedCombos}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ padding: 4, paddingTop: 16, paddingBottom: insets.bottom + 24 }}
          refreshing={isManualRefreshing}
          onRefresh={onRefresh}
          ListHeaderComponent={
            <>
              {/* ── Analytics collapsible header ── */}
              <View className="mx-4 mb-3">
                <TouchableOpacity
                  onPress={() => setAnalyticsExpanded((v) => !v)}
                  activeOpacity={0.7}
                  className="bg-white dark:bg-gray-800 rounded-2xl px-4 py-3.5 border border-gray-100 dark:border-gray-700 flex-row items-center justify-between"
                >
                  <View className="flex-row items-center gap-2">
                    <MaterialCommunityIcons name="chart-bar" size={18} color="#4f46e5" />
                    <Text className={`${typo.labelBold} text-gray-800 dark:text-gray-200`}>
                      {t('combos.analytics.toggleLabel')}
                    </Text>
                  </View>
                  <MaterialCommunityIcons
                    name={analyticsExpanded ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color="#9ca3af"
                  />
                </TouchableOpacity>
              </View>

              {analyticsExpanded && <AnalyticsSection />}

              {/* ── Combo list empty state ── */}
              {displayedCombos.length === 0 && (
                <View className="flex-1 items-center justify-center px-8 pt-16">
                  <Text style={{ fontSize: typo.displaySize }}>🍱</Text>
                  <Text className={`${typo.body} text-gray-400 mt-4 text-center`}>
                    {search.trim() ? t('combos.noResults') : t('combos.empty')}
                  </Text>
                  {!search.trim() && (
                    <>
                      <Text className={`${typo.caption} text-gray-400 mt-1 text-center`}>{t('combos.emptyHint')}</Text>
                      <TouchableOpacity
                        onPress={() => navigation.navigate('ComboEdit', {})}
                        className="mt-6 bg-indigo-600 px-6 py-3 rounded-2xl"
                      >
                        <Text className={`${typo.label} text-white`}>{t('combos.addBtn')}</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              )}
            </>
          }
          renderItem={({ item }) => {
            const saving = savings(item);
            return (
              <View className={`mx-4 mb-2.5 bg-white dark:bg-gray-800 rounded-2xl p-4 ${!item.active ? 'opacity-60' : ''}`}>
                <View className="flex-row items-start justify-between mb-2">
                  <View className="flex-1 mr-2">
                    <Text className={`${typo.labelBold} text-gray-900 dark:text-white`}>{item.name}</Text>
                    {item.description ? (
                      <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 mt-0.5`}>{item.description}</Text>
                    ) : null}
                  </View>
                  <View className="flex-row gap-2 items-center">
                    <TouchableOpacity
                      onPress={() => navigation.navigate('ComboEdit', { comboId: item.id })}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <MaterialCommunityIcons name="pencil-outline" size={20} color="#6b7280" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDelete(item)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <MaterialCommunityIcons name="trash-can-outline" size={20} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>
                <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 mb-2`} numberOfLines={1}>
                  {item.items.map((i) => i.productName).join(' · ')}
                </Text>
                <View className="flex-row items-center justify-between">
                  <Text className={`${typo.labelBold} text-indigo-600`}>{formatVnd(item.price)}</Text>
                  {saving > 0 && (
                    <View className="bg-indigo-50 dark:bg-indigo-900/20 px-2.5 py-1 rounded-full">
                      <Text className={`${typo.captionBold} text-indigo-700 dark:text-indigo-400`}>
                        {t('combos.savings', { amount: formatVnd(saving) })}
                      </Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity
                  onPress={() => toggleMutation.mutate(item)}
                  className="mt-3 border border-gray-200 dark:border-gray-600 rounded-xl py-2 items-center"
                >
                  <Text className={`${typo.caption} text-gray-600 dark:text-gray-400`}>
                    {item.active ? t('combos.filterHidden') : t('combos.filterActive')}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}
