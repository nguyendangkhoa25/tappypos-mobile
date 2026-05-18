import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { cartApi, shopConfigApi } from '../../services/api';
import { UpgradeModal } from '../../components/UpgradeModal';
import { useCartStore } from '../../store/cartStore';
import { useNetworkStore } from '../../store/networkStore';
import { useOfflineQueueStore } from '../../store/offlineQueueStore';
import { useAuthStore } from '../../store/authStore';
import { useErrorAlert } from '../../hooks/useErrorAlert';
import { formatVnd } from '../../utils/format';
import { useTypography } from '../../hooks/useTypography';
import type { POSScreenProps } from '../../types/navigation';

type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'CARD';
const LAST_PAYMENT_KEY = 'last_payment_method';

const PAYMENT_METHODS: { key: PaymentMethod; icon: string; labelKey: string }[] = [
  { key: 'CASH', icon: 'cash', labelKey: 'pos.cash' },
  { key: 'BANK_TRANSFER', icon: 'bank-transfer', labelKey: 'pos.transfer' },
  { key: 'CARD', icon: 'credit-card-outline', labelKey: 'pos.card' },
];

export function CheckoutScreen({ navigation }: POSScreenProps<'Checkout'>) {
  const { t } = useTranslation();
  const typo = useTypography();
  const insets = useSafeAreaInsets();
  const showErrorAlert = useErrorAlert();
  const { items, discount, getTotal, clearCart, promoCode, setPromo, selectedCustomer, tableId, tableLabel } = useCartStore();
  const { isOffline } = useNetworkStore();
  const { addOrder } = useOfflineQueueStore();
  const { shopTypeCode } = useAuthStore();
  // Street food and simple F&B shops rarely use card terminals — hide CARD option.
  const isSimpleFB = shopTypeCode === 'STREET_FOOD' || shopTypeCode === 'FOOD_BEVERAGE';
  const visiblePaymentMethods = isSimpleFB
    ? PAYMENT_METHODS.filter((m) => m.key !== 'CARD')
    : PAYMENT_METHODS;
  const total = getTotal();
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [cashReceived, setCashReceived] = useState('');
  const [promoInput, setPromoInput] = useState('');
  const [applyingPromo, setApplyingPromo] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [upgradeVisible, setUpgradeVisible] = useState(false);
  const [note, setNote] = useState('');
  const [noteFocused, setNoteFocused] = useState(false);
  const submittingRef = useRef(false);

  const { data: posConfig } = useQuery({
    queryKey: ['posConfig'],
    queryFn: () => shopConfigApi.getPosConfig().then((r) => r.data.data),
    staleTime: 10 * 60_000,
  });
  const quickPhrases = posConfig?.quickPhrases ?? [];

  // US-132: load last payment method on mount (never pre-select CARD)
  useEffect(() => {
    AsyncStorage.getItem(LAST_PAYMENT_KEY).then((saved) => {
      if (saved === 'CASH' || saved === 'BANK_TRANSFER') {
        setPaymentMethod(saved);
      }
    });
  }, []);

  const cashReceivedNum = parseFloat(cashReceived.replace(/[^0-9]/g, '')) || 0;
  const change = paymentMethod === 'CASH' ? Math.max(0, cashReceivedNum - total) : 0;

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      // Offline path: save to local queue and return a stub result
      if (isOffline) {
        addOrder({ items, paymentMethod, total, tableId, tableLabel });
        return { orderId: '', orderNumber: t('pos.savedOffline'), total };
      }

      const initRes = await cartApi.init();
      const cartId = initRes.data.data.cartId;

      for (const item of items) {
        await cartApi.addItem(cartId, item.productId, item.quantity, item.price);
      }

      if (promoCode) {
        await cartApi.applyPromo(cartId, promoCode);
      }

      const res = await cartApi.checkout(cartId, {
        paymentMethod,
        amountPaid: cashReceivedNum || undefined,
        customerId: selectedCustomer?.id,
        tableId: tableId ?? undefined,
        tableLabel: tableLabel ?? undefined,
        notes: note || undefined,
      });
      return res.data.data;
    },
    onSuccess: async (data) => {
      submittingRef.current = false;
      await AsyncStorage.setItem(LAST_PAYMENT_KEY, paymentMethod);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      clearCart();
      navigation.replace('OrderSuccess', {
        orderId: data.orderId,
        orderNumber: data.orderNumber,
        total: data.total,
        savedOffline: isOffline,
      });
    },
    onError: (err: any) => {
      submittingRef.current = false;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      if (err?.response?.data?.error === 'ORDER_LIMIT_EXCEEDED') {
        setUpgradeVisible(true);
      } else {
        setCheckoutError(t('pos.checkoutError'));
      }
    },
  });

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
        {/* Order summary */}
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

        {/* Promo code — hidden when offline (server required to validate) */}
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
          <View className="flex-row items-center bg-indigo-50 rounded-xl px-4 py-3 mb-4">
            <MaterialCommunityIcons name="tag-outline" size={18} color="#4f46e5" />
            <Text className={`${typo.label} flex-1 ml-2 text-indigo-700`}>{promoCode}</Text>
            <TouchableOpacity onPress={() => setPromo(null, 0)}>
              <MaterialCommunityIcons name="close" size={18} color="#4f46e5" />
            </TouchableOpacity>
          </View>
        )}

        {/* Customer summary (read-only, selected in CartScreen) */}
        {selectedCustomer && (
          <View className="flex-row items-center bg-indigo-50 rounded-xl px-4 py-3 mb-4">
            <MaterialCommunityIcons name="account-outline" size={18} color="#4f46e5" />
            <View className="flex-1 ml-2">
              <Text className={`${typo.label} text-indigo-700`}>{selectedCustomer.name}</Text>
              <Text className={`${typo.caption} text-indigo-600`}>{selectedCustomer.phone}</Text>
            </View>
          </View>
        )}

        {/* Payment method */}
        <Text className={`${typo.labelBold} text-gray-800 dark:text-gray-100 mb-3`}>{t('pos.paymentMethod')}</Text>
        <View className="flex-row gap-3 mb-4">
          {visiblePaymentMethods.map(({ key, icon, labelKey }) => (
            <TouchableOpacity
              key={key}
              testID={`payment-method-${key}`}
              className={`flex-1 py-4 rounded-2xl items-center border-2 ${
                paymentMethod === key
                  ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30'
                  : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800'
              }`}
              onPress={() => setPaymentMethod(key)}
            >
              <MaterialCommunityIcons
                name={icon as never}
                size={24}
                color={paymentMethod === key ? '#4f46e5' : '#9ca3af'}
              />
              <Text
                className={`${typo.captionBold} mt-1 ${
                  paymentMethod === key ? 'text-indigo-600' : 'text-gray-500'
                }`}
              >
                {t(labelKey)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Cash change calculator */}
        {paymentMethod === 'CASH' && (
          <View className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4 mb-6">
            {/* US-133: "Đúng tiền" chip next to label */}
            <View className="flex-row items-center justify-between mb-2">
              <Text className={`${typo.caption} text-gray-500 dark:text-gray-400`}>{t('pos.cashReceived')}</Text>
              <TouchableOpacity
                onPress={() => setCashReceived(String(total))}
                className="px-3 py-1 bg-indigo-100 rounded-full"
              >
                <Text className={`${typo.captionBold} text-indigo-700`}>{t('pos.exactAmount')}</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              className={`bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 ${typo.inputSize} font-bold text-gray-900 dark:text-white mb-3`}
              value={cashReceived}
              onChangeText={setCashReceived}
              keyboardType="numeric"
              placeholder="0"
            />
            {cashReceivedNum > 0 && (
              <View className="flex-row justify-between items-center">
                <Text className={`${typo.caption} font-medium text-gray-600 dark:text-gray-300`}>{t('pos.change')}</Text>
                <Text
                  className={`${typo.section} font-bold ${change >= 0 ? 'text-indigo-600' : 'text-red-500'}`}
                >
                  {formatVnd(change)}
                </Text>
              </View>
            )}
          </View>
        )}
        {/* Note field */}
        <View className="mb-6">
          <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 mb-2`}>{t('pos.note')}</Text>
          {noteFocused && quickPhrases.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingBottom: 8 }}>
              {quickPhrases.map((phrase) => (
                <TouchableOpacity
                  key={phrase}
                  onPress={() => setNote((n) => n ? `${n} ${phrase}` : phrase)}
                  className="px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-full"
                >
                  <Text className={`${typo.caption} font-medium text-indigo-700`}>{phrase}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
          <TextInput
            className={`bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 ${typo.inputSize} text-gray-900 dark:text-white`}
            placeholder={t('pos.notePlaceholder')}
            placeholderTextColor="#9ca3af"
            value={note}
            onChangeText={setNote}
            onFocus={() => setNoteFocused(true)}
            onBlur={() => setNoteFocused(false)}
            multiline
            numberOfLines={2}
          />
        </View>
      </ScrollView>

      {/* Complete button */}
      <View
        className="px-4 pt-3 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-700"
        style={{ paddingBottom: insets.bottom + 16 }}
      >
        {/* Sticky error banner — stays visible above the button */}
        {checkoutError ? (
          <View className="flex-row items-center bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-3 gap-2">
            <MaterialCommunityIcons name="alert-outline" size={18} color="#d97706" />
            <Text className={`${typo.caption} font-medium text-amber-800 flex-1`}>{checkoutError}</Text>
            <TouchableOpacity
              onPress={() => setCheckoutError('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialCommunityIcons name="close" size={16} color="#d97706" />
            </TouchableOpacity>
          </View>
        ) : null}
        <TouchableOpacity
          className={`rounded-2xl py-4 items-center ${
            checkoutMutation.isPending ? 'bg-gray-300' : 'bg-indigo-600 active:opacity-80'
          }`}
          onPress={() => {
            if (submittingRef.current || checkoutMutation.isPending) return;
            submittingRef.current = true;
            setCheckoutError('');
            checkoutMutation.mutate();
          }}
          disabled={checkoutMutation.isPending}
        >
          {checkoutMutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className={`${typo.labelBold} text-white`}>{t('pos.completeOrder')}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
