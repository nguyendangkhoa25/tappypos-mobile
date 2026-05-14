import { useState, useEffect, useRef, useMemo } from 'react';
import * as Clipboard from 'expo-clipboard';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  productApi,
  cartApi,
  orderApi,
  employeeApi,
  customerApi,
  categoryApi,
  shopConfigApi,
  loyaltyApi,
  type ProductData,
  type EmployeeData,
  type CustomerData,
  type CategoryData,
  type BankAccount,
  type LoyaltyProgramDTO,
  type CheckInPayload,
} from '../../services/api';
import { buildVietQrUrl } from '../../utils/vietqr';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAlertStore } from '../../store/alertStore';

const LAST_PAYMENT_KEY = 'last_payment_method';
const GRID_PREF_KEY = 'pos_grid_columns';
const LAST_QR_BANK_KEY = 'last_qr_bank_id';
import { formatVnd } from '../../utils/format';
import { PAGE_SIZE } from '../../utils/constants';
import { getQuickPhrases } from '../../utils/quickPhrases';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { Skeleton } from '../../components/Skeleton';
import { QuickPhraseBar } from '../../components/QuickPhraseBar';
import { useFeatureCheck } from '../../hooks/useFeature';
import { useSellingStore } from '../../store/sellingStore';
import type { SellingScreenProps } from '../../types/navigation';

const BARBER_PHRASES = getQuickPhrases('BARBER_SHOP');
const TIP_AMOUNTS = [10_000, 20_000, 50_000, 100_000];

type CheckoutPayload = {
  customer: CustomerData | null;
  paymentMethod: PaymentMethod;
  note: string;
  amountPaid?: number;
  tip: number;
  promoCode: string;
  loyaltyPointsToRedeem: number;
};

type CartItem = {
  key: string;
  product: ProductData;
  quantity: number;
  employee: EmployeeData | null;
  note: string;
};

