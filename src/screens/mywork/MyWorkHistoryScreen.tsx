import { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { orderApi, type WorkItemDTO } from '../../services/api';
import { formatVnd, formatDateTime } from '../../utils/format';
import { useFeatureCheck } from '../../hooks/useFeature';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { Skeleton } from '../../components/Skeleton';
import type { MyWorkScreenProps } from '../../types/navigation';

type FilterType = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';

function getTodayParts() {
  const now = new Date();
  return { day: now.getDate(), month: now.getMonth() + 1, year: now.getFullYear() };
}

function getCurrentWeekParts() {
  const now = new Date();
  return { day: now.getDate(), month: now.getMonth() + 1, year: now.getFullYear() };
}

function formatWeekLabel(day: number, month: number, year: number): string {
  const d = new Date(year, month - 1, day);
  const weekStart = new Date(d);
  const dow = d.getDay();
  weekStart.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const fmt = (dt: Date) => `${dt.getDate()}/${dt.getMonth() + 1}`;
  return `${fmt(weekStart)} – ${fmt(weekEnd)}/${weekEnd.getFullYear()}`;
}

function BarChart({ data }: { data: { label: string; count: number }[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <View className="flex-row items-end justify-around h-24 px-2">
      {data.map((d, i) => (
        <View key={i} className="items-center flex-1 mx-0.5">
          {d.count > 0 && (
            <Text className="text-xs text-gray-500 dark:text-gray-400 mb-1">{d.count}</Text>
          )}
          <View
            className="w-full rounded-t-sm bg-indigo-500"
            style={{ height: Math.max((d.count / max) * 72, d.count > 0 ? 4 : 0) }}
          />
          <Text className="text-xs text-gray-400 dark:text-gray-500 mt-1" numberOfLines={1}>
            {d.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function MyWorkHistoryScreen({ navigation }: MyWorkScreenProps<'MyWorkHistory'>) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const has = useFeatureCheck();
  const [filterType, setFilterType] = useState<FilterType>('DAY');
  const [keyword, setKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const today = getTodayParts();
  const [day, setDay] = useState(today.day);
  const [month, setMonth] = useState(today.month);
  const [year, setYear] = useState(today.year);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedKeyword(keyword), 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [keyword]);

  const filterParams = { filterType, day, month, year };

  const { data: completed, isLoading, isError, refetch } = useQuery({
    queryKey: ['workItems', 'completed', filterType, day, month, year, debouncedKeyword],
    queryFn: () => orderApi.completedWorkItems({ ...filterParams, keyword: debouncedKeyword || undefined }).then((r) => r.data.data.content),
    staleTime: 60_000,
  });

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['workItems', 'summary', filterType, day, month, year],
    queryFn: () => orderApi.workItemSummary(filterParams).then((r) => r.data.data),
    staleTime: 60_000,
  });

  const { data: trend } = useQuery({
    queryKey: ['workItems', 'trend', filterType, day, month, year],
    queryFn: () => orderApi.workItemTrend(filterParams).then((r) => r.data.data),
    staleTime: 60_000,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  function shiftDay(delta: number) {
    const d = new Date(year, month - 1, day + delta);
    setDay(d.getDate());
    setMonth(d.getMonth() + 1);
    setYear(d.getFullYear());
  }

  function shiftWeek(delta: number) {
    const d = new Date(year, month - 1, day + delta * 7);
    setDay(d.getDate());
    setMonth(d.getMonth() + 1);
    setYear(d.getFullYear());
  }

  const FILTERS: { key: FilterType; label: string }[] = [
    { key: 'DAY', label: t('myWork.filterDay') },
    { key: 'WEEK', label: t('myWork.filterWeek') },
    { key: 'MONTH', label: t('myWork.filterMonth') },
    { key: 'YEAR', label: t('myWork.filterYear') },
  ];

  const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const currentYear = new Date().getFullYear();
  const YEARS = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];

  function formatDuration(minutes: number): string {
    if (minutes < 60) return t('myWork.durationMin', { minutes });
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? t('myWork.durationHourMin', { hours: h, minutes: m }) : t('myWork.durationHour', { hours: h });
  }

  const chartData = (trend ?? []).map((d) => ({ label: d.label, count: d.count }));

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <View
        className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4"
        style={{ paddingTop: insets.top + 12, paddingBottom: 12 }}
      >
        <View className="flex-row items-center mb-4">
          <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
            <MaterialCommunityIcons name="arrow-left" size={24} color="#4f46e5" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-900 dark:text-white flex-1">
            {t('myWork.historyTitle')}
          </Text>
        </View>

        {/* Filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
          {FILTERS.map((f) => {
            const active = filterType === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                onPress={() => setFilterType(f.key)}
                className={`px-4 py-1.5 rounded-full border ${active ? 'bg-indigo-600 border-indigo-600' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600'}`}
              >
                <Text className={`text-sm font-medium ${active ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={completed ?? []}
        keyExtractor={(item) => String(item.itemId)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        ListHeaderComponent={
          <View>
            {/* Date navigation */}
            <View className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 py-3">
              {filterType === 'DAY' && (
                <View className="flex-row items-center justify-between">
                  <TouchableOpacity onPress={() => shiftDay(-1)} className="p-1">
                    <MaterialCommunityIcons name="chevron-left" size={22} color="#4f46e5" />
                  </TouchableOpacity>
                  <Text className="text-sm font-semibold text-gray-800 dark:text-white">
                    {day}/{month}/{year}
                  </Text>
                  <TouchableOpacity onPress={() => shiftDay(1)} className="p-1">
                    <MaterialCommunityIcons name="chevron-right" size={22} color="#4f46e5" />
                  </TouchableOpacity>
                </View>
              )}

              {filterType === 'WEEK' && (
                <View className="flex-row items-center justify-between">
                  <TouchableOpacity onPress={() => shiftWeek(-1)} className="p-1">
                    <MaterialCommunityIcons name="chevron-left" size={22} color="#4f46e5" />
                  </TouchableOpacity>
                  <Text className="text-sm font-semibold text-gray-800 dark:text-white">
                    {formatWeekLabel(day, month, year)}
                  </Text>
                  <TouchableOpacity onPress={() => shiftWeek(1)} className="p-1">
                    <MaterialCommunityIcons name="chevron-right" size={22} color="#4f46e5" />
                  </TouchableOpacity>
                </View>
              )}

              {filterType === 'MONTH' && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                  {MONTHS.map((m) => (
                    <TouchableOpacity
                      key={m}
                      onPress={() => setMonth(m)}
                      className={`px-3 py-1 rounded-full border ${month === m ? 'bg-indigo-600 border-indigo-600' : 'border-gray-200 dark:border-gray-600'}`}
                    >
                      <Text className={`text-xs font-medium ${month === m ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                        T{m}/{year}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  {YEARS.map((y) => (
                    <TouchableOpacity
                      key={y}
                      onPress={() => setYear(y)}
                      className={`px-3 py-1 rounded-full border ${year === y && filterType === 'MONTH' && month === month ? 'border-indigo-600' : 'border-gray-200 dark:border-gray-600'}`}
                    >
                      <Text className="text-xs text-gray-500 dark:text-gray-400">{y}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}

              {filterType === 'YEAR' && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                  {YEARS.map((y) => (
                    <TouchableOpacity
                      key={y}
                      onPress={() => setYear(y)}
                      className={`px-4 py-1.5 rounded-full border ${year === y ? 'bg-indigo-600 border-indigo-600' : 'border-gray-200 dark:border-gray-600'}`}
                    >
                      <Text className={`text-sm font-medium ${year === y ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                        {y}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>

            {/* Search */}
            <View className="mx-4 mt-3 mb-1 flex-row items-center bg-white dark:bg-gray-800 rounded-xl px-3 border border-gray-200 dark:border-gray-600">
              <MaterialCommunityIcons name="magnify" size={20} color="#9ca3af" />
              <TextInput
                value={keyword}
                onChangeText={setKeyword}
                placeholder={t('myWork.searchPlaceholder')}
                placeholderTextColor="#9ca3af"
                className="flex-1 py-2.5 px-2 text-gray-900 dark:text-white text-sm"
              />
              {keyword.length > 0 && (
                <TouchableOpacity onPress={() => setKeyword('')}>
                  <MaterialCommunityIcons name="close-circle" size={18} color="#9ca3af" />
                </TouchableOpacity>
              )}
            </View>

            {/* Summary card */}
            <View className="bg-white dark:bg-gray-800 rounded-2xl mx-4 mt-3 p-4 shadow-sm">
              {summaryLoading ? (
                <ActivityIndicator size="small" color="#4f46e5" />
              ) : has('COMMISSION') ? (
                <View>
                  <View className="flex-row mb-3">
                    <View className="flex-1 items-center">
                      <Text className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('myWork.statCount')}</Text>
                      <Text className="text-xl font-bold text-indigo-600">{summary?.completedCount ?? 0}</Text>
                    </View>
                    <View className="w-px bg-gray-100 dark:bg-gray-700" />
                    <View className="flex-1 items-center">
                      <Text className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('myWork.statRevenue')}</Text>
                      <Text className="text-base font-bold text-emerald-600">{formatVnd(summary?.totalRevenue)}</Text>
                    </View>
                  </View>
                  <View className="h-px bg-gray-100 dark:bg-gray-700 mb-3" />
                  <View className="flex-row">
                    <View className="flex-1 items-center">
                      <Text className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('myWork.statDuration')}</Text>
                      <Text className="text-base font-bold text-gray-800 dark:text-white">
                        {formatDuration(summary?.totalDurationMinutes ?? 0)}
                      </Text>
                    </View>
                    <View className="w-px bg-gray-100 dark:bg-gray-700" />
                    <View className="flex-1 items-center">
                      <Text className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('myWork.statCommission')}</Text>
                      <Text className="text-base font-bold text-amber-600">{formatVnd(summary?.totalCommission)}</Text>
                    </View>
                  </View>
                </View>
              ) : (
                <View className="flex-row">
                  <View className="flex-1 items-center">
                    <Text className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('myWork.statCount')}</Text>
                    <Text className="text-xl font-bold text-indigo-600">{summary?.completedCount ?? 0}</Text>
                  </View>
                  <View className="w-px bg-gray-100 dark:bg-gray-700" />
                  <View className="flex-1 items-center">
                    <Text className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('myWork.statRevenue')}</Text>
                    <Text className="text-base font-bold text-emerald-600">{formatVnd(summary?.totalRevenue)}</Text>
                  </View>
                  <View className="w-px bg-gray-100 dark:bg-gray-700" />
                  <View className="flex-1 items-center">
                    <Text className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('myWork.statDuration')}</Text>
                    <Text className="text-base font-bold text-gray-800 dark:text-white">
                      {formatDuration(summary?.totalDurationMinutes ?? 0)}
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* Bar chart */}
            {chartData.length > 0 && (
              <View className="bg-white dark:bg-gray-800 rounded-2xl mx-4 mt-3 p-4 shadow-sm">
                <BarChart data={chartData} />
              </View>
            )}

            <Text className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide px-4 mt-4 mb-2">
              {t('myWork.detail')}
            </Text>
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <View className="px-4 gap-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} height={80} borderRadius={16} />)}
            </View>
          ) : isError ? (
            <ErrorState onRetry={refetch} />
          ) : (
            <EmptyState icon="✅" title={t('myWork.emptyHistory')} />
          )
        }
        renderItem={({ item }: { item: WorkItemDTO }) => (
          <View className="bg-white dark:bg-gray-800 rounded-2xl mx-4 mb-3 p-4 shadow-sm">
            <View className="flex-row justify-between items-start">
              <View className="flex-1 mr-3">
                <Text className="text-base font-semibold text-gray-900 dark:text-white" numberOfLines={1}>
                  {item.productName}
                </Text>
                <Text className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  {item.orderNumber} · {item.customerName ?? t('pos.walkIn')}
                </Text>
              </View>
              <View className="items-end gap-0.5">
                <Text className="text-sm font-bold text-emerald-600">{formatVnd(item.amount)}</Text>
                {has('COMMISSION') && item.commissionAmount != null && item.commissionAmount > 0 && (
                  <View className="flex-row items-center gap-1">
                    <Text className="text-xs text-amber-500 font-semibold">
                      +{formatVnd(item.commissionAmount)}
                    </Text>
                    {item.commissionRate != null && item.commissionRate > 0 && (
                      <Text className="text-[10px] text-gray-400">({item.commissionRate}%)</Text>
                    )}
                  </View>
                )}
              </View>
            </View>
            {item.completedAt && (
              <Text className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                {t('myWork.completedAt', { time: formatDateTime(item.completedAt) })}
              </Text>
            )}
          </View>
        )}
      />
    </View>
  );
}
