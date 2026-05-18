import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { orderApi, employeeApi, type WorkItemDTO, type EmployeeData } from '../../services/api';
import { useTypography } from '../../hooks/useTypography';
import { formatVnd } from '../../utils/format';
import { Skeleton } from '../../components/Skeleton';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import type { MoreScreenProps } from '../../types/navigation';

type Props = MoreScreenProps<'StaffPerformance'>;
type FilterType = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';

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

// ── helpers ───────────────────────────────────────────────────────────────────

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

function avatarColor(name: string): string {
  const COLORS = ['#4f46e5', '#0891b2', '#059669', '#d97706', '#7c3aed', '#dc2626', '#2563eb', '#16a34a'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
}

function buildStats(items: WorkItemDTO[], employees: EmployeeData[]): EmpStats[] {
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
      return {
        name: name || '—',
        position: emp?.position ?? null,
        commissionRate,
        count: b.count,
        revenue: b.revenue,
        durationMinutes: b.durationMinutes,
        avgDuration,
        estimatedCommission,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);
}

// ── sub-components ────────────────────────────────────────────────────────────

const RANK_COLORS = ['#f59e0b', '#9ca3af', '#cd7f32'];

function RankBadge({ rank }: { rank: number }) {
  const color = rank <= 3 ? RANK_COLORS[rank - 1] : '#d1d5db';
  return (
    <View
      style={{ backgroundColor: color + '25', width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }}
    >
      <Text style={{ color, fontSize: 12, fontWeight: '700' }}>#{rank}</Text>
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

function EmpCard({ stats, rank, maxRevenue }: { stats: EmpStats; rank: number; maxRevenue: number }) {
  const { t } = useTranslation();
  const typo = useTypography();
  const color = avatarColor(stats.name);
  const initial = stats.name.split(' ').slice(-1)[0]?.charAt(0).toUpperCase() ?? '?';
  const barFlex = maxRevenue > 0 ? stats.revenue / maxRevenue : 0;

  return (
    <View testID={`staff-perf-card-${stats.name}`} className="bg-white dark:bg-gray-800 rounded-2xl p-4 mb-3 border border-gray-100 dark:border-gray-700">
      {/* Name row */}
      <View className="flex-row items-center mb-3">
        <RankBadge rank={rank} />
        <View
          style={{ backgroundColor: color + '20', width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}
          className="mx-3"
        >
          <Text style={{ color, fontSize: 16, fontWeight: '700' }}>{initial}</Text>
        </View>
        <View className="flex-1">
          <Text className={`${typo.labelBold} text-gray-900 dark:text-white`} numberOfLines={1}>
            {stats.name}
          </Text>
          {stats.position ? (
            <Text className={`${typo.caption} text-gray-400 dark:text-gray-500`}>{stats.position}</Text>
          ) : null}
        </View>
      </View>

      {/* Stats row */}
      <View className="flex-row border-t border-gray-50 dark:border-gray-700 pt-3 mb-3">
        <StatCell label={t('perf.services')} value={String(stats.count)} color="#4f46e5" />
        <View className="w-px bg-gray-100 dark:bg-gray-700" />
        <StatCell label={t('perf.revenue')} value={formatVnd(stats.revenue)} color="#059669" />
        <View className="w-px bg-gray-100 dark:bg-gray-700" />
        <StatCell label={t('perf.avgDuration')} value={fmtDuration(stats.avgDuration)} color="#6b7280" />
      </View>

      {/* Relative revenue bar */}
      <View className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full mb-2 overflow-hidden flex-row">
        <View style={{ flex: barFlex, backgroundColor: color }} />
        <View style={{ flex: Math.max(1 - barFlex, 0) }} />
      </View>

      {/* Commission */}
      {stats.commissionRate !== null && (
        <View className="flex-row items-center justify-between mt-1.5">
          <Text className={`${typo.caption} text-gray-400 dark:text-gray-500`}>
            {t('perf.commission')} ({stats.commissionRate}%)
          </Text>
          <Text className={`${typo.captionBold} text-amber-600 dark:text-amber-400`}>
            {formatVnd(stats.estimatedCommission)}
          </Text>
        </View>
      )}
    </View>
  );
}

function LoadingSkeleton() {
  return (
    <View className="px-4 pt-4 gap-3">
      {[0, 1, 2, 3].map((i) => (
        <View key={i} className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700">
          <View className="flex-row items-center mb-3">
            <Skeleton width={28} height={28} borderRadius={8} />
            <Skeleton width={40} height={40} borderRadius={20} style={{ marginHorizontal: 12 }} />
            <View className="flex-1 gap-2">
              <Skeleton width="55%" height={14} />
              <Skeleton width="35%" height={11} />
            </View>
          </View>
          <View className="flex-row pt-3 border-t border-gray-50 gap-1">
            <Skeleton width="30%" height={40} borderRadius={8} />
            <Skeleton width="30%" height={40} borderRadius={8} />
            <Skeleton width="30%" height={40} borderRadius={8} />
          </View>
          <Skeleton height={6} borderRadius={3} style={{ marginTop: 12 }} />
        </View>
      ))}
    </View>
  );
}

// ── main screen ───────────────────────────────────────────────────────────────

export function StaffPerformanceScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const typo = useTypography();
  const { top, bottom } = useSafeAreaInsets();

  const today = getTodayParts();
  const [filterType, setFilterType] = useState<FilterType>('DAY');
  const [day, setDay] = useState(today.day);
  const [month, setMonth] = useState(today.month);
  const [year, setYear] = useState(today.year);

  const currentYear = today.year;
  const YEARS = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];
  const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  const FILTERS: { key: FilterType; label: string }[] = [
    { key: 'DAY', label: t('myWork.filterDay') },
    { key: 'WEEK', label: t('myWork.filterWeek') },
    { key: 'MONTH', label: t('myWork.filterMonth') },
    { key: 'YEAR', label: t('myWork.filterYear') },
  ];

  const filterParams = { filterType, day, month, year };

  function shiftDay(delta: number) {
    const d = new Date(year, month - 1, day);
    d.setDate(d.getDate() + delta);
    setDay(d.getDate());
    setMonth(d.getMonth() + 1);
    setYear(d.getFullYear());
  }

  function shiftWeek(delta: number) {
    const d = new Date(year, month - 1, day);
    d.setDate(d.getDate() + delta * 7);
    setDay(d.getDate());
    setMonth(d.getMonth() + 1);
    setYear(d.getFullYear());
  }

  const [isManualRefreshing, setIsManualRefreshing] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['staffPerf', filterType, day, month, year],
    queryFn: async () => {
      const [itemsRes, empRes] = await Promise.all([
        orderApi.completedWorkItems({ ...filterParams, size: 500 }),
        employeeApi.listActive(),
      ]);
      return {
        items: itemsRes.data.data.content,
        employees: empRes.data.data,
      };
    },
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });

  const { rows, maxRevenue } = useMemo(() => {
    if (!data) return { rows: [], maxRevenue: 0 };
    const stats = buildStats(data.items, data.employees);
    const max = stats[0]?.revenue ?? 0;
    return { rows: stats, maxRevenue: max };
  }, [data]);

  const onRefresh = useCallback(async () => {
    setIsManualRefreshing(true);
    await refetch();
    setIsManualRefreshing(false);
  }, [refetch]);

  const DateNav = (
    <View className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 py-3">
      {filterType === 'DAY' && (
        <View className="flex-row items-center justify-between">
          <TouchableOpacity onPress={() => shiftDay(-1)} className="p-1" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialCommunityIcons name="chevron-left" size={22} color="#4f46e5" />
          </TouchableOpacity>
          <Text className={`${typo.label} text-gray-800 dark:text-white`}>{day}/{month}/{year}</Text>
          <TouchableOpacity onPress={() => shiftDay(1)} className="p-1" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialCommunityIcons name="chevron-right" size={22} color="#4f46e5" />
          </TouchableOpacity>
        </View>
      )}

      {filterType === 'WEEK' && (
        <View className="flex-row items-center justify-between">
          <TouchableOpacity onPress={() => shiftWeek(-1)} className="p-1" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialCommunityIcons name="chevron-left" size={22} color="#4f46e5" />
          </TouchableOpacity>
          <Text className={`${typo.label} text-gray-800 dark:text-white`}>
            {formatWeekLabel(day, month, year)}
          </Text>
          <TouchableOpacity onPress={() => shiftWeek(1)} className="p-1" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialCommunityIcons name="chevron-right" size={22} color="#4f46e5" />
          </TouchableOpacity>
        </View>
      )}

      {filterType === 'MONTH' && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {MONTHS.map((m) => (
            <TouchableOpacity
              key={m}
              onPress={() => setMonth(m)}
              className={`px-3 py-1 rounded-full border ${month === m ? 'bg-indigo-600 border-indigo-600' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600'}`}
            >
              <Text className={`${typo.captionBold} ${month === m ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                T{m}/{year}
              </Text>
            </TouchableOpacity>
          ))}
          {YEARS.map((y) => (
            <TouchableOpacity
              key={y}
              onPress={() => setYear(y)}
              className={`px-3 py-1 rounded-full border ${year === y ? 'border-indigo-600' : 'border-gray-200 dark:border-gray-600'}`}
            >
              <Text className={`${typo.caption} text-gray-500 dark:text-gray-400`}>{y}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {filterType === 'YEAR' && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {YEARS.map((y) => (
            <TouchableOpacity
              key={y}
              onPress={() => setYear(y)}
              className={`px-4 py-1.5 rounded-full border ${year === y ? 'bg-indigo-600 border-indigo-600' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600'}`}
            >
              <Text className={`${typo.caption} font-medium ${year === y ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`}>{y}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
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
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="mr-3"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons name="chevron-left" size={26} color="#4f46e5" />
          </TouchableOpacity>
          <Text className={`${typo.heading} text-gray-900 dark:text-white flex-1`}>
            {t('perf.title')}
          </Text>
        </View>
        <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 mb-2 mt-0.5`}>{t('perf.hint')}</Text>

        {/* Period filter tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
          {FILTERS.map((f) => {
            const active = filterType === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                onPress={() => setFilterType(f.key)}
                className={`px-4 py-1.5 rounded-full border ${active ? 'bg-indigo-600 border-indigo-600' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600'}`}
              >
                <Text className={`${typo.caption} font-medium ${active ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {isLoading ? (
        <>
          {DateNav}
          <LoadingSkeleton />
        </>
      ) : isError ? (
        <>
          {DateNav}
          <ErrorState onRetry={refetch} />
        </>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.name}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, paddingBottom: bottom + 24, flexGrow: 1 }}
          refreshControl={
            <RefreshControl refreshing={isManualRefreshing} onRefresh={onRefresh} tintColor="#4f46e5" />
          }
          ListHeaderComponent={DateNav}
          stickyHeaderIndices={[0]}
          renderItem={({ item, index }) => (
            <EmpCard stats={item} rank={index + 1} maxRevenue={maxRevenue} />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="🌟"
              title={t('perf.empty')}
              description={t('perf.emptyHint')}
            />
          }
        />
      )}
    </View>
  );
}
