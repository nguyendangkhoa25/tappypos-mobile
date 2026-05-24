import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { cartApi, shopConfigApi } from '../../services/api';
import { UpgradeModal } from '../../components/UpgradeModal';
import { PaymentSheet, type PaymentMethod } from '../../components/PaymentSheet';
import { useCartStore } from '../../store/cartStore';
import { useNetworkStore } from '../../store/networkStore';
import { useOfflineQueueStore } from '../../store/offlineQueueStore';
import { useAuthStore } from '../../store/authStore';
import { useErrorAlert } from '../../hooks/useErrorAlert';
import { formatVnd } from '../../utils/format';
import { useTypography } from '../../hooks/useTypography';
import type { POSScreenProps } from '../../types/navigation';

const LAST_PAYMENT_KEY = 'last_payment_method';

export function CheckoutScreen({ navigation }: POSScreenProps<'Checkout'>) {
  const { t } = useTranslation();
  const typo = useTypography();
  const insets = useSafeAreaInsets();
  const showErrorAlert = useErrorAlert();
  const { items, discount, getTotal, clearCart, promoCode, setPromo, selectedCustomer, tableId, tableLabel } = useCartStore();
  const { isOffline } = useNetworkStore();
  const { addOrder } = useOfflineQueueStore();
  const { shopTypeCode } = useAuthStore();

  const isSimpleFB = shopTypeCode === 'STREET_FOOD' || shopTypeCode === 'FOOD_BEVERAGE';
  const total = getTotal();
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);

  const [promoInput, setPromoInput] = useState('');
  const [applyingPromo, setApplyingPromo] = useState(false);
  const [paymentSheetVisible, setPaymentSheetVisible] = useState(false);
  const [upgradeVisible, setUpgradeVisible] = useState(false);
  const [lastPaymentMethod, setLastPaymentMethod] = useState<PaymentMethod | null>(null);
  const submittingRef = useRef(false);

  // Load quick phrases for the note field inside PaymentSheet
  const { data: posConfig } = useQuery({
    queryKey: ['posConfig'],
    queryFn: () => shopConfigApi.getPosConfig().then((r) => r.data.data),
    staleTime: 10 * 60_000,
  });
  const quickPhrases = posConfig?.quickPhrases ?? [];

  // Restore last-used payment method (never pre-select CARD)
  useEffect(() => {
    AsyncStorage.getItem(LAST_PAYMENT_KEY).then((saved) => {
      if (saved === 'CASH' || saved === 'BANK_TRANSFER') setLastPaymentMethod(saved);
    });
  }, []);

  // ── Checkout mutation ──────────────────────────────────────────────────────

  const checkoutMutation = useMutation({
    mutationFn: async ({ method, amountPaid, note }: { method: PaymentMethod; amountPaid?: number; note?: string }) => {
      // Offline path
      if (isOffline) {
        addOrder({ items, paymentMethod: method, total, tableId, tableLabel });
        return { orderId: '', orderNumber: t('pos.savedOffline'), total, savedOffline: true as const, method };
      }

      const initRes = await cartApi.init();
      const cartId = initRes.data.data.cartId;

      for (const item of items) {
        await cartApi.addItem(cartId, item.productId, item.quantity, item.price);
      }
      if (promoCode) await cartApi.applyPromo(cartId, promoCode);

      const res = await cartApi.checkout(cartId, {
        paymentMethod: method,
        amountPaid,
        customerId: selectedCustomer?.type === 'managed' ? selectedCustomer.id : undefined,
        customerName: selectedCustomer?.type === 'guest' ? selectedCustomer.name : undefined,
        tableId: tableId ?? undefined,
        tableLabel: tableLabel ?? undefined,
        notes: note || undefined,
      });
      return { ...res.data.data, savedOffline: false as const, method };
    },
    onSuccess: async (data) => {
      submittingRef.current = false;
      if (!data.savedOffline) await AsyncStorage.setItem(LAST_PAYMENT_KEY, data.method);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      clearCart();
      setPaymentSheetVisible(false);
      navigation.replace('OrderSuccess', {
        orderId: data.orderId,
        orderNumber: data.orderNumber,
        total: data.total,
        savedOffline: data.savedOffline,
      });
    },
    onError: (err: unknown) => {
      submittingRef.current = false;
      setPaymentSheetVisible(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      if ((err as { response?: { data?: { error?: string } } })?.response?.data?.error === 'ORDER_LIMIT_EXCEEDED') {
        setUpgradeVisible(true);
      } else {
        showErrorAlert(err);
      }
    },
  });

  // ── Promo code ─────────────────────────────────────────────────────────────

  const handleApplyPromo = async () => {
    if (!promoInput.trim()) return;
    setApplyingPromo(true);
    try {
      setPromo(promoInput.trim(), 0);
    } catch (err) {
      showErrorAlert(err);
    } finally {
      setApplyingPromo(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <View className="flex-1 bg-white dark:bg-gray-900" style={{ paddingTop: insets.top }}>
      <UpgradeModal visible={upgradeVisible} onClose={() => setUpgradeVisible(false)} />

      {/* Header */}
      <View className="flex-row items-center px-4 py-3 border-b border-gray-100 dark:border-gray-700">
        <TouchableOpacity className="mr-3" onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialCommunityIcons name="chevron-left" size={26} color="#4f46e5" />
        </TouchableOpacity>
        <Text className={`${typo.section} text-gray-900 dark:text-white`}>{t('pos.checkout')}</Text>
      </View>

      <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false}>

        {/* ── Order summary ──────────────────────────────────────────────── */}
        <View className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4 mb-4">
          {items.map((item) => (
            <View key={item.productId} className="flex-row justify-between mb-2">
              <Text className={`${typo.caption} text-gray-700 dark:text-gray-300 flex-1 mr-2`} numberOfLines={1}>
                {item.name} × {item.quantity}
              </Text>
              <Text className={`${typo.caption} font-medium text-gray-800 dark:text-gray-200`}>
                {formatVnd(item.price * item.quantity)}
              </Text>
            </View>
          ))}
          {discount > 0 && (
            <View className="flex-row justify-between pt-2 border-t border-gray-200 dark:border-gray-600 mt-2">
              <Text className={`${typo.caption} text-gray-500 dark:text-gray-400`}>{t('pos.discount')}</Text>
              <Text className={`${typo.caption} font-semibold text-warning`}>-{formatVnd(discount)}</Text>
            </View>
          )}
          <View className="flex-row justify-between pt-2 border-t border-gray-200 dark:border-gray-600 mt-2">
            <Text className={`${typo.labelBold} text-gray-900 dark:text-white`}>{t('pos.total')}</Text>
            <Text className={`${typo.section} font-bold text-primary`}>{formatVnd(total)}</Text>
          </View>
        </View>

        {/* ── Promo code (hidden offline) ────────────────────────────────── */}
        {!promoCode && !isOffline && (
          <View className="flex-row gap-2 mb-4">
            <TextInput
              className={`flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 ${typo.inputSize} text-gray-900 dark:text-white`}
              placeholder={t('pos.promoCode')}
              placeholderTextColor="#9ca3af"
              value={promoInput}
              onChangeText={setPromoInput}
              autoCapitalize="characters"
            />
            <TouchableOpacity
              className="bg-gray-100 dark:bg-gray-700 rounded-xl px-4 py-3 items-center justify-center active:opacity-70"
              onPress={handleApplyPromo}
              disabled={applyingPromo}
            >
              {applyingPromo ? (
                <ActivityIndicator size="small" color="#4f46e5" />
              ) : (
                <Text className={`${typo.label} text-indigo-600`}>{t('pos.applyPromo')}</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {promoCode && (
          <View className="flex-row items-center bg-indigo-50 dark:bg-indigo-900/20 rounded-xl px-4 py-3 mb-4">
            <MaterialCommunityIcons name="tag-outline" size={18} color="#4f46e5" />
            <Text className={`${typo.label} flex-1 ml-2 text-indigo-700 dark:text-indigo-300`}>{promoCode}</Text>
            <TouchableOpacity onPress={() => setPromo(null, 0)}>
              <MaterialCommunityIcons name="close" size={18} color="#4f46e5" />
            </TouchableOpacity>
          </View>
        )}

        {/* ── Customer (read-only) ───────────────────────────────────────── */}
        {selectedCustomer && (
          <View className="flex-row items-center bg-indigo-50 dark:bg-indigo-900/20 rounded-xl px-4 py-3 mb-4">
            <MaterialCommunityIcons
              name={selectedCustomer.type === 'guest' ? 'account-edit-outline' : 'account-outline'}
              size={18}
              color="#4f46e5"
            />
            <View className="flex-1 ml-2">
              <Text className={`${typo.label} text-indigo-700 dark:text-indigo-300`}>{selectedCustomer.name}</Text>
              {selectedCustomer.type === 'managed' && (
                <Text className={`${typo.caption} text-indigo-600 dark:text-indigo-400`}>{selectedCustomer.phone}</Text>
              )}
              {selectedCustomer.type === 'guest' && (
                <Text className={`${typo.caption} text-indigo-500 italic`}>{t('pos.guestCustomer')}</Text>
              )}
            </View>
          </View>
        )}

      </ScrollView>

      {/* ── Sticky footer ─────────────────────────────────────────────────── */}
      <View
        className="px-4 pt-3 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-700"
        style={{ paddingBottom: insets.bottom + 16 }}
      >
        <TouchableOpacity
          testID="checkout-complete-btn"
          className="rounded-2xl py-4 items-center bg-indigo-600 active:opacity-80 flex-row justify-center gap-x-2"
          onPress={() => {
            if (submittingRef.current || checkoutMutation.isPending) return;
            setPaymentSheetVisible(true);
          }}
          disabled={checkoutMutation.isPending}
        >
          <MaterialCommunityIcons name="cash-multiple" size={20} color="white" />
          <Text className={`${typo.labelBold} text-white`}>{t('pos.completeOrder')}</Text>
        </TouchableOpacity>
      </View>

      {/* ── Payment sheet ──────────────────────────────────────────────────── */}
      <PaymentSheet
        visible={paymentSheetVisible}
        total={total}
        initialMethod={lastPaymentMethod}
        onClose={() => setPaymentSheetVisible(false)}
        onConfirm={({ method, amountPaid, note }) => {
          if (submittingRef.current || checkoutMutation.isPending) return;
          submittingRef.current = true;
          checkoutMutation.mutate({ method, amountPaid, note });
        }}
        paying={checkoutMutation.isPending}
        showNote
        quickPhrases={quickPhrases}
        hideCard={isSimpleFB}
      />
    </View>
  );
}
