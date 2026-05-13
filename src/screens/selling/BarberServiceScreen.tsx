import { useState, useEffect, useRef } from 'react';
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
  type ProductData,
  type EmployeeData,
  type CustomerData,
} from '../../services/api';
import { useAlertStore } from '../../store/alertStore';
import { useToastStore } from '../../store/toastStore';
import { formatVnd } from '../../utils/format';
import { PAGE_SIZE } from '../../utils/constants';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { Skeleton } from '../../components/Skeleton';
import { useFeatureCheck } from '../../hooks/useFeature';
import type { SellingScreenProps } from '../../types/navigation';

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
  const noteRef = useRef<TextInput>(null);

  const isService = (product?.durationMinutes ?? 0) > 0;

  useEffect(() => {
    if (product) {
      setNote('');
      setQuantity(1);
      setSelectedEmployee(null);
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
              <TextInput
                ref={noteRef}
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 text-sm min-h-[80px]"
                placeholder={t('barber.notePlaceholder')}
                placeholderTextColor="#9ca3af"
                value={note}
                onChangeText={setNote}
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

  if (cartItems.length === 0) return null;

  return (
    <View
      className="absolute bottom-0 left-0 right-0 bg-indigo-600 px-4 pt-3"
      style={{ paddingBottom: insets.bottom + 12 }}
    >
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
  onRemoveItem,
  onClose,
  onConfirm,
  creating,
}: {
  visible: boolean;
  cartItems: CartItem[];
  hasCustomer: boolean;
  onRemoveItem: (key: string) => void;
  onClose: () => void;
  onConfirm: (customer: CustomerData | null, paymentMethod: PaymentMethod, note: string) => void;
  creating: boolean;
}) {
  const { t } = useTranslation();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [orderNote, setOrderNote] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerData | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');

  const debouncedSearch = useDebounce(customerSearch, 350);

  useEffect(() => {
    if (!visible) {
      setPaymentMethod('CASH');
      setOrderNote('');
      setSelectedCustomer(null);
      setCustomerSearch('');
    }
  }, [visible]);

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

  const total = cartItems.reduce((s, i) => s + i.product.price * i.quantity, 0);
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

            {/* Order total */}
            <View className="flex-row justify-between items-center py-3 mb-4">
              <Text className="text-base font-bold text-gray-900">{t('barber.orderTotal')}</Text>
              <Text className="text-base font-bold text-indigo-600">{formatVnd(total)}</Text>
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
                      onPress={() => setSelectedCustomer(null)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <MaterialCommunityIcons name="close-circle" size={20} color="#9ca3af" />
                    </TouchableOpacity>
                  </View>
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

            {/* Order note */}
            <View className="mb-5">
              <Text className="text-sm font-medium text-gray-700 mb-2">
                {t('barber.orderNote')}
              </Text>
              <TextInput
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 text-sm"
                placeholder={t('barber.notePlaceholder')}
                placeholderTextColor="#9ca3af"
                value={orderNote}
                onChangeText={setOrderNote}
                multiline
                textAlignVertical="top"
                style={{ minHeight: 60 }}
                maxLength={200}
              />
            </View>
          </ScrollView>

          {/* Place Order button */}
          <TouchableOpacity
            className="bg-indigo-600 rounded-2xl py-4 items-center mt-2"
            onPress={() => onConfirm(selectedCustomer, paymentMethod, orderNote)}
            disabled={creating || cartItems.length === 0}
            activeOpacity={0.85}
          >
            {creating ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text className="font-bold text-white text-base">
                {t('barber.placeOrder')} · {formatVnd(total)}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export function BarberServiceScreen({ navigation }: SellingScreenProps<'POSMain'>) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const has = useFeatureCheck();
  const { show: showAlert } = useAlertStore();
  const { show: showToast } = useToastStore();

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [allServices, setAllServices] = useState<ProductData[]>([]);
  const isLoadingMore = useRef(false);
  const canLoadMore = useRef(false);

  const [selectedProduct, setSelectedProduct] = useState<ProductData | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [checkoutVisible, setCheckoutVisible] = useState(false);
  const [creating, setCreating] = useState(false);

  const commitSearch = () => {
    setSearch(searchInput);
    setPage(0);
  };

  const {
    data: servicesPage,
    isLoading: productsLoading,
    isFetching: productsFetching,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['barberServices', search, page],
    queryFn: async () => {
      const res = search
        ? await productApi.search({ keyword: search, page, size: PAGE_SIZE })
        : await productApi.list({ page, size: PAGE_SIZE });
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

  useEffect(() => {
    if (!productsFetching) isLoadingMore.current = false;
  }, [productsFetching]);

  useEffect(() => {
    canLoadMore.current = false;
    const timer = setTimeout(() => { canLoadMore.current = true; }, 400);
    return () => clearTimeout(timer);
  }, [search]);

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

  const handleCheckout = async (
    customer: CustomerData | null,
    paymentMethod: PaymentMethod,
    orderNote: string,
  ) => {
    if (cartItems.length === 0 || creating) return;
    setCreating(true);
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

      await cartApi.checkout(cartId, {
        paymentMethod,
        notes: orderNote.trim() || undefined,
        customerId: customer?.id,
      });

      setCartItems([]);
      setCheckoutVisible(false);
      queryClient.invalidateQueries({ queryKey: ['workItems'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['customers', 'recent'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast(t('barber.orderCreatedSuccess'));
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? t('barber.createFailed');
      showAlert(t('common.error'), msg, [{ label: t('common.close'), style: 'cancel' }]);
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
            onPress={() => navigation.navigate('OrderList')}
          >
            <MaterialCommunityIcons name="clipboard-list-outline" size={22} color="#374151" />
          </TouchableOpacity>
        </View>
        <Text className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 mb-3">{t('barber.hint')}</Text>

        {/* Search bar */}
        <View className="flex-row items-center gap-2 mb-3">
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
                onPress={() => { setSearchInput(''); setSearch(''); setPage(0); }}
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
      </View>

      {/* Product grid */}
      {productsLoading && page === 0 ? (
        <View className="flex-row flex-wrap p-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <View key={i} className="w-1/2 p-1.5">
              <Skeleton height={110} borderRadius={16} />
            </View>
          ))}
        </View>
      ) : !allServices.length ? (
        <EmptyState icon="💇" title={t('barber.noServices')} />
      ) : (
        <FlatList
          data={allServices}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ServiceCard item={item} onPress={setSelectedProduct} />
          )}
          numColumns={2}
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
        onRemoveItem={handleRemoveItem}
        onClose={() => setCheckoutVisible(false)}
        onConfirm={handleCheckout}
        creating={creating}
      />
    </View>
  );
}
