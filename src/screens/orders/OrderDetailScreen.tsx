import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { orderApi } from '../../services/api';
import { useAlertStore } from '../../store/alertStore';
import { useErrorAlert } from '../../hooks/useErrorAlert';
import { formatVnd, formatDateTime } from '../../utils/format';
import { useTypography } from '../../hooks/useTypography';
import { Skeleton } from '../../components/Skeleton';
import { ErrorState } from '../../components/ErrorState';
import type { OrdersScreenProps } from '../../types/navigation';

type Props = OrdersScreenProps<'OrderDetail'>;

const STATUS_COLOR: Record<string, string> = {
  COMPLETED:  '#059669',
  IN_PROGRESS: '#3b82f6',
  PENDING:    '#f59e0b',
  CANCELLED:  '#ef4444',
};

const PAYMENT_ICON: Record<string, string> = {
  CASH:          '💵',
  CARD:          '💳',
  BANK_TRANSFER: '🏦',
};

function SectionLabel({ title }: { title: string }) {
  const typo = useTypography();
  return (
    <Text className={`${typo.captionBold} text-gray-500 uppercase tracking-wide mb-3`}>
      {title}
    </Text>
  );
}

function InfoRow({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string | null | undefined;
  valueColor?: string;
}) {
  const typo = useTypography();
  if (!value) return null;
  return (
    <View className="flex-row justify-between items-start py-2 border-b border-gray-50">
      <Text className={`${typo.caption} text-gray-500 mr-4 flex-shrink-0`}>{label}</Text>
      <Text
        className={`${typo.caption} font-medium text-right flex-1`}
        style={{ color: valueColor ?? '#1f2937' }}
      >
        {value}
      </Text>
    </View>
  );
}

