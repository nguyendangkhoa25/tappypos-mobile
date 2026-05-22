import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import * as Print from 'expo-print';
import { orderApi } from '../../services/api';
import { formatVnd } from '../../utils/format';
import { useTypography } from '../../hooks/useTypography';
import type { POSScreenProps } from '../../types/navigation';

const AUTO_SECONDS = 10;

const PM_EMOJI: Record<string, string> = {
  CASH: '💵',
  BANK_TRANSFER: '🏦',
  CARD: '💳',
};
const PM_I18N: Record<string, string> = {
  CASH: 'pos.cash',
  BANK_TRANSFER: 'pos.transfer',
  CARD: 'pos.card',
};


export function OrderSuccessScreen({ navigation, route }: POSScreenProps<'OrderSuccess'>) {
  const { t } = useTranslation();
  const typo = useTypography();
  const insets = useSafeAreaInsets();
  const { orderId, orderNumber, total, savedOffline } = route.params;

  const [countdown, setCountdown] = useState(AUTO_SECONDS);
  const [printing, setPrinting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: orderData } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => orderApi.getById(orderId).then((r) => r.data.data),
    staleTime: 60_000,
    enabled: !savedOffline && !!orderId,
  });

  const startCountdown = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    startCountdown();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [startCountdown]);

  useEffect(() => {
    if (countdown === 0) navigation.popToTop();
  }, [countdown, navigation]);

  const handlePrint = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setPrinting(true);
    try {
      const res = await orderApi.getReceipt(orderId);
      await Print.printAsync({ html: res.data });
    } finally {
      setPrinting(false);
      startCountdown();
    }
  };

  const handleNewOrder = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    navigation.popToTop();
  };

  return (
    <View
      className="flex-1 bg-white dark:bg-gray-900 items-center justify-center px-8"
      style={{ paddingBottom: insets.bottom + 16, paddingTop: insets.top + 16 }}
    >
      {/* Success icon */}
      <View className="w-24 h-24 bg-indigo-50 dark:bg-indigo-900/30 rounded-full items-center justify-center mb-6">
        <MaterialCommunityIcons name="check-circle" size={56} color="#4f46e5" />
      </View>

      <Text className={`${typo.heading} text-gray-900 dark:text-white mb-2 text-center`}>
        {savedOffline ? t('pos.savedOfflineTitle') : t('pos.orderSuccess')}
      </Text>

      {savedOffline && (
        <View className="flex-row items-center bg-gray-100 dark:bg-gray-700 rounded-full px-4 py-1.5 mb-3 gap-x-1.5">
          <MaterialCommunityIcons name="wifi-off" size={14} color="#6b7280" />
          <Text className={`${typo.caption} font-medium text-gray-600 dark:text-gray-300`}>{t('pos.savedOffline')}</Text>
        </View>
      )}

      <View className="items-center mb-10">
        <Text testID="order-success-number" className={`${typo.caption} text-gray-500 dark:text-gray-400`}>
          {savedOffline ? t('pos.willSyncWhenOnline') : (
            <>
              {t('pos.orderNumber')}{' '}
              <Text className={`${typo.caption} font-bold text-gray-800 dark:text-gray-100`}>#{orderNumber}</Text>
            </>
          )}
        </Text>
        <Text className={`${typo.heading} text-indigo-600 mt-2`}>{formatVnd(total)}</Text>

        {orderData?.paymentMethod && (
          <View className="items-center mt-3 gap-y-1">
            <View className="flex-row items-center gap-x-1.5 bg-gray-100 dark:bg-gray-700 rounded-full px-4 py-1.5">
              <Text>{PM_EMOJI[orderData.paymentMethod] ?? '💰'}</Text>
              <Text className={`${typo.caption} font-medium text-gray-700 dark:text-gray-200`}>
                {t(PM_I18N[orderData.paymentMethod] ?? 'pos.cash')}
              </Text>
            </View>
            {orderData.paymentMethod === 'CASH' && (orderData.changeAmount ?? 0) > 0 && (
              <Text className={`${typo.caption} font-medium text-emerald-600`}>
                {t('pos.change')}: {formatVnd(orderData.changeAmount!)}
              </Text>
            )}
          </View>
        )}
      </View>

      {/* Print receipt — hidden when saved offline (no server order exists yet) */}
      {!savedOffline && (
        <TouchableOpacity
          className={`w-full rounded-2xl py-4 items-center justify-center flex-row gap-2 mb-3 border-2 ${
            printing
              ? 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800'
              : 'border-indigo-200 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/30 active:opacity-70'
          }`}
          onPress={handlePrint}
          disabled={printing}
        >
          {printing ? (
            <ActivityIndicator size="small" color="#4f46e5" />
          ) : (
            <MaterialCommunityIcons
              name="printer-outline"
              size={20}
              color="#4f46e5"
            />
          )}
          <Text
            className={`${typo.labelBold} ${
              printing ? 'text-gray-400 dark:text-gray-500' : 'text-indigo-700 dark:text-indigo-400'
            }`}
          >
            {printing ? t('pos.printing') : t('pos.printReceipt')}
          </Text>
        </TouchableOpacity>
      )}

      {/* New order with countdown */}
      <TouchableOpacity
        testID="order-success-new"
        className="w-full rounded-2xl py-4 items-center bg-indigo-600 active:opacity-80"
        onPress={handleNewOrder}
      >
        <Text className={`${typo.labelBold} text-white`}>{t('pos.newOrder')}</Text>
        <Text className={`${typo.caption} text-indigo-300 mt-0.5`}>{t('pos.autoReturn', { count: countdown })}</Text>
      </TouchableOpacity>
    </View>
  );
}
