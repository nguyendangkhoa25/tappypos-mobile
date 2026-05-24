import { useState, useCallback, useMemo } from 'react';
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
  type LoyaltyProgramDTO,
} from '../../services/api';
import { useFeatureCheck } from '../../hooks/useFeature';
import { useAlertStore } from '../../store/alertStore';
import { useTypography } from '../../hooks/useTypography';
import { formatVnd, formatRelativeDate } from '../../utils/format';
import { Skeleton } from '../../components/Skeleton';
import type { HomeScreenProps } from '../../types/navigation';

type Props = HomeScreenProps<'CustomerLoyalty'>;

// ─── Constants ────────────────────────────────────────────────────────────────

const TX_TYPE_CONFIG: Record<
  LoyaltyTransactionDTO['type'],
  { icon: string; color: string; sign: string; bg: string }
> = {
  EARNED:   { icon: 'plus-circle-outline',   color: '#059669', sign: '+', bg: '#05966915' },
  REDEEMED: { icon: 'gift-outline',          color: '#dc2626', sign: '-', bg: '#dc262615' },
  ADJUSTED: { icon: 'pencil-circle-outline', color: '#7c3aed', sign: '',  bg: '#7c3aed15' },
  EXPIRED:  { icon: 'clock-remove-outline',  color: '#6b7280', sign: '-', bg: '#6b728015' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateTimeShort(iso: string, lang: string): string {
  const relDate = formatRelativeDate(iso, lang);
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return `${relDate} · ${time}`;
}

function pointsWorthVnd(points: number, program: LoyaltyProgramDTO): number {
  if (!program.redemptionPointsPerDiscount || !program.redemptionDiscountAmount) return 0;
  return Math.floor(points / program.redemptionPointsPerDiscount) * program.redemptionDiscountAmount;
}

// ─── Transaction Row ──────────────────────────────────────────────────────────

function TransactionRow({ tx }: { tx: LoyaltyTransactionDTO }) {
  const { t, i18n } = useTranslation();
  const typo = useTypography();
  const cfg = TX_TYPE_CONFIG[tx.type] ?? TX_TYPE_CONFIG.ADJUSTED;
  const sign = tx.type === 'ADJUSTED' ? (tx.points >= 0 ? '+' : '') : cfg.sign;

  return (
    <View className="flex-row items-start px-4 py-3 border-b border-gray-50 dark:border-gray-700/60">
      {/* Icon avatar */}
      <View
        className="w-9 h-9 rounded-full items-center justify-center mr-3 mt-0.5 flex-shrink-0"
        style={{ backgroundColor: cfg.bg }}
      >
        <MaterialCommunityIcons name={cfg.icon as any} size={18} color={cfg.color} />
      </View>

      {/* Middle: description + meta */}
      <View className="flex-1 mr-2">
        <Text className={`${typo.label} text-gray-800 dark:text-gray-100`} numberOfLines={1}>
          {tx.description || t(`loyalty.txType.${tx.type}`)}
        </Text>
        <Text className={`${typo.caption} text-gray-400 dark:text-gray-500 mt-0.5`}>
          {formatDateTimeShort(tx.createdAt, i18n.language)}
        </Text>
        {/* Order reference chip */}
        {tx.orderId != null && (
          <View className="mt-1.5 self-start flex-row items-center bg-indigo-50 dark:bg-indigo-900/30 rounded-full px-2 py-0.5">
            <MaterialCommunityIcons name="receipt" size={11} color="#6366f1" style={{ marginRight: 3 }} />
            <Text className={`${typo.caption} text-indigo-600 dark:text-indigo-400`}>
              {t('loyalty.viewOrder')} #{tx.orderId}
            </Text>
          </View>
        )}
      </View>

      {/* Right: points change + balance */}
      <View className="items-end flex-shrink-0">
        <Text className={`${typo.labelBold}`} style={{ color: cfg.color }}>
          {sign}{Math.abs(tx.points)} {t('loyalty.pts')}
        </Text>
        <Text className={`${typo.caption} text-gray-400 dark:text-gray-500 mt-0.5`}>
          ={tx.balanceAfter}
        </Text>
      </View>
    </View>
  );
}

// ─── Hero Card ────────────────────────────────────────────────────────────────

function HeroCard({
  summary,
  program,
}: {
  summary: CustomerLoyaltySummaryDTO;
  program: LoyaltyProgramDTO | null | undefined;
}) {
  const { t } = useTranslation();
  const typo = useTypography();
  const tier = summary.currentTier;
  const tierColor = tier?.color ?? '#059669';
  const worth = program ? pointsWorthVnd(summary.loyaltyPoints, program) : 0;

  return (
    <View
      className="rounded-2xl p-5 mb-3"
      style={{ backgroundColor: tierColor }}
    >
      {/* Top row: title + tier badge */}
      <View className="flex-row items-center justify-between mb-3">
        <Text className={`${typo.label} text-white/80`}>{t('loyalty.currentPoints')}</Text>
        <View className="flex-row items-center gap-x-1">
          {tier && tier.pointsMultiplier > 1 && (
            <View className="bg-white/20 rounded-full px-2 py-0.5 mr-1">
              <Text className={`${typo.captionBold} text-white`}>
                ×{tier.pointsMultiplier} {t('loyalty.pts')}
              </Text>
            </View>
          )}
          {tier && (
            <View className="flex-row items-center bg-white/20 rounded-full px-2.5 py-0.5">
              <MaterialCommunityIcons name="crown-outline" size={12} color="white" style={{ marginRight: 3 }} />
              <Text className={`${typo.captionBold} text-white`}>{tier.name}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Points balance */}
      <Text testID="loyalty-balance" style={{ fontSize: typo.displaySize, fontWeight: '800', color: 'white', lineHeight: Math.round(typo.displaySize * 1.4) }}>
        {summary.loyaltyPoints.toLocaleString()}
      </Text>
      <Text className={`${typo.caption} text-white/70 mb-3`}>{t('loyalty.pts')}</Text>

      {/* Divider */}
      <View className="border-t border-white/20 mb-3" />

      {/* Bottom row: points worth + total spend */}
      <View className="flex-row justify-between">
        <View>
          <Text className={`${typo.caption} text-white/60`}>{t('loyalty.pointsWorthLabel')}</Text>
          <Text className={`${typo.labelBold} text-white`}>
            {worth > 0 ? `≈ ${formatVnd(worth)}` : '—'}
          </Text>
        </View>
        <View className="items-end">
          <Text className={`${typo.caption} text-white/60`}>{t('loyalty.totalSpend')}</Text>
          <Text className={`${typo.labelBold} text-white`}>{formatVnd(summary.totalSpent)}</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Program Rules Card ───────────────────────────────────────────────────────

function ProgramRulesCard({ program }: { program: LoyaltyProgramDTO }) {
  const { t } = useTranslation();
  const typo = useTypography();

  const rules = [
    {
      icon: 'star-plus-outline' as const,
      color: '#059669',
      bg: '#05966912',
      label: t('loyalty.earnRateLabel'),
      value: `${formatVnd(program.pointsPerAmount)} = 1 ${t('loyalty.pts')}`,
    },
    {
      icon: 'gift-open-outline' as const,
      color: '#7c3aed',
      bg: '#7c3aed12',
      label: t('loyalty.redeemRateLabel'),
      value: `${program.redemptionPointsPerDiscount} ${t('loyalty.pts')} = ${formatVnd(program.redemptionDiscountAmount)}`,
    },
    {
      icon: 'shield-check-outline' as const,
      color: '#0891b2',
      bg: '#0891b212',
      label: t('loyalty.minPointsLabel'),
      value: `≥ ${program.minRedemptionPoints} ${t('loyalty.pts')}`,
    },
  ];

  return (
    <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 mb-3 border border-gray-100 dark:border-gray-700">
      <Text className={`${typo.captionBold} text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3`}>
        {t('loyalty.program')}
      </Text>
      <View className="flex-row" style={{ gap: 8 }}>
        {rules.map((rule) => (
          <View
            key={rule.label}
            className="flex-1 rounded-xl p-3 items-center"
            style={{ backgroundColor: rule.bg }}
          >
            <MaterialCommunityIcons name={rule.icon} size={20} color={rule.color} />
            <Text
              className={`${typo.caption} text-gray-500 dark:text-gray-400 text-center mt-1.5 mb-1`}
              numberOfLines={1}
            >
              {rule.label}
            </Text>
            <Text
              className={`${typo.captionBold} text-center`}
              style={{ color: rule.color }}
              numberOfLines={2}
              adjustsFontSizeToFit
            >
              {rule.value}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Tier Progress Card ───────────────────────────────────────────────────────

function TierProgressCard({ summary }: { summary: CustomerLoyaltySummaryDTO }) {
  const { t } = useTranslation();
  const typo = useTypography();
  const tier = summary.currentTier;
  const next = summary.nextTier;

  if (next && summary.amountToNextTier != null) {
    const spent = summary.totalSpent - (next.minSpend - summary.amountToNextTier);
    const pct = Math.min(100, Math.max(4, (spent / next.minSpend) * 100));
    return (
      <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 mb-3">
        <View className="flex-row justify-between mb-2">
          <Text className={`${typo.captionBold} text-gray-700 dark:text-gray-200`}>
            {t('loyalty.nextTier')}: {next.name}
          </Text>
          <Text className={`${typo.caption} text-gray-400 dark:text-gray-500`}>
            {t('loyalty.remaining')}: {formatVnd(summary.amountToNextTier)}
          </Text>
        </View>
        <View className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <View
            className="h-full rounded-full"
            style={{ backgroundColor: next.color, width: `${pct}%` }}
          />
        </View>
        <Text className={`${typo.caption} text-gray-400 dark:text-gray-500 mt-1.5`}>
          {t('loyalty.totalSpend')}: {formatVnd(summary.totalSpent)}
        </Text>
      </View>
    );
  }

  if (!next && tier) {
    return (
      <View className="bg-white dark:bg-gray-800 rounded-2xl px-4 py-3.5 border border-gray-100 dark:border-gray-700 mb-3 flex-row items-center">
        <MaterialCommunityIcons name="trophy-outline" size={18} color={tier.color} style={{ marginRight: 8 }} />
        <Text className={`${typo.label}`} style={{ color: tier.color }}>{t('loyalty.topTier')}</Text>
      </View>
    );
  }

  return null;
}

// ─── Stats Row ────────────────────────────────────────────────────────────────

function StatsRow({ transactions }: { transactions: LoyaltyTransactionDTO[] }) {
  const { t } = useTranslation();
  const typo = useTypography();

  const { totalEarned, totalRedeemed } = useMemo(() => {
    let earned = 0;
    let redeemed = 0;
    for (const tx of transactions) {
      if (tx.type === 'EARNED') earned += Math.abs(tx.points);
      if (tx.type === 'REDEEMED') redeemed += Math.abs(tx.points);
    }
    return { totalEarned: earned, totalRedeemed: redeemed };
  }, [transactions]);

  const stats = [
    { label: t('loyalty.totalEarned'),   value: totalEarned,   color: '#059669', icon: 'trending-up' as const },
    { label: t('loyalty.totalRedeemed'), value: totalRedeemed, color: '#dc2626', icon: 'gift-outline' as const },
  ];

  return (
    <View className="flex-row mb-3" style={{ gap: 8 }}>
      {stats.map((s) => (
        <View
          key={s.label}
          className="flex-1 bg-white dark:bg-gray-800 rounded-2xl p-3.5 border border-gray-100 dark:border-gray-700 flex-row items-center"
        >
          <View
            className="w-8 h-8 rounded-xl items-center justify-center mr-2.5"
            style={{ backgroundColor: s.color + '18' }}
          >
            <MaterialCommunityIcons name={s.icon} size={16} color={s.color} />
          </View>
          <View>
            <Text className={`${typo.caption} text-gray-500 dark:text-gray-400`}>{s.label}</Text>
            <Text className={`${typo.labelBold}`} style={{ color: s.color }}>
              {s.value.toLocaleString()} {t('loyalty.pts')}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

// ─── Adjust Modal ─────────────────────────────────────────────────────────────

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

// ─── Main Screen ──────────────────────────────────────────────────────────────

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

  // Loyalty summary
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['customer-loyalty', customerId],
    queryFn: () =>
      loyaltyApi.getCustomerSummary(customerId).then((r) => r.data.data ?? null),
    staleTime: 60_000,
  });

  // Loyalty program rules
  const { data: program } = useQuery({
    queryKey: ['loyalty-program'],
    queryFn: () =>
      loyaltyApi.getProgram().then((r) => r.data.data ?? null),
    staleTime: 5 * 60_000,
  });

  // Paginated transactions
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
    ({ item }: { item: LoyaltyTransactionDTO }) => <TransactionRow tx={item} />,
    [],
  );

  const keyExtractor = useCallback((item: LoyaltyTransactionDTO) => String(item.id), []);

  const tierColor = summary?.currentTier?.color ?? '#059669';

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* ── Header ── */}
      <View
        className="px-4 pb-3"
        style={{
          paddingTop: insets.top + 12,
          backgroundColor: tierColor,
        }}
      >
        <View>
          <View className="flex-row items-center">
            {/* Back button */}
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              className="mr-3"
            >
              <MaterialCommunityIcons name="chevron-left" size={26} color="white" />
            </TouchableOpacity>

            {/* Title */}
            <Text className={`${typo.section} text-white flex-1`} numberOfLines={1}>
              {summaryLoading
                ? t('loyalty.historyTitle')
                : (summary?.customerName ?? t('loyalty.historyTitle'))}
            </Text>

            {/* Adjust button */}
            {canAdjust && (
              <TouchableOpacity
                onPress={() => setAdjustVisible(true)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                className="ml-2 bg-white/20 rounded-full p-1.5"
              >
                <MaterialCommunityIcons name="pencil-outline" size={18} color="white" />
              </TouchableOpacity>
            )}
          </View>
          <Text className={`${typo.caption} text-white/70 mt-0.5`}>
            {t('loyalty.hint')}
          </Text>
        </View>
      </View>

      {/* ── List ── */}
      <FlatList
        data={allTx}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 12, paddingBottom: insets.bottom + 24 }}
        ListHeaderComponent={
          summaryLoading ? (
            <View style={{ gap: 10 }}>
              <Skeleton width="100%" height={180} borderRadius={16} />
              <Skeleton width="100%" height={90} borderRadius={16} />
              <Skeleton width="100%" height={70} borderRadius={16} />
            </View>
          ) : summary ? (
            <View>
              {/* Hero card */}
              <HeroCard summary={summary} program={program} />

              {/* Program rules */}
              {program && program.isActive && (
                <ProgramRulesCard program={program} />
              )}

              {/* Tier progress */}
              <TierProgressCard summary={summary} />

              {/* Stats (only once we have transactions) */}
              {allTx.length > 0 && <StatsRow transactions={allTx} />}

              {/* Section header */}
              <View className="pb-2 pt-1">
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
        className="flex-1"
      />

      <AdjustModal
        visible={adjustVisible}
        customerId={customerId}
        onClose={() => setAdjustVisible(false)}
      />
    </View>
  );
}
