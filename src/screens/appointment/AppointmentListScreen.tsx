import { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  appointmentApi,
  type AppointmentData,
  type AppointmentRankItem,
  type AppointmentTrendPoint,
} from '../../services/api';
import { useTypography } from '../../hooks/useTypography';
import { Skeleton } from '../../components/Skeleton';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { TrendChart } from '../../components/TrendChart';
import type { ChartGranularity } from '../../components/BarChart';
import type { MoreScreenProps } from '../../types/navigation';

type Props = MoreScreenProps<'AppointmentList'>;

// ── helpers ───────────────────────────────────────────────────────────────────

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatTime(timeStr: string): string {
  return timeStr.slice(0, 5);
}

function formatDisplayDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1 - day);
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function groupByHour(items: AppointmentData[]): Array<{ hour: string; data: AppointmentData[] }> {
  const map = new Map<string, AppointmentData[]>();
  for (const item of items) {
    const hour = item.scheduledStartTime.slice(0, 2) + ':00';
    if (!map.has(hour)) map.set(hour, []);
    map.get(hour)!.push(item);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([hour, data]) => ({ hour, data }));
}

type StatusStyle = { bg: string; text: string; label: string };

function useStatusStyle(status: AppointmentData['status'], t: ReturnType<typeof useTranslation>['t']): StatusStyle {
  const map: Record<AppointmentData['status'], StatusStyle> = {
    PENDING:    { bg: 'bg-amber-100',   text: 'text-amber-700',   label: t('appt.statusPending') },
    CONFIRMED:  { bg: 'bg-indigo-100',  text: 'text-indigo-700',  label: t('appt.statusConfirmed') },
    CHECKED_IN: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: t('appt.statusCheckedIn') },
    CANCELLED:  { bg: 'bg-gray-100',    text: 'text-gray-500',    label: t('appt.statusCancelled') },
    NO_SHOW:    { bg: 'bg-rose-100',    text: 'text-rose-600',    label: t('appt.statusNoShow') },
  };
  return map[status] ?? map.PENDING;
}

// ── Analytics helpers ─────────────────────────────────────────────────────────

type PeriodKey = '30d' | '90d' | '180d' | '365d';
type ChartMetric = 'all' | 'completed' | 'cancelled';
type RankingMetric = 'services' | 'employees';

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

// ── Sub-components ────────────────────────────────────────────────────────────

function KpiCard({ label, value, color = 'default' }: { label: string; value: string; color?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'default' }) {
  const typo = useTypography();
  const bg = color === 'indigo' ? 'bg-indigo-50 dark:bg-indigo-900/20'
    : color === 'emerald' ? 'bg-emerald-50 dark:bg-emerald-900/20'
    : color === 'amber' ? 'bg-amber-50 dark:bg-amber-900/20'
    : color === 'rose' ? 'bg-rose-50 dark:bg-rose-900/20'
    : 'bg-gray-50 dark:bg-gray-700/50';
  const textColor = color === 'indigo' ? 'text-indigo-600 dark:text-indigo-400'
    : color === 'emerald' ? 'text-emerald-600 dark:text-emerald-400'
    : color === 'amber' ? 'text-amber-600 dark:text-amber-400'
    : color === 'rose' ? 'text-rose-600 dark:text-rose-400'
    : 'text-gray-800 dark:text-gray-200';
  return (
    <View className={`flex-1 ${bg} rounded-xl p-2.5 items-center`}>
      <Text className={`${typo.labelBold} ${textColor}`} numberOfLines={1}>{value}</Text>
      <Text className={`${typo.captionBold} text-gray-500 dark:text-gray-400 mt-0.5 text-center`}>{label}</Text>
    </View>
  );
}

