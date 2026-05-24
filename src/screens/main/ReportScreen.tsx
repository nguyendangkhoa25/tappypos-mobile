import { useState, useCallback, useMemo, memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  FlatList,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useInfiniteQuery, useQuery, keepPreviousData } from '@tanstack/react-query';
import { orderApi, expenseApi, shopConfigApi, revenueApi } from '../../services/api';
import type { PaymentBreakdownItem, CategoryRevenueItem, ExpenseCategoryBreakdownItem } from '../../services/api';
import type { ReportScreenProps } from '../../types/navigation';
import { formatVnd } from '../../utils/format';
import { TrendChart } from '../../components/TrendChart';
import { NetChart } from '../../components/NetChart';
import { Skeleton } from '../../components/Skeleton';
import { SectionHeader, RankRow } from '../../components/RankCard';
import type { ChartGranularity } from '../../components/BarChart';
import { DatePickerInput } from '../../components/DatePickerInput';
import type { OrderSummary, ExpenseData } from '../../services/api';
import { useTypography } from '../../hooks/useTypography';
import { usePrivacyStore } from '../../store/privacyStore';
import { useFeatureCheck } from '../../hooks/useFeature';

type ListTab = 'revenue' | 'expenses';
type Period  = 'today' | 'yesterday' | 'thisWeek' | 'lastMonth' | 'thisMonth' | 'thisYear' | 'lastYear' | 'custom';

// ── Shop-type constants ───────────────────────────────────────────────────────

const SERVICE_SHOP_CODES = [
  'BARBER_SHOP', 'BARBER_SHOP_MEN', 'HAIR_SALON', 'NAIL_SHOP',
  'LASH_PMU_STUDIO', 'SPA_SHOP', 'MASSAGE_SHOP', 'BEAUTY_CLINIC', 'MAKEUP_STUDIO',
];
const FB_CODES      = ['RESTAURANT', 'COFFEE_SHOP', 'PUB', 'PUB_SEAFOOD', 'PUB_GOAT', 'PUB_BEEF'];
const PAWN_SHOP_CODE = 'PAWN_SHOP';

// ── Helpers ───────────────────────────────────────────────────────────────────

function getAllowedGranularities(period: Period, from: string, to: string): ChartGranularity[] {
  if (period === 'today' || period === 'yesterday') return ['hour'];
  if (period === 'thisWeek') return ['day'];
  if (period === 'thisMonth' || period === 'lastMonth') return ['day', 'week', 'month'];
  if (period === 'thisYear' || period === 'lastYear') return ['week', 'month'];
  const days = (new Date(to).getTime() - new Date(from).getTime()) / 86_400_000;
  if (days <= 1) return ['hour'];
  if (days <= 90) return ['day', 'week', 'month'];
  if (days <= 730) return ['week', 'month', 'year'];
  return ['month', 'year'];
}

function periodGranularity(period: Period, from: string, to: string): ChartGranularity {
  if (period === 'today' || period === 'yesterday') return 'hour';
  if (period === 'thisYear' || period === 'lastYear') return 'month';
  if (period === 'custom') {
    const days = (new Date(to).getTime() - new Date(from).getTime()) / 86_400_000;
    if (days <= 1) return 'hour';
    if (days <= 90) return 'day';
    if (days <= 730) return 'month';
    return 'year';
  }
  return 'day';
}

function getDateRange(period: Exclude<Period, 'custom'>): { from: string; to: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();
  const fmt = (dt: Date) => dt.toISOString().slice(0, 10);
  if (period === 'today')     return { from: fmt(new Date(y, m, d)),     to: fmt(new Date(y, m, d)) };
  if (period === 'yesterday') return { from: fmt(new Date(y, m, d - 1)), to: fmt(new Date(y, m, d - 1)) };
  if (period === 'thisWeek') {
    const day = now.getDay();
    const mon = new Date(y, m, d - (day === 0 ? 6 : day - 1));
    return { from: fmt(mon), to: fmt(now) };
  }
  if (period === 'lastMonth') return { from: fmt(new Date(y, m - 1, 1)), to: fmt(new Date(y, m, 0)) };
  if (period === 'thisYear')  return { from: fmt(new Date(y, 0, 1)), to: fmt(now) };
  if (period === 'lastYear')  return { from: `${y - 1}-01-01`, to: `${y - 1}-12-31` };
  return { from: fmt(new Date(y, m, 1)), to: fmt(now) };
}

/**
 * Returns the matching prior window for any period, so we can show Δ% changes.
 * - Named periods map to their natural predecessor (today→yesterday, thisMonth→lastMonth, …)
 * - Custom ranges shift back by exactly the same number of days
 */
function getPreviousPeriod(period: Period, from: string, to: string): { from: string; to: string } {
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const now  = new Date();
  const y    = now.getFullYear();
  const mo   = now.getMonth();
  const d    = now.getDate();

  if (period === 'today')     return { from: fmt(new Date(y, mo, d - 1)),   to: fmt(new Date(y, mo, d - 1)) };
  if (period === 'yesterday') return { from: fmt(new Date(y, mo, d - 2)),   to: fmt(new Date(y, mo, d - 2)) };
  if (period === 'thisWeek') {
    const day      = now.getDay();
    const thisMonday = new Date(y, mo, d - (day === 0 ? 6 : day - 1));
    const lastMonday = new Date(thisMonday.getTime() - 7 * 86_400_000);
    const lastSunday = new Date(thisMonday.getTime() - 86_400_000);
    return { from: fmt(lastMonday), to: fmt(lastSunday) };
  }
  if (period === 'thisMonth') return { from: fmt(new Date(y, mo - 1, 1)),   to: fmt(new Date(y, mo, 0)) };
  if (period === 'lastMonth') return { from: fmt(new Date(y, mo - 2, 1)),   to: fmt(new Date(y, mo - 1, 0)) };
  if (period === 'thisYear')  return { from: `${y - 1}-01-01`,               to: `${y - 1}-12-31` };
  if (period === 'lastYear')  return { from: `${y - 2}-01-01`,               to: `${y - 2}-12-31` };
  // custom: shift back by the same number of days (inclusive)
  const fromMs = new Date(from).getTime();
  const toMs   = new Date(to).getTime();
  const span   = toMs - fromMs + 86_400_000; // inclusive length in ms
  return {
    from: fmt(new Date(fromMs - span)),
    to:   fmt(new Date(toMs   - span)),
  };
}

// ── Period constants ──────────────────────────────────────────────────────────

const REPORT_FIXED_PERIOD_KEYS: Period[] = ['today', 'yesterday', 'thisMonth'];

const REPORT_MORE_OPTION_KEYS: { key: Period; icon: string }[] = [
  { key: 'thisWeek',  icon: '🗓️' },
  { key: 'lastMonth', icon: '📆' },
  { key: 'thisYear',  icon: '📊' },
  { key: 'lastYear',  icon: '📋' },
];

