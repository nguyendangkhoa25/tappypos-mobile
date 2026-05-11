import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { productApi } from '../../services/api';
import { useCartStore } from '../../store/cartStore';
import { formatVnd } from '../../utils/format';
import { Skeleton } from '../../components/Skeleton';
import { ErrorState } from '../../components/ErrorState';
import type { ProductsScreenProps } from '../../types/navigation';

export function ProductDetailScreen({ navigation, route }: ProductsScreenProps<'ProductDetail'>) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { productId } = route.params;
  const { addItem } = useCartStore();

  const { data: product, isLoading, isError, refetch } = useQuery({
    queryKey: ['product', productId],
    queryFn: () => productApi.getById(productId).then((r) => r.data.data),
  });

  const handleAddToCart = () => {
    if (!product) return;
    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      unit: product.unit,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    navigation.goBack();
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-white px-4 pt-20">
        <Skeleton height={28} width={200} borderRadius={8} style={{ marginBottom: 12 }} />
        <Skeleton height={18} width={120} borderRadius={6} style={{ marginBottom: 20 }} />
        <Skeleton height={16} borderRadius={6} style={{ marginBottom: 8 }} />
        <Skeleton height={16} borderRadius={6} style={{ marginBottom: 8 }} />
        <Skeleton height={16} width="60%" borderRadius={6} />
      </View>
    );
  }

  if (isError || !product) return <ErrorState onRetry={refetch} />;

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 border-b border-gray-100">
        <TouchableOpacity className="mr-3 p-1" onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#374151" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900 flex-1" numberOfLines={1}>
          {product.name}
        </Text>
      </View>

      <ScrollView
        className="flex-1 px-4 pt-4"
        contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
      >
        {/* Price + name */}
        <Text className="text-2xl font-bold text-gray-900 mb-1">{product.name}</Text>

        {product.dynamicPrice ? (
          <View className="self-start bg-yellow-50 border border-yellow-200 rounded-xl px-3 py-1.5 mb-4">
            <Text className="text-warning font-bold">{t('products.goldPrice')}</Text>
          </View>
        ) : (
          <Text className="text-3xl font-bold text-primary mb-4">{formatVnd(product.price)}</Text>
        )}

        {/* Details */}
        <View className="bg-gray-50 rounded-2xl p-4 mb-4">
          {product.categoryName && (
            <InfoRow label={t('products.category')} value={product.categoryName} />
          )}
          <InfoRow label={t('products.unit')} value={product.unit} />
          {product.stockQuantity !== null && (
            <InfoRow
              label={t('products.stock')}
              value={`${product.stockQuantity}`}
              valueColor={product.inStock ? '#059669' : '#ef4444'}
            />
          )}
        </View>

        {product.description && (
          <View className="bg-gray-50 rounded-2xl p-4">
            <Text className="text-sm font-semibold text-gray-600 mb-2">
              {t('products.description')}
            </Text>
            <Text className="text-base text-gray-700 leading-6">{product.description}</Text>
          </View>
        )}
      </ScrollView>

      {/* Add to cart FAB */}
      <View
        className="px-4 pt-3 bg-white border-t border-gray-100"
        style={{ paddingBottom: insets.bottom + 16 }}
      >
        <TouchableOpacity
          className="bg-primary rounded-2xl py-4 flex-row items-center justify-center gap-2 active:opacity-80"
          onPress={handleAddToCart}
        >
          <MaterialCommunityIcons name="cart-plus" size={22} color="#fff" />
          <Text className="text-white font-bold text-base">{t('products.addToCart')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function InfoRow({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View className="flex-row justify-between mb-2">
      <Text className="text-gray-500">{label}</Text>
      <Text className="font-medium" style={{ color: valueColor ?? '#1f2937' }}>
        {value}
      </Text>
    </View>
  );
}
