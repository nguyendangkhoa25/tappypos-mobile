import { View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

export function ScanScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  return (
    <View
      className="flex-1 bg-white dark:bg-gray-900 items-center justify-center px-8"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      <View className="items-center">
        {/* Scanner frame */}
        <View className="w-52 h-52 items-center justify-center mb-8">
          {/* Corner brackets */}
          <View className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-primary rounded-tl-lg" />
          <View className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-primary rounded-tr-lg" />
          <View className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-primary rounded-bl-lg" />
          <View className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-primary rounded-br-lg" />

          <MaterialCommunityIcons name="barcode-scan" size={72} color="#c7d2fe" />
        </View>

        <Text className="text-xl font-bold text-gray-800 dark:text-white mb-2">
          {t('scan.title')}
        </Text>
        <Text className="text-sm text-gray-400 dark:text-gray-500 text-center leading-5">
          {t('scan.coming')}
        </Text>
        <Text className="text-xs text-gray-300 dark:text-gray-600 text-center mt-1">
          {t('scan.comingHint')}
        </Text>
      </View>
    </View>
  );
}
