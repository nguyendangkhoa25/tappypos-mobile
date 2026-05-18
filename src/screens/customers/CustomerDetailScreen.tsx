import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { customerApi, orderApi, loyaltyApi, pawnApi, type CustomerData, type OrderSummary, type OrderDetail } from '../../services/api';
import { useFeatureCheck } from '../../hooks/useFeature';
import { useAlertStore } from '../../store/alertStore';
import { useToastStore } from '../../store/toastStore';
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

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  const typo = useTypography();
  if (!value) return null;
  return (
    <View className="flex-row py-2.5 border-b border-gray-50">
      <Text className={`${typo.caption} text-gray-500 w-36`}>{label}</Text>
      <Text className={`${typo.caption} font-medium text-gray-800 flex-1`}>{value}</Text>
    </View>
  );
}

function SectionHeader({ icon, title }: { icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']; title: string }) {
  const typo = useTypography();
  return (
    <View className="flex-row items-center mb-3">
      <MaterialCommunityIcons name={icon} size={14} color="#6b7280" style={{ marginRight: 5 }} />
      <Text className={`${typo.captionBold} text-gray-500 uppercase tracking-wide`}>{title}</Text>
    </View>
  );
}

function OrderRow({ order }: { order: OrderSummary }) {
  const { t } = useTranslation();
  const typo = useTypography();
  const color = STATUS_COLOR[order.status] ?? '#6b7280';
  return (
    <View className="flex-row items-center py-2.5 border-b border-gray-50">
      <View className="flex-1">
        <Text className={`${typo.label} text-gray-800`}>#{order.orderNumber}</Text>
        <Text className={`${typo.caption} text-gray-400 mt-0.5`}>{formatDate(order.createdAt)}</Text>
      </View>
      <View className="items-end">
        <Text className={`${typo.labelBold} text-primary`}>{formatVnd(order.total)}</Text>
        <View className="mt-1 px-2 py-0.5 rounded-full" style={{ backgroundColor: color + '20' }}>
          <Text className={typo.captionBold} style={{ color }}>
            {t(`orders.${order.status.toLowerCase()}` as never) ?? order.status}
          </Text>
        </View>
      </View>
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
  return map[gender] ?? gender;
}

export function CustomerDetailScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const typo = useTypography();
  const { top } = useSafeAreaInsets();
  const { customerId } = route.params;
  const queryClient = useQueryClient();
  const [periodKey, setPeriodKey] = useState<PeriodKey>('90d');
  const [chartGranularity, setChartGranularity] = useState<ChartGranularity>('day');
  const period = getPeriod(periodKey);
  const { show: showAlert } = useAlertStore();
  const { show: showToast } = useToastStore();
  const showErrorAlert = useErrorAlert();

  const { data: customer, isLoading, isError, refetch } = useQuery({
    queryKey: ['customer', customerId],
    queryFn: () => customerApi.getById(customerId).then((r) => r.data.data),
    staleTime: 300_000,
  });

  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['customer-orders', customerId],
    queryFn: () => orderApi.list({ customerId, size: 5, page: 0 }).then((r) => r.data.data),
    staleTime: 120_000,
    enabled: !!customer,
  });

  const hasPawn = useFeatureCheck()('PAWN');

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
    enabled: !!customer,
  });

  const { data: orderSummary } = useQuery({
    queryKey: ['customer-order-summary', customerId, period.from, period.to],
    queryFn: () => customerApi.orderSummary(customerId, period.from, period.to).then((r) => r.data.data),
    staleTime: 120_000,
    enabled: !!customer,
  });

  const { data: chartData = [] } = useQuery({
    queryKey: ['customer-order-chart', customerId, period.from, period.to, chartGranularity],
    queryFn: () => customerApi.orderChart(customerId, period.from, period.to, chartGranularity).then((r) => r.data.data),
    staleTime: 120_000,
    enabled: !!customer,
  });

  const lastOrder = ordersData?.content?.[0];
  const { data: lastOrderDetail } = useQuery<OrderDetail>({
    queryKey: ['order', lastOrder?.id],
    queryFn: () => orderApi.getById(lastOrder!.id).then((r) => r.data.data),
    staleTime: 300_000,
    enabled: !!lastOrder && lastOrder.status === 'COMPLETED',
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

  if (isLoading) {
    return (
      <View className="flex-1 bg-gray-50 dark:bg-gray-900">
        <View className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4" style={{ paddingTop: top + 12, paddingBottom: 12 }}>
          <View className="flex-row items-center">
            <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} className="mr-3">
              <MaterialCommunityIcons name="chevron-left" size={26} color="#4f46e5" />
            </TouchableOpacity>
            <Text className={`${typo.heading} text-gray-900 dark:text-white flex-1`}>
              {t('customers.detailTitle')}
            </Text>
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
  const orders = ordersData?.content ?? [];

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <View className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4" style={{ paddingTop: top + 12, paddingBottom: 12 }}>
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} className="mr-3">
            <MaterialCommunityIcons name="chevron-left" size={26} color="#4f46e5" />
          </TouchableOpacity>
          <Text className={`${typo.heading} text-gray-900 dark:text-white flex-1`} numberOfLines={1}>
            {t('customers.detailTitle')}
          </Text>
          <View className="flex-row items-center" style={{ gap: 12 }}>
            <TouchableOpacity
              onPress={() => navigation.navigate('CustomerForm', { customerId })}
              className="flex-row items-center bg-indigo-50 dark:bg-indigo-900/30 rounded-xl px-3 py-1.5"
            >
              <MaterialCommunityIcons name="pencil-outline" size={15} color="#4f46e5" style={{ marginRight: 4 }} />
              <Text className={`${typo.label} text-primary`}>{t('customers.editCustomer')}</Text>
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
        <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 mt-1 ml-9`}>{t('customers.detailHint')}</Text>
      </View>

      {/* Avatar + name + stats (below header, scrollable) */}
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* Customer card */}
        <View className="bg-primary rounded-2xl p-4 mb-4">
          <View className="flex-row items-center mb-3">
            <View className="w-14 h-14 rounded-full bg-white/20 items-center justify-center mr-4">
              <Text className={`${typo.heading} text-white`}>
                {customer.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View className="flex-1">
              <Text className={`${typo.section} font-bold text-white`}>{customer.name}</Text>
              <Text className={`${typo.caption} text-indigo-200`}>{customer.phone}</Text>
              {customer.email && (
                <Text className={`${typo.caption} text-indigo-300 mt-0.5`}>{customer.email}</Text>
              )}
            </View>
          </View>

          {/* Stats row */}
          <View className="flex-row bg-white/15 rounded-2xl p-3" style={{ gap: 0 }}>
            <View className="flex-1 items-center">
              <Text className={`${typo.section} font-bold text-white`}>{customer.totalOrders}</Text>
              <Text className={`${typo.caption} text-indigo-200`}>{t('customers.orders')}</Text>
            </View>
            <View className="w-px bg-white/20" />
            <View className="flex-1 items-center">
              <Text className={`${typo.labelBold} text-white`} numberOfLines={1}>
                {formatVnd(customer.totalSpend)}
              </Text>
              <Text className={`${typo.caption} text-indigo-200`}>{t('customers.totalSpend')}</Text>
            </View>
            <View className="w-px bg-white/20" />
            <TouchableOpacity
              className="flex-1 items-center"
              onPress={() => navigation.navigate('CustomerLoyalty', { customerId })}
            >
              <Text className={`${typo.section} font-bold text-white`}>{customer.points}</Text>
              {loyaltySummary?.currentTier ? (
                <View
                  className="mt-0.5 px-1.5 py-0.5 rounded-full"
                  style={{ backgroundColor: loyaltySummary.currentTier.color + '40' }}
                >
                  <Text className={`${typo.captionBold} text-white`}>
                    {loyaltySummary.currentTier.name}
                  </Text>
                </View>
              ) : (
                <Text className={`${typo.caption} text-indigo-200`}>{t('customers.points')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
        {/* Member since */}
        {customer.createdAt && (
          <Text className={`${typo.caption} text-gray-400 text-center mb-4`}>
            {t('customers.memberSince')} {formatDate(customer.createdAt)}
          </Text>
        )}

        {/* Profile – Basic Info */}
        {(customer.gender || customer.dateOfBirth || customer.birthday) && (
          <View className="bg-white rounded-2xl p-4 mb-3 border border-gray-100">
            <SectionHeader icon="account-outline" title={t('customers.sectionBasic')} />
            <InfoRow label={t('customers.gender')} value={genderLabel} />
            <InfoRow label={t('customers.dateOfBirth')} value={customer.dateOfBirth ?? customer.birthday} />
          </View>
        )}

        {/* Social */}
        {(customer.zaloId || customer.facebookId) && (
          <View className="bg-white rounded-2xl p-4 mb-3 border border-gray-100">
            <SectionHeader icon="message-outline" title={t('customers.sectionSocial')} />
            <InfoRow label={t('customers.zaloId')} value={customer.zaloId} />
            <InfoRow label={t('customers.facebookId')} value={customer.facebookId} />
          </View>
        )}

        {/* Preferences */}
        {(customer.hairType || customer.preferredServices || customer.allergiesOrSensitivities || customer.specialRequests || customer.notes || customer.note) && (
          <View className="bg-white rounded-2xl p-4 mb-3 border border-gray-100">
            <SectionHeader icon="heart-outline" title={t('customers.sectionPrefs')} />
            <InfoRow label={t('customers.hairType')} value={customer.hairType} />
            <InfoRow label={t('customers.preferredServices')} value={customer.preferredServices} />
            <InfoRow label={t('customers.allergies')} value={customer.allergiesOrSensitivities} />
            <InfoRow label={t('customers.specialRequests')} value={customer.specialRequests} />
            <InfoRow label={t('customers.notes')} value={customer.notes ?? customer.note} />
          </View>
        )}

        {/* ID Document */}
        {(customer.idCardNumber || customer.idCardIssuedDate || customer.idCardIssuedPlace || customer.permanentAddress) && (
          <View className="bg-white rounded-2xl p-4 mb-3 border border-gray-100">
            <SectionHeader icon="card-account-details-outline" title={t('customers.sectionId')} />
            <InfoRow label={t('customers.idCardNumber')} value={customer.idCardNumber} />
            <InfoRow label={t('customers.idCardIssuedDate')} value={customer.idCardIssuedDate} />
            <InfoRow label={t('customers.idCardIssuedPlace')} value={customer.idCardIssuedPlace} />
            <InfoRow label={t('customers.permanentAddress')} value={customer.permanentAddress} />
          </View>
        )}

        {/* Loyalty tier progress */}
        {loyaltySummary && (loyaltySummary.currentTier || loyaltySummary.nextTier) && (
          <View className="bg-white rounded-2xl p-4 mb-3 border border-gray-100">
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
                    {t('loyalty.remaining')}: {formatVnd(loyaltySummary.amountToNextTier)}
                  </Text>
                </View>
                <View className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
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

        {/* Last visit service summary */}
        {lastOrderDetail && lastOrderDetail.items.length > 0 && (
          <View className="bg-white rounded-2xl p-4 mb-3 border border-gray-100">
            <View className="flex-row items-center justify-between mb-2">
              <SectionHeader icon="history" title={t('customers.lastVisit')} />
              <Text className={`${typo.caption} text-gray-400`}>{formatDate(lastOrderDetail.createdAt)}</Text>
            </View>
            {lastOrderDetail.createdByName ? (
              <View className="flex-row items-center mb-2">
                <MaterialCommunityIcons name="account-outline" size={13} color="#9ca3af" style={{ marginRight: 4 }} />
                <Text className={`${typo.caption} text-gray-500`}>{lastOrderDetail.createdByName}</Text>
              </View>
            ) : null}
            {lastOrderDetail.items.map((item, idx) => (
              <View
                key={idx}
                className="flex-row items-center justify-between py-1.5 border-b border-gray-50 last:border-0"
              >
                <Text className={`${typo.caption} text-gray-700 flex-1 mr-2`} numberOfLines={1}>
                  {item.productName}
                </Text>
                {item.unitPrice > 0 && (
                  <Text className={`${typo.label} text-emerald-600`}>
                    {formatVnd(item.unitPrice)}
                  </Text>
                )}
              </View>
            ))}
            {lastOrderDetail.total > 0 && (
              <View className="flex-row justify-between pt-2 mt-1 border-t border-gray-100">
                <Text className={`${typo.caption} text-gray-400`}>{t('customers.lastVisitTotal')}</Text>
                <Text className={`${typo.labelBold} text-gray-800`}>{formatVnd(lastOrderDetail.total)}</Text>
              </View>
            )}
          </View>
        )}

        {/* Pawn history — PAWN shops only */}
        {hasPawn && (pawnHistory?.content?.length ?? 0) > 0 && (
          <View className="bg-white rounded-2xl p-4 mb-3 border border-gray-100">
            <View className="flex-row items-center justify-between mb-3">
              <SectionHeader icon="handshake-outline" title={t('pawn.detail.title')} />
              <TouchableOpacity onPress={() => {/* navigate to PawnForm with customerId */}}>
                <Text className={`${typo.captionBold} text-primary`}>{t('pawn.newContract')}</Text>
              </TouchableOpacity>
            </View>
            {pawnHistory!.content.map((p) => {
              const isOverdue = p.pawnStatus === 'PAWNED' && new Date(p.pawnDueDate) < new Date();
              return (
                <View key={p.pawnId} className="flex-row items-center py-2.5 border-b border-gray-50">
                  <View className="flex-1 mr-2">
                    <Text className={`${typo.label} text-gray-800`} numberOfLines={1}>{p.itemName}</Text>
                    <Text className={`${typo.caption} text-gray-400 mt-0.5`}>{formatDate(p.pawnDate)} → {formatDate(p.pawnDueDate)}</Text>
                  </View>
                  <View className="items-end">
                    <Text className={`${typo.labelBold} text-primary`}>{formatVnd(p.pawnAmount)}</Text>
                    <Text className={`${typo.captionBold} mt-0.5 ${isOverdue ? 'text-red-500' : p.pawnStatus === 'PAWNED' ? 'text-blue-500' : 'text-gray-400'}`}>
                      {t(`pawn.status.${p.pawnStatus}`)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Order analytics */}
        <View className="bg-white rounded-2xl p-4 mb-3 border border-gray-100">
          <SectionHeader icon="chart-bar" title={t('customers.orderAnalytics')} />

          {/* Period chips */}
          <View className="flex-row gap-2 mb-3">
            {(['30d', '90d', '180d', '365d'] as PeriodKey[]).map((key) => {
              const label = key === '30d' ? '30 ngày' : key === '90d' ? '3 tháng' : key === '180d' ? '6 tháng' : '1 năm';
              const active = periodKey === key;
              return (
                <TouchableOpacity
                  key={key}
                  onPress={() => setPeriodKey(key)}
                  className={`px-3 py-1 rounded-full border ${active ? 'bg-primary border-primary' : 'bg-gray-50 border-gray-200'}`}
                >
                  <Text className={`${typo.captionBold} ${active ? 'text-white' : 'text-gray-500'}`}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Summary stats */}
          {orderSummary ? (
            <View className="flex-row gap-2 mb-3">
              <View className="flex-1 bg-indigo-50 rounded-xl p-2.5 items-center">
                <Text className={`${typo.labelBold} text-primary`} numberOfLines={1}>{formatVnd(orderSummary.totalRevenue)}</Text>
                <Text className={`${typo.captionBold} text-gray-500 mt-0.5`}>{t('customers.totalRevenue')}</Text>
              </View>
              <View className="flex-1 bg-gray-50 rounded-xl p-2.5 items-center">
                <Text className={`${typo.labelBold} text-gray-800`}>{orderSummary.completedCount}</Text>
                <Text className={`${typo.captionBold} text-gray-500 mt-0.5`}>{t('customers.completedOrders')}</Text>
              </View>
              <View className="flex-1 bg-emerald-50 rounded-xl p-2.5 items-center">
                <Text className={`${typo.labelBold} text-emerald-600`} numberOfLines={1}>{formatVnd(orderSummary.avgOrderValue)}</Text>
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

        {/* Recent Orders */}
        <View className="bg-white rounded-2xl p-4 mb-3 border border-gray-100">
          <View className="flex-row items-center justify-between mb-3">
            <SectionHeader icon="shopping-outline" title={t('customers.recentOrders')} />
          </View>

          {ordersLoading ? (
            <View style={{ gap: 8 }}>
              {[0, 1, 2].map((i) => <Skeleton key={i} height={44} borderRadius={8} />)}
            </View>
          ) : orders.length === 0 ? (
            <View className="py-6 items-center">
              <MaterialCommunityIcons name="shopping-outline" size={32} color="#d1d5db" />
              <Text className={`${typo.caption} text-gray-400 mt-2`}>{t('customers.noOrders')}</Text>
            </View>
          ) : (
            orders.map((order) => <OrderRow key={order.id} order={order} />)
          )}
        </View>
      </ScrollView>
    </View>
  );
}
