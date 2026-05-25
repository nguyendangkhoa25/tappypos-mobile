/**
 * FnBServiceScreen — F&B order screen.
 *
 * Operates in two modes depending on cartStore.activeOrderId:
 *
 *  NEW ORDER mode  (activeOrderId === null)
 *    – Table was AVAILABLE. Creates a fresh cart.
 *    – "Send to Kitchen" + "Checkout" both available.
 *
 *  ADD-MORE mode   (activeOrderId !== null)
 *    – Table was OCCUPIED with a PENDING kitchen order.
 *    – Items added/removed directly on the existing order via orderApi.
 *    – "Checkout" pays and completes the order (no kitchen re-send needed).
 */

import { useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ScrollView,
  Modal,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Print from 'expo-print';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  cartApi,
  orderApi,
  productApi,
  categoryApi,
  type ProductData,
  type CategoryData,
  type CartResponse,
} from '../../services/api';
import { MoneyInput } from '../../components/MoneyInput';
import { PaymentSheet, type PaymentMethod } from '../../components/PaymentSheet';
import { CustomerPickerSheet } from '../../components/CustomerPickerSheet';
import { EmptyState } from '../../components/EmptyState';
import { useCartStore } from '../../store/cartStore';
import type { SelectedCustomer } from '../../store/cartStore';
import { useErrorAlert } from '../../hooks/useErrorAlert';
import { useTypography } from '../../hooks/useTypography';
import { formatVnd } from '../../utils/format';
import type { SellingScreenProps } from '../../types/navigation';

type Props = SellingScreenProps<'POSMain'>;
type PayMethod = PaymentMethod;

/** Unified line-item shape for rendering — normalises cart items and order items. */
type LineItem = {
  id: string;          // cartItemId (cart mode) OR String(orderItem.id) (order mode)
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  note?: string | null;
};

type NoteModalState = {
  visible: boolean;
  lineItem: LineItem | null;
  draft: string;
};

const LAST_PAYMENT_KEY = 'fnb_last_payment_method';

// ─── ProductCard ──────────────────────────────────────────────────────────────

