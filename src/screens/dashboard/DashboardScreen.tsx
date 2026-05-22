import { useState, useMemo, useCallback, memo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
} from 'react-native';
import { DatePickerInput } from '../../components/DatePickerInput';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Ionicons } from '@expo/vector-icons';
import {
  orderApi,
  shopConfigApi,
  subscriptionApi,
  expenseApi,
  productApi,
  appointmentApi,
  tableApi,
  pawnApi,
  type KpiPreset,
} from '../../services/api';
import { formatVnd, formatDateTime } from '../../utils/format';
import { Skeleton } from '../../components/Skeleton';
import { TrendChart } from '../../components/TrendChart';
import type { ChartGranularity } from '../../components/BarChart';
import { useNotificationBadge } from '../../hooks/useNotificationBadge';
import { useTypography } from '../../hooks/useTypography';
import { useUserStore } from '../../store/userStore';
import { usePrivacyStore } from '../../store/privacyStore';
import { useFeatureCheck } from '../../hooks/useFeature';
import type { HomeScreenProps } from '../../types/navigation';

// ── Types ─────────────────────────────────────────────────────────────────────

type Props = HomeScreenProps<'Dashboard'>;

// ── Date helpers ──────────────────────────────────────────────────────────────

function getDateRange(preset: Exclude<KpiPreset, 'custom'>): { from: string; to: string } {
  const now = new Date();
  const toISO = (d: Date) => d.toISOString().slice(0, 10);
  const today = toISO(now);
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();
  if (preset === 'today') return { from: today, to: today };
  if (preset === 'yesterday') {
    const s = toISO(new Date(y, m, d - 1));
    return { from: s, to: s };
  }
  if (preset === 'week') {
    const dow = now.getDay();
    const mon = new Date(y, m, d - (dow === 0 ? 6 : dow - 1));
    return { from: toISO(mon), to: today };
  }
  if (preset === 'lastMonth') {
    return { from: toISO(new Date(y, m - 1, 1)), to: toISO(new Date(y, m, 0)) };
  }
  if (preset === 'year') {
    return { from: `${y}-01-01`, to: today };
  }
  if (preset === 'lastYear') {
    return { from: `${y - 1}-01-01`, to: `${y - 1}-12-31` };
  }
  // month
  return { from: `${y}-${String(m + 1).padStart(2, '0')}-01`, to: today };
}

function getChartGranularity(preset: KpiPreset): ChartGranularity {
  if (preset === 'today' || preset === 'yesterday') return 'hour';
  if (preset === 'year' || preset === 'lastYear') return 'month';
  return 'day';
}