type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'CARD';

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function fmtDuration(minutes: number, t: (k: string, opts?: Record<string, unknown>) => string): string {
  if (!minutes) return '';
  if (minutes < 60) return t('barber.duration', { minutes });
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}g ${m}p` : `${h}g`;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ── Queue Status Badge ────────────────────────────────────────────────────────

function QueueStatusBadge({ pending, inProgress }: { pending: number; inProgress: number }) {
  const { t } = useTranslation();
  if (pending === 0 && inProgress === 0) return null;
  return (
    <View className="flex-row items-center gap-x-2 mt-0.5 mb-1">
      {pending > 0 && (
        <View className="flex-row items-center gap-x-1 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">
          <View className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          <Text className="text-amber-700 dark:text-amber-400 text-xs font-medium">
            {pending} {t('barber.statusWaiting')}
          </Text>
        </View>
      )}
      {inProgress > 0 && (
        <View className="flex-row items-center gap-x-1 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-0.5 rounded-full">
          <View className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
          <Text className="text-indigo-700 dark:text-indigo-400 text-xs font-medium">
            {inProgress} {t('barber.statusWorking')}
          </Text>
        </View>
      )}
    </View>
  );
}

// ── Service Card ──────────────────────────────────────────────────────────────

function ServiceCard({ item, onPress }: { item: ProductData; onPress: (item: ProductData) => void }) {
  const { t } = useTranslation();
  return (
    <TouchableOpacity
      className="flex-1 bg-white dark:bg-gray-800 m-1.5 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 active:opacity-75"
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress(item);
      }}
    >
      <Text className="font-semibold text-gray-800 text-sm leading-tight" numberOfLines={2}>
        {item.name}
      </Text>
      {item.durationMinutes > 0 && (
        <View className="flex-row items-center mt-2 gap-x-1">
          <MaterialCommunityIcons name="clock-outline" size={13} color="#6b7280" />
          <Text className="text-xs text-gray-500">{fmtDuration(item.durationMinutes, t)}</Text>
        </View>
      )}
      <View className="flex-row justify-between items-center mt-2">
        {item.dynamicPrice ? (
          <Text className="text-xs font-semibold text-warning">{t('pos.goldPrice')}</Text>
        ) : (
          <Text className="text-sm font-bold text-indigo-600">{formatVnd(item.price)}</Text>
        )}
        <View className="bg-indigo-50 rounded-full p-1">
          <MaterialCommunityIcons name="plus" size={16} color="#4f46e5" />
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── Employee Chip ─────────────────────────────────────────────────────────────

function EmployeeChip({
  employee,
  selected,
  onPress,
}: {
  employee: EmployeeData;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity className="items-center mr-3" onPress={onPress} activeOpacity={0.7}>
      <View
        className={`w-12 h-12 rounded-full items-center justify-center mb-1 ${
          selected ? 'bg-indigo-600' : 'bg-gray-100'
        }`}
      >
        <Text className={`text-sm font-bold ${selected ? 'text-white' : 'text-gray-600'}`}>
          {initials(employee.fullName)}
        </Text>
      </View>
      <Text
        className={`text-xs text-center max-w-[56px] ${
          selected ? 'text-indigo-600 font-semibold' : 'text-gray-500'
        }`}
        numberOfLines={2}
      >
        {employee.fullName.split(' ').pop()}
      </Text>
    </TouchableOpacity>
  );
}

// ── Customer Row ──────────────────────────────────────────────────────────────

function CustomerRow({ customer, onPress }: { customer: CustomerData; onPress: () => void }) {
  return (
    <TouchableOpacity
      className="flex-row items-center px-3 py-2.5 border-b border-gray-50 active:bg-gray-50"
      onPress={onPress}
    >
      <View className="w-8 h-8 rounded-full bg-indigo-100 items-center justify-center mr-3">
        <Text className="text-xs font-bold text-indigo-600">{initials(customer.name)}</Text>
      </View>
      <View className="flex-1">
        <Text className="text-sm font-medium text-gray-900">{customer.name}</Text>
        <Text className="text-xs text-gray-500">{customer.phone}</Text>
      </View>
      {customer.totalOrders > 0 && (
        <Text className="text-xs text-gray-400">{customer.totalOrders} lần</Text>
      )}
    </TouchableOpacity>
  );
}

// ── Preferences Banner ────────────────────────────────────────────────────────

function PreferencesBanner({ customer, t }: { customer: CustomerData; t: (k: string) => string }) {
  const hasPrefs = customer.allergiesOrSensitivities || customer.hairType || customer.preferredServices;
  if (!hasPrefs) return null;
  return (
    <View className="rounded-xl border border-gray-100 overflow-hidden mb-2">
      {customer.allergiesOrSensitivities ? (
        <View className="flex-row items-start gap-2 bg-rose-50 px-3 py-2">
          <MaterialCommunityIcons name="alert-circle" size={14} color="#e11d48" style={{ marginTop: 1 }} />
          <View className="flex-1">
            <Text className="text-[10px] font-bold text-rose-600 uppercase tracking-wide">
              {t('customer.allergies')}
            </Text>
            <Text className="text-xs text-rose-800 mt-0.5" numberOfLines={2}>
              {customer.allergiesOrSensitivities}
            </Text>
          </View>
        </View>
      ) : null}
      {customer.hairType ? (
        <View className="flex-row items-start gap-2 bg-white px-3 py-2 border-t border-gray-50">
          <MaterialCommunityIcons name="content-cut" size={14} color="#6b7280" style={{ marginTop: 1 }} />
          <View className="flex-1">
            <Text className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
              {t('customer.hairType')}
            </Text>
            <Text className="text-xs text-gray-700 mt-0.5" numberOfLines={1}>
              {customer.hairType}
            </Text>
          </View>
        </View>
      ) : null}
      {customer.preferredServices ? (
        <View className="flex-row items-start gap-2 bg-white px-3 py-2 border-t border-gray-50">
          <MaterialCommunityIcons name="star-outline" size={14} color="#6b7280" style={{ marginTop: 1 }} />
          <View className="flex-1">
            <Text className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
              {t('customer.preferredServices')}
            </Text>
            <Text className="text-xs text-gray-700 mt-0.5" numberOfLines={2}>
              {customer.preferredServices}
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

// ── Add Item Sheet ────────────────────────────────────────────────────────────

function AddItemSheet({
  product,
  employees,
  onAdd,
  onClose,
}: {
  product: ProductData | null;
  employees: EmployeeData[];
  onAdd: (note: string, employee: EmployeeData | null, quantity: number) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [note, setNote] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeData | null>(null);
  const [isNoteFocused, setIsNoteFocused] = useState(false);
  const noteRef = useRef<TextInput>(null);

  const isService = (product?.durationMinutes ?? 0) > 0;

  useEffect(() => {
    if (product) {
      setNote('');
      setQuantity(1);
      setSelectedEmployee(null);
      setIsNoteFocused(false);
      setTimeout(() => noteRef.current?.focus(), 300);
    }
  }, [product?.id]);

  const handleEmployeePress = (emp: EmployeeData) => {
    Haptics.selectionAsync();
    setSelectedEmployee((prev) => (prev?.id === emp.id ? null : emp));
  };

  return (
    <Modal visible={!!product} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity className="flex-1 bg-black/40" activeOpacity={1} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View className="bg-white rounded-t-3xl px-5 pt-4 pb-8">
          <View className="w-10 h-1 bg-gray-200 rounded-full self-center mb-4" />

          {product && (
            <>
              {/* Item info */}
              <View className="flex-row justify-between items-start mb-4">
                <View className="flex-1 mr-3">
                  <Text className="text-lg font-bold text-gray-900">{product.name}</Text>
                  {isService && product.durationMinutes > 0 && (
                    <View className="flex-row items-center mt-1 gap-x-1">
                      <MaterialCommunityIcons name="clock-outline" size={14} color="#6b7280" />
                      <Text className="text-sm text-gray-500">
                        {fmtDuration(product.durationMinutes, t)}
                      </Text>
                    </View>
                  )}
                </View>
                <Text className="text-lg font-bold text-indigo-600">{formatVnd(product.price)}</Text>
              </View>

              {/* Quantity stepper — retail products only */}
              {!isService && (
                <View className="flex-row items-center justify-between bg-gray-50 rounded-2xl px-4 py-3 mb-4">
                  <Text className="text-sm font-medium text-gray-700">{t('barber.quantityLabel')}</Text>
                  <View className="flex-row items-center gap-x-3">
                    <TouchableOpacity
                      onPress={() => setQuantity((q) => Math.max(1, q - 1))}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      className="w-8 h-8 rounded-full bg-gray-200 items-center justify-center"
                    >
                      <MaterialCommunityIcons name="minus" size={18} color="#374151" />
                    </TouchableOpacity>
                    <Text className="text-lg font-bold text-gray-900 w-8 text-center">{quantity}</Text>
                    <TouchableOpacity
                      onPress={() => setQuantity((q) => q + 1)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      className="w-8 h-8 rounded-full bg-indigo-600 items-center justify-center"
                    >
                      <MaterialCommunityIcons name="plus" size={18} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Employee picker — services only */}
              {isService && employees.length > 0 && (
                <View className="mb-4">
                  <View className="flex-row items-center mb-2">
                    <Text className="text-sm font-medium text-gray-700">
                      {t('barber.assignLabel')}
                    </Text>
                    <Text className="text-xs text-gray-400 ml-1">({t('barber.optional')})</Text>
                  </View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingVertical: 4 }}
                  >
                    {employees.map((emp) => (
                      <EmployeeChip
                        key={emp.id}
                        employee={emp}
                        selected={selectedEmployee?.id === emp.id}
                        onPress={() => handleEmployeePress(emp)}
                      />
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Note input */}
              <Text className="text-sm font-medium text-gray-700 mb-2">
                {t('barber.noteLabel')}
              </Text>
              <QuickPhraseBar
                phrases={BARBER_PHRASES}
                visible={isNoteFocused}
                onSelect={(phrase) =>
                  setNote((prev) => (prev.trim() ? `${prev.trim()} ${phrase}` : phrase))
                }
              />
              <TextInput
                ref={noteRef}
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 text-sm min-h-[80px]"
                placeholder={t('barber.notePlaceholder')}
                placeholderTextColor="#9ca3af"
                value={note}
                onChangeText={setNote}
                onFocus={() => setIsNoteFocused(true)}
                onBlur={() => setIsNoteFocused(false)}
                multiline
                textAlignVertical="top"
                maxLength={200}
              />

              {/* Action buttons */}
              <View className="flex-row gap-x-3 mt-5">
                <TouchableOpacity
                  className="flex-1 border border-gray-200 rounded-2xl py-3.5 items-center"
                  onPress={onClose}
                >
                  <Text className="font-semibold text-gray-600">{t('barber.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="bg-indigo-600 rounded-2xl py-3.5 items-center"
                  style={{ flex: 2 }}
                  onPress={() => onAdd(note, selectedEmployee, quantity)}
                >
                  <Text className="font-bold text-white">{t('barber.addToOrder')}</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Cart Bar ──────────────────────────────────────────────────────────────────

function CartBar({
  cartItems,
  onClear,
  onCheckout,
}: {
  cartItems: CartItem[];
  onClear: () => void;
  onCheckout: () => void;
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const total = cartItems.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const names = cartItems.map((i) => i.product.name).join(', ');
  const uniqueTechCount = new Set(cartItems.map((i) => i.employee?.id).filter(Boolean)).size;
  const isSplitSession = uniqueTechCount >= 2;

  if (cartItems.length === 0) return null;

  return (
    <View
      className="absolute bottom-0 left-0 right-0 bg-indigo-600 px-4 pt-3"
      style={{ paddingBottom: insets.bottom + 12 }}
    >
      {/* Split-session indicator strip */}
      {isSplitSession && (
        <View className="flex-row items-center gap-1.5 mb-2">
          <MaterialCommunityIcons name="account-multiple-outline" size={13} color="rgba(255,255,255,0.85)" />
          <Text className="text-xs text-white/80 font-semibold">
            {t('barber.splitSession', { count: uniqueTechCount })} · {t('barber.splitSessionHint')}
          </Text>
        </View>
      )}
      <View className="flex-row items-center">
        <View className="w-6 h-6 rounded-full bg-white items-center justify-center mr-2.5">
          <Text className="text-indigo-600 text-xs font-bold">{cartItems.length}</Text>
        </View>
        <View className="flex-1 mr-3">
          <Text className="text-white text-xs opacity-80" numberOfLines={1}>{names}</Text>
          <Text className="text-white text-sm font-bold">{formatVnd(total)}</Text>
        </View>
        <TouchableOpacity
          className="p-2 mr-1"
          onPress={onClear}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialCommunityIcons name="trash-can-outline" size={20} color="rgba(255,255,255,0.65)" />
        </TouchableOpacity>
        <TouchableOpacity
          className="bg-white rounded-2xl px-4 py-2.5"
          onPress={onCheckout}
          activeOpacity={0.85}
        >
          <Text className="text-indigo-600 font-bold text-sm">{t('barber.checkout')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Checkout Sheet ────────────────────────────────────────────────────────────

function CheckoutSheet({
  visible,
  cartItems,
  hasCustomer,
  hasLoyalty,
  banks,
  checkoutError,
  onDismissError,
  onRemoveItem,
  onClose,
  onConfirm,
  creating,
  initialCustomer,
}: {
  visible: boolean;
  cartItems: CartItem[];
  hasCustomer: boolean;
  hasLoyalty: boolean;
  banks: BankAccount[];
  checkoutError: string;
  onDismissError: () => void;
  onRemoveItem: (key: string) => void;
  onClose: () => void;
  onConfirm: (payload: CheckoutPayload) => void;
  creating: boolean;
  initialCustomer?: CustomerData | null;
  onCustomerChange?: (c: CustomerData | null) => void;
}) {
  const { t } = useTranslation();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [tip, setTip] = useState(0);
  const [cashReceived, setCashReceived] = useState('');
  const [orderNote, setOrderNote] = useState('');
  const [isOrderNoteFocused, setIsOrderNoteFocused] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerData | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState('');
  const [redeemPoints, setRedeemPoints] = useState(false);
  const [selectedBankId, setSelectedBankId] = useState<number | null>(null);

  const debouncedSearch = useDebounce(customerSearch, 350);

  useEffect(() => {
    if (visible) {
      AsyncStorage.getItem(LAST_PAYMENT_KEY).then((saved) => {
        if (saved === 'CASH' || saved === 'BANK_TRANSFER') {
          setPaymentMethod(saved as PaymentMethod);
        }
      });
      AsyncStorage.getItem(LAST_QR_BANK_KEY).then((saved) => {
        setSelectedBankId(saved ? Number(saved) : null);
      });
      if (initialCustomer) setSelectedCustomer(initialCustomer);
    } else {
      setPaymentMethod('CASH');
      setTip(0);
      setCashReceived('');
      setOrderNote('');
      setIsOrderNoteFocused(false);
      setSelectedCustomer(null);
      setCustomerSearch('');
      setPromoInput('');
      setAppliedPromo('');
      setRedeemPoints(false);
    }
  }, [visible]);

  const { data: loyaltyProgram } = useQuery<LoyaltyProgramDTO>({
    queryKey: ['loyalty', 'program'],
    queryFn: () => loyaltyApi.getProgram().then((r) => r.data.data),
    staleTime: 10 * 60_000,
    enabled: visible && hasLoyalty,
  });

  const { data: recentCustomers = [] } = useQuery({
    queryKey: ['customers', 'recent'],
    queryFn: () => customerApi.recent(6).then((r) => r.data.data),
    staleTime: 2 * 60_000,
    enabled: visible && hasCustomer,
  });

  const { data: searchResults = [], isFetching: searching } = useQuery({
    queryKey: ['customers', 'search', debouncedSearch],
    queryFn: () =>
      customerApi.list({ search: debouncedSearch, size: 5 }).then((r) => r.data.data.content),
    staleTime: 30_000,
    enabled: visible && hasCustomer && debouncedSearch.length >= 2,
  });

  const itemsTotal = cartItems.reduce((s, i) => s + i.product.price * i.quantity, 0);

  const customerPoints = selectedCustomer?.points ?? 0;
  const canRedeem =
    hasLoyalty &&
    !!loyaltyProgram?.isActive &&
    customerPoints >= (loyaltyProgram?.minRedemptionPoints ?? 1);
  const pointsDiscount = canRedeem && redeemPoints && loyaltyProgram
    ? Math.floor(customerPoints / loyaltyProgram.redemptionPointsPerDiscount) *
      loyaltyProgram.redemptionDiscountAmount
    : 0;

  const effectiveTotal = Math.max(0, itemsTotal + tip - pointsDiscount);

  const activeBank =
    (selectedBankId ? banks.find((b) => b.id === selectedBankId) : null) ??
    banks.find((b) => b.isDefault) ??
    banks[0] ??
    null;

  const handleBankSelect = (id: number) => {
    Haptics.selectionAsync();
    setSelectedBankId(id);
    AsyncStorage.setItem(LAST_QR_BANK_KEY, String(id));
  };

  const qrDescription = useMemo(() => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const mo = String(now.getMonth() + 1).padStart(2, '0');
    return `TAPPYPOS ${hh}:${mm} ${dd}/${mo}`;
  }, [paymentMethod]);

  const cashReceivedNum = parseFloat(cashReceived.replace(/[^0-9]/g, '')) || 0;
  const cashDelta = cashReceivedNum - effectiveTotal;
  const showSearchResults = debouncedSearch.length >= 2;
  const showRecent = !showSearchResults && !selectedCustomer && recentCustomers.length > 0;

  const paymentOptions: { value: PaymentMethod; label: string }[] = [
    { value: 'CASH', label: t('barber.paymentCash') },
    { value: 'BANK_TRANSFER', label: t('barber.paymentTransfer') },
    { value: 'CARD', label: t('barber.paymentCard') },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity className="flex-1 bg-black/40" activeOpacity={1} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View className="bg-white rounded-t-3xl px-5 pt-4 pb-8" style={{ maxHeight: '88%' }}>
          <View className="w-10 h-1 bg-gray-200 rounded-full self-center mb-4" />
          <Text className="text-lg font-bold text-gray-900 mb-4">{t('barber.checkoutTitle')}</Text>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Split-session summary — shown when 2+ technicians are in the cart */}
            {(() => {
              const techMap = new Map<string, { name: string; items: CartItem[] }>();
              for (const ci of cartItems) {
                if (!ci.employee) continue;
                const key = ci.employee.id;
                if (!techMap.has(key)) techMap.set(key, { name: ci.employee.fullName, items: [] });
                techMap.get(key)!.items.push(ci);
              }
              if (techMap.size < 2) return null;
              return (
                <View className="bg-teal-50 rounded-2xl px-3 py-2.5 mb-3 flex-row flex-wrap gap-x-3 gap-y-1.5">
                  <View className="flex-row items-center gap-1.5 w-full mb-0.5">
                    <MaterialCommunityIcons name="account-multiple-outline" size={14} color="#0d9488" />
                    <Text className="text-xs font-bold text-teal-700">{t('barber.splitSessionHint')}</Text>
                  </View>
                  {Array.from(techMap.values()).map(({ name, items: techItems }) => (
                    <View key={name} className="flex-row items-center gap-1">
                      <View className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                      <Text className="text-xs text-teal-700 font-semibold">{name.split(' ').pop()}</Text>
                      <Text className="text-xs text-teal-500">({techItems.map(i => i.product.name).join(', ')})</Text>
                    </View>
                  ))}
                </View>
              );
            })()}

            {/* Cart items */}
            {cartItems.map((item) => (
              <View key={item.key} className="flex-row items-start py-3 border-b border-gray-50">
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-gray-900">{item.product.name}</Text>
                  {item.employee && (
                    <Text className="text-xs text-indigo-600 mt-0.5">
                      {item.employee.fullName.split(' ').pop()}
                    </Text>
                  )}
                  {!!item.note && (
                    <Text className="text-xs text-gray-400 mt-0.5">{item.note}</Text>
                  )}
                  {item.quantity > 1 && (
                    <Text className="text-xs text-gray-500 mt-0.5">×{item.quantity}</Text>
                  )}
                </View>
                <Text className="text-sm font-bold text-indigo-600 mr-3 mt-0.5">
                  {formatVnd(item.product.price * item.quantity)}
                </Text>
                <TouchableOpacity
                  onPress={() => onRemoveItem(item.key)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <MaterialCommunityIcons name="close-circle" size={20} color="#d1d5db" />
                </TouchableOpacity>
              </View>
            ))}

            {/* Totals */}
            <View className="py-3 mb-1">
              {(tip > 0 || pointsDiscount > 0) ? (
                <>
                  <View className="flex-row justify-between items-center mb-1">
                    <Text className="text-sm text-gray-500">{t('barber.subtotal')}</Text>
                    <Text className="text-sm text-gray-600">{formatVnd(itemsTotal)}</Text>
                  </View>
                  {tip > 0 && (
                    <View className="flex-row justify-between items-center mb-1">
                      <Text className="text-sm text-gray-500">{t('barber.tip')}</Text>
                      <Text className="text-sm text-emerald-600 font-medium">+{formatVnd(tip)}</Text>
                    </View>
                  )}
                  {pointsDiscount > 0 && (
                    <View className="flex-row justify-between items-center mb-1">
                      <Text className="text-sm text-gray-500">{t('barber.pointsDiscount')}</Text>
                      <Text className="text-sm text-amber-600 font-medium">-{formatVnd(pointsDiscount)}</Text>
                    </View>
                  )}
                  <View className="flex-row justify-between items-center pt-2 border-t border-gray-100">
                    <Text className="text-base font-bold text-gray-900">{t('barber.totalDue')}</Text>
                    <Text className="text-base font-bold text-indigo-600">{formatVnd(effectiveTotal)}</Text>
                  </View>
                </>
              ) : (
                <View className="flex-row justify-between items-center">
                  <Text className="text-base font-bold text-gray-900">{t('barber.orderTotal')}</Text>
                  <Text className="text-base font-bold text-indigo-600">{formatVnd(itemsTotal)}</Text>
                </View>
              )}
            </View>

            {/* Promo code */}
            {!appliedPromo ? (
              <View className="flex-row gap-x-2 mb-4">
                <TextInput
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800"
                  placeholder={t('pos.promoCode')}
                  placeholderTextColor="#9ca3af"
                  value={promoInput}
                  onChangeText={setPromoInput}
                  autoCapitalize="characters"
                  returnKeyType="done"
                />
                <TouchableOpacity
                  className="bg-gray-100 rounded-xl px-4 py-3 items-center justify-center active:opacity-70"
                  onPress={() => {
                    const code = promoInput.trim();
                    if (!code) return;
                    Haptics.selectionAsync();
                    setAppliedPromo(code);
                    setPromoInput('');
                  }}
                >
                  <Text className="text-indigo-600 font-semibold text-sm">{t('pos.applyPromo')}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View className="flex-row items-center bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 mb-4">
                <MaterialCommunityIcons name="tag-outline" size={16} color="#4f46e5" />
                <Text className="flex-1 ml-2 text-indigo-700 font-semibold text-sm">{appliedPromo}</Text>
                <TouchableOpacity
                  onPress={() => setAppliedPromo('')}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <MaterialCommunityIcons name="close" size={16} color="#4f46e5" />
                </TouchableOpacity>
              </View>
            )}

            {/* Tip chips */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-2">{t('barber.tipLabel')}</Text>
              <View className="flex-row gap-x-2">
                {TIP_AMOUNTS.map((amount) => {
                  const selected = tip === amount;
                  return (
                    <TouchableOpacity
                      key={amount}
                      className={`flex-1 py-2 rounded-xl border items-center ${
                        selected ? 'bg-emerald-500 border-emerald-500' : 'bg-white border-gray-200'
                      }`}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setTip(selected ? 0 : amount);
                      }}
                    >
                      <Text className={`text-xs font-semibold ${selected ? 'text-white' : 'text-gray-600'}`}>
                        {amount >= 1_000 ? `${amount / 1_000}k` : String(amount)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Customer picker */}
            {hasCustomer && (
              <View className="mb-4">
                <View className="flex-row items-center mb-2">
                  <Text className="text-sm font-medium text-gray-700">
                    {t('barber.customerLabel')}
                  </Text>
                  <Text className="text-xs text-gray-400 ml-1">({t('barber.optional')})</Text>
                </View>

                {selectedCustomer ? (
                  <>
                    <View className="flex-row items-center bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2.5">
                      <View className="w-8 h-8 rounded-full bg-indigo-100 items-center justify-center mr-2.5">
                        <Text className="text-xs font-bold text-indigo-600">
                          {initials(selectedCustomer.name)}
                        </Text>
                      </View>
                      <View className="flex-1">
                        <Text className="text-sm font-semibold text-gray-900">
                          {selectedCustomer.name}
                        </Text>
                        <Text className="text-xs text-gray-500">{selectedCustomer.phone}</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => { setSelectedCustomer(null); onCustomerChange?.(null); }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <MaterialCommunityIcons name="close-circle" size={20} color="#9ca3af" />
                      </TouchableOpacity>
                    </View>
                    {(selectedCustomer.allergiesOrSensitivities || selectedCustomer.hairType || selectedCustomer.preferredServices) && (
                      <View className="mt-2 rounded-xl border border-gray-100 overflow-hidden">
                        {selectedCustomer.allergiesOrSensitivities ? (
                          <View className="flex-row items-start gap-2 bg-rose-50 px-3 py-2 border-b border-rose-100">
                            <MaterialCommunityIcons name="alert-circle" size={15} color="#e11d48" style={{ marginTop: 1 }} />
                            <View className="flex-1">
                              <Text className="text-[10px] font-bold text-rose-600 uppercase tracking-wide">
                                {t('customer.allergies')}
                              </Text>
                              <Text className="text-xs text-rose-800 mt-0.5">
                                {selectedCustomer.allergiesOrSensitivities}
                              </Text>
                            </View>
                          </View>
                        ) : null}
                        {selectedCustomer.hairType ? (
                          <View className={`flex-row items-start gap-2 bg-white px-3 py-2${selectedCustomer.preferredServices ? ' border-b border-gray-100' : ''}`}>
                            <MaterialCommunityIcons name="content-cut" size={15} color="#6b7280" style={{ marginTop: 1 }} />
                            <View className="flex-1">
                              <Text className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                                {t('customer.hairType')}
                              </Text>
                              <Text className="text-xs text-gray-700 mt-0.5">{selectedCustomer.hairType}</Text>
                            </View>
                          </View>
                        ) : null}
                        {selectedCustomer.preferredServices ? (
                          <View className="flex-row items-start gap-2 bg-white px-3 py-2">
                            <MaterialCommunityIcons name="star-outline" size={15} color="#6b7280" style={{ marginTop: 1 }} />
                            <View className="flex-1">
                              <Text className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                                {t('customer.preferredServices')}
                              </Text>
                              <Text className="text-xs text-gray-700 mt-0.5">
                                {selectedCustomer.preferredServices}
                              </Text>
                            </View>
                          </View>
                        ) : null}
                      </View>
                    )}
                  </>
                ) : (
                  <>
                    <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5">
                      <MaterialCommunityIcons name="magnify" size={16} color="#9ca3af" />
                      <TextInput
                        className="flex-1 ml-2 text-sm text-gray-800"
                        placeholder={t('barber.customerSearchPlaceholder')}
                        placeholderTextColor="#9ca3af"
                        value={customerSearch}
                        onChangeText={setCustomerSearch}
                        returnKeyType="search"
                      />
                      {searching && <ActivityIndicator size="small" color="#9ca3af" />}
                      {customerSearch.length > 0 && !searching && (
                        <TouchableOpacity onPress={() => setCustomerSearch('')}>
                          <MaterialCommunityIcons name="close-circle" size={16} color="#9ca3af" />
                        </TouchableOpacity>
                      )}
                    </View>

                    {showSearchResults && (
                      <View className="mt-1 bg-white border border-gray-100 rounded-xl overflow-hidden max-h-36">
                        {searchResults.length === 0 && !searching ? (
                          <Text className="text-xs text-gray-400 text-center py-3">
                            {t('barber.customerNotFound')}
                          </Text>
                        ) : (
                          <ScrollView nestedScrollEnabled>
                            {searchResults.map((c) => (
                              <CustomerRow
                                key={c.id}
                                customer={c}
                                onPress={() => {
                                  Haptics.selectionAsync();
                                  setSelectedCustomer(c);
                                  setCustomerSearch('');
                                  onCustomerChange?.(c);
                                }}
                              />
                            ))}
                          </ScrollView>
                        )}
                      </View>
                    )}

                    {showRecent && (
                      <View className="mt-2">
                        <Text className="text-xs text-gray-400 mb-1.5">
                          {t('barber.customerRecent')}
                        </Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                          {recentCustomers.map((c) => (
                            <TouchableOpacity
                              key={c.id}
                              className="bg-gray-100 rounded-full px-3 py-1.5 mr-2"
                              onPress={() => {
                                Haptics.selectionAsync();
                                setSelectedCustomer(c);
                                onCustomerChange?.(c);
                              }}
                            >
                              <Text className="text-xs text-gray-700 font-medium">
                                {c.name.split(' ').pop()}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    )}
                  </>
                )}
              </View>
            )}

            {/* Loyalty points redemption */}
            {canRedeem && selectedCustomer && (
              <TouchableOpacity
                className={`flex-row items-center justify-between rounded-2xl px-4 py-3 mb-4 border ${
                  redeemPoints
                    ? 'bg-amber-50 border-amber-200'
                    : 'bg-gray-50 border-gray-200'
                }`}
                onPress={() => {
                  Haptics.selectionAsync();
                  setRedeemPoints((v) => !v);
                }}
                activeOpacity={0.8}
              >
                <View className="flex-1 mr-3">
                  <Text className={`text-sm font-semibold ${redeemPoints ? 'text-amber-800' : 'text-gray-700'}`}>
                    {t('barber.usePoints')}
                  </Text>
                  <Text className={`text-xs mt-0.5 ${redeemPoints ? 'text-amber-600' : 'text-gray-400'}`}>
                    {customerPoints} {t('barber.pointsAvailable')}
                    {redeemPoints && pointsDiscount > 0
                      ? ` · -${formatVnd(pointsDiscount)}`
                      : ''}
                  </Text>
                </View>
                <View className={`w-12 h-6 rounded-full justify-center px-0.5 ${redeemPoints ? 'bg-amber-500' : 'bg-gray-300'}`}>
                  <View className={`w-5 h-5 rounded-full bg-white shadow ${redeemPoints ? 'self-end' : 'self-start'}`} />
                </View>
              </TouchableOpacity>
            )}

            {/* Payment method */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-2">
                {t('barber.paymentMethod')}
              </Text>
              <View className="flex-row gap-x-2">
                {paymentOptions.map(({ value, label }) => (
                  <TouchableOpacity
                    key={value}
                    className={`flex-1 py-2.5 rounded-xl border items-center ${
                      paymentMethod === value
                        ? 'bg-indigo-600 border-indigo-600'
                        : 'bg-white border-gray-200'
                    }`}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setPaymentMethod(value);
                    }}
                  >
                    <Text
                      className={`text-xs font-semibold ${
                        paymentMethod === value ? 'text-white' : 'text-gray-600'
                      }`}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Bank transfer QR */}
            {paymentMethod === 'BANK_TRANSFER' && (
              <View className="bg-gray-50 rounded-2xl p-4 mb-4">
                {activeBank ? (
                  <>
                    {/* Bank picker chips — only shown when multiple accounts exist */}
                    {banks.length > 1 && (
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ gap: 6, paddingBottom: 12 }}
                      >
                        {banks.map((bank) => {
                          const isActive = bank.id === activeBank.id;
                          return (
                            <TouchableOpacity
                              key={bank.id}
                              className={`rounded-full px-3 py-1.5 border ${
                                isActive
                                  ? 'bg-indigo-600 border-indigo-600'
                                  : 'bg-white border-gray-200'
                              }`}
                              onPress={() => handleBankSelect(bank.id)}
                            >
                              <Text className={`text-xs font-semibold ${isActive ? 'text-white' : 'text-gray-600'}`}>
                                {bank.bankShortName ?? bank.bankName}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    )}
                    <View className="items-center">
                      <Image
                        source={{ uri: buildVietQrUrl(
                          activeBank.bankBin ?? activeBank.bankCode,
                          activeBank.accountNumber,
                          activeBank.accountName,
                          effectiveTotal,
                          qrDescription,
                        )}}
                        style={{ width: 200, height: 200, borderRadius: 8 }}
                        resizeMode="contain"
                      />
                      <Text className="text-2xl font-bold text-indigo-600 mt-3">
                        {formatVnd(effectiveTotal)}
                      </Text>
                      <Text className="text-sm font-bold text-gray-700 mt-2">
                        {activeBank.bankShortName ?? activeBank.bankName}
                      </Text>
                      <TouchableOpacity
                        className="flex-row items-center gap-x-1 mt-0.5"
                        onPress={() => {
                          Clipboard.setStringAsync(activeBank.accountNumber);
                          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Text className="text-base font-mono font-bold text-gray-900 tracking-wider">
                          {activeBank.accountNumber}
                        </Text>
                        <MaterialCommunityIcons name="content-copy" size={14} color="#9ca3af" />
                      </TouchableOpacity>
                      <Text className="text-xs text-gray-500 mt-0.5">{activeBank.accountName}</Text>
                      <Text className="text-xs text-gray-400 mt-2">{t('barber.scanQR')}</Text>
                    </View>
                  </>
                ) : (
                  <View className="items-center py-2">
                    <MaterialCommunityIcons name="bank-outline" size={32} color="#9ca3af" />
                    <Text className="text-sm font-medium text-gray-500 mt-2 text-center">
                      {t('barber.noBankAccount')}
                    </Text>
                    <Text className="text-xs text-gray-400 mt-1 text-center">
                      {t('barber.noBankAccountHint')}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Cash change calculator */}
            {paymentMethod === 'CASH' && (
              <View className="bg-gray-50 rounded-2xl p-4 mb-4">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-sm font-medium text-gray-700">{t('barber.cashReceived')}</Text>
                  <TouchableOpacity
                    className="bg-indigo-100 rounded-full px-3 py-1"
                    onPress={() => {
                      Haptics.selectionAsync();
                      setCashReceived(String(effectiveTotal));
                    }}
                  >
                    <Text className="text-xs font-semibold text-indigo-700">{t('barber.exactAmount')}</Text>
                  </TouchableOpacity>
                </View>
                <TextInput
                  className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-xl font-bold text-gray-900 mb-3"
                  value={cashReceived}
                  onChangeText={setCashReceived}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#9ca3af"
                  returnKeyType="done"
                />
                {cashReceivedNum > 0 && (
                  <View className="flex-row justify-between items-center">
                    <Text className="text-sm font-medium text-gray-600">
                      {cashDelta >= 0 ? t('barber.change') : t('barber.shortage')}
                    </Text>
                    <Text className={`text-xl font-bold ${cashDelta >= 0 ? 'text-indigo-600' : 'text-red-500'}`}>
                      {formatVnd(Math.abs(cashDelta))}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Order note */}
            <View className="mb-5">
              <Text className="text-sm font-medium text-gray-700 mb-2">
                {t('barber.orderNote')}
              </Text>
              <QuickPhraseBar
                phrases={BARBER_PHRASES}
                visible={isOrderNoteFocused}
                onSelect={(phrase) =>
                  setOrderNote((prev) => (prev.trim() ? `${prev.trim()} ${phrase}` : phrase))
                }
              />
              <TextInput
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 text-sm"
                placeholder={t('barber.notePlaceholder')}
                placeholderTextColor="#9ca3af"
                value={orderNote}
                onChangeText={setOrderNote}
                onFocus={() => setIsOrderNoteFocused(true)}
                onBlur={() => setIsOrderNoteFocused(false)}
                multiline
                textAlignVertical="top"
                style={{ minHeight: 60 }}
                maxLength={200}
              />
            </View>
          </ScrollView>

          {/* Error banner */}
          {!!checkoutError && (
            <View className="flex-row items-center bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-3 gap-x-2">
              <MaterialCommunityIcons name="alert-outline" size={18} color="#d97706" />
              <Text className="flex-1 text-amber-800 text-sm font-medium">{checkoutError}</Text>
              <TouchableOpacity
                onPress={onDismissError}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MaterialCommunityIcons name="close" size={16} color="#d97706" />
              </TouchableOpacity>
            </View>
          )}

          {/* Place Order button */}
          <TouchableOpacity
            className="bg-indigo-600 rounded-2xl py-4 items-center mt-2"
            onPress={() => onConfirm({
              customer: selectedCustomer,
              paymentMethod,
              note: orderNote,
              amountPaid: paymentMethod === 'CASH' && cashReceivedNum > 0 ? cashReceivedNum : undefined,
              tip,
              promoCode: appliedPromo,
              loyaltyPointsToRedeem: redeemPoints && canRedeem ? customerPoints : 0,
            })}
            disabled={creating || cartItems.length === 0}
            activeOpacity={0.85}
          >
            {creating ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text className="font-bold text-white text-base">
                {t('barber.placeOrder')} · {formatVnd(effectiveTotal)}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export function BarberServiceScreen({ navigation, route }: SellingScreenProps<'POSMain'>) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const has = useFeatureCheck();
  const { show: showAlert } = useAlertStore();
  const { setActiveView } = useSellingStore();
  const { width } = useWindowDimensions();
  const [gridPref, setGridPref] = useState<'auto' | '2' | '3'>('auto');

  useEffect(() => {
    AsyncStorage.getItem(GRID_PREF_KEY).then((saved) => {
      if (saved === '2' || saved === '3') setGridPref(saved as '2' | '3');
    });
  }, []);

  const numColumns = gridPref === 'auto' ? (width >= 390 ? 3 : 2) : Number(gridPref) as 2 | 3;

  const cycleGrid = () => {
    Haptics.selectionAsync();
    const next: 'auto' | '2' | '3' = gridPref === 'auto' ? '2' : gridPref === '2' ? '3' : 'auto';
    setGridPref(next);
    AsyncStorage.setItem(GRID_PREF_KEY, next);
  };

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [allServices, setAllServices] = useState<ProductData[]>([]);
  const isLoadingMore = useRef(false);
  const canLoadMore = useRef(false);

  const [selectedProduct, setSelectedProduct] = useState<ProductData | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [checkoutVisible, setCheckoutVisible] = useState(false);
  const [bannerCustomer, setBannerCustomer] = useState<CustomerData | null>(null);

  // Pre-fill from appointment check-in
  const checkInPayload = route?.params?.checkInPayload;

  // Fetch full customer data when check-in payload has a customer id (to get preferences)
  const { data: checkInFullCustomer } = useQuery({
    queryKey: ['customer', String(checkInPayload?.customerId ?? '')],
    queryFn: () => customerApi.getById(String(checkInPayload!.customerId)).then((r) => r.data.data),
    enabled: !!checkInPayload?.customerId && has('CUSTOMER'),
    staleTime: 5 * 60_000,
  });

  useEffect(() => {
    if (checkInFullCustomer) setBannerCustomer(checkInFullCustomer);
  }, [checkInFullCustomer]);

  useEffect(() => {
    if (!checkInPayload) return;
    const items: CartItem[] = checkInPayload.services.map((svc) => ({
      key: `appt-${svc.productId}-${Date.now()}-${Math.random()}`,
      product: {
        id: String(svc.productId),
        name: svc.productName,
        price: svc.unitPrice,
        unit: 'lần',
        categoryIds: null,
        categoryNames: null,
        productTypeCode: null,
        productTypeName: null,
        description: null,
        inStock: true,
        stockQuantity: null,
        dynamicPrice: false,
        durationMinutes: svc.durationMinutes,
        status: 'ACTIVE',
      },
      quantity: 1,
      employee: svc.assignedEmployeeId
        ? { id: String(svc.assignedEmployeeId), fullName: svc.assignedEmployeeName ?? '', position: null, commissionRate: null }
        : null,
      note: '',
    }));
    setCartItems(items);
    if (checkInPayload.customerId) {
      setBannerCustomer({
        id: String(checkInPayload.customerId),
        name: checkInPayload.customerName,
        phone: checkInPayload.customerPhone ?? '',
        email: null,
        gender: null,
        dateOfBirth: null,
        birthday: null,
        zaloId: null,
        facebookId: null,
        hairType: null,
        preferredServices: null,
        allergiesOrSensitivities: null,
        specialRequests: null,
        notes: null,
        note: null,
        idCardNumber: null,
        idCardIssuedDate: null,
        idCardIssuedPlace: null,
        permanentAddress: null,
        totalOrders: 0,
        totalSpend: 0,
        points: 0,
        createdAt: new Date().toISOString(),
      });
    }
    setCheckoutVisible(true);
  }, [checkInPayload?.appointmentId]);
  const [creating, setCreating] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');

  const commitSearch = () => {
    setSearch(searchInput);
    setSelectedCategoryId(null);
    setPage(0);
  };

  const {
    data: servicesPage,
    isLoading: productsLoading,
    isFetching: productsFetching,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['barberServices', search, selectedCategoryId, page],
    queryFn: async () => {
      const res = await productApi.list({
        page,
        size: PAGE_SIZE,
        ...(search ? { search } : {}),
        ...(selectedCategoryId ? { categoryId: selectedCategoryId } : {}),
      });
      const content = res.data.data.content;
      if (page === 0) {
        setAllServices(content);
      } else {
        setAllServices((prev) => [...prev, ...content]);
      }
      return res.data.data;
    },
  });

  const hasMore = servicesPage ? page < servicesPage.totalPages - 1 : false;

  const { data: categories = [] } = useQuery<CategoryData[]>({
    queryKey: ['categories'],
    queryFn: () => categoryApi.list().then((r) => r.data.data),
    staleTime: 10 * 60_000,
  });

  useEffect(() => {
    if (!productsFetching) isLoadingMore.current = false;
  }, [productsFetching]);

  useEffect(() => {
    canLoadMore.current = false;
    const timer = setTimeout(() => { canLoadMore.current = true; }, 400);
    return () => clearTimeout(timer);
  }, [search, selectedCategoryId]);

  const handleEndReached = () => {
    if (!canLoadMore.current || !hasMore || productsFetching || isLoadingMore.current) return;
    isLoadingMore.current = true;
    setPage((p) => p + 1);
  };

  const { data: workItems } = useQuery({
    queryKey: ['workItems', 'pending'],
    queryFn: () => orderApi.pendingWorkItems({ size: 100 }).then((r) => r.data.data),
    staleTime: 30_000,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees', 'active'],
    queryFn: () => employeeApi.listActive().then((r) => r.data.data),
    staleTime: 5 * 60_000,
    enabled: has('EMPLOYEE'),
  });

  const { data: banks = [] } = useQuery<BankAccount[]>({
    queryKey: ['banks'],
    queryFn: () => shopConfigApi.getBanks().then((r) => r.data.data),
    staleTime: 10 * 60_000,
    enabled: has('BANK_ACCOUNT'),
  });
  const pendingCount = workItems?.content?.filter((i) => i.status === 'PENDING').length ?? 0;
  const inProgressCount = workItems?.content?.filter((i) => i.status === 'IN_PROGRESS').length ?? 0;

  const handleAdd = (note: string, employee: EmployeeData | null, quantity: number) => {
    if (!selectedProduct) return;
    const newItem: CartItem = {
      key: `${selectedProduct.id}-${Date.now()}-${Math.random()}`,
      product: selectedProduct,
      quantity,
      employee,
      note,
    };
    setCartItems((prev) => [...prev, newItem]);
    setSelectedProduct(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleRemoveItem = (key: string) => {
    setCartItems((prev) => prev.filter((i) => i.key !== key));
  };

  const handleClearCart = () => {
    showAlert(
      t('barber.clearCartTitle'),
      t('barber.clearCartMsg'),
      [
        { label: t('common.cancel'), style: 'cancel' },
        { label: t('barber.clearCart'), style: 'destructive', onPress: () => setCartItems([]) },
      ],
    );
  };

  const handleCheckout = async ({
    customer,
    paymentMethod,
    note: orderNote,
    amountPaid,
    promoCode,
    loyaltyPointsToRedeem,
  }: CheckoutPayload) => {
    if (cartItems.length === 0 || creating) return;
    setCreating(true);
    setCheckoutError('');
    try {
      const cartRes = await cartApi.init();
      const cartId = cartRes.data.data.cartId;
      const knownItemIds = new Set<string>();

      for (const item of cartItems) {
        const addRes = await cartApi.addItem(cartId, item.product.id, item.quantity);
        const allItems: any[] = addRes.data.data.items ?? [];

        if (item.employee) {
          const newItem = allItems.find((i) => !knownItemIds.has(i.id));
          if (newItem) {
            await cartApi.updateCommission(cartId, newItem.id, item.employee.id);
          }
        }

        allItems.forEach((i) => knownItemIds.add(i.id));
      }

      if (promoCode) {
        await cartApi.applyPromo(cartId, promoCode);
      }

      const checkoutRes = await cartApi.checkout(cartId, {
        paymentMethod,
        amountPaid,
        notes: orderNote.trim() || undefined,
        customerId: customer?.id,
        loyaltyPointsToRedeem: loyaltyPointsToRedeem > 0 ? loyaltyPointsToRedeem : undefined,
      });
      const { orderId, orderNumber, total } = checkoutRes.data.data;

      setCartItems([]);
      setCheckoutVisible(false);
      await AsyncStorage.setItem(LAST_PAYMENT_KEY, paymentMethod);
      queryClient.invalidateQueries({ queryKey: ['workItems'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['customers', 'recent'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.navigate('OrderSuccess', { orderId, orderNumber, total });
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? t('barber.createFailed');
      setCheckoutError(msg);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setCreating(false);
    }
  };

  if (isError) return <ErrorState onRetry={refetch} />;

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <View
        className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4"
        style={{ paddingTop: insets.top + 12, paddingBottom: 0 }}
      >
        <View className="flex-row items-center justify-between mb-0.5">
          <View className="flex-1">
            <Text className="text-xl font-bold text-gray-900 dark:text-white">{t('barber.title')}</Text>
            <QueueStatusBadge pending={pendingCount} inProgress={inProgressCount} />
          </View>
          <TouchableOpacity
            className="bg-gray-100 dark:bg-gray-700 rounded-xl p-2.5 active:opacity-80"
            onPress={cycleGrid}
          >
            <MaterialCommunityIcons
              name={gridPref === '3' ? 'view-grid' : gridPref === '2' ? 'view-column' : 'view-dashboard-outline'}
              size={22}
              color="#374151"
            />
          </TouchableOpacity>
        </View>

        {/* View toggle */}
        <View className="flex-row bg-gray-100 dark:bg-gray-700 rounded-2xl p-1 mt-2 mb-3">
          <View className="flex-1 rounded-xl py-2 items-center bg-white dark:bg-gray-600">
            <Text className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
              {t('selling.title')}
            </Text>
          </View>
          <TouchableOpacity
            className="flex-1 rounded-xl py-2 items-center active:opacity-70"
            onPress={() => { Haptics.selectionAsync(); setActiveView('ORDERS'); }}
          >
            <Text className="text-sm font-semibold text-gray-500 dark:text-gray-300">
              {t('orders.title')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search bar */}
        <View className="flex-row items-center gap-2 mb-2">
          <View className="flex-1 flex-row items-center bg-gray-100 dark:bg-gray-700 rounded-xl px-3 py-2.5">
            <MaterialCommunityIcons name="magnify" size={20} color="#9ca3af" />
            <TextInput
              className="flex-1 ml-2 text-base text-gray-800 dark:text-white"
              placeholder={t('barber.searchPlaceholder')}
              placeholderTextColor="#9ca3af"
              value={searchInput}
              onChangeText={setSearchInput}
              returnKeyType="search"
              onSubmitEditing={commitSearch}
            />
            {searchInput.length > 0 && (
              <TouchableOpacity
                onPress={() => { setSearchInput(''); setSearch(''); setPage(0); setSelectedCategoryId(null); }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MaterialCommunityIcons name="close-circle" size={18} color="#9ca3af" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            onPress={commitSearch}
            className="bg-indigo-600 rounded-xl px-4 py-2.5 items-center justify-center"
            activeOpacity={0.8}
          >
            <Text className="text-white font-semibold text-sm">{t('pos.searchButton')}</Text>
          </TouchableOpacity>
        </View>

        {/* Customer preferences banner (visible when customer selected outside checkout) */}
        {bannerCustomer && (
          <PreferencesBanner customer={bannerCustomer} t={t} />
        )}

        {/* Category filter chips */}
        {categories.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 6, paddingBottom: 10 }}
            keyboardShouldPersistTaps="always"
          >
            <TouchableOpacity
              className={`rounded-full px-3.5 py-1.5 border ${
                selectedCategoryId === null
                  ? 'bg-indigo-600 border-indigo-600'
                  : 'bg-white border-gray-200'
              }`}
              onPress={() => {
                Haptics.selectionAsync();
                setSelectedCategoryId(null);
                setPage(0);
              }}
            >
              <Text className={`text-xs font-semibold ${selectedCategoryId === null ? 'text-white' : 'text-gray-600'}`}>
                {t('pos.allCategories')}
              </Text>
            </TouchableOpacity>
            {categories.map((cat) => {
              const active = selectedCategoryId === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  className={`flex-row items-center gap-x-1 rounded-full px-3.5 py-1.5 border ${
                    active ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-gray-200'
                  }`}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setSelectedCategoryId(active ? null : cat.id);
                    setPage(0);
                  }}
                >
                  {cat.emoji ? <Text>{cat.emoji}</Text> : null}
                  <Text className={`text-xs font-semibold ${active ? 'text-white' : 'text-gray-600'}`}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* Product grid */}
      {productsLoading && page === 0 ? (
        <View className="flex-row flex-wrap p-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <View key={i} style={{ width: `${(100 / numColumns).toFixed(2)}%` }} className="p-1.5">
              <Skeleton height={110} borderRadius={16} />
            </View>
          ))}
        </View>
      ) : !allServices.length ? (
        <EmptyState icon="💇" title={t('barber.noServices')} />
      ) : (
        <FlatList
          key={numColumns}
          data={allServices}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ServiceCard item={item} onPress={setSelectedProduct} />
          )}
          numColumns={numColumns}
          contentContainerStyle={{
            padding: 6,
            paddingBottom: insets.bottom + (cartItems.length > 0 ? 100 : 16),
          }}
          showsVerticalScrollIndicator={false}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            productsFetching && page > 0 ? (
              <View className="py-4 items-center" style={{ width: '100%' }}>
                <ActivityIndicator size="small" color="#4f46e5" />
              </View>
            ) : null
          }
        />
      )}

      {/* Add item sheet */}
      <AddItemSheet
        product={selectedProduct}
        employees={employees}
        onAdd={handleAdd}
        onClose={() => setSelectedProduct(null)}
      />

      {/* Floating cart bar */}
      <CartBar
        cartItems={cartItems}
        onClear={handleClearCart}
        onCheckout={() => setCheckoutVisible(true)}
      />

      {/* Checkout sheet */}
      <CheckoutSheet
        visible={checkoutVisible}
        cartItems={cartItems}
        hasCustomer={has('CUSTOMER')}
        hasLoyalty={has('LOYALTY')}
        banks={banks}
        checkoutError={checkoutError}
        onDismissError={() => setCheckoutError('')}
        onRemoveItem={handleRemoveItem}
        onClose={() => { setCheckoutVisible(false); setCheckoutError(''); }}
        onConfirm={handleCheckout}
        creating={creating}
        initialCustomer={bannerCustomer}
        onCustomerChange={setBannerCustomer}
      />
    </View>
  );
}
