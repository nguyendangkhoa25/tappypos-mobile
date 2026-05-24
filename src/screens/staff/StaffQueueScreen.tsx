import { useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { orderApi, employeeApi, type WorkItemDTO, type EmployeeData } from '../../services/api';
import { useTypography } from '../../hooks/useTypography';
import { Skeleton } from '../../components/Skeleton';
import { ErrorState } from '../../components/ErrorState';
import type { MoreScreenProps } from '../../types/navigation';

type Props = MoreScreenProps<'QueueView'>;

// ── helpers ───────────────────────────────────────────────────────────────────

function fmtDuration(min: number): string {
  if (min <= 0) return '';
  if (min < 60) return `${min}p`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h${m}p` : `${h}h`;
}

function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function avatarColor(name: string): string {
  const COLORS = ['#4f46e5', '#0891b2', '#059669', '#d97706', '#7c3aed', '#dc2626', '#2563eb', '#16a34a'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
}

// ── sub-components ────────────────────────────────────────────────────────────

function StatChip({
  icon,
  label,
  value,
  color,
}: {
  icon: string;
  label: string;
  value: number;
  color: string;
}) {
  const typo = useTypography();
  return (
    <View className="flex-1 bg-white dark:bg-gray-800 rounded-2xl py-3 px-2 items-center border border-gray-100 dark:border-gray-700">
      <MaterialCommunityIcons name={icon as any} size={20} color={color} />
      <Text className={`${typo.section} text-gray-900 dark:text-white mt-1`}>{value}</Text>
      <Text className={`${typo.caption} text-gray-400 text-center`} numberOfLines={1}>{label}</Text>
    </View>
  );
}

function WorkItemCard({ item, compact = false }: { item: WorkItemDTO; compact?: boolean }) {
  const { t } = useTranslation();
  const typo = useTypography();
  const isWorking = item.status === 'IN_PROGRESS';
  const accentColor = isWorking ? '#10b981' : '#f59e0b';

  if (compact) {
    return (
      <View
        className="rounded-xl px-3 py-2 border"
        style={{ borderColor: accentColor + '40', backgroundColor: accentColor + '10' }}
      >
        <Text className={`${typo.captionBold} text-gray-800 dark:text-gray-100`} numberOfLines={1}>
          {item.productName}
        </Text>
        {item.customerName ? (
          <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 mt-0.5`} numberOfLines={1}>
            {item.customerName}
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <View
      className="rounded-2xl p-3 border mt-3"
      style={{ borderColor: accentColor + '50', backgroundColor: accentColor + '10' }}
    >
      <View className="flex-row items-center justify-between mb-1.5">
        <View className="flex-row items-center gap-1.5 flex-1 mr-2">
          <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: accentColor }} />
          <Text style={{ color: accentColor }} className={`${typo.captionBold} uppercase tracking-wide`}>
            {isWorking ? t('queue.statusWorking') : t('queue.statusWaiting')}
          </Text>
        </View>
        {item.durationMinutes > 0 && (
          <View className="flex-row items-center gap-1">
            <MaterialCommunityIcons name="clock-outline" size={12} color="#9ca3af" />
            <Text className={`${typo.caption} text-gray-400`}>{fmtDuration(item.durationMinutes)}</Text>
          </View>
        )}
      </View>

      <Text className={`${typo.labelBold} text-gray-900 dark:text-white`} numberOfLines={1}>
        {item.productName}
      </Text>

      <View className="flex-row items-center justify-between mt-1.5">
        <View className="flex-row items-center gap-1 flex-1 mr-2">
          <MaterialCommunityIcons name="account-outline" size={13} color="#9ca3af" />
          <Text className={`${typo.caption} text-gray-500 dark:text-gray-400`} numberOfLines={1}>
            {item.customerName ?? '—'}
          </Text>
        </View>
        <Text className={`${typo.caption} text-gray-400`}>#{item.orderNumber}</Text>
      </View>

      <Text className={`${typo.caption} text-gray-400 mt-1`}>
        {fmtTime(item.orderCreatedAt)}
      </Text>
    </View>
  );
}

