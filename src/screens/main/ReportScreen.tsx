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
import { orderApi, expenseApi } from '../../services/api';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ReportStackParamList } from '../../types/navigation';
import { formatVnd } from '../../utils/format';
import { TrendChart } from '../../components/TrendChart';
import { Skeleton } from '../../components/Skeleton';
import type { ChartGranularity } from '../../components/BarChart';
import { DatePickerInput } from '../../components/DatePickerInput';
import type { OrderSummary, ExpenseData } from '../../services/api';
import { useTypography } from '../../hooks/useTypography';

type Tab = 'revenue' | 'expenses';
type Period = 'today' | 'yesterday' | 'thisWeek' | 'lastMonth' | 'thisMonth' | 'thisYear' | 'lastYear' | 'custom';

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

// ── Period constants ──────────────────────────────────────────────────────────

const REPORT_FIXED_PERIODS: { key: Period; label: string }[] = [
  { key: 'today',     label: 'Hôm nay' },
  { key: 'yesterday', label: 'Hôm qua' },
  { key: 'thisMonth', label: 'Tháng này' },
];

const REPORT_MORE_OPTIONS: { key: Period; label: string }[] = [
  { key: 'thisWeek',  label: '📅 Tuần này' },
  { key: 'lastMonth', label: '📆 Tháng trước' },
  { key: 'thisYear',  label: '📈 Năm này' },
  { key: 'lastYear',  label: '📉 Năm ngoái' },
];