function getChartAllowed(preset: KpiPreset): ChartGranularity[] {
  if (preset === 'today' || preset === 'yesterday') return ['hour'];
  if (preset === 'week') return ['day'];
  if (preset === 'year' || preset === 'lastYear') return ['week', 'month'];
  return ['day', 'week', 'month'];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const PRESETS: { key: KpiPreset; label: string }[] = [
  { key: 'today',     label: 'Hôm nay' },
  { key: 'yesterday', label: 'Hôm qua' },
  { key: 'month',     label: 'Tháng này' },
];

const MORE_OPTIONS: { key: KpiPreset; label: string }[] = [
  { key: 'week',      label: '📅 Tuần này' },
  { key: 'lastMonth', label: '📆 Tháng trước' },
  { key: 'year',      label: '📈 Năm này' },
  { key: 'lastYear',  label: '📉 Năm ngoái' },
];

const MORE_PRESET_LABEL: Partial<Record<KpiPreset, string>> = {
  week:      'Tuần này',
  lastMonth: 'Tháng trước',
  year:      'Năm này',
  lastYear:  'Năm ngoái',
  custom:    'Tùy chỉnh',
};

const STATUS_COLORS: Record<string, string> = {
  COMPLETED:  '#059669',
  IN_PROGRESS:'#3b82f6',
  PENDING:    '#f59e0b',
  CANCELLED:  '#ef4444',
};

const RANK_COLORS = ['#f59e0b', '#9ca3af', '#b45309'];
const RANK_ICONS  = ['🥇', '🥈', '🥉'];

const SERVICE_SHOP_CODES = [
  'BARBER_SHOP', 'BARBER_SHOP_MEN', 'HAIR_SALON', 'NAIL_SHOP',
  'LASH_PMU_STUDIO', 'SPA_SHOP', 'MASSAGE_SHOP', 'BEAUTY_CLINIC', 'MAKEUP_STUDIO',
];
const PAWN_SHOP_CODE = 'PAWN_SHOP';
const FB_CODES = ['RESTAURANT', 'COFFEE_SHOP', 'PUB', 'PUB_SEAFOOD', 'PUB_GOAT', 'PUB_BEEF'];

// ── Sub-components ────────────────────────────────────────────────────────────

const StatPill = memo(function StatPill({
  label, value, color, loading, isHidden,
}: {
  label: string; value: number; color: string; loading: boolean; isHidden: boolean;
}) {
  const typo = useTypography();
  return (
    <View className="flex-1 items-center">
      <Text className={`${typo.caption} text-indigo-300 mb-0.5 text-center`} numberOfLines={1}>{label}</Text>
      {loading ? (
        <Skeleton width={56} height={18} borderRadius={4} variant="light" />
      ) : (
        <Text className={`${typo.label} font-bold text-center`} style={{ color }} numberOfLines={1}>
          {isHidden ? '••••' : formatVnd(value)}
        </Text>
      )}
    </View>
  );
});

const TrendBadge = memo(function TrendBadge({ pct, loading }: { pct: number | null; loading: boolean }) {
  const typo = useTypography();
  if (loading || pct === null) return null;
  const up = pct >= 0;
  return (
    <View className={`flex-row items-center px-2 py-0.5 rounded-full ml-2 ${up ? 'bg-indigo-500/30' : 'bg-red-500/30'}`}>
      <Ionicons name={up ? 'trending-up' : 'trending-down'} size={12} color={up ? '#6ee7b7' : '#fca5a5'} />
      <Text className={`${typo.captionBold} ml-0.5 ${up ? 'text-indigo-200' : 'text-red-200'}`}>
        {up ? '+' : ''}{pct}%
      </Text>
    </View>
  );
});

const AlertCard = memo(function AlertCard({
  icon, bg, text, onPress, onDismiss,
}: {
  icon: string; bg: string; text: string; onPress?: () => void; onDismiss: () => void;
}) {
  const typo = useTypography();
  return (
    <TouchableOpacity
      className={`mx-4 mb-2 ${bg} rounded-2xl px-4 py-3 flex-row items-center`}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <Text className={`${typo.caption} mr-2`}>{icon}</Text>
      <Text className={`${typo.caption} font-medium text-white flex-1`}>{text}</Text>
      <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="close" size={16} color="rgba(255,255,255,0.7)" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
});

const SectionHeader = memo(function SectionHeader({ title, onSeeAll }: { title: string; onSeeAll?: () => void }) {
  const typo = useTypography();
  return (
    <View className="flex-row items-center justify-between mb-3">
      <Text className={`${typo.labelBold} text-gray-800 dark:text-gray-100`}>{title}</Text>
      {onSeeAll && (
        <TouchableOpacity onPress={onSeeAll}>
          <Text className={`${typo.caption} font-medium text-indigo-600 dark:text-indigo-400`}>Xem tất cả</Text>
        </TouchableOpacity>
      )}
    </View>
  );
});

const RankRow = memo(function RankRow({
  rank, name, sub, value, loading, isHidden, onPress,
}: {
  rank: number; name: string; sub: string; value: number; loading: boolean; isHidden: boolean; onPress?: () => void;
}) {
  const typo = useTypography();
  if (loading) return <Skeleton height={44} borderRadius={12} style={{ marginBottom: 8 }} />;
  const inner = (
    <>
      <Text className={`${typo.caption} mr-3 w-6 text-center`}>{rank <= 3 ? RANK_ICONS[rank - 1] : `${rank}`}</Text>
      <View className="flex-1">
        <Text className={`${typo.label} text-gray-800 dark:text-gray-100`} numberOfLines={1}>{name}</Text>
        <Text className={`${typo.caption} text-gray-400 dark:text-gray-500`}>{sub}</Text>
      </View>
      <Text className={`${typo.labelBold} text-gray-800 dark:text-gray-100`}>
        {isHidden ? '••••' : formatVnd(value)}
      </Text>
    </>
  );
  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7} className="flex-row items-center py-2.5 border-b border-gray-50 dark:border-gray-700/50 last:border-0">
        {inner}
      </TouchableOpacity>
    );
  }
  return (
    <View className="flex-row items-center py-2.5 border-b border-gray-50 dark:border-gray-700/50 last:border-0">
      {inner}
    </View>
  );
});

const QuickAction = memo(function QuickAction({
  icon, label, onPress,
}: {
  icon: string; label: string; onPress: () => void;
}) {
  const typo = useTypography();
  return (
    <TouchableOpacity
      onPress={onPress}
      className="flex-1 items-center bg-white dark:bg-gray-800 rounded-2xl py-3 px-1 border border-gray-100 dark:border-gray-700"
      activeOpacity={0.75}
    >
      <Text className={`${typo.heading} mb-1`}>{icon}</Text>
      <Text className={`${typo.caption} font-medium text-gray-600 dark:text-gray-300 text-center`} numberOfLines={1}>{label}</Text>
    </TouchableOpacity>
  );
});

