import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
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
  useWindowDimensions,
  Animated,
  PanResponder,
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
  type OrderSummary,
} from '../../services/api';
import { VietQrCard } from '../../components/VietQrCard';
import { UpgradeModal } from '../../components/UpgradeModal';
import { MoneyInput } from '../../components/MoneyInput';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAlertStore } from '../../store/alertStore';

const LAST_PAYMENT_KEY = 'last_payment_method';
const GRID_PREF_KEY = 'pos_grid_columns';
const LAST_QR_BANK_KEY = 'last_qr_bank_id';
import { formatVnd, formatMoneyDisplay, numberToWords } from '../../utils/format';
import { PAGE_SIZE } from '../../utils/constants';
import { getQuickPhrases } from '../../utils/quickPhrases';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { Skeleton } from '../../components/Skeleton';
import { QuickPhraseBar } from '../../components/QuickPhraseBar';
import { useFeatureCheck } from '../../hooks/useFeature';
import { useTypography } from '../../hooks/useTypography';
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
  createAsInProgress?: boolean;
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

// ── Elapsed time helper ───────────────────────────────────────────────────────

function elapsed(createdAt: string): string {
  const mins = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60_000);
  if (mins < 1) return '< 1p';
  if (mins < 60) return `${mins}p`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}g${m}p` : `${h}g`;
}

// ── Active Orders Strip ───────────────────────────────────────────────────────

function OrderCard({
  order,
  expanded,
  onPress,
  t,
  typo,
}: {
  order: OrderSummary;
  expanded: boolean;
  onPress: (id: string) => void;
  t: (k: string) => string;
  typo: ReturnType<typeof useTypography>;
}) {
  const cardInitials = (order.customerName ?? t('orders.walkIn'))
    .split(' ').filter(Boolean).slice(0, 2)
    .map((w: string) => w[0].toUpperCase()).join('');

  return (
    <TouchableOpacity
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(order.id); }}
      activeOpacity={0.75}
      style={expanded ? { flex: 1 } : { width: 172 }}
      className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-indigo-100 dark:border-indigo-800"
    >
      {/* Indigo header: order number + elapsed */}
      <View className="bg-indigo-600 dark:bg-indigo-700 px-3 py-2 flex-row items-center justify-between">
        <Text className={`${typo.captionBold} text-white flex-1 mr-2`} numberOfLines={1}>
          #{order.orderNumber}
        </Text>
        <View className="flex-row items-center gap-x-1 flex-shrink-0 bg-white/20 rounded-full px-2 py-0.5">
          <MaterialCommunityIcons name="clock-outline" size={10} color="#fff" />
          <Text className={`${typo.caption} text-white`}>{elapsed(order.createdAt)}</Text>
        </View>
      </View>

      {/* Body */}
      <View className="px-3 py-2.5">
        <View className="flex-row items-center gap-x-2 mb-2">
          <View className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900 items-center justify-center flex-shrink-0">
            <Text className={`${typo.caption} font-bold text-indigo-600 dark:text-indigo-300`}>
              {cardInitials}
            </Text>
          </View>
          <Text className={`${typo.caption} text-gray-800 dark:text-gray-200 font-semibold flex-1`} numberOfLines={1}>
            {order.customerName ?? t('orders.walkIn')}
          </Text>
        </View>
        {order.items && order.items.length > 0 && (
          <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 mb-2`} numberOfLines={1}>
            {order.items.slice(0, 2).map((i) => i.productName).join(' · ')}
            {order.items.length > 2 ? ` +${order.items.length - 2}` : ''}
          </Text>
        )}
        <View className="flex-row items-center justify-between">
          <View className="bg-indigo-50 dark:bg-indigo-900/40 rounded-full px-2 py-0.5">
            <Text className={`${typo.caption} text-indigo-500 dark:text-indigo-300`}>
              {order.items?.length ?? order.itemCount} {t('barber.activeOrderItems')}
            </Text>
          </View>
          <Text className={`${typo.captionBold} text-indigo-600 dark:text-indigo-400 flex-shrink-0`} numberOfLines={1}>
            {formatVnd(order.total)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const STRIP_COLLAPSED = 168;
const STRIP_MEDIUM    = 294;

function ActiveOrdersStrip({
  orders,
  onPress,
}: {
  orders: OrderSummary[];
  onPress: (orderId: string) => void;
}) {
  const { t } = useTranslation();
  const typo = useTypography();
  const { height: screenHeight } = useWindowDimensions();

  const STRIP_TALL = Math.round(screenHeight * 0.5);

  // 0 = collapsed, 1 = medium, 2 = tall
  const [snapIndex, setSnapIndex] = useState<0 | 1 | 2>(0);
  const animHeight  = useRef(new Animated.Value(STRIP_COLLAPSED)).current;
  const heightRef   = useRef(STRIP_COLLAPSED);
  const snapTallRef = useRef(STRIP_TALL);
  snapTallRef.current = STRIP_TALL;

  const snapTo = useCallback((index: 0 | 1 | 2, releaseVy = 0) => {
    const stops = [STRIP_COLLAPSED, STRIP_MEDIUM, snapTallRef.current];
    const toValue = stops[index];
    heightRef.current = toValue;
    setSnapIndex(index);
    Animated.spring(animHeight, {
      toValue,
      useNativeDriver: false,
      velocity: Math.abs(releaseVy) * 200,
      tension: 60,
      friction: 10,
    }).start();
    Haptics.selectionAsync();
  }, [animHeight]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, { dy }) => Math.abs(dy) > 4,
      onPanResponderMove: (_, { dy }) => {
        const max = snapTallRef.current + 40;
        const next = Math.min(max, Math.max(STRIP_COLLAPSED - 10, heightRef.current - dy));
        animHeight.setValue(next);
      },
      onPanResponderRelease: (_, { dy, vy }) => {
        const reached = heightRef.current - dy;
        const stops: [number, number, number] = [STRIP_COLLAPSED, STRIP_MEDIUM, snapTallRef.current];
        // bias by velocity so a fast flick snaps in the intended direction
        const biased = reached - vy * 80;
        let best: 0 | 1 | 2 = 0;
        let bestDist = Infinity;
        stops.forEach((s, i) => {
          const d = Math.abs(biased - s);
          if (d < bestDist) { bestDist = d; best = i as 0 | 1 | 2; }
        });
        snapTo(best, vy);
      },
    })
  ).current;

  if (orders.length === 0) return null;

  const isExpanded = snapIndex > 0;

  return (
    <Animated.View
      style={{ height: animHeight }}
      className="bg-indigo-50 border-t border-indigo-100 dark:bg-indigo-950/30 dark:border-indigo-900 overflow-hidden"
    >
      {/* Drag handle + label row */}
      <View {...panResponder.panHandlers} className="items-center pt-1.5 pb-1">
        <View className="w-8 h-1 rounded-full bg-indigo-300 dark:bg-indigo-600 mb-1.5" />
        <TouchableOpacity
          onPress={() => snapTo(((snapIndex + 1) % 3) as 0 | 1 | 2)}
          activeOpacity={0.7}
          className="flex-row items-center justify-between w-full px-4"
        >
          <View className="flex-row items-center gap-x-1.5">
            <View className="w-2 h-2 rounded-full bg-indigo-500" />
            <Text className={`${typo.captionBold} text-indigo-600 dark:text-indigo-400 uppercase tracking-wide`}>
              {t('barber.activeOrdersLabel')}
            </Text>
            <View className="bg-indigo-600 rounded-full px-2 py-0.5 ml-1">
              <Text className={`${typo.caption} text-white font-bold`}>{orders.length}</Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>

      {/* Cards — horizontal single-row when collapsed; wrapping rows when expanded */}
      {isExpanded ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, paddingBottom: 10, gap: 8 }}
          style={{ flex: 1 }}
        >
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} expanded={false} onPress={onPress} t={t} typo={typo} />
          ))}
        </ScrollView>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 10, gap: 8 }}
          style={{ flex: 1 }}
        >
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} expanded={false} onPress={onPress} t={t} typo={typo} />
          ))}
        </ScrollView>
      )}
    </Animated.View>
  );
}

