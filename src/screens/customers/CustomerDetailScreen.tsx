import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { AvatarImage } from '../../components/AvatarImage';
import { ImagePickerSheet } from '../../components/ImagePickerSheet';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient, useInfiniteQuery, keepPreviousData } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  customerApi,
  orderApi,
  loyaltyApi,
  pawnApi,
  type CustomerData,
  type OrderSummary,
  type OrderDetail,
  type OrderSummaryItem,
} from '../../services/api';
import { useFeatureCheck } from '../../hooks/useFeature';
import { useAlertStore } from '../../store/alertStore';
import { useToastStore } from '../../store/toastStore';
import { usePrivacyStore } from '../../store/privacyStore';
import { useErrorAlert } from '../../hooks/useErrorAlert';
import { formatVnd, formatDate } from '../../utils/format';
import { useTypography } from '../../hooks/useTypography';
import { Skeleton } from '../../components/Skeleton';
import { ErrorState } from '../../components/ErrorState';
import { TrendChart } from '../../components/TrendChart';
import type { ChartGranularity } from '../../components/BarChart';
import type { HomeScreenProps } from '../../types/navigation';

type Props = HomeScreenProps<'CustomerDetail'>;

type PeriodKey = '30d' | '90d' | '180d' | '365d';

function getPeriod(key: PeriodKey): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  const days = key === '30d' ? 30 : key === '90d' ? 90 : key === '180d' ? 180 : 365;
  from.setDate(from.getDate() - days);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { from: fmt(from), to: fmt(to) };
}

const STATUS_COLOR: Record<string, string> = {
  COMPLETED: '#059669',
  IN_PROGRESS: '#3b82f6',
  PENDING: '#f59e0b',
  CANCELLED: '#ef4444',
};

/** "3 tuần trước", "Hôm nay", etc. */
function relativeDate(dateStr: string, t: (k: string, o?: Record<string, unknown>) => string): string {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
  if (days === 0) return t('customers.today');
  if (days === 1) return t('customers.yesterday');
  if (days < 7) return t('customers.daysAgo', { days });
  if (days < 30) return t('customers.weeksAgo', { weeks: Math.floor(days / 7) });
  if (days < 365) return t('customers.monthsAgo', { months: Math.floor(days / 30) });
  return t('customers.yearsAgo', { years: Math.floor(days / 365) });
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  const typo = useTypography();
  if (!value) return null;
  return (
    <View className="flex-row py-2.5 border-b border-gray-50 dark:border-gray-700/50">
      <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 w-36`}>{label}</Text>
      <Text className={`${typo.caption} font-medium text-gray-800 dark:text-gray-200 flex-1`}>{value}</Text>
    </View>
  );
}

function SectionHeader({ icon, title }: { icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']; title: string }) {
  const typo = useTypography();
  return (
    <View className="flex-row items-center mb-3">
      <MaterialCommunityIcons name={icon} size={14} color="#6b7280" style={{ marginRight: 5 }} />
      <Text className={`${typo.captionBold} text-gray-500 dark:text-gray-400 uppercase tracking-wide`}>{title}</Text>
    </View>
  );
}

function GenderLabel({ gender, t }: { gender: string | null | undefined; t: (k: string) => string }) {
  if (!gender) return null;
  const map: Record<string, string> = {
    MALE: t('customers.genderMale'),
    FEMALE: t('customers.genderFemale'),
    OTHER: t('customers.genderOther'),
  };
  return (map[gender] ?? gender) as unknown as null;
}

// ── Visit History Timeline ─────────────────────────────────────────────────────

/** A single service line within a visit card */
function ServiceLine({ item, isHidden }: { item: OrderSummaryItem; isHidden: boolean }) {
  const typo = useTypography();
  return (
    <View className="flex-row items-start py-1 gap-2">
      {/* Qty bubble */}
      <View className="w-5 h-5 rounded-full bg-gray-100 dark:bg-gray-700 items-center justify-center flex-shrink-0 mt-0.5">
        <Text className={`${typo.captionBold} text-gray-600 dark:text-gray-300`}>
          {item.quantity}
        </Text>
      </View>

      {/* Name + employee */}
      <View className="flex-1 min-w-0">
        <Text className={`${typo.caption} text-gray-800 dark:text-gray-200`} numberOfLines={1}>
          {item.productName}
        </Text>
        {item.assignedEmployeeName ? (
          <View className="flex-row items-center mt-0.5 gap-1">
            <MaterialCommunityIcons name="account-outline" size={11} color="#9ca3af" />
            <Text className={`${typo.caption} text-gray-400 dark:text-gray-500`}>
              {item.assignedEmployeeName}
            </Text>
          </View>
        ) : null}
        {item.note ? (
          <Text className={`${typo.caption} text-amber-600 dark:text-amber-400 italic mt-0.5`} numberOfLines={1}>
            → {item.note}
          </Text>
        ) : null}
      </View>

      {/* Price */}
      {item.unitPrice != null && item.unitPrice > 0 && (
        <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 flex-shrink-0`}>
          {isHidden ? '••••' : formatVnd(item.unitPrice)}
        </Text>
      )}
    </View>
  );
}

