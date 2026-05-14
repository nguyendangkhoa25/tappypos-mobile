import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { appointmentApi, type AppointmentData } from '../../services/api';
import { Skeleton } from '../../components/Skeleton';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import type { MoreScreenProps } from '../../types/navigation';

type Props = MoreScreenProps<'AppointmentList'>;

// ── helpers ───────────────────────────────────────────────────────────────────

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatTime(timeStr: string): string {
  // 'HH:mm:ss' → 'HH:mm'
  return timeStr.slice(0, 5);
}

function formatDisplayDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

function groupByHour(items: AppointmentData[]): Array<{ hour: string; data: AppointmentData[] }> {
  const map = new Map<string, AppointmentData[]>();
  for (const item of items) {
    const hour = item.scheduledStartTime.slice(0, 2) + ':00';
    if (!map.has(hour)) map.set(hour, []);
    map.get(hour)!.push(item);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([hour, data]) => ({ hour, data }));
}

type StatusStyle = { bg: string; text: string; label: string };

function useStatusStyle(status: AppointmentData['status'], t: ReturnType<typeof useTranslation>['t']): StatusStyle {
  const map: Record<AppointmentData['status'], StatusStyle> = {
    PENDING:    { bg: 'bg-amber-100',   text: 'text-amber-700',   label: t('appt.statusPending') },
    CONFIRMED:  { bg: 'bg-indigo-100',  text: 'text-indigo-700',  label: t('appt.statusConfirmed') },
    CHECKED_IN: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: t('appt.statusCheckedIn') },
    CANCELLED:  { bg: 'bg-gray-100',    text: 'text-gray-500',    label: t('appt.statusCancelled') },
    NO_SHOW:    { bg: 'bg-rose-100',    text: 'text-rose-600',    label: t('appt.statusNoShow') },
  };
  return map[status] ?? map.PENDING;
}

// ── sub-components ────────────────────────────────────────────────────────────

