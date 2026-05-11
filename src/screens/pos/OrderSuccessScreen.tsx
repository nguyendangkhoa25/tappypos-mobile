import { View, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { formatVnd } from '../../utils/format';
import type { POSScreenProps } from '../../types/navigation';

export function OrderSuccessScreen({ navigation, route }: POSScreenProps<'OrderSuccess'>) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { orderNumber, total } = route.params;

  return (
    <View
      className="flex-1 bg-white items-center justify-center px-8"
      style={{ paddingBottom: insets.bottom + 16 }}
    >
      <View className="w-20 h-20 bg-primary-light rounded-full items-center justify-center mb-6">
        <MaterialCommunityIcons name="check-circle" size={48} color="#4f46e5" />
      </View>

      <Text className="text-2xl font-bold text-gray-900 mb-2 text-center">
        {t('pos.orderSuccess')}
      </Text>

      <View className="items-center mb-8">
        <Text testID="order-success-number" className="text-gray-500 text-base">
          {t('pos.orderNumber')} <Text className="font-bold text-gray-800">#{orderNumber}</Text>
        </Text>
        <Text className="text-3xl font-bold text-primary mt-2">{formatVnd(total)}</Text>
      </View>

      <TouchableOpacity
        className="bg-primary rounded-2xl py-4 px-12 active:opacity-80 mb-4"
        onPress={() => navigation.popToTop()}
      >
        <Text className="text-white font-bold text-lg">{t('pos.newOrder')}</Text>
      </TouchableOpacity>
    </View>
  );
}
