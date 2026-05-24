import { ActivityIndicator, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useShallow } from 'zustand/react/shallow';
import { shopConfigApi } from '../../services/api';
import { useSellingStore } from '../../store/sellingStore';
import { useFeatureCheck } from '../../hooks/useFeature';
import { useCartStore } from '../../store/cartStore';
import { POSScreen } from '../pos/POSScreen';
import { BeautyServiceScreen } from './BeautyServiceScreen';
import { FnBServiceScreen } from './FnBServiceScreen';
import { TableGridScreen } from './TableGridScreen';
import { ScanScreen } from '../scan/ScanScreen';
import { OrderListScreen } from '../orders/OrderListScreen';
import { PawnListScreen } from '../pawn/PawnListScreen';
import type { SellingScreenProps } from '../../types/navigation';

const SCAN_SHOP_CODES = ['CONVENIENCE_STORE', 'FOOD_BEVERAGE', 'PHARMACY', 'ELECTRONICS'];
const FB_TABLE_CODES = ['RESTAURANT', 'COFFEE_SHOP', 'PUB', 'PUB_SEAFOOD', 'PUB_GOAT', 'PUB_BEEF'];

export function POSMainScreen(props: SellingScreenProps<'POSMain'>) {
  const { activeView } = useSellingStore();
  const has = useFeatureCheck();
  const { tableId, isTakeaway } = useCartStore(useShallow((s) => ({ tableId: s.tableId, isTakeaway: s.isTakeaway })));

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

  // F&B shops with table management: show FnBServiceScreen when a table is selected OR takeaway mode is active
  if (FB_TABLE_CODES.includes(code) && has('TABLE_SERVICE')) {
    if (tableId || isTakeaway) return <FnBServiceScreen {...props} />;
    return <TableGridScreen />;
  }

  if (code === 'PAWN_SHOP' && has('PAWN')) return <PawnListScreen />;
  if (SCAN_SHOP_CODES.includes(code)) return <ScanScreen />;
  if (['BARBER_SHOP', 'BARBER_SHOP_MEN', 'HAIR_SALON', 'NAIL_SHOP',
       'LASH_PMU_STUDIO', 'SPA_SHOP', 'MASSAGE_SHOP', 'BEAUTY_CLINIC',
       'MAKEUP_STUDIO'].includes(code)) return <BeautyServiceScreen {...props} />;
  return <POSScreen {...props} />;
}