function AnalyticsSection() {
  const { t } = useTranslation();
  const typo = useTypography();

  const [periodKey, setPeriodKey] = useState<PeriodKey>('90d');
  const [chartMetric, setChartMetric] = useState<ChartMetric>('all');
  const [rankingMetric, setRankingMetric] = useState<RankingMetric>('services');
  const [chartGranularity, setChartGranularity] = useState<ChartGranularity>(() => granularityForPeriod('90d'));

  const period = getPeriod(periodKey);

  const { data: analytics, isFetching } = useQuery({
    queryKey: ['appointment-analytics', period.from, period.to, chartGranularity],
    queryFn: () =>
      appointmentApi.analytics({ from: period.from, to: period.to, granularity: chartGranularity })
        .then((r) => r.data.data),
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
  });

  const handlePeriodChange = (key: PeriodKey) => {
    setPeriodKey(key);
    setChartGranularity(granularityForPeriod(key));
  };

  const summary = analytics?.summary;
  const trend: AppointmentTrendPoint[] = analytics?.trend ?? [];
  const rankingServices: AppointmentRankItem[] = analytics?.rankingServices ?? [];
  const rankingEmployees: AppointmentRankItem[] = analytics?.rankingEmployees ?? [];

  const chartData = trend.map((p) => ({
    label: p.label,
    value: chartMetric === 'completed' ? p.completed : chartMetric === 'cancelled' ? p.cancelled : p.total,
  }));

  const chartColor = chartMetric === 'completed' ? '#059669'
    : chartMetric === 'cancelled' ? '#e11d48'
    : '#4f46e5';

  const PERIOD_LABELS: Record<PeriodKey, string> = {
    '30d': '30 ngày', '90d': '3 tháng', '180d': '6 tháng', '365d': '1 năm',
  };

  const activeRanking = rankingMetric === 'services' ? rankingServices : rankingEmployees;

  return (
    <View className="mx-4 mb-3">

      {/* ── KPI card ── */}
      <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 mb-3">
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center gap-2">
            <MaterialCommunityIcons name="calendar-clock" size={18} color="#4f46e5" />
            <Text className={`${typo.labelBold} text-gray-900 dark:text-white`}>
              {t('appt.analytics.title')}
            </Text>
          </View>
          {isFetching && <ActivityIndicator size="small" color="#4f46e5" />}
        </View>

        {/* Period chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 12 }}>
          {(Object.keys(PERIOD_LABELS) as PeriodKey[]).map((key) => {
            const active = periodKey === key;
            return (
              <TouchableOpacity key={key} onPress={() => handlePeriodChange(key)}
                className={`px-3 py-1 rounded-full border ${active ? 'bg-indigo-600 border-indigo-600' : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'}`}>
                <Text className={`${typo.captionBold} ${active ? 'text-white' : 'text-gray-500 dark:text-gray-300'}`}>
                  {PERIOD_LABELS[key]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Row 1: total + completion rate */}
        <View className="flex-row gap-2 mb-2">
          <KpiCard
            label={t('appt.analytics.total')}
            value={summary ? String(summary.total) : '–'}
            color="indigo"
          />
          <KpiCard
            label={t('appt.analytics.completionRate')}
            value={summary ? `${Math.round(summary.completionRate * 100)}%` : '–'}
            color="emerald"
          />
        </View>
        {/* Row 2: cancelled count + avg per day */}
        <View className="flex-row gap-2">
          <KpiCard
            label={t('appt.analytics.cancelledCount')}
            value={summary ? String(summary.cancelledCount) : '–'}
            color="rose"
          />
          <KpiCard
            label={t('appt.analytics.avgPerDay')}
            value={summary ? String(summary.avgPerDay) : '–'}
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
              {t('appt.analytics.trendTitle')}
            </Text>
            {/* Metric toggle */}
            <View className="flex-row gap-1">
              {(['all', 'completed', 'cancelled'] as ChartMetric[]).map((m) => {
                const active = chartMetric === m;
                const activeColor = m === 'completed' ? 'bg-emerald-600 border-emerald-600'
                  : m === 'cancelled' ? 'bg-rose-500 border-rose-500'
                  : 'bg-indigo-600 border-indigo-600';
                return (
                  <TouchableOpacity key={m} onPress={() => setChartMetric(m)}
                    className={`px-2.5 py-1 rounded-full border ${active ? activeColor : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'}`}>
                    <Text className={`${typo.captionBold} ${active ? 'text-white' : 'text-gray-500 dark:text-gray-300'}`}>
                      {t(`appt.analytics.${m}`)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
          <TrendChart
            data={chartData}
            color={chartColor}
            granularity={chartGranularity}
            allowedGranularities={['day', 'week', 'month']}
            onGranularityChange={setChartGranularity}
          />
        </View>
      )}

      {/* ── Ranking ── */}
      {(rankingServices.length > 0 || rankingEmployees.length > 0) && (
        <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 mb-3">
          <View className="flex-row items-center gap-2 mb-3">
            <MaterialCommunityIcons name="trophy-outline" size={18} color="#4f46e5" />
            <Text className={`${typo.labelBold} text-gray-900 dark:text-white flex-1`}>
              {t('appt.analytics.rankingTitle')}
            </Text>
            {/* Ranking toggle */}
            <View className="flex-row gap-1">
              {(['services', 'employees'] as RankingMetric[]).map((m) => {
                const active = rankingMetric === m;
                return (
                  <TouchableOpacity key={m} onPress={() => setRankingMetric(m)}
                    className={`px-2.5 py-1 rounded-full border ${active ? 'bg-indigo-600 border-indigo-600' : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'}`}>
                    <Text className={`${typo.captionBold} ${active ? 'text-white' : 'text-gray-500 dark:text-gray-300'}`}>
                      {m === 'services' ? t('appt.analytics.rankingServices') : t('appt.analytics.rankingEmployees')}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={{ gap: 10 }}>
            {activeRanking.map((item, index) => (
              <View key={`${item.name}-${index}`} className="flex-row items-center gap-3">
                <View className={`w-7 h-7 rounded-full items-center justify-center ${index === 0 ? 'bg-amber-100 dark:bg-amber-900/30' : index === 1 ? 'bg-gray-100 dark:bg-gray-700' : 'bg-gray-50 dark:bg-gray-800'}`}>
                  <Text className={`${typo.captionBold} ${index === 0 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-500 dark:text-gray-400'}`}>
                    {index + 1}
                  </Text>
                </View>
                <Text className={`${typo.label} text-gray-800 dark:text-gray-200 flex-1`} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text className={`${typo.labelBold} text-indigo-600 dark:text-indigo-400`}>
                  {t('appt.analytics.rankingAppts', { count: item.count })}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Empty state */}
      {!isFetching && summary && summary.total === 0 && (
        <View className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 mb-3 items-center">
          <MaterialCommunityIcons name="calendar-blank-outline" size={40} color="#d1d5db" />
          <Text className={`${typo.body} text-gray-400 dark:text-gray-500 mt-3 text-center`}>
            {t('appt.analytics.noData')}
          </Text>
        </View>
      )}
    </View>
  );
}

function AppointmentCard({
  item,
  index,
  onPress,
}: {
  item: AppointmentData;
  index: number;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const typo = useTypography();
  const s = useStatusStyle(item.status, t);
  const isDone = item.status === 'CANCELLED' || item.status === 'NO_SHOW' || item.status === 'CHECKED_IN';

  return (
    <TouchableOpacity
      testID={`appointment-card-${index}`}
      onPress={onPress}
      className={`bg-white dark:bg-gray-800 rounded-2xl p-4 mb-3 mx-4 shadow-sm border border-gray-100 dark:border-gray-700 ${isDone ? 'opacity-60' : ''}`}
      activeOpacity={0.7}
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1 mr-2">
          <Text className={`${typo.labelBold} text-gray-900 dark:text-white`} numberOfLines={1}>
            {item.customerName}
          </Text>
          {item.customerPhone ? (
            <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 mt-0.5`}>{item.customerPhone}</Text>
          ) : null}
        </View>
        <View className={`px-2.5 py-1 rounded-full ${s.bg}`}>
          <Text className={`${typo.captionBold} ${s.text}`}>{s.label}</Text>
        </View>
      </View>

      <View className="flex-row items-center gap-3 mt-2.5">
        <View className="flex-row items-center gap-1">
          <MaterialCommunityIcons name="clock-outline" size={13} color="#9ca3af" />
          <Text className={`${typo.caption} text-gray-500 dark:text-gray-400`}>
            {formatTime(item.scheduledStartTime)}
          </Text>
        </View>
        {item.durationMinutes > 0 && (
          <View className="flex-row items-center gap-1">
            <MaterialCommunityIcons name="timer-outline" size={13} color="#9ca3af" />
            <Text className={`${typo.caption} text-gray-500 dark:text-gray-400`}>{item.durationMinutes}p</Text>
          </View>
        )}
        {item.services.length > 0 && (
          <View className="flex-row items-center gap-1">
            <MaterialCommunityIcons name="clipboard-list-outline" size={13} color="#9ca3af" />
            <Text className={`${typo.caption} text-gray-500 dark:text-gray-400`}>{item.services.length} dịch vụ</Text>
          </View>
        )}
      </View>

      {item.note ? (
        <Text className={`${typo.caption} text-gray-400 dark:text-gray-500 mt-1.5 italic`} numberOfLines={1}>
          {item.note}
        </Text>
      ) : null}
    </TouchableOpacity>
  );
}

function LoadingSkeleton() {
  return (
    <View className="px-4 mt-2">
      {[1, 2, 3, 4].map((k) => (
        <Skeleton key={k} width="100%" height={90} borderRadius={16} style={{ marginBottom: 12 }} />
      ))}
    </View>
  );
}

// ── Week strip ────────────────────────────────────────────────────────────────

function WeekStrip({
  selectedDate,
  onSelectDate,
}: {
  selectedDate: Date;
  onSelectDate: (d: Date) => void;
}) {
  const { t } = useTranslation();
  const typo = useTypography();

  const weekdays = t('appt.weekdays', { returnObjects: true }) as string[];

  const monday = useMemo(() => getMondayOfWeek(selectedDate), [
    // eslint-disable-next-line react-hooks/exhaustive-deps
    getMondayOfWeek(selectedDate).toISOString(),
  ]);

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(monday, i)),
    [monday],
  );

  const from = toDateStr(weekDays[0]);
  const to   = toDateStr(weekDays[6]);

  const { data: summary } = useQuery({
    queryKey: ['appointments', 'week-summary', from, to],
    queryFn: async () => {
      const res = await appointmentApi.weekSummary(from, to);
      return res.data.data?.countByDate ?? {};
    },
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });

  const selectedStr = toDateStr(selectedDate);
  const todayStr    = toDateStr(new Date());

  return (
    <View className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-2 py-2">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 4 }}>
        {weekDays.map((day, idx) => {
          const dateStr = toDateStr(day);
          const isSelected = dateStr === selectedStr;
          const isToday    = dateStr === todayStr;
          const count      = summary?.[dateStr] ?? 0;
          const dayLabel   = weekdays[idx] ?? String(idx);

          return (
            <TouchableOpacity
              key={dateStr}
              onPress={() => onSelectDate(day)}
              activeOpacity={0.7}
              className={`items-center justify-center w-11 rounded-xl py-1.5 ${
                isSelected
                  ? 'bg-indigo-600'
                  : isToday
                  ? 'bg-indigo-50 dark:bg-indigo-900/30'
                  : 'bg-transparent'
              }`}
            >
              <Text
                className={`${typo.captionBold} uppercase ${
                  isSelected ? 'text-white' : isToday ? 'text-indigo-500' : 'text-gray-400 dark:text-gray-500'
                }`}
              >
                {dayLabel}
              </Text>
              <Text
                className={`${typo.labelBold} mt-0.5 ${
                  isSelected ? 'text-white' : isToday ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-800 dark:text-gray-200'
                }`}
              >
                {day.getDate()}
              </Text>
              {count > 0 ? (
                <View
                  className={`mt-1 w-5 h-5 rounded-full items-center justify-center ${
                    isSelected ? 'bg-white/30' : 'bg-indigo-100 dark:bg-indigo-900/40'
                  }`}
                >
                  <Text
                    className={`text-[10px] font-bold ${
                      isSelected ? 'text-white' : 'text-indigo-600 dark:text-indigo-400'
                    }`}
                  >
                    {count > 9 ? '9+' : count}
                  </Text>
                </View>
              ) : (
                <View className="mt-1 w-5 h-5" />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export function AppointmentListScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const typo = useTypography();
  const insets = useSafeAreaInsets();

  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(today);
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const [analyticsExpanded, setAnalyticsExpanded] = useState(false);
  const dateStr = toDateStr(selectedDate);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['appointments', dateStr],
    queryFn: async () => {
      const res = await appointmentApi.list(dateStr);
      return res.data.data;
    },
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });

  const items: AppointmentData[] = data?.content ?? [];
  const groups = useMemo(() => groupByHour(items), [items]);

  const isToday    = toDateStr(today) === dateStr;
  const isTomorrow = toDateStr(new Date(today.getTime() + 86400000)) === dateStr;

  const shiftDay = useCallback((delta: number) => {
    setSelectedDate((d) => {
      const next = new Date(d);
      next.setDate(next.getDate() + delta);
      return next;
    });
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsManualRefreshing(true);
    await refetch();
    setIsManualRefreshing(false);
  }, [refetch]);

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <View className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4" style={{ paddingTop: insets.top + 12, paddingBottom: 12 }}>
        <View className="flex-row items-center mb-0.5">
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} className="mr-3">
            <MaterialCommunityIcons name="chevron-left" size={26} color="#4f46e5" />
          </TouchableOpacity>
          <Text className={`${typo.heading} text-gray-900 dark:text-white flex-1`}>{t('appt.title')}</Text>
          <TouchableOpacity onPress={() => navigation.navigate('AppointmentForm', {})} hitSlop={8}>
            <MaterialCommunityIcons name="plus" size={24} color="#4f46e5" />
          </TouchableOpacity>
        </View>
        <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 mb-3 mt-0.5`}>{t('appt.hint')}</Text>
      </View>

      {/* Week strip */}
      <WeekStrip selectedDate={selectedDate} onSelectDate={setSelectedDate} />

      {/* Day navigator */}
      <View className="flex-row items-center justify-between px-4 py-2.5 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
        <TouchableOpacity onPress={() => shiftDay(-1)} hitSlop={8} className="p-1">
          <MaterialCommunityIcons name="chevron-left" size={22} color="#6b7280" />
        </TouchableOpacity>
        <View className="items-center">
          <Text className={`${typo.label} text-gray-900 dark:text-white`}>
            {isToday ? t('appt.today') : isTomorrow ? t('appt.tomorrow') : formatDisplayDate(dateStr)}
          </Text>
          {!isToday && !isTomorrow && (
            <TouchableOpacity onPress={() => setSelectedDate(today)}>
              <Text className={`${typo.caption} text-indigo-500 mt-0.5`}>{t('appt.today')}</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity onPress={() => shiftDay(1)} hitSlop={8} className="p-1">
          <MaterialCommunityIcons name="chevron-right" size={22} color="#6b7280" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      {isLoading ? (
        <LoadingSkeleton />
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : (
        <FlatList
          showsVerticalScrollIndicator={false}
          data={groups}
          keyExtractor={(g) => g.hour}
          refreshControl={<RefreshControl refreshing={isManualRefreshing} onRefresh={handleRefresh} tintColor="#059669" />}
          contentContainerStyle={{ padding: 4, paddingTop: 8, paddingBottom: insets.bottom + 80 }}
          ListHeaderComponent={
            <>
              {/* ── Analytics collapsible banner ── */}
              <View className="mx-4 mb-3">
                <TouchableOpacity
                  onPress={() => setAnalyticsExpanded((v) => !v)}
                  activeOpacity={0.7}
                  className="bg-white dark:bg-gray-800 rounded-2xl px-4 py-3.5 border border-gray-100 dark:border-gray-700 flex-row items-center justify-between"
                >
                  <View className="flex-row items-center gap-2">
                    <MaterialCommunityIcons name="chart-bar" size={18} color="#4f46e5" />
                    <Text className={`${typo.labelBold} text-gray-800 dark:text-gray-200`}>
                      {t('appt.analytics.toggleLabel')}
                    </Text>
                  </View>
                  <MaterialCommunityIcons name={analyticsExpanded ? 'chevron-up' : 'chevron-down'} size={20} color="#9ca3af" />
                </TouchableOpacity>
              </View>

              {analyticsExpanded && <AnalyticsSection />}

              {/* Empty state when no appointments on selected day */}
              {groups.length === 0 && (
                <EmptyState
                  icon="📅"
                  title={t('appt.empty')}
                  description={t('appt.emptyHint')}
                />
              )}
            </>
          }
          renderItem={({ item: group, index: gIdx }) => (
            <View>
              <View className="flex-row items-center px-4 mb-2 mt-3">
                <Text className={`${typo.captionBold} text-indigo-500 uppercase tracking-wide`}>{group.hour}</Text>
                <View className="flex-1 h-px bg-indigo-100 dark:bg-indigo-900/30 ml-2" />
              </View>
              {group.data.map((appt, aIdx) => (
                <AppointmentCard
                  key={appt.id}
                  item={appt}
                  index={gIdx * 100 + aIdx}
                  onPress={() => navigation.navigate('AppointmentDetail', { appointmentId: appt.id })}
                />
              ))}
            </View>
          )}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        testID="appointment-add-fab"
        onPress={() => navigation.navigate('AppointmentForm', {})}
        className="absolute bottom-6 right-6 w-14 h-14 rounded-full bg-indigo-600 items-center justify-center shadow-lg"
        style={{ bottom: insets.bottom + 16 }}
      >
        <MaterialCommunityIcons name="plus" size={28} color="white" />
      </TouchableOpacity>
    </View>
  );
}
