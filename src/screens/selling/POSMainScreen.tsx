import { ActivityIndicator, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { shopConfigApi } from '../../services/api';
import { useSellingStore } from '../../store/sellingStore';
import { POSScreen } from '../pos/POSScreen';
import { BarberServiceScreen } from './BarberServiceScreen';
import { ScanScreen } from '../scan/ScanScreen';
import { OrderListScreen } from '../orders/OrderListScreen';
import type { SellingScreenProps } from '../../types/navigation';

const SCAN_SHOP_CODES = ['CONVENIENCE_STORE', 'FOOD_BEVERAGE', 'PHARMACY', 'ELECTRONICS'];

export function POSMainScreen(props: SellingScreenProps<'POSMain'>) {
  const { activeView } = useSellingStore();

  const { data, isLoading } = useQuery({
    queryKey: ['shopConfig'],
    queryFn: () => shopConfigApi.getInfo().then((r) => r.data.data),
    staleTime: 10 * 60_000,
  });

  // Orders view — render inline without waiting for shopConfig
  if (activeView === 'ORDERS') {
    return <OrderListScreen {...(props as any)} />;
  }

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 dark:bg-gray-900">
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  const code = data?.shopTypeCode ?? '';
  if (SCAN_SHOP_CODES.includes(code)) return <ScanScreen />;
  if (['BARBER_SHOP', 'BARBER_SHOP_MEN', 'HAIR_SALON', 'NAIL_SHOP',
       'LASH_PMU_STUDIO', 'SPA_SHOP', 'MASSAGE_SHOP', 'BEAUTY_CLINIC',
       'MAKEUP_STUDIO'].includes(code)) return <BarberServiceScreen {...props} />;
  return <POSScreen {...props} />;
}
