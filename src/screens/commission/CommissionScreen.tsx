import { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, FlatList, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  commissionApi,
  type CommissionItemDTO,
  type EmployeeCommissionDTO,
  type MyCommissionDTO,
  type CommissionReportDTO,
} from '../../services/api';
import { useTypography } from '../../hooks/useTypography';
import { useFeatureCheck } from '../../hooks/useFeature';
import { Skeleton } from '../../components/Skeleton';
import { EmptyState } from '../../components/EmptyState';
import { BarChart, type BarChartDataPoint } from '../../components/BarChart';
import { formatVnd } from '../../utils/format';
import type { MoreScreenProps } from '../../types/navigation';

type Tab = 'mine' | 'team';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getPrevMonth(month: number, year: number) {
  if (month === 1) return { month: 12, year: year - 1 };
  return { month: month - 1, year };
}

function getDaysInfo(month: number, year: number) {
  const now = new Date();
  const daysInMonth = new Date(year, month, 0).getDate();
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() + 1 === month;
  const daysElapsed = isCurrentMonth ? now.getDate() : daysInMonth;
  return { daysInMonth, daysElapsed, isCurrentMonth };
}

/**
 * Build weekly bar chart data from commission items.
 * Groups by week-of-month (W1=days1-7, W2=8-14, …).
 * Returns entries as ISO date strings so BarChart can render them with tooltips.
 */
function buildWeeklyChartData(
  items: CommissionItemDTO[],
  month: number,
  year: number,
): BarChartDataPoint[] {
  const weekAmounts = [0, 0, 0, 0, 0]; // weeks 0-4
  items.forEach((item) => {
    const d = new Date(item.completedAt);
    if (d.getMonth() + 1 === month && d.getFullYear() === year) {
      const weekIdx = Math.min(Math.floor((d.getDate() - 1) / 7), 4);
      weekAmounts[weekIdx] += item.commissionAmount;
    }
  });
  const { daysElapsed } = getDaysInfo(month, year);
  const weeksToShow = Math.min(Math.ceil(daysElapsed / 7), 5);
  return weekAmounts.slice(0, weeksToShow).map((value, i) => ({
    // Use week-start date so barLabel renders something readable
    label: new Date(year, month - 1, i * 7 + 1).toISOString().slice(0, 10),
    value,
  }));
}

/** Group items by productName, sort by commission desc, return top N. */
function buildTopServices(items: CommissionItemDTO[], top = 4) {
  const map = new Map<string, { commission: number; count: number }>();
  items.forEach((item) => {
    const prev = map.get(item.productName) ?? { commission: 0, count: 0 };
    prev.commission += item.commissionAmount;
    prev.count += item.quantity;
    map.set(item.productName, prev);
  });
  return Array.from(map.entries())
    .sort((a, b) => b[1].commission - a[1].commission)
    .slice(0, top)
    .map(([name, { commission, count }]) => ({ name, commission, count }));
}

