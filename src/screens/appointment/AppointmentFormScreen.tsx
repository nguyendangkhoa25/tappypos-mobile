import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  appointmentApi,
  customerApi,
  productExtApi,
  employeeApi,
  type AppointmentServiceRequest,
  type CustomerData,
  type ProductData,
  type EmployeeData,
} from '../../services/api';
import { useAlertStore } from '../../store/alertStore';
import { useTypography } from '../../hooks/useTypography';
import type { MoreScreenProps } from '../../types/navigation';

type Props = MoreScreenProps<'AppointmentForm'>;

type ApiErr = { response?: { data?: { error?: string } } };
function apiMsg(e: unknown): string | undefined {
  return (e as ApiErr)?.response?.data?.error;
}

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function toTimeStr(h: number, m: number): string {
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

type DraftService = AppointmentServiceRequest & { _key: string };

function SectionHeader({ icon, title }: { icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']; title: string }) {
  const typo = useTypography();
  return (
    <View className="flex-row items-center mb-3 mt-1">
      <MaterialCommunityIcons name={icon} size={15} color="#6b7280" style={{ marginRight: 6 }} />
      <Text className={`${typo.captionBold} text-gray-500 dark:text-gray-400 uppercase tracking-wide`}>{title}</Text>
    </View>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  const typo = useTypography();
  return (
    <View className="mb-4">
      <Text className={`${typo.caption} font-medium text-gray-700 dark:text-gray-300 mb-1.5`}>{label}</Text>
      {children}
    </View>
  );
}

function ServiceRow({
  svc,
  employees,
  onRemove,
  onChangeEmployee,
}: {
  svc: DraftService;
  employees: EmployeeData[];
  onRemove: () => void;
  onChangeEmployee: (id: number | undefined, name: string | undefined) => void;
}) {
  const { t } = useTranslation();
  const typo = useTypography();
  const [showEmpPicker, setShowEmpPicker] = useState(false);

  return (
    <View className="bg-gray-50 dark:bg-gray-700 rounded-xl p-3 mb-2">
      <View className="flex-row items-center justify-between">
        <Text className={`${typo.label} text-gray-900 dark:text-white flex-1 mr-2`} numberOfLines={1}>
          {svc.productName}
        </Text>
        <TouchableOpacity onPress={onRemove} hitSlop={8}>
          <MaterialCommunityIcons name="close" size={18} color="#9ca3af" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        onPress={() => setShowEmpPicker(true)}
        className="flex-row items-center mt-1.5"
        style={{ gap: 6 }}
      >
        <MaterialCommunityIcons name="account-outline" size={13} color="#9ca3af" />
        <Text className={`${typo.caption} text-gray-500 dark:text-gray-400`}>
          {svc.assignedEmployeeName ?? t('appt.assignedTo')}
        </Text>
        <MaterialCommunityIcons name="chevron-down" size={12} color="#9ca3af" />
      </TouchableOpacity>

      <Modal visible={showEmpPicker} transparent animationType="slide">
        <TouchableOpacity
          className="flex-1 bg-black/40"
          activeOpacity={1}
          onPress={() => setShowEmpPicker(false)}
        />
        <View className="bg-white dark:bg-gray-800 rounded-t-3xl px-4 pt-4 pb-8">
          <Text className={`${typo.labelBold} text-gray-900 dark:text-white mb-3`}>{t('appt.assignedTo')}</Text>
          <TouchableOpacity
            onPress={() => { onChangeEmployee(undefined, undefined); setShowEmpPicker(false); }}
            className="py-3 border-b border-gray-100 dark:border-gray-700"
          >
            <Text className={`${typo.caption} text-gray-500`}>— {t('appt.unassigned')} —</Text>
          </TouchableOpacity>
          <FlatList
            data={employees}
            keyExtractor={(e) => e.id}
            renderItem={({ item: emp }) => (
              <TouchableOpacity
                onPress={() => { onChangeEmployee(Number(emp.id), emp.fullName); setShowEmpPicker(false); }}
                className="py-3 border-b border-gray-50 dark:border-gray-700"
              >
                <Text className={`${typo.label} text-gray-900 dark:text-white`}>{emp.fullName}</Text>
                {emp.position && <Text className={`${typo.caption} text-gray-400 mt-0.5`}>{emp.position}</Text>}
              </TouchableOpacity>
            )}
            style={{ maxHeight: 260 }}
          />
        </View>
      </Modal>
    </View>
  );
}

function CustomerSearchModal({
  visible,
  onClose,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (c: CustomerData) => void;
}) {
  const { t } = useTranslation();
  const typo = useTypography();
  const [query, setQuery] = useState('');

  const { data, isFetching } = useQuery({
    queryKey: ['customer-search-appt', query],
    queryFn: async () => {
      const res = await customerApi.list({ search: query, size: 20 });
      return res.data.data?.content ?? [];
    },
    enabled: visible,
    staleTime: 10_000,
  });

  return (
    <Modal visible={visible} transparent animationType="slide">
      <TouchableOpacity className="flex-1 bg-black/40" activeOpacity={1} onPress={onClose} />
      <View className="bg-white dark:bg-gray-800 rounded-t-3xl px-4 pt-4 pb-8" style={{ maxHeight: '75%' }}>
        <Text className={`${typo.labelBold} text-gray-900 dark:text-white mb-3`}>{t('appt.searchCustomer')}</Text>
        <View className="flex-row items-center bg-gray-100 dark:bg-gray-700 rounded-xl px-3 py-2 mb-3" style={{ gap: 8 }}>
          <MaterialCommunityIcons name="magnify" size={18} color="#9ca3af" />
          <TextInput
            className={`flex-1 ${typo.inputSize} text-gray-900 dark:text-white`}
            placeholder={t('appt.searchCustomer')}
            placeholderTextColor="#9ca3af"
            value={query}
            onChangeText={setQuery}
            autoFocus
          />
          {isFetching && <ActivityIndicator size="small" color="#9ca3af" />}
        </View>
        <FlatList
          data={data ?? []}
          keyExtractor={(c) => c.id}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item: c }) => (
            <TouchableOpacity
              onPress={() => { onSelect(c); onClose(); }}
              className="py-3 border-b border-gray-50 dark:border-gray-700"
            >
              <Text className={`${typo.label} text-gray-900 dark:text-white`}>{c.name}</Text>
              {c.phone && <Text className={`${typo.caption} text-gray-400 mt-0.5`}>{c.phone}</Text>}
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            !isFetching ? (
              <Text className={`${typo.caption} text-gray-400 py-4 text-center`}>{t('appt.walkIn')}</Text>
            ) : null
          }
        />
      </View>
    </Modal>
  );
}

function ProductPickerModal({
  visible,
  onClose,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (p: ProductData) => void;
}) {
  const { t } = useTranslation();
  const typo = useTypography();
  const [query, setQuery] = useState('');

  const { data, isFetching } = useQuery({
    queryKey: ['product-search-appt', query],
    queryFn: async () => {
      const res = await productExtApi.list({ search: query, size: 30 });
      return res.data.data?.content ?? [];
    },
    enabled: visible,
    staleTime: 30_000,
  });

  return (
    <Modal visible={visible} transparent animationType="slide">
      <TouchableOpacity className="flex-1 bg-black/40" activeOpacity={1} onPress={onClose} />
      <View className="bg-white dark:bg-gray-800 rounded-t-3xl px-4 pt-4 pb-8" style={{ maxHeight: '75%' }}>
        <Text className={`${typo.labelBold} text-gray-900 dark:text-white mb-3`}>{t('appt.service')}</Text>
        <View className="flex-row items-center bg-gray-100 dark:bg-gray-700 rounded-xl px-3 py-2 mb-3" style={{ gap: 8 }}>
          <MaterialCommunityIcons name="magnify" size={18} color="#9ca3af" />
          <TextInput
            className={`flex-1 ${typo.inputSize} text-gray-900 dark:text-white`}
            placeholder={t('appt.searchService')}
            placeholderTextColor="#9ca3af"
            value={query}
            onChangeText={setQuery}
            autoFocus
          />
          {isFetching && <ActivityIndicator size="small" color="#9ca3af" />}
        </View>
        <FlatList
          data={data ?? []}
          keyExtractor={(p) => p.id}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item: p }) => (
            <TouchableOpacity
              onPress={() => { onSelect(p); onClose(); }}
              className="py-3 border-b border-gray-50 dark:border-gray-700"
            >
              <Text className={`${typo.label} text-gray-900 dark:text-white`}>{p.name}</Text>
              {p.durationMinutes > 0 && (
                <Text className={`${typo.caption} text-gray-400 mt-0.5`}>{p.durationMinutes} phút</Text>
              )}
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            !isFetching ? <Text className={`${typo.caption} text-gray-400 py-4 text-center`}>{t('appt.noServicesFound')}</Text> : null
          }
        />
      </View>
    </Modal>
  );
}

