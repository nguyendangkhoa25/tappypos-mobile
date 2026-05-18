import { View, Text } from 'react-native';
import { useTypography } from '../../hooks/useTypography';
export function SellingScreen() {
  const typo = useTypography();
  return <View className="flex-1 bg-gray-50 dark:bg-gray-900 items-center justify-center"><Text className={`${typo.caption} text-gray-900 dark:text-white`}>Selling</Text></View>;
}
