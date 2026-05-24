import { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  shopUserApi,
  employeeApi,
  orderApi,
  type ShopUser,
  type EmployeeRevenueRankItem,
  type EmployeeCommissionRankItem,
  type EmployeeTrendPoint,
  type WorkItemDTO,
  type EmployeeData,
} from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useTypography } from '../../hooks/useTypography';
import { AvatarImage } from '../../components/AvatarImage';
import { Skeleton } from '../../components/Skeleton';
import { ErrorState } from '../../components/ErrorState';
import { TrendChart } from '../../components/TrendChart';
import { formatVnd } from '../../utils/format';
import type { ChartGranularity } from '../../components/BarChart';
import type { MoreScreenProps } from '../../types/navigation';

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

// ── This-month range (stable module-level constant) ────────────────────────────
function buildThisMonthRange(): { from: string; to: string } {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to   = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { from: fmt(from), to: fmt(to) };
}
const THIS_MONTH = buildThisMonthRange();

// ── Per-card stats from this month's revenue ranking ──────────────────────────
type StaffStats = { rank: number; revenue: number; orderCount: number };

function rankMedal(rank: number): string | null {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return null;
}

// ── Role colours ──────────────────────────────────────────────────────────────

const ROLE_COLORS: Record<string, string> = {
  SHOP_OWNER: '#4f46e5',
  MANAGER: '#7c3aed',
  CASHIER: '#0891b2',
  RECEPTIONIST: '#059669',
  TECHNICIAN: '#d97706',
  SERVICE_STAFF: '#2563eb',
  ACCOUNTANT: '#dc2626',
  WAREHOUSE_STAFF: '#16a34a',
  CLEANER: '#6b7280',
};

function RoleBadge({ role }: { role: string }) {
  const { t } = useTranslation();
  const typo = useTypography();
  const color = ROLE_COLORS[role] ?? '#6b7280';
  return (
    <View style={{ backgroundColor: color + '20', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 }}>
      <Text className={`${typo.caption} font-semibold`} style={{ color }}>
        {t(`roles.${role}`, { defaultValue: role })}
      </Text>
    </View>
  );
}

function StaffRow({ item, index, stats, onPress }: {
  item: ShopUser;
  index: number;
  stats?: StaffStats;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const typo = useTypography();
  const primaryRole = item.roles.find((r) => r.name !== 'SHOP_OWNER') ?? item.roles[0];
  const avatarColor = ROLE_COLORS[primaryRole?.name ?? 'CASHIER'] ?? '#6b7280';
  const isActive = item.active && item.accountNonLocked;
  const medal = stats ? rankMedal(stats.rank) : null;

  return (
    <TouchableOpacity
      testID={`staff-row-${index}`}
      onPress={onPress}
      activeOpacity={0.75}
      className="bg-white dark:bg-gray-800 rounded-2xl p-4 mb-3 border border-gray-100 dark:border-gray-700"
    >
      <View className="flex-row items-center">

        {/* Avatar + optional medal badge */}
        <View style={{ width: 44, height: 44, marginRight: 12 }}>
          <AvatarImage uri={item.avatarUrl} name={item.fullName ?? item.username} size={44} color={avatarColor} />
          {medal && (
            <View style={{
              position: 'absolute', bottom: -3, right: -4,
              backgroundColor: 'white', borderRadius: 8, paddingHorizontal: 1,
            }}>
              <Text className={typo.caption} style={{ lineHeight: 17 }}>{medal}</Text>
            </View>
          )}
        </View>

        {/* Name · username · stats line */}
        <View className="flex-1">
          <Text className={`${typo.labelBold} text-gray-900 dark:text-white`} numberOfLines={1}>
            {item.fullName ?? item.username}
          </Text>
          <Text className={`${typo.caption} text-gray-500 dark:text-gray-400`}>{item.username}</Text>
          {stats && (
            <View className="flex-row items-center gap-1 mt-0.5" style={{ flexWrap: 'nowrap' }}>
              {stats.revenue > 0 ? (
                <Text className={`${typo.captionBold} text-indigo-600 dark:text-indigo-400`} numberOfLines={1}>
                  {formatVnd(stats.revenue)}
                </Text>
              ) : (
                <Text className={`${typo.caption} text-gray-400 dark:text-gray-500`}>—</Text>
              )}
              <Text className={`${typo.caption} text-gray-300 dark:text-gray-600`}>·</Text>
              <Text className={`${typo.caption} text-gray-500 dark:text-gray-400`} numberOfLines={1}>
                {t('staff.analytics.rankingOrders', { count: stats.orderCount })}
                {stats.orderCount === 0 ? ` (${t('staff.statsThisMonth')})` : ''}
              </Text>
            </View>
          )}
        </View>

        {/* Active status + chevron */}
        <View className="items-end gap-1">
          <View className="flex-row items-center gap-1">
            <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: isActive ? '#10b981' : '#ef4444' }} />
            <Text className={`${typo.caption} text-gray-400 dark:text-gray-500`}>
              {isActive ? t('staff.active') : t('staff.inactive')}
            </Text>
          </View>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={20} color="#d1d5db" style={{ marginLeft: 8 }} />
      </View>
      <View className="flex-row flex-wrap gap-1.5 mt-3 pt-3 border-t border-gray-50 dark:border-gray-700">
        {item.roles.map((r) => <RoleBadge key={r.id} role={r.name} />)}
      </View>
    </TouchableOpacity>
  );
}