function pctChange(current: number, prev: number): number | null {
  if (prev === 0) return null;
  return Math.round(((current - prev) / prev) * 100);
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export function CommissionScreen({ navigation }: MoreScreenProps<'Commission'>) {
  const { t } = useTranslation();
  const typo = useTypography();
  const insets = useSafeAreaInsets();
  const has = useFeatureCheck();
  const hasViewAll = has('COMMISSION_VIEW_ALL');

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [activeTab, setActiveTab] = useState<Tab>('mine');

  const maxYear = now.getFullYear();
  const maxMonth = now.getMonth() + 1;

  const prevMonthParams = getPrevMonth(month, year);

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (year === maxYear && month === maxMonth) return;
    if (month === 12) { setMonth(1); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  };
  const isAtMax = year === maxYear && month === maxMonth;

  const { data: myData, isLoading: myLoading, isError: myError } = useQuery({
    queryKey: ['commission', 'me', month, year],
    queryFn: () =>
      commissionApi.getMyCommission(month, year).then((r) => {
        if (!r.data.success || r.data.data == null) throw new Error(r.data.message ?? 'not_linked');
        return r.data.data;
      }),
    retry: false,
  });

  const { data: prevData } = useQuery({
    queryKey: ['commission', 'me', prevMonthParams.month, prevMonthParams.year],
    queryFn: () =>
      commissionApi.getMyCommission(prevMonthParams.month, prevMonthParams.year).then((r) => {
        if (!r.data.success || r.data.data == null) return null;
        return r.data.data;
      }),
    retry: false,
    staleTime: 5 * 60_000, // prev month doesn't change often
  });

  const { data: reportData, isLoading: reportLoading } = useQuery({
    queryKey: ['commission', 'report', month, year],
    queryFn: () => commissionApi.getReport(month, year).then((r) => r.data.data ?? null),
    enabled: hasViewAll && activeTab === 'team',
  });

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <View className="bg-primary px-5 pb-4" style={{ paddingTop: insets.top + 12 }}>
        <View>
          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              className="mr-3"
            >
              <MaterialCommunityIcons name="chevron-left" size={26} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>
            <Text className={`${typo.section} text-white flex-1`}>{t('commission.title')}</Text>

            {/* Month navigator */}
            <View className="flex-row items-center gap-x-1">
              <TouchableOpacity onPress={prevMonth} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <MaterialCommunityIcons name="chevron-left" size={22} color="rgba(255,255,255,0.7)" />
              </TouchableOpacity>
              <Text className={`${typo.label} font-bold text-white min-w-[80px] text-center`}>
                {t('commission.monthYear', { month, year })}
              </Text>
              <TouchableOpacity
                onPress={nextMonth}
                disabled={isAtMax}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={22}
                  color={isAtMax ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.7)'}
                />
              </TouchableOpacity>
            </View>
          </View>
          <Text className={`${typo.caption} text-white/70 mt-0.5`}>{t('commission.hint')}</Text>
        </View>
      </View>

      {/* Tab switcher — only for COMMISSION_VIEW_ALL */}
      {hasViewAll && (
        <View className="flex-row bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4">
          {(['mine', 'team'] as Tab[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              className={`flex-1 py-3 items-center border-b-2 ${
                activeTab === tab ? 'border-indigo-600' : 'border-transparent'
              }`}
              onPress={() => setActiveTab(tab)}
            >
              <Text
                className={`${typo.label} ${
                  activeTab === tab
                    ? 'text-indigo-600 dark:text-indigo-400 font-semibold'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {t(`commission.tab.${tab}`)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {activeTab === 'mine' ? (
        <MyCommissionTab
          data={myData}
          prevData={prevData ?? null}
          isLoading={myLoading}
          isError={myError}
          month={month}
          year={year}
          prevMonth={prevMonthParams.month}
          prevYear={prevMonthParams.year}
          typo={typo}
          t={t}
        />
      ) : (
        <TeamCommissionTab
          data={reportData ?? null}
          isLoading={reportLoading}
          month={month}
          year={year}
          typo={typo}
          t={t}
          onEmployeePress={(emp) =>
            navigation.navigate('CommissionDetail', {
              employeeId: emp.employeeId,
              employeeName: emp.employeeName,
              month,
              year,
            })
          }
        />
      )}
    </View>
  );
}

// ─── My Commission Tab ────────────────────────────────────────────────────────

function MyCommissionTab({
  data,
  prevData,
  isLoading,
  isError,
  month,
  year,
  prevMonth: prevM,
  prevYear,
  typo,
  t,
}: {
  data: MyCommissionDTO | undefined;
  prevData: MyCommissionDTO | null;
  isLoading: boolean;
  isError: boolean;
  month: number;
  year: number;
  prevMonth: number;
  prevYear: number;
  typo: ReturnType<typeof useTypography>;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  const chartData = useMemo<BarChartDataPoint[]>(
    () => (data ? buildWeeklyChartData(data.items, month, year) : []),
    [data, month, year],
  );

  const topServices = useMemo(
    () => (data ? buildTopServices(data.items) : []),
    [data],
  );

  if (isLoading) {
    return (
      <ScrollView className="flex-1 px-4 pt-4">
        <Skeleton height={160} borderRadius={16} style={{ marginBottom: 16 }} />
        <Skeleton height={90} borderRadius={12} style={{ marginBottom: 12 }} />
        <Skeleton height={120} borderRadius={12} style={{ marginBottom: 12 }} />
        <Skeleton height={60} borderRadius={12} />
      </ScrollView>
    );
  }

  if (isError) {
    return (
      <EmptyState
        icon="👤"
        title={t('commission.notLinkedTitle')}
        description={t('commission.notLinkedSubtitle')}
      />
    );
  }

  if (!data) return null;

  const totalRevenue = data.items.reduce((sum, i) => sum + i.amount, 0);
  const avgPerService = data.itemCount > 0 ? data.totalCommission / data.itemCount : 0;
  const { daysInMonth, daysElapsed, isCurrentMonth } = getDaysInfo(month, year);
  const projected =
    isCurrentMonth && daysElapsed > 0
      ? (data.totalCommission / daysElapsed) * daysInMonth
      : null;
  const projectionProgress = isCurrentMonth ? daysElapsed / daysInMonth : 1;

  const pct = pctChange(data.totalCommission, prevData?.totalCommission ?? 0);
  const hasPrevData = prevData != null && prevData.totalCommission > 0;

  const maxServiceCommission = topServices[0]?.commission ?? 1;

  return (
    <FlatList
      data={data.items}
      keyExtractor={(item) => String(item.orderItemId)}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 40 }}
      ListHeaderComponent={
        <View className="px-4 pt-4">
          {/* ── Summary hero card ─────────────────────────────────────────── */}
          <View className="bg-emerald-500 rounded-2xl p-5 mb-4">
            {/* Main commission total */}
            <Text className={`${typo.caption} text-white/70 mb-1`}>
              {t('commission.totalTitle')}
            </Text>
            <Text className={`${typo.heading} text-white mb-1`}>
              {formatVnd(data.totalCommission)}
            </Text>

            {/* Last-month comparison */}
            {hasPrevData && pct !== null ? (
              <View className="flex-row items-center mb-3">
                <MaterialCommunityIcons
                  name={pct > 0 ? 'trending-up' : pct < 0 ? 'trending-down' : 'trending-neutral'}
                  size={15}
                  color={pct > 0 ? '#ffffff' : 'rgba(255,255,255,0.7)'}
                />
                <Text className={`${typo.caption} ml-1.5 ${pct > 0 ? 'text-white font-semibold' : 'text-white/70'}`}>
                  {pct > 0
                    ? t('commission.vsLastMonthUp', { pct })
                    : pct < 0
                    ? t('commission.vsLastMonthDown', { pct: Math.abs(pct) })
                    : t('commission.vsLastMonthFlat')}
                  {' '}
                  {t('commission.vsLastMonth', { month: prevM, year: prevYear })}
                </Text>
              </View>
            ) : (
              <View className="mb-3" />
            )}

            {/* Revenue + avg stats */}
            <View className="flex-row bg-white/10 rounded-xl p-3 mb-4">
              <View className="flex-1 items-center">
                <Text className={`${typo.caption} text-white/70 mb-0.5`}>
                  {t('commission.revenueGenerated')}
                </Text>
                <Text className={`${typo.labelBold} text-white`}>{formatVnd(totalRevenue)}</Text>
              </View>
              <View className="w-px bg-white/20" />
              <View className="flex-1 items-center">
                <Text className={`${typo.caption} text-white/70 mb-0.5`}>
                  {t('commission.itemCount', { count: data.itemCount })}
                </Text>
                <Text className={`${typo.labelBold} text-white`}>{data.itemCount}</Text>
              </View>
              <View className="w-px bg-white/20" />
              <View className="flex-1 items-center">
                <Text className={`${typo.caption} text-white/70 mb-0.5`}>
                  {t('commission.avgPerService')}
                </Text>
                <Text className={`${typo.labelBold} text-white`}>{formatVnd(avgPerService)}</Text>
              </View>
            </View>

            {/* End-of-month projection (current month only) */}
            {projected !== null && (
              <View>
                <View className="flex-row justify-between mb-1">
                  <Text className={`${typo.caption} text-white/80`}>
                    {t('commission.projectionLabel')}
                  </Text>
                  <Text className={`${typo.captionBold} text-white`}>
                    ~{formatVnd(projected)}
                  </Text>
                </View>
                <View className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                  <View
                    style={{ width: `${projectionProgress * 100}%`, height: '100%' }}
                    className="bg-white rounded-full"
                  />
                </View>
                <Text className={`${typo.caption} text-white/60 mt-1`}>
                  {t('commission.projectionOf', { elapsed: daysElapsed, total: daysInMonth })}
                </Text>
              </View>
            )}
          </View>

          {/* ── Top services ──────────────────────────────────────────────── */}
          {topServices.length > 0 && (
            <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 mb-4 shadow-sm">
              <View className="flex-row items-center mb-3">
                <MaterialCommunityIcons name="trophy-outline" size={16} color="#f59e0b" />
                <Text className={`${typo.captionBold} text-gray-700 dark:text-gray-300 ml-1.5 uppercase tracking-wide`}>
                  {t('commission.topServicesTitle')}
                </Text>
              </View>
              {topServices.map((svc, i) => {
                const barWidth = (svc.commission / maxServiceCommission) * 100;
                return (
                  <View key={svc.name} className="mb-3 last:mb-0">
                    <View className="flex-row items-center justify-between mb-1">
                      <View className="flex-row items-center flex-1 mr-2">
                        <Text
                          className={`${typo.caption} font-bold`}
                          style={{
                            color: i === 0 ? '#f59e0b' : i === 1 ? '#9ca3af' : '#cd7c2f',
                            marginRight: 6,
                            minWidth: 16,
                          }}
                        >
                          {i + 1}
                        </Text>
                        <Text
                          className={`${typo.label} text-gray-800 dark:text-white flex-1`}
                          numberOfLines={1}
                        >
                          {svc.name}
                        </Text>
                      </View>
                      <View className="items-end">
                        <Text className={`${typo.captionBold} text-emerald-600`}>
                          {formatVnd(svc.commission)}
                        </Text>
                        <Text className={`${typo.caption} text-gray-400`}>
                          {t('commission.timesService', { count: svc.count })}
                        </Text>
                      </View>
                    </View>
                    <View className="h-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <View
                        style={{ width: `${barWidth}%`, height: '100%', backgroundColor: '#059669', borderRadius: 99 }}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* ── Weekly commission chart ───────────────────────────────────── */}
          {chartData.length > 0 && (
            <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 mb-4 shadow-sm">
              <View className="flex-row items-center mb-2">
                <MaterialCommunityIcons name="chart-bar" size={15} color="#6366f1" />
                <Text className={`${typo.captionBold} text-gray-700 dark:text-gray-300 ml-1.5 uppercase tracking-wide`}>
                  {t('commission.weeklyChartTitle')}
                </Text>
              </View>
              <BarChart
                data={chartData}
                color="#059669"
                granularity="week"
              />
            </View>
          )}

          {/* ── Details header ────────────────────────────────────────────── */}
          {data.items.length > 0 && (
            <Text className={`${typo.captionBold} text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3`}>
              {t('commission.detailsHeader')}
            </Text>
          )}
        </View>
      }
      ListEmptyComponent={
        <View className="px-4">
          <EmptyState
            icon="💰"
            title={t('commission.emptyTitle')}
            description={t('commission.emptySubtitle', { month, year })}
          />
        </View>
      }
      renderItem={({ item }) => (
        <View className="px-4 mb-2">
          <CommissionItemRow item={item} typo={typo} t={t} />
        </View>
      )}
    />
  );
}

function CommissionItemRow({
  item,
  typo,
  t,
}: {
  item: CommissionItemDTO;
  typo: ReturnType<typeof useTypography>;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  const date = new Date(item.completedAt);
  const dateStr = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;

  return (
    <View className="bg-white dark:bg-gray-800 rounded-2xl px-4 py-3 border border-gray-100 dark:border-gray-700">
      <View className="flex-row justify-between items-start mb-1">
        <Text
          className={`${typo.label} text-gray-900 dark:text-white flex-1 mr-2`}
          numberOfLines={1}
        >
          {item.productName}
        </Text>
        <Text className={`${typo.labelBold} text-emerald-600`}>
          {formatVnd(item.commissionAmount)}
        </Text>
      </View>
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-x-1">
          <MaterialCommunityIcons name="receipt-text-outline" size={12} color="#9ca3af" />
          <Text className={`${typo.caption} text-gray-400`}>{item.orderNumber}</Text>
          {item.quantity > 1 && (
            <Text className={`${typo.caption} text-gray-400`}> · ×{item.quantity}</Text>
          )}
        </View>
        <Text className={`${typo.caption} text-gray-400`}>{dateStr}</Text>
      </View>
      {item.commissionRate > 0 && (
        <Text className={`${typo.caption} text-gray-400 mt-0.5`}>
          {item.commissionRate}% · {t('commission.itemTotal', { amount: formatVnd(item.amount) })}
        </Text>
      )}
    </View>
  );
}

// ─── Team Commission Tab ──────────────────────────────────────────────────────

function TeamPodium({
  employees,
  typo,
  onPress,
}: {
  employees: EmployeeCommissionDTO[];
  typo: ReturnType<typeof useTypography>;
  onPress: (emp: EmployeeCommissionDTO) => void;
}) {
  // Podium order: 2nd (left), 1st (center), 3rd (right)
  const [first, second, third] = employees;
  const podiumItems: { emp: EmployeeCommissionDTO | undefined; rank: number; height: number; medal: string; bg: string; textColor: string }[] = [
    { emp: second, rank: 2, height: 56, medal: '🥈', bg: '#e5e7eb', textColor: '#4b5563' },
    { emp: first,  rank: 1, height: 76, medal: '🥇', bg: '#fef3c7', textColor: '#b45309' },
    { emp: third,  rank: 3, height: 40, medal: '🥉', bg: '#fed7aa', textColor: '#c2410c' },
  ];

  return (
    <View className="flex-row justify-center items-end gap-x-2 mb-4 mt-1">
      {podiumItems.map(({ emp, rank, height, medal, bg, textColor }) =>
        emp ? (
          <TouchableOpacity
            key={rank}
            className="flex-1 items-center"
            onPress={() => onPress(emp)}
            activeOpacity={0.75}
          >
            {/* Medal */}
            <Text className="text-2xl mb-1">{medal}</Text>
            {/* Name */}
            <Text
              className={`${typo.caption} text-gray-700 dark:text-gray-300 text-center mb-1`}
              numberOfLines={1}
            >
              {emp.employeeName.split(' ').pop()}
            </Text>
            {/* Commission */}
            <Text className={`${typo.caption} font-bold`} style={{ color: textColor, marginBottom: 4 }}>
              {formatVnd(emp.totalCommission)}
            </Text>
            {/* Podium block */}
            <View
              style={{
                height,
                width: '100%',
                backgroundColor: bg,
                borderTopLeftRadius: 8,
                borderTopRightRadius: 8,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text className={`${typo.body} font-black`} style={{ color: textColor }}>{rank}</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <View key={rank} className="flex-1" />
        ),
      )}
    </View>
  );
}

function TeamCommissionTab({
  data,
  isLoading,
  month,
  year,
  typo,
  t,
  onEmployeePress,
}: {
  data: CommissionReportDTO | null;
  isLoading: boolean;
  month: number;
  year: number;
  typo: ReturnType<typeof useTypography>;
  t: (key: string, opts?: Record<string, unknown>) => string;
  onEmployeePress: (emp: EmployeeCommissionDTO) => void;
}) {
  if (isLoading) {
    return (
      <ScrollView className="flex-1 px-4 pt-4">
        <Skeleton height={90} borderRadius={16} style={{ marginBottom: 16 }} />
        <Skeleton height={120} borderRadius={16} style={{ marginBottom: 16 }} />
        <Skeleton height={60} borderRadius={12} style={{ marginBottom: 8 }} />
        <Skeleton height={60} borderRadius={12} style={{ marginBottom: 8 }} />
        <Skeleton height={60} borderRadius={12} />
      </ScrollView>
    );
  }

  if (!data) return null;

  const teamAvg =
    data.employees.length > 0 ? data.totalCommission / data.employees.length : 0;

  // Sort employees by totalCommission desc (defensive — backend may already sort)
  const sorted = [...data.employees].sort((a, b) => b.totalCommission - a.totalCommission);
  const avgInsertIdx = sorted.findIndex((e) => e.totalCommission < teamAvg);

  return (
    <FlatList
      data={sorted}
      keyExtractor={(emp) => String(emp.employeeId)}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 40 }}
      ListHeaderComponent={
        <View className="px-4 pt-4">
          {/* Team total card */}
          <View className="bg-indigo-600 rounded-2xl p-5 mb-4">
            <View className="flex-row justify-between items-center mb-3">
              <View>
                <Text className={`${typo.caption} text-white/70 mb-1`}>
                  {t('commission.teamTotal')}
                </Text>
                <Text className={`${typo.heading} text-white`}>
                  {formatVnd(data.totalCommission)}
                </Text>
              </View>
              <View className="items-end">
                <Text className={`${typo.captionBold} text-white/80`}>
                  {data.employees.length} {t('commission.staffCount')}
                </Text>
                <Text className={`${typo.caption} text-white/60 mt-0.5`}>
                  {data.totalItemCount} {t('commission.itemCountUnit')}
                </Text>
              </View>
            </View>
            {/* Team average highlight */}
            <View className="bg-white/10 rounded-xl px-4 py-2.5 flex-row items-center justify-between">
              <Text className={`${typo.caption} text-white/80`}>{t('commission.teamAvgLabel')}</Text>
              <Text className={`${typo.labelBold} text-white`}>{formatVnd(teamAvg)}</Text>
            </View>
          </View>

          {/* Podium (only when ≥2 employees) */}
          {sorted.length >= 2 && (
            <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 mb-4 shadow-sm">
              <View className="flex-row items-center mb-2">
                <MaterialCommunityIcons name="podium-gold" size={16} color="#f59e0b" />
                <Text className={`${typo.captionBold} text-gray-700 dark:text-gray-300 ml-1.5 uppercase tracking-wide`}>
                  {t('commission.podiumTitle')}
                </Text>
              </View>
              <TeamPodium
                employees={sorted.slice(0, 3)}
                typo={typo}
                onPress={onEmployeePress}
              />
            </View>
          )}

          {sorted.length > 0 && (
            <Text className={`${typo.captionBold} text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3`}>
              {t('commission.byEmployee')}
            </Text>
          )}
        </View>
      }
      ListEmptyComponent={
        <View className="px-4">
          <EmptyState
            icon="👥"
            title={t('commission.emptyTitle')}
            description={t('commission.emptySubtitle', { month, year })}
          />
        </View>
      }
      renderItem={({ item: emp, index }) => {
        const share =
          data.totalCommission > 0
            ? Math.round((emp.totalCommission / data.totalCommission) * 100)
            : 0;
        const isAboveAvg = emp.totalCommission >= teamAvg;
        // Insert average divider before the first below-avg employee
        const showAvgDivider = index === avgInsertIdx && avgInsertIdx > 0;

        return (
          <View className="px-4">
            {showAvgDivider && (
              <View className="flex-row items-center my-2">
                <View className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                <View className="mx-3 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full flex-row items-center gap-x-1.5">
                  <MaterialCommunityIcons name="minus" size={11} color="#9ca3af" />
                  <Text className={`${typo.caption} text-gray-500`}>
                    {t('commission.teamAvgLabel')}: {formatVnd(teamAvg)}
                  </Text>
                </View>
                <View className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
              </View>
            )}

            <TouchableOpacity
              className="bg-white dark:bg-gray-800 rounded-2xl px-4 py-3.5 border border-gray-100 dark:border-gray-700 flex-row items-center mb-2 active:opacity-75"
              onPress={() => onEmployeePress(emp)}
            >
              {/* Rank badge */}
              <View
                className={`w-7 h-7 rounded-full items-center justify-center mr-3 ${
                  index === 0
                    ? 'bg-amber-100'
                    : index === 1
                    ? 'bg-gray-100'
                    : index === 2
                    ? 'bg-orange-100'
                    : 'bg-gray-50 dark:bg-gray-700'
                }`}
              >
                <Text
                  className={`${typo.captionBold} ${
                    index === 0
                      ? 'text-amber-600'
                      : index === 1
                      ? 'text-gray-500'
                      : index === 2
                      ? 'text-orange-500'
                      : 'text-gray-400'
                  }`}
                >
                  {index + 1}
                </Text>
              </View>

              {/* Name + meta */}
              <View className="flex-1">
                <View className="flex-row items-center gap-x-2">
                  <Text className={`${typo.label} text-gray-900 dark:text-white`}>
                    {emp.employeeName}
                  </Text>
                  {isAboveAvg && (
                    <View className="bg-emerald-50 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded">
                      <Text className={`${typo.caption} font-bold`} style={{ color: '#059669' }}>▲</Text>
                    </View>
                  )}
                </View>
                <Text className={`${typo.caption} text-gray-400 mt-0.5`}>
                  {emp.itemCount} {t('commission.itemCountUnit')}
                  {'  ·  '}
                  {t('commission.shareOfTeam', { pct: share })}
                </Text>
              </View>

              <Text className={`${typo.labelBold} text-emerald-600 dark:text-emerald-400 mr-2`}>
                {formatVnd(emp.totalCommission)}
              </Text>
              <MaterialCommunityIcons name="chevron-right" size={16} color="#9ca3af" />
            </TouchableOpacity>
          </View>
        );
      }}
    />
  );
}