/** Single visit card in the timeline */
function VisitCard({
  order,
  isFirst,
  isLast,
  isHidden,
  t,
}: {
  order: OrderSummary;
  isFirst: boolean;
  isLast: boolean;
  isHidden: boolean;
  t: (k: string, o?: Record<string, unknown>) => string;
}) {
  const typo = useTypography();
  const [expanded, setExpanded] = useState(isFirst); // first visit expanded by default
  const statusColor = STATUS_COLOR[order.status] ?? '#6b7280';
  const items = order.items ?? [];
  const hasDetails = items.length > 0;

  return (
    <View className="flex-row">
      {/* Timeline spine */}
      <View className="items-center" style={{ width: 28 }}>
        <View
          className={`w-2.5 h-2.5 rounded-full border-2 border-indigo-500 mt-3 z-10`}
          style={{ backgroundColor: '#4f46e5' }}
        />
        {!isLast && <View className="w-0.5 bg-gray-200 dark:bg-gray-700 flex-1 mt-1" />}
      </View>

      {/* Card */}
      <View className="flex-1 mb-3 ml-2">
        <TouchableOpacity
          onPress={() => hasDetails && setExpanded(!expanded)}
          activeOpacity={hasDetails ? 0.7 : 1}
          className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden"
        >
          {/* Header row */}
          <View className="flex-row items-start px-3 py-2.5 gap-2">
            <View className="flex-1 min-w-0">
              <View className="flex-row items-center gap-1.5">
                <Text className={`${typo.captionBold} text-gray-800 dark:text-gray-200`}>
                  #{order.orderNumber}
                </Text>
                <View
                  className="px-1.5 py-0.5 rounded-full"
                  style={{ backgroundColor: statusColor + '20' }}
                >
                  <Text className={typo.captionBold} style={{ color: statusColor }}>
                    {t(`orders.${order.status.toLowerCase()}` as never)}
                  </Text>
                </View>
              </View>
              <Text className={`${typo.caption} text-gray-400 dark:text-gray-500 mt-0.5`}>
                {formatDate(order.createdAt)} · {relativeDate(order.createdAt, t)}
              </Text>
            </View>

            {/* Total + chevron */}
            <View className="items-end flex-shrink-0" style={{ gap: 3 }}>
              <Text className={`${typo.labelBold} text-indigo-600 dark:text-indigo-400`}>
                {isHidden ? '••••••' : formatVnd(order.total)}
              </Text>
              {hasDetails && (
                <MaterialCommunityIcons
                  name={expanded ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color="#9ca3af"
                />
              )}
            </View>
          </View>

          {/* Services (expanded) */}
          {expanded && hasDetails && (
            <View className="px-3 pb-2.5 border-t border-gray-50 dark:border-gray-700 pt-2">
              {items.map((item, idx) => (
                <ServiceLine key={idx} item={item} isHidden={isHidden} />
              ))}
            </View>
          )}

          {/* Services preview (collapsed, show max 2 names) */}
          {!expanded && hasDetails && (
            <View className="px-3 pb-2.5">
              <Text className={`${typo.caption} text-gray-400 dark:text-gray-500`} numberOfLines={1}>
                {items.slice(0, 2).map((i) => i.productName).join(' · ')}
                {items.length > 2 ? ` +${items.length - 2}` : ''}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Birthday helpers ───────────────────────────────────────────────────────────

/**
 * Returns 'today', 'this-month', or null for the given date string (YYYY-MM-DD).
 * Comparison is purely on month and day — year is irrelevant.
 */
function getBirthdayStatus(dob: string | null | undefined): 'today' | 'this-month' | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  if (d.getDate() === now.getDate() && d.getMonth() === now.getMonth()) return 'today';
  if (d.getMonth() === now.getMonth()) return 'this-month';
  return null;
}

// ── Main Screen ────────────────────────────────────────────────────────────────

export function CustomerDetailScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const typo = useTypography();
  const { top } = useSafeAreaInsets();
  const { customerId } = route.params;
  const queryClient = useQueryClient();
  const [periodKey, setPeriodKey] = useState<PeriodKey>('90d');
  const [chartGranularity, setChartGranularity] = useState<ChartGranularity>('day');
  const [avatarPickerVisible, setAvatarPickerVisible] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const period = getPeriod(periodKey);
  const { show: showAlert } = useAlertStore();
  const { show: showToast } = useToastStore();
  const isHidden = usePrivacyStore((s) => s.isHidden);
  const showErrorAlert = useErrorAlert();
  const has = useFeatureCheck();

  const { data: customer, isLoading, isError, refetch } = useQuery({
    queryKey: ['customer', customerId],
    queryFn: () => customerApi.getById(customerId).then((r) => r.data.data),
    staleTime: 300_000,
  });

  const hasPawn = has('PAWN');
  const hasLoyalty = has('LOYALTY');

  // ── Paginated visit history ─────────────────────────────────────────────────
  const {
    data: ordersPages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: ordersLoading,
  } = useInfiniteQuery({
    queryKey: ['customer-orders-timeline', customerId],
    queryFn: ({ pageParam = 0 }) =>
      customerApi.orders(customerId, pageParam as number, 10).then((r) => r.data.data),
    getNextPageParam: (last, pages) =>
      last.totalPages > pages.length ? pages.length : undefined,
    initialPageParam: 0,
    staleTime: 120_000,
    enabled: !!customer,
  });

  const allOrders: OrderSummary[] = ordersPages?.pages.flatMap((p) => p.content) ?? [];
  const totalOrders = ordersPages?.pages[0]?.totalElements ?? 0;

  // ── Last visit detail (most recent COMPLETED order) ─────────────────────────
  const firstCompletedOrder = allOrders.find((o) => o.status === 'COMPLETED');
  const { data: lastOrderDetail } = useQuery<OrderDetail>({
    queryKey: ['order', firstCompletedOrder?.id],
    queryFn: () => orderApi.getById(firstCompletedOrder!.id).then((r) => r.data.data),
    staleTime: 300_000,
    enabled: !!firstCompletedOrder && !firstCompletedOrder.items?.length,
  });

  const { data: pawnHistory } = useQuery({
    queryKey: ['customer-pawns', customerId],
    queryFn: () => pawnApi.search({ customerId: Number(customerId) }, 0, 5).then((r) => r.data.data),
    staleTime: 60_000,
    enabled: !!customer && hasPawn,
  });

  const { data: loyaltySummary } = useQuery({
    queryKey: ['customer-loyalty', customerId],
    queryFn: () => loyaltyApi.getCustomerSummary(customerId).then((r) => r.data.data),
    staleTime: 60_000,
    enabled: !!customer && hasLoyalty,
  });

  const { data: orderSummary, isFetching: summaryFetching } = useQuery({
    queryKey: ['customer-order-summary', customerId, period.from, period.to],
    queryFn: () => customerApi.orderSummary(customerId, period.from, period.to).then((r) => r.data.data),
    staleTime: 120_000,
    enabled: !!customer,
    placeholderData: keepPreviousData,
  });

  const { data: chartData = [], isFetching: chartFetching } = useQuery({
    queryKey: ['customer-order-chart', customerId, period.from, period.to, chartGranularity],
    queryFn: () => customerApi.orderChart(customerId, period.from, period.to, chartGranularity).then((r) => r.data.data),
    staleTime: 120_000,
    enabled: !!customer,
    placeholderData: keepPreviousData,
  });

  const deleteMutation = useMutation({
    mutationFn: () => customerApi.delete(customerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      showToast(t('customers.deleteSuccess'));
      navigation.goBack();
    },
    onError: showErrorAlert,
  });

  async function handleAvatarSelected(uri: string) {
    setAvatarUploading(true);
    try {
      await customerApi.uploadAvatar(customerId, uri);
      queryClient.invalidateQueries({ queryKey: ['customer', customerId] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      showToast(t('customers.avatarUpdated'));
    } catch {
      showToast(t('common.errorGeneric'));
    } finally {
      setAvatarUploading(false);
    }
  }

  async function handleAvatarDelete() {
    setAvatarUploading(true);
    try {
      await customerApi.deleteAvatar(customerId);
      queryClient.invalidateQueries({ queryKey: ['customer', customerId] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      showToast(t('customers.avatarDeleted'));
    } catch {
      showToast(t('common.errorGeneric'));
    } finally {
      setAvatarUploading(false);
    }
  }

  function handleDelete() {
    showAlert(
      t('customers.deleteConfirmTitle'),
      t('customers.deleteConfirmMsg'),
      [
        { label: t('common.cancel'), style: 'cancel' },
        {
          label: t('customers.deleteCustomer'),
          style: 'destructive',
          onPress: () => deleteMutation.mutate(),
        },
      ],
    );
  }

  const birthdayStatus = getBirthdayStatus(customer?.dateOfBirth ?? customer?.birthday);

  if (isLoading) {
    return (
      <View className="flex-1 bg-gray-50 dark:bg-gray-900">
        <View className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4" style={{ paddingTop: top + 12, paddingBottom: 12 }}>
          <View className="flex-row items-center">
            <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} className="mr-3">
              <MaterialCommunityIcons name="chevron-left" size={26} color="#4f46e5" />
            </TouchableOpacity>
            <Text className={`${typo.heading} text-gray-900 dark:text-white flex-1`}>{t('customers.detailTitle')}</Text>
            <View style={{ width: 26 }} />
          </View>
          <Skeleton height={28} width={180} borderRadius={6} style={{ marginBottom: 8, marginTop: 8 }} />
          <Skeleton height={16} width={120} borderRadius={6} />
        </View>
        <View className="px-4 pt-4" style={{ gap: 12 }}>
          {[0, 1, 2].map((i) => <Skeleton key={i} height={80} borderRadius={16} />)}
        </View>
      </View>
    );
  }

  if (isError || !customer) return <ErrorState onRetry={refetch} />;

  const genderLabel = GenderLabel({ gender: customer.gender, t }) as string | null;

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <View className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4"
        style={{ paddingTop: top + 12, paddingBottom: 14 }}>
        <View className="flex-row items-center mb-0.5">
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} className="mr-3">
            <MaterialCommunityIcons name="chevron-left" size={26} color="#4f46e5" />
          </TouchableOpacity>
          <Text className={`${typo.heading} text-gray-900 dark:text-white flex-1`} numberOfLines={1}>
            {t('customers.detailTitle')}
          </Text>
          <View className="flex-row items-center" style={{ gap: 12 }}>
            <TouchableOpacity
              onPress={() => navigation.navigate('CustomerForm', { customerId })}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialCommunityIcons name="pencil-outline" size={22} color="#4f46e5" />
            </TouchableOpacity>
            {!customer.walkIn && (
              <TouchableOpacity testID="customer-delete-btn" onPress={handleDelete} disabled={deleteMutation.isPending}>
                {deleteMutation.isPending
                  ? <ActivityIndicator size="small" color="#9ca3af" />
                  : <MaterialCommunityIcons name="trash-can-outline" size={22} color="#9ca3af" />
                }
              </TouchableOpacity>
            )}
          </View>
        </View>
        <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 mt-0.5`}>{t('customers.detailHint')}</Text>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 4, paddingBottom: 40 }}>

        {/* ── Customer hero card ──────────────────────────────────────────────── */}
        <View className="bg-primary rounded-2xl p-4 mb-4">
          <View className="flex-row items-center mb-3">
            <TouchableOpacity
              onPress={() => setAvatarPickerVisible(true)}
              className="mr-4"
              activeOpacity={0.8}
              style={{ position: 'relative' }}
            >
              <AvatarImage uri={customer.avatarUrl} name={customer.name} size={56} color="#ffffff" />
              <View
                style={{
                  position: 'absolute', bottom: 0, right: 0,
                  width: 20, height: 20, borderRadius: 10,
                  backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <MaterialCommunityIcons name="camera" size={12} color="#4f46e5" />
              </View>
              {avatarUploading && (
                <View
                  style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    borderRadius: 28, backgroundColor: 'rgba(0,0,0,0.4)',
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <ActivityIndicator size="small" color="white" />
                </View>
              )}
            </TouchableOpacity>
            <View className="flex-1">
              <Text className={`${typo.section} font-bold text-white`}>{customer.name}</Text>
              {!!customer.phone && (
                <Text className={`${typo.caption} text-indigo-200`}>{customer.phone}</Text>
              )}
              {customer.email && (
                <Text className={`${typo.caption} text-indigo-300 mt-0.5`}>{customer.email}</Text>
              )}
              {/* Birthday badge */}
              {birthdayStatus && (
                <View
                  className={`flex-row items-center self-start mt-1.5 px-2 py-0.5 rounded-full gap-1 ${
                    birthdayStatus === 'today'
                      ? 'bg-rose-500'
                      : 'bg-white/20'
                  }`}
                >
                  <Text className={typo.caption}>{birthdayStatus === 'today' ? '🎂' : '🎁'}</Text>
                  <Text className={`${typo.captionBold} text-white`}>
                    {birthdayStatus === 'today'
                      ? t('customers.birthdayBannerToday')
                      : t('customers.birthdayBannerMonth')}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Stats row */}
          <View className="flex-row bg-white/15 rounded-2xl p-3">
            <View className="flex-1 items-center">
              <Text className={`${typo.section} font-bold text-white`}>{customer.totalOrders}</Text>
              <Text className={`${typo.caption} text-indigo-200`}>{t('customers.orders')}</Text>
            </View>
            <View className="w-px bg-white/20" />
            <View className="flex-1 items-center">
              <Text className={`${typo.labelBold} text-white`} numberOfLines={1}>
                {isHidden ? '••••••' : formatVnd(customer.totalSpend)}
              </Text>
              <Text className={`${typo.caption} text-indigo-200`}>{t('customers.totalSpend')}</Text>
            </View>
            <View className="w-px bg-white/20" />
            <TouchableOpacity
              className="flex-1 items-center"
              onPress={() => hasLoyalty && navigation.navigate('CustomerLoyalty', { customerId })}
              disabled={!hasLoyalty}
            >
              <Text className={`${typo.section} font-bold text-white`}>{customer.points}</Text>
              {loyaltySummary?.currentTier ? (
                <View className="mt-0.5 px-1.5 py-0.5 rounded-full" style={{ backgroundColor: loyaltySummary.currentTier.color + '40' }}>
                  <Text className={`${typo.captionBold} text-white`}>{loyaltySummary.currentTier.name}</Text>
                </View>
              ) : (
                <Text className={`${typo.caption} text-indigo-200`}>{t('customers.points')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {customer.createdAt && (
          <Text className={`${typo.caption} text-gray-400 text-center mb-4`}>
            {t('customers.memberSince')} {formatDate(customer.createdAt)}
          </Text>
        )}

        {/* ── Quick insights row ──────────────────────────────────────────────── */}
        {orderSummary && (
          <View className="flex-row gap-2 mb-4">
            {/* Days since last visit */}
            <View className="flex-1 bg-white dark:bg-gray-800 rounded-2xl p-3 border border-gray-100 dark:border-gray-700 items-center">
              <MaterialCommunityIcons
                name="calendar-check-outline"
                size={18}
                color={
                  orderSummary.daysSinceLastVisit < 0
                    ? '#9ca3af'
                    : orderSummary.daysSinceLastVisit <= 30
                    ? '#059669'
                    : orderSummary.daysSinceLastVisit <= 60
                    ? '#f59e0b'
                    : '#ef4444'
                }
              />
              <Text
                className={`${typo.labelBold} mt-1 ${
                  orderSummary.daysSinceLastVisit < 0
                    ? 'text-gray-400'
                    : orderSummary.daysSinceLastVisit <= 30
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : orderSummary.daysSinceLastVisit <= 60
                    ? 'text-amber-500 dark:text-amber-400'
                    : 'text-red-500'
                }`}
              >
                {orderSummary.daysSinceLastVisit < 0
                  ? '—'
                  : orderSummary.daysSinceLastVisit === 0
                  ? t('customers.today')
                  : t('customers.daysAgo', { days: orderSummary.daysSinceLastVisit })}
              </Text>
              <Text className={`${typo.captionBold} text-gray-400 text-center mt-0.5`}>
                {t('customers.lastVisitLabel')}
              </Text>
            </View>

            {/* Avg order value */}
            <View className="flex-1 bg-white dark:bg-gray-800 rounded-2xl p-3 border border-gray-100 dark:border-gray-700 items-center">
              <MaterialCommunityIcons name="cash-multiple" size={18} color="#4f46e5" />
              <Text className={`${typo.labelBold} text-primary mt-1`} numberOfLines={1}>
                {isHidden ? '••••' : formatVnd(orderSummary.avgOrderValue)}
              </Text>
              <Text className={`${typo.captionBold} text-gray-400 text-center mt-0.5`}>
                {t('customers.avgOrder')}
              </Text>
            </View>

            {/* Favorite service */}
            <View className="flex-1 bg-white dark:bg-gray-800 rounded-2xl p-3 border border-gray-100 dark:border-gray-700 items-center">
              <MaterialCommunityIcons name="star-outline" size={18} color="#f59e0b" />
              <Text
                className={`${typo.captionBold} text-amber-600 dark:text-amber-400 text-center mt-1`}
                numberOfLines={2}
              >
                {orderSummary.favoriteService ?? '—'}
              </Text>
              <Text className={`${typo.captionBold} text-gray-400 text-center mt-0.5`}>
                {t('customers.favService')}
              </Text>
            </View>
          </View>
        )}

        {/* ── Profile info ────────────────────────────────────────────────────── */}
        {(customer.gender || customer.dateOfBirth || customer.birthday) && (
          <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 mb-3 border border-gray-100 dark:border-gray-700">
            <SectionHeader icon="account-outline" title={t('customers.sectionBasic')} />
            <InfoRow label={t('customers.gender')} value={genderLabel} />
            <InfoRow label={t('customers.dateOfBirth')} value={customer.dateOfBirth ?? customer.birthday} />
          </View>
        )}

        {(customer.zaloId || customer.facebookId) && (
          <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 mb-3 border border-gray-100 dark:border-gray-700">
            <SectionHeader icon="message-outline" title={t('customers.sectionSocial')} />
            <InfoRow label={t('customers.zaloId')} value={customer.zaloId} />
            <InfoRow label={t('customers.facebookId')} value={customer.facebookId} />
          </View>
        )}

        {(customer.hairType || customer.preferredServices || customer.allergiesOrSensitivities || customer.specialRequests || customer.notes || customer.note) && (
          <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 mb-3 border border-gray-100 dark:border-gray-700">
            <SectionHeader icon="heart-outline" title={t('customers.sectionPrefs')} />
            <InfoRow label={t('customers.hairType')} value={customer.hairType} />
            <InfoRow label={t('customers.preferredServices')} value={customer.preferredServices} />
            <InfoRow label={t('customers.allergies')} value={customer.allergiesOrSensitivities} />
            <InfoRow label={t('customers.specialRequests')} value={customer.specialRequests} />
            <InfoRow label={t('customers.notes')} value={customer.notes ?? customer.note} />
          </View>
        )}

        {(customer.idCardNumber || customer.idCardIssuedDate || customer.idCardIssuedPlace || customer.permanentAddress) && (
          <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 mb-3 border border-gray-100 dark:border-gray-700">
            <SectionHeader icon="card-account-details-outline" title={t('customers.sectionId')} />
            <InfoRow label={t('customers.idCardNumber')} value={customer.idCardNumber} />
            <InfoRow label={t('customers.idCardIssuedDate')} value={customer.idCardIssuedDate} />
            <InfoRow label={t('customers.idCardIssuedPlace')} value={customer.idCardIssuedPlace} />
            <InfoRow label={t('customers.permanentAddress')} value={customer.permanentAddress} />
          </View>
        )}

        {/* ── Loyalty tier progress ───────────────────────────────────────────── */}
        {hasLoyalty && loyaltySummary && (loyaltySummary.currentTier || loyaltySummary.nextTier) && (
          <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 mb-3 border border-gray-100 dark:border-gray-700">
            <View className="flex-row items-center justify-between mb-2">
              <SectionHeader icon="star-circle-outline" title={t('loyalty.title')} />
              <TouchableOpacity onPress={() => navigation.navigate('CustomerLoyalty', { customerId })}>
                <Text className={`${typo.captionBold} text-primary`}>{t('loyalty.viewHistory')}</Text>
              </TouchableOpacity>
            </View>
            {loyaltySummary.currentTier && (
              <View
                className="flex-row items-center px-2 py-1 rounded-lg mb-2 self-start"
                style={{ backgroundColor: loyaltySummary.currentTier.color + '20' }}
              >
                <MaterialCommunityIcons name="crown-outline" size={13} color={loyaltySummary.currentTier.color} style={{ marginRight: 4 }} />
                <Text className={typo.captionBold} style={{ color: loyaltySummary.currentTier.color }}>
                  {loyaltySummary.currentTier.name}
                </Text>
              </View>
            )}
            {loyaltySummary.nextTier && loyaltySummary.amountToNextTier != null && (
              <View>
                <View className="flex-row justify-between mb-1">
                  <Text className={`${typo.caption} text-gray-400`}>{t('loyalty.nextTier')}: {loyaltySummary.nextTier.name}</Text>
                  <Text className={`${typo.caption} font-medium text-gray-500`}>
                    {t('loyalty.remaining')}: {isHidden ? '••••••' : formatVnd(loyaltySummary.amountToNextTier)}
                  </Text>
                </View>
                <View className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <View
                    className="h-full rounded-full"
                    style={{
                      backgroundColor: loyaltySummary.nextTier.color,
                      width: `${Math.min(100, Math.max(5, ((loyaltySummary.totalSpent - (loyaltySummary.nextTier.minSpend - loyaltySummary.amountToNextTier)) / loyaltySummary.nextTier.minSpend) * 100))}%`,
                    }}
                  />
                </View>
              </View>
            )}
            {!loyaltySummary.nextTier && loyaltySummary.currentTier && (
              <Text className={`${typo.caption} text-gray-400`}>{t('loyalty.topTier')}</Text>
            )}
          </View>
        )}

        {/* ── Pawn history ────────────────────────────────────────────────────── */}
        {hasPawn && (pawnHistory?.content?.length ?? 0) > 0 && (
          <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 mb-3 border border-gray-100 dark:border-gray-700">
            <View className="flex-row items-center justify-between mb-3">
              <SectionHeader icon="handshake-outline" title={t('pawn.detail.title')} />
            </View>
            {pawnHistory!.content.map((p) => {
              const isOverdue = p.pawnStatus === 'PAWNED' && new Date(p.pawnDueDate) < new Date();
              return (
                <View key={p.pawnId} className="flex-row items-center py-2.5 border-b border-gray-50 dark:border-gray-700/50">
                  <View className="flex-1 mr-2">
                    <Text className={`${typo.label} text-gray-800 dark:text-gray-200`} numberOfLines={1}>{p.itemName}</Text>
                    <Text className={`${typo.caption} text-gray-400 mt-0.5`}>{formatDate(p.pawnDate)} → {formatDate(p.pawnDueDate)}</Text>
                  </View>
                  <View className="items-end">
                    <Text className={`${typo.labelBold} text-primary`}>{isHidden ? '••••••' : formatVnd(p.pawnAmount)}</Text>
                    <Text className={`${typo.captionBold} mt-0.5 ${isOverdue ? 'text-red-500' : p.pawnStatus === 'PAWNED' ? 'text-blue-500' : 'text-gray-400'}`}>
                      {t(`pawn.status.${p.pawnStatus}`)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* ── Spending trend ──────────────────────────────────────────────────── */}
        <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 mb-3 border border-gray-100 dark:border-gray-700">
          <View className="flex-row items-center justify-between">
            <SectionHeader icon="chart-bar" title={t('customers.orderAnalytics')} />
            {(summaryFetching || chartFetching) && (
              <ActivityIndicator size="small" color="#4f46e5" style={{ marginBottom: 12 }} />
            )}
          </View>

          {/* Period chips */}
          <View className="flex-row gap-2 mb-3">
            {(['30d', '90d', '180d', '365d'] as PeriodKey[]).map((key) => {
              const label = key === '30d' ? t('customers.analytics.period30d')
                : key === '90d' ? t('customers.analytics.period90d')
                : key === '180d' ? t('customers.analytics.period180d')
                : t('customers.analytics.period365d');
              const active = periodKey === key;
              return (
                <TouchableOpacity
                  key={key}
                  onPress={() => setPeriodKey(key)}
                  className={`px-3 py-1 rounded-full border ${active ? 'bg-primary border-primary' : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'}`}
                >
                  <Text className={`${typo.captionBold} ${active ? 'text-white' : 'text-gray-500 dark:text-gray-300'}`}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Summary stats */}
          {orderSummary ? (
            <View className="flex-row gap-2 mb-3">
              <View className="flex-1 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-2.5 items-center">
                <Text className={`${typo.labelBold} text-primary`} numberOfLines={1}>{isHidden ? '••••••' : formatVnd(orderSummary.totalRevenue)}</Text>
                <Text className={`${typo.captionBold} text-gray-500 mt-0.5`}>{t('customers.totalRevenue')}</Text>
              </View>
              <View className="flex-1 bg-gray-50 dark:bg-gray-700/50 rounded-xl p-2.5 items-center">
                <Text className={`${typo.labelBold} text-gray-800 dark:text-gray-200`}>{orderSummary.completedCount}</Text>
                <Text className={`${typo.captionBold} text-gray-500 mt-0.5`}>{t('customers.completedOrders')}</Text>
              </View>
              <View className="flex-1 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-2.5 items-center">
                <Text className={`${typo.labelBold} text-emerald-600 dark:text-emerald-400`} numberOfLines={1}>{isHidden ? '••••••' : formatVnd(orderSummary.avgOrderValue)}</Text>
                <Text className={`${typo.captionBold} text-gray-500 mt-0.5`}>{t('customers.avgOrder')}</Text>
              </View>
            </View>
          ) : (
            <View className="flex-row gap-2 mb-3">
              {[0, 1, 2].map((i) => <Skeleton key={i} height={56} borderRadius={12} style={{ flex: 1 }} />)}
            </View>
          )}

          {/* Trend chart */}
          {chartData.length > 0 && (
            <TrendChart
              data={chartData}
              color="#4f46e5"
              granularity={chartGranularity}
              allowedGranularities={['day', 'week', 'month', 'year']}
              onGranularityChange={setChartGranularity}
            />
          )}
        </View>

        {/* ── Visit History Timeline ──────────────────────────────────────────── */}
        <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 mb-3 border border-gray-100 dark:border-gray-700">
          <View className="flex-row items-center justify-between mb-4">
            <SectionHeader icon="timeline-outline" title={t('customers.visitHistory')} />
            {totalOrders > 0 && (
              <Text className={`${typo.caption} text-gray-400`}>
                {t('customers.visitCount', { count: totalOrders })}
              </Text>
            )}
          </View>

          {ordersLoading ? (
            <View style={{ gap: 8 }}>
              {[0, 1, 2].map((i) => <Skeleton key={i} height={72} borderRadius={12} />)}
            </View>
          ) : allOrders.length === 0 ? (
            <View className="py-8 items-center">
              <MaterialCommunityIcons name="history" size={36} color="#d1d5db" />
              <Text className={`${typo.caption} text-gray-400 mt-2`}>{t('customers.noOrders')}</Text>
            </View>
          ) : (
            <>
              {allOrders.map((order, idx) => (
                <VisitCard
                  key={order.id}
                  order={order}
                  isFirst={idx === 0}
                  isLast={idx === allOrders.length - 1 && !hasNextPage}
                  isHidden={isHidden}
                  t={t}
                />
              ))}

              {/* Load more */}
              {hasNextPage && (
                <TouchableOpacity
                  onPress={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="mt-1 py-3 flex-row items-center justify-center gap-2"
                >
                  {isFetchingNextPage ? (
                    <ActivityIndicator size="small" color="#4f46e5" />
                  ) : (
                    <>
                      <MaterialCommunityIcons name="chevron-down" size={16} color="#4f46e5" />
                      <Text className={`${typo.captionBold} text-primary`}>
                        {t('customers.loadMore')}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

      </ScrollView>

      <ImagePickerSheet
        visible={avatarPickerVisible}
        hasImage={!!customer?.avatarUrl}
        title={t('customers.avatarSheetTitle')}
        onClose={() => setAvatarPickerVisible(false)}
        onImageSelected={handleAvatarSelected}
        onDelete={handleAvatarDelete}
      />
    </View>
  );
}
