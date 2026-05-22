import { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  loyaltyApi,
  type LoyaltyTransactionDTO,
  type CustomerLoyaltySummaryDTO,
} from '../../services/api';
import { useFeatureCheck } from '../../hooks/useFeature';
import { useAlertStore } from '../../store/alertStore';
import { useTypography } from '../../hooks/useTypography';
import { formatVnd } from '../../utils/format';
import { Skeleton } from '../../components/Skeleton';
import type { HomeScreenProps } from '../../types/navigation';

type Props = HomeScreenProps<'CustomerLoyalty'>;

const TX_TYPE_CONFIG: Record<
  LoyaltyTransactionDTO['type'],
  { icon: string; color: string; sign: string }
> = {
  EARNED:   { icon: 'plus-circle-outline',  color: '#059669', sign: '+' },
  REDEEMED: { icon: 'minus-circle-outline', color: '#dc2626', sign: '-' },
  ADJUSTED: { icon: 'pencil-circle-outline', color: '#7c3aed', sign: '' },
  EXPIRED:  { icon: 'clock-remove-outline', color: '#6b7280', sign: '-' },
};

function formatDateTime(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function TransactionRow({ tx, t }: { tx: LoyaltyTransactionDTO; t: (k: string) => string }) {
  const typo = useTypography();
  const cfg = TX_TYPE_CONFIG[tx.type] ?? TX_TYPE_CONFIG.ADJUSTED;
  const sign = tx.type === 'ADJUSTED' ? (tx.points >= 0 ? '+' : '') : cfg.sign;
  return (
    <View className="flex-row items-start py-3 border-b border-gray-50 dark:border-gray-700">
      <View
        className="w-8 h-8 rounded-full items-center justify-center mr-3 mt-0.5"
        style={{ backgroundColor: cfg.color + '15' }}
      >
        <MaterialCommunityIcons name={cfg.icon as any} size={18} color={cfg.color} />
      </View>
      <View className="flex-1">
        <Text className={`${typo.label} text-gray-800 dark:text-gray-100`} numberOfLines={1}>
          {tx.description || t(`loyalty.txType.${tx.type}`)}
        </Text>
        <Text className={`${typo.caption} text-gray-400 dark:text-gray-500 mt-0.5`}>{formatDateTime(tx.createdAt)}</Text>
      </View>
      <View className="items-end">
        <Text className={`${typo.labelBold}`} style={{ color: cfg.color }}>
          {sign}{Math.abs(tx.points)} {t('loyalty.pts')}
        </Text>
        <Text className={`${typo.caption} text-gray-400 dark:text-gray-500 mt-0.5`}>{t('loyalty.balance')}: {tx.balanceAfter}</Text>
      </View>
    </View>
  );
}

function SummaryHeader({
  summary,
  t,
}: {
  summary: CustomerLoyaltySummaryDTO;
  t: (k: string) => string;
}) {
  const typo = useTypography();
  const tier = summary.currentTier;
  const next = summary.nextTier;

  return (
    <View className="px-4 pb-4">
      {/* Points card */}
      <View
        className="rounded-2xl p-4 mb-3"
        style={{ backgroundColor: tier?.color ?? '#059669' }}
      >
        <View className="flex-row items-center justify-between mb-2">
          <Text className={`${typo.label} text-white/80`}>{t('loyalty.currentPoints')}</Text>
          {tier && (
            <View className="flex-row items-center bg-white/20 rounded-full px-2 py-0.5">
              <MaterialCommunityIcons name="crown-outline" size={12} color="white" style={{ marginRight: 3 }} />
              <Text className={`${typo.captionBold} text-white`}>{tier.name}</Text>
            </View>
          )}
        </View>
        <Text testID="loyalty-balance" className={`${typo.heading} text-white mb-1`}>{summary.loyaltyPoints}</Text>
        <Text className={`${typo.caption} text-white/70`}>{t('loyalty.pts')}</Text>
      </View>

      {/* Tier progress */}
      {next && summary.amountToNextTier != null && (
        <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700">
          <View className="flex-row justify-between mb-2">
            <Text className={`${typo.captionBold} text-gray-600 dark:text-gray-300`}>{t('loyalty.nextTier')}: {next.name}</Text>
            <Text className={`${typo.caption} text-gray-400 dark:text-gray-500`}>
              {t('loyalty.remaining')}: {formatVnd(summary.amountToNextTier)}
            </Text>
          </View>
          <View className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <View
              className="h-full rounded-full"
              style={{
                backgroundColor: next.color,
                width: `${Math.min(100, Math.max(4, ((summary.totalSpent - (next.minSpend - summary.amountToNextTier)) / next.minSpend) * 100))}%`,
              }}
            />
          </View>
          <Text className={`${typo.caption} text-gray-400 dark:text-gray-500 mt-1.5`}>
            {t('loyalty.totalSpend')}: {formatVnd(summary.totalSpent)}
          </Text>
        </View>
      )}
      {!next && tier && (
        <View className="bg-white dark:bg-gray-800 rounded-2xl px-4 py-3 border border-gray-100 dark:border-gray-700 flex-row items-center">
          <MaterialCommunityIcons name="trophy-outline" size={18} color={tier.color} style={{ marginRight: 8 }} />
          <Text className={`${typo.label}`} style={{ color: tier.color }}>{t('loyalty.topTier')}</Text>
        </View>
      )}
    </View>
  );
}

function AdjustModal({
  visible,
  customerId,
  onClose,
}: {
  visible: boolean;
  customerId: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const typo = useTypography();
  const qc = useQueryClient();
  const showAlert = useAlertStore((s) => s.show);
  const [points, setPoints] = useState('');
  const [description, setDescription] = useState('');

  const mutation = useMutation({
    mutationFn: () => {
      const pts = parseInt(points, 10);
      if (isNaN(pts) || pts === 0) throw new Error(t('loyalty.invalidPoints'));
      return loyaltyApi.adjustPoints(customerId, pts, description.trim() || undefined);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customer-loyalty', customerId] });
      qc.invalidateQueries({ queryKey: ['customer-loyalty-tx', customerId] });
      qc.invalidateQueries({ queryKey: ['customer', customerId] });
      setPoints('');
      setDescription('');
      onClose();
    },
    onError: (e: unknown) => {
      type ApiErr = { message?: string; response?: { data?: { error?: string } } };
      const err = e as ApiErr;
      showAlert(t('common.error'), err?.message ?? err?.response?.data?.error ?? t('loyalty.adjustFailed'));
    },
  });

  function handleClose() {
    setPoints('');
    setDescription('');
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 justify-end"
      >
        <View className="bg-black/40 absolute inset-0" />
        <View className="bg-white dark:bg-gray-800 rounded-t-3xl px-5 pt-5 pb-8">
          <View className="flex-row items-center justify-between mb-4">
            <Text className={`${typo.labelBold} text-gray-900 dark:text-white`}>{t('loyalty.adjustTitle')}</Text>
            <TouchableOpacity onPress={handleClose} hitSlop={8}>
              <MaterialCommunityIcons name="close" size={22} color="#9ca3af" />
            </TouchableOpacity>
          </View>

          <Text className={`${typo.captionBold} text-gray-500 dark:text-gray-400 mb-1`}>{t('loyalty.adjustPoints')}</Text>
          <Text className={`${typo.caption} text-gray-400 dark:text-gray-500 mb-2`}>{t('loyalty.adjustHint')}</Text>
          <TextInput
            value={points}
            onChangeText={setPoints}
            placeholder="+100 hoặc -50"
            keyboardType="numbers-and-punctuation"
            className={`border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 ${typo.inputSize} text-gray-800 dark:text-gray-100 dark:bg-gray-700 mb-3`}
          />

          <Text className={`${typo.captionBold} text-gray-500 dark:text-gray-400 mb-1`}>{t('loyalty.adjustReason')}</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder={t('loyalty.adjustReasonPlaceholder')}
            className={`border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 ${typo.inputSize} text-gray-800 dark:text-gray-100 dark:bg-gray-700 mb-4`}
          />

          <TouchableOpacity
            onPress={() => mutation.mutate()}
            disabled={mutation.isPending || !points.trim()}
            className="bg-primary rounded-xl py-3.5 items-center"
          >
            {mutation.isPending ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className={`${typo.labelBold} text-white`}>{t('loyalty.adjustConfirm')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function CustomerLoyaltyScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const typo = useTypography();
  const insets = useSafeAreaInsets();
  const { customerId } = route.params;
  const has = useFeatureCheck();
  const canAdjust = has('LOYALTY');

  const [page, setPage] = useState(0);
  const [allTx, setAllTx] = useState<LoyaltyTransactionDTO[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [adjustVisible, setAdjustVisible] = useState(false);

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['customer-loyalty', customerId],
    queryFn: () => loyaltyApi.getCustomerSummary(customerId).then((r) => r.data.data),
    staleTime: 60_000,
  });

  const { isFetching: txFetching } = useQuery({
    queryKey: ['customer-loyalty-tx', customerId, page],
    queryFn: async () => {
      const r = await loyaltyApi.getTransactions(customerId, page);
      const d = r.data.data;
      setAllTx((prev) => (page === 0 ? d.content : [...prev, ...d.content]));
      setHasMore(page < d.totalPages - 1);
      return d;
    },
    staleTime: 30_000,
  });

  const loadMore = useCallback(() => {
    if (!txFetching && hasMore) setPage((p) => p + 1);
  }, [txFetching, hasMore]);

  const renderItem = useCallback(
    ({ item }: { item: LoyaltyTransactionDTO }) => <TransactionRow tx={item} t={t} />,
    [t],
  );

  const keyExtractor = useCallback((item: LoyaltyTransactionDTO) => String(item.id), []);

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <View className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4" style={{ paddingTop: insets.top + 12, paddingBottom: 12 }}>
        <View className="flex-row items-center mb-0.5">
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} className="mr-3">
            <MaterialCommunityIcons name="chevron-left" size={26} color="#059669" />
          </TouchableOpacity>
          <Text className={`${typo.heading} text-gray-900 dark:text-white flex-1`}>{t('loyalty.historyTitle')}</Text>
          {canAdjust && (
            <TouchableOpacity
              onPress={() => setAdjustVisible(true)}
              className="flex-row items-center bg-violet-50 rounded-xl px-3 py-1.5"
            >
              <MaterialCommunityIcons name="pencil-outline" size={15} color="#7c3aed" style={{ marginRight: 4 }} />
              <Text className={`${typo.captionBold} text-violet-700`}>{t('loyalty.adjust')}</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 mb-0 mt-0.5`}>{t('loyalty.hint')}</Text>
      </View>

      <FlatList
        data={allTx}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        ListHeaderComponent={
          summaryLoading ? (
            <View className="px-4 py-4" style={{ gap: 10 }}>
              <Skeleton width="100%" height={110} borderRadius={16} />
              <Skeleton width="100%" height={80} borderRadius={16} />
            </View>
          ) : summary ? (
            <View className="pt-4">
              <SummaryHeader summary={summary} t={t} />
              <View className="px-4 pb-2">
                <Text className={`${typo.captionBold} text-gray-400 dark:text-gray-500 uppercase tracking-wide`}>
                  {t('loyalty.transactionHistory')}
                </Text>
              </View>
            </View>
          ) : null
        }
        ListEmptyComponent={
          !txFetching ? (
            <View className="items-center py-12">
              <MaterialCommunityIcons name="star-circle-outline" size={40} color="#d1d5db" />
              <Text className={`${typo.caption} text-gray-400 mt-3`}>{t('loyalty.noTransactions')}</Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          txFetching ? (
            <View className="py-4 items-center">
              <ActivityIndicator size="small" color="#059669" />
            </View>
          ) : null
        }
        className="bg-white dark:bg-gray-800 mx-4 mt-3 rounded-2xl border border-gray-100 dark:border-gray-700 px-4"
      />

      <AdjustModal
        visible={adjustVisible}
        customerId={customerId}
        onClose={() => setAdjustVisible(false)}
      />
    </View>
  );
}
