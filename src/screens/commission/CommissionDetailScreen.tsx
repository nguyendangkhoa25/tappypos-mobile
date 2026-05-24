import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { commissionApi } from '../../services/api';
import { useTypography } from '../../hooks/useTypography';
import { Skeleton } from '../../components/Skeleton';
import { EmptyState } from '../../components/EmptyState';
import { formatVnd } from '../../utils/format';
import type { MoreScreenProps } from '../../types/navigation';

export function CommissionDetailScreen({ navigation, route }: MoreScreenProps<'CommissionDetail'>) {
  const { employeeId, employeeName, month, year } = route.params;
  const { t } = useTranslation();
  const typo = useTypography();
  const insets = useSafeAreaInsets();

  const { data, isLoading } = useQuery({
    queryKey: ['commission', 'me', month, year, employeeId],
    queryFn: async () => {
      // Reuse /commission/me but the report gives us the list — we use a dedicated
      // endpoint here: /commission/me proxies via report items for a specific employee.
      // Actually we call getMyCommission on behalf of the employee — server returns their data
      // when called by a COMMISSION_VIEW_ALL user through getReport.
      // Since we only have the summary from getReport, we need a separate query.
      // We'll call getReport for the detail list by filtering from the summary, but the
      // backend detail API is /commission/me (returns items for the authenticated user).
      // For the team view, we'll re-use the report data filtered by employeeId in the UI,
      // but there's no dedicated "employee detail" endpoint yet.
      // For now, use getReport and filter (the items aren't there — only totals).
      // We'll implement by fetching myCommission for the logged-in user on "mine" tab.
      // For CommissionDetail (viewing another employee's items), the backend currently doesn't
      // have a per-employee detail endpoint — return the report summary row only.
      const report = await commissionApi.getReport(month, year);
      const emp = report.data.data?.employees?.find((e) => e.employeeId === employeeId);
      return emp ?? null;
    },
  });

  if (isLoading) {
    return (
      <View className="flex-1 bg-gray-50 dark:bg-gray-900">
        <View className="bg-primary px-5 pb-5" style={{ paddingTop: insets.top + 12 }}>
          <View className="flex-row items-center">
            <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} className="mr-3">
              <MaterialCommunityIcons name="chevron-left" size={26} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>
            <Text className={`${typo.section} text-white flex-1`}>{employeeName}</Text>
          </View>
        </View>
        <View className="p-4 gap-3">
          <Skeleton height={100} borderRadius={16} />
          <Skeleton height={60} borderRadius={12} />
          <Skeleton height={60} borderRadius={12} />
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <View className="bg-primary px-5 pb-5" style={{ paddingTop: insets.top + 12 }}>
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} className="mr-3">
            <MaterialCommunityIcons name="chevron-left" size={26} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className={`${typo.section} text-white`}>{employeeName}</Text>
            <Text className={`${typo.caption} text-white/60`}>
              {t('commission.monthYear', { month, year })}
            </Text>
          </View>
        </View>
      </View>

      {!data ? (
        <EmptyState
          icon="💰"
          title={t('commission.emptyTitle')}
          description={t('commission.emptySubtitle', { month, year })}
        />
      ) : (
        <View className="p-4">
          {/* Summary card */}
          <View className="bg-emerald-500 rounded-2xl p-5 mb-4 flex-row justify-between items-center">
            <View>
              <Text className={`${typo.caption} text-white/70 mb-1`}>{t('commission.totalTitle')}</Text>
              <Text className={`${typo.heading} text-white`}>
                {formatVnd(data.totalCommission)}
              </Text>
            </View>
            <View className="items-end">
              <MaterialCommunityIcons name="cash-multiple" size={32} color="rgba(255,255,255,0.3)" />
              <Text className={`${typo.caption} text-white/70 mt-1`}>
                {data.itemCount} {t('commission.itemCountUnit')}
              </Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