export function AppointmentFormScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const typo = useTypography();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const showAlert = useAlertStore((s) => s.show);
  const { appointmentId } = route.params ?? {};
  const isEdit = !!appointmentId;

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerId, setCustomerId] = useState<number | undefined>();
  const [date, setDate] = useState(toDateStr(new Date()));
  const [hour, setHour] = useState(new Date().getHours());
  const [minute, setMinute] = useState(0);
  const [duration, setDuration] = useState(60);
  const [note, setNote] = useState('');
  const [services, setServices] = useState<DraftService[]>([]);

  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [showProductPicker, setShowProductPicker] = useState(false);

  const { data: employees = [] } = useQuery({
    queryKey: ['employees-active'],
    queryFn: async () => (await employeeApi.listActive()).data.data ?? [],
    staleTime: 300_000,
  });

  const { data: existingAppt } = useQuery({
    queryKey: ['appointment', appointmentId],
    queryFn: async () => (await appointmentApi.getById(appointmentId!)).data.data,
    enabled: isEdit,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!existingAppt) return;
    setCustomerName(existingAppt.customerName);
    setCustomerPhone(existingAppt.customerPhone ?? '');
    setCustomerId(existingAppt.customerId ?? undefined);
    setDate(existingAppt.scheduledDate);
    const [h, m] = existingAppt.scheduledStartTime.split(':').map(Number);
    setHour(h);
    setMinute(m);
    setDuration(existingAppt.durationMinutes);
    setNote(existingAppt.note ?? '');
    setServices(
      existingAppt.services.map((s, i) => ({
        _key: String(s.id ?? i),
        productId: s.productId,
        productName: s.productName,
        unitPrice: s.unitPrice,
        durationMinutes: s.durationMinutes,
        assignedEmployeeId: s.assignedEmployeeId ?? undefined,
        assignedEmployeeName: s.assignedEmployeeName ?? undefined,
      }))
    );
  }, [existingAppt]);

  function invalidate() {
    qc.invalidateQueries({ queryKey: ['appointments'] });
    if (appointmentId) qc.invalidateQueries({ queryKey: ['appointment', appointmentId] });
  }

  const createMutation = useMutation({
    mutationFn: () =>
      appointmentApi.create({
        customerId,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim() || undefined,
        scheduledDate: date,
        scheduledStartTime: toTimeStr(hour, minute),
        durationMinutes: duration,
        note: note.trim() || undefined,
        services: services.map(({ _key, ...s }) => s),
      }),
    onSuccess: () => {
      invalidate();
      showAlert(t('appt.saveSuccess'), '', [{ label: 'OK', onPress: () => navigation.goBack() }]);
    },
    onError: (e: unknown) => showAlert(t('common.error'), apiMsg(e) ?? t('appt.saveFailed')),
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      appointmentApi.update(appointmentId!, {
        customerId,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim() || undefined,
        scheduledDate: date,
        scheduledStartTime: toTimeStr(hour, minute),
        durationMinutes: duration,
        note: note.trim() || undefined,
        services: services.map(({ _key, ...s }) => s),
      }),
    onSuccess: () => {
      invalidate();
      showAlert(t('appt.saveSuccess'), '', [{ label: 'OK', onPress: () => navigation.goBack() }]);
    },
    onError: (e: unknown) => showAlert(t('common.error'), apiMsg(e) ?? t('appt.saveFailed')),
  });

  const isSaving = createMutation.isPending || updateMutation.isPending;

  function handleSave() {
    if (!customerName.trim()) {
      showAlert(t('common.error'), t('appt.customerNameRequired'));
      return;
    }
    isEdit ? updateMutation.mutate() : createMutation.mutate();
  }

  function addService(p: ProductData) {
    setServices((prev) => [
      ...prev,
      {
        _key: `${p.id}-${Date.now()}`,
        productId: Number(p.id),
        productName: p.name,
        unitPrice: p.price,
        durationMinutes: p.durationMinutes ?? 0,
        assignedEmployeeId: undefined,
        assignedEmployeeName: undefined,
      },
    ]);
    if (p.durationMinutes > 0) setDuration((d) => d + p.durationMinutes);
  }

  function removeService(key: string) {
    setServices((prev) => {
      const svc = prev.find((s) => s._key === key);
      if (svc?.durationMinutes) setDuration((d) => Math.max(0, d - (svc.durationMinutes ?? 0)));
      return prev.filter((s) => s._key !== key);
    });
  }

  function updateServiceEmployee(key: string, empId: number | undefined, empName: string | undefined) {
    setServices((prev) =>
      prev.map((s) =>
        s._key === key ? { ...s, assignedEmployeeId: empId, assignedEmployeeName: empName } : s
      )
    );
  }

  function shiftDay(delta: number) {
    const d = new Date(date);
    d.setDate(d.getDate() + delta);
    setDate(toDateStr(d));
  }

  function shiftHour(delta: number) {
    setHour((h) => Math.max(0, Math.min(23, h + delta)));
  }

  function shiftMinute(delta: number) {
    setMinute((m) => {
      const next = m + delta;
      if (next < 0) { setHour((h) => Math.max(0, h - 1)); return 45; }
      if (next >= 60) { setHour((h) => Math.min(23, h + 1)); return 0; }
      return next;
    });
  }

  const [y, mo, da] = date.split('-');
  const displayDate = `${da}/${mo}/${y}`;

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-gray-50 dark:bg-gray-900"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4" style={{ paddingTop: insets.top + 12, paddingBottom: 12 }}>
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} className="mr-3">
            <MaterialCommunityIcons name="chevron-left" size={26} color="#4f46e5" />
          </TouchableOpacity>
          <Text className={`${typo.heading} text-gray-900 dark:text-white flex-1`} numberOfLines={1}>
            {isEdit ? t('appt.edit') : t('appt.new')}
          </Text>
          <TouchableOpacity onPress={handleSave} disabled={isSaving} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            {isSaving ? <ActivityIndicator size="small" color="#4f46e5" /> : (
              <Text className={`${typo.labelBold} text-indigo-600 dark:text-indigo-400`}>{t('common.save')}</Text>
            )}
          </TouchableOpacity>
        </View>
        <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 mt-1 ml-9`}>{t('appt.formHint')}</Text>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Section: Customer */}
        <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 mb-4 border border-gray-100 dark:border-gray-700">
          <SectionHeader icon="account-outline" title={t('appt.customerSection')} />

          <FormField label={`${t('appt.customerName')} *`}>
            <View className="flex-row items-center border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 px-3">
              <TextInput
                testID="appt-customer-name"
                className={`flex-1 py-3 ${typo.inputSize} text-gray-900 dark:text-white`}
                placeholder={t('appt.customerNamePlaceholder')}
                placeholderTextColor="#9ca3af"
                value={customerName}
                onChangeText={setCustomerName}
              />
              <TouchableOpacity onPress={() => setShowCustomerSearch(true)} hitSlop={8}>
                <MaterialCommunityIcons name="account-search-outline" size={20} color="#4f46e5" />
              </TouchableOpacity>
            </View>
          </FormField>

          <FormField label={t('appt.customerPhone')}>
            <TextInput
              testID="appt-customer-phone"
              className={`border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-3 ${typo.inputSize} text-gray-900 dark:text-white bg-white dark:bg-gray-700`}
              placeholder={t('appt.customerPhonePlaceholder')}
              placeholderTextColor="#9ca3af"
              value={customerPhone}
              onChangeText={setCustomerPhone}
              keyboardType="phone-pad"
            />
          </FormField>
        </View>

        {/* Section: Date & time */}
        <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 mb-4 border border-gray-100 dark:border-gray-700">
          <SectionHeader icon="calendar-clock-outline" title={t('appt.datetimeSection')} />

          <FormField label={t('appt.date')}>
            <View className="flex-row items-center justify-between bg-gray-50 dark:bg-gray-700 rounded-xl px-4 py-3">
              <TouchableOpacity onPress={() => shiftDay(-1)} hitSlop={8}>
                <MaterialCommunityIcons name="chevron-left" size={22} color="#6b7280" />
              </TouchableOpacity>
              <Text className={`${typo.label} text-gray-900 dark:text-white`}>{displayDate}</Text>
              <TouchableOpacity onPress={() => shiftDay(1)} hitSlop={8}>
                <MaterialCommunityIcons name="chevron-right" size={22} color="#6b7280" />
              </TouchableOpacity>
            </View>
          </FormField>

          <FormField label={t('appt.time')}>
            <View className="flex-row items-center justify-center bg-gray-50 dark:bg-gray-700 rounded-xl py-3" style={{ gap: 16 }}>
              <View className="items-center">
                <TouchableOpacity onPress={() => shiftHour(1)} hitSlop={8}>
                  <MaterialCommunityIcons name="chevron-up" size={22} color="#6b7280" />
                </TouchableOpacity>
                <Text className={`${typo.heading} text-gray-900 dark:text-white w-12 text-center`}>
                  {String(hour).padStart(2, '0')}
                </Text>
                <TouchableOpacity onPress={() => shiftHour(-1)} hitSlop={8}>
                  <MaterialCommunityIcons name="chevron-down" size={22} color="#6b7280" />
                </TouchableOpacity>
              </View>
              <Text className={`${typo.heading} text-gray-400`}>:</Text>
              <View className="items-center">
                <TouchableOpacity onPress={() => shiftMinute(15)} hitSlop={8}>
                  <MaterialCommunityIcons name="chevron-up" size={22} color="#6b7280" />
                </TouchableOpacity>
                <Text className={`${typo.heading} text-gray-900 dark:text-white w-12 text-center`}>
                  {String(minute).padStart(2, '0')}
                </Text>
                <TouchableOpacity onPress={() => shiftMinute(-15)} hitSlop={8}>
                  <MaterialCommunityIcons name="chevron-down" size={22} color="#6b7280" />
                </TouchableOpacity>
              </View>
            </View>
          </FormField>

          <FormField label={t('appt.duration')}>
            <View className="flex-row items-center justify-between bg-gray-50 dark:bg-gray-700 rounded-xl px-4 py-3">
              <TouchableOpacity
                onPress={() => setDuration((d) => Math.max(15, d - 15))}
                hitSlop={8}
                className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 items-center justify-center"
              >
                <MaterialCommunityIcons name="minus" size={18} color="#6b7280" />
              </TouchableOpacity>
              <Text className={`${typo.labelBold} text-gray-900 dark:text-white`}>{duration} phút</Text>
              <TouchableOpacity
                onPress={() => setDuration((d) => d + 15)}
                hitSlop={8}
                className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 items-center justify-center"
              >
                <MaterialCommunityIcons name="plus" size={18} color="#6b7280" />
              </TouchableOpacity>
            </View>
          </FormField>
        </View>

        {/* Section: Services */}
        <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 mb-4 border border-gray-100 dark:border-gray-700">
          <SectionHeader icon="briefcase-outline" title={t('appt.servicesSection')} />

          {services.length === 0 ? (
            <Text className={`${typo.caption} text-gray-400 mb-2`}>{t('appt.noServices')}</Text>
          ) : (
            services.map((svc) => (
              <ServiceRow
                key={svc._key}
                svc={svc}
                employees={employees}
                onRemove={() => removeService(svc._key)}
                onChangeEmployee={(id, name) => updateServiceEmployee(svc._key, id, name)}
              />
            ))
          )}
          <TouchableOpacity
            onPress={() => setShowProductPicker(true)}
            className="flex-row items-center mt-1"
            style={{ gap: 8 }}
          >
            <MaterialCommunityIcons name="plus-circle-outline" size={18} color="#4f46e5" />
            <Text className={`${typo.label} text-indigo-600 dark:text-indigo-400`}>{t('appt.addService')}</Text>
          </TouchableOpacity>
        </View>

        {/* Section: Note */}
        <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 mb-4 border border-gray-100 dark:border-gray-700">
          <SectionHeader icon="note-text-outline" title={t('appt.noteSection')} />
          <TextInput
            className={`border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-3 ${typo.inputSize} text-gray-900 dark:text-white bg-white dark:bg-gray-700`}
            placeholder={t('appt.notePlaceholder')}
            placeholderTextColor="#9ca3af"
            value={note}
            onChangeText={setNote}
            multiline
            textAlignVertical="top"
            style={{ minHeight: 72 }}
          />
        </View>
      </ScrollView>


      <CustomerSearchModal
        visible={showCustomerSearch}
        onClose={() => setShowCustomerSearch(false)}
        onSelect={(c) => {
          setCustomerId(Number(c.id));
          setCustomerName(c.name);
          setCustomerPhone(c.phone ?? '');
        }}
      />

      <ProductPickerModal
        visible={showProductPicker}
        onClose={() => setShowProductPicker(false)}
        onSelect={addService}
      />
    </KeyboardAvoidingView>
  );
}
