import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { orderApi, expenseApi } from '../../services/api';
import { formatVnd } from '../../utils/format';
import { BarChart } from '../../components/BarChart';
import { DatePickerInput } from '../../components/DatePickerInput';

type Tab = 'revenue' | 'expenses';
type Period = 'today' | 'yesterday' | 'thisWeek' | 'thisMonth' | 'custom';

function periodGranularity(period: Period, from: string, to: string): 'hour' | 'day' | 'month' {
  if (period === 'today' || period === 'yesterday') return 'hour';
  if (period === 'custom') {
    const days = (new Date(to).getTime() - new Date(from).getTime()) / 86_400_000;
    if (days <= 1) return 'hour';
    if (days <= 90) return 'day';
    return 'month';
  }
  return 'day';
}

function getDateRange(period: Exclude<Period, 'custom'>): { from: string; to: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();

  const fmt = (dt: Date) => dt.toISOString().slice(0, 10);

  if (period === 'today') {
    const s = new Date(y, m, d);
    return { from: fmt(s), to: fmt(s) };
  }
  if (period === 'yesterday') {
    const s = new Date(y, m, d - 1);
    return { from: fmt(s), to: fmt(s) };
  }
  if (period === 'thisWeek') {
    const day = now.getDay();
    const mon = new Date(y, m, d - (day === 0 ? 6 : day - 1));
    return { from: fmt(mon), to: fmt(now) };
  }
  // thisMonth
  return { from: fmt(new Date(y, m, 1)), to: fmt(now) };
}