// ── Performance section helpers (merged from StaffPerformanceScreen) ───────────

type PerfFilterType = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';

type EmpStats = {
  name: string;
  position: string | null;
  commissionRate: number | null;
  count: number;
  revenue: number;
  durationMinutes: number;
  avgDuration: number;
  estimatedCommission: number;
};

function getTodayParts() {
  const now = new Date();
  return { day: now.getDate(), month: now.getMonth() + 1, year: now.getFullYear() };
}

function formatWeekLabel(day: number, month: number, year: number): string {
  const d = new Date(year, month - 1, day);
  const dow = d.getDay();
  const weekStart = new Date(d);
  weekStart.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const fmt = (dt: Date) => `${dt.getDate()}/${dt.getMonth() + 1}`;
  return `${fmt(weekStart)}–${fmt(weekEnd)}/${weekEnd.getFullYear()}`;
}

function fmtDuration(min: number): string {
  if (min <= 0) return '—';
  if (min < 60) return `${min}p`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h${m}p` : `${h}h`;
}

function perfAvatarColor(name: string): string {
  const COLORS = ['#4f46e5', '#0891b2', '#059669', '#d97706', '#7c3aed', '#dc2626', '#2563eb', '#16a34a'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
}

function buildPerfStats(items: WorkItemDTO[], employees: EmployeeData[]): EmpStats[] {
  const empMap = new Map(employees.map((e) => [e.fullName, e]));
  const byName = new Map<string, { count: number; revenue: number; timedCount: number; durationMinutes: number }>();
  for (const item of items) {
    const key = item.assignedEmployeeName ?? '';
    if (!byName.has(key)) byName.set(key, { count: 0, revenue: 0, timedCount: 0, durationMinutes: 0 });
    const b = byName.get(key)!;
    b.count += item.quantity;
    b.revenue += item.amount;
    if (item.durationMinutes > 0) {
      b.timedCount += item.quantity;
      b.durationMinutes += item.durationMinutes * item.quantity;
    }
  }
  return Array.from(byName.entries())
    .map(([name, b]) => {
      const emp = empMap.get(name);
      const commissionRate = emp?.commissionRate ?? null;
      const avgDuration = b.timedCount > 0 ? Math.round(b.durationMinutes / b.timedCount) : 0;
      const estimatedCommission = commissionRate !== null ? Math.round(b.revenue * commissionRate / 100) : 0;
      return { name: name || '—', position: emp?.position ?? null, commissionRate, count: b.count, revenue: b.revenue, durationMinutes: b.durationMinutes, avgDuration, estimatedCommission };
    })
    .sort((a, b) => b.revenue - a.revenue);
}

const PERF_RANK_COLORS = ['#f59e0b', '#9ca3af', '#cd7f32'];

function PerfRankBadge({ rank }: { rank: number }) {
  const typo = useTypography();
  const color = rank <= 3 ? PERF_RANK_COLORS[rank - 1] : '#d1d5db';
  return (
    <View style={{ backgroundColor: color + '25', width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }}>
      <Text className={`${typo.caption} font-bold`} style={{ color }}>#{rank}</Text>
    </View>
  );
}

function StatCell({ label, value, color }: { label: string; value: string; color: string }) {
  const typo = useTypography();
  return (
    <View className="flex-1 items-center px-1">
      <Text style={{ color }} className={`${typo.labelBold}`} numberOfLines={1}>{value}</Text>
      <Text className={`${typo.caption} text-gray-400 dark:text-gray-500 mt-0.5 text-center`}>{label}</Text>
    </View>
  );
}

function PerfEmpCard({ stats, rank, maxRevenue }: { stats: EmpStats; rank: number; maxRevenue: number }) {
  const { t } = useTranslation();
  const typo = useTypography();
  const color = perfAvatarColor(stats.name);
  const initial = stats.name.split(' ').slice(-1)[0]?.charAt(0).toUpperCase() ?? '?';
  const barFlex = maxRevenue > 0 ? stats.revenue / maxRevenue : 0;
  return (
    <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 mb-3 border border-gray-100 dark:border-gray-700">
      <View className="flex-row items-center mb-3">
        <PerfRankBadge rank={rank} />
        <View style={{ backgroundColor: color + '20', width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }} className="mx-3">
          <Text className={`${typo.body} font-bold`} style={{ color }}>{initial}</Text>
        </View>
        <View className="flex-1">
          <Text className={`${typo.labelBold} text-gray-900 dark:text-white`} numberOfLines={1}>{stats.name}</Text>
          {stats.position ? <Text className={`${typo.caption} text-gray-400 dark:text-gray-500`}>{stats.position}</Text> : null}
        </View>
      </View>
      <View className="flex-row border-t border-gray-50 dark:border-gray-700 pt-3 mb-3">
        <StatCell label={t('perf.services')} value={String(stats.count)} color="#4f46e5" />
        <View className="w-px bg-gray-100 dark:bg-gray-700" />
        <StatCell label={t('perf.revenue')} value={formatVnd(stats.revenue)} color="#059669" />
        <View className="w-px bg-gray-100 dark:bg-gray-700" />
        <StatCell label={t('perf.avgDuration')} value={fmtDuration(stats.avgDuration)} color="#6b7280" />
      </View>
      <View className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full mb-2 overflow-hidden flex-row">
        <View style={{ flex: barFlex, backgroundColor: color }} />
        <View style={{ flex: Math.max(1 - barFlex, 0) }} />
      </View>
      {stats.commissionRate !== null && (
        <View className="flex-row items-center justify-between mt-1.5">
          <Text className={`${typo.caption} text-gray-400 dark:text-gray-500`}>{t('perf.commission')} ({stats.commissionRate}%)</Text>
          <Text className={`${typo.captionBold} text-amber-600 dark:text-amber-400`}>{formatVnd(stats.estimatedCommission)}</Text>
        </View>
      )}
    </View>
  );
}

function PerformanceSection() {
  const { t } = useTranslation();
  const typo = useTypography();
  const today = getTodayParts();
  const [filterType, setFilterType] = useState<PerfFilterType>('DAY');
  const [day, setDay] = useState(today.day);
  const [month, setMonth] = useState(today.month);
  const [year, setYear] = useState(today.year);

  const currentYear = today.year;
  const YEARS = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];
  const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  const FILTERS: { key: PerfFilterType; label: string }[] = [
    { key: 'DAY', label: t('myWork.filterDay') },
    { key: 'WEEK', label: t('myWork.filterWeek') },
    { key: 'MONTH', label: t('myWork.filterMonth') },
    { key: 'YEAR', label: t('myWork.filterYear') },
  ];

  function shiftDay(delta: number) {
    const d = new Date(year, month - 1, day);
    d.setDate(d.getDate() + delta);
    setDay(d.getDate()); setMonth(d.getMonth() + 1); setYear(d.getFullYear());
  }
  function shiftWeek(delta: number) {
    const d = new Date(year, month - 1, day);
    d.setDate(d.getDate() + delta * 7);
    setDay(d.getDate()); setMonth(d.getMonth() + 1); setYear(d.getFullYear());
  }

  const { data, isFetching } = useQuery({
    queryKey: ['staffPerf', filterType, day, month, year],
    queryFn: async () => {
      const [itemsRes, empRes] = await Promise.all([
        orderApi.completedWorkItems({ filterType, day, month, year, size: 500 }),
        employeeApi.listActive(),
      ]);
      return { items: itemsRes.data.data?.content ?? [], employees: empRes.data.data ?? [] };
    },
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });

  const { rows, maxRevenue } = useMemo(() => {
    if (!data) return { rows: [], maxRevenue: 0 };
    const stats = buildPerfStats(data.items, data.employees);
    return { rows: stats, maxRevenue: stats[0]?.revenue ?? 0 };
  }, [data]);

  return (
    <View className="mx-4 mb-3">
      {/* Period filter */}
      <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 mb-3">
        <View className="flex-row items-center justify-between mb-3">
          <Text className={`${typo.caption} text-gray-400 dark:text-gray-500 flex-1`}>{t('perf.hint')}</Text>
          {isFetching && <ActivityIndicator size="small" color="#7c3aed" />}
        </View>

        {/* Filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 12 }}>
          {FILTERS.map((f) => {
            const active = filterType === f.key;
            return (
              <TouchableOpacity key={f.key} onPress={() => setFilterType(f.key)}
                className={`px-4 py-1.5 rounded-full border ${active ? 'bg-violet-600 border-violet-600' : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'}`}>
                <Text className={`${typo.caption} font-medium ${active ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`}>{f.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Date navigation */}
        {filterType === 'DAY' && (
          <View className="flex-row items-center justify-between">
            <TouchableOpacity onPress={() => shiftDay(-1)} className="p-1" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialCommunityIcons name="chevron-left" size={22} color="#7c3aed" />
            </TouchableOpacity>
            <Text className={`${typo.label} text-gray-800 dark:text-white`}>{day}/{month}/{year}</Text>
            <TouchableOpacity onPress={() => shiftDay(1)} className="p-1" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialCommunityIcons name="chevron-right" size={22} color="#7c3aed" />
            </TouchableOpacity>
          </View>
        )}
        {filterType === 'WEEK' && (
          <View className="flex-row items-center justify-between">
            <TouchableOpacity onPress={() => shiftWeek(-1)} className="p-1" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialCommunityIcons name="chevron-left" size={22} color="#7c3aed" />
            </TouchableOpacity>
            <Text className={`${typo.label} text-gray-800 dark:text-white`}>{formatWeekLabel(day, month, year)}</Text>
            <TouchableOpacity onPress={() => shiftWeek(1)} className="p-1" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialCommunityIcons name="chevron-right" size={22} color="#7c3aed" />
            </TouchableOpacity>
          </View>
        )}
        {filterType === 'MONTH' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            {MONTHS.map((m) => (
              <TouchableOpacity key={m} onPress={() => setMonth(m)}
                className={`px-3 py-1 rounded-full border ${month === m ? 'bg-violet-600 border-violet-600' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600'}`}>
                <Text className={`${typo.captionBold} ${month === m ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`}>T{m}/{year}</Text>
              </TouchableOpacity>
            ))}
            {YEARS.map((y) => (
              <TouchableOpacity key={y} onPress={() => setYear(y)}
                className={`px-3 py-1 rounded-full border ${year === y ? 'border-violet-600' : 'border-gray-200 dark:border-gray-600'}`}>
                <Text className={`${typo.caption} text-gray-500 dark:text-gray-400`}>{y}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
        {filterType === 'YEAR' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            {YEARS.map((y) => (
              <TouchableOpacity key={y} onPress={() => setYear(y)}
                className={`px-4 py-1.5 rounded-full border ${year === y ? 'bg-violet-600 border-violet-600' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600'}`}>
                <Text className={`${typo.caption} font-medium ${year === y ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`}>{y}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Employee performance cards */}
      {rows.length === 0 && !isFetching ? (
        <View className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 items-center">
          <MaterialCommunityIcons name="account-clock-outline" size={40} color="#d1d5db" />
          <Text className={`${typo.body} text-gray-400 dark:text-gray-500 mt-3 text-center`}>{t('perf.empty')}</Text>
          <Text className={`${typo.caption} text-gray-400 dark:text-gray-500 mt-1 text-center`}>{t('perf.emptyHint')}</Text>
        </View>
      ) : (
        rows.map((item, index) => (
          <PerfEmpCard key={item.name} stats={item} rank={index + 1} maxRevenue={maxRevenue} />
        ))
      )}
    </View>
  );
}

// ── Analytics section ──────────────────────────────────────────────────────────

type RankingMetric = 'revenue' | 'commission';

function KpiCard({ label, value, color = 'default' }: { label: string; value: string; color?: 'indigo' | 'emerald' | 'amber' | 'default' }) {
  const typo = useTypography();
  const bg = color === 'indigo' ? 'bg-indigo-50 dark:bg-indigo-900/20'
    : color === 'emerald' ? 'bg-emerald-50 dark:bg-emerald-900/20'
    : color === 'amber' ? 'bg-amber-50 dark:bg-amber-900/20'
    : 'bg-gray-50 dark:bg-gray-700/50';
  const text = color === 'indigo' ? 'text-indigo-600 dark:text-indigo-400'
    : color === 'emerald' ? 'text-emerald-600 dark:text-emerald-400'
    : color === 'amber' ? 'text-amber-600 dark:text-amber-400'
    : 'text-gray-800 dark:text-gray-200';
  return (
    <View className={`flex-1 ${bg} rounded-xl p-2.5 items-center`}>
      <Text className={`${typo.labelBold} ${text}`} numberOfLines={1}>{value}</Text>
      <Text className={`${typo.captionBold} text-gray-500 dark:text-gray-400 mt-0.5 text-center`}>{label}</Text>
    </View>
  );
}

function AnalyticsSection() {
  const { t } = useTranslation();
  const typo = useTypography();

  const [periodKey, setPeriodKey] = useState<PeriodKey>('90d');
  const [rankingMetric, setRankingMetric] = useState<RankingMetric>('revenue');
  const [chartMetric, setChartMetric] = useState<RankingMetric>('revenue');
  const [chartGranularity, setChartGranularity] = useState<ChartGranularity>(() => granularityForPeriod('90d'));

  const period = getPeriod(periodKey);

  const { data: analytics, isFetching } = useQuery({
    queryKey: ['employee-analytics', period.from, period.to, chartGranularity],
    queryFn: () =>
      employeeApi.analytics({ from: period.from, to: period.to, granularity: chartGranularity })
        .then((r) => r.data.data),
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
  });

  const handlePeriodChange = (key: PeriodKey) => {
    setPeriodKey(key);
    setChartGranularity(granularityForPeriod(key));
  };

  const summary = analytics?.summary;
  const rankingRevenue: EmployeeRevenueRankItem[] = analytics?.rankingRevenue ?? [];
  const rankingCommission: EmployeeCommissionRankItem[] = analytics?.rankingCommission ?? [];
  const trend: EmployeeTrendPoint[] = analytics?.trend ?? [];

  const chartData = trend.map((p) => ({
    label: p.label,
    value: chartMetric === 'revenue' ? p.revenue : p.commission,
  }));

  const PERIOD_LABELS: Record<PeriodKey, string> = {
    '30d': '30 ngày', '90d': '3 tháng', '180d': '6 tháng', '365d': '1 năm',
  };

  return (
    <View className="mx-4 mb-3">

      {/* ── KPI summary card ── */}
      <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 mb-3">
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center gap-2">
            <MaterialCommunityIcons name="chart-bar" size={18} color="#4f46e5" />
            <Text className={`${typo.labelBold} text-gray-900 dark:text-white`}>
              {t('staff.analytics.title')}
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

        {/* KPI row 1: revenue + commission */}
        <View className="flex-row gap-2 mb-2">
          <KpiCard label={t('staff.analytics.totalRevenue')} value={summary ? formatVnd(summary.totalRevenue) : '–'} color="indigo" />
          <KpiCard label={t('staff.analytics.totalCommission')} value={summary ? formatVnd(summary.totalCommission) : '–'} color="emerald" />
        </View>
        {/* KPI row 2: active count + avg revenue */}
        <View className="flex-row gap-2">
          <KpiCard label={t('staff.analytics.activeCount')} value={summary ? String(summary.activeEmployeeCount) : '–'} color="amber" />
          <KpiCard label={t('staff.analytics.avgRevenue')} value={summary ? formatVnd(summary.avgRevenuePerEmployee) : '–'} color="default" />
        </View>
      </View>

      {/* ── Trend chart ── */}
      {chartData.length > 0 && (
        <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 mb-3">
          <View className="flex-row items-center gap-2 mb-3">
            <MaterialCommunityIcons name="chart-line" size={18} color="#4f46e5" />
            <Text className={`${typo.labelBold} text-gray-900 dark:text-white flex-1`}>
              {t('staff.analytics.trendTitle')}
            </Text>
            {/* Metric toggle */}
            <View className="flex-row gap-1">
              {(['revenue', 'commission'] as RankingMetric[]).map((m) => {
                const active = chartMetric === m;
                return (
                  <TouchableOpacity key={m} onPress={() => setChartMetric(m)}
                    className={`px-2.5 py-1 rounded-full border ${active ? 'bg-indigo-600 border-indigo-600' : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'}`}>
                    <Text className={`${typo.captionBold} ${active ? 'text-white' : 'text-gray-500 dark:text-gray-300'}`}>
                      {m === 'revenue' ? t('staff.analytics.revenue') : t('staff.analytics.commission')}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
          <TrendChart
            data={chartData}
            color={chartMetric === 'revenue' ? '#4f46e5' : '#059669'}
            granularity={chartGranularity}
            allowedGranularities={['day', 'week', 'month']}
            onGranularityChange={setChartGranularity}
          />
        </View>
      )}

      {/* ── Ranking ── */}
      {(rankingRevenue.length > 0 || rankingCommission.length > 0) && (
        <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 mb-3">
          <View className="flex-row items-center gap-2 mb-3">
            <MaterialCommunityIcons name="trophy-outline" size={18} color="#4f46e5" />
            <Text className={`${typo.labelBold} text-gray-900 dark:text-white flex-1`}>
              {t('staff.analytics.rankingTitle')}
            </Text>
            {/* Ranking metric toggle */}
            <View className="flex-row gap-1">
              {(['revenue', 'commission'] as RankingMetric[]).map((m) => {
                const active = rankingMetric === m;
                return (
                  <TouchableOpacity key={m} onPress={() => setRankingMetric(m)}
                    className={`px-2.5 py-1 rounded-full border ${active ? 'bg-indigo-600 border-indigo-600' : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'}`}>
                    <Text className={`${typo.captionBold} ${active ? 'text-white' : 'text-gray-500 dark:text-gray-300'}`}>
                      {m === 'revenue' ? t('staff.analytics.revenue') : t('staff.analytics.commission')}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={{ gap: 10 }}>
            {rankingMetric === 'revenue'
              ? rankingRevenue.map((item, index) => (
                  <View key={item.userId ?? item.employeeName} className="flex-row items-center gap-3">
                    <View className={`w-7 h-7 rounded-full items-center justify-center ${index === 0 ? 'bg-amber-100 dark:bg-amber-900/30' : index === 1 ? 'bg-gray-100 dark:bg-gray-700' : 'bg-gray-50 dark:bg-gray-800'}`}>
                      <Text className={`${typo.captionBold} ${index === 0 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-500 dark:text-gray-400'}`}>{index + 1}</Text>
                    </View>
                    <View className="flex-1">
                      <Text className={`${typo.label} text-gray-800 dark:text-gray-200`} numberOfLines={1}>{item.employeeName}</Text>
                      <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 mt-0.5`}>
                        {t('staff.analytics.rankingOrders', { count: item.orderCount })}
                      </Text>
                    </View>
                    <Text className={`${typo.labelBold} text-indigo-600 dark:text-indigo-400`}>{formatVnd(item.revenue)}</Text>
                  </View>
                ))
              : rankingCommission.map((item, index) => (
                  <View key={item.employeeId ?? item.employeeName} className="flex-row items-center gap-3">
                    <View className={`w-7 h-7 rounded-full items-center justify-center ${index === 0 ? 'bg-amber-100 dark:bg-amber-900/30' : index === 1 ? 'bg-gray-100 dark:bg-gray-700' : 'bg-gray-50 dark:bg-gray-800'}`}>
                      <Text className={`${typo.captionBold} ${index === 0 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-500 dark:text-gray-400'}`}>{index + 1}</Text>
                    </View>
                    <View className="flex-1">
                      <Text className={`${typo.label} text-gray-800 dark:text-gray-200`} numberOfLines={1}>{item.employeeName}</Text>
                      <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 mt-0.5`}>
                        {t('staff.analytics.rankingRevenue', { amount: formatVnd(item.revenue) })}
                      </Text>
                    </View>
                    <Text className={`${typo.labelBold} text-emerald-600 dark:text-emerald-400`}>{formatVnd(item.commission)}</Text>
                  </View>
                ))}
          </View>
        </View>
      )}

      {/* Empty state */}
      {!isFetching && summary && summary.totalRevenue === 0 && summary.totalCommission === 0 && (
        <View className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 mb-3 items-center">
          <MaterialCommunityIcons name="account-group-outline" size={40} color="#d1d5db" />
          <Text className={`${typo.body} text-gray-400 dark:text-gray-500 mt-3 text-center`}>
            {t('staff.analytics.noData')}
          </Text>
        </View>
      )}
    </View>
  );
}

// ── Shop-type → filterable roles ──────────────────────────────────────────────
// Mirrors SHOP_TYPE_DEFAULT_ROLES from frontend/src/constants/tenantConstants.js
// CLEANER is appended to every entry — any physical shop can have cleaning staff.
const ROLES_FOR_SHOP_TYPE: Record<string, string[]> = {
  JEWELRY:           ['MANAGER', 'CASHIER', 'PAWN_OFFICER', 'ACCOUNTANT', 'CLEANER'],
  PAWN_SHOP:         ['MANAGER', 'PAWN_OFFICER', 'CASHIER', 'CLEANER'],
  CONVENIENCE_STORE: ['MANAGER', 'CASHIER', 'WAREHOUSE_STAFF', 'CLEANER'],
  PHARMACY:          ['MANAGER', 'CASHIER', 'WAREHOUSE_STAFF', 'ACCOUNTANT', 'CLEANER'],
  ELECTRONICS:       ['MANAGER', 'TECHNICIAN', 'CASHIER', 'WAREHOUSE_STAFF', 'CLEANER'],
  FOOD_BEVERAGE:     ['MANAGER', 'CASHIER', 'SERVICE_STAFF', 'CLEANER'],
  FASHION:           ['MANAGER', 'CASHIER', 'WAREHOUSE_STAFF', 'CLEANER'],
  BARBER_SHOP:       ['MANAGER', 'TECHNICIAN', 'RECEPTIONIST', 'CASHIER', 'CLEANER'],
  BARBER_SHOP_MEN:   ['MANAGER', 'TECHNICIAN', 'RECEPTIONIST', 'CASHIER', 'CLEANER'],
  HAIR_SALON:        ['MANAGER', 'TECHNICIAN', 'RECEPTIONIST', 'CASHIER', 'CLEANER'],
  NAIL_SHOP:         ['MANAGER', 'TECHNICIAN', 'RECEPTIONIST', 'CASHIER', 'CLEANER'],
  LASH_PMU_STUDIO:   ['MANAGER', 'TECHNICIAN', 'RECEPTIONIST', 'CASHIER', 'CLEANER'],
  SPA_SHOP:          ['MANAGER', 'TECHNICIAN', 'RECEPTIONIST', 'CASHIER', 'CLEANER'],
  MASSAGE_SHOP:      ['MANAGER', 'TECHNICIAN', 'RECEPTIONIST', 'CASHIER', 'CLEANER'],
  BEAUTY_CLINIC:     ['MANAGER', 'TECHNICIAN', 'RECEPTIONIST', 'CASHIER', 'CLEANER'],
  MAKEUP_STUDIO:     ['MANAGER', 'TECHNICIAN', 'RECEPTIONIST', 'CASHIER', 'CLEANER'],
  COFFEE_SHOP:       ['MANAGER', 'CASHIER', 'SERVICE_STAFF', 'CLEANER'],
  RESTAURANT:        ['MANAGER', 'CASHIER', 'SERVICE_STAFF', 'ACCOUNTANT', 'CLEANER'],
  OTHER:             ['MANAGER', 'CASHIER', 'CLEANER'],
};

const ALL_FILTERABLE_ROLES = [
  'MANAGER', 'CASHIER', 'RECEPTIONIST', 'TECHNICIAN', 'SERVICE_STAFF',
  'ACCOUNTANT', 'WAREHOUSE_STAFF', 'PAWN_OFFICER', 'CLEANER',
];

// ── Main screen ────────────────────────────────────────────────────────────────

type StatusFilter = 'all' | 'active' | 'inactive';
type RoleFilter = 'all' | 'MANAGER' | 'CASHIER' | 'RECEPTIONIST' | 'TECHNICIAN' | 'SERVICE_STAFF' | 'ACCOUNTANT' | 'WAREHOUSE_STAFF' | 'PAWN_OFFICER' | 'CLEANER';

type Props = MoreScreenProps<'StaffList'>;

export function StaffListScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const typo = useTypography();
  const { top, bottom } = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [search, setSearch] = useState('');
  const [analyticsExpanded, setAnalyticsExpanded] = useState(true);
  const [performanceExpanded, setPerformanceExpanded] = useState(false);
  const queryClient = useQueryClient();
  const shopTypeCode = useAuthStore((s) => s.shopTypeCode);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['shopUsers'],
    queryFn: () => shopUserApi.list().then((r) => r.data.data),
    staleTime: 120_000,
  });

  // ── This-month revenue stats for rank badges on each card ─────────────────
  const { data: monthAnalytics } = useQuery({
    queryKey: ['employee-analytics-month', THIS_MONTH.from, THIS_MONTH.to],
    queryFn: () =>
      employeeApi.analytics({ from: THIS_MONTH.from, to: THIS_MONTH.to, granularity: 'day', limit: 999 })
        .then((r) => r.data.data),
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
  });

  // userId → { rank (1-based), revenue, orderCount }
  // Users not in the ranking get rank:0 once analytics is loaded
  const statsMap = useMemo<Map<string, StaffStats>>(() => {
    const map = new Map<string, StaffStats>();
    if (!monthAnalytics) return map;
    monthAnalytics.rankingRevenue.forEach((item, index) => {
      if (item.userId) {
        map.set(item.userId, { rank: index + 1, revenue: item.revenue, orderCount: item.orderCount });
      }
    });
    return map;
  }, [monthAnalytics]);

  // True once the analytics response has arrived (even if empty)
  const statsReady = monthAnalytics != null;

  const allUsers = data?.content ?? [];
  const users = allUsers.filter((u) => {
    const matchStatus =
      statusFilter === 'active' ? u.active && u.accountNonLocked :
      statusFilter === 'inactive' ? (!u.active || !u.accountNonLocked) : true;
    if (!matchStatus) return false;
    if (roleFilter !== 'all' && !u.roles.some((r) => r.name === roleFilter)) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (u.fullName ?? '').toLowerCase().includes(q) || u.username.toLowerCase().includes(q);
  });

  const STATUS_CHIPS: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: t('staff.filterAll') },
    { key: 'active', label: t('staff.filterActive') },
    { key: 'inactive', label: t('staff.filterInactive') },
  ];

  // Only show roles relevant to this shop's type; fall back to all roles for unknown types.
  const visibleRoles = ROLES_FOR_SHOP_TYPE[shopTypeCode ?? ''] ?? ALL_FILTERABLE_ROLES;

  const ROLE_CHIPS: { key: RoleFilter; label: string }[] = [
    { key: 'all', label: t('staff.filterAll') },
    ...visibleRoles.map((role) => ({
      key: role as RoleFilter,
      label: t(`roles.${role}`, { defaultValue: role }),
    })),
  ];

  // Count per status chip — respects current role filter + search so the
  // numbers reflect "how many would appear if I tap this chip".
  const statusCounts = useMemo<Record<StatusFilter, number>>(() => {
    const base = allUsers.filter((u) => {
      if (roleFilter !== 'all' && !u.roles.some((r) => r.name === roleFilter)) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (u.fullName ?? '').toLowerCase().includes(q) || u.username.toLowerCase().includes(q);
    });
    return {
      all:      base.length,
      active:   base.filter((u) =>  u.active && u.accountNonLocked).length,
      inactive: base.filter((u) => !u.active || !u.accountNonLocked).length,
    };
  }, [allUsers, roleFilter, search]);

  // Count per role chip — respects current status filter + search.
  const roleCounts = useMemo<Record<string, number>>(() => {
    const base = allUsers.filter((u) => {
      const matchStatus =
        statusFilter === 'active'   ? u.active && u.accountNonLocked :
        statusFilter === 'inactive' ? (!u.active || !u.accountNonLocked) : true;
      if (!matchStatus) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (u.fullName ?? '').toLowerCase().includes(q) || u.username.toLowerCase().includes(q);
    });
    const counts: Record<string, number> = { all: base.length };
    for (const role of visibleRoles) {
      counts[role] = base.filter((u) => u.roles.some((r) => r.name === role)).length;
    }
    return counts;
  }, [allUsers, statusFilter, search, visibleRoles]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['shopUsers'] });
    setRefreshing(false);
  }, [queryClient]);

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <View
        className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4"
        style={{ paddingTop: top + 12, paddingBottom: 12 }}
      >
        <View className="flex-row items-center mb-0.5">
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} className="mr-2">
            <MaterialCommunityIcons name="chevron-left" size={26} color="#4f46e5" />
          </TouchableOpacity>
          <Text className={`${typo.heading} text-gray-900 dark:text-white flex-1`}>{t('staff.title')}</Text>
          {/* Invite button — leads to code generator */}
          <TouchableOpacity
            onPress={() => navigation.navigate('GenerateInvite')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            className="mr-3"
          >
            <MaterialCommunityIcons name="account-plus-outline" size={22} color="#4f46e5" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('StaffForm', {})} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialCommunityIcons name="plus" size={24} color="#4f46e5" />
          </TouchableOpacity>
        </View>
        <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 mb-3 mt-0.5`}>{t('staff.hint')}</Text>
        {/* Search */}
        <View className="flex-row items-center bg-gray-100 dark:bg-gray-700 rounded-xl px-3 py-2.5 mb-3">
          <MaterialCommunityIcons name="magnify" size={20} color="#9ca3af" />
          <TextInput
            className={`flex-1 ml-2 ${typo.inputSize} text-gray-800 dark:text-gray-100`}
            placeholder={t('staff.searchPlaceholder')}
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
        <View className="flex-row gap-2">
          {STATUS_CHIPS.map((chip) => {
            const active = statusFilter === chip.key;
            const count  = statusCounts[chip.key];
            return (
              <TouchableOpacity key={chip.key} onPress={() => setStatusFilter(chip.key)}
                className={`flex-row items-center gap-1.5 px-3.5 py-1.5 rounded-full border ${active ? 'bg-indigo-600 border-indigo-600' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600'}`}>
                <Text className={`${typo.caption} font-medium ${active ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`}>{chip.label}</Text>
                {allUsers.length > 0 && (
                  <View className={`rounded-full px-1.5 py-0.5 min-w-[18px] items-center ${active ? 'bg-white/25' : 'bg-gray-100 dark:bg-gray-700'}`}>
                    <Text className={`${typo.captionBold} ${active ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`}>{count}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingTop: 8 }}>
          {ROLE_CHIPS.map((chip) => {
            const active = roleFilter === chip.key;
            const count  = roleCounts[chip.key] ?? 0;
            return (
              <TouchableOpacity key={chip.key} onPress={() => setRoleFilter(chip.key)}
                className={`flex-row items-center gap-1.5 px-3.5 py-1.5 rounded-full border ${active ? 'bg-violet-600 border-violet-600' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600'}`}>
                <Text className={`${typo.caption} font-medium ${active ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`}>{chip.label}</Text>
                {allUsers.length > 0 && (
                  <View className={`rounded-full px-1.5 py-0.5 min-w-[18px] items-center ${active ? 'bg-white/25' : 'bg-gray-100 dark:bg-gray-700'}`}>
                    <Text className={`${typo.captionBold} ${active ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`}>{count}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {isError ? (
        <ErrorState onRetry={refetch} />
      ) : isLoading ? (
        <View className="px-4 pt-4 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <View key={i} className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700">
              <View className="flex-row items-center">
                <Skeleton width={44} height={44} borderRadius={22} style={{ marginRight: 12 }} />
                <View className="flex-1 gap-2">
                  <Skeleton width="55%" height={15} />
                  <Skeleton width="38%" height={12} />
                </View>
                <Skeleton width={52} height={14} borderRadius={6} />
              </View>
              <View className="flex-row gap-1.5 mt-3 pt-3 border-t border-gray-50 dark:border-gray-700">
                <Skeleton width={72} height={20} borderRadius={8} />
              </View>
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 4, paddingTop: 16, paddingBottom: bottom + 96 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#059669" />}
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
                      {t('staff.analytics.toggleLabel')}
                    </Text>
                  </View>
                  <MaterialCommunityIcons name={analyticsExpanded ? 'chevron-up' : 'chevron-down'} size={20} color="#9ca3af" />
                </TouchableOpacity>
              </View>

              {analyticsExpanded && <AnalyticsSection />}

              {/* ── Performance collapsible header ── */}
              <View className="mx-4 mb-3">
                <TouchableOpacity
                  onPress={() => setPerformanceExpanded((v) => !v)}
                  activeOpacity={0.7}
                  className="bg-white dark:bg-gray-800 rounded-2xl px-4 py-3.5 border border-gray-100 dark:border-gray-700 flex-row items-center justify-between"
                >
                  <View className="flex-row items-center gap-2">
                    <MaterialCommunityIcons name="account-clock-outline" size={18} color="#7c3aed" />
                    <Text className={`${typo.labelBold} text-gray-800 dark:text-gray-200`}>
                      {t('perf.title')}
                    </Text>
                  </View>
                  <MaterialCommunityIcons name={performanceExpanded ? 'chevron-up' : 'chevron-down'} size={20} color="#9ca3af" />
                </TouchableOpacity>
              </View>

              {performanceExpanded && <PerformanceSection />}

              {/* Empty state */}
              {users.length === 0 && (
                <View className="items-center py-16">
                  <MaterialCommunityIcons name="account-multiple-outline" size={48} color="#d1d5db" />
                  <Text className={`${typo.body} text-gray-400 mt-3`}>
                    {search.trim() ? t('staff.noResults') : t('staff.noStaff')}
                  </Text>
                  {!search.trim() && (
                    <Text className={`${typo.caption} text-gray-400 mt-1 text-center px-8`}>{t('staff.noStaffHint')}</Text>
                  )}
                </View>
              )}
            </>
          }
          renderItem={({ item, index }) => (
            <View className="px-4">
              <StaffRow
                item={item}
                index={index}
                stats={statsReady ? (statsMap.get(item.id) ?? { rank: 0, revenue: 0, orderCount: 0 }) : undefined}
                onPress={() => navigation.navigate('StaffDetail', { userId: item.id })}
              />
            </View>
          )}
          ListFooterComponent={refreshing ? <View className="py-4 items-center"><ActivityIndicator size="small" color="#4f46e5" /></View> : null}
        />
      )}

      <TouchableOpacity
        testID="staff-add-fab"
        onPress={() => navigation.navigate('StaffForm', {})}
        activeOpacity={0.85}
        className="absolute right-5 bg-indigo-600 rounded-full w-14 h-14 items-center justify-center shadow-lg"
        style={{
          bottom: bottom + 16,
          elevation: 6,
          shadowColor: '#4f46e5',
          shadowOpacity: 0.4,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 4 },
        }}
      >
        <MaterialCommunityIcons name="plus" size={28} color="white" />
      </TouchableOpacity>
    </View>
  );
}
