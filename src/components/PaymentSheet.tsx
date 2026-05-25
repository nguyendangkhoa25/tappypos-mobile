/**
 * PaymentSheet — shared bottom-sheet for collecting payment.
 *
 * Used by:
 *   • CartScreen   (cart checkout)  — showNote + quickPhrases + hideCard
 *   • OrderDetailScreen (pay & complete in-progress order)
 */
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useQuery } from '@tanstack/react-query';
import { shopConfigApi, type BankAccount } from '../services/api';
import { VietQrCard } from './VietQrCard';
import { formatVnd, formatMoneyDisplay } from '../utils/format';
import { useTypography } from '../hooks/useTypography';

export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'CARD';

const PAYMENT_OPTIONS: { value: PaymentMethod; labelKey: string; icon: string }[] = [
  { value: 'CASH',          labelKey: 'pos.cash',     icon: 'cash'                },
  { value: 'BANK_TRANSFER', labelKey: 'pos.transfer', icon: 'bank-transfer'       },
  { value: 'CARD',          labelKey: 'pos.card',     icon: 'credit-card-outline' },
];

type Props = {
  visible: boolean;
  total: number;
  /** Pre-select a payment method (e.g. the order's existing method). Defaults to CASH. */
  initialMethod?: PaymentMethod | null;
  onClose: () => void;
  onConfirm: (args: { method: PaymentMethod; amountPaid?: number; note?: string }) => void;
  paying: boolean;
  /** Show the note input below the payment section. Default: false. */
  showNote?: boolean;
  /** Quick-phrase chips inserted into the note field (from shop's POS config). */
  quickPhrases?: string[];
  /** Hide the CARD option (e.g. for STREET_FOOD / FOOD_BEVERAGE shops). Default: false. */
  hideCard?: boolean;
  /** VietQR description line (e.g. order number). Falls back to a generic string. */
  qrDescription?: string;
};

