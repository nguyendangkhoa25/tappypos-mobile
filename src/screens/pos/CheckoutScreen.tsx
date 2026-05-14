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
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { cartApi } from '../../services/api';
import { useCartStore } from '../../store/cartStore';
import { useErrorAlert } from '../../hooks/useErrorAlert';
import { formatVnd } from '../../utils/format';
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
  const insets = useSafeAreaInsets();
  const showErrorAlert = useErrorAlert();
  const { items, discount, getTotal, clearCart, promoCode, setPromo, selectedCustomer } = useCartStore();
  const total = getTotal();
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [cashReceived, setCashReceived] = useState('');
  const [promoInput, setPromoInput] = useState('');
  const [applyingPromo, setApplyingPromo] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const submittingRef = useRef(false);

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
      });
    },
    onError: () => {
      submittingRef.current = false;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setCheckoutError(t('pos.checkoutError'));
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
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 border-b border-gray-100">
        <TouchableOpacity className="mr-3 p-1" onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#374151" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900">{t('pos.checkout')}</Text>
      </View>

      <ScrollView className="flex-1 px-4 pt-4">
        {/* Order summary */}
        <View className="bg-gray-50 rounded-2xl p-4 mb-4">
          {items.map((item) => (
            <View key={item.productId} className="flex-row justify-between mb-2">
              <Text className="text-gray-700 flex-1 mr-2" numberOfLines={1}>
                {item.name} × {item.quantity}
              </Text>
              <Text className="text-gray-800 font-medium">
                {formatVnd(item.price * item.quantity)}
              </Text>
            </View>
          ))}
          {discount > 0 && (
            <View className="flex-row justify-between pt-2 border-t border-gray-200 mt-2">
              <Text className="text-gray-500">{t('pos.discount')}</Text>
              <Text className="text-warning font-semibold">-{formatVnd(discount)}</Text>
            </View>
          )}
          <View className="flex-row justify-between pt-2 border-t border-gray-200 mt-2">
            <Text className="font-bold text-gray-900 text-base">{t('pos.total')}</Text>
            <Text className="font-bold text-primary text-lg">{formatVnd(total)}</Text>
          </View>
        </View>

        {/* Promo code */}
        {!promoCode && (
          <View className="flex-row gap-2 mb-4">
            <TextInput
              className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base"
              placeholder={t('pos.promoCode')}
              placeholderTextColor="#9ca3af"
              value={promoInput}
              onChangeText={setPromoInput}
              autoCapitalize="characters"
            />
            <TouchableOpacity
              className="bg-gray-100 rounded-xl px-4 py-3 items-center justify-center active:opacity-70"
              onPress={handleApplyPromo}
              disabled={applyingPromo}
            >
              {applyingPromo ? (
                <ActivityIndicator size="small" color="#4f46e5" />
              ) : (
                <Text className="text-indigo-600 font-semibold">{t('pos.applyPromo')}</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {promoCode && (
          <View className="flex-row items-center bg-indigo-50 rounded-xl px-4 py-3 mb-4">
            <MaterialCommunityIcons name="tag-outline" size={18} color="#4f46e5" />
            <Text className="flex-1 ml-2 text-indigo-700 font-semibold">{promoCode}</Text>
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
              <Text className="text-indigo-700 font-semibold">{selectedCustomer.name}</Text>
              <Text className="text-xs text-indigo-600">{selectedCustomer.phone}</Text>
            </View>
          </View>
        )}

        {/* Payment method */}
        <Text className="text-base font-bold text-gray-800 mb-3">{t('pos.paymentMethod')}</Text>
        <View className="flex-row gap-3 mb-4">
          {PAYMENT_METHODS.map(({ key, icon, labelKey }) => (
            <TouchableOpacity
              key={key}
              testID={`payment-method-${key}`}
              className={`flex-1 py-4 rounded-2xl items-center border-2 ${
                paymentMethod === key
                  ? 'border-indigo-600 bg-indigo-50'
                  : 'border-gray-200 bg-white'
              }`}
              onPress={() => setPaymentMethod(key)}
            >
              <MaterialCommunityIcons
                name={icon as never}
                size={24}
                color={paymentMethod === key ? '#4f46e5' : '#9ca3af'}
              />
              <Text
                className={`text-xs font-semibold mt-1 ${
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
          <View className="bg-gray-50 rounded-2xl p-4 mb-6">
            {/* US-133: "Đúng tiền" chip next to label */}
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-sm text-gray-500">{t('pos.cashReceived')}</Text>
              <TouchableOpacity
                onPress={() => setCashReceived(String(total))}
                className="px-3 py-1 bg-indigo-100 rounded-full"
              >
                <Text className="text-xs font-semibold text-indigo-700">{t('pos.exactAmount')}</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-xl font-bold text-gray-900 mb-3"
              value={cashReceived}
              onChangeText={setCashReceived}
              keyboardType="numeric"
              placeholder="0"
            />
            {cashReceivedNum > 0 && (
              <View className="flex-row justify-between items-center">
                <Text className="text-gray-600 font-medium">{t('pos.change')}</Text>
                <Text
                  className={`text-xl font-bold ${change >= 0 ? 'text-indigo-600' : 'text-red-500'}`}
                >
                  {formatVnd(change)}
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Complete button */}
      <View
        className="px-4 pt-3 bg-white border-t border-gray-100"
        style={{ paddingBottom: insets.bottom + 16 }}
      >
        {/* Sticky error banner — stays visible above the button */}
        {checkoutError ? (
          <View className="flex-row items-center bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-3 gap-2">
            <MaterialCommunityIcons name="alert-outline" size={18} color="#d97706" />
            <Text className="text-amber-800 text-sm font-medium flex-1">{checkoutError}</Text>
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
            <Text className="text-white font-bold text-lg">{t('pos.completeOrder')}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
