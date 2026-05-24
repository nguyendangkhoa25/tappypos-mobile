import { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { shopUserApi, employeeApi, orderApi, shopConfigApi, type WorkItemDTO } from '../../services/api';
import { useFeatureCheck } from '../../hooks/useFeature';
import { useAuthStore } from '../../store/authStore';
import { formatVnd, formatDate } from '../../utils/format';
import { useTypography } from '../../hooks/useTypography';
import { Skeleton } from '../../components/Skeleton';
import { ErrorState } from '../../components/ErrorState';
import { TrendChart } from '../../components/TrendChart';
import type { ChartGranularity } from '../../components/BarChart';
import type { MoreScreenProps } from '../../types/navigation';

type Props = MoreScreenProps<'StaffDetail'>;

const SERVICE_SHOP_TYPES = new Set([
  'BARBER_SHOP', 'BARBER_SHOP_MEN', 'HAIR_SALON', 'NAIL_SHOP',
  'LASH_PMU_STUDIO', 'SPA_SHOP', 'MASSAGE_SHOP', 'BEAUTY_CLINIC', 'MAKEUP_STUDIO',
]);

// ── Role colour map ────────────────────────────────────────────────────────────
const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  SHOP_OWNER:      { bg: '#fef3c7', text: '#92400e' },
  MANAGER:         { bg: '#ede9fe', text: '#4c1d95' },
  CASHIER:         { bg: '#dbeafe', text: '#1e40af' },
  RECEPTIONIST:    { bg: '#d1fae5', text: '#065f46' },
  ACCOUNTANT:      { bg: '#fce7f3', text: '#831843' },
  WAREHOUSE_STAFF: { bg: '#ffedd5', text: '#7c2d12' },
  SERVICE_STAFF:   { bg: '#cffafe', text: '#164e63' },
  TECHNICIAN:      { bg: '#f0fdf4', text: '#14532d' },
  CLEANER:         { bg: '#f1f5f9', text: '#334155' },
};
const DEFAULT_ROLE_COLOR = { bg: '#e0e7ff', text: '#3730a3' };
function roleBadgeColor(roleName: string) {
  return ROLE_COLORS[roleName] ?? DEFAULT_ROLE_COLOR;
}

// Status colour helper (matches StaffFormScreen)
function statusColor(status: string) {
  if (status === 'COMPLETED')  return '#10b981';
  if (status === 'CANCELLED')  return '#ef4444';
  if (status === 'PENDING')    return '#f59e0b';
  return '#3b82f6'; // IN_PROGRESS
}

// ── Work-performance helpers ──────────────────────────────────────────────────

type PerfFilterType = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';