export function OrderDetailScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const typo = useTypography();
  const { show: showAlert } = useAlertStore();
  const showErrorAlert = useErrorAlert();
  const insets = useSafeAreaInsets();
  const { orderId } = route.params;
  const queryClient = useQueryClient();

  const { data: order, isLoading, isError, refetch } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => orderApi.getById(orderId).then((r) => r.data.data),
    staleTime: 120_000,
  });

  const completeMutation = useMutation({
    mutationFn: () => orderApi.complete(orderId).then((r) => r.data.data),
    onSuccess: (updated) => {
      queryClient.setQueryData(['order', orderId], updated);
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: showErrorAlert,
  });

  const cancelMutation = useMutation({
    mutationFn: () => orderApi.cancel(orderId).then((r) => r.data.data),
    onSuccess: (updated) => {
      queryClient.setQueryData(['order', orderId], updated);
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: showErrorAlert,
  });

  function handleCancel() {
    showAlert(
      t('orders.cancelConfirmTitle'),
      t('orders.cancelConfirmMsg'),
      [
        { label: t('common.cancel'), style: 'cancel' },
        {
          label: t('orders.cancelButton'),
          style: 'destructive',
          onPress: () => cancelMutation.mutate(),
        },
      ],
    );
  }

  function handleComplete() {
    completeMutation.mutate();
  }

  // ── Loading skeleton ──────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <View className="flex-1 bg-gray-50 dark:bg-gray-900">
        <View className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4" style={{ paddingTop: insets.top + 12, paddingBottom: 12 }}>
          <View className="flex-row items-center">
            <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} className="mr-3">
              <MaterialCommunityIcons name="chevron-left" size={26} color="#4f46e5" />
            </TouchableOpacity>
            <Skeleton height={22} width={160} borderRadius={6} style={{ flex: 1 }} />
          </View>
        </View>
        <View className="px-4 pt-4" style={{ gap: 12 }}>
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} height={72} borderRadius={16} />)}
        </View>
      </View>
    );
  }

  if (isError || !order) return <ErrorState onRetry={refetch} />;

  const statusColor = STATUS_COLOR[order.status] ?? '#6b7280';
  const statusLabel = t(`orders.${order.status.toLowerCase()}` as never) ?? order.status;

  const paymentLabel = order.paymentMethod
    ? `${PAYMENT_ICON[order.paymentMethod] ?? ''} ${t(`orders.payment${order.paymentMethod.charAt(0) + order.paymentMethod.slice(1).toLowerCase().replace('_t', 'T')}` as never) ?? order.paymentMethod}`
    : null;

  const paymentLabelFmt = order.paymentMethod === 'CASH'
    ? `💵 ${t('orders.paymentCash')}`
    : order.paymentMethod === 'CARD'
    ? `💳 ${t('orders.paymentCard')}`
    : order.paymentMethod === 'BANK_TRANSFER'
    ? `🏦 ${t('orders.paymentBankTransfer')}`
    : order.paymentMethod;

  const isActionable = order.status === 'PENDING' || order.status === 'IN_PROGRESS';
  const anyMutating = completeMutation.isPending || cancelMutation.isPending;

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4" style={{ paddingTop: insets.top + 12, paddingBottom: 12 }}>
        <View className="flex-row items-center">
          <TouchableOpacity testID="order-detail-back-btn" onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} className="mr-3">
            <MaterialCommunityIcons name="chevron-left" size={26} color="#4f46e5" />
          </TouchableOpacity>
          <Text className={`${typo.heading} text-gray-900 dark:text-white flex-1`} numberOfLines={1}>
            #{order.orderNumber}
          </Text>
          <View className="px-3 py-1 rounded-full" style={{ backgroundColor: statusColor + '20' }}>
            <Text className={typo.captionBold} style={{ color: statusColor }}>{statusLabel}</Text>
          </View>
        </View>
        <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 mt-1 ml-9`}>{formatDateTime(order.createdAt)}</Text>
      </View>

      {/* ── Scrollable body ─────────────────────────────────────────────────── */}
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: isActionable ? insets.bottom + 100 : insets.bottom + 24,
        }}
      >
        {/* Order meta */}
        <View className="bg-white rounded-2xl p-4 mb-3 border border-gray-100">
          <SectionLabel title={t('orders.orderDetail')} />
          <InfoRow label={t('orders.orderNumber')} value={`#${order.orderNumber}`} />
          <InfoRow label={t('orders.createdAt')} value={formatDateTime(order.createdAt)} />
          {order.createdByName && (
            <InfoRow label={t('orders.employee')} value={order.createdByName} />
          )}
          <InfoRow
            label={t('orders.customer')}
            value={order.customerName ?? t('orders.walkIn')}
          />
          {order.paymentMethod && (
            <InfoRow label={t('orders.paymentMethod')} value={paymentLabelFmt} />
          )}
          {order.note && (
            <InfoRow label={t('orders.note')} value={order.note} />
          )}
        </View>

        {/* Items */}
        <View className="bg-white rounded-2xl p-4 mb-3 border border-gray-100">
          <SectionLabel title={`${t('orders.items')} (${order.items.length})`} />
          {order.items.map((item, idx) => (
            <View
              key={idx}
              className={`py-3 ${idx < order.items.length - 1 ? 'border-b border-gray-50' : ''}`}
            >
              <View className="flex-row justify-between items-start">
                <Text className={`${typo.label} text-gray-800 flex-1 mr-3`} numberOfLines={2}>
                  {item.productName}
                </Text>
                <Text className={`${typo.labelBold} text-gray-900`}>{formatVnd(item.subtotal)}</Text>
              </View>
              <Text className={`${typo.caption} text-gray-400 mt-1`}>
                {formatVnd(item.unitPrice)} × {item.quantity} {item.unit}
              </Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View className="bg-white rounded-2xl p-4 mb-3 border border-gray-100">
          <SectionLabel title={t('orders.total')} />

          {order.discount > 0 && (
            <>
              <View className="flex-row justify-between py-2 border-b border-gray-50">
                <Text className={`${typo.caption} text-gray-500`}>{t('orders.subtotal')}</Text>
                <Text className={`${typo.caption} text-gray-700`}>{formatVnd(order.subtotal)}</Text>
              </View>
              <View className="flex-row justify-between py-2 border-b border-gray-50">
                <Text className={`${typo.caption} text-gray-500`}>{t('orders.discount')}</Text>
                <Text className={`${typo.caption} font-semibold`} style={{ color: '#f59e0b' }}>
                  -{formatVnd(order.discount)}
                </Text>
              </View>
            </>
          )}

          <View className="flex-row justify-between py-3">
            <Text className={`${typo.labelBold} text-gray-900`}>{t('orders.total')}</Text>
            <Text className={`${typo.section} font-bold text-primary`}>{formatVnd(order.total)}</Text>
          </View>

          {order.paymentMethod === 'CASH' && order.amountPaid != null && (
            <View className="border-t border-gray-100 pt-3 mt-1" style={{ gap: 8 }}>
              <View className="flex-row justify-between">
                <Text className={`${typo.caption} text-gray-500`}>{t('orders.amountPaid')}</Text>
                <Text className={`${typo.caption} font-medium text-gray-700`}>{formatVnd(order.amountPaid)}</Text>
              </View>
              {order.changeAmount != null && order.changeAmount > 0 && (
                <View className="flex-row justify-between">
                  <Text className={`${typo.caption} text-gray-500`}>{t('orders.changeAmount')}</Text>
                  <Text className={`${typo.caption} font-semibold`} style={{ color: '#4f46e5' }}>
                    {formatVnd(order.changeAmount)}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Cancellation details */}
        {order.status === 'CANCELLED' && (order.cancelReason || order.cancelledBy || order.cancelledAt) && (
          <View
            className="rounded-2xl p-4 mb-3 border"
            style={{ backgroundColor: '#fff1f2', borderColor: '#fecdd3' }}
          >
            <View className="flex-row items-center mb-3">
              <MaterialCommunityIcons name="close-circle-outline" size={15} color="#ef4444" style={{ marginRight: 5 }} />
              <Text className={`${typo.captionBold} uppercase tracking-wide`} style={{ color: '#ef4444' }}>
                {t('orders.cancelButton')}
              </Text>
            </View>
            {order.cancelReason && (
              <View className="mb-2">
                <Text className={`${typo.caption} text-red-400`}>{t('orders.cancelReason')}</Text>
                <Text className={`${typo.caption} font-medium text-red-700 mt-0.5`}>{order.cancelReason}</Text>
              </View>
            )}
            {order.cancelledBy && (
              <View className="mb-2">
                <Text className={`${typo.caption} text-red-400`}>{t('orders.cancelledBy')}</Text>
                <Text className={`${typo.caption} font-medium text-red-700 mt-0.5`}>{order.cancelledBy}</Text>
              </View>
            )}
            {order.cancelledAt && (
              <View>
                <Text className={`${typo.caption} text-red-400`}>{t('orders.cancelledAt')}</Text>
                <Text className={`${typo.caption} font-medium text-red-700 mt-0.5`}>
                  {formatDateTime(order.cancelledAt)}
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* ── Sticky action footer ─────────────────────────────────────────────── */}
      {isActionable && (
        <View
          className="bg-white border-t border-gray-100 px-4 pt-3"
          style={{ paddingBottom: insets.bottom + 16, gap: 10 }}
        >
          {/* Complete */}
          <TouchableOpacity
            testID="order-complete-btn"
            onPress={handleComplete}
            disabled={anyMutating}
            activeOpacity={0.8}
            className={`rounded-2xl py-4 items-center flex-row justify-center ${anyMutating && completeMutation.isPending ? 'bg-gray-300' : 'bg-primary'}`}
          >
            {completeMutation.isPending ? (
              <>
                <ActivityIndicator color="#fff" style={{ marginRight: 8 }} />
                <Text className={`${typo.labelBold} text-white`}>{t('orders.completing')}</Text>
              </>
            ) : (
              <>
                <MaterialCommunityIcons name="check-circle-outline" size={20} color="white" style={{ marginRight: 6 }} />
                <Text className={`${typo.labelBold} text-white`}>{t('orders.completeButton')}</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Cancel */}
          <TouchableOpacity
            testID="order-cancel-btn"
            onPress={handleCancel}
            disabled={anyMutating}
            activeOpacity={0.8}
            className="rounded-2xl py-3.5 items-center flex-row justify-center border border-red-200"
            style={{ backgroundColor: '#fff1f2' }}
          >
            {cancelMutation.isPending ? (
              <>
                <ActivityIndicator color="#ef4444" style={{ marginRight: 8 }} />
                <Text className={typo.label} style={{ color: '#ef4444' }}>
                  {t('orders.cancelling')}
                </Text>
              </>
            ) : (
              <>
                <MaterialCommunityIcons name="close-circle-outline" size={18} color="#ef4444" style={{ marginRight: 6 }} />
                <Text className={typo.label} style={{ color: '#ef4444' }}>
                  {t('orders.cancelButton')}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