const StatCard = memo(function StatCard({
  icon, label, value, color = '#4f46e5', loading,
}: {
  icon: string; label: string; value: number | string;
  color?: string; loading: boolean;
}) {
  const typo = useTypography();
  return (
    <View className="flex-1 bg-white dark:bg-gray-800 rounded-2xl p-3 border border-gray-100 dark:border-gray-700 items-center">
      <Text className={`${typo.section} mb-1`}>{icon}</Text>
      {loading ? (
        <Skeleton width={36} height={20} borderRadius={4} />
      ) : (
        <Text className={`${typo.section} font-bold`} style={{ color }} numberOfLines={1}>{value}</Text>
      )}
      <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 text-center mt-0.5`} numberOfLines={2}>{label}</Text>
    </View>
  );
});

// ── More periods bottom sheet ─────────────────────────────────────────────────

function MorePeriodsSheet({
  visible, onClose, preset, customFrom, customTo, onCustomFrom, onCustomTo, onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  preset: KpiPreset;
  customFrom: string;
  customTo: string;
  onCustomFrom: (v: string) => void;
  onCustomTo: (v: string) => void;
  onSelect: (key: KpiPreset) => void;
}) {
  const typo = useTypography();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <View className="bg-white dark:bg-gray-900 rounded-t-3xl px-5 pt-5 pb-10">
          <View className="flex-row items-center justify-between mb-5">
            <Text className={`${typo.section} text-gray-900 dark:text-white`}>Khoảng thời gian khác</Text>
            <TouchableOpacity
              onPress={onClose}
              className="w-8 h-8 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700"
            >
              <Text className={`${typo.label} text-gray-600 dark:text-gray-300 font-bold`}>✕</Text>
            </TouchableOpacity>
          </View>

          {MORE_OPTIONS.map(({ key, label }) => {
            const active = preset === key;
            return (
              <TouchableOpacity
                key={key}
                onPress={() => onSelect(key)}
                className={`flex-row items-center justify-between px-4 py-3.5 rounded-2xl mb-2 ${
                  active ? 'bg-primary' : 'bg-gray-50 dark:bg-gray-800'
                }`}
              >
                <Text className={`${typo.label} ${active ? 'text-white' : 'text-gray-700 dark:text-gray-200'}`}>
                  {label}
                </Text>
                {active && <Text className={`${typo.label} text-white`}>✓</Text>}
              </TouchableOpacity>
            );
          })}

          <View className="mt-4">
            <Text className={`${typo.captionBold} text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3`}>
              Tùy chỉnh
            </Text>
            <View className="flex-row gap-3 mb-3">
              <View className="flex-1 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 bg-gray-50 dark:bg-gray-800">
                <DatePickerInput value={customFrom} onChange={onCustomFrom} placeholder="Từ ngày" maximumDate={new Date()} />
              </View>
              <View className="flex-1 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 bg-gray-50 dark:bg-gray-800">
                <DatePickerInput value={customTo} onChange={onCustomTo} placeholder="Đến ngày" maximumDate={new Date()} />
              </View>
            </View>
            {customFrom.length === 10 && customTo.length === 10 && (
              <TouchableOpacity
                onPress={() => onSelect('custom')}
                className="bg-primary rounded-2xl py-3.5 items-center"
              >
                <Text className={`${typo.labelBold} text-white`}>Áp dụng khoảng này</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export function DashboardScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const typo = useTypography();
  const { top, bottom } = useSafeAreaInsets();
  const [preset, setPreset] = useState<KpiPreset>('today');
  const [chartGranularity, setChartGranularity] = useState<ChartGranularity>('hour');
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [showMoreSheet, setShowMoreSheet] = useState(false);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const handlePresetChange = useCallback((key: KpiPreset) => {
    setPreset(key);
    setChartGranularity(getChartGranularity(key));
    setShowMoreSheet(false);
  }, []);

  const unreadCount   = useNotificationBadge();
  const { nickname, fullName, shopName } = useUserStore();
  const { isHidden, toggle: togglePrivacy } = usePrivacyStore();
  const has = useFeatureCheck();

  const displayName = nickname || fullName;
  const mask = (n: number) => (isHidden ? '••••' : formatVnd(n));

  const todayISO = new Date().toISOString().slice(0, 10);
  const dateRange = useMemo(() => {
    if (preset === 'custom') return { from: customFrom || todayISO, to: customTo || todayISO };
    return getDateRange(preset);
  }, [preset, customFrom, customTo]);

  // ── Queries ──────────────────────────────────────────────────────────────────

  const { data: shopConfig } = useQuery({
    queryKey: ['shopConfig'],
    queryFn: () => shopConfigApi.getInfo().then((r) => r.data.data),
    staleTime: 10 * 60_000,
  });

  const shopTypeCode = shopConfig?.shopTypeCode ?? '';
  const isServiceShop = SERVICE_SHOP_CODES.includes(shopTypeCode);
  const isPawnShop    = shopTypeCode === PAWN_SHOP_CODE;
  const isFbShop      = FB_CODES.includes(shopTypeCode);

  const [isManualRefreshing, setIsManualRefreshing] = useState(false);

  const {
    data: kpiData, isLoading: kpiLoading, refetch: refetchKpi,
  } = useQuery({
    queryKey: ['dashboard-kpi', dateRange.from, dateRange.to],
    queryFn: () => orderApi.summary({ from: dateRange.from, to: dateRange.to }).then((r) => r.data.data),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });

  const yesterdayRange = useMemo(() => getDateRange('yesterday'), []);
  const { data: yesterdayKpi, isLoading: trendLoading } = useQuery({
    queryKey: ['dashboard-kpi', 'yesterday'],
    queryFn: () => orderApi.summary({ from: yesterdayRange.from, to: yesterdayRange.to }).then((r) => r.data.data),
    enabled: preset === 'today',
    staleTime: 5 * 60_000,
  });

  const { data: expenseSummary, isLoading: expenseLoading } = useQuery({
    queryKey: ['dashboard-expenses', dateRange.from, dateRange.to],
    queryFn: () => expenseApi.summary({ from: dateRange.from, to: dateRange.to }).then((r) => r.data.data),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });

  const { data: chartData = [] } = useQuery({
    queryKey: ['dashboard-chart', dateRange.from, dateRange.to, chartGranularity],
    queryFn: () => orderApi.chart({ from: dateRange.from, to: dateRange.to, granularity: chartGranularity }).then((r) => r.data.data),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });

  const { data: productSummary } = useQuery({
    queryKey: ['product-summary'],
    queryFn: () => productApi.summary().then((r) => r.data.data),
    staleTime: 5 * 60_000,
    enabled: has('INVENTORY'),
  });

  const { data: subscription } = useQuery({
    queryKey: ['subscription'],
    queryFn: () => subscriptionApi.getCurrent().then((r) => r.data.data),
    staleTime: 10 * 60_000,
  });

  const { data: topProducts = [], isLoading: topProductsLoading } = useQuery({
    queryKey: ['dashboard-top-products', dateRange.from, dateRange.to],
    queryFn: () => orderApi.topProducts({ limit: 5, from: dateRange.from, to: dateRange.to }).then((r) => r.data.data),
    staleTime: 60_000,
    enabled: has('PRODUCT'),
    placeholderData: keepPreviousData,
  });

  const { data: topCustomers = [], isLoading: topCustomersLoading } = useQuery({
    queryKey: ['dashboard-top-customers', dateRange.from, dateRange.to],
    queryFn: () => orderApi.topCustomers({ limit: 5, from: dateRange.from, to: dateRange.to }).then((r) => r.data.data),
    staleTime: 60_000,
    enabled: has('CUSTOMER'),
    placeholderData: keepPreviousData,
  });

  const { data: topEmployees = [], isLoading: topEmployeesLoading } = useQuery({
    queryKey: ['dashboard-top-employees', dateRange.from, dateRange.to],
    queryFn: () => orderApi.topEmployees({ limit: 5, from: dateRange.from, to: dateRange.to }).then((r) => r.data.data),
    staleTime: 60_000,
    enabled: has('ORDER_VIEW_ALL'),
    placeholderData: keepPreviousData,
  });

  const {
    data: recentOrders, isLoading: ordersLoading, refetch: refetchOrders,
  } = useQuery({
    queryKey: ['dashboard-recent-orders'],
    queryFn: () => orderApi.list({ page: 0, size: 5 }).then((r) => r.data.data.content),
    staleTime: 30_000,
  });

  const { data: pawnKpis, isLoading: pawnKpisLoading } = useQuery({
    queryKey: ['dashboard-pawn-kpis'],
    queryFn: () => pawnApi.getKPIs().then((r) => r.data.data),
    enabled: isPawnShop && has('PAWN'),
    staleTime: 60_000,
  });

  const { data: todayAppts, isLoading: apptsLoading } = useQuery({
    queryKey: ['dashboard-appts-today', todayISO],
    queryFn: () => appointmentApi.list(todayISO, 0, 200).then((r) => r.data.data),
    enabled: isServiceShop && has('APPOINTMENT'),
    staleTime: 60_000,
  });

  const { data: tables = [], isLoading: tablesLoading } = useQuery({
    queryKey: ['dashboard-tables'],
    queryFn: () => tableApi.list().then((r) => r.data.data),
    enabled: isFbShop && has('TABLE_SERVICE'),
    staleTime: 60_000,
  });

  // ── Derived values ────────────────────────────────────────────────────────────

  const revenue  = kpiData?.totalRevenue ?? 0;
  const expenses = expenseSummary?.total ?? 0;
  const profit   = revenue - expenses;

  // Pawn-specific
  const overdueCount  = pawnKpis?.overdueCount ?? 0;
  const dueTodayCount = pawnKpis?.dueTodayCount ?? 0;

  // Service-specific
  const apptContent   = todayAppts?.content ?? [];
  const apptTotal     = apptContent.filter((a) => !['CANCELLED', 'NO_SHOW'].includes(a.status)).length;
  const apptCheckedIn = apptContent.filter((a) => a.status === 'CHECKED_IN').length;
  const apptUpcoming  = apptContent.filter((a) => ['PENDING', 'CONFIRMED'].includes(a.status)).length;

  // F&B-specific
  const tablesTotal    = tables.length;
  const tablesOccupied = tables.filter((t) => t.status === 'OCCUPIED').length;

  // Section title/sublabel vary by shop type
  const topProductsTitle = isServiceShop ? '🔥 Dịch vụ phổ biến'
    : isFbShop ? '🔥 Món bán chạy'
    : '🔥 Sản phẩm bán chạy';
  const topProductsSub = (count: number) =>
    isServiceShop ? `${count} lượt · Dịch vụ` : isFbShop ? `${count} đơn · Món ăn` : `${count} đơn · Sản phẩm`;

  const trendPct = useMemo<number | null>(() => {
    if (preset !== 'today' || !kpiData || !yesterdayKpi) return null;
    if (yesterdayKpi.totalRevenue === 0) return null;
    return Math.round(((revenue - yesterdayKpi.totalRevenue) / yesterdayKpi.totalRevenue) * 100);
  }, [preset, kpiData, yesterdayKpi, revenue]);

  const subBanner = useMemo(() => {
    if (!subscription) return null;
    if (subscription.status === 'EXPIRED') return { text: t('dashboard.subscriptionExpired'), color: 'bg-red-500' };
    if (subscription.status === 'ACTIVE' && subscription.expiresAt) {
      const daysLeft = Math.ceil((new Date(subscription.expiresAt).getTime() - Date.now()) / 86400000);
      if (daysLeft <= 7) {
        const formatted = new Date(subscription.expiresAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
        return { text: t('dashboard.subscriptionExpiringSoon', { date: formatted }), color: 'bg-amber-500' };
      }
    }
    return null;
  }, [subscription, t]);

  // Alert cards (dismissible per session)
  const lowStock = productSummary?.lowStock ?? 0;
  const outStock = productSummary?.outOfStock ?? 0;
  const stockAlertCount = lowStock + outStock;
  const showStockAlert = has('INVENTORY') && stockAlertCount > 0 && !dismissed.includes('stock');
  const showSubAlert   = subBanner !== null && !dismissed.includes('sub');

  const dismiss = useCallback((key: string) => setDismissed((d) => [...d, key]), []);

  // Quick actions — shop-type-aware
  const quickActions = useMemo(() => {
    const goSelling = () => navigation.getParent()?.navigate('Sell' as any);
    const goExpenses = () => navigation.getParent()?.navigate('Expenses' as any);
    const goCustomers = () => navigation.navigate('CustomerList');
    const goMore = (screen: string) => navigation.getParent()?.navigate('More', { screen } as any);

    if (isPawnShop) return [
      { icon: '📋', label: 'HĐ mới',     onPress: goSelling },
      { icon: '🔄', label: 'Gia hạn',    onPress: goSelling },
      { icon: '💸', label: 'Ghi chi',    onPress: goExpenses },
      { icon: '👥', label: 'Khách hàng', onPress: goCustomers },
    ];
    if (isServiceShop) return [
      { icon: '🛎️', label: 'Tạo dịch vụ', onPress: goSelling },
      { icon: '📅', label: 'Lịch hẹn',   onPress: () => goMore('AppointmentList') },
      { icon: '💸', label: 'Ghi chi',    onPress: goExpenses },
      { icon: '👥', label: 'Khách hàng', onPress: goCustomers },
    ];
    if (isFbShop) return [
      { icon: '🍽️', label: 'Chọn bàn',   onPress: goSelling },
      { icon: '🧾', label: 'Tạo đơn',    onPress: goSelling },
      { icon: '💸', label: 'Ghi chi',    onPress: goExpenses },
      { icon: '👥', label: 'Khách hàng', onPress: goCustomers },
    ];
    return [
      { icon: '🧾', label: 'Tạo đơn',   onPress: goSelling },
      { icon: '📦', label: 'Nhập hàng', onPress: () => goMore('Inventory') },
      { icon: '💸', label: 'Ghi chi',   onPress: goExpenses },
      { icon: '👥', label: 'Khách',     onPress: goCustomers },
    ];
  }, [isPawnShop, isServiceShop, isFbShop, navigation]);

  const onRefresh = useCallback(async () => {
    setIsManualRefreshing(true);
    await Promise.all([refetchKpi(), refetchOrders()]);
    setIsManualRefreshing(false);
  }, [refetchKpi, refetchOrders]);

  const chartAllowedGranularities = useMemo(() => getChartAllowed(preset), [preset]);

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <ScrollView
        contentContainerStyle={{ paddingBottom: bottom + 32 }}
        refreshControl={
          <RefreshControl
            refreshing={isManualRefreshing}
            onRefresh={onRefresh}
            tintColor="#059669"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* ── Subscription top banner ── */}
        {subBanner && (
          <View className={`${subBanner.color} px-5 py-2.5 flex-row items-center gap-2`}>
            <MaterialCommunityIcons name="alert-circle-outline" size={16} color="white" />
            <Text className={`${typo.captionBold} text-white flex-1`}>{subBanner.text}</Text>
          </View>
        )}

        {/* ── Hero gradient header ── */}
        <View className="bg-primary px-5 pb-10" style={{ paddingTop: top + (subBanner ? 8 : 12) }}>
          {/* Greeting + bell */}
          <View className="flex-row items-center justify-between mb-1">
            <View className="flex-1 mr-3">
              <Text className={`${typo.heading} text-white`} numberOfLines={1} ellipsizeMode="tail">
                {displayName ? t('dashboard.greeting', { name: displayName }) : t('dashboard.greetingDefault')}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => navigation.getParent()?.navigate('More', { screen: 'Notifications' } as any)}
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

          {/* Shop name + address (2-line) */}
          <View className="flex-row items-start gap-1.5 mb-4">
            <Ionicons name="storefront-outline" size={14} color="rgba(199,210,254,0.8)" style={{ marginTop: 2 }} />
            <View className="flex-1">
              <Text className={`${typo.label} text-indigo-100`} numberOfLines={1}>
                {shopName || shopConfig?.shopName || t('dashboard.subtitle')}
              </Text>
              {shopConfig?.address ? (
                <Text className={`${typo.caption} text-indigo-300 mt-0.5`} numberOfLines={1}>{shopConfig.address}</Text>
              ) : null}
            </View>
          </View>

          {/* Revenue hero */}
          <Text className={`${typo.caption} text-indigo-200 mb-0.5`}>{t('dashboard.revenue')}</Text>
          <View className="flex-row items-center mb-1" style={{ gap: 10 }}>
            {kpiLoading ? (
              <Skeleton width="58%" height={34} borderRadius={8} variant="light" />
            ) : (
              <Text className={`${typo.heading} text-white`}>{mask(revenue)}</Text>
            )}
            <TrendBadge pct={trendPct} loading={trendLoading && preset === 'today'} />
            <TouchableOpacity onPress={togglePrivacy} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name={isHidden ? 'eye-off-outline' : 'eye-outline'} size={20} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
          </View>
          {preset === 'today' && trendPct !== null && (
            <Text className={`${typo.caption} text-indigo-300 mb-3`}>{t('dashboard.trendVsYesterday')}</Text>
          )}
          {(preset !== 'today' || trendPct === null) && <View className="mb-3" />}

          {/* 3 KPI pills: orders / expenses / profit */}
          <View className="flex-row bg-white/10 rounded-2xl px-2 py-3">
            <View className="flex-1 items-center">
              <Text className={`${typo.caption} text-indigo-300 mb-0.5`}>
                {isPawnShop ? 'HĐ mới' : t('dashboard.totalOrders')}
              </Text>
              {kpiLoading ? (
                <Skeleton width={40} height={18} borderRadius={4} variant="light" />
              ) : (
                <Text className={`${typo.labelBold} text-white`}>{kpiData?.orderCount ?? 0}</Text>
              )}
            </View>
            <View className="w-px bg-white/20 mx-1" />
            <StatPill
              label={t('dashboard.expenses')}
              value={expenses}
              color="#fca5a5"
              loading={expenseLoading}
              isHidden={isHidden}
            />
            <View className="w-px bg-white/20 mx-1" />
            <StatPill
              label={t('dashboard.profit')}
              value={profit}
              color={profit >= 0 ? '#6ee7b7' : '#fca5a5'}
              loading={kpiLoading || expenseLoading}
              isHidden={isHidden}
            />
          </View>
        </View>

        {/* ── Period selector ── */}
        {(() => {
          const moreActive = preset in MORE_PRESET_LABEL;
          const allTabs: { key: KpiPreset | 'more'; label: string }[] = [
            ...PRESETS,
            { key: 'more', label: 'Tùy chỉnh' },
          ];
          return (
            <>
              <View className="mx-4 -mt-4 bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700 shadow-sm mb-2 flex-row">
                {allTabs.map(({ key, label }, i) => {
                  const isMore = key === 'more';
                  const active = isMore ? moreActive : preset === key;
                  return (
                    <View key={key} className="flex-1 flex-row">
                      {i > 0 && <View className="w-px bg-gray-100 dark:bg-gray-700" />}
                      <TouchableOpacity
                        style={{ flex: 1 }}
                        className={`py-3 items-center ${active ? 'bg-primary' : ''}`}
                        onPress={isMore ? () => setShowMoreSheet(true) : () => handlePresetChange(key as KpiPreset)}
                      >
                        <Text
                          className={`${typo.label} ${active ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`}
                          numberOfLines={1}
                        >
                          {label}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>

              {/* Active filter indicator */}
              {moreActive && (
                <View className="mx-4 mb-3 flex-row items-center bg-indigo-50 dark:bg-indigo-950 rounded-xl px-3 py-2 gap-2">
                  <Ionicons name="time-outline" size={14} color="#6366f1" />
                  <Text className={`${typo.caption} text-indigo-400 dark:text-indigo-500`}>Đang xem:</Text>
                  <Text className={`${typo.captionBold} flex-1 text-indigo-600 dark:text-indigo-300`}>
                    {preset === 'custom'
                      ? `${customFrom} → ${customTo}`
                      : MORE_PRESET_LABEL[preset]}
                  </Text>
                  <TouchableOpacity
                    onPress={() => handlePresetChange('today')}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close-circle" size={16} color="#a5b4fc" />
                  </TouchableOpacity>
                </View>
              )}
            </>
          );
        })()}

        {/* ── Shop-type stat cards ── */}
        {isPawnShop && has('PAWN') && (
          <View className="mx-4 mb-4 flex-row gap-2">
            <StatCard icon="📋" label="Đang cầm" value={pawnKpis?.totalPawnedCount ?? 0} color="#4f46e5" loading={pawnKpisLoading} />
            <StatCard icon="⚠️" label="Quá hạn" value={overdueCount} color={overdueCount > 0 ? '#ef4444' : '#9ca3af'} loading={pawnKpisLoading} />
            <StatCard icon="📅" label="Đáo hạn HN" value={dueTodayCount} color={dueTodayCount > 0 ? '#f59e0b' : '#9ca3af'} loading={pawnKpisLoading} />
          </View>
        )}
        {isServiceShop && has('APPOINTMENT') && (
          <View className="mx-4 mb-4 flex-row gap-2">
            <StatCard icon="📅" label="Lịch hẹn HN" value={apptTotal} color="#4f46e5" loading={apptsLoading} />
            <StatCard icon="✅" label="Đã check-in" value={apptCheckedIn} color="#059669" loading={apptsLoading} />
            <StatCard icon="⏳" label="Chờ đến" value={apptUpcoming} color="#f59e0b" loading={apptsLoading} />
          </View>
        )}
        {isFbShop && has('TABLE_SERVICE') && (
          <View className="mx-4 mb-4 flex-row gap-2">
            <StatCard icon="🍽️" label={`Bàn dùng ${tablesOccupied}/${tablesTotal}`} value={tablesOccupied} color={tablesOccupied > 0 ? '#4f46e5' : '#9ca3af'} loading={tablesLoading} />
            <StatCard icon="🪑" label="Bàn trống" value={tablesTotal - tablesOccupied} color="#059669" loading={tablesLoading} />
            <StatCard icon="🧾" label="Đơn hôm nay" value={kpiData?.orderCount ?? 0} color="#6b7280" loading={kpiLoading} />
          </View>
        )}

        {/* ── Alert cards ── */}
        {isPawnShop && overdueCount > 0 && !dismissed.includes('pawn-overdue') && (
          <AlertCard
            icon="🚨"
            bg="bg-red-500"
            text={`${overdueCount} hợp đồng quá hạn — cần xử lý ngay`}
            onDismiss={() => dismiss('pawn-overdue')}
          />
        )}
        {showStockAlert && (
          <AlertCard
            icon="📦"
            bg="bg-amber-500"
            text={`${stockAlertCount} sản phẩm ${outStock > 0 ? 'hết hàng / ' : ''}sắp hết — nhấn để xem`}
            onPress={() => navigation.getParent()?.navigate('More', { screen: 'Inventory' } as any)}
            onDismiss={() => dismiss('stock')}
          />
        )}
        {showSubAlert && (
          <AlertCard
            icon="⚠️"
            bg={subBanner!.color}
            text={subBanner!.text}
            onDismiss={() => dismiss('sub')}
          />
        )}

        {/* ── Revenue chart ── */}
        {chartData.length > 0 && (
          <View className="mx-4 mb-4">
            <TrendChart
              data={chartData}
              color="#4f46e5"
              granularity={chartGranularity}
              allowedGranularities={chartAllowedGranularities}
              onGranularityChange={setChartGranularity}
              title={t('chart.revenueTitle')}
            />
          </View>
        )}

        {/* ── Quick actions ── */}
        <View className="mx-4 mb-4">
          <View className="flex-row gap-2">
            {quickActions.map((a) => (
              <QuickAction key={a.label} icon={a.icon} label={a.label} onPress={a.onPress} />
            ))}
          </View>
        </View>

        {/* ── Top products / services / dishes ── */}
        {has('PRODUCT') && !isPawnShop && (topProductsLoading || topProducts.length > 0) && (
          <View className="mx-4 mb-4 bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
            <SectionHeader
              title={topProductsTitle}
              onSeeAll={() => navigation.getParent()?.navigate('More', { screen: 'Products', params: { screen: 'ProductList' } } as any)}
            />
            {topProductsLoading ? (
              <View className="gap-2">
                {[0, 1, 2].map((i) => <Skeleton key={i} height={44} borderRadius={12} />)}
              </View>
            ) : (
              topProducts.slice(0, 5).map((p, i) => (
                <RankRow
                  key={p.name + i}
                  rank={i + 1}
                  name={p.name}
                  sub={topProductsSub(p.orderCount)}
                  value={p.revenue}
                  loading={false}
                  isHidden={isHidden}
                  onPress={p.productId ? () => navigation.getParent()?.navigate('More', { screen: 'Products', params: { screen: 'ProductDetail', params: { productId: p.productId } } } as any) : undefined}
                />
              ))
            )}
          </View>
        )}

        {/* ── Top customers ── */}
        {has('CUSTOMER') && (topCustomersLoading || topCustomers.length > 0) && (
          <View className="mx-4 mb-4 bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
            <SectionHeader
              title="🥇🥈🥉 Khách hàng thân thiết"
              onSeeAll={() => navigation.navigate('CustomerList')}
            />
            {topCustomersLoading ? (
              <View className="gap-2">
                {[0, 1, 2].map((i) => <Skeleton key={i} height={44} borderRadius={12} />)}
              </View>
            ) : (
              topCustomers.slice(0, 5).map((c, i) => (
                <RankRow
                  key={c.name + i}
                  rank={i + 1}
                  name={c.name}
                  sub={`${c.orderCount} đơn · Khách thân thiết`}
                  value={c.totalSpend}
                  loading={false}
                  isHidden={isHidden}
                  onPress={c.customerId ? () => navigation.navigate('CustomerDetail', { customerId: c.customerId }) : undefined}
                />
              ))
            )}
          </View>
        )}

        {/* ── Top employees ── */}
        {has('ORDER_VIEW_ALL') && (topEmployeesLoading || topEmployees.length > 0) && (
          <View className="mx-4 mb-4 bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
            <SectionHeader
              title="🏆 Nhân viên xuất sắc"
              onSeeAll={() => navigation.getParent()?.navigate('More', { screen: 'StaffList' } as any)}
            />
            {topEmployeesLoading ? (
              <View className="gap-2">
                {[0, 1, 2].map((i) => <Skeleton key={i} height={44} borderRadius={12} />)}
              </View>
            ) : (
              topEmployees.slice(0, 5).map((e, i) => (
                <RankRow
                  key={e.name + i}
                  rank={i + 1}
                  name={e.name}
                  sub={`${e.orderCount} đơn · Nhân viên`}
                  value={e.revenue}
                  loading={false}
                  isHidden={isHidden}
                  onPress={e.userId ? () => navigation.getParent()?.navigate('More', { screen: 'StaffForm', params: { userId: e.userId } } as any) : undefined}
                />
              ))
            )}
          </View>
        )}

        {/* ── Recent orders ── */}
        <View className="mx-4">
          <SectionHeader
            title={t('dashboard.recentOrders')}
            onSeeAll={() => navigation.getParent()?.navigate('Sell', { screen: 'OrderList' } as any)}
          />

          {ordersLoading && (
            <View className="gap-3">
              {[0, 1, 2].map((i) => <Skeleton key={i} height={72} borderRadius={16} />)}
            </View>
          )}

          {!ordersLoading && (!recentOrders || recentOrders.length === 0) && (
            <View className="bg-white dark:bg-gray-800 rounded-2xl p-6 items-center border border-gray-100 dark:border-gray-700">
              <Text className="text-3xl mb-2">🧾</Text>
              <Text className={`${typo.caption} text-gray-400`}>{t('dashboard.noOrdersToday')}</Text>
            </View>
          )}

          {!ordersLoading && recentOrders?.map((order) => (
            <TouchableOpacity
              key={order.id}
              onPress={() => navigation.getParent()?.navigate('Sell', { screen: 'OrderDetail', params: { orderId: String(order.id) } } as any)}
              activeOpacity={0.7}
              className="bg-white dark:bg-gray-800 rounded-2xl px-4 py-3 mb-3 border border-gray-100 dark:border-gray-700 shadow-sm"
            >
              <View className="flex-row justify-between items-start">
                <View className="flex-1">
                  <Text className={`${typo.label} text-gray-800 dark:text-gray-100`}>#{order.orderNumber}</Text>
                  <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 mt-0.5`}>
                    {order.customerName ?? t('pos.walkIn')} · {formatDateTime(order.createdAt)}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className={`${typo.labelBold} text-gray-900 dark:text-gray-100`}>{mask(order.total)}</Text>
                  <View
                    className="mt-1 px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: (STATUS_COLORS[order.status] ?? '#6b7280') + '18' }}
                  >
                    <Text
                      className={`${typo.captionBold}`}
                      style={{ color: STATUS_COLORS[order.status] ?? '#6b7280' }}
                    >
                      {t(`orders.${order.status.toLowerCase()}` as never) ?? order.status}
                    </Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <MorePeriodsSheet
        visible={showMoreSheet}
        onClose={() => setShowMoreSheet(false)}
        preset={preset}
        customFrom={customFrom}
        customTo={customTo}
        onCustomFrom={setCustomFrom}
        onCustomTo={setCustomTo}
        onSelect={handlePresetChange}
      />
    </View>
  );
}