export function ReportScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('revenue');
  const [period, setPeriod] = useState<Period>('thisMonth');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const today = new Date().toISOString().slice(0, 10);
  const range = period === 'custom'
    ? { from: customFrom || today, to: customTo || today }
    : getDateRange(period);

  const granularity = periodGranularity(period, range.from, range.to);
  const customReady = period !== 'custom' || (customFrom.length === 10 && customTo.length === 10);

  const { data: revSummary, isLoading: loadingRev } = useQuery({
    queryKey: ['report', 'revenue', range.from, range.to],
    queryFn: () => orderApi.summary({ from: range.from, to: range.to, status: 'COMPLETED' }).then((r) => r.data.data),
    staleTime: 60_000,
    enabled: tab === 'revenue' && customReady,
  });

  const { data: revChart = [] } = useQuery({
    queryKey: ['report', 'revenue-chart', range.from, range.to, granularity],
    queryFn: () => orderApi.chart({ from: range.from, to: range.to, granularity }).then((r) => r.data.data),
    staleTime: 60_000,
    enabled: tab === 'revenue' && customReady,
  });

  const { data: expSummary, isLoading: loadingExp } = useQuery({
    queryKey: ['report', 'expenses', range.from, range.to],
    queryFn: () => expenseApi.summary({ from: range.from, to: range.to }).then((r) => r.data.data),
    staleTime: 60_000,
    enabled: tab === 'expenses' && customReady,
  });

  const { data: expChart = [] } = useQuery({
    queryKey: ['report', 'expenses-chart', range.from, range.to, granularity],
    queryFn: () => expenseApi.chart({ from: range.from, to: range.to, granularity }).then((r) => r.data.data),
    staleTime: 60_000,
    enabled: tab === 'expenses' && customReady,
  });

  const PERIODS: { key: Period; label: string }[] = [
    { key: 'today', label: t('report.today') },
    { key: 'yesterday', label: t('report.yesterday') },
    { key: 'thisWeek', label: t('report.thisWeek') },
    { key: 'thisMonth', label: t('report.thisMonth') },
    { key: 'custom', label: t('report.customRange') },
  ];

  const isLoading = tab === 'revenue' ? loadingRev : loadingExp;

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <View
        className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4"
        style={{ paddingTop: insets.top + 12, paddingBottom: 0 }}
      >
        <View className="flex-row items-center justify-between">
          <Text className="text-xl font-bold text-gray-900 dark:text-white">{t('report.title')}</Text>
        </View>
        <Text className="text-xs text-gray-500 dark:text-gray-400 mb-3 mt-0.5">{t('report.hint')}</Text>

        {/* Tab selector */}
        <View className="flex-row bg-gray-100 dark:bg-gray-700 rounded-xl p-1 mb-3">
          {([
            { key: 'revenue' as Tab, label: t('report.tabRevenue') },
            { key: 'expenses' as Tab, label: t('report.tabExpenses') },
          ]).map((tabItem) => (
            <TouchableOpacity
              key={tabItem.key}
              onPress={() => setTab(tabItem.key)}
              className={`flex-1 py-2 rounded-lg items-center ${tab === tabItem.key ? 'bg-white dark:bg-gray-800 shadow-sm' : ''}`}
            >
              <Text className={`text-sm font-semibold ${tab === tabItem.key ? 'text-indigo-600' : 'text-gray-500 dark:text-gray-400'}`}>
                {tabItem.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Period chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 12 }}>
          {PERIODS.map((p) => {
            const active = period === p.key;
            return (
              <TouchableOpacity
                key={p.key}
                onPress={() => setPeriod(p.key)}
                className={`px-4 py-1.5 rounded-full border ${active ? 'bg-indigo-600 border-indigo-600' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600'}`}
              >
                <Text className={`text-sm font-medium ${active ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Custom date range pickers */}
        {period === 'custom' && (
          <View className="flex-row gap-3 pb-3">
            <View className="flex-1 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 bg-gray-50 dark:bg-gray-700">
              <DatePickerInput
                value={customFrom}
                onChange={setCustomFrom}
                placeholder={t('common.datePlaceholder')}
                maximumDate={new Date()}
              />
            </View>
            <View className="flex-1 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 bg-gray-50 dark:bg-gray-700">
              <DatePickerInput
                value={customTo}
                onChange={setCustomTo}
                placeholder={t('common.datePlaceholder')}
                maximumDate={new Date()}
              />
            </View>
          </View>
        )}
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#4f46e5" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
          {tab === 'revenue' && revSummary && (
            <>
              {/* KPI grid */}
              <View className="flex-row gap-3">
                <View className="flex-1 bg-white dark:bg-gray-800 rounded-2xl p-4">
                  <Text className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('report.totalRevenue')}</Text>
                  <Text className="text-lg font-bold text-indigo-600">{formatVnd(revSummary.totalRevenue)}</Text>
                </View>
                <View className="flex-1 bg-white dark:bg-gray-800 rounded-2xl p-4">
                  <Text className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('report.orderCount')}</Text>
                  <Text className="text-lg font-bold text-gray-900 dark:text-white">{revSummary.orderCount}</Text>
                </View>
              </View>
              <View className="flex-row gap-3">
                <View className="flex-1 bg-white dark:bg-gray-800 rounded-2xl p-4">
                  <Text className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('report.avgOrderValue')}</Text>
                  <Text className="text-lg font-bold text-blue-600">{formatVnd(revSummary.avgOrderValue)}</Text>
                </View>
                <View className="flex-1 bg-white dark:bg-gray-800 rounded-2xl p-4">
                  <Text className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('report.completedCount')}</Text>
                  <Text className="text-lg font-bold text-gray-900 dark:text-white">{revSummary.completedCount}</Text>
                </View>
              </View>

              {revChart.length > 0 && (
                <View className="bg-white dark:bg-gray-800 rounded-2xl px-4 pt-4 pb-2">
                  <BarChart data={revChart} color="#4f46e5" granularity={granularity} />
                </View>
              )}

              {revSummary.orderCount === 0 && (
                <View className="bg-white dark:bg-gray-800 rounded-2xl p-8 items-center">
                  <Text className="text-base text-gray-400 text-center">{t('report.empty')}</Text>
                  <Text className="text-sm text-gray-400 mt-1 text-center">{t('report.emptyHint')}</Text>
                </View>
              )}
            </>
          )}

          {tab === 'expenses' && expSummary && (
            <>
              <View className="flex-row gap-3">
                <View className="flex-1 bg-white dark:bg-gray-800 rounded-2xl p-4">
                  <Text className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('report.totalExpenses')}</Text>
                  <Text className="text-lg font-bold text-red-500">{formatVnd(expSummary.total)}</Text>
                </View>
                <View className="flex-1 bg-white dark:bg-gray-800 rounded-2xl p-4">
                  <Text className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('report.netProfit')}</Text>
                  <Text className={`text-lg font-bold ${expSummary.netVsRevenue >= 0 ? 'text-indigo-600' : 'text-red-500'}`}>
                    {formatVnd(expSummary.netVsRevenue)}
                  </Text>
                </View>
              </View>
              <View className="flex-row gap-3">
                <View className="flex-1 bg-white dark:bg-gray-800 rounded-2xl p-4">
                  <Text className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('report.fixedExpenses')}</Text>
                  <Text className="text-lg font-bold text-blue-600">{formatVnd(expSummary.fixed)}</Text>
                </View>
                <View className="flex-1 bg-white dark:bg-gray-800 rounded-2xl p-4">
                  <Text className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('report.variableExpenses')}</Text>
                  <Text className="text-lg font-bold text-amber-600">{formatVnd(expSummary.variable)}</Text>
                </View>
              </View>

              {expChart.length > 0 && (
                <View className="bg-white dark:bg-gray-800 rounded-2xl px-4 pt-4 pb-2">
                  <BarChart data={expChart} color="#ef4444" granularity={granularity} />
                </View>
              )}

              {expSummary.total === 0 && (
                <View className="bg-white dark:bg-gray-800 rounded-2xl p-8 items-center">
                  <Text className="text-base text-gray-400 text-center">{t('report.empty')}</Text>
                  <Text className="text-sm text-gray-400 mt-1 text-center">{t('report.emptyHint')}</Text>
                </View>
              )}
            </>
          )}

          {((tab === 'revenue' && !revSummary) || (tab === 'expenses' && !expSummary)) && (
            <View className="bg-white dark:bg-gray-800 rounded-2xl p-8 items-center">
              <Text className="text-base text-gray-400 text-center">{t('report.empty')}</Text>
              <Text className="text-sm text-gray-400 mt-1 text-center">{t('report.emptyHint')}</Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}