const REPORT_MORE_PERIOD_KEYS: (Period | 'custom')[] = ['thisWeek', 'lastMonth', 'thisYear', 'lastYear', 'custom'];

// ── More periods sheet ────────────────────────────────────────────────────────

function ReportMoreSheet({
  visible, onClose, period, customFrom, customTo, onCustomFrom, onCustomTo, onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  period: Period;
  customFrom: string;
  customTo: string;
  onCustomFrom: (v: string) => void;
  onCustomTo: (v: string) => void;
  onSelect: (p: Period) => void;
}) {
  const typo = useTypography();
  const { t } = useTranslation();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <View className="bg-white dark:bg-gray-900 rounded-t-3xl px-5 pt-5 pb-10">
          <View className="flex-row items-center justify-between mb-5">
            <Text className={`${typo.section} text-gray-900 dark:text-white`}>{t('report.morePeriods')}</Text>
            <TouchableOpacity
              onPress={onClose}
              className="w-8 h-8 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700"
            >
              <Ionicons name="close" size={16} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {REPORT_MORE_OPTION_KEYS.map(({ key, icon }) => {
            const active = period === key;
            return (
              <TouchableOpacity
                key={key}
                onPress={() => onSelect(key)}
                className={`flex-row items-center justify-between px-4 py-3.5 rounded-2xl mb-2 ${
                  active ? 'bg-indigo-600' : 'bg-gray-50 dark:bg-gray-800'
                }`}
              >
                <Text className={`${typo.label} ${active ? 'text-white' : 'text-gray-700 dark:text-gray-200'}`}>
                  {icon} {t(`report.period.${key}`)}
                </Text>
                {active && <Ionicons name="checkmark" size={16} color="white" />}
              </TouchableOpacity>
            );
          })}

          <View className="mt-4">
            <Text className={`${typo.captionBold} text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3`}>
              {t('report.period.custom')}
            </Text>
            <View className="flex-row gap-3 mb-3">
              <View className="flex-1 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 bg-gray-50 dark:bg-gray-800">
                <DatePickerInput value={customFrom} onChange={onCustomFrom} placeholder={t('report.customFrom')} maximumDate={new Date()} />
              </View>
              <View className="flex-1 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 bg-gray-50 dark:bg-gray-800">
                <DatePickerInput value={customTo} onChange={onCustomTo} placeholder={t('report.customTo')} maximumDate={new Date()} />
              </View>
            </View>
            {customFrom.length === 10 && customTo.length === 10 && (
              <TouchableOpacity
                onPress={() => onSelect('custom')}
                className="bg-indigo-600 rounded-2xl py-3.5 items-center"
              >
                <Text className={`${typo.labelBold} text-white`}>{t('report.applyRange')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Constants ─────────────────────────────────────────────────────────────────

const PAYMENT_METHODS = [
  { key: undefined,          labelKey: 'common.all' },
  { key: 'CASH',             labelKey: 'report.paymentCash' },
  { key: 'BANK_TRANSFER',    labelKey: 'report.paymentTransfer' },
  { key: 'CARD',             labelKey: 'report.paymentCard' },
] as const;

const ORDER_STATUSES = [
  { key: undefined,   labelKey: 'common.all' },
  { key: 'COMPLETED', labelKey: 'report.statusCompleted' },
  { key: 'CANCELLED', labelKey: 'report.statusCancelled' },
  { key: 'PENDING',   labelKey: 'report.statusPending' },
] as const;

const EXPENSE_CATEGORIES = [
  { key: undefined,      labelKey: 'common.all' },
  { key: 'RENT',         labelKey: 'report.expenseRent' },
  { key: 'ELECTRICITY',  labelKey: 'report.expenseElectricity' },
  { key: 'WATER',        labelKey: 'report.expenseWater' },
  { key: 'SUPPLIES',     labelKey: 'report.expenseSupplies' },
  { key: 'SALARY_EXTRA', labelKey: 'report.expenseSalary' },
  { key: 'MARKETING',    labelKey: 'report.expenseMarketing' },
  { key: 'OTHER',        labelKey: 'report.expenseOther' },
] as const;

const ORDER_STATUS_STYLE: Record<string, { labelKey: string; bg: string; text: string }> = {
  COMPLETED:   { labelKey: 'report.statusCompleted', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  CANCELLED:   { labelKey: 'report.statusCancelled', bg: 'bg-red-50',     text: 'text-red-600' },
  PENDING:     { labelKey: 'report.statusPending',   bg: 'bg-amber-50',   text: 'text-amber-700' },
  IN_PROGRESS: { labelKey: 'report.statusInProgress',bg: 'bg-blue-50',    text: 'text-blue-700' },
};

// ── Sub-components ─────────────────────────────────────────────────────────────

/** Small pill for the quick-stats row */
const StatChip = memo(function StatChip({
  icon, label, value,
}: {
  icon: string; label: string; value: string;
}) {
  const typo = useTypography();
  return (
    <View className="flex-1 bg-white dark:bg-gray-800 rounded-2xl px-2 py-3 items-center border border-gray-100 dark:border-gray-700">
      <Text className={`${typo.section} mb-1`}>{icon}</Text>
      <Text
        className={`${typo.label} font-bold text-gray-900 dark:text-white`}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
      <Text className={`${typo.caption} text-gray-400 dark:text-gray-500 mt-0.5 text-center`} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
});

/**
 * Tiny pill showing period-over-period % change.
 * Rendered on coloured KPI cards so text is always white-toned.
 */
const ChangeBadge = memo(function ChangeBadge({
  current,
  previous,
}: {
  current: number;
  previous: number | undefined;
}) {
  const typo = useTypography();
  const { t } = useTranslation();
  if (previous == null || previous === 0) return null;
  const pct  = Math.round(((current - previous) / Math.abs(previous)) * 100);
  const isUp = pct >= 0;
  return (
    <View className="flex-row items-center gap-0.5 self-start mt-1.5 bg-white/20 rounded-full px-2 py-0.5">
      <Text className={`${typo.caption} text-white font-bold`}>{isUp ? '↑' : '↓'}</Text>
      <Text className={`${typo.caption} text-white/90 font-semibold`}>
        {isUp ? '+' : ''}{pct}% {t('report.vsPrevPeriod')}
      </Text>
    </View>
  );
});

function FilterChips<T extends string | undefined>({
  options, value, onChange,
}: {
  options: readonly { key: T; labelKey: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const typo = useTypography();
  const { t } = useTranslation();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ padding: 4, gap: 6, paddingHorizontal: 16, paddingBottom: 2 }}
    >
      {options.map((o) => {
        const active = o.key === value;
        return (
          <TouchableOpacity
            key={String(o.key ?? 'all')}
            onPress={() => onChange(o.key as T)}
            activeOpacity={0.75}
            className={`px-3 py-1.5 rounded-full ${
              active
                ? 'bg-indigo-600'
                : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600'
            }`}
          >
            <Text
              className={`${typo.captionBold} ${
                active ? 'text-white' : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              {t(o.labelKey)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const OrderRow = memo(function OrderRow({ order, onPress }: { order: OrderSummary; onPress: () => void }) {
  const typo = useTypography();
  const isHidden = usePrivacyStore((s) => s.isHidden);
  const { t } = useTranslation();
  const cfg = ORDER_STATUS_STYLE[order.status] ?? {
    labelKey: order.status,
    bg: 'bg-gray-100',
    text: 'text-gray-600',
  };
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} className="bg-white dark:bg-gray-800 rounded-2xl mx-4 mb-2 px-4 py-3.5">
      <View className="flex-row items-center justify-between gap-3 mb-1">
        <View className="flex-row items-center gap-2 flex-1 min-w-0">
          <Text className={`${typo.labelBold} text-gray-900 dark:text-white`} numberOfLines={1}>
            {order.orderNumber}
          </Text>
          <View className={`${cfg.bg} dark:opacity-90 px-2 py-0.5 rounded-full`}>
            <Text className={`${typo.caption} ${cfg.text} font-semibold`}>
              {t(cfg.labelKey)}
            </Text>
          </View>
        </View>
        <Text className={`${typo.body} text-gray-900 dark:text-white`}>
          {isHidden ? '••••••' : formatVnd(order.total)}
        </Text>
      </View>
      <Text className={`${typo.caption} text-gray-400 dark:text-gray-500`}>
        {order.customerName ?? t('pos.walkIn')}
      </Text>
    </TouchableOpacity>
  );
});

const ExpenseRow = memo(function ExpenseRow({ expense }: { expense: ExpenseData }) {
  const typo = useTypography();
  const isHidden = usePrivacyStore((s) => s.isHidden);
  return (
    <View className="bg-white dark:bg-gray-800 rounded-2xl mx-4 mb-2 px-4 py-3.5">
      <View className="flex-row items-start justify-between gap-3 mb-1">
        <Text
          className={`${typo.labelBold} text-gray-900 dark:text-white flex-1`}
          numberOfLines={1}
        >
          {expense.description ?? expense.categoryDisplayName}
        </Text>
        <Text className={`${typo.body} text-rose-500`}>
          {isHidden ? '••••••' : `−${formatVnd(expense.amount)}`}
        </Text>
      </View>
      <View className="flex-row items-center gap-1.5">
        <Text className={`${typo.caption} text-gray-400 dark:text-gray-500`}>{expense.expenseDate}</Text>
        {expense.description && (
          <>
            <Text className={`${typo.caption} text-gray-300 dark:text-gray-600`}>·</Text>
            <Text className={`${typo.caption} text-gray-400 dark:text-gray-500`}>
              {expense.categoryDisplayName}
            </Text>
          </>
        )}
      </View>
    </View>
  );
});

// ── Main screen ────────────────────────────────────────────────────────────────

export function ReportScreen({ navigation }: ReportScreenProps<'ReportMain'>) {
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const typo = useTypography();
  const isHidden = usePrivacyStore((s) => s.isHidden);
  const has = useFeatureCheck();

  // Controls only the list section — KPIs and chart always show both
  const [listTab, setListTab]             = useState<ListTab>('revenue');
  const [period, setPeriod]               = useState<Period>('thisMonth');
  const [customFrom, setCustomFrom]       = useState('');
  const [customTo, setCustomTo]           = useState('');
  const [showMoreSheet, setShowMoreSheet] = useState(false);
  const [paymentFilter, setPaymentFilter]       = useState<string | undefined>(undefined);
  const [statusFilter, setStatusFilter]         = useState<string | undefined>(undefined);
  const [expCategory, setExpCategory]           = useState<string | undefined>(undefined);
  const [customerSort, setCustomerSort]         = useState<'spend' | 'frequency'>('spend');

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const range = useMemo(() => period === 'custom'
    ? { from: customFrom || today, to: customTo || today }
    : getDateRange(period),
  [period, customFrom, customTo, today]);
  const customReady = period !== 'custom' || (customFrom.length === 10 && customTo.length === 10);

  // Previous period — used for Δ% badges on KPI cards
  const prevRange = useMemo(
    () => getPreviousPeriod(period, range.from, range.to),
    [period, range.from, range.to],
  );

  const [chartGranularity, setChartGranularity] = useState<ChartGranularity>(
    () => periodGranularity(period, range.from, range.to),
  );

  const handlePeriodChange = useCallback((p: Period) => {
    setPeriod(p);
    setShowMoreSheet(false);
    if (p !== 'custom') {
      const r = getDateRange(p);
      setChartGranularity(periodGranularity(p, r.from, r.to));
    }
  }, []);

  const allowedGranularities = useMemo(
    () => getAllowedGranularities(period, range.from, range.to),
    [period, range.from, range.to],
  );

  const moreActive = (REPORT_MORE_PERIOD_KEYS as string[]).includes(period);

  // ── Feature flags ────────────────────────────────────────────────────────────

  const canProduct      = has('PRODUCT');
  const canCustomer     = has('CUSTOMER');
  const canViewAllOrders = has('ORDER_VIEW_ALL');

  // ── Shop type (cached — resolves instantly if Dashboard already fetched it) ──

  const { data: shopInfo } = useQuery({
    queryKey: ['shopConfig'],
    queryFn: () => shopConfigApi.getInfo().then((r) => r.data.data),
    staleTime: 10 * 60_000,
  });
  const shopTypeCode  = shopInfo?.shopTypeCode ?? '';
  const isServiceShop = SERVICE_SHOP_CODES.includes(shopTypeCode);
  const isPawnShop    = shopTypeCode === PAWN_SHOP_CODE;
  const isFbShop      = FB_CODES.includes(shopTypeCode);

  // ── Queries — all always enabled so KPIs, chart, rankings are instant ────────

  const { data: revSummary, isLoading: loadingRevSummary } = useQuery({
    queryKey: ['report', 'revenue', range.from, range.to],
    queryFn: () => orderApi.summary({ from: range.from, to: range.to, status: 'COMPLETED' }).then((r) => r.data.data),
    staleTime: 60_000,
    enabled: customReady,
    placeholderData: keepPreviousData,
  });

  const { data: revChart = [] } = useQuery({
    queryKey: ['report', 'revenue-chart', range.from, range.to, chartGranularity],
    queryFn: () => orderApi.chart({ from: range.from, to: range.to, granularity: chartGranularity }).then((r) => r.data.data),
    staleTime: 60_000,
    enabled: customReady,
    placeholderData: keepPreviousData,
  });

  const {
    data: revOrders,
    fetchNextPage: fetchMoreOrders,
    hasNextPage: hasMoreOrders,
    isFetchingNextPage: fetchingMoreOrders,
    isLoading: loadingRevOrders,
  } = useInfiniteQuery({
    queryKey: ['report', 'order-list', range.from, range.to, statusFilter, paymentFilter],
    queryFn: ({ pageParam = 0 }) =>
      orderApi.filteredList({ from: range.from, to: range.to, status: statusFilter, paymentMethod: paymentFilter, page: pageParam })
        .then((r) => r.data.data),
    initialPageParam: 0,
    getNextPageParam: (last, all) => last.totalPages > all.length ? all.length : undefined,
    staleTime: 30_000,
    enabled: customReady,
    placeholderData: keepPreviousData,
  });

  const { data: expSummary, isLoading: loadingExpSummary } = useQuery({
    queryKey: ['report', 'expenses', range.from, range.to],
    queryFn: () => expenseApi.summary({ from: range.from, to: range.to }).then((r) => r.data.data),
    staleTime: 60_000,
    enabled: customReady,
    placeholderData: keepPreviousData,
  });

  const { data: expChart = [] } = useQuery({
    queryKey: ['report', 'expenses-chart', range.from, range.to, chartGranularity],
    queryFn: () => expenseApi.chart({ from: range.from, to: range.to, granularity: chartGranularity }).then((r) => r.data.data),
    staleTime: 60_000,
    enabled: customReady,
    placeholderData: keepPreviousData,
  });

  const {
    data: expList,
    fetchNextPage: fetchMoreExp,
    hasNextPage: hasMoreExp,
    isFetchingNextPage: fetchingMoreExp,
    isLoading: loadingExpList,
  } = useInfiniteQuery({
    queryKey: ['report', 'expense-list', range.from, range.to, expCategory],
    queryFn: ({ pageParam = 0 }) =>
      expenseApi.list({ from: range.from, to: range.to, category: expCategory, page: pageParam })
        .then((r) => r.data.data),
    initialPageParam: 0,
    getNextPageParam: (last, all) => last.totalPages > all.length ? all.length : undefined,
    staleTime: 30_000,
    enabled: customReady,
    placeholderData: keepPreviousData,
  });

  // ── Previous-period summaries (Δ% badges) ────────────────────────────────────

  const { data: prevRevSummary } = useQuery({
    queryKey: ['report', 'revenue-prev', prevRange.from, prevRange.to],
    queryFn: () => orderApi.summary({ from: prevRange.from, to: prevRange.to, status: 'COMPLETED' }).then((r) => r.data.data),
    staleTime: 5 * 60_000,
    enabled: customReady,
    placeholderData: keepPreviousData,
  });

  const { data: prevExpSummary } = useQuery({
    queryKey: ['report', 'expenses-prev', prevRange.from, prevRange.to],
    queryFn: () => expenseApi.summary({ from: prevRange.from, to: prevRange.to }).then((r) => r.data.data),
    staleTime: 5 * 60_000,
    enabled: customReady,
    placeholderData: keepPreviousData,
  });

  // ── Phase 1: rankings ─────────────────────────────────────────────────────────

  const { data: topProducts = [], isLoading: topProductsLoading } = useQuery({
    queryKey: ['report', 'top-products', range.from, range.to],
    queryFn: () => orderApi.topProducts({ limit: 5, from: range.from, to: range.to }).then((r) => r.data.data),
    staleTime: 60_000,
    enabled: customReady && canProduct && !isPawnShop,
    placeholderData: keepPreviousData,
  });

  const { data: topCustomers = [], isLoading: topCustomersLoading } = useQuery({
    queryKey: ['report', 'top-customers', range.from, range.to],
    queryFn: () => orderApi.topCustomers({ limit: 10, from: range.from, to: range.to }).then((r) => r.data.data),
    staleTime: 60_000,
    enabled: customReady && canCustomer,
    placeholderData: keepPreviousData,
  });

  const { data: topCustomersByFreq = [], isLoading: topCustomersByFreqLoading } = useQuery({
    queryKey: ['report', 'top-customers-freq', range.from, range.to],
    queryFn: () => orderApi.topCustomersByFrequency({ limit: 10, from: range.from, to: range.to }).then((r) => r.data.data),
    staleTime: 60_000,
    enabled: customReady && canCustomer,
    placeholderData: keepPreviousData,
  });

  const { data: customerStats } = useQuery({
    queryKey: ['report', 'customer-stats', range.from, range.to],
    queryFn: () => orderApi.customerStats({ from: range.from, to: range.to }).then((r) => r.data.data),
    staleTime: 60_000,
    enabled: customReady && canCustomer,
    placeholderData: keepPreviousData,
  });

  const { data: topEmployees = [], isLoading: topEmployeesLoading } = useQuery({
    queryKey: ['report', 'top-employees', range.from, range.to],
    queryFn: () => orderApi.topEmployees({ limit: 5, from: range.from, to: range.to }).then((r) => r.data.data),
    staleTime: 60_000,
    enabled: customReady && canViewAllOrders,
    placeholderData: keepPreviousData,
  });

  // ── Phase 2: payment split + category breakdowns ──────────────────────────────

  const { data: paymentBreakdown = [], isLoading: paymentBreakdownLoading } = useQuery({
    queryKey: ['report', 'payment-breakdown', range.from, range.to],
    queryFn: () => revenueApi.paymentBreakdown(range.from, range.to).then((r) => r.data.data),
    staleTime: 60_000,
    enabled: customReady,
    placeholderData: keepPreviousData,
  });

  const { data: revCategories = [], isLoading: revCategoriesLoading } = useQuery({
    queryKey: ['report', 'rev-categories', range.from, range.to],
    queryFn: () => revenueApi.categoryBreakdown(range.from, range.to).then((r) => r.data.data),
    staleTime: 60_000,
    enabled: customReady && canProduct && !isPawnShop,
    placeholderData: keepPreviousData,
  });

  const { data: expCategories = [], isLoading: expCategoriesLoading } = useQuery({
    queryKey: ['report', 'exp-categories', range.from, range.to],
    queryFn: () => expenseApi.categoryBreakdown(range.from, range.to).then((r) => r.data.data),
    staleTime: 60_000,
    enabled: customReady,
    placeholderData: keepPreviousData,
  });

  // ── Derived ───────────────────────────────────────────────────────────────────

  const orderItems   = revOrders?.pages.flatMap((p) => p.content) ?? [];
  const expenseItems = expList?.pages.flatMap((p) => p.content)   ?? [];

  // Skeleton shows while either KPI summary is loading
  const isLoading = loadingRevSummary || loadingExpSummary;

  // Drives the list section only
  const isRevenue = listTab === 'revenue';

  // ── Phase 3: net-profit per period + running balance ─────────────────────────

  const netData = useMemo(() => {
    if (revChart.length === 0 && expChart.length === 0) return [];
    // Union of ALL labels from both series — expense-only buckets (no revenue) must
    // appear as negative bars, not be silently dropped by iterating only revChart.
    const revMap   = new Map(revChart.map((d) => [d.label, d.value]));
    const expMap   = new Map(expChart.map((d) => [d.label, d.value]));
    const allLabels = Array.from(new Set([...revMap.keys(), ...expMap.keys()])).sort();
    return allLabels.map((label) => ({
      label,
      value: (revMap.get(label) ?? 0) - (expMap.get(label) ?? 0),
    }));
  }, [revChart, expChart]);

  const cumulativeData = useMemo(() => {
    let running = 0;
    return netData.map((d) => {
      running += d.value;
      return { label: d.label, value: running };
    });
  }, [netData]);

  // Previous-period derived net (for net profit Δ badge)
  const prevNet = prevRevSummary != null && prevExpSummary != null
    ? (prevRevSummary.totalRevenue ?? 0) - (prevExpSummary.total ?? 0)
    : undefined;

  // Quick-stats derived values
  const avgOrder       = revSummary && revSummary.orderCount > 0
    ? Math.round(revSummary.totalRevenue / revSummary.orderCount) : 0;
  const completionRate = revSummary && revSummary.orderCount > 0
    ? Math.round((revSummary.completedCount / revSummary.orderCount) * 100) : null;

  // Top products label helpers (shop-type aware)
  const topProductsTitle = isServiceShop ? t('report.topProductsService')
    : isFbShop ? t('report.topProductsFb')
    : t('report.topProductsDefault');
  const topProductSub = (count: number) =>
    isServiceShop ? t('report.topProductSubService', { count })
    : isFbShop ? t('report.topProductSubFb', { count })
    : t('report.topProductSubDefault', { count });

  // ── Footer loaders ────────────────────────────────────────────────────────────

  const renderOrderFooter = useCallback(() => {
    if (!fetchingMoreOrders) return null;
    return <ActivityIndicator size="small" color="#059669" style={{ marginVertical: 16 }} />;
  }, [fetchingMoreOrders]);

  const renderExpFooter = useCallback(() => {
    if (!fetchingMoreExp) return null;
    return <ActivityIndicator size="small" color="#f43f5e" style={{ marginVertical: 16 }} />;
  }, [fetchingMoreExp]);

  // ── FlatList header ───────────────────────────────────────────────────────────

  const listHeader = useMemo(() => {
    // net = revenue − operating expenses
    // (expSummary.netVsRevenue is a backend stub that always returns 0, so we compute it here)
    const net      = (revSummary?.totalRevenue ?? 0) - (expSummary?.total ?? 0);
    const isProfit = net >= 0;
    const listItems = isRevenue ? orderItems : expenseItems;

    return (
      <View style={{ paddingBottom: 8 }}>
        {isLoading ? (
          // ── Skeleton ─────────────────────────────────────────────────────────
          <View style={{ gap: 12, padding: 4 }}>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Skeleton height={110} borderRadius={20} style={{ flex: 1 }} />
              <Skeleton height={110} borderRadius={20} style={{ flex: 1 }} />
            </View>
            <Skeleton height={44} borderRadius={16} />
            <Skeleton height={192} borderRadius={16} />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[0, 1, 2].map((i) => <Skeleton key={i} height={80} borderRadius={16} style={{ flex: 1 }} />)}
            </View>
            {[0, 1, 2].map((i) => <Skeleton key={i} height={68} borderRadius={16} />)}
          </View>
        ) : (
          <>
            {/* ── Dual KPI cards ────────────────────────────────────────────── */}
            <View className="flex-row gap-3 mx-4 mt-4">
              {/* Revenue */}
              <View className="flex-1 bg-emerald-500 rounded-2xl px-4 pt-4 pb-4">
                <Text className={`${typo.captionBold} tracking-widest uppercase text-white/70 mb-1`}>
                  {t('report.totalRevenue')}
                </Text>
                <Text
                  testID="report-total-revenue"
                  className={`${typo.heading} text-white font-black`}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {isHidden ? '••••••' : formatVnd(revSummary?.totalRevenue ?? 0)}
                </Text>
                {revSummary && (
                  <Text className={`${typo.caption} text-white/70 mt-1.5`} numberOfLines={1}>
                    {t('report.completedOrders', { count: revSummary.orderCount })}
                    {avgOrder > 0 ? ` · ${isHidden ? '••' : formatVnd(avgOrder)}` : ''}
                  </Text>
                )}
                <ChangeBadge current={revSummary?.totalRevenue ?? 0} previous={prevRevSummary?.totalRevenue} />
              </View>

              {/* Expenses */}
              <View className="flex-1 bg-rose-500 rounded-2xl px-4 pt-4 pb-4">
                <Text className={`${typo.captionBold} tracking-widest uppercase text-white/70 mb-1`}>
                  {t('report.totalExpenses')}
                </Text>
                <Text
                  className={`${typo.heading} text-white font-black`}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {isHidden ? '••••••' : formatVnd(expSummary?.total ?? 0)}
                </Text>
                {expSummary && (
                  <Text className={`${typo.caption} text-white/70 mt-1.5`} numberOfLines={1}>
                    {t('report.fixedExpenses')}: {isHidden ? '••' : formatVnd(expSummary.fixed)}
                  </Text>
                )}
                <ChangeBadge current={expSummary?.total ?? 0} previous={prevExpSummary?.total} />
              </View>
            </View>

            {/* ── Net profit / loss banner ──────────────────────────────────── */}
            {revSummary && expSummary && (
              <View
                className={`mx-4 mt-3 rounded-2xl px-4 py-3 flex-row items-center gap-2 ${
                  isProfit
                    ? 'bg-emerald-50 dark:bg-emerald-950'
                    : 'bg-rose-50 dark:bg-rose-950'
                }`}
              >
                <Text className={typo.label}>{isProfit ? '📈' : '📉'}</Text>
                <View className="flex-1 min-w-0">
                  <Text
                    className={`${typo.captionBold} ${
                      isProfit ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-400'
                    }`}
                    numberOfLines={1}
                  >
                    {isHidden
                      ? (isProfit ? t('report.netProfit', { amount: '••••••' }) : t('report.netLoss', { amount: '••••••' }))
                      : (isProfit
                          ? t('report.netProfit', { amount: formatVnd(net) })
                          : t('report.netLoss', { amount: formatVnd(Math.abs(net)) }))}
                  </Text>
                  {prevNet != null && (() => {
                    const pct = prevNet === 0 ? null : Math.round(((net - prevNet) / Math.abs(prevNet)) * 100);
                    if (pct == null) return null;
                    const up = pct >= 0;
                    return (
                      <Text
                        className={`${typo.caption} mt-0.5 ${
                          up
                            ? 'text-emerald-500 dark:text-emerald-400'
                            : 'text-rose-500 dark:text-rose-400'
                        }`}
                        numberOfLines={1}
                      >
                        {up ? '↑' : '↓'} {up ? '+' : ''}{pct}% {t('report.comparedToPrev')}
                      </Text>
                    );
                  })()}
                </View>
              </View>
            )}

            {/* ── Dual trend chart ─────────────────────────────────────────── */}
            {revChart.length > 0 && (
              <View className="mx-4 mt-3">
                <TrendChart
                  data={revChart}
                  color="#059669"
                  secondaryData={expChart.length > 0 ? expChart : undefined}
                  secondaryColor="#f43f5e"
                  granularity={chartGranularity}
                  allowedGranularities={allowedGranularities}
                  onGranularityChange={setChartGranularity}
                  title={t('report.tabRevenue')}
                  secondaryTitle={t('report.tabExpenses')}
                />
              </View>
            )}

            {/* ── Revenue vs Expenses stacked bar chart ────────────────────── */}
            {(revChart.length > 0 || expChart.length > 0) && (
              <View className="mx-4 mt-3">
                <TrendChart
                  data={revChart}
                  color="#059669"
                  secondaryData={expChart.length > 0 ? expChart : undefined}
                  secondaryColor="#f43f5e"
                  stacked
                  granularity={chartGranularity}
                  title={t('report.netTrendTitle')}
                  secondaryTitle={t('report.expenseSeriesTitle')}
                />
              </View>
            )}

            {/* ── Running balance (cumulative net) ─────────────────────────── */}
            {cumulativeData.length > 1 && cumulativeData.some((d) => d.value !== 0) && (
              <View className="mx-4 mt-3 bg-white dark:bg-gray-800 rounded-2xl px-4 pt-4 pb-2 border border-gray-100 dark:border-gray-700">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className={`${typo.captionBold} uppercase tracking-wider text-gray-400 dark:text-gray-500`}>
                    {t('report.balanceTrend')}
                  </Text>
                  <Text className={`${typo.caption} text-gray-400 dark:text-gray-500`}>
                    {cumulativeData[cumulativeData.length - 1]!.value >= 0 ? t('report.trending.profit') : t('report.trending.loss')}
                  </Text>
                </View>
                <NetChart data={cumulativeData} granularity={chartGranularity} lang={i18n.language} />
              </View>
            )}

            {/* ── Quick stats chips ─────────────────────────────────────────── */}
            {revSummary && (
              <View className="flex-row gap-2 mx-4 mt-3">
                <StatChip
                  icon="✅"
                  label={t('report.completionRateLabel')}
                  value={completionRate != null ? `${completionRate}%` : '—'}
                />
                <StatChip
                  icon="🧮"
                  label={t('report.avgOrder')}
                  value={isHidden ? '••••' : (avgOrder > 0 ? formatVnd(avgOrder) : '—')}
                />
                <StatChip
                  icon="❌"
                  label={t('report.statusCancelled')}
                  value={t('report.cancelledCountSub', { count: revSummary.cancelledCount })}
                />
              </View>
            )}

            {/* ── Top products / services / dishes ─────────────────────────── */}
            {canProduct && !isPawnShop && (topProductsLoading || topProducts.length > 0) && (
              <View className="mx-4 mt-3 bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700">
                <SectionHeader
                  title={topProductsTitle}
                  onSeeAll={() => navigation.getParent()?.navigate('More', {
                    screen: 'Products',
                    params: { screen: 'ProductList' },
                  } as any)}
                />
                {topProductsLoading
                  ? [0, 1, 2].map((i) => <Skeleton key={i} height={44} borderRadius={12} style={{ marginBottom: 8 }} />)
                  : topProducts.map((p, i) => (
                      <RankRow
                        key={p.name + i}
                        rank={i + 1}
                        name={p.name}
                        sub={topProductSub(p.orderCount)}
                        value={p.revenue}
                        loading={false}
                        isHidden={isHidden}
                        onPress={p.productId
                          ? () => navigation.getParent()?.navigate('More', {
                              screen: 'Products',
                              params: { screen: 'ProductDetail', params: { productId: p.productId } },
                            } as any)
                          : undefined}
                      />
                    ))}
              </View>
            )}

            {/* ── Top customers ─────────────────────────────────────────────── */}
            {canCustomer && (topCustomersLoading || topCustomers.length > 0) && (() => {
              const activeList   = customerSort === 'spend' ? topCustomers : topCustomersByFreq;
              const activeLoading = customerSort === 'spend' ? topCustomersLoading : topCustomersByFreqLoading;

              // Customer concentration: % of total revenue from top 3
              const top3Spend = topCustomers.slice(0, 3).reduce((s, c) => s + c.totalSpend, 0);
              const totalRev  = revSummary?.totalRevenue ?? 0;
              const concentration = totalRev > 0 ? Math.round((top3Spend / totalRev) * 100) : null;

              return (
                <View className="mx-4 mt-3 bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700">
                  <SectionHeader
                    title={t('report.topCustomers')}
                    onSeeAll={() => navigation.getParent()?.navigate('Home', {
                      screen: 'CustomerList',
                    } as any)}
                  />

                  {/* Sort toggle */}
                  <View className="flex-row bg-gray-100 dark:bg-gray-700 rounded-xl p-0.5 mb-3 self-start gap-0.5">
                    {(['spend', 'frequency'] as const).map((key) => {
                      const active = customerSort === key;
                      return (
                        <TouchableOpacity
                          key={key}
                          onPress={() => setCustomerSort(key)}
                          activeOpacity={0.8}
                          className={`px-3 py-1.5 rounded-lg ${active ? 'bg-indigo-600' : ''}`}
                        >
                          <Text className={`${typo.captionBold} ${active ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                            {key === 'spend' ? t('report.customerSortSpend') : t('report.customerSortFrequency')}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* New vs returning + concentration */}
                  {customerStats && (
                    <View className="flex-row items-center gap-3 mb-3 px-1">
                      <View className="flex-row items-center gap-1.5">
                        <Text className={typo.caption}>👥</Text>
                        <Text className={`${typo.caption} text-gray-500 dark:text-gray-400`}>
                          {t('report.customersTotal', { count: customerStats.total })}
                        </Text>
                      </View>
                      {customerStats.newCount > 0 && (
                        <View className="flex-row items-center gap-1">
                          <View className="bg-emerald-100 dark:bg-emerald-900/40 rounded-full px-2 py-0.5">
                            <Text className={`${typo.caption} text-emerald-700 dark:text-emerald-400 font-semibold`}>
                              {t('report.customersNew', { count: customerStats.newCount })}
                            </Text>
                          </View>
                        </View>
                      )}
                      {customerStats.returningCount > 0 && (
                        <View className="flex-row items-center gap-1">
                          <View className="bg-indigo-50 dark:bg-indigo-900/40 rounded-full px-2 py-0.5">
                            <Text className={`${typo.caption} text-indigo-600 dark:text-indigo-400 font-semibold`}>
                              {t('report.customersReturning', { count: customerStats.returningCount })}
                            </Text>
                          </View>
                        </View>
                      )}
                    </View>
                  )}

                  {/* Concentration stat */}
                  {concentration != null && concentration > 0 && (
                    <View className="flex-row items-center gap-1.5 mb-3 px-1 py-2 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                      <Text className={typo.caption}>⚠️</Text>
                      <Text className={`${typo.caption} text-amber-700 dark:text-amber-400 flex-1`}>
                        {t('report.top3ConcentrationPre')} <Text className="font-bold">{concentration}%</Text> {t('report.top3Revenue')}
                        {concentration >= 60 ? ` ${t('report.top3HighDependency')}` : ''}
                      </Text>
                    </View>
                  )}

                  {/* Ranked list */}
                  {activeLoading
                    ? [0, 1, 2].map((i) => <Skeleton key={i} height={44} borderRadius={12} style={{ marginBottom: 8 }} />)
                    : activeList.map((c, i) => (
                        <RankRow
                          key={c.customerId + i}
                          rank={i + 1}
                          name={c.name}
                          sub={customerSort === 'spend'
                            ? t('report.customerSubSpend', { count: c.orderCount })
                            : t('report.customerSubFrequency', { count: c.orderCount })}
                          value={c.totalSpend}
                          loading={false}
                          isHidden={isHidden}
                          onPress={c.customerId
                            ? () => navigation.getParent()?.navigate('Home', {
                                screen: 'CustomerDetail',
                                params: { customerId: c.customerId },
                              } as any)
                            : undefined}
                        />
                      ))}
                </View>
              );
            })()}

            {/* ── Top employees (ORDER_VIEW_ALL only) ───────────────────────── */}
            {canViewAllOrders && (topEmployeesLoading || topEmployees.length > 0) && (
              <View className="mx-4 mt-3 bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700">
                <SectionHeader
                  title={t('report.topEmployees')}
                  onSeeAll={() => navigation.getParent()?.navigate('More', {
                    screen: 'StaffList',
                  } as any)}
                />
                {topEmployeesLoading
                  ? [0, 1, 2].map((i) => <Skeleton key={i} height={44} borderRadius={12} style={{ marginBottom: 8 }} />)
                  : topEmployees.map((e, i) => (
                      <RankRow
                        key={e.name + i}
                        rank={i + 1}
                        name={e.name}
                        sub={t('report.employeeSub', { count: e.orderCount })}
                        value={e.revenue}
                        loading={false}
                        isHidden={isHidden}
                        onPress={e.userId
                          ? () => navigation.getParent()?.navigate('More', {
                              screen: 'StaffDetail',
                              params: { userId: String(e.userId) },
                            } as any)
                          : undefined}
                      />
                    ))}
              </View>
            )}

            {/* ── Payment method split ──────────────────────────────────────── */}
            {(paymentBreakdownLoading || paymentBreakdown.length > 0) && (
              <View className="mx-4 mt-3 bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700">
                <SectionHeader title={t('report.paymentBreakdown')} />
                {paymentBreakdownLoading
                  ? [0, 1, 2].map((i) => <Skeleton key={i} height={36} borderRadius={10} style={{ marginBottom: 8 }} />)
                  : paymentBreakdown.map((item) => {
                      const label = item.paymentMethod === 'CASH'          ? `💵 ${t('report.paymentCash')}`
                                  : item.paymentMethod === 'BANK_TRANSFER' ? `🏦 ${t('report.paymentTransfer')}`
                                  : item.paymentMethod === 'CARD'          ? `💳 ${t('report.paymentCard')}`
                                  :                                           t('report.paymentOther', { method: item.paymentMethod });
                      return (
                        <View key={item.paymentMethod} className="mb-2.5">
                          <View className="flex-row items-center justify-between mb-1">
                            <Text className={`${typo.label} text-gray-700 dark:text-gray-200`}>{label}</Text>
                            <Text className={`${typo.captionBold} text-gray-500 dark:text-gray-400`}>
                              {isHidden ? '••••' : formatVnd(item.totalAmount)}
                              <Text className={`${typo.caption} text-gray-400`}> ({item.percentage}%)</Text>
                            </Text>
                          </View>
                          <View className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                            <View
                              className="h-full bg-indigo-500 rounded-full"
                              style={{ width: `${Math.min(item.percentage, 100)}%` }}
                            />
                          </View>
                        </View>
                      );
                    })}
              </View>
            )}

            {/* ── Revenue by category ───────────────────────────────────────── */}
            {canProduct && !isPawnShop && (revCategoriesLoading || revCategories.length > 0) && (
              <View className="mx-4 mt-3 bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700">
                <SectionHeader title={t('report.revCategories')} />
                {revCategoriesLoading
                  ? [0, 1, 2].map((i) => <Skeleton key={i} height={44} borderRadius={12} style={{ marginBottom: 8 }} />)
                  : revCategories.slice(0, 8).map((cat, i) => (
                      <RankRow
                        key={cat.categoryName + i}
                        rank={i + 1}
                        name={cat.categoryName}
                        sub={t('report.revCategorySub', { count: cat.orderCount, pct: cat.percentage })}
                        value={cat.revenue}
                        loading={false}
                        isHidden={isHidden}
                      />
                    ))}
              </View>
            )}

            {/* ── Expense by category ───────────────────────────────────────── */}
            {(expCategoriesLoading || expCategories.length > 0) && (
              <View className="mx-4 mt-3 bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700">
                <SectionHeader title={t('report.expCategories')} />
                {expCategoriesLoading
                  ? [0, 1, 2].map((i) => <Skeleton key={i} height={44} borderRadius={12} style={{ marginBottom: 8 }} />)
                  : expCategories.slice(0, 8).map((cat, i) => (
                      <RankRow
                        key={cat.category + i}
                        rank={i + 1}
                        name={cat.categoryDisplayName}
                        sub={t('report.expCategorySub', { pct: cat.percentage })}
                        value={cat.total}
                        loading={false}
                        isHidden={isHidden}
                      />
                    ))}
              </View>
            )}

            {/* ── Filter chips (list only) ──────────────────────────────────── */}
            <View className="mt-4 gap-2">
              {isRevenue ? (
                <>
                  <FilterChips
                    options={PAYMENT_METHODS}
                    value={paymentFilter as any}
                    onChange={(v) => setPaymentFilter(v)}
                  />
                  <FilterChips
                    options={ORDER_STATUSES}
                    value={statusFilter as any}
                    onChange={(v) => setStatusFilter(v)}
                  />
                </>
              ) : (
                <FilterChips
                  options={EXPENSE_CATEGORIES}
                  value={expCategory as any}
                  onChange={(v) => setExpCategory(v)}
                />
              )}
            </View>

            {/* ── List section header + mini tab toggle ────────────────────── */}
            <View className="flex-row items-center px-4 mt-5 mb-2 gap-2">
              <View className="flex-row bg-gray-100 dark:bg-gray-800 rounded-xl p-0.5 gap-0.5">
                <TouchableOpacity
                  onPress={() => setListTab('revenue')}
                  activeOpacity={0.8}
                  className={`px-3 py-1.5 rounded-lg ${isRevenue ? 'bg-emerald-500' : ''}`}
                >
                  <Text className={`${typo.captionBold} ${isRevenue ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                    📈 {t('report.tabRevenue')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setListTab('expenses')}
                  activeOpacity={0.8}
                  className={`px-3 py-1.5 rounded-lg ${!isRevenue ? 'bg-rose-500' : ''}`}
                >
                  <Text className={`${typo.captionBold} ${!isRevenue ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                    💸 {t('report.tabExpenses')}
                  </Text>
                </TouchableOpacity>
              </View>
              {listItems.length > 0 && (
                <Text className={`${typo.caption} text-gray-400 dark:text-gray-500 ml-1`}>
                  {t('report.listItemCount', { count: listItems.length })}
                </Text>
              )}
            </View>

            {/* ── Empty state ───────────────────────────────────────────────── */}
            {listItems.length === 0 && (loadingRevOrders || loadingExpList ? null : (
              <View className="bg-white dark:bg-gray-800 rounded-2xl mx-4 py-10 items-center">
                <Text style={{ fontSize: typo.displaySize }} className="mb-2">{isRevenue ? '🧾' : '💸'}</Text>
                <Text className={`${typo.label} text-gray-400 dark:text-gray-500`}>{t('report.empty')}</Text>
              </View>
            ))}
          </>
        )}
      </View>
    );
  }, [
    isLoading, isRevenue, listTab,
    revSummary, expSummary, revChart, expChart,
    chartGranularity, allowedGranularities, orderItems, expenseItems,
    paymentFilter, statusFilter, expCategory,
    loadingRevOrders, loadingExpList,
    // rankings
    topProducts, topCustomers, topEmployees,
    topProductsLoading, topCustomersLoading, topEmployeesLoading,
    topCustomersByFreq, topCustomersByFreqLoading,
    customerStats, customerSort,
    canProduct, canCustomer, canViewAllOrders,
    isPawnShop, isServiceShop, isFbShop,
    topProductsTitle, topProductSub,
    // phase 2
    paymentBreakdown, revCategories, expCategories,
    paymentBreakdownLoading, revCategoriesLoading, expCategoriesLoading,
    // phase 3
    prevRevSummary, prevExpSummary, prevNet,
    netData, cumulativeData,
    i18n.language,
    // derived
    avgOrder, completionRate,
    isHidden, t, typo,
  ]);

  const renderItem = useCallback(({ item }: { item: OrderSummary | ExpenseData }) =>
    isRevenue
      ? <OrderRow
          order={item as OrderSummary}
          onPress={() => navigation.getParent()?.navigate('Sell', { screen: 'OrderDetail', params: { orderId: String((item as OrderSummary).id) } } as any)}
        />
      : <ExpenseRow expense={item as ExpenseData} />,
  [isRevenue, navigation]);

  const handleEndReached = useCallback(() => {
    if (listTab === 'revenue' && hasMoreOrders) fetchMoreOrders();
    if (listTab === 'expenses' && hasMoreExp) fetchMoreExp();
  }, [listTab, hasMoreOrders, hasMoreExp, fetchMoreOrders, fetchMoreExp]);

  // ── Render ────────────────────────────────────────────────────────────────────

  const items = (isRevenue ? orderItems : expenseItems) as (OrderSummary | ExpenseData)[];

  return (
    <View className="flex-1 bg-gray-100 dark:bg-gray-950">
      {/* ── Fixed header ──────────────────────────────────────────────────────── */}
      <View
        className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800"
        style={{ paddingTop: insets.top + 4 }}
      >
        {/* Title row */}
        <View className="px-4 pb-3 pt-2">
          <Text className={`${typo.heading} text-gray-900 dark:text-white`}>
            {t('report.title')}
          </Text>
          <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 mt-0.5`}>
            {t('report.subtitle')}
          </Text>
        </View>

        {/* Period selector */}
        <View className="flex-row mx-4 mb-2 bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700 shadow-sm">
          {([...REPORT_FIXED_PERIOD_KEYS.map((k) => ({ key: k, isMore: false })), { key: 'more' as const, isMore: true }]).map(({ key, isMore }, i) => {
            const active = isMore ? moreActive : period === key;
            return (
              <View key={key} className="flex-1 flex-row">
                {i > 0 && <View className="w-px bg-gray-100 dark:bg-gray-700" />}
                <TouchableOpacity
                  style={{ flex: 1 }}
                  className={`py-3 items-center ${active ? 'bg-indigo-600' : ''}`}
                  onPress={isMore ? () => setShowMoreSheet(true) : () => handlePeriodChange(key as Period)}
                >
                  <Text
                    className={`${typo.label} ${active ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`}
                    numberOfLines={1}
                  >
                    {t(`report.period.${key}`)}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        {/* Active filter indicator */}
        {moreActive ? (
          <View className="mx-4 mb-3 flex-row items-center bg-indigo-50 dark:bg-indigo-950 rounded-xl px-3 py-2 gap-2">
            <Ionicons name="time-outline" size={14} color="#6366f1" />
            <Text className={`${typo.caption} text-indigo-400 dark:text-indigo-500`}>{t('report.viewing')}:</Text>
            <Text className={`flex-1 ${typo.captionBold} text-indigo-600 dark:text-indigo-300`}>
              {period === 'custom'
                ? `${customFrom} → ${customTo}`
                : t(`report.period.${period}`)}
            </Text>
            <TouchableOpacity
              onPress={() => handlePeriodChange('thisMonth')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-circle" size={16} color="#a5b4fc" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ paddingBottom: 12 }} />
        )}
      </View>

      {/* ── Scrolling content ─────────────────────────────────────────────────── */}
      <FlatList
        data={items}
        keyExtractor={(item) => String((item as any).id)}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          <>
            {listTab === 'revenue' ? renderOrderFooter() : renderExpFooter()}
            <View style={{ height: 32 }} />
          </>
        }
        contentContainerStyle={{ paddingBottom: 8 }}
        renderItem={renderItem as any}
        ListHeaderComponent={listHeader}
      />

      <ReportMoreSheet
        visible={showMoreSheet}
        onClose={() => setShowMoreSheet(false)}
        period={period}
        customFrom={customFrom}
        customTo={customTo}
        onCustomFrom={setCustomFrom}
        onCustomTo={setCustomTo}
        onSelect={handlePeriodChange}
      />
    </View>
  );
}
