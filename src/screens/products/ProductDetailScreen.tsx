import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { productApi } from '../../services/api';
import { useCartStore } from '../../store/cartStore';
import { formatVnd } from '../../utils/format';
import { useTypography } from '../../hooks/useTypography';
import { Skeleton } from '../../components/Skeleton';
import { ErrorState } from '../../components/ErrorState';
import { StickyAction } from '../../components/StickyAction';
import type { ProductsScreenProps } from '../../types/navigation';

export function ProductDetailScreen({ navigation, route }: ProductsScreenProps<'ProductDetail'>) {
  const { t } = useTranslation();
  const typo = useTypography();
  const insets = useSafeAreaInsets();
  const { productId } = route.params;
  const { addItem } = useCartStore();

  const { data: product, isLoading, isError, refetch } = useQuery({
    queryKey: ['product', productId],
    queryFn: () => productApi.getById(productId).then((r) => r.data.data),
    staleTime: 5 * 60_000,
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
      <View className="flex-1 bg-gray-50 dark:bg-gray-900">
        <View className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4" style={{ paddingTop: insets.top + 12, paddingBottom: 12 }}>
          <View className="flex-row items-center">
            <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} className="mr-3">
              <MaterialCommunityIcons name="chevron-left" size={26} color="#4f46e5" />
            </TouchableOpacity>
            <Skeleton height={22} width={160} borderRadius={6} style={{ flex: 1 }} />
            <Skeleton height={24} width={24} borderRadius={12} />
          </View>
        </View>
        <View className="bg-primary px-4 pb-6 pt-4">
          <Skeleton height={12} width="70%" borderRadius={4} style={{ marginBottom: 20 }} />
          <Skeleton height={26} width="60%" borderRadius={8} style={{ marginBottom: 8 }} />
          <Skeleton height={36} width={140} borderRadius={8} />
        </View>
        <View className="px-4 pt-4" style={{ gap: 12 }}>
          <Skeleton height={100} borderRadius={16} />
          <Skeleton height={80} borderRadius={16} />
        </View>
      </View>
    );
  }

  if (isError || !product) return <ErrorState onRetry={refetch} />;

  const isService = product.productTypeCode === 'SERVICE';

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* ── Nav header ── */}
      <View className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4" style={{ paddingTop: insets.top + 12, paddingBottom: 12 }}>
        <View className="flex-row items-center">
          <TouchableOpacity
            className="mr-3"
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons name="chevron-left" size={26} color="#4f46e5" />
          </TouchableOpacity>
          <Text className={`${typo.heading} text-gray-900 dark:text-white flex-1`} numberOfLines={1}>
            {t('products.detailTitle')}
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('ProductEdit', { productId: product.id })}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons name="pencil-outline" size={22} color="#4f46e5" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Hero banner ── */}
      <View className="bg-primary px-4 pb-6 pt-4">

        {/* Category chip */}
        {product.categoryNames?.[0] && (
          <View className="self-start bg-white/20 rounded-full px-3 py-1 mb-2">
            <Text className={`${typo.caption} font-medium text-indigo-100`}>{product.categoryNames[0]}</Text>
          </View>
        )}

        {/* Product name */}
        <Text className={`${typo.heading} text-white mb-3`} numberOfLines={2}>
          {product.name}
        </Text>

        {/* Price / type badge */}
        {isService ? (
          <View className="flex-row flex-wrap" style={{ gap: 8 }}>
            <View className="bg-violet-400/60 rounded-xl px-3 py-1.5 flex-row items-center" style={{ gap: 5 }}>
              <MaterialCommunityIcons name="bell-service-outline" size={14} color="white" />
              <Text className={`${typo.label} text-white`}>{t('products.service')}</Text>
            </View>
            {!!product.durationMinutes && (
              <View className="bg-white/20 rounded-xl px-3 py-1.5 flex-row items-center" style={{ gap: 5 }}>
                <MaterialCommunityIcons name="clock-outline" size={14} color="white" />
                <Text className={`${typo.label} text-white`}>
                  {product.durationMinutes} {t('products.minutes')}
                </Text>
              </View>
            )}
          </View>
        ) : product.dynamicPrice ? (
          <View className="self-start bg-yellow-400/90 rounded-xl px-3 py-1.5 flex-row items-center" style={{ gap: 5 }}>
            <MaterialCommunityIcons name="gold" size={14} color="#92400e" />
            <Text className={`${typo.labelBold} text-yellow-900`}>{t('products.goldPrice')}</Text>
          </View>
        ) : (
          <Text className={`${typo.heading} font-extrabold text-white`}>{formatVnd(product.price)}</Text>
        )}
      </View>

      {/* ── Scroll body ── */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 24, gap: 12 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Service price row */}
        {isService && product.price > 0 && (
          <View className="bg-white rounded-2xl border border-gray-100 px-4 py-4 flex-row items-center justify-between">
            <View className="flex-row items-center" style={{ gap: 8 }}>
              <View className="w-8 h-8 bg-indigo-50 rounded-full items-center justify-center">
                <MaterialCommunityIcons name="cash" size={16} color="#4f46e5" />
              </View>
              <Text className={`${typo.caption} text-gray-500`}>{t('products.price')}</Text>
            </View>
            <Text className={`${typo.section} font-bold text-primary`}>{formatVnd(product.price)}</Text>
          </View>
        )}

        {/* Stock status — never for services */}
        {!isService && product.stockQuantity != null && (
          <View
            className={`flex-row items-center rounded-2xl px-4 py-3.5 border ${
              product.inStock ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
            }`}
            style={{ gap: 10 }}
          >
            <View
              className="w-9 h-9 rounded-full items-center justify-center"
              style={{ backgroundColor: product.inStock ? '#05966922' : '#ef444422' }}
            >
              <MaterialCommunityIcons
                name={product.inStock ? 'check-circle' : 'close-circle'}
                size={20}
                color={product.inStock ? '#059669' : '#ef4444'}
              />
            </View>
            <View className="flex-1">
              <Text className={`${typo.labelBold} ${product.inStock ? 'text-emerald-700' : 'text-red-600'}`}>
                {product.inStock ? t('products.inStock') : t('products.outOfStock')}
              </Text>
              <Text className={`${typo.caption} text-gray-500`}>
                {t('products.stock')}: {product.stockQuantity} {product.unit}
              </Text>
            </View>
          </View>
        )}

        {/* Details card */}
        <View className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <DetailRow icon="tag-outline" label={t('products.unit')} value={product.unit} />
          {product.categoryNames?.[0] && (
            <DetailRow icon="shape-outline" label={t('products.category')} value={product.categoryNames[0]} />
          )}
          {product.productTypeCode && (
            <DetailRow
              icon="package-variant-closed"
              label={t('products.productType')}
              value={product.productTypeName ?? product.productTypeCode}
            />
          )}
          {isService && !!product.durationMinutes && (
            <DetailRow
              icon="clock-outline"
              label={t('products.duration')}
              value={`${product.durationMinutes} ${t('products.minutes')}`}
              last
            />
          )}
        </View>

        {/* Description */}
        {product.description ? (
          <View className="bg-white rounded-2xl border border-gray-100 p-4">
            <View className="flex-row items-center mb-2" style={{ gap: 6 }}>
              <MaterialCommunityIcons name="text-box-outline" size={16} color="#6b7280" />
              <Text className={`${typo.captionBold} text-gray-500 uppercase tracking-wide`}>
                {t('products.description')}
              </Text>
            </View>
            <Text className={`${typo.caption} text-gray-700 leading-6`}>{product.description}</Text>
          </View>
        ) : null}

      </ScrollView>

      <StickyAction
        icon={isService ? 'calendar-check' : 'cart-plus'}
        label={isService ? t('products.bookService') : t('products.addToCart')}
        onPress={handleAddToCart}
      />
    </View>
  );
}

function DetailRow({
  icon,
  label,
  value,
  last = false,
}: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  label: string;
  value: string;
  last?: boolean;
}) {
  const typo = useTypography();
  return (
    <View className={`flex-row items-center px-4 py-3.5 ${!last ? 'border-b border-gray-50' : ''}`}>
      <View className="w-8 h-8 bg-indigo-50 rounded-full items-center justify-center mr-3">
        <MaterialCommunityIcons name={icon} size={16} color="#4f46e5" />
      </View>
      <Text className={`${typo.caption} text-gray-500 flex-1`}>{label}</Text>
      <Text className={`${typo.label} text-gray-800`}>{value}</Text>
    </View>
  );
}
