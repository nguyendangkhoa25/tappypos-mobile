import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { customerApi, orderApi, loyaltyApi, type CustomerData, type OrderSummary, type OrderDetail } from '../../services/api';
import { useAlertStore } from '../../store/alertStore';
import { useToastStore } from '../../store/toastStore';
import { useErrorAlert } from '../../hooks/useErrorAlert';
import { formatVnd, formatDate } from '../../utils/format';
import { Skeleton } from '../../components/Skeleton';
import { ErrorState } from '../../components/ErrorState';
import type { HomeScreenProps } from '../../types/navigation';

type Props = HomeScreenProps<'CustomerDetail'>;

const STATUS_COLOR: Record<string, string> = {
  COMPLETED: '#059669',
  PROCESSING: '#3b82f6',
  PENDING: '#f59e0b',
  CANCELLED: '#ef4444',
};

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <View className="flex-row py-2.5 border-b border-gray-50">
      <Text className="text-sm text-gray-500 w-36">{label}</Text>
      <Text className="text-sm text-gray-800 font-medium flex-1">{value}</Text>
    </View>
  );
}

function SectionHeader({ icon, title }: { icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']; title: string }) {
  return (
    <View className="flex-row items-center mb-3">
      <MaterialCommunityIcons name={icon} size={14} color="#6b7280" style={{ marginRight: 5 }} />
      <Text className="text-xs font-bold text-gray-500 uppercase tracking-wide">{title}</Text>
    </View>
  );
}

function OrderRow({ order }: { order: OrderSummary }) {
  const { t } = useTranslation();
  const color = STATUS_COLOR[order.status] ?? '#6b7280';
  return (
    <View className="flex-row items-center py-2.5 border-b border-gray-50">
      <View className="flex-1">
        <Text className="text-sm font-semibold text-gray-800">#{order.orderNumber}</Text>
        <Text className="text-xs text-gray-400 mt-0.5">{formatDate(order.createdAt)}</Text>
      </View>
      <View className="items-end">
        <Text className="text-sm font-bold text-primary">{formatVnd(order.total)}</Text>
        <View className="mt-1 px-2 py-0.5 rounded-full" style={{ backgroundColor: color + '20' }}>
          <Text className="text-xs font-semibold" style={{ color }}>
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
  const { top } = useSafeAreaInsets();
  const { customerId } = route.params;
  const queryClient = useQueryClient();
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

  const { data: loyaltySummary } = useQuery({
    queryKey: ['customer-loyalty', customerId],
    queryFn: () => loyaltyApi.getCustomerSummary(customerId).then((r) => r.data.data),
    staleTime: 60_000,
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
      <View className="flex-1 bg-gray-50">
        <View className="bg-primary px-6 pb-5" style={{ paddingTop: top + 16 }}>
          <TouchableOpacity onPress={() => navigation.goBack()} className="mb-3">
            <MaterialCommunityIcons name="arrow-left" size={24} color="white" />
          </TouchableOpacity>
          <Skeleton height={28} width={180} borderRadius={6} variant="light" style={{ marginBottom: 8 }} />
          <Skeleton height={16} width={120} borderRadius={6} variant="light" />
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
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-primary px-6 pb-6" style={{ paddingTop: top + 16 }}>
        <View className="flex-row items-center justify-between mb-4">
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="white" />
          </TouchableOpacity>
          <View className="flex-row items-center" style={{ gap: 12 }}>
            <TouchableOpacity
              onPress={() => navigation.navigate('CustomerForm', { customerId })}
              className="flex-row items-center bg-white/20 rounded-xl px-3 py-1.5"
            >
              <MaterialCommunityIcons name="pencil-outline" size={15} color="white" style={{ marginRight: 4 }} />
              <Text className="text-sm font-semibold text-white">{t('customers.editCustomer')}</Text>
            </TouchableOpacity>
            <TouchableOpacity testID="customer-delete-btn" onPress={handleDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending
                ? <ActivityIndicator size="small" color="rgba(255,255,255,0.7)" />
                : <MaterialCommunityIcons name="trash-can-outline" size={22} color="rgba(255,255,255,0.7)" />
              }
            </TouchableOpacity>
          </View>
        </View>

        <Text className="text-xs text-indigo-200 mb-3">{t('customers.detailHint')}</Text>
        {/* Avatar + name */}
        <View className="flex-row items-center">
          <View className="w-14 h-14 rounded-full bg-white/20 items-center justify-center mr-4">
            <Text className="text-2xl font-bold text-white">
              {customer.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="text-xl font-bold text-white">{customer.name}</Text>
            <Text className="text-sm text-indigo-200">{customer.phone}</Text>
            {customer.email && (
              <Text className="text-xs text-indigo-300 mt-0.5">{customer.email}</Text>
            )}
          </View>
        </View>

        {/* Stats row */}
        <View className="flex-row mt-4 bg-white/15 rounded-2xl p-3" style={{ gap: 0 }}>
          <View className="flex-1 items-center">
            <Text className="text-lg font-bold text-white">{customer.totalOrders}</Text>
            <Text className="text-xs text-indigo-200">{t('customers.orders')}</Text>
          </View>
          <View className="w-px bg-white/20" />
          <View className="flex-1 items-center">
            <Text className="text-base font-bold text-white" numberOfLines={1}>
              {formatVnd(customer.totalSpend)}
            </Text>
            <Text className="text-xs text-indigo-200">{t('customers.totalSpend')}</Text>
          </View>
          <View className="w-px bg-white/20" />
          <TouchableOpacity
            className="flex-1 items-center"
            onPress={() => navigation.navigate('CustomerLoyalty', { customerId })}
          >
            <Text className="text-lg font-bold text-white">{customer.points}</Text>
            {loyaltySummary?.currentTier ? (
              <View
                className="mt-0.5 px-1.5 py-0.5 rounded-full"
                style={{ backgroundColor: loyaltySummary.currentTier.color + '40' }}
              >
                <Text className="text-[10px] font-bold text-white">
                  {loyaltySummary.currentTier.name}
                </Text>
              </View>
            ) : (
              <Text className="text-xs text-indigo-200">{t('customers.points')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* Member since */}
        {customer.createdAt && (
          <Text className="text-xs text-gray-400 text-center mb-4">
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
                <Text className="text-xs text-primary font-semibold">{t('loyalty.viewHistory')}</Text>
              </TouchableOpacity>
            </View>
            {loyaltySummary.currentTier && (
              <View
                className="flex-row items-center px-2 py-1 rounded-lg mb-2 self-start"
                style={{ backgroundColor: loyaltySummary.currentTier.color + '20' }}
              >
                <MaterialCommunityIcons name="crown-outline" size={13} color={loyaltySummary.currentTier.color} style={{ marginRight: 4 }} />
                <Text className="text-xs font-bold" style={{ color: loyaltySummary.currentTier.color }}>
                  {loyaltySummary.currentTier.name}
                </Text>
              </View>
            )}
            {loyaltySummary.nextTier && loyaltySummary.amountToNextTier != null && (
              <View>
                <View className="flex-row justify-between mb-1">
                  <Text className="text-xs text-gray-400">{t('loyalty.nextTier')}: {loyaltySummary.nextTier.name}</Text>
                  <Text className="text-xs text-gray-500 font-medium">
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
              <Text className="text-xs text-gray-400">{t('loyalty.topTier')}</Text>
            )}
          </View>
        )}

        {/* Last visit service summary */}
        {lastOrderDetail && lastOrderDetail.items.length > 0 && (
          <View className="bg-white rounded-2xl p-4 mb-3 border border-gray-100">
            <View className="flex-row items-center justify-between mb-2">
              <SectionHeader icon="history" title={t('customers.lastVisit')} />
              <Text className="text-xs text-gray-400">{formatDate(lastOrderDetail.createdAt)}</Text>
            </View>
            {lastOrderDetail.createdByName ? (
              <View className="flex-row items-center mb-2">
                <MaterialCommunityIcons name="account-outline" size={13} color="#9ca3af" style={{ marginRight: 4 }} />
                <Text className="text-xs text-gray-500">{lastOrderDetail.createdByName}</Text>
              </View>
            ) : null}
            {lastOrderDetail.items.map((item, idx) => (
              <View
                key={idx}
                className="flex-row items-center justify-between py-1.5 border-b border-gray-50 last:border-0"
              >
                <Text className="text-sm text-gray-700 flex-1 mr-2" numberOfLines={1}>
                  {item.productName}
                </Text>
                {item.unitPrice > 0 && (
                  <Text className="text-sm font-semibold text-emerald-600">
                    {formatVnd(item.unitPrice)}
                  </Text>
                )}
              </View>
            ))}
            {lastOrderDetail.total > 0 && (
              <View className="flex-row justify-between pt-2 mt-1 border-t border-gray-100">
                <Text className="text-xs text-gray-400">{t('customers.lastVisitTotal')}</Text>
                <Text className="text-sm font-bold text-gray-800">{formatVnd(lastOrderDetail.total)}</Text>
              </View>
            )}
          </View>
        )}

        {/* Recent Orders */}
        <View className="bg-white rounded-2xl p-4 mb-3 border border-gray-100">
          <View className="flex-row items-center justify-between mb-3">
            <SectionHeader icon="shopping-outline" title={t('customers.recentOrders')} />
            {(ordersData?.totalPages ?? 0) > 0 && (
              <Text className="text-xs text-primary font-semibold">{t('customers.viewAll')}</Text>
            )}
          </View>

          {ordersLoading ? (
            <View style={{ gap: 8 }}>
              {[0, 1, 2].map((i) => <Skeleton key={i} height={44} borderRadius={8} />)}
            </View>
          ) : orders.length === 0 ? (
            <View className="py-6 items-center">
              <MaterialCommunityIcons name="shopping-outline" size={32} color="#d1d5db" />
              <Text className="text-gray-400 text-sm mt-2">{t('customers.noOrders')}</Text>
            </View>
          ) : (
            orders.map((order) => <OrderRow key={order.id} order={order} />)
          )}
        </View>
      </ScrollView>
    </View>
  );
}
