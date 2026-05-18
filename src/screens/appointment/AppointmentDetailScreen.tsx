import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { appointmentApi, type AppointmentData, type CheckInPayload } from '../../services/api';
import { useTypography } from '../../hooks/useTypography';
import { formatVnd } from '../../utils/format';
import { Skeleton } from '../../components/Skeleton';
import { useAlertStore } from '../../store/alertStore';
import type { MoreScreenProps } from '../../types/navigation';

type Props = MoreScreenProps<'AppointmentDetail'>;

// ── helpers ───────────────────────────────────────────────────────────────────

function formatTime(timeStr: string) { return timeStr.slice(0, 5); }
function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

type StatusConfig = { bg: string; text: string; dot: string; label: string };
function statusConfig(status: AppointmentData['status'], t: ReturnType<typeof useTranslation>['t']): StatusConfig {
  const map: Record<AppointmentData['status'], StatusConfig> = {
    PENDING:    { bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-400',   label: t('appt.statusPending') },
    CONFIRMED:  { bg: 'bg-indigo-50',  text: 'text-indigo-700',  dot: 'bg-indigo-500',  label: t('appt.statusConfirmed') },
    CHECKED_IN: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', label: t('appt.statusCheckedIn') },
    CANCELLED:  { bg: 'bg-gray-50',    text: 'text-gray-500',    dot: 'bg-gray-400',    label: t('appt.statusCancelled') },
    NO_SHOW:    { bg: 'bg-rose-50',    text: 'text-rose-600',    dot: 'bg-rose-500',    label: t('appt.statusNoShow') },
  };
  return map[status] ?? map.PENDING;
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  const typo = useTypography();
  return (
    <View className="flex-row items-start gap-3 py-2.5 border-b border-gray-50 dark:border-gray-700 last:border-0">
      <MaterialCommunityIcons name={icon as any} size={16} color="#9ca3af" style={{ marginTop: 1 }} />
      <View className="flex-1">
        <Text className={`${typo.captionBold} text-gray-400 uppercase tracking-wide`}>{label}</Text>
        <Text className={`${typo.caption} text-gray-900 dark:text-white mt-0.5`}>{value}</Text>
      </View>
    </View>
  );
}

// ── main screen ───────────────────────────────────────────────────────────────

export function AppointmentDetailScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const typo = useTypography();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const showAlert = useAlertStore((s) => s.show);
  const { appointmentId } = route.params;

  const { data: appt, isLoading, isError, refetch } = useQuery({
    queryKey: ['appointment', appointmentId],
    queryFn: async () => {
      const res = await appointmentApi.getById(appointmentId);
      return res.data.data;
    },
    staleTime: 30_000,
  });

  function invalidate() {
    qc.invalidateQueries({ queryKey: ['appointments'] });
    qc.invalidateQueries({ queryKey: ['appointment', appointmentId] });
  }

  const confirmMutation = useMutation({
    mutationFn: () => appointmentApi.confirm(appointmentId),
    onSuccess: () => { invalidate(); },
    onError: (e: any) => showAlert(t('common.error'), e?.response?.data?.error ?? t('appt.errorConfirm')),
  });

  const checkInMutation = useMutation({
    mutationFn: () => appointmentApi.checkIn(appointmentId),
    onSuccess: (res) => {
      const payload: CheckInPayload = res.data.data;
      invalidate();
      showAlert(t('appt.checkInSuccess'), '', [
        {
          label: t('appt.confirmAction'),
          onPress: () => {
            navigation.getParent()?.navigate('Sell', {
              screen: 'POSMain',
              params: { checkInPayload: payload },
            } as any);
          },
        },
      ]);
    },
    onError: (e: any) => showAlert(t('common.error'), e?.response?.data?.error ?? t('appt.errorCheckIn')),
  });

  const cancelMutation = useMutation({
    mutationFn: () => appointmentApi.cancel(appointmentId),
    onSuccess: () => { invalidate(); showAlert(t('appt.cancelSuccess'), ''); },
    onError: (e: any) => showAlert(t('common.error'), e?.response?.data?.error ?? t('appt.errorCancel')),
  });

  const noShowMutation = useMutation({
    mutationFn: () => appointmentApi.noShow(appointmentId),
    onSuccess: () => { invalidate(); showAlert(t('appt.noShowSuccess'), ''); },
    onError: (e: any) => showAlert(t('common.error'), e?.response?.data?.error ?? t('appt.errorNoShow')),
  });

  const deleteMutation = useMutation({
    mutationFn: () => appointmentApi.delete(appointmentId),
    onSuccess: () => { invalidate(); navigation.goBack(); },
    onError: (e: any) => showAlert(t('common.error'), e?.response?.data?.error ?? t('appt.errorDelete')),
  });

  function confirmCancel() {
    showAlert(t('appt.confirmCancel'), '', [
      { label: t('appt.cancelAction'), style: 'cancel' },
      { label: t('appt.confirmAction'), style: 'destructive', onPress: () => cancelMutation.mutate() },
    ]);
  }

  function confirmNoShow() {
    showAlert(t('appt.confirmNoShow'), '', [
      { label: t('appt.cancelAction'), style: 'cancel' },
      { label: t('appt.confirmAction'), style: 'destructive', onPress: () => noShowMutation.mutate() },
    ]);
  }

  function confirmDelete() {
    showAlert(t('appt.confirmDelete'), '', [
      { label: t('appt.cancelAction'), style: 'cancel' },
      { label: t('appt.confirmAction'), style: 'destructive', onPress: () => deleteMutation.mutate() },
    ]);
  }

  const isMutating =
    confirmMutation.isPending || checkInMutation.isPending ||
    cancelMutation.isPending || noShowMutation.isPending || deleteMutation.isPending;

  if (isLoading) {
    return (
      <View className="flex-1 bg-gray-50 dark:bg-gray-900">
        <View className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4" style={{ paddingTop: insets.top + 12, paddingBottom: 12 }}>
          <View className="flex-row items-center mb-0.5">
            <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} className="mr-3">
              <MaterialCommunityIcons name="chevron-left" size={26} color="#4f46e5" />
            </TouchableOpacity>
            <Text className={`${typo.heading} text-gray-900 dark:text-white flex-1`}>{t('appt.detail')}</Text>
          </View>
          <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 mb-0 mt-0.5`}>{t('appt.detailHint')}</Text>
        </View>
        <View className="px-4 mt-4 gap-3">
          <Skeleton width="100%" height={100} borderRadius={16} />
          <Skeleton width="100%" height={140} borderRadius={16} />
          <Skeleton width="100%" height={100} borderRadius={16} />
        </View>
      </View>
    );
  }

  if (isError || !appt) {
    return (
      <View className="flex-1 bg-gray-50 dark:bg-gray-900 items-center justify-center" style={{ paddingTop: insets.top }}>
        <Text className={`${typo.caption} text-gray-500`}>{t('common.error')}</Text>
      </View>
    );
  }

  const sc = statusConfig(appt.status, t);
  const isActive = appt.status === 'PENDING' || appt.status === 'CONFIRMED';
  const canCheckIn = appt.status === 'PENDING' || appt.status === 'CONFIRMED';
  const canEdit = isActive;

  const totalPrice = appt.services.reduce((s, svc) => s + (svc.unitPrice ?? 0), 0);

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <View className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4" style={{ paddingTop: insets.top + 12, paddingBottom: 12 }}>
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} className="mr-3">
            <MaterialCommunityIcons name="chevron-left" size={26} color="#4f46e5" />
          </TouchableOpacity>
          <Text className={`${typo.heading} text-gray-900 dark:text-white flex-1`}>{appt.appointmentNumber}</Text>
          {canEdit ? (
            <TouchableOpacity
              onPress={() => navigation.navigate('AppointmentForm', { appointmentId: appt.id })}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialCommunityIcons name="pencil-outline" size={22} color="#4f46e5" />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 26 }} />
          )}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 120, paddingTop: 16, gap: 12, paddingHorizontal: 16 }}
      >
        {/* Status badge */}
        <View className={`flex-row items-center gap-2 rounded-2xl px-4 py-3 ${sc.bg}`}>
          <View className={`w-2.5 h-2.5 rounded-full ${sc.dot}`} />
          <Text className={`${typo.labelBold} ${sc.text}`}>{sc.label}</Text>
        </View>

        {/* Customer info */}
        <View className="bg-white dark:bg-gray-800 rounded-2xl px-4 py-1 border border-gray-100 dark:border-gray-700">
          <InfoRow icon="account-outline" label={t('appt.customerName')} value={appt.customerName} />
          {appt.customerPhone ? (
            <InfoRow icon="phone-outline" label={t('appt.customerPhone')} value={appt.customerPhone} />
          ) : null}
        </View>

        {/* Date & time */}
        <View className="bg-white dark:bg-gray-800 rounded-2xl px-4 py-1 border border-gray-100 dark:border-gray-700">
          <InfoRow icon="calendar-outline" label={t('appt.date')} value={formatDate(appt.scheduledDate)} />
          <InfoRow icon="clock-outline" label={t('appt.time')} value={formatTime(appt.scheduledStartTime)} />
          {appt.durationMinutes > 0 ? (
            <InfoRow icon="timer-outline" label={t('appt.duration')} value={`${appt.durationMinutes} phút`} />
          ) : null}
        </View>

        {/* Services */}
        {appt.services.length > 0 && (
          <View className="bg-white dark:bg-gray-800 rounded-2xl px-4 py-3 border border-gray-100 dark:border-gray-700">
            <Text className={`${typo.captionBold} text-gray-400 uppercase tracking-wide mb-2`}>{t('appt.servicesSection')}</Text>
            {appt.services.map((svc, idx) => (
              <View
                key={svc.id ?? idx}
                className="flex-row items-center justify-between py-2 border-b border-gray-50 dark:border-gray-700 last:border-0"
              >
                <View className="flex-1 mr-2">
                  <Text className={`${typo.label} text-gray-900 dark:text-white`}>{svc.productName}</Text>
                  {svc.assignedEmployeeName ? (
                    <Text className={`${typo.caption} text-gray-400 mt-0.5`}>{svc.assignedEmployeeName}</Text>
                  ) : null}
                </View>
                {svc.unitPrice > 0 && (
                  <Text className={`${typo.labelBold} text-emerald-600`}>{formatVnd(svc.unitPrice)}</Text>
                )}
              </View>
            ))}
            {totalPrice > 0 && (
              <View className="flex-row justify-between pt-2.5 mt-1 border-t border-gray-100 dark:border-gray-600">
                <Text className={`${typo.label} text-gray-500`}>{t('appt.totalEstimate')}</Text>
                <Text className={`${typo.labelBold} text-gray-900 dark:text-white`}>{formatVnd(totalPrice)}</Text>
              </View>
            )}
          </View>
        )}

        {/* Note */}
        {appt.note ? (
          <View className="bg-white dark:bg-gray-800 rounded-2xl px-4 py-3 border border-gray-100 dark:border-gray-700">
            <Text className={`${typo.captionBold} text-gray-400 uppercase tracking-wide mb-1`}>{t('appt.noteSection')}</Text>
            <Text className={`${typo.caption} text-gray-700 dark:text-gray-300`}>{appt.note}</Text>
          </View>
        ) : null}

        {/* Secondary actions for active appointments */}
        {isActive && (
          <View className="flex-row gap-3">
            <TouchableOpacity
              testID="appt-cancel-btn"
              onPress={confirmCancel}
              disabled={isMutating}
              className="flex-1 py-3 rounded-xl border border-rose-200 items-center"
            >
              <Text className={`${typo.label} text-rose-500`}>{t('appt.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={confirmNoShow}
              disabled={isMutating}
              className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-600 items-center"
            >
              <Text className={`${typo.label} text-gray-500`}>{t('appt.noShow')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Confirm button (PENDING only) */}
        {appt.status === 'PENDING' && (
          <TouchableOpacity
            onPress={() => confirmMutation.mutate()}
            disabled={isMutating}
            className="py-3 rounded-xl border border-indigo-300 items-center"
          >
            {confirmMutation.isPending ? (
              <ActivityIndicator color="#4f46e5" />
            ) : (
              <Text className={`${typo.label} text-indigo-600`}>{t('appt.confirm')}</Text>
            )}
          </TouchableOpacity>
        )}

        {/* Delete (always visible for non-checked-in) */}
        {appt.status !== 'CHECKED_IN' && (
          <TouchableOpacity onPress={confirmDelete} disabled={isMutating} className="items-center py-2">
            <Text className={`${typo.caption} text-gray-400`}>{t('appt.delete')}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Sticky check-in button */}
      {canCheckIn && (
        <View
          className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-800 px-4 border-t border-gray-100 dark:border-gray-700"
          style={{ paddingBottom: insets.bottom + 8, paddingTop: 12 }}
        >
          <TouchableOpacity
            testID="appt-checkin-btn"
            onPress={() => checkInMutation.mutate()}
            disabled={isMutating}
            className="bg-indigo-600 rounded-2xl py-4 items-center"
          >
            {checkInMutation.isPending ? (
              <ActivityIndicator color="white" />
            ) : (
              <View className="flex-row items-center gap-2">
                <MaterialCommunityIcons name="account-check-outline" size={20} color="white" />
                <Text className={`${typo.labelBold} text-white`}>{t('appt.checkIn')}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