// ── Queue Status Badge ────────────────────────────────────────────────────────

function QueueStatusBadge({ pending, inProgress }: { pending: number; inProgress: number }) {
  const { t } = useTranslation();
  const typo = useTypography();
  if (pending === 0 && inProgress === 0) return null;
  return (
    <View className="flex-row items-center gap-x-2 mt-0.5 mb-1">
      {pending > 0 && (
        <View className="flex-row items-center gap-x-1 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">
          <View className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          <Text className={`${typo.caption} font-medium text-amber-700 dark:text-amber-400`}>
            {pending} {t('barber.statusWaiting')}
          </Text>
        </View>
      )}
      {inProgress > 0 && (
        <View className="flex-row items-center gap-x-1 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-0.5 rounded-full">
          <View className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
          <Text className={`${typo.caption} font-medium text-indigo-700 dark:text-indigo-400`}>
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
  const typo = useTypography();
  return (
    <TouchableOpacity
      testID={`barber-service-${item.name}`}
      className="flex-1 bg-white dark:bg-gray-800 m-1.5 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 active:opacity-75"
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress(item);
      }}
    >
      <Text className={`${typo.label} text-gray-800 leading-tight`} numberOfLines={2}>
        {item.name}
      </Text>
      {item.durationMinutes > 0 && (
        <View className="flex-row items-center mt-2 gap-x-1">
          <MaterialCommunityIcons name="clock-outline" size={13} color="#6b7280" />
          <Text className={`${typo.caption} text-gray-500`}>{fmtDuration(item.durationMinutes, t)}</Text>
        </View>
      )}
      <View className="flex-row justify-between items-center mt-2">
        {item.dynamicPrice ? (
          <Text className={`${typo.captionBold} text-warning`}>{t('pos.goldPrice')}</Text>
        ) : (
          <Text className={`${typo.label} font-bold text-indigo-600`}>{formatVnd(item.price)}</Text>
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
  const typo = useTypography();
  return (
    <TouchableOpacity className="items-center mr-3" onPress={onPress} activeOpacity={0.7}>
      <View
        className={`w-12 h-12 rounded-full items-center justify-center mb-1 ${
          selected ? 'bg-indigo-600' : 'bg-gray-100'
        }`}
      >
        <Text className={`${typo.label} font-bold ${selected ? 'text-white' : 'text-gray-600'}`}>
          {initials(employee.fullName)}
        </Text>
      </View>
      <Text
        className={`${typo.caption} text-center max-w-[56px] ${
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
  const typo = useTypography();
  return (
    <TouchableOpacity
      className="flex-row items-center px-3 py-2.5 border-b border-gray-50 active:bg-gray-50"
      onPress={onPress}
    >
      <View className="w-8 h-8 rounded-full bg-indigo-100 items-center justify-center mr-3">
        <Text className={`${typo.captionBold} text-indigo-600`}>{initials(customer.name)}</Text>
      </View>
      <View className="flex-1">
        <Text className={`${typo.caption} font-medium text-gray-900`}>{customer.name}</Text>
        <Text className={`${typo.caption} text-gray-500`}>{customer.phone}</Text>
      </View>
      {customer.totalOrders > 0 && (
        <Text className={`${typo.caption} text-gray-400`}>{customer.totalOrders} lần</Text>
      )}
    </TouchableOpacity>
  );
}

// ── Preferences Banner ────────────────────────────────────────────────────────

function PreferencesBanner({ customer, t }: { customer: CustomerData; t: (k: string) => string }) {
  const typo = useTypography();
  const hasPrefs = customer.allergiesOrSensitivities || customer.hairType || customer.preferredServices;
  if (!hasPrefs) return null;
  return (
    <View className="rounded-xl border border-gray-100 overflow-hidden mb-2">
      {customer.allergiesOrSensitivities ? (
        <View className="flex-row items-start gap-2 bg-rose-50 px-3 py-2">
          <MaterialCommunityIcons name="alert-circle" size={14} color="#e11d48" style={{ marginTop: 1 }} />
          <View className="flex-1">
            <Text className={`${typo.caption} font-bold text-rose-600 uppercase tracking-wide`}>
              {t('customer.allergies')}
            </Text>
            <Text className={`${typo.caption} text-rose-800 mt-0.5`} numberOfLines={2}>
              {customer.allergiesOrSensitivities}
            </Text>
          </View>
        </View>
      ) : null}
      {customer.hairType ? (
        <View className="flex-row items-start gap-2 bg-white px-3 py-2 border-t border-gray-50">
          <MaterialCommunityIcons name="content-cut" size={14} color="#6b7280" style={{ marginTop: 1 }} />
          <View className="flex-1">
            <Text className={`${typo.caption} font-semibold text-gray-400 uppercase tracking-wide`}>
              {t('customer.hairType')}
            </Text>
            <Text className={`${typo.caption} text-gray-700 mt-0.5`} numberOfLines={1}>
              {customer.hairType}
            </Text>
          </View>
        </View>
      ) : null}
      {customer.preferredServices ? (
        <View className="flex-row items-start gap-2 bg-white px-3 py-2 border-t border-gray-50">
          <MaterialCommunityIcons name="star-outline" size={14} color="#6b7280" style={{ marginTop: 1 }} />
          <View className="flex-1">
            <Text className={`${typo.caption} font-semibold text-gray-400 uppercase tracking-wide`}>
              {t('customer.preferredServices')}
            </Text>
            <Text className={`${typo.caption} text-gray-700 mt-0.5`} numberOfLines={2}>
              {customer.preferredServices}
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

// ── Order Picker Sheet ────────────────────────────────────────────────────────

function OrderPickerSheet({
  visible,
  orders,
  onSelectNew,
  onSelectOrder,
  onClose,
}: {
  visible: boolean;
  orders: OrderSummary[];
  onSelectNew: () => void;
  onSelectOrder: (orderId: string) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const typo = useTypography();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity className="flex-1 bg-black/40" activeOpacity={1} onPress={onClose} />
      <View style={{ paddingBottom: insets.bottom + 8 }} className="bg-white rounded-t-3xl px-5 pt-4">
        <View className="w-10 h-1 bg-gray-200 rounded-full self-center mb-4" />
        <Text className={`${typo.section} text-gray-900 mb-4`}>{t('barber.addToWhichOrder')}</Text>

        {/* New order option */}
        <TouchableOpacity
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onSelectNew(); }}
          activeOpacity={0.75}
          className="flex-row items-center gap-x-3 bg-indigo-50 rounded-2xl px-4 py-3 mb-3 border border-indigo-100"
        >
          <View className="w-9 h-9 rounded-full bg-indigo-600 items-center justify-center">
            <MaterialCommunityIcons name="plus" size={20} color="#fff" />
          </View>
          <View className="flex-1">
            <Text className={`${typo.labelBold} text-indigo-700`}>{t('barber.newOrder')}</Text>
            <Text className={`${typo.caption} text-indigo-400`}>{t('barber.newOrderHint')}</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={18} color="#6366f1" />
        </TouchableOpacity>

        {/* Existing IN_PROGRESS orders */}
        {orders.map((order) => {
          const initials = (order.customerName ?? t('orders.walkIn'))
            .split(' ').filter(Boolean).slice(0, 2)
            .map((w: string) => w[0].toUpperCase()).join('');
          return (
            <TouchableOpacity
              key={order.id}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onSelectOrder(order.id); }}
              activeOpacity={0.75}
              className="flex-row items-center gap-x-3 bg-white rounded-2xl px-4 py-3 mb-2 border border-gray-100"
            >
              <View className="w-9 h-9 rounded-full bg-indigo-100 items-center justify-center flex-shrink-0">
                <Text className={`${typo.captionBold} text-indigo-600`}>{initials}</Text>
              </View>
              <View className="flex-1">
                <Text className={`${typo.labelBold} text-gray-800`}>
                  #{order.orderNumber} · {order.customerName ?? t('orders.walkIn')}
                </Text>
                <Text className={`${typo.caption} text-gray-400`}>
                  {elapsed(order.createdAt)} · {order.items?.length ?? order.itemCount} {t('barber.activeOrderItems')}
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={18} color="#9ca3af" />
            </TouchableOpacity>
          );
        })}
      </View>
    </Modal>
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
  const typo = useTypography();
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
                  <Text className={`${typo.section} text-gray-900`}>{product.name}</Text>
                  {isService && product.durationMinutes > 0 && (
                    <View className="flex-row items-center mt-1 gap-x-1">
                      <MaterialCommunityIcons name="clock-outline" size={14} color="#6b7280" />
                      <Text className={`${typo.caption} text-gray-500`}>
                        {fmtDuration(product.durationMinutes, t)}
                      </Text>
                    </View>
                  )}
                </View>
                <Text className={`${typo.section} font-bold text-indigo-600`}>{formatVnd(product.price)}</Text>
              </View>

              {/* Quantity stepper — retail products only */}
              {!isService && (
                <View className="flex-row items-center justify-between bg-gray-50 rounded-2xl px-4 py-3 mb-4">
                  <Text className={`${typo.label} text-gray-700`}>{t('barber.quantityLabel')}</Text>
                  <View className="flex-row items-center gap-x-3">
                    <TouchableOpacity
                      onPress={() => setQuantity((q) => Math.max(1, q - 1))}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      className="w-8 h-8 rounded-full bg-gray-200 items-center justify-center"
                    >
                      <MaterialCommunityIcons name="minus" size={18} color="#374151" />
                    </TouchableOpacity>
                    <Text className={`${typo.section} font-bold text-gray-900 w-8 text-center`}>{quantity}</Text>
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
                    <Text className={`${typo.label} text-gray-700`}>
                      {t('barber.assignLabel')}
                    </Text>
                    <Text className={`${typo.caption} text-gray-400 ml-1`}>({t('barber.optional')})</Text>
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
              <Text className={`${typo.label} text-gray-700 mb-2`}>
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
                className={`bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 ${typo.inputSize} min-h-[80px]`}
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
                  <Text className={`${typo.label} text-gray-600`}>{t('barber.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  testID="barber-add-to-order"
                  className="bg-indigo-600 rounded-2xl py-3.5 items-center"
                  style={{ flex: 2 }}
                  onPress={() => onAdd(note, selectedEmployee, quantity)}
                >
                  <Text className={`${typo.labelBold} text-white`}>{t('barber.addToOrder')}</Text>
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
  const typo = useTypography();
  const insets = useSafeAreaInsets();
  const total = cartItems.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const names = cartItems.map((i) => i.product.name).join(', ');
  const uniqueTechCount = new Set(cartItems.map((i) => i.employee?.id).filter(Boolean)).size;
  const isSplitSession = uniqueTechCount >= 2;

  if (cartItems.length === 0) return null;

  return (
    <View
      className="bg-indigo-600 px-4 pt-3"
      style={{ paddingBottom: insets.bottom + 12 }}
    >
      {/* Split-session indicator strip */}
      {isSplitSession && (
        <View className="flex-row items-center gap-1.5 mb-2">
          <MaterialCommunityIcons name="account-multiple-outline" size={13} color="rgba(255,255,255,0.85)" />
          <Text className={`${typo.captionBold} text-white/80`}>
            {t('barber.splitSession', { count: uniqueTechCount })} · {t('barber.splitSessionHint')}
          </Text>
        </View>
      )}
      <View className="flex-row items-center">
        <View testID="barber-cart-count" className="w-6 h-6 rounded-full bg-white items-center justify-center mr-2.5">
          <Text className={`${typo.captionBold} text-indigo-600`}>{cartItems.length}</Text>
        </View>
        <View className="flex-1 mr-3">
          <Text className={`${typo.caption} text-white opacity-80`} numberOfLines={1}>{names}</Text>
          <Text className={`${typo.label} font-bold text-white`}>{formatVnd(total)}</Text>
        </View>
        <TouchableOpacity
          className="p-2 mr-1"
          onPress={onClear}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialCommunityIcons name="trash-can-outline" size={20} color="rgba(255,255,255,0.65)" />
        </TouchableOpacity>
        <TouchableOpacity
          testID="barber-checkout-btn"
          className="bg-white rounded-2xl px-4 py-2.5"
          onPress={onCheckout}
          activeOpacity={0.85}
        >
          <Text className={`${typo.labelBold} text-indigo-600`}>{t('barber.checkout')}</Text>
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
  onCustomerChange,
  employees,
  onUpdateItemEmployee,
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
  employees: EmployeeData[];
  onUpdateItemEmployee: (key: string, employee: EmployeeData | null) => void;
}) {
  const { t, i18n } = useTranslation();
  const typo = useTypography();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [tip, setTip] = useState(0);
  const [cashReceived, setCashReceived] = useState('');
  const [cashManuallyEdited, setCashManuallyEdited] = useState(false);
  const [submitMode, setSubmitMode] = useState<'start' | 'pay' | null>(null);
  const [orderNote, setOrderNote] = useState('');
  const [isOrderNoteFocused, setIsOrderNoteFocused] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerData | null>(null);
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState('');
  const [redeemPoints, setRedeemPoints] = useState(false);
  const [selectedBankId, setSelectedBankId] = useState<number | null>(null);
  const [employeePickerKey, setEmployeePickerKey] = useState<string | null>(null);
  const [showCustomTip, setShowCustomTip] = useState(false);

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
      setCashManuallyEdited(false);
      setSubmitMode(null);
      setOrderNote('');
      setIsOrderNoteFocused(false);
      setSelectedCustomer(null);
      setShowCustomerSearch(false);
      setCustomerSearch('');
      setPromoInput('');
      setAppliedPromo('');
      setRedeemPoints(false);
      setShowCustomTip(false);
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

  // Auto-fill cash received with the final amount; only stops if receptionist types a custom value
  useEffect(() => {
    if (visible && !cashManuallyEdited) {
      setCashReceived(String(effectiveTotal));
    }
  }, [effectiveTotal, visible, cashManuallyEdited]);

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

  const cashReceivedNum = parseInt(cashReceived.replace(/[^0-9]/g, '') || '0', 10);
  const cashDelta = cashReceivedNum - effectiveTotal;
  const showSearchResults = debouncedSearch.length >= 2;
  const showRecent = !showSearchResults && !selectedCustomer && recentCustomers.length > 0;

  const paymentOptions: { value: PaymentMethod; label: string; icon: string }[] = [
    { value: 'CASH', label: t('barber.paymentCash'), icon: 'cash' },
    { value: 'BANK_TRANSFER', label: t('barber.paymentTransfer'), icon: 'bank-transfer' },
    { value: 'CARD', label: t('barber.paymentCard'), icon: 'credit-card-outline' },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity className="flex-1 bg-black/40" activeOpacity={1} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View className="bg-white rounded-t-3xl px-5 pt-4 pb-8" style={{ maxHeight: '90%' }}>

          {/* Drag handle */}
          <View className="w-10 h-1 bg-gray-200 rounded-full self-center mb-3" />

          {/* Header: title + customer pill */}
          <View className="flex-row items-center justify-between mb-3">
            <Text className={`${typo.section} text-gray-900`}>{t('barber.checkoutTitle')}</Text>
            {hasCustomer && (
              <TouchableOpacity
                className="flex-row items-center gap-x-1.5 bg-gray-100 rounded-full pl-2 pr-3 py-1.5 max-w-[48%]"
                onPress={() => setShowCustomerSearch((v) => !v)}
                activeOpacity={0.75}
              >
                <View className={`w-6 h-6 rounded-full items-center justify-center flex-shrink-0 ${selectedCustomer ? 'bg-indigo-100' : 'bg-gray-300'}`}>
                  {selectedCustomer ? (
                    <Text className={`${typo.captionBold} text-indigo-600`} style={{ fontSize: 10 }}>
                      {initials(selectedCustomer.name)}
                    </Text>
                  ) : (
                    <MaterialCommunityIcons name="account-outline" size={13} color="#6b7280" />
                  )}
                </View>
                <Text
                  className={`${typo.captionBold} flex-shrink ${selectedCustomer ? 'text-gray-800' : 'text-gray-500'}`}
                  numberOfLines={1}
                >
                  {selectedCustomer ? selectedCustomer.name : t('pos.walkIn')}
                </Text>
                <MaterialCommunityIcons
                  name={showCustomerSearch ? 'chevron-up' : 'pencil-outline'}
                  size={13}
                  color="#9ca3af"
                />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            {/* Customer panel — expands when editing */}
            {hasCustomer && showCustomerSearch && (
              <View className="mb-4 bg-gray-50 rounded-2xl p-3">
                {selectedCustomer ? (
                  <View className="flex-row items-center">
                    <View className="w-8 h-8 rounded-full bg-indigo-100 items-center justify-center mr-2.5">
                      <Text className={`${typo.captionBold} text-indigo-600`}>{initials(selectedCustomer.name)}</Text>
                    </View>
                    <View className="flex-1">
                      <Text className={`${typo.label} text-gray-900`}>{selectedCustomer.name}</Text>
                      <Text className={`${typo.caption} text-gray-500`}>{selectedCustomer.phone}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => { setSelectedCustomer(null); setShowCustomerSearch(true); onCustomerChange?.(null); }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <MaterialCommunityIcons name="close-circle" size={20} color="#9ca3af" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    <View className="flex-row items-center bg-white border border-gray-200 rounded-xl px-3 py-2.5">
                      <MaterialCommunityIcons name="magnify" size={16} color="#9ca3af" />
                      <TextInput
                        className={`flex-1 ml-2 ${typo.inputSize} text-gray-800`}
                        placeholder={t('barber.customerSearchPlaceholder')}
                        placeholderTextColor="#9ca3af"
                        value={customerSearch}
                        onChangeText={setCustomerSearch}
                        returnKeyType="search"
                        autoFocus
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
                          <Text className={`${typo.caption} text-gray-400 text-center py-3`}>
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
                                  setShowCustomerSearch(false);
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
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-2">
                        {recentCustomers.map((c) => (
                          <TouchableOpacity
                            key={c.id}
                            className="bg-white border border-gray-200 rounded-full px-3 py-1.5 mr-2"
                            onPress={() => {
                              Haptics.selectionAsync();
                              setSelectedCustomer(c);
                              setShowCustomerSearch(false);
                              onCustomerChange?.(c);
                            }}
                          >
                            <Text className={`${typo.caption} text-gray-700 font-medium`}>
                              {c.name.split(' ').pop()}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    )}
                  </>
                )}
              </View>
            )}

            {/* Allergy warning — always visible when customer has allergies */}
            {selectedCustomer?.allergiesOrSensitivities && (
              <View className="flex-row items-start gap-x-2 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2.5 mb-3">
                <MaterialCommunityIcons name="alert-circle" size={15} color="#e11d48" style={{ marginTop: 1 }} />
                <View className="flex-1">
                  <Text className={`${typo.captionBold} text-rose-600 uppercase tracking-wide`}>
                    {t('customer.allergies')}
                  </Text>
                  <Text className={`${typo.caption} text-rose-800 mt-0.5`}>
                    {selectedCustomer.allergiesOrSensitivities}
                  </Text>
                </View>
              </View>
            )}

            {/* Split-session summary */}
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
                    <Text className={`${typo.captionBold} text-teal-700`}>{t('barber.splitSessionHint')}</Text>
                  </View>
                  {Array.from(techMap.values()).map(({ name, items: techItems }) => (
                    <View key={name} className="flex-row items-center gap-1">
                      <View className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                      <Text className={`${typo.caption} text-teal-700 font-semibold`}>{name.split(' ').pop()}</Text>
                      <Text className={`${typo.caption} text-teal-500`}>({techItems.map(i => i.product.name).join(', ')})</Text>
                    </View>
                  ))}
                </View>
              );
            })()}

            {/* Cart items */}
            {cartItems.map((item) => (
              <View key={item.key} className="flex-row items-start py-3 border-b border-gray-50">
                <View className="flex-1">
                  <Text className={`${typo.label} text-gray-900`}>{item.product.name}</Text>
                  {employees.length > 0 && (
                    <TouchableOpacity
                      className="flex-row items-center gap-x-1 mt-0.5"
                      onPress={() => setEmployeePickerKey(item.key)}
                      activeOpacity={0.7}
                      hitSlop={{ top: 4, bottom: 4, left: 0, right: 8 }}
                    >
                      <MaterialCommunityIcons
                        name="account-circle-outline"
                        size={13}
                        color={item.employee ? '#4f46e5' : '#9ca3af'}
                      />
                      <Text className={`${typo.caption} ${item.employee ? 'text-indigo-600' : 'text-gray-400'}`}>
                        {item.employee ? item.employee.fullName.split(' ').pop() : t('barber.assignLabel')}
                      </Text>
                      <MaterialCommunityIcons name="chevron-down" size={12} color="#9ca3af" />
                    </TouchableOpacity>
                  )}
                  {!!item.note && (
                    <Text className={`${typo.caption} text-gray-400 mt-0.5`}>{item.note}</Text>
                  )}
                  {item.quantity > 1 && (
                    <Text className={`${typo.caption} text-gray-500 mt-0.5`}>×{item.quantity}</Text>
                  )}
                </View>
                <Text className={`${typo.label} font-bold text-indigo-600 mr-3 mt-0.5`}>
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
              {(tip > 0 || pointsDiscount > 0) && (
                <>
                  <View className="flex-row justify-between items-center mb-1">
                    <Text className={`${typo.caption} text-gray-500`}>{t('barber.subtotal')}</Text>
                    <Text className={`${typo.caption} text-gray-600`}>{formatVnd(itemsTotal)}</Text>
                  </View>
                  {tip > 0 && (
                    <View className="flex-row justify-between items-center mb-1">
                      <Text className={`${typo.caption} text-gray-500`}>{t('barber.tip')}</Text>
                      <Text className={`${typo.caption} font-medium text-emerald-600`}>+{formatVnd(tip)}</Text>
                    </View>
                  )}
                  {pointsDiscount > 0 && (
                    <View className="flex-row justify-between items-center mb-2">
                      <Text className={`${typo.caption} text-gray-500`}>{t('barber.pointsDiscount')}</Text>
                      <Text className={`${typo.caption} font-medium text-amber-600`}>-{formatVnd(pointsDiscount)}</Text>
                    </View>
                  )}
                </>
              )}
              <View className="bg-indigo-50 rounded-2xl px-4 py-3 flex-row justify-between items-center">
                <Text className={`${typo.label} text-indigo-700`}>{t('barber.totalDue')}</Text>
                <Text className={`${typo.heading} font-bold text-indigo-600`}>{formatVnd(effectiveTotal)}</Text>
              </View>
            </View>

            {/* Promo code */}
            {!appliedPromo ? (
              <View className="flex-row gap-x-2 mt-2 mb-3">
                <TextInput
                  className={`flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 ${typo.inputSize} text-gray-800`}
                  placeholder={t('pos.promoCode')}
                  placeholderTextColor="#9ca3af"
                  value={promoInput}
                  onChangeText={setPromoInput}
                  autoCapitalize="characters"
                  returnKeyType="done"
                />
                <TouchableOpacity
                  className="bg-gray-100 rounded-xl px-4 py-2.5 items-center justify-center active:opacity-70"
                  onPress={() => {
                    const code = promoInput.trim();
                    if (!code) return;
                    Haptics.selectionAsync();
                    setAppliedPromo(code);
                    setPromoInput('');
                  }}
                >
                  <Text className={`${typo.label} text-indigo-600 font-semibold`}>{t('pos.applyPromo')}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View className="flex-row items-center bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-2.5 mt-2 mb-3">
                <MaterialCommunityIcons name="tag-outline" size={16} color="#4f46e5" />
                <Text className={`${typo.label} flex-1 ml-2 text-indigo-700 font-semibold`}>{appliedPromo}</Text>
                <TouchableOpacity onPress={() => setAppliedPromo('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <MaterialCommunityIcons name="close" size={16} color="#4f46e5" />
                </TouchableOpacity>
              </View>
            )}

            {/* Tip chips */}
            <View className="mb-3">
              <Text className={`${typo.label} text-gray-700 mb-2`}>{t('barber.tipLabel')}</Text>
              <View className="flex-row gap-x-2 items-center">
                {TIP_AMOUNTS.map((amount) => {
                  const selected = tip === amount && !showCustomTip;
                  return (
                    <TouchableOpacity
                      key={amount}
                      className={`flex-1 py-2 rounded-xl border items-center ${
                        selected ? 'bg-emerald-500 border-emerald-500' : 'bg-white border-gray-200'
                      }`}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setTip(selected ? 0 : amount);
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
                    rawValue={String(tip)}
                    onChangeRaw={(raw) => setTip(parseInt(raw || '0', 10))}
                    placeholder="0"
                    autoFocus
                    onBlur={() => setShowCustomTip(false)}
                  />
                </View>
              )}
            </View>

            {/* Loyalty points redemption */}
            {canRedeem && selectedCustomer && (
              <TouchableOpacity
                className={`flex-row items-center justify-between rounded-2xl px-4 py-3 mb-3 border ${
                  redeemPoints ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'
                }`}
                onPress={() => { Haptics.selectionAsync(); setRedeemPoints((v) => !v); }}
                activeOpacity={0.8}
              >
                <View className="flex-1 mr-3">
                  <Text className={`${typo.label} ${redeemPoints ? 'text-amber-800' : 'text-gray-700'}`}>
                    {t('barber.usePoints')}
                  </Text>
                  <Text className={`${typo.caption} mt-0.5 ${redeemPoints ? 'text-amber-600' : 'text-gray-400'}`}>
                    {customerPoints} {t('barber.pointsAvailable')}
                    {redeemPoints && pointsDiscount > 0 ? ` · -${formatVnd(pointsDiscount)}` : ''}
                  </Text>
                </View>
                <View className={`w-12 h-6 rounded-full justify-center px-0.5 ${redeemPoints ? 'bg-amber-500' : 'bg-gray-300'}`}>
                  <View className={`w-5 h-5 rounded-full bg-white shadow ${redeemPoints ? 'self-end' : 'self-start'}`} />
                </View>
              </TouchableOpacity>
            )}

            {/* Cash received — large full-width input */}
            {paymentMethod === 'CASH' && (
              <View className="mb-3">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className={`${typo.label} text-gray-700`}>{t('barber.cashReceived')}</Text>
                  {cashManuallyEdited && (
                    <TouchableOpacity
                      className="flex-row items-center gap-x-1"
                      onPress={() => { Haptics.selectionAsync(); setCashManuallyEdited(false); }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <MaterialCommunityIcons name="refresh" size={13} color="#4f46e5" />
                      <Text className={`${typo.captionBold} text-indigo-600`}>{t('barber.exactAmount')}</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <View className="flex-row items-center border-2 border-indigo-200 rounded-2xl overflow-hidden bg-indigo-50">
                  <TextInput
                    value={formatMoneyDisplay(cashReceived)}
                    onChangeText={(text) => {
                      const digits = text.replace(/[^0-9]/g, '');
                      setCashReceived(digits);
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
                {cashReceived ? (
                  <Text className={`${typo.caption} text-indigo-600 mt-1 ml-1 italic`}>
                    {numberToWords(parseInt(cashReceived, 10), i18n.language)}
                  </Text>
                ) : null}
                {cashReceivedNum > 0 && cashDelta !== 0 && (
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

            {/* Payment method — compact pills with icons */}
            <View className="flex-row gap-x-2 mb-3">
              {paymentOptions.map(({ value, label, icon }) => (
                <TouchableOpacity
                  key={value}
                  className={`flex-1 flex-row items-center justify-center gap-x-1.5 py-2 rounded-xl border ${
                    paymentMethod === value ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-gray-200'
                  }`}
                  onPress={() => { Haptics.selectionAsync(); setPaymentMethod(value); }}
                >
                  <MaterialCommunityIcons
                    name={icon as any}
                    size={14}
                    color={paymentMethod === value ? '#fff' : '#6b7280'}
                  />
                  <Text className={`${typo.captionBold} ${paymentMethod === value ? 'text-white' : 'text-gray-600'}`}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Bank transfer QR */}
            {paymentMethod === 'BANK_TRANSFER' && (
              <View className="bg-gray-50 rounded-2xl p-4 mb-3">
                {activeBank ? (
                  <>
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
                              className={`rounded-full px-3 py-1.5 border ${isActive ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-gray-200'}`}
                              onPress={() => handleBankSelect(bank.id)}
                            >
                              <Text className={`${typo.captionBold} ${isActive ? 'text-white' : 'text-gray-600'}`}>
                                {bank.bankShortName ?? bank.bankName}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    )}
                    <VietQrCard
                      bank={activeBank}
                      amount={effectiveTotal}
                      description={qrDescription}
                    />
                  </>
                ) : (
                  <View className="items-center py-2">
                    <MaterialCommunityIcons name="bank-outline" size={32} color="#9ca3af" />
                    <Text className={`${typo.label} text-gray-500 mt-2 text-center`}>{t('barber.noBankAccount')}</Text>
                    <Text className={`${typo.caption} text-gray-400 mt-1 text-center`}>{t('barber.noBankAccountHint')}</Text>
                  </View>
                )}
              </View>
            )}

            {/* Order note */}
            <View className="mb-5">
              <Text className={`${typo.label} text-gray-700 mb-2`}>{t('barber.orderNote')}</Text>
              <QuickPhraseBar
                phrases={BARBER_PHRASES}
                visible={isOrderNoteFocused}
                onSelect={(phrase) =>
                  setOrderNote((prev) => (prev.trim() ? `${prev.trim()} ${phrase}` : phrase))
                }
              />
              <TextInput
                className={`bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 ${typo.inputSize}`}
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
              <Text className={`${typo.label} flex-1 text-amber-800 font-medium`}>{checkoutError}</Text>
              <TouchableOpacity onPress={onDismissError} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <MaterialCommunityIcons name="close" size={16} color="#d97706" />
              </TouchableOpacity>
            </View>
          )}

          {/* PRIMARY: Start service (IN_PROGRESS — beauty shops' default flow) */}
          <TouchableOpacity
            testID="barber-start-service-btn"
            className={`rounded-2xl py-4 items-center mt-2 flex-row justify-center ${
              creating && submitMode === 'start' ? 'bg-indigo-400' : 'bg-indigo-600'
            }`}
            onPress={() => {
              setSubmitMode('start');
              onConfirm({
                customer: selectedCustomer,
                paymentMethod,
                note: orderNote,
                tip,
                promoCode: appliedPromo,
                loyaltyPointsToRedeem: 0,
                createAsInProgress: true,
              });
            }}
            disabled={creating || cartItems.length === 0}
            activeOpacity={0.85}
          >
            {creating && submitMode === 'start' ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <MaterialCommunityIcons name="play-circle-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
                <Text className={`${typo.labelBold} text-white`}>{t('barber.startService')}</Text>
              </>
            )}
          </TouchableOpacity>

          {/* SECONDARY: Pay now (collect & complete immediately) */}
          <TouchableOpacity
            testID="barber-place-order-btn"
            className="border border-indigo-600 rounded-2xl py-3.5 items-center mt-2 flex-row justify-center"
            onPress={() => {
              setSubmitMode('pay');
              onConfirm({
                customer: selectedCustomer,
                paymentMethod,
                note: orderNote,
                amountPaid: paymentMethod === 'CASH' && cashReceivedNum > 0 ? cashReceivedNum : undefined,
                tip,
                promoCode: appliedPromo,
                loyaltyPointsToRedeem: redeemPoints && canRedeem ? customerPoints : 0,
              });
            }}
            disabled={creating || cartItems.length === 0}
            activeOpacity={0.85}
          >
            {creating && submitMode === 'pay' ? (
              <ActivityIndicator color="#4f46e5" size="small" />
            ) : (
              <>
                <MaterialCommunityIcons name="cash-check" size={16} color="#4f46e5" style={{ marginRight: 6 }} />
                <Text className={`${typo.labelBold} text-indigo-600`}>
                  {t('barber.placeOrder')} · {formatVnd(effectiveTotal)}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Employee picker for cart items */}
      <Modal
        visible={!!employeePickerKey}
        transparent
        animationType="slide"
        onRequestClose={() => setEmployeePickerKey(null)}
      >
        <TouchableOpacity
          className="flex-1 bg-black/40"
          activeOpacity={1}
          onPress={() => setEmployeePickerKey(null)}
        />
        <View className="bg-white rounded-t-3xl px-5 pt-4 pb-10">
          <View className="w-10 h-1 bg-gray-200 rounded-full self-center mb-4" />
          <Text className={`${typo.section} text-gray-900 mb-3`}>{t('barber.assignLabel')}</Text>
          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 320 }}>
            {/* Clear option */}
            <TouchableOpacity
              className="flex-row items-center py-3 border-b border-gray-50"
              onPress={() => {
                if (employeePickerKey) onUpdateItemEmployee(employeePickerKey, null);
                setEmployeePickerKey(null);
              }}
            >
              <View className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center mr-3">
                <MaterialCommunityIcons name="close" size={18} color="#6b7280" />
              </View>
              <Text className={`${typo.label} text-gray-500`}>{t('orders.noTechnician')}</Text>
            </TouchableOpacity>
            {employees.map((emp) => {
              const currentItem = cartItems.find((i) => i.key === employeePickerKey);
              const isSelected = currentItem?.employee?.id === emp.id;
              return (
                <TouchableOpacity
                  key={emp.id}
                  className="flex-row items-center py-3 border-b border-gray-50"
                  onPress={() => {
                    if (employeePickerKey) onUpdateItemEmployee(employeePickerKey, emp);
                    setEmployeePickerKey(null);
                  }}
                >
                  <View
                    className={`w-9 h-9 rounded-full items-center justify-center mr-3 ${
                      isSelected ? 'bg-indigo-100' : 'bg-gray-100'
                    }`}
                  >
                    <Text className={`${typo.captionBold} ${isSelected ? 'text-indigo-600' : 'text-gray-600'}`}>
                      {initials(emp.fullName)}
                    </Text>
                  </View>
                  <Text className={`${typo.label} flex-1 text-gray-800`}>{emp.fullName}</Text>
                  {isSelected && <MaterialCommunityIcons name="check" size={18} color="#4f46e5" />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
    </Modal>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export function BarberServiceScreen({ navigation, route }: SellingScreenProps<'POSMain'>) {
  const { t } = useTranslation();
  const typo = useTypography();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const has = useFeatureCheck();
  const { show: showAlert } = useAlertStore();
  const { setActiveView, barberCategoryId, setBarberCategoryId } = useSellingStore();
  const { width } = useWindowDimensions();
  const [gridPref, setGridPref] = useState<'auto' | '2' | '3'>('auto');

  // When existingOrderId is set, items are added directly to that IN_PROGRESS order
  const existingOrderId = route?.params?.existingOrderId;

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
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(barberCategoryId);
  const [page, setPage] = useState(0);
  const [allServices, setAllServices] = useState<ProductData[]>([]);

  const selectCategory = (id: string | null) => {
    setSelectedCategoryId(id);
    setBarberCategoryId(id);
    setPage(0);
  };
  const isLoadingMore = useRef(false);
  const canLoadMore = useRef(false);

  const [selectedProduct, setSelectedProduct] = useState<ProductData | null>(null);
  const [pendingProduct, setPendingProduct] = useState<ProductData | null>(null);
  const [targetOrderId, setTargetOrderId] = useState<string | null>(null);
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
  const [upgradeVisible, setUpgradeVisible] = useState(false);

  const commitSearch = () => {
    setSearch(searchInput);
    selectCategory(null);
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
    staleTime: 30_000,
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

  const { data: activeOrders = [], refetch: refetchActiveOrders } = useQuery({
    queryKey: ['orders', 'active'],
    queryFn: () => orderApi.list({ status: 'IN_PROGRESS', size: 20 }).then((r) => r.data.data.content),
    staleTime: 15_000,
    enabled: !existingOrderId,
  });

  // Refresh active orders strip whenever the screen regains focus (e.g. returning from OrderDetail)
  useFocusEffect(useCallback(() => {
    if (!existingOrderId) refetchActiveOrders();
  }, [existingOrderId, refetchActiveOrders]));

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

  const handleAdd = async (note: string, employee: EmployeeData | null, quantity: number) => {
    if (!selectedProduct) return;

    const addToOrderId = targetOrderId ?? existingOrderId ?? null;

    // Add-to-existing-order mode: directly POST to the order
    if (addToOrderId) {
      setCreating(true);
      try {
        await orderApi.addItem(addToOrderId, {
          productId: selectedProduct.id,
          quantity,
          ...(employee ? { employeeId: employee.id } : {}),
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        queryClient.invalidateQueries({ queryKey: ['order', addToOrderId] });
        queryClient.invalidateQueries({ queryKey: ['orders', 'active'] });
        setSelectedProduct(null);
        setTargetOrderId(null);
        if (existingOrderId) navigation.goBack();
      } catch (err: any) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        const msg = err?.response?.data?.message ?? t('barber.createFailed');
        setCheckoutError(msg);
        setSelectedProduct(null);
        setTargetOrderId(null);
      } finally {
        setCreating(false);
      }
      return;
    }

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
    tip,
    promoCode,
    loyaltyPointsToRedeem,
    createAsInProgress,
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
        tip: tip > 0 ? tip : undefined,
        notes: orderNote.trim() || undefined,
        customerId: customer?.id,
        loyaltyPointsToRedeem: loyaltyPointsToRedeem > 0 ? loyaltyPointsToRedeem : undefined,
        createAsInProgress: createAsInProgress ?? false,
      });
      const { orderId, orderNumber, total } = checkoutRes.data.data;

      setCartItems([]);
      setCheckoutVisible(false);
      await AsyncStorage.setItem(LAST_PAYMENT_KEY, paymentMethod);
      queryClient.invalidateQueries({ queryKey: ['workItems'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders', 'active'] });
      queryClient.invalidateQueries({ queryKey: ['customers', 'recent'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      if (createAsInProgress) {
        // Navigate to OrderDetail where staff can add/remove items and pay later
        navigation.navigate('OrderDetail', { orderId });
      } else {
        navigation.navigate('OrderSuccess', { orderId, orderNumber, total });
      }
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      if (err?.response?.data?.error === 'ORDER_LIMIT_EXCEEDED') {
        setCheckoutVisible(false);
        setUpgradeVisible(true);
      } else {
        const msg = err?.response?.data?.message ?? t('barber.createFailed');
        setCheckoutError(msg);
      }
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
            <Text className={`${typo.heading} text-gray-900 dark:text-white`}>
            {existingOrderId ? t('barber.addToOrderTitle') : t('barber.title')}
          </Text>
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
        <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 mt-0.5 mb-0`}>{t('barber.hint')}</Text>

        {/* View toggle */}
        <View className="flex-row bg-gray-100 dark:bg-gray-700 rounded-2xl p-1 mt-2 mb-3">
          <View className="flex-1 rounded-xl py-2 items-center bg-white dark:bg-gray-600">
            <Text className={`${typo.label} text-indigo-600 dark:text-indigo-400`}>
              {t('selling.title')}
            </Text>
          </View>
          <TouchableOpacity
            className="flex-1 rounded-xl py-2 items-center active:opacity-70"
            onPress={() => { Haptics.selectionAsync(); setActiveView('ORDERS'); }}
          >
            <Text className={`${typo.label} text-gray-500 dark:text-gray-300`}>
              {t('orders.title')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search bar */}
        <View className="flex-row items-center gap-2 mb-2">
          <View className="flex-1 flex-row items-center bg-gray-100 dark:bg-gray-700 rounded-xl px-3 py-2.5">
            <MaterialCommunityIcons name="magnify" size={20} color="#9ca3af" />
            <TextInput
              className={`flex-1 ml-2 ${typo.inputSize} text-gray-800 dark:text-white`}
              placeholder={t('barber.searchPlaceholder')}
              placeholderTextColor="#9ca3af"
              value={searchInput}
              onChangeText={setSearchInput}
              returnKeyType="search"
              onSubmitEditing={commitSearch}
            />
            {searchInput.length > 0 && (
              <TouchableOpacity
                onPress={() => { setSearchInput(''); setSearch(''); selectCategory(null); }}
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
            <Text className={`${typo.label} text-white font-semibold`}>{t('pos.searchButton')}</Text>
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
                selectCategory(null);
              }}
            >
              <Text className={`${typo.captionBold} ${selectedCategoryId === null ? 'text-white' : 'text-gray-600'}`}>
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
                    selectCategory(active ? null : cat.id);
                  }}
                >
                  {cat.emoji ? <Text>{cat.emoji}</Text> : null}
                  <Text className={`${typo.captionBold} ${active ? 'text-white' : 'text-gray-600'}`}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* Product grid */}
      {(productsLoading || (productsFetching && allServices.length === 0)) && page === 0 ? (
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
            <ServiceCard
              item={item}
              onPress={(product) => {
                if (!existingOrderId && activeOrders.length > 0) {
                  setPendingProduct(product);
                } else {
                  setSelectedProduct(product);
                }
              }}
            />
          )}
          numColumns={numColumns}
          contentContainerStyle={{
            padding: 6,
            paddingBottom: insets.bottom + (cartItems.length > 0 ? 100 : 16) + (activeOrders.length > 0 ? 200 : 0),
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

      {/* Order picker sheet — shown when tapping + with active orders */}
      <OrderPickerSheet
        visible={!!pendingProduct}
        orders={activeOrders}
        onSelectNew={() => {
          setTargetOrderId(null);
          setSelectedProduct(pendingProduct);
          setPendingProduct(null);
        }}
        onSelectOrder={(orderId) => {
          setTargetOrderId(orderId);
          setSelectedProduct(pendingProduct);
          setPendingProduct(null);
        }}
        onClose={() => setPendingProduct(null)}
      />

      {/* Add item sheet */}
      <AddItemSheet
        product={selectedProduct}
        employees={employees}
        onAdd={handleAdd}
        onClose={() => { setSelectedProduct(null); setTargetOrderId(null); }}
      />

      {/* Bottom dock: active orders strip + cart bar */}
      <View className="absolute bottom-0 left-0 right-0">
        <ActiveOrdersStrip
          orders={activeOrders}
          onPress={(orderId) => navigation.navigate('OrderDetail', { orderId })}
        />
        <CartBar
          cartItems={cartItems}
          onClear={handleClearCart}
          onCheckout={() => setCheckoutVisible(true)}
        />
      </View>

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
        employees={employees}
        onUpdateItemEmployee={(key, emp) =>
          setCartItems((prev) => prev.map((i) => (i.key === key ? { ...i, employee: emp } : i)))
        }
      />
      <UpgradeModal visible={upgradeVisible} onClose={() => setUpgradeVisible(false)} />
    </View>
  );
}
