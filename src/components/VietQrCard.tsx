import { View, Text, Image, TouchableOpacity } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { buildVietQrUrl } from '../utils/vietqr';
import { useTypography } from '../hooks/useTypography';
import type { BankAccount } from '../services/api';

type Props = {
  bank: BankAccount;
  amount: number;
  description?: string;
  size?: number;
};

export function VietQrCard({ bank, amount, description = 'Thanh toan', size = 200 }: Props) {
  const typo = useTypography();

  const qrUrl = buildVietQrUrl(
    bank.bankBin ?? bank.bankCode,
    bank.accountNumber,
    bank.accountName,
    amount,
    description,
  );

  return (
    <View className="items-center">
      <Image
        source={{ uri: qrUrl }}
        style={{ width: size, height: size, borderRadius: 8 }}
        resizeMode="contain"
      />
      <Text className={`${typo.heading} text-indigo-600 mt-3`}>
        {amount.toLocaleString('vi-VN')} ₫
      </Text>
      <Text className={`${typo.label} font-bold text-gray-700 dark:text-gray-200 mt-2`}>
        {bank.bankShortName ?? bank.bankName}
      </Text>
      <TouchableOpacity
        className="flex-row items-center gap-x-1 mt-1"
        onPress={() => {
          Clipboard.setStringAsync(bank.accountNumber);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text className={`${typo.label} font-bold text-gray-900 dark:text-white tracking-wider`}
          style={{ fontVariant: ['tabular-nums'] }}>
          {bank.accountNumber}
        </Text>
        <MaterialCommunityIcons name="content-copy" size={14} color="#9ca3af" />
      </TouchableOpacity>
      <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 mt-0.5`}>
        {bank.accountName}
      </Text>
      <Text className={`${typo.caption} text-gray-400 mt-2`}>Quét mã để thanh toán</Text>
    </View>
  );
}
