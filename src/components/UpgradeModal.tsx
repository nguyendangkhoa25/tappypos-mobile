import { View, Text, Modal, TouchableOpacity, Linking } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTypography } from '../hooks/useTypography';
import { SUPPORT } from '../utils/constants';

type PlanConfig = {
  code: string;
  price: string;
  maxUsers: number | null;
  maxOrdersPerMonth: number | null;
  highlight?: boolean;
};

const PLANS: PlanConfig[] = [
  { code: 'STARTER',    price: '70.000 ₫/tháng',  maxUsers: 1,    maxOrdersPerMonth: 1_000 },
  { code: 'BASIC',      price: '100.000 ₫/tháng', maxUsers: 3,    maxOrdersPerMonth: 5_000, highlight: true },
  { code: 'PRO',        price: '300.000 ₫/tháng', maxUsers: 10,   maxOrdersPerMonth: null },
  { code: 'ENTERPRISE', price: 'Liên hệ',          maxUsers: null, maxOrdersPerMonth: null },
];

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function UpgradeModal({ visible, onClose }: Props) {
  const { t } = useTranslation();
  const typo = useTypography();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black/60 justify-end">
        <View className="bg-white dark:bg-gray-900 rounded-t-3xl px-5 pt-5 pb-8">
          {/* Header */}
          <View className="flex-row items-center justify-between mb-1">
            <Text className={`${typo.section} text-gray-900 dark:text-white`}>{t('upgrade.title')}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialCommunityIcons name="close" size={22} color="#6b7280" />
            </TouchableOpacity>
          </View>
          <Text className={`${typo.caption} text-red-500 mb-4`}>{t('upgrade.limitReached')}</Text>

          {/* Plan cards */}
          <View className="gap-3 mb-5">
            {PLANS.map((plan) => (
              <View
                key={plan.code}
                className={`rounded-2xl p-4 border ${
                  plan.highlight
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                    : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'
                }`}
              >
                <View className="flex-row items-center justify-between mb-1">
                  <View className="flex-row items-center gap-2">
                    <Text className={`${typo.labelBold} text-gray-900 dark:text-white`}>
                      {t(`upgrade.plans.${plan.code}`)}
                    </Text>
                    {plan.highlight && (
                      <View className="bg-indigo-600 px-2 py-0.5 rounded-full">
                        <Text className="text-white text-xs font-bold">{t('upgrade.popularBadge')}</Text>
                      </View>
                    )}
                  </View>
                  <Text className={`${typo.label} font-bold text-indigo-600`}>{plan.price}</Text>
                </View>
                <View className="flex-row gap-4">
                  <View className="flex-row items-center gap-1">
                    <MaterialCommunityIcons name="account-outline" size={13} color="#6b7280" />
                    <Text className={`${typo.caption} text-gray-500`}>
                      {plan.maxUsers == null
                        ? t('upgrade.staffUnlimited')
                        : t('upgrade.staffCount', { count: plan.maxUsers })}
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-1">
                    <MaterialCommunityIcons name="receipt-outline" size={13} color="#6b7280" />
                    <Text className={`${typo.caption} text-gray-500`}>
                      {plan.maxOrdersPerMonth == null
                        ? t('upgrade.ordersUnlimited')
                        : t('upgrade.ordersPerMonth', { count: plan.maxOrdersPerMonth.toLocaleString() })}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>

          {/* CTA */}
          <TouchableOpacity
            onPress={() => Linking.openURL(`tel:${SUPPORT.phone}`)}
            className="bg-indigo-600 rounded-2xl py-4 items-center flex-row justify-center gap-2"
          >
            <MaterialCommunityIcons name="phone" size={18} color="#fff" />
            <Text className={`${typo.labelBold} text-white`}>{t('upgrade.contactBtn')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
