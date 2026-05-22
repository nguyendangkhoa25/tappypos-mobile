import { useState, useEffect, useRef } from 'react';
import * as Print from 'expo-print';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  Modal, TextInput, KeyboardAvoidingView, Platform, FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { orderApi, customerApi, employeeApi, shopConfigApi, type CustomerData, type EmployeeData, type BankAccount } from '../../services/api';
import { useAlertStore } from '../../store/alertStore';
import { useToastStore } from '../../store/toastStore';
import { useErrorAlert } from '../../hooks/useErrorAlert';
import { formatVnd, formatDateTime, formatMoneyDisplay } from '../../utils/format';
import { VietQrCard } from '../../components/VietQrCard';
import { MoneyInput } from '../../components/MoneyInput';
import { useTypography } from '../../hooks/useTypography';
import { Skeleton } from '../../components/Skeleton';
import { ErrorState } from '../../components/ErrorState';
import type { OrdersScreenProps } from '../../types/navigation';

type Props = OrdersScreenProps<'OrderDetail'>;

import type { OrderDetail } from '../../services/api';

// ── Receipt Preview Modal ─────────────────────────────────────────────────────

function ReceiptModal({
  visible,
  order,
  onClose,
}: {
  visible: boolean;
  order: OrderDetail;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const typo = useTypography();
  const insets = useSafeAreaInsets();
  const [printing, setPrinting] = useState(false);
  const [showQr, setShowQr] = useState(false);

  const { data: banks = [] } = useQuery<BankAccount[]>({
    queryKey: ['banks'],
    queryFn: () => shopConfigApi.getBanks().then((r) => r.data.data),
    staleTime: 5 * 60 * 1000,
  });

  const primaryBank = banks[0] ?? null;

  async function handlePrint() {
    if (printing) return;
    setPrinting(true);
    try {
      const res = await orderApi.getReceipt(order.id);
      await Print.printAsync({ html: res.data });
    } finally {
      setPrinting(false);
    }
  }

  const subtotal = order.items.reduce((s, i) => s + (i.subtotal ?? 0), 0);
  const hasExtras = (order.discount ?? 0) > 0 || (order.tipAmount ?? 0) > 0;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      {/* Full indigo background — customer-facing display */}
      <View className="flex-1 bg-indigo-600">
        {/* Staff-only top bar — small, unobtrusive */}
        <View
          className="flex-row items-center justify-between px-4"
          style={{ paddingTop: insets.top + 8, paddingBottom: 8 }}
        >
          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            className="bg-white/20 rounded-full p-2"
          >
            <MaterialCommunityIcons name="close" size={20} color="#fff" />
          </TouchableOpacity>

          <View className="flex-row items-center gap-x-2">
            {primaryBank && (
              <TouchableOpacity
                onPress={() => setShowQr((v) => !v)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                className={`rounded-full p-2 ${showQr ? 'bg-white/40' : 'bg-white/20'}`}
              >
                <MaterialCommunityIcons name="qrcode" size={20} color="#fff" />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={handlePrint}
              disabled={printing}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              className="bg-white/20 rounded-full p-2"
            >
              {printing
                ? <ActivityIndicator size="small" color="#fff" />
                : <MaterialCommunityIcons name="printer-outline" size={20} color="#fff" />
              }
            </TouchableOpacity>
          </View>
        </View>

        {/* Total — large, customer-readable */}
        <View className="items-center px-6 pt-4 pb-8">
          <Text style={{ fontSize: 15, color: 'rgba(255,255,255,0.7)', marginBottom: 6, letterSpacing: 1 }}>
            TỔNG THANH TOÁN
          </Text>
          <Text style={{ fontSize: 48, fontWeight: '800', color: '#fff', letterSpacing: -1 }}>
            {formatVnd(order.total ?? 0)}
          </Text>
          {order.customerName && (
            <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', marginTop: 8 }}>
              Khách: {order.customerName}
            </Text>
          )}
        </View>

        {/* Receipt card — white, scrollable */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          style={{ backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28 }}
        >
          <View className="px-6 pt-6">
            {/* Order meta */}
            <View className="flex-row justify-between items-center mb-1">
              <Text style={{ fontSize: 13, color: '#9ca3af' }}>Mã đơn</Text>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#111827' }}>#{order.orderNumber}</Text>
            </View>
            <View className="flex-row justify-between items-center mb-4">
              <Text style={{ fontSize: 13, color: '#9ca3af' }}>Thời gian</Text>
              <Text style={{ fontSize: 13, color: '#374151' }}>
                {formatDateTime(order.createdAt)}
              </Text>
            </View>

            {/* Divider */}
            <View style={{ borderTopWidth: 1, borderStyle: 'dashed', borderColor: '#e5e7eb', marginBottom: 16 }} />

            {/* Items */}
            {order.items.map((item, idx) => (
              <View key={item.id ?? idx} className="flex-row justify-between items-start mb-3">
                <View className="flex-1 mr-4">
                  <Text style={{ fontSize: 15, fontWeight: '600', color: '#111827' }}>{item.productName}</Text>
                  {item.assignedEmployeeName && (
                    <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 1 }}>{item.assignedEmployeeName}</Text>
                  )}
                </View>
                <View className="items-end">
                  <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827' }}>
                    {formatVnd(item.subtotal ?? 0)}
                  </Text>
                  {item.quantity > 1 && (
                    <Text style={{ fontSize: 12, color: '#9ca3af' }}>
                      {formatVnd(item.unitPrice ?? 0)} × {item.quantity}
                    </Text>
                  )}
                </View>
              </View>
            ))}

            {/* Divider */}
            <View style={{ borderTopWidth: 1, borderStyle: 'dashed', borderColor: '#e5e7eb', marginTop: 4, marginBottom: 14 }} />

            {/* Breakdown */}
            {hasExtras && (
              <View className="mb-3" style={{ gap: 8 }}>
                <View className="flex-row justify-between">
                  <Text style={{ fontSize: 14, color: '#6b7280' }}>Tạm tính</Text>
                  <Text style={{ fontSize: 14, color: '#6b7280' }}>{formatVnd(subtotal)}</Text>
                </View>
                {(order.discount ?? 0) > 0 && (
                  <View className="flex-row justify-between">
                    <Text style={{ fontSize: 14, color: '#d97706' }}>Giảm giá</Text>
                    <Text style={{ fontSize: 14, color: '#d97706' }}>−{formatVnd(order.discount ?? 0)}</Text>
                  </View>
                )}
                {(order.tipAmount ?? 0) > 0 && (
                  <View className="flex-row justify-between">
                    <Text style={{ fontSize: 14, color: '#059669' }}>Tip</Text>
                    <Text style={{ fontSize: 14, color: '#059669' }}>+{formatVnd(order.tipAmount ?? 0)}</Text>
                  </View>
                )}
              </View>
            )}

            {/* Total row */}
            <View className="flex-row justify-between items-center bg-indigo-50 rounded-2xl px-4 py-3 mb-4">
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#4338ca' }}>Tổng cộng</Text>
              <Text style={{ fontSize: 20, fontWeight: '800', color: '#4338ca' }}>
                {formatVnd(order.total ?? 0)}
              </Text>
            </View>

            {/* Cash change */}
            {order.paymentMethod === 'CASH' && (order.amountPaid ?? 0) > 0 && (
              <View className="bg-gray-50 rounded-2xl px-4 py-3 mb-4" style={{ gap: 6 }}>
                <View className="flex-row justify-between">
                  <Text style={{ fontSize: 13, color: '#6b7280' }}>Tiền nhận</Text>
                  <Text style={{ fontSize: 13, color: '#374151' }}>{formatVnd(order.amountPaid ?? 0)}</Text>
                </View>
                {(order.changeAmount ?? 0) > 0 && (
                  <View className="flex-row justify-between">
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151' }}>Tiền thừa</Text>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#4f46e5' }}>{formatVnd(order.changeAmount ?? 0)}</Text>
                  </View>
                )}
              </View>
            )}

            {/* Payment method */}
            {order.paymentMethod && (
              <View className="items-center mb-6">
                <Text style={{ fontSize: 13, color: '#9ca3af' }}>
                  {order.paymentMethod === 'CASH' ? '💵 Tiền mặt' : order.paymentMethod === 'BANK_TRANSFER' ? '🏦 Chuyển khoản' : '💳 Thẻ'}
                </Text>
              </View>
            )}

            {/* VietQR section */}
            {showQr && primaryBank && (
              <View className="items-center mb-6">
                <View style={{ borderTopWidth: 1, borderStyle: 'dashed', borderColor: '#e5e7eb', width: '100%', marginBottom: 16 }} />
                <VietQrCard
                  bank={primaryBank}
                  amount={order.total ?? 0}
                  description={`Thanh toan don ${order.orderNumber}`}
                />
              </View>
            )}

            {/* Thank-you footer */}
            <View className="items-center pb-2">
              <Text style={{ fontSize: 22, marginBottom: 6 }}>🙏</Text>
              <Text style={{ fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 4 }}>Cảm ơn quý khách!</Text>
              <Text style={{ fontSize: 13, color: '#9ca3af' }}>Hẹn gặp lại lần sau</Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const STATUS_COLOR: Record<string, string> = {
  COMPLETED:  '#059669',
  IN_PROGRESS: '#3b82f6',
  PENDING:    '#f59e0b',
  CANCELLED:  '#ef4444',
};

type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'CARD';

const TIP_AMOUNTS = [10_000, 20_000, 50_000, 100_000];

function SectionLabel({ title }: { title: string }) {
  const typo = useTypography();
  return (
    <Text className={`${typo.captionBold} text-gray-500 uppercase tracking-wide mb-3`}>
      {title}
    </Text>
  );
}

function InfoRow({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string | null | undefined;
  valueColor?: string;
}) {
  const typo = useTypography();
  if (!value) return null;
  return (
    <View className="flex-row justify-between items-start py-2 border-b border-gray-50">
      <Text className={`${typo.caption} text-gray-500 mr-4 flex-shrink-0`}>{label}</Text>
      <Text
        className={`${typo.caption} font-medium text-right flex-1`}
        style={{ color: valueColor ?? '#1f2937' }}
      >
        {value}
      </Text>
    </View>
  );
}

// ── Customer Search Modal ──────────────────────────────────────────────────────

function CustomerSearchModal({
  visible,
  currentCustomerId,
  onClose,
  onSelect,
}: {
  visible: boolean;
  currentCustomerId: number | null;
  onClose: () => void;
  onSelect: (customer: CustomerData | null) => void;
}) {
  const { t } = useTranslation();
  const typo = useTypography();
  const [search, setSearch] = useState('');

  const { data: searchResult, isFetching } = useQuery({
    queryKey: ['customers-search-modal', search],
    queryFn: () => customerApi.list({ search: search || undefined, size: 20 }).then((r) => r.data.data.content),
    enabled: visible,
    staleTime: 30_000,
  });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity className="flex-1 bg-black/40" activeOpacity={1} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View className="bg-white rounded-t-3xl px-4 pt-4" style={{ maxHeight: 520 }}>
          <View className="w-10 h-1 bg-gray-200 rounded-full self-center mb-4" />
          <Text className={`${typo.section} text-gray-900 mb-3`}>{t('orders.selectCustomer')}</Text>

          <View className="flex-row items-center bg-gray-100 rounded-xl px-3 mb-3">
            <MaterialCommunityIcons name="magnify" size={18} color="#9ca3af" />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder={t('orders.customerSearch')}
              className="flex-1 py-2.5 ml-2"
              style={{ fontSize: 15, color: '#1f2937' }}
              autoFocus
            />
            {isFetching && <ActivityIndicator size="small" color="#4f46e5" />}
          </View>

          {/* Walk-in option */}
          <TouchableOpacity
            className={`flex-row items-center py-3 border-b border-gray-100 ${
              currentCustomerId === null ? 'opacity-50' : ''
            }`}
            onPress={() => { Haptics.selectionAsync(); onSelect(null); onClose(); }}
          >
            <View className="w-8 h-8 rounded-full bg-gray-200 items-center justify-center mr-3">
              <MaterialCommunityIcons name="account-off-outline" size={16} color="#6b7280" />
            </View>
            <Text className={`${typo.label} text-gray-600 flex-1`}>{t('orders.walkInCustomer')}</Text>
            {currentCustomerId === null && (
              <MaterialCommunityIcons name="check" size={18} color="#4f46e5" />
            )}
          </TouchableOpacity>

          <FlatList
            data={searchResult ?? []}
            keyExtractor={(item) => item.id}
            style={{ maxHeight: 320 }}
            contentContainerStyle={{ paddingBottom: 24 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                className="flex-row items-center py-3 border-b border-gray-50"
                onPress={() => { Haptics.selectionAsync(); onSelect(item); onClose(); }}
              >
                <View className="w-8 h-8 rounded-full bg-indigo-100 items-center justify-center mr-3">
                  <Text className={`${typo.captionBold} text-indigo-600`}>
                    {item.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className={`${typo.label} text-gray-800`}>{item.name}</Text>
                  {item.phone && (
                    <Text className={`${typo.caption} text-gray-400`}>{item.phone}</Text>
                  )}
                </View>
                {String(item.id) === String(currentCustomerId) && (
                  <MaterialCommunityIcons name="check" size={18} color="#4f46e5" />
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Employee Picker Modal ──────────────────────────────────────────────────────

function EmployeePickerModal({
  visible,
  currentEmployeeId,
  onClose,
  onSelect,
}: {
  visible: boolean;
  currentEmployeeId: number | null | undefined;
  onClose: () => void;
  onSelect: (employee: EmployeeData | null) => void;
}) {
  const { t } = useTranslation();
  const typo = useTypography();

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees-active'],
    queryFn: () => employeeApi.listActive().then((r) => r.data.data),
    enabled: visible,
    staleTime: 60_000,
  });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity className="flex-1 bg-black/40" activeOpacity={1} onPress={onClose} />
      <View className="bg-white rounded-t-3xl px-4 pt-4" style={{ maxHeight: 480 }}>
        <View className="w-10 h-1 bg-gray-200 rounded-full self-center mb-4" />
        <Text className={`${typo.section} text-gray-900 mb-3`}>{t('orders.assignTechnician')}</Text>

        {isLoading ? (
          <ActivityIndicator color="#4f46e5" style={{ marginVertical: 24 }} />
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
            {/* Clear option */}
            <TouchableOpacity
              className="flex-row items-center py-3 border-b border-gray-100"
              onPress={() => { Haptics.selectionAsync(); onSelect(null); onClose(); }}
            >
              <View className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center mr-3">
                <MaterialCommunityIcons name="account-off-outline" size={18} color="#9ca3af" />
              </View>
              <Text className={`${typo.label} text-gray-500 flex-1`}>{t('orders.clearTechnician')}</Text>
              {currentEmployeeId == null && (
                <MaterialCommunityIcons name="check" size={18} color="#4f46e5" />
              )}
            </TouchableOpacity>

            {employees.map((emp) => (
              <TouchableOpacity
                key={emp.id}
                className="flex-row items-center py-3 border-b border-gray-50"
                onPress={() => { Haptics.selectionAsync(); onSelect(emp); onClose(); }}
              >
                <View className="w-9 h-9 rounded-full bg-indigo-100 items-center justify-center mr-3">
                  <Text className={`${typo.captionBold} text-indigo-600`}>
                    {emp.fullName.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className={`${typo.label} text-gray-800`}>{emp.fullName}</Text>
                  {emp.position && (
                    <Text className={`${typo.caption} text-gray-400`}>{emp.position}</Text>
                  )}
                </View>
                {String(currentEmployeeId) === String(emp.id) && (
                  <MaterialCommunityIcons name="check" size={18} color="#4f46e5" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

// ── Payment Sheet ─────────────────────────────────────────────────────────────

function PaymentSheet({
  visible,
  total,
  initialMethod,
  onClose,
  onConfirm,
  paying,
}: {
  visible: boolean;
  total: number;
  initialMethod?: string | null;
  onClose: () => void;
  onConfirm: (method: PaymentMethod, amountPaid?: number) => void;
  paying: boolean;
}) {
  const { t } = useTranslation();
  const typo = useTypography();
  const [method, setMethod] = useState<PaymentMethod>(
    (initialMethod as PaymentMethod) ?? 'CASH'
  );
  const [cashInput, setCashInput] = useState(String(total));
  const [cashManuallyEdited, setCashManuallyEdited] = useState(false);

  useEffect(() => {
    if (visible) {
      setCashInput(String(total));
      setCashManuallyEdited(false);
      setMethod((initialMethod as PaymentMethod) ?? 'CASH');
    }
  }, [visible]);

  const cashNum = parseInt(cashInput.replace(/[^0-9]/g, '') || '0', 10);
  const cashDelta = cashNum > 0 ? cashNum - total : 0;

  const paymentOptions: { value: PaymentMethod; label: string; icon: string }[] = [
    { value: 'CASH', label: t('barber.paymentCash'), icon: 'cash' },
    { value: 'BANK_TRANSFER', label: t('barber.paymentTransfer'), icon: 'bank-transfer' },
    { value: 'CARD', label: t('barber.paymentCard'), icon: 'credit-card-outline' },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity className="flex-1 bg-black/40" activeOpacity={1} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View className="bg-white rounded-t-3xl px-5 pt-4 pb-8">
          <View className="w-10 h-1 bg-gray-200 rounded-full self-center mb-4" />
          <Text className={`${typo.section} text-gray-900 mb-4`}>{t('orders.collectPayment')}</Text>

          <View className="flex-row justify-between items-center mb-5">
            <Text className={`${typo.label} text-gray-700`}>{t('orders.total')}</Text>
            <Text className={`${typo.heading} font-bold text-indigo-600`}>{formatVnd(total)}</Text>
          </View>

          <View className="flex-row gap-x-2 mb-4">
            {paymentOptions.map(({ value, label, icon }) => (
              <TouchableOpacity
                key={value}
                className={`flex-1 flex-row items-center justify-center gap-x-1.5 py-2 rounded-xl border ${
                  method === value ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-gray-200'
                }`}
                onPress={() => { Haptics.selectionAsync(); setMethod(value); }}
              >
                <MaterialCommunityIcons
                  name={icon as any}
                  size={14}
                  color={method === value ? '#fff' : '#6b7280'}
                />
                <Text className={`${typo.captionBold} ${method === value ? 'text-white' : 'text-gray-600'}`}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {method === 'CASH' && (
            <View className="mb-4">
              <View className="flex-row items-center justify-between mb-2">
                <Text className={`${typo.label} text-gray-700`}>{t('barber.cashReceived')}</Text>
                {cashManuallyEdited && (
                  <TouchableOpacity
                    className="flex-row items-center gap-x-1"
                    onPress={() => { Haptics.selectionAsync(); setCashInput(String(total)); setCashManuallyEdited(false); }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <MaterialCommunityIcons name="refresh" size={13} color="#4f46e5" />
                    <Text className={`${typo.captionBold} text-indigo-600`}>{t('barber.exactAmount')}</Text>
                  </TouchableOpacity>
                )}
              </View>
              <View className="flex-row items-center border-2 border-indigo-200 rounded-2xl overflow-hidden bg-indigo-50">
                <TextInput
                  value={formatMoneyDisplay(cashInput)}
                  onChangeText={(text) => {
                    const digits = text.replace(/[^0-9]/g, '');
                    setCashInput(digits);
                    setCashManuallyEdited(true);
                  }}
                  keyboardType="number-pad"
                  selectionColor="#4f46e5"
                  placeholder="0"
                  placeholderTextColor="#a5b4fc"
                  style={{ flex: 1, paddingHorizontal: 16, paddingVertical: 14, fontSize: 26, fontWeight: '700', color: '#111827' }}
                />
                <View className="px-3 self-stretch justify-center bg-indigo-100 border-l border-indigo-200">
                  <Text style={{ fontSize: 20, fontWeight: '700', color: '#4f46e5' }}>đ</Text>
                </View>
              </View>
              {cashNum > 0 && cashDelta !== 0 && (
                <View className="flex-row justify-between items-center mt-2 px-1">
                  <Text className={`${typo.label} text-gray-600`}>
                    {cashDelta >= 0 ? t('barber.change') : t('barber.shortage')}
                  </Text>
                  <Text className={`${typo.section} font-bold ${cashDelta >= 0 ? 'text-indigo-600' : 'text-red-500'}`}>
                    {formatVnd(Math.abs(cashDelta))}
                  </Text>
                </View>
              )}
            </View>
          )}

          <TouchableOpacity
            className="bg-indigo-600 rounded-2xl py-4 items-center"
            onPress={() => onConfirm(method, method === 'CASH' && cashNum > 0 ? cashNum : undefined)}
            disabled={paying}
            activeOpacity={0.85}
          >
            {paying ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text className={`${typo.labelBold} text-white`}>{t('orders.payAndComplete')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export function OrderDetailScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const typo = useTypography();
  const { show: showAlert } = useAlertStore();
  const { show: showToast } = useToastStore();
  const showErrorAlert = useErrorAlert();
  const insets = useSafeAreaInsets();
  const { orderId } = route.params;
  const queryClient = useQueryClient();
  const [paymentSheetVisible, setPaymentSheetVisible] = useState(false);
  const [receiptVisible, setReceiptVisible] = useState(false);
  const [customerSearchVisible, setCustomerSearchVisible] = useState(false);
  const [employeePickerItemId, setEmployeePickerItemId] = useState<number | null>(null);
  const [employeePickerCurrentId, setEmployeePickerCurrentId] = useState<number | null | undefined>(null);

  // Edit state for IN_PROGRESS orders
  const [localTip, setLocalTip] = useState('');
  const [showCustomTip, setShowCustomTip] = useState(false);
  const [localCustomer, setLocalCustomer] = useState<{ id: string; name: string } | null | undefined>(undefined);

  const { data: order, isLoading, isError, refetch } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => orderApi.getById(orderId).then((r) => r.data.data),
    staleTime: 30_000,
  });

  // Initialise local edit state when order loads
  const initialised = useRef(false);
  useEffect(() => {
    if (order && !initialised.current) {
      initialised.current = true;
      const tip = order.tipAmount ?? 0;
      setLocalTip(String(tip));
      setLocalCustomer(
        order.customerName
          ? { id: String(order.customerId), name: order.customerName }
          : null,
      );
    }
  }, [order]);

  const completeMutation = useMutation({
    mutationFn: () => orderApi.complete(orderId).then((r) => r.data.data),
    onSuccess: (updated) => {
      queryClient.setQueryData(['order', orderId], updated);
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      showToast(t('orders.completeSuccess'), undefined, 'success');
    },
    onError: showErrorAlert,
  });

  const cancelMutation = useMutation({
    mutationFn: () => orderApi.cancel(orderId).then((r) => r.data.data),
    onSuccess: (updated) => {
      queryClient.setQueryData(['order', orderId], updated);
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: showErrorAlert,
  });

  const removeItemMutation = useMutation({
    mutationFn: (itemId: number) => orderApi.removeItem(orderId, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: showErrorAlert,
  });

  const updateQtyMutation = useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: number; quantity: number }) =>
      orderApi.updateItemQuantity(orderId, itemId, quantity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: showErrorAlert,
  });

  const updateEmployeeMutation = useMutation({
    mutationFn: ({ itemId, employee }: { itemId: number; employee: EmployeeData | null }) =>
      orderApi.updateItemEmployee(orderId, itemId, employee ? employee.id : null),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
    },
    onError: showErrorAlert,
  });

  const saveMetaMutation = useMutation({
    mutationFn: () => {
      const tipNum = parseInt(localTip || '0', 10);
      return orderApi.updateMeta(orderId, {
        tip: tipNum,
        customerId: localCustomer ? localCustomer.id : null,
        clearCustomer: localCustomer === null,
      }).then((r) => r.data.data);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(['order', orderId], updated);
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      showToast(t('orders.saveSuccess'));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: showErrorAlert,
  });

  const payAndCompleteMutation = useMutation({
    mutationFn: ({ method, amountPaid }: { method: string; amountPaid?: number }) =>
      orderApi.payAndComplete(orderId, { paymentMethod: method, amountPaid }).then((r) => r.data.data),
    onSuccess: (updated) => {
      queryClient.setQueryData(['order', orderId], updated);
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setPaymentSheetVisible(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.replace('OrderSuccess', {
        orderId: String(updated.id),
        orderNumber: updated.orderNumber,
        total: updated.total,
      });
    },
    onError: (err) => {
      setPaymentSheetVisible(false);
      showErrorAlert(err);
    },
  });

  function handleCancel() {
    showAlert(
      t('orders.cancelConfirmTitle'),
      t('orders.cancelConfirmMsg'),
      [
        { label: t('common.cancel'), style: 'cancel' },
        {
          label: t('orders.cancelButton'),
          style: 'destructive',
          onPress: () => cancelMutation.mutate(),
        },
      ],
    );
  }

  function handleRemoveItem(itemId: number, productName: string) {
    showAlert(
      t('orders.removeItemTitle'),
      t('orders.removeItemMsg', { name: productName }),
      [
        { label: t('common.cancel'), style: 'cancel' },
        {
          label: t('common.delete'),
          style: 'destructive',
          onPress: () => removeItemMutation.mutate(itemId),
        },
      ],
    );
  }

  async function handlePayAndComplete(method: PaymentMethod, amountPaid?: number) {
    // Save any pending meta changes before completing
    const tipNum = parseInt(localTip || '0', 10);
    const tipChanged = order && tipNum !== (order.tipAmount ?? 0);
    const customerChanged = order &&
      localCustomer !== undefined &&
      String(localCustomer?.id ?? null) !== String(order.customerId ?? null);

    if (tipChanged || customerChanged) {
      await orderApi.updateMeta(orderId, {
        tip: tipNum,
        customerId: localCustomer ? localCustomer.id : null,
        clearCustomer: localCustomer === null,
      });
    }

    payAndCompleteMutation.mutate({ method, amountPaid });
  }

  // ── Loading skeleton ──────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <View className="flex-1 bg-gray-50 dark:bg-gray-900">
        <View className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4" style={{ paddingTop: insets.top + 12, paddingBottom: 12 }}>
          <View className="flex-row items-center">
            <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} className="mr-3">
              <MaterialCommunityIcons name="chevron-left" size={26} color="#4f46e5" />
            </TouchableOpacity>
            <Skeleton height={22} width={160} borderRadius={6} style={{ flex: 1 }} />
          </View>
        </View>
        <View className="px-4 pt-4" style={{ gap: 12 }}>
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} height={72} borderRadius={16} />)}
        </View>
      </View>
    );
  }

  if (isError || !order) return <ErrorState onRetry={refetch} />;

  const statusColor = STATUS_COLOR[order.status] ?? '#6b7280';
  const statusLabel = t(`orders.${order.status.toLowerCase()}` as never) ?? order.status;

  const paymentLabelFmt = order.paymentMethod === 'CASH'
    ? `💵 ${t('orders.paymentCash')}`
    : order.paymentMethod === 'CARD'
    ? `💳 ${t('orders.paymentCard')}`
    : order.paymentMethod === 'BANK_TRANSFER'
    ? `🏦 ${t('orders.paymentBankTransfer')}`
    : order.paymentMethod;

  const isInProgress = order.status === 'IN_PROGRESS';
  const isActionable = order.status === 'PENDING' || isInProgress;
  const anyMutating = completeMutation.isPending || cancelMutation.isPending ||
    removeItemMutation.isPending || updateQtyMutation.isPending;

  const tipNum = parseInt(localTip || '0', 10);
  const displayCustomer = localCustomer !== undefined ? localCustomer : null;
  const orderTotal = order.total ?? 0;
  const displayTotal = isInProgress
    ? (orderTotal - (order.tipAmount ?? 0) + tipNum)
    : orderTotal;

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4" style={{ paddingTop: insets.top + 12, paddingBottom: 12 }}>
        <View className="flex-row items-center">
          <TouchableOpacity testID="order-detail-back-btn" onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} className="mr-3">
            <MaterialCommunityIcons name="chevron-left" size={26} color="#4f46e5" />
          </TouchableOpacity>
          <Text className={`${typo.heading} text-gray-900 dark:text-white flex-1`} numberOfLines={1}>
            #{order.orderNumber}
          </Text>
          <TouchableOpacity
            onPress={() => setReceiptVisible(true)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            className="mr-2 p-1"
          >
            <MaterialCommunityIcons name="printer-outline" size={22} color="#4f46e5" />
          </TouchableOpacity>
          <View className="px-3 py-1 rounded-full" style={{ backgroundColor: statusColor + '20' }}>
            <Text className={typo.captionBold} style={{ color: statusColor }}>{statusLabel}</Text>
          </View>
        </View>
        <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 mt-1 ml-9`}>{formatDateTime(order.createdAt)}</Text>
      </View>

      {/* ── Scrollable body ─────────────────────────────────────────────────── */}
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: isActionable ? insets.bottom + (isInProgress ? 160 : 130) : insets.bottom + 24,
        }}
      >
        {/* Order meta */}
        <View className="bg-white rounded-2xl p-4 mb-3 border border-gray-100">
          <SectionLabel title={t('orders.orderDetail')} />
          <InfoRow label={t('orders.orderNumber')} value={`#${order.orderNumber}`} />
          <InfoRow label={t('orders.createdAt')} value={formatDateTime(order.createdAt)} />
          {order.createdByName && (
            <InfoRow label={t('orders.employee')} value={order.createdByName} />
          )}

          {/* Customer row — editable when IN_PROGRESS */}
          <View className="flex-row justify-between items-center py-2 border-b border-gray-50">
            <Text className={`${typo.caption} text-gray-500 flex-shrink-0 mr-4`}>{t('orders.customer')}</Text>
            <View className="flex-row items-center flex-1 justify-end">
              <Text className={`${typo.caption} font-medium text-gray-800 mr-2 flex-shrink text-right`} numberOfLines={1}>
                {displayCustomer ? displayCustomer.name : t('orders.walkIn')}
              </Text>
              {isInProgress && (
                <TouchableOpacity
                  onPress={() => setCustomerSearchVisible(true)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <MaterialCommunityIcons name="pencil-outline" size={16} color="#4f46e5" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {order.paymentMethod && (
            <InfoRow label={t('orders.paymentMethod')} value={paymentLabelFmt} />
          )}
          {order.note && (
            <InfoRow label={t('orders.note')} value={order.note} />
          )}
        </View>

        {/* Items */}
        <View className="bg-white rounded-2xl p-4 mb-3 border border-gray-100">
          <View className="flex-row items-center justify-between mb-3">
            <SectionLabel title={`${t('orders.items')} (${order.items.length})`} />
            {isInProgress && (
              <TouchableOpacity
                className="flex-row items-center gap-x-1 bg-indigo-50 rounded-xl px-3 py-1.5"
                onPress={() => navigation.navigate('POSMain', { existingOrderId: orderId })}
                hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
              >
                <MaterialCommunityIcons name="plus" size={15} color="#4f46e5" />
                <Text className={`${typo.captionBold} text-indigo-600`}>{t('orders.addService')}</Text>
              </TouchableOpacity>
            )}
          </View>
          {order.items.map((item, idx) => (
            <View
              key={item.id ?? idx}
              className={`py-3 ${idx < order.items.length - 1 ? 'border-b border-gray-50' : ''}`}
            >
              <View className="flex-row justify-between items-start">
                <View className="flex-1 mr-3">
                  <Text className={`${typo.label} text-gray-800`} numberOfLines={2}>
                    {item.productName}
                  </Text>
                  {isInProgress && item.id ? (
                    <TouchableOpacity
                      className="flex-row items-center mt-1 self-start"
                      onPress={() => {
                        Haptics.selectionAsync();
                        setEmployeePickerItemId(item.id!);
                        setEmployeePickerCurrentId(item.assignedEmployeeId ?? null);
                      }}
                      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                    >
                      <MaterialCommunityIcons name="account-circle-outline" size={14} color="#4f46e5" style={{ marginRight: 3 }} />
                      <Text className={`${typo.caption} text-indigo-500`}>
                        {item.assignedEmployeeName ?? t('orders.noTechnician')}
                      </Text>
                      <MaterialCommunityIcons name="chevron-down" size={13} color="#a5b4fc" style={{ marginLeft: 2 }} />
                    </TouchableOpacity>
                  ) : (
                    item.assignedEmployeeName && (
                      <Text className={`${typo.caption} text-indigo-500 mt-0.5`}>
                        {item.assignedEmployeeName}
                      </Text>
                    )
                  )}
                  <Text className={`${typo.caption} text-gray-400 mt-1`}>
                    {formatVnd(item.unitPrice)} × {item.quantity}
                  </Text>
                </View>

                {isInProgress && item.id ? (
                  /* Quantity stepper + remove */
                  <View className="flex-row items-center gap-x-1">
                    <TouchableOpacity
                      className="w-7 h-7 rounded-lg bg-gray-100 items-center justify-center"
                      onPress={() => {
                        if (item.quantity <= 1) {
                          handleRemoveItem(item.id!, item.productName);
                        } else {
                          Haptics.selectionAsync();
                          updateQtyMutation.mutate({ itemId: item.id!, quantity: item.quantity - 1 });
                        }
                      }}
                      disabled={anyMutating}
                    >
                      <MaterialCommunityIcons
                        name={item.quantity <= 1 ? 'trash-can-outline' : 'minus'}
                        size={14}
                        color={item.quantity <= 1 ? '#ef4444' : '#374151'}
                      />
                    </TouchableOpacity>
                    <Text className={`${typo.label} text-gray-900 w-6 text-center`}>{item.quantity}</Text>
                    <TouchableOpacity
                      className="w-7 h-7 rounded-lg bg-indigo-100 items-center justify-center"
                      onPress={() => {
                        Haptics.selectionAsync();
                        updateQtyMutation.mutate({ itemId: item.id!, quantity: item.quantity + 1 });
                      }}
                      disabled={anyMutating}
                    >
                      <MaterialCommunityIcons name="plus" size={14} color="#4f46e5" />
                    </TouchableOpacity>
                    <Text className={`${typo.labelBold} text-gray-900 ml-1`}>{formatVnd(item.subtotal)}</Text>
                  </View>
                ) : (
                  <View className="flex-row items-center gap-x-2">
                    <Text className={`${typo.caption} text-gray-500`}>×{item.quantity}</Text>
                    <Text className={`${typo.labelBold} text-gray-900`}>{formatVnd(item.subtotal)}</Text>
                  </View>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View className="bg-white rounded-2xl p-4 mb-3 border border-gray-100">
          <SectionLabel title={t('orders.total')} />

          {(order.discount > 0 || (order.tipAmount != null && order.tipAmount > 0)) && (
            <View className="flex-row justify-between py-2 border-b border-gray-50">
              <Text className={`${typo.caption} text-gray-500`}>{t('orders.subtotal')}</Text>
              <Text className={`${typo.caption} text-gray-700`}>{formatVnd(order.subtotal)}</Text>
            </View>
          )}

          {order.discount > 0 && (
            <View className="flex-row justify-between py-2 border-b border-gray-50">
              <Text className={`${typo.caption} text-gray-500`}>{t('orders.discount')}</Text>
              <Text className={`${typo.caption} font-semibold`} style={{ color: '#f59e0b' }}>
                -{formatVnd(order.discount)}
              </Text>
            </View>
          )}

          {/* Tip row — editable when IN_PROGRESS */}
          {isInProgress ? (
            <View className="py-2 border-b border-gray-50">
              <View className="flex-row justify-between items-center mb-2">
                <Text className={`${typo.caption} text-gray-500`}>{t('orders.editTip')}</Text>
                {tipNum > 0 && (
                  <Text className={`${typo.captionBold} text-emerald-600`}>+{formatVnd(tipNum)}</Text>
                )}
              </View>
              <View className="flex-row gap-x-2 items-center">
                {TIP_AMOUNTS.map((amount) => {
                  const selected = tipNum === amount && !showCustomTip;
                  return (
                    <TouchableOpacity
                      key={amount}
                      className={`flex-1 py-2 rounded-xl border items-center ${
                        selected ? 'bg-emerald-500 border-emerald-500' : 'bg-white border-gray-200'
                      }`}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setLocalTip(selected ? '0' : String(amount));
                        setShowCustomTip(false);
                      }}
                    >
                      <Text className={`${typo.captionBold} ${selected ? 'text-white' : 'text-gray-600'}`}>
                        {`${amount / 1_000}k`}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity
                  onPress={() => { Haptics.selectionAsync(); setShowCustomTip((v) => !v); }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  className={`w-8 h-8 rounded-xl border items-center justify-center ${
                    showCustomTip ? 'bg-emerald-50 border-emerald-300' : 'bg-white border-gray-200'
                  }`}
                >
                  <MaterialCommunityIcons
                    name="pencil-outline"
                    size={15}
                    color={showCustomTip ? '#059669' : '#6b7280'}
                  />
                </TouchableOpacity>
              </View>
              {showCustomTip && (
                <View className="mt-2">
                  <MoneyInput
                    rawValue={localTip}
                    onChangeRaw={setLocalTip}
                    placeholder="0"
                    autoFocus
                    onBlur={() => setShowCustomTip(false)}
                  />
                </View>
              )}
            </View>
          ) : (
            order.tipAmount != null && order.tipAmount > 0 && (
              <View className="flex-row justify-between py-2 border-b border-gray-50">
                <Text className={`${typo.caption} text-gray-500`}>{t('barber.tip')}</Text>
                <Text className={`${typo.caption} font-semibold text-emerald-600`}>
                  +{formatVnd(order.tipAmount)}
                </Text>
              </View>
            )
          )}

          <View className="bg-indigo-50 rounded-2xl px-4 py-3 mt-1 flex-row justify-between items-center">
            <Text className={`${typo.label} text-indigo-700`}>{t('orders.total')}</Text>
            <Text className={`${typo.heading} font-bold text-indigo-600`}>{formatVnd(displayTotal)}</Text>
          </View>

          {!isInProgress && order.paymentMethod === 'CASH' && order.amountPaid != null && (
            <View className="border-t border-gray-100 pt-3 mt-1" style={{ gap: 8 }}>
              <View className="flex-row justify-between">
                <Text className={`${typo.caption} text-gray-500`}>{t('orders.amountPaid')}</Text>
                <Text className={`${typo.caption} font-medium text-gray-700`}>{formatVnd(order.amountPaid)}</Text>
              </View>
              {order.changeAmount != null && order.changeAmount > 0 && (
                <View className="flex-row justify-between">
                  <Text className={`${typo.caption} text-gray-500`}>{t('orders.changeAmount')}</Text>
                  <Text className={`${typo.caption} font-semibold`} style={{ color: '#4f46e5' }}>
                    {formatVnd(order.changeAmount)}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Cancellation details */}
        {order.status === 'CANCELLED' && (order.cancelReason || order.cancelledBy || order.cancelledAt) && (
          <View
            className="rounded-2xl p-4 mb-3 border"
            style={{ backgroundColor: '#fff1f2', borderColor: '#fecdd3' }}
          >
            <View className="flex-row items-center mb-3">
              <MaterialCommunityIcons name="close-circle-outline" size={15} color="#ef4444" style={{ marginRight: 5 }} />
              <Text className={`${typo.captionBold} uppercase tracking-wide`} style={{ color: '#ef4444' }}>
                {t('orders.cancelButton')}
              </Text>
            </View>
            {order.cancelReason && (
              <View className="mb-2">
                <Text className={`${typo.caption} text-red-400`}>{t('orders.cancelReason')}</Text>
                <Text className={`${typo.caption} font-medium text-red-700 mt-0.5`}>{order.cancelReason}</Text>
              </View>
            )}
            {order.cancelledBy && (
              <View className="mb-2">
                <Text className={`${typo.caption} text-red-400`}>{t('orders.cancelledBy')}</Text>
                <Text className={`${typo.caption} font-medium text-red-700 mt-0.5`}>{order.cancelledBy}</Text>
              </View>
            )}
            {order.cancelledAt && (
              <View>
                <Text className={`${typo.caption} text-red-400`}>{t('orders.cancelledAt')}</Text>
                <Text className={`${typo.caption} font-medium text-red-700 mt-0.5`}>
                  {formatDateTime(order.cancelledAt)}
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* ── Sticky action footer ─────────────────────────────────────────────── */}
      {isActionable && (
        <View
          className="bg-white border-t border-gray-100 px-4 pt-3"
          style={{ paddingBottom: insets.bottom + 16, gap: 8 }}
        >
          {isInProgress ? (
            <>
              {/* Pay & Complete */}
              <TouchableOpacity
                testID="order-pay-complete-btn"
                onPress={() => setPaymentSheetVisible(true)}
                disabled={anyMutating || payAndCompleteMutation.isPending || order.items.length === 0}
                activeOpacity={0.8}
                className="rounded-2xl py-4 items-center flex-row justify-center bg-primary"
              >
                <MaterialCommunityIcons name="cash-multiple" size={20} color="white" style={{ marginRight: 6 }} />
                <Text className={`${typo.labelBold} text-white`}>
                  {t('orders.payAndComplete')} · {formatVnd(displayTotal)}
                </Text>
              </TouchableOpacity>

              {/* Save Changes + Cancel on same row */}
              <View className="flex-row gap-x-2">
                <TouchableOpacity
                  onPress={() => saveMetaMutation.mutate()}
                  disabled={anyMutating || saveMetaMutation.isPending}
                  activeOpacity={0.8}
                  className="flex-1 rounded-2xl py-3.5 items-center flex-row justify-center border border-indigo-200 bg-indigo-50"
                >
                  {saveMetaMutation.isPending ? (
                    <>
                      <ActivityIndicator color="#4f46e5" style={{ marginRight: 8 }} size="small" />
                      <Text className={`${typo.label} text-indigo-600`}>{t('orders.saving')}</Text>
                    </>
                  ) : (
                    <>
                      <MaterialCommunityIcons name="content-save-outline" size={17} color="#4f46e5" style={{ marginRight: 6 }} />
                      <Text className={`${typo.label} text-indigo-600`}>{t('orders.saveChanges')}</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  testID="order-cancel-btn"
                  onPress={handleCancel}
                  disabled={anyMutating}
                  activeOpacity={0.8}
                  className="flex-1 rounded-2xl py-3.5 items-center flex-row justify-center border border-red-200"
                  style={{ backgroundColor: '#fff1f2' }}
                >
                  {cancelMutation.isPending ? (
                    <>
                      <ActivityIndicator color="#ef4444" style={{ marginRight: 8 }} />
                      <Text className={typo.label} style={{ color: '#ef4444' }}>
                        {t('orders.cancelling')}
                      </Text>
                    </>
                  ) : (
                    <>
                      <MaterialCommunityIcons name="close-circle-outline" size={18} color="#ef4444" style={{ marginRight: 6 }} />
                      <Text className={typo.label} style={{ color: '#ef4444' }}>
                        {t('orders.cancelButton')}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </>
          ) : (
            /* PENDING: Complete */
            <TouchableOpacity
              testID="order-complete-btn"
              onPress={() => completeMutation.mutate()}
              disabled={anyMutating}
              activeOpacity={0.8}
              className={`rounded-2xl py-4 items-center flex-row justify-center ${anyMutating && completeMutation.isPending ? 'bg-gray-300' : 'bg-primary'}`}
            >
              {completeMutation.isPending ? (
                <>
                  <ActivityIndicator color="#fff" style={{ marginRight: 8 }} />
                  <Text className={`${typo.labelBold} text-white`}>{t('orders.completing')}</Text>
                </>
              ) : (
                <>
                  <MaterialCommunityIcons name="check-circle-outline" size={20} color="white" style={{ marginRight: 6 }} />
                  <Text className={`${typo.labelBold} text-white`}>{t('orders.completeButton')}</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* Cancel for PENDING (standalone) */}
          {!isInProgress && (
            <TouchableOpacity
              testID="order-cancel-btn"
              onPress={handleCancel}
              disabled={anyMutating}
              activeOpacity={0.8}
              className="rounded-2xl py-3 items-center flex-row justify-center border border-red-200"
              style={{ backgroundColor: '#fff1f2' }}
            >
              {cancelMutation.isPending ? (
                <>
                  <ActivityIndicator color="#ef4444" style={{ marginRight: 8 }} />
                  <Text className={typo.label} style={{ color: '#ef4444' }}>
                    {t('orders.cancelling')}
                  </Text>
                </>
              ) : (
                <>
                  <MaterialCommunityIcons name="close-circle-outline" size={18} color="#ef4444" style={{ marginRight: 6 }} />
                  <Text className={typo.label} style={{ color: '#ef4444' }}>
                    {t('orders.cancelButton')}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ── Payment sheet for IN_PROGRESS orders ────────────────────────────── */}
      <PaymentSheet
        visible={paymentSheetVisible}
        total={displayTotal}
        initialMethod={order.paymentMethod}
        onClose={() => setPaymentSheetVisible(false)}
        onConfirm={handlePayAndComplete}
        paying={payAndCompleteMutation.isPending}
      />

      {/* ── Customer search modal ────────────────────────────────────────────── */}
      <CustomerSearchModal
        visible={customerSearchVisible}
        currentCustomerId={order.customerId}
        onClose={() => setCustomerSearchVisible(false)}
        onSelect={(customer) => {
          setLocalCustomer(customer ? { id: customer.id, name: customer.name } : null);
        }}
      />

      {/* ── Employee picker modal ────────────────────────────────────────────── */}
      <EmployeePickerModal
        visible={employeePickerItemId !== null}
        currentEmployeeId={employeePickerCurrentId}
        onClose={() => setEmployeePickerItemId(null)}
        onSelect={(employee) => {
          if (employeePickerItemId !== null) {
            updateEmployeeMutation.mutate({ itemId: employeePickerItemId, employee });
          }
          setEmployeePickerItemId(null);
        }}
      />

      {/* ── Receipt preview ──────────────────────────────────────────────────── */}
      <ReceiptModal
        visible={receiptVisible}
        order={order}
        onClose={() => setReceiptVisible(false)}
      />
    </View>
  );
}