export function PaymentSheet({
  visible,
  total,
  initialMethod,
  onClose,
  onConfirm,
  paying,
  showNote = false,
  quickPhrases = [],
  hideCard = false,
  qrDescription,
}: Props) {
  const { t } = useTranslation();
  const typo = useTypography();
  const insets = useSafeAreaInsets();

  const [method, setMethod]                           = useState<PaymentMethod>((initialMethod as PaymentMethod) ?? 'CASH');
  const [cashInput, setCashInput]                     = useState(String(total));
  const [cashManuallyEdited, setCashManuallyEdited]   = useState(false);
  const [note, setNote]                               = useState('');
  const [noteFocused, setNoteFocused]                 = useState(false);
  const [showQr, setShowQr]                           = useState(false);

  // Reset every time the sheet opens
  useEffect(() => {
    if (visible) {
      const openMethod = (initialMethod as PaymentMethod) ?? 'CASH';
      setCashInput(String(total));
      setCashManuallyEdited(false);
      setMethod(openMethod);
      setNote('');
      setNoteFocused(false);
      setShowQr(openMethod === 'BANK_TRANSFER');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Keep default amount in sync with total (e.g. tip edits from OrderDetail)
  useEffect(() => {
    if (visible && !cashManuallyEdited) setCashInput(String(total));
  }, [total, visible, cashManuallyEdited]);

  // Show QR when switching to transfer, hide when switching away
  useEffect(() => {
    setShowQr(method === 'BANK_TRANSFER');
  }, [method]);

  const cashNum   = parseInt(cashInput.replace(/[^0-9]/g, '') || '0', 10);
  const cashDelta = cashNum > 0 ? cashNum - total : 0;

  // Load bank accounts — only when transfer is selected
  const { data: banks = [] } = useQuery<BankAccount[]>({
    queryKey: ['banks'],
    queryFn: () => shopConfigApi.getBanks().then((r) => r.data.data),
    staleTime: 5 * 60_000,
    enabled: visible && method === 'BANK_TRANSFER',
  });
  const primaryBank = banks[0] ?? null;

  const visibleMethods = hideCard
    ? PAYMENT_OPTIONS.filter((o) => o.value !== 'CARD')
    : PAYMENT_OPTIONS;

  // Amount field label adapts to the payment type
  const amountLabel = method === 'CASH' ? t('pos.cashReceived') : t('orders.amountPaid');

  const handleConfirm = () => {
    onConfirm({
      method,
      amountPaid: cashNum > 0 ? cashNum : undefined,
      note: note.trim() || undefined,
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1, justifyContent: 'flex-end' }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Backdrop — tap to dismiss */}
        <TouchableOpacity
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)' }}
          activeOpacity={1}
          onPress={onClose}
        />
        <View
          className="bg-white dark:bg-gray-900 rounded-t-3xl px-5 pt-4"
          style={{ paddingBottom: insets.bottom + 16 }}
        >
          {/* Drag handle */}
          <View className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full self-center mb-4" />

          {/* Title row */}
          <View className="flex-row items-center justify-between mb-4">
            <Text className={`${typo.section} text-gray-900 dark:text-white`}>
              {t('orders.collectPayment')}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialCommunityIcons name="close" size={22} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {/* Total row — hidden when QR is visible (amount already shown in VietQrCard) */}
          {method !== 'BANK_TRANSFER' && (
            <View className="flex-row items-center justify-between mb-5 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl px-4 py-3">
              <Text className={`${typo.label} text-indigo-700 dark:text-indigo-300`}>
                {t('pos.total')}
              </Text>
              <Text className={`${typo.heading} font-bold text-indigo-600 dark:text-indigo-400`}>
                {formatVnd(total)}
              </Text>
            </View>
          )}

          {/* VietQR — expands inline when QR button is toggled */}
          {method === 'BANK_TRANSFER' && primaryBank && showQr && (
            <View className="items-center mb-4 py-5 px-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
              <VietQrCard
                bank={primaryBank}
                amount={total}
                description={qrDescription ?? 'Thanh toan'}
              />
            </View>
          )}

          {/* Payment method selector */}
          <View className="flex-row gap-x-2 mb-4">
            {visibleMethods.map(({ value, labelKey, icon }) => (
              <TouchableOpacity
                key={value}
                testID={`payment-method-${value}`}
                className={`flex-1 flex-row items-center justify-center gap-x-1.5 py-3 rounded-xl border ${
                  method === value
                    ? 'bg-indigo-600 border-indigo-600'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600'
                }`}
                onPress={() => { Haptics.selectionAsync(); setMethod(value); }}
              >
                <MaterialCommunityIcons
                  name={icon as never}
                  size={16}
                  color={method === value ? '#fff' : '#6b7280'}
                />
                <Text
                  className={`${typo.captionBold} ${
                    method === value ? 'text-white' : 'text-gray-600 dark:text-gray-300'
                  }`}
                >
                  {t(labelKey)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Amount paid — shown for ALL methods */}
          <View className="mb-4">
            <View className="flex-row items-center justify-between mb-2">
              <Text className={`${typo.label} text-gray-700 dark:text-gray-300`}>
                {amountLabel}
              </Text>
              {cashManuallyEdited && (
                <TouchableOpacity
                  className="flex-row items-center gap-x-1"
                  onPress={() => {
                    Haptics.selectionAsync();
                    setCashInput(String(total));
                    setCashManuallyEdited(false);
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <MaterialCommunityIcons name="refresh" size={13} color="#4f46e5" />
                  <Text className={`${typo.captionBold} text-indigo-600 dark:text-indigo-400`}>
                    {t('pos.exactAmount')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <View className="flex-row items-center border-2 border-indigo-200 dark:border-indigo-700 rounded-2xl overflow-hidden bg-indigo-50 dark:bg-indigo-900/20">
              <TextInput
                value={formatMoneyDisplay(cashInput)}
                onChangeText={(text) => {
                  setCashInput(text.replace(/[^0-9]/g, ''));
                  setCashManuallyEdited(true);
                }}
                keyboardType="number-pad"
                selectionColor="#4f46e5"
                placeholder="0"
                placeholderTextColor="#a5b4fc"
                style={{
                  flex: 1,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  fontSize: typo.displaySize,
                  fontWeight: '700',
                  color: '#111827',
                }}
              />
              <View className="px-3 self-stretch justify-center bg-indigo-100 dark:bg-indigo-900/40 border-l border-indigo-200 dark:border-indigo-700">
                <Text className={`${typo.section} font-bold text-indigo-600 dark:text-indigo-400`}>đ</Text>
              </View>
            </View>

            {/* Change / shortage — CASH only */}
            {method === 'CASH' && cashNum > 0 && cashDelta !== 0 && (
              <View className="flex-row justify-between items-center mt-2 px-1">
                <Text className={`${typo.label} text-gray-600 dark:text-gray-300`}>
                  {cashDelta >= 0 ? t('pos.change') : t('pos.shortage')}
                </Text>
                <Text
                  className={`${typo.section} font-bold ${
                    cashDelta >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-red-500'
                  }`}
                >
                  {formatVnd(Math.abs(cashDelta))}
                </Text>
              </View>
            )}
          </View>

          {/* Note input (opt-in via showNote) */}
          {showNote && (
            <View className="mb-4">
              {noteFocused && quickPhrases.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 6, paddingBottom: 8 }}
                  keyboardShouldPersistTaps="handled"
                >
                  {quickPhrases.map((phrase) => (
                    <TouchableOpacity
                      key={phrase}
                      onPress={() => setNote((n) => (n ? `${n} ${phrase}` : phrase))}
                      className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 rounded-full"
                    >
                      <Text className={`${typo.caption} font-medium text-indigo-700 dark:text-indigo-300`}>
                        {phrase}
                      </Text>
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
                textAlignVertical="top"
              />
            </View>
          )}

          {/* Confirm button */}
          <TouchableOpacity
            className={`rounded-2xl py-4 items-center flex-row justify-center ${
              paying ? 'bg-gray-300 dark:bg-gray-700' : 'bg-indigo-600 active:opacity-80'
            }`}
            onPress={handleConfirm}
            disabled={paying}
            activeOpacity={0.85}
          >
            {paying ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text className={`${typo.labelBold} text-white`}>
                {t('orders.payAndComplete')}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