const REPORT_MORE_LABEL: Partial<Record<Period, string>> = {
  thisWeek:  'Tuần này',
  lastMonth: 'Tháng trước',
  thisYear:  'Năm này',
  lastYear:  'Năm ngoái',
  custom:    'Tùy chỉnh',
};

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
              <Ionicons name="close" size={16} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {REPORT_MORE_OPTIONS.map(({ key, label }) => {
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
                  {label}
                </Text>
                {active && <Ionicons name="checkmark" size={16} color="white" />}
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
                className="bg-indigo-600 rounded-2xl py-3.5 items-center"
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

// ── Constants ─────────────────────────────────────────────────────────────────

const PAYMENT_METHODS = [
  { key: undefined,          label: 'Tất cả' },
  { key: 'CASH',             label: 'Tiền mặt' },
  { key: 'BANK_TRANSFER',    label: 'Chuyển khoản' },
  { key: 'CARD',             label: 'Thẻ' },
] as const;

const ORDER_STATUSES = [
  { key: undefined,   label: 'Tất cả' },
  { key: 'COMPLETED', label: 'Hoàn thành' },
  { key: 'CANCELLED', label: 'Đã huỷ' },
  { key: 'PENDING',   label: 'Chờ xử lý' },
] as const;

const EXPENSE_CATEGORIES = [
  { key: undefined,      label: 'Tất cả' },
  { key: 'RENT',         label: 'Thuê mặt bằng' },
  { key: 'ELECTRICITY',  label: 'Tiền điện' },
  { key: 'WATER',        label: 'Tiền nước' },
  { key: 'SUPPLIES',     label: 'Vật tư' },
  { key: 'SALARY_EXTRA', label: 'Lương thưởng' },
  { key: 'MARKETING',    label: 'Marketing' },
  { key: 'OTHER',        label: 'Khác' },
] as const;

const ORDER_STATUS_STYLE: Record<string, { label: string; bg: string; text: string }> = {
  COMPLETED:   { label: 'Hoàn thành',  bg: 'bg-emerald-50',  text: 'text-emerald-700' },
  CANCELLED:   { label: 'Đã huỷ',      bg: 'bg-red-50',      text: 'text-red-600' },
  PENDING:     { label: 'Chờ xử lý',   bg: 'bg-amber-50',    text: 'text-amber-700' },
  IN_PROGRESS: { label: 'Đang xử lý',  bg: 'bg-blue-50',     text: 'text-blue-700' },
};

// ── Sub-components ─────────────────────────────────────────────────────────────

function FilterChips<T extends string | undefined>({
  options, value, onChange,
}: {
  options: readonly { key: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const typo = useTypography();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 6, paddingHorizontal: 16, paddingBottom: 2 }}
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
              {o.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const OrderRow = memo(function OrderRow({ order, onPress }: { order: OrderSummary; onPress: () => void }) {
  const typo = useTypography();
  const cfg = ORDER_STATUS_STYLE[order.status] ?? {
    label: order.status,
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
            <Text className={`${cfg.text} font-semibold`} style={{ fontSize: 10 }}>
              {cfg.label}
            </Text>
          </View>
        </View>
        <Text className={`${typo.body} text-gray-900 dark:text-white`}>
          {formatVnd(order.total)}
        </Text>
      </View>
      <Text className={`${typo.caption} text-gray-400 dark:text-gray-500`}>
        {order.customerName ?? 'Khách lẻ'}
      </Text>
    </TouchableOpacity>
  );
});

const ExpenseRow = memo(function ExpenseRow({ expense }: { expense: ExpenseData }) {
  const typo = useTypography();
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
          −{formatVnd(expense.amount)}
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

export function ReportScreen({ navigation }: NativeStackScreenProps<ReportStackParamList, 'ReportMain'>) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const typo = useTypography();

  const [tab, setTab]               = useState<Tab>('revenue');
  const [period, setPeriod]         = useState<Period>('thisMonth');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo]     = useState('');
  const [showMoreSheet, setShowMoreSheet] = useState(false);
  const [paymentFilter, setPaymentFilter] = useState<string | undefined>(undefined);
  const [statusFilter, setStatusFilter]   = useState<string | undefined>(undefined);
  const [expCategory, setExpCategory]     = useState<string | undefined>(undefined);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const range = useMemo(() => period === 'custom'
    ? { from: customFrom || today, to: customTo || today }
    : getDateRange(period),
  [period, customFrom, customTo, today]);
  const customReady = period !== 'custom' || (customFrom.length === 10 && customTo.length === 10);

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

  const moreActive = REPORT_MORE_LABEL[period] !== undefined;

  // ── Queries — both tabs always enabled so switching is instant ───────────────

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

  const orderItems   = revOrders?.pages.flatMap((p) => p.content) ?? [];
  const expenseItems = expList?.pages.flatMap((p) => p.content)   ?? [];

  const isLoading = tab === 'revenue'
    ? (loadingRevSummary || loadingRevOrders)
    : (loadingExpSummary || loadingExpList);

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

  const isRevenue = tab === 'revenue';
  const primaryColor  = isRevenue ? 'bg-emerald-500'  : 'bg-rose-500';
  const chartColor    = isRevenue ? '#059669'          : '#f43f5e';

  const listHeader = useMemo(() => (
    <View style={{ paddingBottom: 8 }}>
      {isLoading ? (
        // ── Skeleton loading ──────────────────────────────────────────────────
        <View style={{ gap: 12, padding: 16 }}>
          <Skeleton height={120} borderRadius={20} />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Skeleton height={80} borderRadius={16} style={{ flex: 1 }} />
            <Skeleton height={80} borderRadius={16} style={{ flex: 1 }} />
          </View>
          <Skeleton height={192} borderRadius={16} />
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={68} borderRadius={16} />
          ))}
        </View>
      ) : (
        <>
          {/* ── Primary KPI card ─────────────────────────────────────────── */}
          <View className={`${primaryColor} mx-4 mt-4 rounded-3xl px-6 pt-5 pb-6`}>
            <Text className={`${typo.captionBold} tracking-widest uppercase text-white/70 mb-2`}>
              {isRevenue ? 'Tổng doanh thu' : 'Tổng chi phí'}
            </Text>
            <Text className="text-white font-black" style={{ fontSize: typo.displaySize, lineHeight: typo.displayLineHeight }}>
              {formatVnd(isRevenue ? (revSummary?.totalRevenue ?? 0) : (expSummary?.total ?? 0))}
            </Text>
            {isRevenue && revSummary ? (
              <Text className={`text-white/70 ${typo.label} mt-2`}>
                {revSummary.orderCount} đơn hàng đã hoàn thành
              </Text>
            ) : !isRevenue && expSummary ? (
              <Text className={`text-white/70 ${typo.label} mt-2`}>
                {expSummary.netVsRevenue >= 0
                  ? `Lãi ròng ${formatVnd(expSummary.netVsRevenue)}`
                  : `Lỗ ${formatVnd(Math.abs(expSummary.netVsRevenue))}`}
              </Text>
            ) : null}
          </View>

          {/* ── Secondary KPI grid ───────────────────────────────────────── */}
          {isRevenue && revSummary ? (
            <View className="flex-row gap-3 mx-4 mt-3">
              <View className="flex-1 bg-white dark:bg-gray-800 rounded-2xl p-4">
                <Text className={`${typo.heading} text-gray-900 dark:text-white mb-1`}>
                  {revSummary.orderCount}
                </Text>
                <Text className={`${typo.caption} text-gray-400 dark:text-gray-500`}>Số đơn hàng</Text>
              </View>
              <View className="flex-1 bg-white dark:bg-gray-800 rounded-2xl p-4">
                <Text className={`${typo.heading} text-emerald-600 dark:text-emerald-400 mb-1`} numberOfLines={1} adjustsFontSizeToFit>
                  {revSummary.orderCount > 0
                    ? formatVnd(Math.round(revSummary.totalRevenue / revSummary.orderCount))
                    : '—'}
                </Text>
                <Text className={`${typo.caption} text-gray-400 dark:text-gray-500`}>Bình quân / đơn</Text>
              </View>
            </View>
          ) : !isRevenue && expSummary ? (
            <View className="flex-row gap-3 mx-4 mt-3">
              <View className="flex-1 bg-white dark:bg-gray-800 rounded-2xl p-4">
                <Text className={`${typo.heading} text-blue-600 dark:text-blue-400 mb-1`} numberOfLines={1} adjustsFontSizeToFit>
                  {formatVnd(expSummary.fixed)}
                </Text>
                <Text className={`${typo.caption} text-gray-400 dark:text-gray-500`}>Chi phí cố định</Text>
              </View>
              <View className="flex-1 bg-white dark:bg-gray-800 rounded-2xl p-4">
                <Text className={`${typo.heading} text-amber-500 dark:text-amber-400 mb-1`} numberOfLines={1} adjustsFontSizeToFit>
                  {formatVnd(expSummary.variable)}
                </Text>
                <Text className={`${typo.caption} text-gray-400 dark:text-gray-500`}>Chi phí biến động</Text>
              </View>
            </View>
          ) : null}

          {/* ── Chart ────────────────────────────────────────────────────── */}
          {(isRevenue ? revChart : expChart).length > 0 && (
            <View className="mx-4 mt-3">
              <TrendChart
                data={isRevenue ? revChart : expChart}
                color={chartColor}
                granularity={chartGranularity}
                allowedGranularities={allowedGranularities}
                onGranularityChange={setChartGranularity}
                title={isRevenue ? t('chart.revenueTitle') : t('chart.expenseTitle')}
              />
            </View>
          )}

          {/* ── Filters ──────────────────────────────────────────────────── */}
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

          {/* ── List section header ───────────────────────────────────────── */}
          <View className="flex-row items-center justify-between px-4 mt-5 mb-2">
            <Text className={`${typo.captionBold} text-gray-400 dark:text-gray-500 uppercase tracking-widest`}>
              {isRevenue ? 'Đơn hàng' : 'Chi phí'}
            </Text>
            {(isRevenue ? orderItems : expenseItems).length > 0 && (
              <Text className={`${typo.caption} text-gray-400 dark:text-gray-500`}>
                {(isRevenue ? orderItems : expenseItems).length} mục
              </Text>
            )}
          </View>

          {/* ── Empty state ───────────────────────────────────────────────── */}
          {(isRevenue ? orderItems : expenseItems).length === 0 && (
            <View className="bg-white dark:bg-gray-800 rounded-2xl mx-4 py-10 items-center">
              <Text style={{ fontSize: 36 }} className="mb-2">{isRevenue ? '🧾' : '💸'}</Text>
              <Text className={`${typo.label} text-gray-400 dark:text-gray-500`}>{t('report.empty')}</Text>
            </View>
          )}
        </>
      )}
    </View>
  ), [isLoading, isRevenue, primaryColor, chartColor, revSummary, expSummary, revChart, expChart,
      chartGranularity, allowedGranularities, orderItems, expenseItems,
      paymentFilter, statusFilter, expCategory, t, typo]);

  const renderItem = useCallback(({ item }: { item: OrderSummary | ExpenseData }) =>
    isRevenue
      ? <OrderRow
          order={item as OrderSummary}
          onPress={() => navigation.getParent()?.navigate('Sell', { screen: 'OrderDetail', params: { orderId: String((item as OrderSummary).id) } } as any)}
        />
      : <ExpenseRow expense={item as ExpenseData} />,
  [isRevenue, navigation]);

  const handleEndReached = useCallback(() => {
    if (tab === 'revenue' && hasMoreOrders) fetchMoreOrders();
    if (tab === 'expenses' && hasMoreExp) fetchMoreExp();
  }, [tab, hasMoreOrders, hasMoreExp, fetchMoreOrders, fetchMoreExp]);

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

        {/* Tab toggle */}
        <View className="flex-row mx-4 mb-3 bg-gray-100 dark:bg-gray-800 rounded-2xl p-1 gap-1">
          <TouchableOpacity
            onPress={() => setTab('revenue')}
            activeOpacity={0.85}
            className={`flex-1 py-2.5 rounded-xl items-center ${
              tab === 'revenue' ? 'bg-emerald-500' : ''
            }`}
          >
            <Text
              className={`${typo.labelBold} ${
                tab === 'revenue' ? 'text-white' : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              💰 {t('report.tabRevenue')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setTab('expenses')}
            activeOpacity={0.85}
            className={`flex-1 py-2.5 rounded-xl items-center ${
              tab === 'expenses' ? 'bg-rose-500' : ''
            }`}
          >
            <Text
              className={`${typo.labelBold} ${
                tab === 'expenses' ? 'text-white' : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              💸 {t('report.tabExpenses')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Period selector — 4 equal tabs */}
        <View className="flex-row mx-4 mb-2 bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700 shadow-sm">
          {([...REPORT_FIXED_PERIODS, { key: 'more' as const, label: 'Tùy chỉnh' }]).map(({ key, label }, i) => {
            const isMore = key === 'more';
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
                    {label}
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
            <Text className={`${typo.caption} text-indigo-400 dark:text-indigo-500`}>Đang xem:</Text>
            <Text className={`flex-1 ${typo.captionBold} text-indigo-600 dark:text-indigo-300`}>
              {period === 'custom'
                ? `${customFrom} → ${customTo}`
                : REPORT_MORE_LABEL[period]}
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
            {tab === 'revenue' ? renderOrderFooter() : renderExpFooter()}
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