function AppointmentCard({
  item,
  onPress,
}: {
  item: AppointmentData;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const s = useStatusStyle(item.status, t);
  const isDone = item.status === 'CANCELLED' || item.status === 'NO_SHOW' || item.status === 'CHECKED_IN';

  return (
    <TouchableOpacity
      onPress={onPress}
      className={`bg-white dark:bg-gray-800 rounded-2xl p-4 mb-3 mx-4 shadow-sm border border-gray-100 dark:border-gray-700 ${isDone ? 'opacity-60' : ''}`}
      activeOpacity={0.7}
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1 mr-2">
          <Text className="text-base font-bold text-gray-900 dark:text-white" numberOfLines={1}>
            {item.customerName}
          </Text>
          {item.customerPhone ? (
            <Text className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{item.customerPhone}</Text>
          ) : null}
        </View>
        <View className={`px-2.5 py-1 rounded-full ${s.bg}`}>
          <Text className={`text-xs font-semibold ${s.text}`}>{s.label}</Text>
        </View>
      </View>

      <View className="flex-row items-center gap-3 mt-2.5">
        <View className="flex-row items-center gap-1">
          <MaterialCommunityIcons name="clock-outline" size={13} color="#9ca3af" />
          <Text className="text-xs text-gray-500 dark:text-gray-400">
            {formatTime(item.scheduledStartTime)}
          </Text>
        </View>
        {item.durationMinutes > 0 && (
          <View className="flex-row items-center gap-1">
            <MaterialCommunityIcons name="timer-outline" size={13} color="#9ca3af" />
            <Text className="text-xs text-gray-500 dark:text-gray-400">{item.durationMinutes}p</Text>
          </View>
        )}
        {item.services.length > 0 && (
          <View className="flex-row items-center gap-1">
            <MaterialCommunityIcons name="scissors-cutting" size={13} color="#9ca3af" />
            <Text className="text-xs text-gray-500 dark:text-gray-400">{item.services.length} dịch vụ</Text>
          </View>
        )}
      </View>

      {item.note ? (
        <Text className="text-xs text-gray-400 dark:text-gray-500 mt-1.5 italic" numberOfLines={1}>
          {item.note}
        </Text>
      ) : null}
    </TouchableOpacity>
  );
}

function LoadingSkeleton() {
  return (
    <View className="px-4 mt-2">
      {[1, 2, 3, 4].map((k) => (
        <Skeleton key={k} width="100%" height={90} borderRadius={16} style={{ marginBottom: 12 }} />
      ))}
    </View>
  );
}

// ── main screen ───────────────────────────────────────────────────────────────

export function AppointmentListScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();

  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(today);
  const dateStr = toDateStr(selectedDate);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['appointments', dateStr],
    queryFn: async () => {
      const res = await appointmentApi.list(dateStr);
      return res.data.data;
    },
    staleTime: 30_000,
  });

  const items: AppointmentData[] = data?.content ?? [];
  const groups = groupByHour(items);

  const isToday = toDateStr(today) === dateStr;
  const isTomorrow = toDateStr(new Date(today.getTime() + 86400000)) === dateStr;

  function shiftDay(delta: number) {
    setSelectedDate((d) => {
      const next = new Date(d);
      next.setDate(next.getDate() + delta);
      return next;
    });
  }

  const handleRefresh = useCallback(() => { refetch(); }, [refetch]);

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
          <MaterialCommunityIcons name="arrow-left" size={22} color="#4f46e5" />
        </TouchableOpacity>
        <Text className="text-base font-bold text-gray-900 dark:text-white">{t('appt.title')}</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('AppointmentForm', {})}
          hitSlop={8}
        >
          <MaterialCommunityIcons name="plus" size={24} color="#4f46e5" />
        </TouchableOpacity>
      </View>

      {/* Date navigator */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
        <TouchableOpacity onPress={() => shiftDay(-1)} hitSlop={8} className="p-1">
          <MaterialCommunityIcons name="chevron-left" size={24} color="#6b7280" />
        </TouchableOpacity>
        <View className="items-center">
          <Text className="text-sm font-bold text-gray-900 dark:text-white">
            {isToday ? t('appt.today') : isTomorrow ? t('appt.tomorrow') : formatDisplayDate(dateStr)}
          </Text>
          {!isToday && !isTomorrow && (
            <TouchableOpacity onPress={() => setSelectedDate(today)}>
              <Text className="text-xs text-indigo-500 mt-0.5">{t('appt.today')}</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity onPress={() => shiftDay(1)} hitSlop={8} className="p-1">
          <MaterialCommunityIcons name="chevron-right" size={24} color="#6b7280" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      {isLoading ? (
        <LoadingSkeleton />
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : groups.length === 0 ? (
        <EmptyState
          icon="📅"
          title={t('appt.empty')}
          description={t('appt.emptyHint')}
        />
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(g) => g.hour}
          refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={handleRefresh} />}
          contentContainerStyle={{ paddingBottom: insets.bottom + 80, paddingTop: 8 }}
          renderItem={({ item: group }) => (
            <View>
              <View className="flex-row items-center px-4 mb-2 mt-3">
                <Text className="text-xs font-bold text-indigo-500 uppercase tracking-wide">{group.hour}</Text>
                <View className="flex-1 h-px bg-indigo-100 dark:bg-indigo-900/30 ml-2" />
              </View>
              {group.data.map((appt) => (
                <AppointmentCard
                  key={appt.id}
                  item={appt}
                  onPress={() => navigation.navigate('AppointmentDetail', { appointmentId: appt.id })}
                />
              ))}
            </View>
          )}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        onPress={() => navigation.navigate('AppointmentForm', {})}
        className="absolute bottom-6 right-6 w-14 h-14 rounded-full bg-indigo-600 items-center justify-center shadow-lg"
        style={{ bottom: insets.bottom + 16 }}
      >
        <MaterialCommunityIcons name="plus" size={28} color="white" />
      </TouchableOpacity>
    </View>
  );
}