function fmtDuration(min: number): string {
  if (min <= 0) return '—';
  if (min < 60) return `${min}p`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h${m}p` : `${h}h`;
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

type ServiceBreakdownItem = {
  productName: string;
  count: number;
  revenue: number;
  avgDuration: number;
  items: WorkItemDTO[];
};

function buildServiceBreakdown(items: WorkItemDTO[]): ServiceBreakdownItem[] {
  const map = new Map<string, { count: number; revenue: number; timedCount: number; totalDuration: number; items: WorkItemDTO[] }>();
  for (const item of items) {
    if (!map.has(item.productName)) map.set(item.productName, { count: 0, revenue: 0, timedCount: 0, totalDuration: 0, items: [] });
    const b = map.get(item.productName)!;
    b.count += item.quantity;
    b.revenue += item.amount;
    b.items.push(item);
    if (item.durationMinutes > 0) {
      b.timedCount += item.quantity;
      b.totalDuration += item.durationMinutes * item.quantity;
    }
  }
  return Array.from(map.entries())
    .map(([productName, b]) => ({
      productName,
      count: b.count,
      revenue: b.revenue,
      avgDuration: b.timedCount > 0 ? Math.round(b.totalDuration / b.timedCount) : 0,
      items: b.items.sort((a, b) => new Date(b.completedAt ?? b.orderCreatedAt).getTime() - new Date(a.completedAt ?? a.orderCreatedAt).getTime()),
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

export function StaffDetailScreen({ navigation, route }: Props) {
  const { userId } = route.params;
  const { t } = useTranslation();
  const typo = useTypography();
  const insets = useSafeAreaInsets();
  const has = useFeatureCheck();
  const features = useAuthStore((s) => s.features);
  const currentUserId = useAuthStore((s) => s.currentUserId);
  const canViewAllOrders = features.includes('ORDER_VIEW_ALL');

  // ── Local state ──────────────────────────────────────────────────────────────
  const [chartGranularity, setChartGranularity] = useState<ChartGranularity>('day');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('ALL');

  // Work-performance filter state
  const [workPerfFilter, setWorkPerfFilter] = useState<PerfFilterType>('DAY');
  const [workPerfDay, setWorkPerfDay] = useState(() => new Date().getDate());
  const [workPerfMonth, setWorkPerfMonth] = useState(() => new Date().getMonth() + 1);
  const [workPerfYear, setWorkPerfYear] = useState(() => new Date().getFullYear());
  const [expandedServices, setExpandedServices] = useState<Set<string>>(new Set());

  // ── Queries ─────────────────────────────────────────────────────────────────
  const {
    data: user,
    isLoading: userLoading,
    isError: userError,
    refetch: refetchUser,
  } = useQuery({
    queryKey: ['shopUser', userId],
    queryFn: () => shopUserApi.getById(userId).then((r) => r.data.data),
    staleTime: 120_000,
  });

  // A user must never edit their own employee record.
  // JWT `sub` is the username string (e.g. "0901234567.shopABC"), NOT the UUID.
  // Compare against user.username once the query resolves — never against the route-param UUID.
  const isSelf = currentUserId != null && user != null && currentUserId === user.username;

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['employeeProfile', userId],
    queryFn: () => employeeApi.getByUserId(userId).then((r) => r.data),
    staleTime: 120_000,
    enabled: !!user,
  });

  const { data: shopInfo } = useQuery({
    queryKey: ['shopConfig'],
    queryFn: () => shopConfigApi.getInfo().then((r) => r.data.data),
    staleTime: 10 * 60_000,
  });
  const isServiceShop = SERVICE_SHOP_TYPES.has(shopInfo?.shopTypeCode ?? '');

  // The name used as grouping key in completedWorkItems
  const employeeName = profile?.fullName ?? user?.fullName ?? null;

  const { data: workItems, isFetching: workItemsFetching } = useQuery({
    queryKey: ['staffWorkItems', employeeName, workPerfFilter, workPerfDay, workPerfMonth, workPerfYear],
    queryFn: async () => {
      const res = await orderApi.completedWorkItems({
        filterType: workPerfFilter,
        day: workPerfDay,
        month: workPerfMonth,
        year: workPerfYear,
        size: 500,
      });
      const content = res.data.data?.content ?? [];
      return content.filter((item) => item.assignedEmployeeName === employeeName);
    },
    staleTime: 60_000,
    enabled: isServiceShop && employeeName !== null,
    placeholderData: keepPreviousData,
  });

  const { workPerfStats, serviceBreakdown, maxServiceRevenue } = useMemo(() => {
    if (!workItems?.length) return { workPerfStats: null, serviceBreakdown: [] as ServiceBreakdownItem[], maxServiceRevenue: 0 };
    const count = workItems.reduce((s, i) => s + i.quantity, 0);
    const revenue = workItems.reduce((s, i) => s + i.amount, 0);
    const timedItems = workItems.filter((i) => i.durationMinutes > 0);
    const timedCount = timedItems.reduce((s, i) => s + i.quantity, 0);
    const totalDuration = timedItems.reduce((s, i) => s + i.durationMinutes * i.quantity, 0);
    const avgDuration = timedCount > 0 ? Math.round(totalDuration / timedCount) : 0;
    const commissionRate = profile?.commissionRate ?? null;
    const estimatedCommission = commissionRate !== null ? Math.round(revenue * commissionRate / 100) : null;
    const breakdown = buildServiceBreakdown(workItems);
    return {
      workPerfStats: { count, revenue, avgDuration, commissionRate, estimatedCommission },
      serviceBreakdown: breakdown,
      maxServiceRevenue: breakdown[0]?.revenue ?? 0,
    };
  }, [workItems, profile?.commissionRate]);

  const staffUsername = user?.username ?? null;

  // Chart date range derived from granularity
  const chartRange = useMemo(() => {
    const to = new Date();
    const days = chartGranularity === 'year' ? 1095 : chartGranularity === 'month' ? 365 : chartGranularity === 'week' ? 84 : 30;
    const from = new Date(to);
    from.setDate(from.getDate() - days);
    const fmt = (d: Date) => d.toISOString().split('T')[0];
    return { from: fmt(from), to: fmt(to) };
  }, [chartGranularity]);

  // Fixed 30-day summary range
  const summaryRange = useMemo(() => {
    const to = new Date();
    const from = new Date(to);
    from.setDate(from.getDate() - 30);
    const fmt = (d: Date) => d.toISOString().split('T')[0];
    return { from: fmt(from), to: fmt(to) };
  }, []);

  const { data: staffSummary } = useQuery({
    queryKey: ['staffSummary', staffUsername, summaryRange.from, summaryRange.to],
    queryFn: () => orderApi.staffSummary({ createdBy: staffUsername!, ...summaryRange }).then((r) => r.data.data),
    staleTime: 5 * 60_000,
    enabled: !!staffUsername && canViewAllOrders,
  });

  const { data: staffChartData, isFetching: chartFetching } = useQuery({
    queryKey: ['staffChart', staffUsername, chartRange.from, chartRange.to, chartGranularity],
    queryFn: () =>
      orderApi.staffChart({ createdBy: staffUsername!, ...chartRange, granularity: chartGranularity })
        .then((r) => r.data.data),
    staleTime: 5 * 60_000,
    enabled: !!staffUsername && canViewAllOrders,
    placeholderData: (prev) => prev,  // keep previous chart visible while new granularity loads
  });

  const { data: staffOrdersData, isLoading: ordersLoading, isFetching: ordersFetching } = useQuery({
    queryKey: ['staffOrders', staffUsername, orderStatusFilter],
    queryFn: () =>
      orderApi.staffOrders({
        createdBy: staffUsername!,
        status: orderStatusFilter === 'ALL' ? undefined : orderStatusFilter,
      }).then((r) => r.data.data),
    staleTime: 2 * 60_000,
    enabled: !!staffUsername && canViewAllOrders,
    placeholderData: (prev) => prev,  // keep previous list visible while new filter loads
  });

  // ── Derived ──────────────────────────────────────────────────────────────────
  const displayName = profile?.fullName || user?.fullName || user?.username || '?';
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(-2)
    .map((w: string) => w[0].toUpperCase())
    .join('');

  const isLoading = userLoading || profileLoading;

  // ── Loading skeleton ─────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View className="flex-1 bg-gray-50 dark:bg-gray-900">
        <View
          className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4"
          style={{ paddingTop: insets.top + 12, paddingBottom: 14 }}
        >
          <View className="flex-row items-center mb-0.5">
            <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialCommunityIcons name="chevron-left" size={26} color="#4f46e5" />
            </TouchableOpacity>
            <Skeleton height={22} width={160} borderRadius={6} style={{ flex: 1 }} />
            <Skeleton height={24} width={24} borderRadius={12} />
          </View>
          <Skeleton height={14} width={200} borderRadius={4} style={{ marginLeft: 36 }} />
        </View>
        <View className="bg-primary px-4 pb-6 pt-5">
          <View className="flex-row items-center" style={{ gap: 14 }}>
            <Skeleton height={72} width={72} borderRadius={36} />
            <View style={{ gap: 8, flex: 1 }}>
              <Skeleton height={20} width="70%" borderRadius={6} />
              <Skeleton height={14} width="45%" borderRadius={4} />
              <Skeleton height={24} width={90} borderRadius={20} />
            </View>
          </View>
        </View>
        <View className="px-4 pt-4" style={{ gap: 12 }}>
          <Skeleton height={120} borderRadius={16} />
          <Skeleton height={80} borderRadius={16} />
        </View>
      </View>
    );
  }

  if (userError || !user) return <ErrorState onRetry={refetchUser} />;

  // ── Work-perf date navigation helpers ────────────────────────────────────────
  function shiftWorkDay(delta: number) {
    const d = new Date(workPerfYear, workPerfMonth - 1, workPerfDay);
    d.setDate(d.getDate() + delta);
    setWorkPerfDay(d.getDate()); setWorkPerfMonth(d.getMonth() + 1); setWorkPerfYear(d.getFullYear());
  }
  function shiftWorkWeek(delta: number) {
    const d = new Date(workPerfYear, workPerfMonth - 1, workPerfDay);
    d.setDate(d.getDate() + delta * 7);
    setWorkPerfDay(d.getDate()); setWorkPerfMonth(d.getMonth() + 1); setWorkPerfYear(d.getFullYear());
  }
  function toggleService(name: string) {
    setExpandedServices((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  }

  const perfCurrentYear = new Date().getFullYear();
  const PERF_YEARS = [perfCurrentYear - 2, perfCurrentYear - 1, perfCurrentYear, perfCurrentYear + 1];
  const PERF_MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const PERF_FILTERS: { key: PerfFilterType; label: string }[] = [
    { key: 'DAY',   label: t('myWork.filterDay') },
    { key: 'WEEK',  label: t('myWork.filterWeek') },
    { key: 'MONTH', label: t('myWork.filterMonth') },
    { key: 'YEAR',  label: t('myWork.filterYear') },
  ];

  const ORDER_STATUS_FILTERS = isServiceShop
    ? ['ALL', 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const
    : ['ALL', 'COMPLETED', 'CANCELLED'] as const;

  const statusLabel = (s: string) => {
    if (s === 'ALL')         return t('staff.orderStatusAll');
    if (s === 'PENDING')     return t('staff.orderStatusPending');
    if (s === 'IN_PROGRESS') return 'Đang làm';
    if (s === 'COMPLETED')   return t('staff.orderStatusCompleted');
    return t('staff.orderStatusCancelled');
  };

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* ── Nav header ── */}
      <View
        className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4"
        style={{ paddingTop: insets.top + 12, paddingBottom: 14 }}
      >
        <View className="flex-row items-center mb-0.5">
          <TouchableOpacity
            className="mr-3"
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons name="chevron-left" size={26} color="#4f46e5" />
          </TouchableOpacity>
          <Text className={`${typo.heading} text-gray-900 dark:text-white flex-1`} numberOfLines={1}>
            {t('staff.detailTitle')}
          </Text>
          {!isSelf && (
            <TouchableOpacity
              onPress={() => navigation.navigate('StaffForm', { userId })}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialCommunityIcons name="pencil-outline" size={22} color="#4f46e5" />
            </TouchableOpacity>
          )}
        </View>
        <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 mt-0.5`}>
          {t('staff.detailHint')}
        </Text>
      </View>

      {/* ── Hero banner ── */}
      <View className="bg-primary px-4 pb-6 pt-5">
        <View className="flex-row items-center" style={{ gap: 14 }}>
          {/* Avatar initials */}
          <View className="w-[72px] h-[72px] rounded-full bg-white/20 items-center justify-center">
            <Text style={{ fontSize: typo.displaySize, fontWeight: '800', color: 'white' }}>{initials}</Text>
          </View>

          {/* Name + username + badges */}
          <View className="flex-1" style={{ gap: 4 }}>
            <Text className={`${typo.heading} text-white`} numberOfLines={1}>{displayName}</Text>
            {profile?.nickName ? (
              <Text className={`${typo.caption} text-indigo-200`}>"{profile.nickName}"</Text>
            ) : null}
            <Text className={`${typo.caption} text-indigo-200`}>@{user.username}</Text>

            <View className="flex-row flex-wrap mt-1" style={{ gap: 6 }}>
              {user.roles.map((r) => {
                const col = roleBadgeColor(r.name);
                return (
                  <View key={r.id} style={{ backgroundColor: col.bg, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 }}>
                    <Text className={`${typo.caption} font-bold`} style={{ color: col.text }}>
                      {t(`roles.${r.name}`, { defaultValue: r.name })}
                    </Text>
                  </View>
                );
              })}
              <View style={{ backgroundColor: user.active ? '#d1fae5' : '#fee2e2', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 }}>
                <Text className={`${typo.caption} font-bold`} style={{ color: user.active ? '#065f46' : '#991b1b' }}>
                  {user.active ? t('staff.active') : t('staff.inactive')}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 4, paddingBottom: 40, gap: 12 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Contact & work info ── */}
        <View className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {(profile?.phone || user.username) ? (
            <InfoRow icon="phone-outline" label={t('staff.phone')} value={profile?.phone ?? user.username} typo={typo} />
          ) : null}
          {profile?.email ? (
            <InfoRow icon="email-outline" label={t('staff.email')} value={profile.email} typo={typo} />
          ) : null}
          {profile?.hireDate ? (
            <InfoRow icon="calendar-account" label={t('staff.hireDate')} value={formatDate(profile.hireDate)} typo={typo} />
          ) : null}
          {has('SALARY') && profile?.baseWage ? (
            <InfoRow icon="cash-multiple" label={t('staff.baseWage')} value={formatVnd(profile.baseWage)} typo={typo} />
          ) : null}
          {has('COMMISSION') && profile?.commissionRate ? (
            <InfoRow icon="percent" label={t('staff.commissionRate')} value={`${profile.commissionRate}%`} typo={typo} last />
          ) : null}
        </View>

        {/* ── Personal info ── */}
        {(profile?.dateOfBirth || profile?.gender || profile?.permanentAddress) ? (
          <View className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {profile.dateOfBirth ? (
              <InfoRow icon="cake-variant-outline" label={t('staff.dateOfBirth')} value={formatDate(profile.dateOfBirth)} typo={typo} />
            ) : null}
            {profile.gender ? (
              <InfoRow
                icon="gender-male-female"
                label={t('staff.gender')}
                value={t(`staff.gender${profile.gender.charAt(0) + profile.gender.slice(1).toLowerCase()}`, { defaultValue: profile.gender })}
                typo={typo}
              />
            ) : null}
            {profile.permanentAddress ? (
              <InfoRow icon="map-marker-outline" label={t('staff.permanentAddress')} value={profile.permanentAddress} typo={typo} last />
            ) : null}
          </View>
        ) : null}

        {/* ── Notes ── */}
        {profile?.notes ? (
          <View className="bg-white rounded-2xl border border-gray-100 p-4">
            <View className="flex-row items-center mb-2" style={{ gap: 6 }}>
              <MaterialCommunityIcons name="text-box-outline" size={16} color="#6b7280" />
              <Text className={`${typo.captionBold} text-gray-500 uppercase tracking-wide`}>
                {t('staff.notes')}
              </Text>
            </View>
            <Text className={`${typo.caption} text-gray-700 leading-6`}>{profile.notes}</Text>
          </View>
        ) : null}

        {/* ── Service Performance (service shops only) ── */}
        {isServiceShop && (
          <>
            <View className="flex-row items-center mt-2" style={{ gap: 6 }}>
              <MaterialCommunityIcons name="account-clock-outline" size={16} color="#6b7280" />
              <Text className={`${typo.captionBold} text-gray-500 uppercase tracking-wide flex-1`}>
                {t('perf.title')}
              </Text>
              {workItemsFetching && <ActivityIndicator size="small" color="#7c3aed" />}
            </View>

            {/* Period filter */}
            <View className="bg-white rounded-2xl border border-gray-100 p-4">
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 12 }}>
                {PERF_FILTERS.map((f) => {
                  const active = workPerfFilter === f.key;
                  return (
                    <TouchableOpacity
                      key={f.key}
                      onPress={() => setWorkPerfFilter(f.key)}
                      className={`px-4 py-1.5 rounded-full border ${active ? 'bg-violet-600 border-violet-600' : 'bg-gray-50 border-gray-200'}`}
                    >
                      <Text className={`${typo.caption} font-medium ${active ? 'text-white' : 'text-gray-600'}`}>{f.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {workPerfFilter === 'DAY' && (
                <View className="flex-row items-center justify-between">
                  <TouchableOpacity onPress={() => shiftWorkDay(-1)} className="p-1" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <MaterialCommunityIcons name="chevron-left" size={22} color="#7c3aed" />
                  </TouchableOpacity>
                  <Text className={`${typo.label} text-gray-800`}>{workPerfDay}/{workPerfMonth}/{workPerfYear}</Text>
                  <TouchableOpacity onPress={() => shiftWorkDay(1)} className="p-1" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <MaterialCommunityIcons name="chevron-right" size={22} color="#7c3aed" />
                  </TouchableOpacity>
                </View>
              )}
              {workPerfFilter === 'WEEK' && (
                <View className="flex-row items-center justify-between">
                  <TouchableOpacity onPress={() => shiftWorkWeek(-1)} className="p-1" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <MaterialCommunityIcons name="chevron-left" size={22} color="#7c3aed" />
                  </TouchableOpacity>
                  <Text className={`${typo.label} text-gray-800`}>{formatWeekLabel(workPerfDay, workPerfMonth, workPerfYear)}</Text>
                  <TouchableOpacity onPress={() => shiftWorkWeek(1)} className="p-1" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <MaterialCommunityIcons name="chevron-right" size={22} color="#7c3aed" />
                  </TouchableOpacity>
                </View>
              )}
              {workPerfFilter === 'MONTH' && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                  {PERF_MONTHS.map((m) => (
                    <TouchableOpacity
                      key={m}
                      onPress={() => setWorkPerfMonth(m)}
                      className={`px-3 py-1 rounded-full border ${workPerfMonth === m ? 'bg-violet-600 border-violet-600' : 'bg-white border-gray-200'}`}
                    >
                      <Text className={`${typo.captionBold} ${workPerfMonth === m ? 'text-white' : 'text-gray-600'}`}>T{m}/{workPerfYear}</Text>
                    </TouchableOpacity>
                  ))}
                  {PERF_YEARS.map((y) => (
                    <TouchableOpacity
                      key={y}
                      onPress={() => setWorkPerfYear(y)}
                      className={`px-3 py-1 rounded-full border ${workPerfYear === y ? 'border-violet-600' : 'border-gray-200'}`}
                    >
                      <Text className={`${typo.caption} text-gray-500`}>{y}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
              {workPerfFilter === 'YEAR' && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                  {PERF_YEARS.map((y) => (
                    <TouchableOpacity
                      key={y}
                      onPress={() => setWorkPerfYear(y)}
                      className={`px-4 py-1.5 rounded-full border ${workPerfYear === y ? 'bg-violet-600 border-violet-600' : 'bg-white border-gray-200'}`}
                    >
                      <Text className={`${typo.caption} font-medium ${workPerfYear === y ? 'text-white' : 'text-gray-600'}`}>{y}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>

            {/* Stat tiles + breakdown */}
            {workPerfStats ? (
              <>
                <View className="flex-row flex-wrap" style={{ gap: 10 }}>
                  <WorkStatTile
                    icon="scissors-cutting"
                    iconBg="#ede9fe"
                    iconColor="#7c3aed"
                    value={String(workPerfStats.count)}
                    label={t('perf.services')}
                  />
                  <WorkStatTile
                    icon="cash-multiple"
                    iconBg="#d1fae5"
                    iconColor="#059669"
                    value={formatVnd(workPerfStats.revenue)}
                    label={t('perf.revenue')}
                  />
                  <WorkStatTile
                    icon="clock-outline"
                    iconBg="#dbeafe"
                    iconColor="#2563eb"
                    value={fmtDuration(workPerfStats.avgDuration)}
                    label={t('perf.avgDuration')}
                  />
                  {workPerfStats.estimatedCommission !== null && (
                    <WorkStatTile
                      icon="percent"
                      iconBg="#fef3c7"
                      iconColor="#d97706"
                      value={formatVnd(workPerfStats.estimatedCommission)}
                      label={`${t('perf.commission')} (${workPerfStats.commissionRate}%)`}
                    />
                  )}
                </View>

                {/* Service breakdown list */}
                {serviceBreakdown.length > 0 && (
                  <View className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                    {/* Section label */}
                    <View className="px-4 pt-4 pb-2 flex-row items-center" style={{ gap: 5 }}>
                      <MaterialCommunityIcons name="format-list-bulleted" size={13} color="#9ca3af" />
                      <Text className={`${typo.captionBold} text-gray-400 uppercase tracking-wide`}>
                        {t('perf.breakdown')}
                      </Text>
                    </View>

                    {serviceBreakdown.map((item, idx) => {
                      const barFlex = maxServiceRevenue > 0 ? item.revenue / maxServiceRevenue : 0;
                      const isExpanded = expandedServices.has(item.productName);
                      const isLast = idx === serviceBreakdown.length - 1;
                      return (
                        <View key={item.productName}>
                          {/* ── Service summary row (tappable) ── */}
                          <TouchableOpacity
                            onPress={() => toggleService(item.productName)}
                            activeOpacity={0.7}
                            className={`px-4 py-3 ${!isLast || isExpanded ? 'border-b border-gray-100' : ''}`}
                          >
                            {/* Name + count + revenue + chevron */}
                            <View className="flex-row items-center mb-1.5">
                              <Text className={`${typo.label} text-gray-800 flex-1`} numberOfLines={1}>
                                {item.productName}
                              </Text>
                              <View className="flex-row items-center" style={{ gap: 8 }}>
                                <View style={{ backgroundColor: '#ede9fe', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 }}>
                                  <Text className={`${typo.caption} font-bold`} style={{ color: '#7c3aed' }}>×{item.count}</Text>
                                </View>
                                <Text className={`${typo.labelBold} text-emerald-600`}>
                                  {formatVnd(item.revenue)}
                                </Text>
                                <MaterialCommunityIcons
                                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                                  size={16}
                                  color="#9ca3af"
                                />
                              </View>
                            </View>
                            {/* Revenue bar */}
                            <View className="h-1 bg-gray-100 rounded-full overflow-hidden flex-row mb-1.5">
                              <View style={{ flex: barFlex, backgroundColor: '#7c3aed', borderRadius: 2 }} />
                              <View style={{ flex: Math.max(1 - barFlex, 0) }} />
                            </View>
                            {/* Avg duration */}
                            {item.avgDuration > 0 && (
                              <View className="flex-row items-center" style={{ gap: 3 }}>
                                <MaterialCommunityIcons name="clock-outline" size={11} color="#9ca3af" />
                                <Text className={`${typo.caption} text-gray-400`}>
                                  {fmtDuration(item.avgDuration)} {t('perf.perSession')}
                                </Text>
                              </View>
                            )}
                          </TouchableOpacity>

                          {/* ── Individual order rows (expanded) ── */}
                          {isExpanded && item.items.map((wi, wiIdx) => {
                            const d = new Date(wi.completedAt ?? wi.orderCreatedAt);
                            const dateStr = `${d.getDate()}/${d.getMonth() + 1}`;
                            const isLastWi = wiIdx === item.items.length - 1;
                            return (
                              <View
                                key={wi.itemId}
                                className={`flex-row items-center px-4 py-2.5 bg-gray-50 ${!isLastWi || !isLast ? 'border-b border-gray-100' : ''}`}
                              >
                                {/* Indent line */}
                                <View className="w-3 mr-2 self-stretch items-center">
                                  <View className="w-px flex-1 bg-gray-200" />
                                </View>
                                {/* Order info */}
                                <View className="flex-1">
                                  <View className="flex-row items-center" style={{ gap: 5 }}>
                                    <Text className={`${typo.captionBold} text-indigo-600`}>
                                      #{wi.orderNumber}
                                    </Text>
                                    {wi.quantity > 1 && (
                                      <Text className={`${typo.caption} text-gray-400`}>×{wi.quantity}</Text>
                                    )}
                                    {wi.durationMinutes > 0 && (
                                      <Text className={`${typo.caption} text-gray-400`}>· {fmtDuration(wi.durationMinutes)}</Text>
                                    )}
                                  </View>
                                  {wi.customerName ? (
                                    <Text className={`${typo.caption} text-gray-400 mt-0.5`} numberOfLines={1}>
                                      {wi.customerName}
                                    </Text>
                                  ) : null}
                                </View>
                                {/* Amount + date */}
                                <View className="items-end" style={{ gap: 2 }}>
                                  <Text className={`${typo.captionBold} text-gray-700`}>
                                    {formatVnd(wi.amount)}
                                  </Text>
                                  <Text className={`${typo.caption} text-gray-400`}>{dateStr}</Text>
                                </View>
                              </View>
                            );
                          })}
                        </View>
                      );
                    })}
                  </View>
                )}
              </>
            ) : !workItemsFetching ? (
              <View className="bg-white rounded-2xl border border-gray-100 py-8 items-center">
                <MaterialCommunityIcons name="account-clock-outline" size={36} color="#d1d5db" />
                <Text className={`${typo.caption} text-gray-400 mt-2 text-center`}>{t('perf.empty')}</Text>
                <Text className={`${typo.caption} text-gray-300 mt-1 text-center px-6`}>{t('perf.emptyHint')}</Text>
              </View>
            ) : null}
          </>
        )}

        {/* ── Performance (ORDER_VIEW_ALL only) ── */}
        {canViewAllOrders && (
          <>
            {/* Section header */}
            <View className="flex-row items-center mt-2" style={{ gap: 6 }}>
              <MaterialCommunityIcons name="chart-bar" size={16} color="#6b7280" />
              <Text className={`${typo.captionBold} text-gray-500 uppercase tracking-wide`}>
                {t('staff.sectionPerformance')}
              </Text>
              <Text className={`${typo.caption} text-gray-400`}>· {t('products.stats.period')}</Text>
            </View>

            {/* 4 stat tiles */}
            <View className="flex-row flex-wrap" style={{ gap: 10 }}>
              {([
                { key: 'perfOrders',    value: staffSummary?.orderCount,       icon: 'receipt' as const,            iconBg: '#e0e7ff', iconColor: '#4f46e5' },
                { key: 'perfRevenue',   value: staffSummary?.totalRevenue,      icon: 'cash-multiple' as const,      iconBg: '#fef3c7', iconColor: '#d97706' },
                { key: 'perfCompleted', value: staffSummary?.completedCount,    icon: 'check-circle-outline' as const, iconBg: '#d1fae5', iconColor: '#059669' },
                { key: 'perfCancelled', value: staffSummary?.cancelledCount,    icon: 'close-circle-outline' as const, iconBg: '#fee2e2', iconColor: '#ef4444' },
              ] as const).map((stat) => {
                const display = stat.value == null
                  ? '—'
                  : stat.key === 'perfRevenue'
                    ? formatVnd(stat.value as number)
                    : String(stat.value);
                return (
                  <View
                    key={stat.key}
                    className="bg-white rounded-2xl border border-gray-100 px-4 py-3.5"
                    style={{ minWidth: '45%', flex: 1 }}
                  >
                    <View className="w-8 h-8 rounded-full items-center justify-center mb-2" style={{ backgroundColor: stat.iconBg }}>
                      <MaterialCommunityIcons name={stat.icon} size={16} color={stat.iconColor} />
                    </View>
                    <Text className={`${typo.label} font-bold text-gray-900`} numberOfLines={1}>{display}</Text>
                    <Text className={`${typo.caption} text-gray-500 mt-0.5`}>{t(`staff.${stat.key}`)}</Text>
                  </View>
                );
              })}
            </View>

            {/* Trend chart */}
            <View
              className="bg-white rounded-2xl border border-gray-100 p-4"
              style={{ opacity: chartFetching ? 0.55 : 1 }}
            >
              <TrendChart
                data={staffChartData ?? []}
                color="#4f46e5"
                granularity={chartGranularity}
                allowedGranularities={['day', 'week', 'month', 'year']}
                onGranularityChange={setChartGranularity}
              />
            </View>

            {/* ── Orders section ── */}
            <View className="flex-row items-center mt-2" style={{ gap: 6 }}>
              <MaterialCommunityIcons name="receipt" size={16} color="#6b7280" />
              <Text className={`${typo.captionBold} text-gray-500 uppercase tracking-wide`}>
                {t('staff.sectionOrders')}
              </Text>
            </View>

            {/* Status filter chips */}
            <View className="flex-row flex-wrap" style={{ gap: 8 }}>
              {ORDER_STATUS_FILTERS.map((s) => (
                <TouchableOpacity
                  key={s}
                  onPress={() => setOrderStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-full border ${
                    orderStatusFilter === s
                      ? 'bg-indigo-600 border-indigo-600'
                      : 'bg-white border-gray-200 dark:border-gray-600'
                  }`}
                >
                  <Text className={`${typo.captionBold} ${orderStatusFilter === s ? 'text-white' : 'text-gray-600'}`}>
                    {statusLabel(s)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Order rows */}
            <View
              className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
              style={{ opacity: !ordersLoading && ordersFetching ? 0.55 : 1 }}
            >
              {ordersLoading ? (
                <View className="p-4" style={{ gap: 10 }}>
                  <Skeleton height={48} borderRadius={10} />
                  <Skeleton height={48} borderRadius={10} />
                  <Skeleton height={48} borderRadius={10} />
                </View>
              ) : !staffOrdersData?.content?.length ? (
                <View className="py-10 items-center">
                  <MaterialCommunityIcons name="receipt-text-outline" size={36} color="#d1d5db" />
                  <Text className={`${typo.caption} text-gray-400 mt-2`}>{t('staff.noOrders')}</Text>
                </View>
              ) : (
                staffOrdersData.content.map((order, idx) => {
                  const sc = statusColor(order.status);
                  return (
                    <View
                      key={order.id}
                      className={`flex-row items-center px-4 py-3 ${idx < staffOrdersData.content.length - 1 ? 'border-b border-gray-50' : ''}`}
                    >
                      <View className="flex-1">
                        <Text className={`${typo.label} text-gray-800 dark:text-gray-100`}>
                          #{order.orderNumber}
                        </Text>
                        <Text className={`${typo.caption} text-gray-400 mt-0.5`}>
                          {order.customerName ?? '—'} · {new Date(order.createdAt).toLocaleDateString('vi-VN')}
                        </Text>
                      </View>
                      <View className="items-end" style={{ gap: 4 }}>
                        <Text className={`${typo.labelBold} text-gray-900`}>
                          {new Intl.NumberFormat('vi-VN').format(order.total)} ₫
                        </Text>
                        <View style={{ backgroundColor: sc + '22', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                          <Text className={`${typo.caption} font-bold`} style={{ color: sc }}>
                            {statusLabel(order.status)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function InfoRow({
  icon,
  label,
  value,
  typo,
  last = false,
}: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  label: string;
  value: string;
  typo: ReturnType<typeof useTypography>;
  last?: boolean;
}) {
  return (
    <View className={`flex-row items-center px-4 py-3.5 ${!last ? 'border-b border-gray-50' : ''}`}>
      <View className="w-8 h-8 bg-indigo-50 rounded-full items-center justify-center mr-3">
        <MaterialCommunityIcons name={icon} size={16} color="#4f46e5" />
      </View>
      <Text className={`${typo.caption} text-gray-500 flex-1`}>{label}</Text>
      <Text className={`${typo.label} text-gray-800 flex-shrink-0 ml-2`} style={{ maxWidth: '55%' }} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

function WorkStatTile({
  icon,
  iconBg,
  iconColor,
  value,
  label,
}: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  iconBg: string;
  iconColor: string;
  value: string;
  label: string;
}) {
  const typo = useTypography();
  return (
    <View
      className="bg-white rounded-2xl border border-gray-100 px-4 py-3.5"
      style={{ minWidth: '45%', flex: 1 }}
    >
      <View className="w-8 h-8 rounded-full items-center justify-center mb-2" style={{ backgroundColor: iconBg }}>
        <MaterialCommunityIcons name={icon} size={16} color={iconColor} />
      </View>
      <Text className={`${typo.label} font-bold text-gray-900`} numberOfLines={1}>{value}</Text>
      <Text className={`${typo.caption} text-gray-500 mt-0.5`} numberOfLines={2}>{label}</Text>
    </View>
  );
}