function ProductCard({
  product,
  qtyInCart,
  onAdd,
  onRemove,
}: {
  product: ProductData;
  qtyInCart: number;
  onAdd: () => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation();
  const typo = useTypography();
  const outOfStock = product.inStock === false;

  return (
    <View
      className={`flex-1 bg-white dark:bg-gray-800 rounded-2xl p-3 border ${
        qtyInCart > 0 ? 'border-primary' : 'border-gray-100 dark:border-gray-700'
      } ${outOfStock ? 'opacity-50' : ''}`}
    >
      <Text className={`${typo.label} text-gray-900 dark:text-white mb-0.5`} numberOfLines={2}>
        {product.name}
      </Text>
      <Text className={`${typo.captionBold} text-primary mb-3`}>
        {formatVnd(product.price)}
      </Text>

      {qtyInCart > 0 ? (
        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            onPress={onRemove}
            disabled={outOfStock}
            className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 items-center justify-center"
          >
            <MaterialCommunityIcons name="minus" size={16} color="#374151" />
          </TouchableOpacity>
          <Text className={`${typo.labelBold} text-gray-900 dark:text-white mx-2`}>
            {qtyInCart}
          </Text>
          <TouchableOpacity
            onPress={onAdd}
            disabled={outOfStock}
            className="w-8 h-8 rounded-full bg-primary items-center justify-center"
          >
            <MaterialCommunityIcons name="plus" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          onPress={onAdd}
          disabled={outOfStock}
          className="flex-row items-center justify-center gap-1 bg-primary rounded-xl py-2"
        >
          <MaterialCommunityIcons name="plus" size={16} color="#fff" />
          <Text className={`${typo.captionBold} text-white`}>
            {outOfStock ? '—' : t('fnb.add')}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── OrderLineItem ────────────────────────────────────────────────────────────

function OrderLineItem({
  item,
  onIncrease,
  onDecrease,
  onEditNote,
}: {
  item: LineItem;
  onIncrease: () => void;
  onDecrease: () => void;
  onEditNote: () => void;
}) {
  const typo = useTypography();
  const { t } = useTranslation();
  return (
    <View className="px-4 py-2.5">
      <View className="flex-row items-center gap-3">
        <View className="flex-1">
          <Text className={`${typo.label} text-gray-900 dark:text-white`} numberOfLines={1}>
            {item.productName}
          </Text>
          <Text className={`${typo.caption} text-gray-400`}>
            {formatVnd(item.unitPrice)} × {item.quantity}
          </Text>
        </View>
        <Text className={`${typo.labelBold} text-gray-800 dark:text-gray-100 w-24 text-right`}>
          {formatVnd(item.subtotal)}
        </Text>
        <View className="flex-row items-center gap-1">
          <TouchableOpacity
            onPress={onDecrease}
            className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-700 items-center justify-center"
          >
            <MaterialCommunityIcons name="minus" size={14} color="#374151" />
          </TouchableOpacity>
          <Text className={`${typo.captionBold} text-gray-900 dark:text-white w-5 text-center`}>
            {item.quantity}
          </Text>
          <TouchableOpacity
            onPress={onIncrease}
            className="w-7 h-7 rounded-full bg-primary items-center justify-center"
          >
            <MaterialCommunityIcons name="plus" size={14} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
      {/* Note row */}
      <TouchableOpacity
        onPress={onEditNote}
        className="flex-row items-center gap-1 mt-0.5 self-start"
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      >
        {item.note ? (
          <>
            <MaterialCommunityIcons name="pencil-outline" size={11} color="#6b7280" />
            <Text className={`${typo.caption} text-amber-600 dark:text-amber-400 italic`} numberOfLines={1}>
              {item.note}
            </Text>
          </>
        ) : (
          <>
            <MaterialCommunityIcons name="plus-circle-outline" size={11} color="#9ca3af" />
            <Text className={`${typo.caption} text-gray-400 italic`}>{t('fnb.addNote')}</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

// ─── FnBServiceScreen ─────────────────────────────────────────────────────────

export function FnBServiceScreen(_props: Props) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const typo = useTypography();
  const showErrorAlert = useErrorAlert();
  const qc = useQueryClient();
  const isFocused = useIsFocused();

  const { tableId, tableLabel, activeOrderId, clearCart, setActiveOrderId, isTakeaway, takeawayPickupTime } = useCartStore(
    (s) => ({
      tableId: s.tableId,
      tableLabel: s.tableLabel,
      activeOrderId: s.activeOrderId,
      clearCart: s.clearCart,
      setActiveOrderId: s.setActiveOrderId,
      isTakeaway: s.isTakeaway,
      takeawayPickupTime: s.takeawayPickupTime,
    }),
  );

  const isOrderMode = activeOrderId !== null;

  // ── Cart mode state ──────────────────────────────────────────────────────────
  const [cartId, setCartId] = useState<string | null>(null);
  const [cart, setCart] = useState<CartResponse | null>(null);
  const [cartInitializing, setCartInitializing] = useState(!isOrderMode);
  const cartIdRef = useRef<string | null>(null);

  // ── Order mode state (React Query) ──────────────────────────────────────────
  // If the order is PENDING (created by sendToKitchen), auto-transition it to
  // IN_PROGRESS before returning so addItem / removeItem / payAndComplete work.
  const {
    data: orderDetail,
    isLoading: orderLoading,
    refetch: refetchOrder,
  } = useQuery({
    queryKey: ['fnb-order', activeOrderId],
    queryFn: async () => {
      const order = await orderApi.getById(activeOrderId!).then((r) => r.data.data);
      if (order.status === 'PENDING') {
        await orderApi.start(activeOrderId!);
        return orderApi.getById(activeOrderId!).then((r) => r.data.data);
      }
      return order;
    },
    enabled: isOrderMode && isFocused,
    staleTime: 0,
  });

  // ── Shared UI state ──────────────────────────────────────────────────────────
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [orderExpanded, setOrderExpanded] = useState(false);
  const [kitchenPending, setKitchenPending] = useState(false);
  const [actionPending, setActionPending] = useState(false);  // item add/remove debounce

  // ── Checkout state ───────────────────────────────────────────────────────────
  const [checkoutVisible, setCheckoutVisible] = useState(false);
  const [paymentSheetVisible, setPaymentSheetVisible] = useState(false);
  const [lastPaymentMethod, setLastPaymentMethod] = useState<PayMethod | null>(null);
  const [tipRaw, setTipRaw] = useState('');
  const [note, setNote] = useState('');
  const [checkingOut, setCheckingOut] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<SelectedCustomer | null>(null);
  const [customerPickerVisible, setCustomerPickerVisible] = useState(false);

  // ── Item-note modal state ────────────────────────────────────────────────────
  const [noteModal, setNoteModal] = useState<NoteModalState>({
    visible: false,
    lineItem: null,
    draft: '',
  });
  const [noteSaving, setNoteSaving] = useState(false);

  // ── Post-checkout / receipt state ────────────────────────────────────────────
  const [completedOrder, setCompletedOrder] = useState<{
    orderId: string;
    orderNumber: string;
    total: number;
  } | null>(null);
  const [printPending, setPrintPending] = useState(false);

  // ── Product / category queries ───────────────────────────────────────────────
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryApi.list().then((r) => r.data.data),
    staleTime: 5 * 60_000,
  });

  const { data: productsPage, isLoading: productsLoading, isFetching: productsFetching } = useQuery({
    queryKey: ['products-fnb', selectedCategoryId],
    queryFn: () =>
      productApi
        .list({ categoryId: selectedCategoryId ?? undefined, size: 100 })
        .then((r) => r.data.data),
    staleTime: 2 * 60_000,
  });

  // Count badge for the active chip — sourced from the server's totalElements, no extra API call.
  const activeCategoryCount = !productsFetching && productsPage?.totalElements != null
    ? productsPage.totalElements
    : null;

  const products = productsPage?.content ?? [];

  // ── Normalised line items ────────────────────────────────────────────────────
  const lineItems: LineItem[] = useMemo(() => {
    if (isOrderMode && orderDetail) {
      return orderDetail.items.map((item) => ({
        id: String(item.id ?? ''),
        productId: String(item.productId ?? ''),
        productName: item.productName,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        subtotal: item.subtotal,
        note: item.note ?? null,
      }));
    }
    return (
      cart?.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        subtotal: item.subtotal,
        note: item.notes ?? null,
      })) ?? []
    );
  }, [isOrderMode, orderDetail, cart]);

  const subtotal = isOrderMode
    ? (orderDetail?.subtotal ?? 0)
    : (cart?.subtotal ?? 0);
  const total = isOrderMode ? (orderDetail?.total ?? 0) : (cart?.total ?? 0);
  const itemCount = lineItems.reduce((s, i) => s + i.quantity, 0);

  // ── Cart initialisation (new-order mode only) ────────────────────────────────
  const initCart = useCallback(async () => {
    if (isOrderMode) return;
    setCartInitializing(true);
    try {
      const res = await cartApi.init();
      const id = res.data.data.cartId;
      setCartId(id);
      cartIdRef.current = id;
      setCart(res.data.data);
    } catch (e) {
      showErrorAlert(e);
    } finally {
      setCartInitializing(false);
    }
  }, [isOrderMode, showErrorAlert]);

  useFocusEffect(
    useCallback(() => {
      initCart();
      AsyncStorage.getItem(LAST_PAYMENT_KEY).then((v) => {
        if (v === 'CASH' || v === 'BANK_TRANSFER') setLastPaymentMethod(v);
      });
    }, [initCart]),
  );

  // ── Item qty helpers ─────────────────────────────────────────────────────────
  const getLineQty = useCallback(
    (productId: string) =>
      lineItems.find((i) => i.productId === productId)?.quantity ?? 0,
    [lineItems],
  );

  // ── Add item ─────────────────────────────────────────────────────────────────
  const addItem = useCallback(
    async (product: ProductData) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setActionPending(true);
      try {
        if (isOrderMode) {
          await orderApi.addItem(activeOrderId!, {
            productId: product.id,
            quantity: 1,
          });
          await refetchOrder();
          // Keep tables query fresh so the grid reflects any total change
          qc.invalidateQueries({ queryKey: ['tables'] });
        } else {
          const id = cartIdRef.current;
          if (!id) return;
          const res = await cartApi.addItem(id, product.id, 1);
          setCart(res.data.data);
        }
      } catch (e) {
        showErrorAlert(e);
      } finally {
        setActionPending(false);
      }
    },
    [isOrderMode, activeOrderId, refetchOrder, qc, showErrorAlert],
  );

  // ── Void order-mode item (with reason confirmation) ─────────────────────────
  /**
   * Shows a 3-option reason Alert before removing an item from a sent order.
   * Calls `onConfirmed` only when the user picks a reason (not on cancel).
   */
  const confirmVoidOrderItem = useCallback(
    (productName: string, onConfirmed: () => void) => {
      Alert.alert(
        t('kitchen.voidConfirmTitle'),
        t('kitchen.voidConfirmMsg', { name: productName }),
        [
          {
            text: t('kitchen.voidReasonChanged'),
            onPress: onConfirmed,
          },
          {
            text: t('kitchen.voidReasonUnavailable'),
            onPress: onConfirmed,
          },
          {
            text: t('kitchen.voidReasonMistake'),
            onPress: onConfirmed,
          },
          { text: t('common.cancel'), style: 'cancel' },
        ],
      );
    },
    [t],
  );

  // ── Remove one unit ──────────────────────────────────────────────────────────
  const removeOne = useCallback(
    async (product: ProductData) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const lineItem = lineItems.find((i) => i.productId === product.id);
      if (!lineItem) return;

      if (isOrderMode) {
        const itemId = parseInt(lineItem.id, 10);
        if (lineItem.quantity <= 1) {
          // Removing the last unit from a sent order — ask for a void reason first
          confirmVoidOrderItem(lineItem.productName, async () => {
            setActionPending(true);
            try {
              await orderApi.removeItem(activeOrderId!, itemId);
              await refetchOrder();
              qc.invalidateQueries({ queryKey: ['tables'] });
            } catch (e) {
              showErrorAlert(e);
            } finally {
              setActionPending(false);
            }
          });
          return;
        }
        setActionPending(true);
        try {
          await orderApi.updateItemQuantity(activeOrderId!, itemId, lineItem.quantity - 1);
          await refetchOrder();
          qc.invalidateQueries({ queryKey: ['tables'] });
        } catch (e) {
          showErrorAlert(e);
        } finally {
          setActionPending(false);
        }
        return;
      }

      setActionPending(true);
      try {
        const id = cartIdRef.current;
        if (!id) return;
        const cartItem = cart?.items.find((i) => i.productId === product.id);
        if (!cartItem) return;
        const newQty = cartItem.quantity - 1;
        const res =
          newQty === 0
            ? await cartApi.removeItem(id, cartItem.id)
            : await cartApi.updateItem(id, cartItem.id, newQty);
        setCart(res.data.data);
      } catch (e) {
        showErrorAlert(e);
      } finally {
        setActionPending(false);
      }
    },
    [lineItems, isOrderMode, activeOrderId, refetchOrder, qc, cart, showErrorAlert, confirmVoidOrderItem, t],
  );

  // ── Update qty from the order strip ─────────────────────────────────────────
  const updateLineQty = useCallback(
    async (lineItem: LineItem, newQty: number) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      if (isOrderMode && newQty === 0) {
        // Removing all units from a sent order — ask for a void reason first
        confirmVoidOrderItem(lineItem.productName, async () => {
          setActionPending(true);
          try {
            await orderApi.removeItem(activeOrderId!, parseInt(lineItem.id, 10));
            await refetchOrder();
            qc.invalidateQueries({ queryKey: ['tables'] });
          } catch (e) {
            showErrorAlert(e);
          } finally {
            setActionPending(false);
          }
        });
        return;
      }

      setActionPending(true);
      try {
        if (isOrderMode) {
          const itemId = parseInt(lineItem.id, 10);
          await orderApi.updateItemQuantity(activeOrderId!, itemId, newQty);
          await refetchOrder();
          qc.invalidateQueries({ queryKey: ['tables'] });
        } else {
          const id = cartIdRef.current;
          if (!id) return;
          const res =
            newQty === 0
              ? await cartApi.removeItem(id, lineItem.id)
              : await cartApi.updateItem(id, lineItem.id, newQty);
          setCart(res.data.data);
        }
      } catch (e) {
        showErrorAlert(e);
      } finally {
        setActionPending(false);
      }
    },
    [isOrderMode, activeOrderId, refetchOrder, qc, showErrorAlert, confirmVoidOrderItem],
  );

  // ── Item note handlers ───────────────────────────────────────────────────────
  const openNoteModal = useCallback((lineItem: LineItem) => {
    setNoteModal({ visible: true, lineItem, draft: lineItem.note ?? '' });
  }, []);

  const saveItemNote = useCallback(async () => {
    const { lineItem, draft } = noteModal;
    if (!lineItem) return;
    setNoteSaving(true);
    try {
      const trimmed = draft.trim() || null;
      if (isOrderMode) {
        const itemId = parseInt(lineItem.id, 10);
        await orderApi.updateItemNote(activeOrderId!, itemId, trimmed);
        await refetchOrder();
      } else {
        const id = cartIdRef.current;
        if (!id) return;
        const res = await cartApi.updateItemNote(id, lineItem.id, trimmed);
        setCart(res.data.data);
      }
      setNoteModal({ visible: false, lineItem: null, draft: '' });
    } catch (e) {
      showErrorAlert(e);
    } finally {
      setNoteSaving(false);
    }
  }, [noteModal, isOrderMode, activeOrderId, refetchOrder, showErrorAlert]);

  // ── Print receipt ─────────────────────────────────────────────────────────────
  const printReceipt = useCallback(async (orderId: string) => {
    setPrintPending(true);
    try {
      const res = await orderApi.getReceipt(orderId);
      await Print.printAsync({ html: res.data as unknown as string });
    } catch (e) {
      showErrorAlert(e);
    } finally {
      setPrintPending(false);
    }
  }, [showErrorAlert]);

  // ── Send to kitchen (new-order mode only) ────────────────────────────────────
  const handleSendToKitchen = useCallback(async () => {
    const id = cartIdRef.current;
    if (!id || !cart?.items.length) return;
    Alert.alert(
      t('fnb.sendToKitchen'),
      t('fnb.sendToKitchenConfirm', {
        count: cart.items.reduce((s, i) => s + i.quantity, 0),
      }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('fnb.sendToKitchen'),
          onPress: async () => {
            setKitchenPending(true);
            try {
              const kitchenRes = await cartApi.sendToKitchen(
                id,
                tableId ?? undefined,
                isTakeaway ? (t('kitchen.takeaway')) : (tableLabel ?? undefined),
                isTakeaway ? takeawayPickupTime : null,
              );
              const { orderNumber } = kitchenRes.data.data;
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              qc.invalidateQueries({ queryKey: ['tables'] });
              Alert.alert(
                t('fnb.sentToKitchenSuccess'),
                tableLabel ? `#${orderNumber} · ${tableLabel}` : `#${orderNumber}`,
                [{ text: t('common.close'), onPress: () => clearCart() }],
              );
            } catch (e) {
              showErrorAlert(e);
            } finally {
              setKitchenPending(false);
            }
          },
        },
      ],
    );
  }, [cart, tableId, tableLabel, isTakeaway, takeawayPickupTime, clearCart, qc, showErrorAlert, t]);

  // ── Checkout ─────────────────────────────────────────────────────────────────
  const openCheckout = useCallback(() => {
    setTipRaw('');
    setNote('');
    setSelectedCustomer(null);
    setCheckoutVisible(true);
  }, []);

  const handleCheckout = useCallback(async (method: PayMethod, amountPaid?: number) => {
    const tip = tipRaw ? parseInt(tipRaw, 10) : 0;
    setCheckingOut(true);
    try {
      let completed: { orderId: string; orderNumber: string; total: number };
      if (isOrderMode) {
        await orderApi.updateMeta(activeOrderId!, {
          tip: tip > 0 ? tip : undefined,
          customerId: selectedCustomer?.type === 'managed' ? selectedCustomer.id : null,
          clearCustomer: selectedCustomer === null,
        });
        const res = await orderApi.payAndComplete(activeOrderId!, {
          paymentMethod: method,
          amountPaid: method === 'CASH' && amountPaid && amountPaid > 0 ? amountPaid : undefined,
        });
        const o = res.data.data;
        completed = { orderId: o.id, orderNumber: o.orderNumber, total: o.total };
      } else {
        const id = cartIdRef.current;
        if (!id) return;
        const res = await cartApi.checkout(id, {
          paymentMethod: method,
          amountPaid: method === 'CASH' && amountPaid && amountPaid > 0 ? amountPaid : undefined,
          tip: tip > 0 ? tip : undefined,
          notes: note.trim() || undefined,
          tableId: isTakeaway ? null : tableId,
          tableLabel: isTakeaway ? t('kitchen.takeaway') : tableLabel,
          pickupTime: isTakeaway ? takeawayPickupTime : null,
          customerId: selectedCustomer?.type === 'managed' ? selectedCustomer.id : undefined,
          customerName: selectedCustomer?.type === 'guest' ? selectedCustomer.name : undefined,
        });
        const o = res.data.data;
        completed = { orderId: o.orderId, orderNumber: o.orderNumber, total: o.total };
      }
      await AsyncStorage.setItem(LAST_PAYMENT_KEY, method);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ['tables'] });
      setPaymentSheetVisible(false);
      setCheckoutVisible(false);
      setCompletedOrder(completed);
    } catch (e) {
      showErrorAlert(e);
    } finally {
      setCheckingOut(false);
    }
  }, [
    isOrderMode, activeOrderId, tipRaw, note, selectedCustomer,
    tableId, tableLabel, isTakeaway, takeawayPickupTime, qc, showErrorAlert, t,
  ]);

  // ── Derived checkout values ──────────────────────────────────────────────────
  const tip = tipRaw ? parseInt(tipRaw, 10) : 0;
  const effectiveTotal = total + tip;

  // ── Loading states ───────────────────────────────────────────────────────────
  const isInitialising =
    (!isOrderMode && cartInitializing) || (isOrderMode && orderLoading && !orderDetail);

  if (isInitialising) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 dark:bg-gray-900">
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900" style={{ paddingTop: insets.top }}>

      {/* ── Header ── */}
      <View className="flex-row items-center px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
        <TouchableOpacity
          onPress={() => clearCart()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          className="mr-3 p-1"
        >
          <MaterialCommunityIcons name="arrow-left" size={22} color="#6b7280" />
        </TouchableOpacity>
        <MaterialCommunityIcons
          name={isTakeaway ? 'moped' : 'table-chair'}
          size={18}
          color={isTakeaway ? '#d97706' : '#4f46e5'}
        />
        <View className="ml-2 flex-1">
          <Text className={`${typo.heading} ${isTakeaway ? 'text-amber-700 dark:text-amber-400' : 'text-gray-900 dark:text-white'}`} numberOfLines={1}>
            {isTakeaway ? `🛵 ${t('tableGrid.takeaway')}` : (tableLabel ?? t('fnb.order'))}
          </Text>
          {isTakeaway && takeawayPickupTime && (
            <Text className={`${typo.caption} text-amber-600 dark:text-amber-500`}>
              ⏰ {t('tableGrid.pickupTime')}: {new Date(takeawayPickupTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          )}
          {isOrderMode && (
            <Text className={`${typo.caption} text-amber-500`}>
              {t('fnb.addMoreMode')}
            </Text>
          )}
        </View>
        {itemCount > 0 && (
          <View className="bg-primary rounded-full min-w-[22px] h-5.5 px-1.5 items-center justify-center">
            <Text className="text-white text-xs font-bold">{itemCount}</Text>
          </View>
        )}
      </View>

      {/* ── Category tabs ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 flex-none"
        contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8, gap: 8 }}
      >
        <TouchableOpacity
          onPress={() => setSelectedCategoryId(null)}
          className={`flex-row items-center gap-x-1 rounded-full px-3 py-1.5 border ${
            !selectedCategoryId
              ? 'bg-primary border-primary'
              : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600'
          }`}
        >
          <Text
            className={`${typo.captionBold} ${
              !selectedCategoryId ? 'text-white' : 'text-gray-600 dark:text-gray-300'
            }`}
          >
            {t('fnb.allCategories')}
          </Text>
          {!selectedCategoryId && activeCategoryCount !== null && (
            <View className="rounded-full px-1.5 py-0.5 bg-white/25">
              <Text className={`${typo.caption} font-bold leading-none text-white`}>
                {activeCategoryCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
        {(categories as CategoryData[]).map((cat) => {
          const active = selectedCategoryId === cat.id;
          return (
            <TouchableOpacity
              key={cat.id}
              onPress={() => setSelectedCategoryId(active ? null : cat.id)}
              className={`flex-row items-center gap-x-1 rounded-full px-3 py-1.5 border ${
                active
                  ? 'bg-primary border-primary'
                  : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600'
              }`}
            >
              <Text
                className={`${typo.captionBold} ${
                  active ? 'text-white' : 'text-gray-600 dark:text-gray-300'
                }`}
              >
                {cat.emoji ? `${cat.emoji} ${cat.name}` : cat.name}
              </Text>
              {active && activeCategoryCount !== null && (
                <View className="rounded-full px-1.5 py-0.5 bg-white/25">
                  <Text className={`${typo.caption} font-bold leading-none text-white`}>
                    {activeCategoryCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Product grid ── */}
      {productsLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#4f46e5" />
        </View>
      ) : products.length === 0 ? (
        <EmptyState
          icon="🍽️"
          title={t('fnb.noProducts')}
          description={t('fnb.noProductsHint')}
        />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={{
            padding: 8,
            paddingBottom: itemCount > 0 ? 144 : 80,
            gap: 8,
          }}
          columnWrapperStyle={{ gap: 8 }}
          renderItem={({ item }) => (
            <ProductCard
              product={item}
              qtyInCart={getLineQty(item.id)}
              onAdd={() => addItem(item)}
              onRemove={() => removeOne(item)}
            />
          )}
        />
      )}

      {/* ── Sticky order bar ── */}
      {itemCount > 0 && (
        <View
          className="absolute left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-xl"
          style={{ bottom: insets.bottom }}
        >
          {/* Expanded item list */}
          {orderExpanded && (
            <View
              className="border-b border-gray-100 dark:border-gray-700"
              style={{ maxHeight: 260 }}
            >
              <FlatList
                data={lineItems}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <OrderLineItem
                    item={item}
                    onIncrease={() => updateLineQty(item, item.quantity + 1)}
                    onDecrease={() => updateLineQty(item, item.quantity - 1)}
                    onEditNote={() => openNoteModal(item)}
                  />
                )}
                ItemSeparatorComponent={() => (
                  <View className="h-px bg-gray-50 dark:bg-gray-700 mx-4" />
                )}
                contentContainerStyle={{ paddingVertical: 4 }}
              />
              <View className="flex-row justify-between px-4 py-2 border-t border-gray-100 dark:border-gray-700">
                <Text className={`${typo.caption} text-gray-400`}>
                  {t('fnb.subtotal')}
                </Text>
                <Text className={`${typo.labelBold} text-gray-800 dark:text-gray-100`}>
                  {formatVnd(subtotal)}
                </Text>
              </View>
            </View>
          )}

          {/* Action row */}
          <View className="flex-row items-center px-4 py-3 gap-2">
            {/* Summary + expand toggle */}
            <TouchableOpacity
              onPress={() => setOrderExpanded((v) => !v)}
              className="flex-row items-center gap-2 flex-1"
              accessibilityRole="button"
            >
              <View className="bg-primary rounded-full w-8 h-8 items-center justify-center">
                <Text className="text-white text-xs font-bold">{itemCount}</Text>
              </View>
              <View>
                <Text className={`${typo.labelBold} text-gray-900 dark:text-white`}>
                  {formatVnd(total)}
                </Text>
                <Text className={`${typo.caption} text-gray-400`}>
                  {t('fnb.itemCount', { count: itemCount })}
                </Text>
              </View>
              <MaterialCommunityIcons
                name={orderExpanded ? 'chevron-down' : 'chevron-up'}
                size={18}
                color="#6b7280"
              />
            </TouchableOpacity>

            {/* Send to kitchen — only in new-order mode */}
            {!isOrderMode && (
              <TouchableOpacity
                onPress={handleSendToKitchen}
                disabled={kitchenPending || actionPending}
                className="flex-row items-center gap-1.5 bg-amber-500 active:opacity-80 rounded-xl px-3 py-2.5"
              >
                {kitchenPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="silverware-fork-knife" size={15} color="#fff" />
                    <Text className={`${typo.captionBold} text-white`}>
                      {t('fnb.sendToKitchen')}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {/* Checkout */}
            <TouchableOpacity
              onPress={openCheckout}
              disabled={actionPending}
              className="flex-row items-center gap-1.5 bg-primary active:opacity-80 rounded-xl px-3 py-2.5"
            >
              <MaterialCommunityIcons name="cash-register" size={15} color="#fff" />
              <Text className={`${typo.captionBold} text-white`}>
                {t('fnb.checkout')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Item-note modal ── */}
      <Modal
        visible={noteModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => !noteSaving && setNoteModal({ visible: false, lineItem: null, draft: '' })}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1 justify-end"
        >
          <TouchableOpacity
            className="flex-1"
            activeOpacity={1}
            onPress={() => !noteSaving && setNoteModal({ visible: false, lineItem: null, draft: '' })}
          />
          <View
            className="bg-white dark:bg-gray-800 rounded-t-3xl px-5 pt-5"
            style={{ paddingBottom: insets.bottom + 24 }}
          >
            <View className="w-10 h-1 bg-gray-200 dark:bg-gray-600 rounded-full self-center mb-4" />
            <View className="flex-row items-center mb-3">
              <MaterialCommunityIcons name="pencil-outline" size={18} color="#4f46e5" />
              <Text className={`${typo.section} text-gray-900 dark:text-white ml-2 flex-1`} numberOfLines={1}>
                {noteModal.lineItem?.productName}
              </Text>
            </View>
            <Text className={`${typo.captionBold} text-gray-500 dark:text-gray-400 mb-1.5`}>
              {t('fnb.itemNote')}
            </Text>
            <TextInput
              value={noteModal.draft}
              onChangeText={(v) => setNoteModal((s) => ({ ...s, draft: v }))}
              placeholder={t('fnb.itemNotePlaceholder')}
              placeholderTextColor="#9ca3af"
              multiline
              textAlignVertical="top"
              maxLength={200}
              autoFocus
              style={{ minHeight: 72 }}
              className={`border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 ${typo.inputSize} text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 mb-4`}
            />
            <View className="flex-row gap-2">
              {noteModal.draft.trim().length > 0 && (
                <TouchableOpacity
                  onPress={() => setNoteModal((s) => ({ ...s, draft: '' }))}
                  disabled={noteSaving}
                  className="flex-1 rounded-2xl py-3.5 items-center border border-gray-200 dark:border-gray-600"
                >
                  <Text className={`${typo.labelBold} text-gray-500 dark:text-gray-400`}>
                    {t('fnb.itemNoteClear')}
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={saveItemNote}
                disabled={noteSaving}
                className={`flex-1 rounded-2xl py-3.5 items-center ${
                  noteSaving ? 'bg-gray-200 dark:bg-gray-700' : 'bg-primary active:opacity-80'
                }`}
              >
                {noteSaving ? (
                  <ActivityIndicator color="#6b7280" />
                ) : (
                  <Text className={`${typo.labelBold} text-white`}>
                    {t('fnb.itemNoteSave')}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Checkout sheet ── */}
      <Modal
        visible={checkoutVisible}
        transparent
        animationType="slide"
        onRequestClose={() => !checkingOut && setCheckoutVisible(false)}
      >
        <TouchableOpacity
          className="flex-1 bg-black/40"
          activeOpacity={1}
          onPress={() => !checkingOut && setCheckoutVisible(false)}
        />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View
            className="bg-white dark:bg-gray-800 rounded-t-3xl px-5 pt-5"
            style={{ paddingBottom: insets.bottom + 24 }}
          >
            <View className="w-10 h-1 bg-gray-200 dark:bg-gray-600 rounded-full self-center mb-4" />

            {/* Title */}
            <View className="flex-row items-center mb-4">
              <MaterialCommunityIcons name="cash-register" size={20} color="#4f46e5" />
              <Text className={`${typo.section} text-gray-900 dark:text-white ml-2 flex-1`}>
                {tableLabel
                  ? `${t('fnb.checkoutTitle')} · ${tableLabel}`
                  : t('fnb.checkoutTitle')}
              </Text>
              <Text className={`${typo.heading} text-primary`}>
                {formatVnd(effectiveTotal)}
              </Text>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Customer */}
              <View className="mb-4">
                <Text className={`${typo.captionBold} text-gray-500 dark:text-gray-400 mb-1.5`}>
                  {t('pos.customer')}
                </Text>
                <TouchableOpacity
                  className="flex-row items-center bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5"
                  onPress={() => setCustomerPickerVisible(true)}
                >
                  {selectedCustomer ? (
                    <>
                      <MaterialCommunityIcons
                        name={selectedCustomer.type === 'managed' ? 'account-check' : 'account-outline'}
                        size={16}
                        color="#4f46e5"
                        style={{ marginRight: 8 }}
                      />
                      <Text className={`${typo.label} text-gray-900 dark:text-white flex-1`} numberOfLines={1}>
                        {selectedCustomer.name}
                      </Text>
                      <MaterialCommunityIcons name="pencil-outline" size={14} color="#9ca3af" />
                    </>
                  ) : (
                    <>
                      <MaterialCommunityIcons name="account-plus-outline" size={16} color="#9ca3af" style={{ marginRight: 8 }} />
                      <Text className={`${typo.label} text-gray-400 dark:text-gray-500 flex-1`}>{t('pos.walkIn')}</Text>
                      <MaterialCommunityIcons name="chevron-right" size={14} color="#9ca3af" />
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {/* Tip */}
              <View className="mb-4">
                <Text className={`${typo.captionBold} text-gray-500 dark:text-gray-400 mb-1.5`}>
                  {t('fnb.tip')}
                </Text>
                <MoneyInput rawValue={tipRaw} onChangeRaw={setTipRaw} placeholder="0" />
              </View>

              {/* Note — cart mode only */}
              {!isOrderMode && (
                <View className="mb-5">
                  <Text className={`${typo.captionBold} text-gray-500 dark:text-gray-400 mb-1.5`}>
                    {t('fnb.note')}
                  </Text>
                  <TextInput
                    value={note}
                    onChangeText={setNote}
                    placeholder={t('fnb.notePlaceholder')}
                    placeholderTextColor="#9ca3af"
                    multiline
                    textAlignVertical="top"
                    maxLength={200}
                    style={{ minHeight: 56 }}
                    className={`border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 ${typo.inputSize} text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700`}
                  />
                </View>
              )}

              {/* Order total summary */}
              <View className="bg-gray-50 dark:bg-gray-700 rounded-2xl px-4 py-3 mb-5 gap-1">
                <View className="flex-row justify-between">
                  <Text className={`${typo.caption} text-gray-400`}>{t('fnb.subtotal')}</Text>
                  <Text className={`${typo.caption} text-gray-700 dark:text-gray-200`}>
                    {formatVnd(subtotal)}
                  </Text>
                </View>
                {tip > 0 && (
                  <View className="flex-row justify-between">
                    <Text className={`${typo.caption} text-gray-400`}>{t('fnb.tip')}</Text>
                    <Text className={`${typo.caption} text-gray-700 dark:text-gray-200`}>
                      {formatVnd(tip)}
                    </Text>
                  </View>
                )}
                <View className="h-px bg-gray-200 dark:bg-gray-600 my-1" />
                <View className="flex-row justify-between">
                  <Text className={`${typo.labelBold} text-gray-800 dark:text-gray-100`}>
                    {t('fnb.total')}
                  </Text>
                  <Text className={`${typo.labelBold} text-primary`}>
                    {formatVnd(effectiveTotal)}
                  </Text>
                </View>
              </View>
            </ScrollView>

            {/* Open payment sheet */}
            <TouchableOpacity
              onPress={() => setPaymentSheetVisible(true)}
              disabled={checkingOut}
              className="bg-primary active:opacity-80 rounded-2xl py-4 items-center flex-row justify-center gap-x-2"
            >
              <MaterialCommunityIcons name="cash-multiple" size={18} color="#fff" />
              <Text className={`${typo.labelBold} text-white`}>
                {t('fnb.confirmCheckout')} · {formatVnd(effectiveTotal)}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>

        {/* Payment sheet slides up over the checkout sheet */}
        <PaymentSheet
          visible={paymentSheetVisible}
          total={effectiveTotal}
          initialMethod={lastPaymentMethod}
          onClose={() => setPaymentSheetVisible(false)}
          onConfirm={({ method, amountPaid }) => {
            // handleCheckout is async; errors are handled internally via try/catch/finally.
            // `void` prevents an unhandled-rejection warning without masking the real error.
            void handleCheckout(method, amountPaid);
          }}
          paying={checkingOut}
          qrDescription={tableLabel ?? undefined}
        />

        {/* Customer picker */}
        <CustomerPickerSheet
          visible={customerPickerVisible}
          onClose={() => setCustomerPickerVisible(false)}
          value={selectedCustomer}
          onChange={setSelectedCustomer}
        />
      </Modal>

      {/* ── Post-checkout receipt modal ── */}
      <Modal
        visible={completedOrder !== null}
        transparent
        animationType="fade"
        onRequestClose={() => { setCompletedOrder(null); clearCart(); }}
      >
        <View className="flex-1 bg-black/50 items-center justify-center px-6">
          <View
            className="bg-white dark:bg-gray-800 rounded-3xl p-6 w-full"
            style={{ paddingBottom: insets.bottom > 0 ? insets.bottom + 12 : 24 }}
          >
            {/* Success icon + title */}
            <View className="items-center mb-5">
              <View className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 items-center justify-center mb-3">
                <MaterialCommunityIcons name="check-circle" size={38} color="#16a34a" />
              </View>
              <Text className={`${typo.section} text-gray-900 dark:text-white text-center`}>
                {t('fnb.orderComplete')}
              </Text>
              {completedOrder && (
                <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 mt-1 text-center`}>
                  {tableLabel
                    ? `#${completedOrder.orderNumber} · ${tableLabel}`
                    : `#${completedOrder.orderNumber}`}
                </Text>
              )}
            </View>

            {/* Total summary */}
            {completedOrder && (
              <View className="bg-gray-50 dark:bg-gray-700 rounded-2xl py-4 items-center mb-5">
                <Text className={`${typo.caption} text-gray-400 mb-1`}>{t('fnb.total')}</Text>
                <Text className={`${typo.heading} text-primary`}>{formatVnd(completedOrder.total)}</Text>
              </View>
            )}

            {/* Print button */}
            <TouchableOpacity
              onPress={() => completedOrder && printReceipt(completedOrder.orderId)}
              disabled={printPending}
              className={`rounded-2xl py-3.5 flex-row items-center justify-center gap-2 border border-primary mb-3 ${
                printPending ? 'opacity-50' : 'active:opacity-70'
              }`}
            >
              {printPending ? (
                <ActivityIndicator color="#4f46e5" size="small" />
              ) : (
                <MaterialCommunityIcons name="printer-outline" size={18} color="#4f46e5" />
              )}
              <Text className={`${typo.labelBold} text-primary`}>
                {printPending ? t('fnb.printing') : t('fnb.printReceipt')}
              </Text>
            </TouchableOpacity>

            {/* Close / done button */}
            <TouchableOpacity
              onPress={() => { setCompletedOrder(null); clearCart(); }}
              className="bg-primary rounded-2xl py-3.5 items-center active:opacity-80"
            >
              <Text className={`${typo.labelBold} text-white`}>
                {t('common.close')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