function EmployeeCard({ employee, inProgress, pending, waitMin }: {
  employee: EmployeeData;
  inProgress: WorkItemDTO[];
  pending: WorkItemDTO[];
  waitMin: number;
}) {
  const { t } = useTranslation();
  const typo = useTypography();
  const isFree = inProgress.length === 0 && pending.length === 0;
  const isWorking = inProgress.length > 0;
  const color = avatarColor(employee.fullName);
  const initials = employee.fullName.split(' ').slice(-1)[0]?.charAt(0).toUpperCase() ?? '?';

  const statusColor = isWorking ? '#10b981' : isFree ? '#9ca3af' : '#f59e0b';
  const statusLabel = isWorking
    ? t('queue.statusWorking')
    : isFree
    ? t('queue.statusFree')
    : t('queue.statusWaiting');

  return (
    <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 mb-3">
      {/* Employee header */}
      <View className="flex-row items-center">
        <View
          style={{ backgroundColor: color + '20', width: 44, height: 44, borderRadius: 22 }}
          className="items-center justify-center mr-3"
        >
          <Text className={`${typo.section} font-bold`} style={{ color }}>{initials}</Text>
        </View>

        <View className="flex-1">
          <Text className={`${typo.labelBold} text-gray-900 dark:text-white`} numberOfLines={1}>
            {employee.fullName}
          </Text>
          {employee.position ? (
            <Text className={`${typo.caption} text-gray-400`}>{employee.position}</Text>
          ) : null}
        </View>

        <View
          className="rounded-full px-3 py-1 flex-row items-center gap-1"
          style={{ backgroundColor: statusColor + '15' }}
        >
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: statusColor }} />
          <Text style={{ color: statusColor }} className={`${typo.captionBold}`}>
            {statusLabel}
          </Text>
        </View>
      </View>

      {/* Current work — IN_PROGRESS items */}
      {inProgress.map((item) => (
        <WorkItemCard key={item.itemId} item={item} />
      ))}

      {/* Queue — PENDING items shown as compact chips */}
      {pending.length > 0 && (
        <View className="mt-3">
          <Text className={`${typo.captionBold} text-gray-400 mb-1.5`}>{t('queue.labelNext')}</Text>
          <View className="flex-row flex-wrap gap-2">
            {pending.map((item) => (
              <View key={item.itemId} className="flex-1" style={{ minWidth: '45%', maxWidth: '100%' }}>
                <WorkItemCard item={item} compact />
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Free state */}
      {isFree && (
        <View className="flex-row items-center gap-2 mt-3 pt-3 border-t border-gray-50 dark:border-gray-700">
          <MaterialCommunityIcons name="check-circle-outline" size={16} color="#9ca3af" />
          <Text className={`${typo.caption} text-gray-400`}>{t('queue.noWork')}</Text>
        </View>
      )}

      {/* Estimated completion time */}
      {!isFree && waitMin > 0 && (
        <View className="flex-row items-center gap-1.5 mt-2 pt-2.5 border-t border-gray-50 dark:border-gray-700">
          <MaterialCommunityIcons name="timer-sand" size={13} color="#9ca3af" />
          <Text className={`${typo.caption} text-gray-400`}>{t('queue.doneIn', { min: waitMin })}</Text>
        </View>
      )}
    </View>
  );
}

function UnassignedSection({ items }: { items: WorkItemDTO[] }) {
  const { t } = useTranslation();
  const typo = useTypography();
  if (items.length === 0) return null;

  return (
    <View className="mb-4">
      <View className="flex-row items-center gap-2 mb-2">
        <View className="w-2 h-2 rounded-full bg-rose-400" />
        <Text className={`${typo.captionBold} text-gray-500 dark:text-gray-400 uppercase tracking-wide`}>
          {t('queue.sectionUnassigned')} · {items.length}
        </Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-1">
        {items.map((item) => (
          <View key={item.itemId} style={{ width: 180 }} className="mx-1">
            <View className="bg-white dark:bg-gray-800 rounded-2xl p-3 border border-rose-100 dark:border-rose-900/40">
              <Text className={`${typo.labelBold} text-gray-900 dark:text-white`} numberOfLines={1}>
                {item.productName}
              </Text>
              <View className="flex-row items-center gap-1 mt-1">
                <MaterialCommunityIcons name="account-outline" size={13} color="#9ca3af" />
                <Text className={`${typo.caption} text-gray-400`} numberOfLines={1}>
                  {item.customerName ?? '—'}
                </Text>
              </View>
              <View className="flex-row items-center justify-between mt-1.5">
                <Text className={`${typo.caption} text-gray-400`}>#{item.orderNumber}</Text>
                {item.durationMinutes > 0 && (
                  <View className="flex-row items-center gap-1">
                    <MaterialCommunityIcons name="clock-outline" size={12} color="#9ca3af" />
                    <Text className={`${typo.caption} text-gray-400`}>{fmtDuration(item.durationMinutes)}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

// ── concurrent sessions section ───────────────────────────────────────────────

type ConcurrentSession = {
  orderId: number;
  orderNumber: string;
  customerName: string | null;
  items: WorkItemDTO[];
  maxDuration: number;
};

function ConcurrentSessionsSection({ sessions }: { sessions: ConcurrentSession[] }) {
  const { t } = useTranslation();
  const typo = useTypography();
  if (sessions.length === 0) return null;

  return (
    <View className="mb-4">
      {/* Section header */}
      <View className="flex-row items-center gap-2 mb-2.5">
        <View className="w-2 h-2 rounded-full bg-teal-400" />
        <Text className={`${typo.captionBold} text-gray-500 dark:text-gray-400 uppercase tracking-wide flex-1`}>
          {t('queue.sectionConcurrent')} · {sessions.length}
        </Text>
      </View>

      {sessions.map((session) => {
        const techCount = new Set(session.items.map((i) => i.assignedEmployeeId).filter(Boolean)).size;
        const allDone = session.items.every((i) => i.status === 'COMPLETED');
        const anyWorking = session.items.some((i) => i.status === 'IN_PROGRESS');

        return (
          <View
            key={session.orderId}
            className="bg-white dark:bg-gray-800 rounded-2xl p-4 mb-3 border border-teal-100 dark:border-teal-900/40"
          >
            {/* Session header */}
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-1 mr-2">
                <View className="flex-row items-center gap-2">
                  <MaterialCommunityIcons name="account-multiple-outline" size={15} color="#0d9488" />
                  <Text className={`${typo.labelBold} text-gray-900 dark:text-white`} numberOfLines={1}>
                    {session.customerName ?? '—'}
                  </Text>
                </View>
                <Text className={`${typo.caption} text-gray-400 mt-0.5 ml-5`}>
                  #{session.orderNumber}
                  {session.maxDuration > 0 ? `  ·  ${fmtDuration(session.maxDuration)}` : ''}
                </Text>
              </View>

              {/* Tech count badge */}
              <View className="bg-teal-50 dark:bg-teal-900/30 rounded-full px-2.5 py-1 flex-row items-center gap-1">
                <MaterialCommunityIcons name="account-multiple-outline" size={12} color="#0d9488" />
                <Text className={`${typo.captionBold} text-teal-700 dark:text-teal-400`}>
                  {t('queue.splitBadge', { count: techCount })}
                </Text>
              </View>
            </View>

            {/* Service rows */}
            <View className="gap-1.5">
              {session.items.map((item, idx) => {
                const isWorking = item.status === 'IN_PROGRESS';
                const dotColor = isWorking ? '#10b981' : '#f59e0b';
                const empColor = avatarColor(item.assignedEmployeeName ?? '');
                const initials = (item.assignedEmployeeName ?? '?').split(' ').slice(-1)[0]?.charAt(0).toUpperCase() ?? '?';

                return (
                  <View
                    key={item.itemId}
                    className="flex-row items-center gap-2.5 py-1.5"
                    style={idx < session.items.length - 1 ? { borderBottomWidth: 1, borderBottomColor: '#f3f4f6' } : {}}
                  >
                    {/* Status dot */}
                    <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: dotColor, marginTop: 1 }} />

                    {/* Service name */}
                    <Text className={`flex-1 ${typo.caption} text-gray-800 dark:text-gray-200 font-medium`} numberOfLines={1}>
                      {item.productName}
                    </Text>

                    {/* Technician avatar + name */}
                    {item.assignedEmployeeName ? (
                      <View className="flex-row items-center gap-1.5">
                        <View
                          style={{ backgroundColor: empColor + '25', width: 22, height: 22, borderRadius: 11 }}
                          className="items-center justify-center"
                        >
                          <Text className={`${typo.caption} font-bold`} style={{ color: empColor }}>{initials}</Text>
                        </View>
                        <Text className={`${typo.caption} text-gray-500 dark:text-gray-400`} numberOfLines={1}>
                          {item.assignedEmployeeName}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>

            {/* Overall status footer */}
            <View className="flex-row items-center gap-1.5 mt-2.5 pt-2 border-t border-gray-50 dark:border-gray-700">
              <MaterialCommunityIcons
                name={anyWorking ? 'play-circle-outline' : 'clock-outline'}
                size={13}
                color={anyWorking ? '#10b981' : '#f59e0b'}
              />
              <Text className={`${typo.captionBold}`} style={{ color: anyWorking ? '#10b981' : '#f59e0b' }}>
                {anyWorking ? t('queue.statusWorking') : t('queue.statusWaiting')}
              </Text>
              <Text className={`${typo.caption} text-gray-400 ml-auto`}>{t('queue.concurrentHint')}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

function LoadingSkeleton() {
  return (
    <View className="px-4 pt-4 gap-3">
      {/* Stats row */}
      <View className="flex-row gap-2 mb-1">
        {[0, 1, 2, 3].map((i) => (
          <View key={i} className="flex-1 bg-white dark:bg-gray-800 rounded-2xl py-3 px-2 items-center border border-gray-100 dark:border-gray-700">
            <Skeleton width={20} height={20} borderRadius={10} />
            <Skeleton width={24} height={22} style={{ marginTop: 6 }} />
            <Skeleton width="80%" height={11} style={{ marginTop: 4 }} />
          </View>
        ))}
      </View>
      {/* Employee card skeletons */}
      {[0, 1, 2].map((i) => (
        <View key={i} className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700">
          <View className="flex-row items-center">
            <Skeleton width={44} height={44} borderRadius={22} style={{ marginRight: 12 }} />
            <View className="flex-1 gap-2">
              <Skeleton width="50%" height={15} />
              <Skeleton width="30%" height={12} />
            </View>
            <Skeleton width={64} height={24} borderRadius={12} />
          </View>
          {i === 0 && (
            <Skeleton height={80} borderRadius={12} style={{ marginTop: 12 }} />
          )}
        </View>
      ))}
    </View>
  );
}

// ── main screen ───────────────────────────────────────────────────────────────

export function StaffQueueScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const typo = useTypography();
  const { top, bottom } = useSafeAreaInsets();

  const { data, isLoading, isError, isRefetching, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['adminQueue'],
    queryFn: async () => {
      const [assignedRes, availableRes, employeesRes] = await Promise.all([
        orderApi.pendingWorkItems({ size: 200 }),
        orderApi.availableWorkItems({ size: 100 }),
        employeeApi.listActive(),
      ]);
      return {
        assigned: assignedRes.data.data.content,
        available: availableRes.data.data.content,
        employees: employeesRes.data.data,
      };
    },
    staleTime: 0,
    refetchInterval: 30_000,
  });

  const { employeeRows, available, stats, minWait, hasFree, concurrentSessions } = useMemo(() => {
    if (!data) return { employeeRows: [], available: [], stats: { working: 0, waiting: 0, free: 0, unassigned: 0 }, minWait: 0, hasFree: false, concurrentSessions: [] };

    // Guard against null/undefined from API (e.g. empty queue or no active employees)
    const assigned = data.assigned ?? [];
    const employees = data.employees ?? [];
    const avail = data.available ?? [];

    // Group assigned items by employee name
    const byName = new Map<string, { inProgress: WorkItemDTO[]; pending: WorkItemDTO[] }>();
    for (const item of assigned) {
      const key = item.assignedEmployeeName ?? '';
      if (!key) continue;
      if (!byName.has(key)) byName.set(key, { inProgress: [], pending: [] });
      const bucket = byName.get(key)!;
      if (item.status === 'IN_PROGRESS') bucket.inProgress.push(item);
      else bucket.pending.push(item);
    }

    const rows = employees.map((emp) => {
      const bucket = byName.get(emp.fullName) ?? { inProgress: [], pending: [] };
      const waitMin = [...bucket.inProgress, ...bucket.pending]
        .reduce((sum, item) => sum + (item.durationMinutes || 0), 0);
      return { employee: emp, ...bucket, waitMin };
    });

    // Sort: IN_PROGRESS first, then PENDING, then free
    rows.sort((a, b) => {
      if (a.inProgress.length !== b.inProgress.length) return b.inProgress.length - a.inProgress.length;
      if (a.pending.length !== b.pending.length) return b.pending.length - a.pending.length;
      return a.employee.fullName.localeCompare(b.employee.fullName);
    });

    const working = rows.filter((r) => r.inProgress.length > 0).length;
    const waiting = rows.filter((r) => r.inProgress.length === 0 && r.pending.length > 0).length;
    const free = rows.filter((r) => r.inProgress.length === 0 && r.pending.length === 0).length;

    const hasFree = free > 0;
    const busyWaits = rows.filter((r) => r.waitMin > 0).map((r) => r.waitMin);
    const minWait = hasFree ? 0 : busyWaits.length > 0 ? Math.min(...busyWaits) : 0;

    // Build concurrent sessions: orders with 2+ distinct assigned technicians
    const byOrder = new Map<number, WorkItemDTO[]>();
    for (const item of assigned) {
      if (!item.assignedEmployeeId) continue;
      if (!byOrder.has(item.orderId)) byOrder.set(item.orderId, []);
      byOrder.get(item.orderId)!.push(item);
    }
    const concurrentSessions: ConcurrentSession[] = Array.from(byOrder.values())
      .filter((items) => new Set(items.map((i) => i.assignedEmployeeId)).size >= 2)
      .map((items) => ({
        orderId: items[0].orderId,
        orderNumber: items[0].orderNumber,
        customerName: items[0].customerName,
        items,
        maxDuration: Math.max(...items.map((i) => i.durationMinutes || 0)),
      }))
      .sort((a, b) => a.orderId - b.orderId);

    return {
      employeeRows: rows,
      available: avail,
      stats: { working, waiting, free, unassigned: avail.length },
      minWait,
      hasFree,
      concurrentSessions,
    };
  }, [data]);

  const updatedTime = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    : null;

  const ListHeader = (
    <View>
      {/* Stats */}
      <View className="flex-row gap-2 mb-4">
        <StatChip icon="play-circle-outline" label={t('queue.statWorking')} value={stats.working} color="#10b981" />
        <StatChip icon="clock-outline" label={t('queue.statWaiting')} value={stats.waiting} color="#f59e0b" />
        <StatChip icon="check-circle-outline" label={t('queue.statFree')} value={stats.free} color="#9ca3af" />
        <StatChip icon="account-question-outline" label={t('queue.statUnassigned')} value={stats.unassigned} color="#ef4444" />
      </View>

      {/* Walk-in wait estimate */}
      {employeeRows.length > 0 && (
        <View
          className={`flex-row items-center gap-2 rounded-xl px-4 py-2.5 mb-4 ${
            hasFree
              ? 'bg-emerald-50 dark:bg-emerald-900/20'
              : 'bg-amber-50 dark:bg-amber-900/20'
          }`}
        >
          <MaterialCommunityIcons
            name={hasFree ? 'check-circle-outline' : 'clock-fast'}
            size={16}
            color={hasFree ? '#10b981' : '#f59e0b'}
          />
          <Text
            className={`${typo.label} flex-1 ${
              hasFree
                ? 'text-emerald-700 dark:text-emerald-400'
                : 'text-amber-700 dark:text-amber-400'
            }`}
          >
            {hasFree
              ? t('queue.waitBannerFree')
              : t('queue.waitBannerEstimate', { min: minWait })}
          </Text>
        </View>
      )}

      {/* Concurrent multi-technician sessions */}
      <ConcurrentSessionsSection sessions={concurrentSessions} />

      {/* Unassigned items */}
      <UnassignedSection items={available} />

      {/* Section label */}
      {employeeRows.length > 0 && (
        <Text className={`${typo.captionBold} text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2 px-1`}>
          {t('queue.sectionEmployees')} · {employeeRows.length}
        </Text>
      )}
    </View>
  );

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <View
        className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4"
        style={{ paddingTop: top + 12, paddingBottom: 12 }}
      >
        <View>
          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              className="mr-2"
            >
              <MaterialCommunityIcons name="chevron-left" size={26} color="#4f46e5" />
            </TouchableOpacity>
            <Text className={`${typo.section} text-gray-900 dark:text-white flex-1`}>
              {t('queue.title')}
            </Text>
            <TouchableOpacity
              onPress={() => refetch()}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialCommunityIcons
                name="refresh"
                size={22}
                color={isRefetching ? '#a5b4fc' : '#4f46e5'}
              />
            </TouchableOpacity>
          </View>
          {updatedTime ? (
            <Text className={`${typo.caption} text-gray-400 mt-0.5`}>
              {t('queue.updatedAt', { time: updatedTime })}
            </Text>
          ) : (
            <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 mt-0.5`}>
              {t('queue.hint')}
            </Text>
          )}
        </View>
      </View>

      {isError ? (
        <ErrorState onRetry={refetch} />
      ) : isLoading ? (
        <LoadingSkeleton />
      ) : (
        <FlatList
          data={employeeRows}
          keyExtractor={(item) => item.employee.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 4, paddingBottom: bottom + 24 }}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#059669" />
          }
          ListHeaderComponent={ListHeader}
          renderItem={({ item }) => (
            <EmployeeCard
              employee={item.employee}
              inProgress={item.inProgress}
              pending={item.pending}
              waitMin={item.waitMin}
            />
          )}
          ListEmptyComponent={
            !isLoading ? (
              <View className="items-center py-16">
                <MaterialCommunityIcons name="account-clock-outline" size={52} color="#d1d5db" />
                <Text className={`${typo.body} text-gray-400 mt-3 text-center`}>
                  {t('queue.empty')}
                </Text>
                <Text className={`${typo.caption} text-gray-400 mt-1 text-center px-8`}>
                  {t('queue.emptyHint')}
                </Text>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}
