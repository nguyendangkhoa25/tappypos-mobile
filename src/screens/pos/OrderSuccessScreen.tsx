import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import * as Print from 'expo-print';
import { orderApi } from '../../services/api';
import { formatVnd } from '../../utils/format';
import type { OrderDetail } from '../../services/api';
import type { POSScreenProps } from '../../types/navigation';

const AUTO_SECONDS = 5;

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

function buildReceiptHtml(order: OrderDetail, t: (k: string) => string): string {
  const rows = order.items
    .map(
      (item) =>
        `<tr>
          <td>${item.productName} × ${item.quantity}</td>
          <td style="text-align:right">${item.subtotal.toLocaleString('vi-VN')} ₫</td>
        </tr>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: monospace; font-size: 12px; padding: 12px; color: #111; }
    h2 { text-align: center; font-size: 15px; margin-bottom: 4px; letter-spacing: 2px; }
    .center { text-align: center; }
    .muted { color: #555; font-size: 11px; }
    hr { border: none; border-top: 1px dashed #aaa; margin: 8px 0; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 3px 2px; vertical-align: top; }
    .total-row td { font-weight: bold; font-size: 13px; border-top: 1px dashed #aaa; padding-top: 6px; }
    .footer { text-align: center; margin-top: 12px; font-size: 11px; color: #555; }
  </style>
</head>
<body>
  <h2>BIÊN NHẬN</h2>
  <p class="center muted">${new Date(order.createdAt).toLocaleString('vi-VN')}</p>
  <p class="center" style="margin-top:2px">Mã đơn: <strong>#${order.orderNumber}</strong></p>
  ${order.customerName ? `<p class="center muted">Khách: ${order.customerName}</p>` : ''}
  <hr/>
  <table>
    <tbody>${rows}</tbody>
  </table>
  ${
    order.discount > 0
      ? `<table style="margin-top:4px">
          <tr><td>Giảm giá</td><td style="text-align:right">-${order.discount.toLocaleString('vi-VN')} ₫</td></tr>
        </table>`
      : ''
  }
  <table>
    <tr class="total-row">
      <td>Tổng cộng</td>
      <td style="text-align:right">${order.total.toLocaleString('vi-VN')} ₫</td>
    </tr>
  </table>
  ${
    order.paymentMethod === 'CASH' && order.amountPaid
      ? `<table style="margin-top:4px">
          <tr><td class="muted">Tiền nhận</td><td style="text-align:right" class="muted">${order.amountPaid.toLocaleString('vi-VN')} ₫</td></tr>
          <tr><td class="muted">Tiền thừa</td><td style="text-align:right" class="muted">${(order.changeAmount ?? 0).toLocaleString('vi-VN')} ₫</td></tr>
        </table>`
      : ''
  }
  <p class="footer">Cảm ơn quý khách!</p>
</body>
</html>`;
}

export function OrderSuccessScreen({ navigation, route }: POSScreenProps<'OrderSuccess'>) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { orderId, orderNumber, total } = route.params;

  const [countdown, setCountdown] = useState(AUTO_SECONDS);
  const [printing, setPrinting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: orderData } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => orderApi.getById(orderId).then((r) => r.data.data),
    staleTime: 60_000,
  });

  const startCountdown = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timerRef.current!);
          navigation.popToTop();
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  }, [navigation]);

  useEffect(() => {
    startCountdown();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [startCountdown]);

  const handlePrint = async () => {
    if (!orderData) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setPrinting(true);
    try {
      await Print.printAsync({ html: buildReceiptHtml(orderData, t) });
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
      className="flex-1 bg-white items-center justify-center px-8"
      style={{ paddingBottom: insets.bottom + 16, paddingTop: insets.top + 16 }}
    >
      {/* Success icon */}
      <View className="w-24 h-24 bg-indigo-50 rounded-full items-center justify-center mb-6">
        <MaterialCommunityIcons name="check-circle" size={56} color="#4f46e5" />
      </View>

      <Text className="text-2xl font-bold text-gray-900 mb-2 text-center">
        {t('pos.orderSuccess')}
      </Text>

      <View className="items-center mb-10">
        <Text testID="order-success-number" className="text-gray-500 text-base">
          {t('pos.orderNumber')}{' '}
          <Text className="font-bold text-gray-800">#{orderNumber}</Text>
        </Text>
        <Text className="text-3xl font-bold text-indigo-600 mt-2">{formatVnd(total)}</Text>

        {orderData?.paymentMethod && (
          <View className="items-center mt-3 gap-y-1">
            <View className="flex-row items-center gap-x-1.5 bg-gray-100 rounded-full px-4 py-1.5">
              <Text>{PM_EMOJI[orderData.paymentMethod] ?? '💰'}</Text>
              <Text className="text-sm font-medium text-gray-700">
                {t(PM_I18N[orderData.paymentMethod] ?? 'pos.cash')}
              </Text>
            </View>
            {orderData.paymentMethod === 'CASH' && (orderData.changeAmount ?? 0) > 0 && (
              <Text className="text-sm text-emerald-600 font-medium">
                {t('pos.change')}: {formatVnd(orderData.changeAmount!)}
              </Text>
            )}
          </View>
        )}
      </View>

      {/* Print receipt */}
      <TouchableOpacity
        className={`w-full rounded-2xl py-4 items-center justify-center flex-row gap-2 mb-3 border-2 ${
          !orderData || printing
            ? 'border-gray-200 bg-gray-50'
            : 'border-indigo-200 bg-indigo-50 active:opacity-70'
        }`}
        onPress={handlePrint}
        disabled={!orderData || printing}
      >
        {printing ? (
          <ActivityIndicator size="small" color="#4f46e5" />
        ) : (
          <MaterialCommunityIcons
            name="printer-outline"
            size={20}
            color={orderData ? '#4f46e5' : '#9ca3af'}
          />
        )}
        <Text
          className={`font-semibold text-base ${
            !orderData || printing ? 'text-gray-400' : 'text-indigo-700'
          }`}
        >
          {printing ? t('pos.printing') : t('pos.printReceipt')}
        </Text>
      </TouchableOpacity>

      {/* New order with countdown */}
      <TouchableOpacity
        testID="order-success-new"
        className="w-full rounded-2xl py-4 items-center bg-indigo-600 active:opacity-80"
        onPress={handleNewOrder}
      >
        <Text className="text-white font-bold text-base">{t('pos.newOrder')}</Text>
        <Text className="text-indigo-300 text-xs mt-0.5">{t('pos.autoReturn', { count: countdown })}</Text>
      </TouchableOpacity>
    </View>
  );
}
