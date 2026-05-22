import { useState, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { pawnApi, type PawnData, type PawnStatus, type PawnKPIs } from '../../services/api';
import { useAlertStore } from '../../store/alertStore';
import { useTypography } from '../../hooks/useTypography';
import { formatVnd, formatDate } from '../../utils/format';
import { ErrorState } from '../../components/ErrorState';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { SellingStackParamList } from '../../types/navigation';

type Nav = NativeStackNavigationProp<SellingStackParamList>;

type StatusFilter = PawnStatus | 'ALL' | 'OVERDUE' | 'UPCOMING';

const STATUS_TABS: StatusFilter[] = ['ALL', 'PAWNED', 'OVERDUE', 'UPCOMING', 'REDEEMED', 'FORFEITED', 'CANCELLED'];

const CLIENT_SIDE_FILTERS: StatusFilter[] = ['ALL', 'OVERDUE', 'UPCOMING'];

const STATUS_COLORS: Record<PawnStatus, { bg: string; text: string; border: string }> = {
  PAWNED:    { bg: 'bg-blue-50 dark:bg-blue-900/20',   text: 'text-blue-700 dark:text-blue-400',   border: 'border-blue-400' },
  REDEEMED:  { bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-700 dark:text-green-400', border: 'border-green-400' },
  FORFEITED: { bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-700 dark:text-orange-400', border: 'border-orange-400' },
  CANCELLED: { bg: 'bg-gray-50 dark:bg-gray-800',       text: 'text-gray-500 dark:text-gray-400',   border: 'border-gray-300' },
};

function daysDiff(dateStr: string): number {
  const now = new Date();
  const due = new Date(dateStr);
  return Math.floor((due.getTime() - now.getTime()) / 86_400_000);
}

function OverdueBadge({ daysLeft }: { daysLeft: number }) {
  const { t } = useTranslation();
  const typo = useTypography();
  if (daysLeft >= 0) return null;
  return (
    <View className="bg-red-100 dark:bg-red-900/30 rounded-full px-2 py-0.5 self-start mt-1">
      <Text className={`${typo.captionBold} text-red-600 dark:text-red-400`}>
        {t('pawn.overdueLabel', { days: Math.abs(daysLeft) })}
      </Text>
    </View>
  );
}

function KpiRow({ kpis }: { kpis: PawnKPIs | null | undefined }) {
  const { t } = useTranslation();
  const typo = useTypography();
  if (!kpis) return null;
  return (
    <View className="flex-row bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-3 py-2 gap-2">
      <KpiChip label={t('pawn.kpi.active')} value={kpis.totalPawnedCount} color="blue" />
      <KpiChip label={t('pawn.kpi.overdue')} value={kpis.overdueCount} color="red" />
      <KpiChip label={t('pawn.kpi.dueToday')} value={kpis.dueTodayCount} color="amber" />
      <View className="flex-1 items-center bg-gray-50 dark:bg-gray-700 rounded-xl py-1.5 px-1">
        <Text className={`${typo.caption} text-gray-500 dark:text-gray-400`}>{t('pawn.kpi.totalLoaned')}</Text>
        <Text className={`${typo.captionBold} text-gray-800 dark:text-white mt-0.5`} numberOfLines={1}>
          {formatVnd(kpis.totalPawnedAmount)}
        </Text>
      </View>
    </View>
  );
}

function KpiChip({ label, value, color }: { label: string; value: number; color: string }) {
  const typo = useTypography();
  const textColor = color === 'red' ? 'text-red-600 dark:text-red-400'
    : color === 'amber' ? 'text-amber-600 dark:text-amber-400'
    : 'text-blue-600 dark:text-blue-400';
  return (
    <View className="flex-1 items-center bg-gray-50 dark:bg-gray-700 rounded-xl py-1.5">
      <Text className={`${typo.labelBold} ${textColor}`}>{value}</Text>
      <Text className={`${typo.caption} text-gray-400 dark:text-gray-500 text-center`} numberOfLines={1}>{label}</Text>
    </View>
  );
}

function PawnCard({ item, onPress }: { item: PawnData; onPress: () => void }) {
  const { t } = useTranslation();
  const typo = useTypography();
  const colors = STATUS_COLORS[item.pawnStatus];
  const daysLeft = item.pawnStatus === 'PAWNED' ? daysDiff(item.pawnDueDate) : null;
  const isOverdue = daysLeft !== null && daysLeft < 0;
  const isUpcoming = daysLeft !== null && daysLeft >= 0 && daysLeft <= 3;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      className={`mx-3 mb-2 rounded-2xl border-l-4 ${colors.border} ${colors.bg} p-3`}
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1 mr-2">
          <Text className={`${typo.labelBold} text-gray-900 dark:text-white`} numberOfLines={1}>
            {item.itemName}
          </Text>
          {item.customerName ? (
            <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 mt-0.5`}>
              {item.customerName}{item.phone ? ` · ${item.phone}` : ''}
            </Text>
          ) : (
            <Text className={`${typo.caption} text-gray-400 dark:text-gray-500 mt-0.5`}>{t('pawn.noCustomer')}</Text>
          )}
          <OverdueBadge daysLeft={daysLeft ?? 0} />
          {isUpcoming && !isOverdue && (
            <View className="bg-amber-100 dark:bg-amber-900/30 rounded-full px-2 py-0.5 self-start mt-1">
              <Text className={`${typo.captionBold} text-amber-600 dark:text-amber-400`}>
                {daysLeft === 0
                  ? t('pawn.kpi.dueToday')
                  : t('pawn.dueSoonLabel', { days: daysLeft })}
              </Text>
            </View>
          )}
        </View>
        <View className="items-end">
          <Text className={`${typo.labelBold} text-primary`}>{formatVnd(item.pawnAmount)}</Text>
          <Text className={`${typo.caption} text-gray-400 dark:text-gray-500 mt-0.5`}>
            {item.interestRate}%{t('pawn.perMonth')}
          </Text>
          <View className={`mt-1.5 px-2 py-0.5 rounded-full ${colors.bg}`}>
            <Text className={`${typo.captionBold} ${colors.text}`}>
              {t(`pawn.status.${item.pawnStatus}`)}
            </Text>
          </View>
        </View>
      </View>
      <View className="flex-row mt-2 pt-2 border-t border-black/5 dark:border-white/5">
        <Text className={`${typo.caption} text-gray-400 dark:text-gray-500 flex-1`}>
          {t('pawn.detail.pawnDate')}: {formatDate(item.pawnDate)}
        </Text>
        <Text className={`${typo.captionBold} ${isOverdue ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
          {t('pawn.detail.dueDate')}: {formatDate(item.pawnDueDate)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function StatBox({ value, label, valueClass }: { value: string; label: string; valueClass?: string }) {
  const typo = useTypography();
  return (
    <View className="flex-1 items-center">
      <Text className={`${typo.labelBold} ${valueClass ?? 'text-gray-800 dark:text-white'}`} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 text-center mt-0.5`} numberOfLines={1}>{label}</Text>
    </View>
  );
}

function FilterSummaryBanner({ filter, contracts }: { filter: StatusFilter; contracts: PawnData[] }) {
  const { t } = useTranslation();
  const typo = useTypography();

  if (filter === 'OVERDUE' && contracts.length > 0) {
    const totalDebt = contracts.reduce((s, p) => s + p.pawnAmount, 0);
    const avgDays = Math.round(
      contracts.reduce((s, p) => s + Math.abs(daysDiff(p.pawnDueDate)), 0) / contracts.length,
    );
    return (
      <View className="mx-3 mt-3 mb-1 rounded-2xl overflow-hidden border border-red-200 dark:border-red-800/50">
        <View className="bg-red-50 dark:bg-red-900/20 px-4 pt-3 pb-3">
          <View className="flex-row items-center mb-3">
            <MaterialCommunityIcons name="alert-circle" size={15} color="#dc2626" />
            <Text className={`ml-1.5 ${typo.labelBold} text-red-700 dark:text-red-400`}>
              {t('pawn.summary.overdueTitle', { count: contracts.length })}
            </Text>
          </View>
          <View className="flex-row">
            <StatBox
              value={String(contracts.length)}
              label={t('pawn.kpi.overdue')}
              valueClass="text-red-700 dark:text-red-400"
            />
            <View className="w-px bg-red-200 dark:bg-red-700/50 mx-2" />
            <StatBox
              value={formatVnd(totalDebt)}
              label={t('pawn.summary.overdueDebt')}
              valueClass="text-red-700 dark:text-red-400"
            />
            <View className="w-px bg-red-200 dark:bg-red-700/50 mx-2" />
            <StatBox
              value={`${avgDays} ${t('common.day')}`}
              label={t('pawn.summary.overdueAvgDays')}
              valueClass="text-red-700 dark:text-red-400"
            />
          </View>
        </View>
        <View className="bg-red-100 dark:bg-red-900/30 px-4 py-2 flex-row items-center">
          <MaterialCommunityIcons name="phone-outline" size={12} color="#dc2626" />
          <Text className={`ml-1.5 ${typo.caption} text-red-600 dark:text-red-400`}>{t('pawn.summary.overdueHint')}</Text>
        </View>
      </View>
    );
  }

  if (filter === 'UPCOMING' && contracts.length > 0) {
    const totalAmount = contracts.reduce((s, p) => s + p.pawnAmount, 0);
    const dueToday = contracts.filter((p) => daysDiff(p.pawnDueDate) === 0).length;
    const dueNext = contracts.length - dueToday;
    return (
      <View className="mx-3 mt-3 mb-1 rounded-2xl overflow-hidden border border-amber-200 dark:border-amber-800/50">
        <View className="bg-amber-50 dark:bg-amber-900/20 px-4 pt-3 pb-3">
          <View className="flex-row items-center mb-3">
            <MaterialCommunityIcons name="clock-alert-outline" size={15} color="#d97706" />
            <Text className={`ml-1.5 ${typo.labelBold} text-amber-700 dark:text-amber-400`}>
              {t('pawn.summary.upcomingTitle', { count: contracts.length })}
            </Text>
          </View>
          <View className="flex-row">
            <StatBox
              value={String(dueToday)}
              label={t('pawn.summary.upcomingToday')}
              valueClass="text-amber-700 dark:text-amber-400"
            />
            <View className="w-px bg-amber-200 dark:bg-amber-700/50 mx-2" />
            <StatBox
              value={String(dueNext)}
              label={t('pawn.summary.upcomingNext3')}
              valueClass="text-amber-700 dark:text-amber-400"
            />
            <View className="w-px bg-amber-200 dark:bg-amber-700/50 mx-2" />
            <StatBox
              value={formatVnd(totalAmount)}
              label={t('pawn.summary.upcomingTotal')}
              valueClass="text-amber-700 dark:text-amber-400"
            />
          </View>
        </View>
        <View className="bg-amber-100 dark:bg-amber-900/30 px-4 py-2 flex-row items-center">
          <MaterialCommunityIcons name="bell-outline" size={12} color="#d97706" />
          <Text className={`ml-1.5 ${typo.caption} text-amber-700 dark:text-amber-400`}>{t('pawn.summary.upcomingHint')}</Text>
        </View>
      </View>
    );
  }

  return null;
}

const STATUS_VI: Record<string, string> = {
  PAWNED: 'Đang cầm', REDEEMED: 'Đã chuộc', FORFEITED: 'Đã thanh lý', CANCELLED: 'Đã hủy',
};

function buildListHtml(contracts: PawnData[], filterLabel: string): string {
  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const rows = contracts.map((p, i) => `
    <tr style="background:${i % 2 === 0 ? '#fff' : '#f9f9f9'}">
      <td>${i + 1}</td>
      <td>#${p.pawnId}</td>
      <td>${p.itemName}</td>
      <td>${p.customerName || 'Vãng lai'}${p.phone ? '<br><small>' + p.phone + '</small>' : ''}</td>
      <td style="text-align:right">${formatVnd(p.pawnAmount)}</td>
      <td style="text-align:center">${p.interestRate}%</td>
      <td style="text-align:center">${fmtDate(p.pawnDate)}</td>
      <td style="text-align:center">${fmtDate(p.pawnDueDate)}</td>
      <td style="text-align:center">${STATUS_VI[p.pawnStatus] ?? p.pawnStatus}</td>
    </tr>`).join('');
  const total = contracts.reduce((s, p) => s + p.pawnAmount, 0);
  return `<!DOCTYPE html><html lang="vi"><head><meta charset="utf-8">
<style>
  body{font-family:Arial,sans-serif;font-size:11px;padding:20px;color:#000}
  h2{text-align:center;font-size:16px;margin-bottom:4px}
  .meta{text-align:center;color:#555;font-size:11px;margin-bottom:14px}
  table{width:100%;border-collapse:collapse;font-size:10px}
  th{background:#1e293b;color:#fff;padding:6px 4px;text-align:left;white-space:nowrap}
  td{padding:5px 4px;border-bottom:1px solid #e5e7eb;vertical-align:top}
  .total-row td{font-weight:bold;border-top:2px solid #000;background:#f0f0f0}
  small{color:#666}
</style></head><body>
<h2>DANH SÁCH HỢP ĐỒNG CẦM ĐỒ</h2>
<p class="meta">Bộ lọc: ${filterLabel} · Xuất ngày: ${new Date().toLocaleDateString('vi-VN')} · Tổng: ${contracts.length} hợp đồng</p>
<table>
  <thead><tr>
    <th>#</th><th>Số phiếu</th><th>Tài sản</th><th>Khách hàng</th>
    <th>Số tiền cầm</th><th>Lãi/tháng</th><th>Ngày cầm</th><th>Đáo hạn</th><th>Trạng thái</th>
  </tr></thead>
  <tbody>${rows}</tbody>
  <tfoot><tr class="total-row">
    <td colspan="4">Tổng cộng (${contracts.length} HĐ)</td>
    <td style="text-align:right">${formatVnd(total)}</td>
    <td colspan="4"></td>
  </tr></tfoot>
</table>
</body></html>`;
}

export function PawnListScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const typo = useTypography();
  const navigation = useNavigation<Nav>();
  const { show: showAlert } = useAlertStore();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('PAWNED');
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);

  const searchReq = useMemo(() => ({
    pawnStatuses: CLIENT_SIDE_FILTERS.includes(statusFilter)
      ? ['PAWNED'] as PawnStatus[]
      : [statusFilter] as PawnStatus[],
    searchWord: search.trim() || undefined,
  }), [statusFilter, search]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['pawns', searchReq],
    queryFn: () => pawnApi.search(searchReq).then((r) => r.data.data),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });

  const { data: kpis, refetch: refetchKPIs } = useQuery({
    queryKey: ['pawnKPIs'],
    queryFn: () => pawnApi.getKPIs().then((r) => r.data.data),
    staleTime: 30_000,
  });

  useFocusEffect(useCallback(() => {
    refetch();
    refetchKPIs();
  }, [refetch, refetchKPIs]));

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetch(), refetchKPIs()]);
    setRefreshing(false);
  };

  const onExportList = async () => {
    if (contracts.length === 0) return;
    setExporting(true);
    try {
      const filterLabel = t(`pawn.status.${CLIENT_SIDE_FILTERS.includes(statusFilter) ? statusFilter.toLowerCase() : statusFilter}`);
      const html = buildListHtml(contracts, filterLabel);
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: '.pdf' });
    } catch (e) {
      showAlert(t('common.error'), t('pawn.exportError'));
    } finally {
      setExporting(false);
    }
  };

  const contracts = useMemo(() => {
    if (!data?.content) return [];
    if (statusFilter === 'OVERDUE') {
      return data.content.filter((p) => daysDiff(p.pawnDueDate) < 0);
    }
    if (statusFilter === 'UPCOMING') {
      return data.content.filter((p) => {
        const d = daysDiff(p.pawnDueDate);
        return d >= 0 && d <= 3;
      });
    }
    return data.content;
  }, [data, statusFilter]);

  if (isError) {
    return <ErrorState onRetry={refetch} />;
  }

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <View className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4" style={{ paddingTop: insets.top + 12, paddingBottom: 12 }}>
        <Text className={`${typo.section} text-gray-900 dark:text-white mb-0.5`}>{t('pawn.title')}</Text>
        <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 mb-3 mt-0.5`}>{t('pawn.hint')}</Text>
        <View className="flex-row items-center">
        {kpis && kpis.overdueCount > 0 && (
          <TouchableOpacity
            onPress={() => setStatusFilter('OVERDUE')}
            className="bg-red-500 rounded-full min-w-[20px] h-5 px-1 items-center justify-center mr-2"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text className={`${typo.captionBold} text-white`}>{kpis.overdueCount}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={onRefresh} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} className="p-1 mr-1">
          <MaterialCommunityIcons name="refresh" size={20} color="#6b7280" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onExportList}
          disabled={exporting || contracts.length === 0}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          className="p-1 mr-1"
        >
          {exporting
            ? <ActivityIndicator size="small" color="#6b7280" />
            : <MaterialCommunityIcons name="file-export-outline" size={20} color={contracts.length === 0 ? '#d1d5db' : '#6b7280'} />}
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => navigation.navigate('PawnSettings')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          className="p-1"
        >
          <MaterialCommunityIcons name="cog-outline" size={20} color="#6b7280" />
        </TouchableOpacity>
        </View>
      </View>

      {/* KPI row */}
      <KpiRow kpis={kpis} />

      {/* Search bar */}
      <View className="px-3 py-2 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
        <View className="flex-row items-center bg-gray-100 dark:bg-gray-700 rounded-xl px-3 py-2">
          <MaterialCommunityIcons name="magnify" size={18} color="#9ca3af" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t('pawn.search')}
            placeholderTextColor="#9ca3af"
            className={`flex-1 ml-2 ${typo.inputSize} text-gray-900 dark:text-white`}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <MaterialCommunityIcons name="close-circle" size={16} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Status tabs */}
      <View className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={STATUS_TABS}
          keyExtractor={(s) => s}
          contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8, gap: 8 }}
          renderItem={({ item: tab }) => (
            <TouchableOpacity
              onPress={() => setStatusFilter(tab)}
              className={`rounded-full px-3 py-1.5 border ${
                statusFilter === tab
                  ? 'bg-primary border-primary'
                  : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600'
              }`}
            >
              <Text className={`${typo.captionBold} ${statusFilter === tab ? 'text-white' : 'text-gray-600 dark:text-gray-300'}`}>
                {CLIENT_SIDE_FILTERS.includes(tab)
                  ? t(`pawn.status.${tab.toLowerCase()}`)
                  : t(`pawn.status.${tab}`)}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* List */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#4f46e5" />
        </View>
      ) : contracts.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <MaterialCommunityIcons name="handshake-outline" size={56} color="#d1d5db" />
          <Text className={`${typo.body} text-gray-400 dark:text-gray-500 text-center mt-3`}>
            {t('pawn.empty')}
          </Text>
          <Text className={`${typo.caption} text-gray-400 dark:text-gray-500 text-center mt-1`}>
            {t('pawn.emptyHint')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={contracts}
          keyExtractor={(item) => String(item.pawnId)}
          renderItem={({ item }) => (
            <PawnCard
              item={item}
              onPress={() => navigation.navigate('PawnDetail', { pawnId: item.pawnId })}
            />
          )}
          ListHeaderComponent={
            <FilterSummaryBanner filter={statusFilter} contracts={contracts} />
          }
          contentContainerStyle={{ paddingTop: 8, paddingBottom: insets.bottom + 80 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#059669" />
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        onPress={() => navigation.navigate('PawnForm', {})}
        className="absolute right-5 bg-primary rounded-full w-14 h-14 items-center justify-center shadow-lg"
        style={{ bottom: insets.bottom + 16 }}
      >
        <MaterialCommunityIcons name="plus" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}
