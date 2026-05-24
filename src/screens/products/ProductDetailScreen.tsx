import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { productApi, type ProductStatsDTO } from '../../services/api';
import { useCartStore } from '../../store/cartStore';
import { useFeatureCheck } from '../../hooks/useFeature';
import { formatVnd, formatDateTime } from '../../utils/format';
import { useTypography } from '../../hooks/useTypography';
import { Skeleton } from '../../components/Skeleton';
import { ErrorState } from '../../components/ErrorState';
import { StickyAction } from '../../components/StickyAction';
import { ImagePickerSheet } from '../../components/ImagePickerSheet';
import { ProductImage } from '../../components/ProductImage';
import type { ProductsScreenProps } from '../../types/navigation';

export function ProductDetailScreen({ navigation, route }: ProductsScreenProps<'ProductDetail'>) {
  const { t } = useTranslation();
  const typo = useTypography();
  const insets = useSafeAreaInsets();
  const { productId } = route.params;
  const { addItem } = useCartStore();
  const has = useFeatureCheck();

  const queryClient = useQueryClient();
  const [sheetVisible, setSheetVisible] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);

  const { data: product, isLoading, isError, refetch } = useQuery({
    queryKey: ['product', productId],
    queryFn: () => productApi.getById(productId).then((r) => r.data.data),
    staleTime: 5 * 60_000,
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['product-stats', productId],
    queryFn: () => productApi.getStats(String(productId)).then((r) => r.data.data),
    staleTime: 5 * 60_000,
    enabled: !!product,
  });

  const invalidateProduct = () => {
    queryClient.invalidateQueries({ queryKey: ['product', productId] });
    queryClient.invalidateQueries({ queryKey: ['products'] });
  };

  const handleImageSelected = async (uri: string) => {
    setImageUploading(true);
    try {
      await productApi.uploadImage(String(productId), uri);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      invalidateProduct();
    } catch {
      Alert.alert(t('common.error'), t('products.image.uploadError'));
    } finally {
      setImageUploading(false);
    }
  };

  const handleDeleteImage = async () => {
    Alert.alert(
      t('products.image.deleteTitle'),
      t('products.image.deleteConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await productApi.deleteImage(String(productId));
              invalidateProduct();
            } catch {
              Alert.alert(t('common.error'), t('products.image.deleteError'));
            }
          },
        },
      ],
    );
  };

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
    // Navigate to the Sell tab (ProductStack → MoreStack → Tab)
    navigation.getParent()?.getParent()?.navigate('Sell' as any);
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-gray-50 dark:bg-gray-900">
        <View className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4" style={{ paddingTop: insets.top + 12, paddingBottom: 14 }}>
          <View className="flex-row items-center mb-0.5">
            <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} className="mr-3">
              <MaterialCommunityIcons name="chevron-left" size={26} color="#4f46e5" />
            </TouchableOpacity>
            <Skeleton height={22} width={160} borderRadius={6} style={{ flex: 1 }} />
            <Skeleton height={24} width={24} borderRadius={12} />
          </View>
          <Skeleton height={14} width={200} borderRadius={4} style={{ marginLeft: 36 }} />
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
      <View className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4" style={{ paddingTop: insets.top + 12, paddingBottom: 14 }}>
        <View className="flex-row items-center mb-0.5">
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
        <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 mt-0.5`}>
          {t('products.detailHint')}
        </Text>
      </View>

      {/* ── Hero banner ── */}
      <View className="bg-primary px-4 pb-6 pt-4">
        <View className="flex-row" style={{ gap: 12 }}>
          {/* Product image (tap to change; disabled while upload is in progress) */}
          <TouchableOpacity
            onPress={() => setSheetVisible(true)}
            activeOpacity={0.8}
            disabled={imageUploading}
            className="relative"
          >
            <ProductImage
              uri={product.imageUrl}
              style={{ width: 80, height: 80, borderRadius: 16 }}
              iconSize={28}
            />
            {imageUploading && (
              <View className="absolute inset-0 bg-black/40 rounded-2xl items-center justify-center">
                <ActivityIndicator color="white" size="small" />
              </View>
            )}
            {/* Small edit badge */}
            {!imageUploading && (
              <View className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full items-center justify-center shadow-sm">
                <MaterialCommunityIcons name="pencil" size={12} color="#4f46e5" />
              </View>
            )}
          </TouchableOpacity>

          {/* Text info */}
          <View className="flex-1">
            {/* Product name */}
            <Text className={`${typo.heading} text-white mb-2.5`} numberOfLines={2}>
              {product.name}
            </Text>

            {/* Chips row: type + category (+ duration for services) */}
            <View className="flex-row flex-wrap" style={{ gap: 8 }}>
              {isService ? (
                <>
                  <View className="bg-violet-400/60 rounded-xl px-3 py-1.5 flex-row items-center" style={{ gap: 5 }}>
                    <MaterialCommunityIcons name="bell-outline" size={14} color="white" />
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
                  {!!product.categoryNames?.[0] && (
                    <View className="bg-white/15 rounded-xl px-3 py-1.5 flex-row items-center" style={{ gap: 4 }}>
                      <MaterialCommunityIcons name="shape-outline" size={13} color="rgba(255,255,255,0.8)" />
                      <Text className={`${typo.label} text-indigo-100`}>{product.categoryNames[0]}</Text>
                    </View>
                  )}
                </>
              ) : product.dynamicPrice ? (
                <>
                  <View className="bg-yellow-400/90 rounded-xl px-3 py-1.5 flex-row items-center" style={{ gap: 5 }}>
                    <MaterialCommunityIcons name="gold" size={14} color="#92400e" />
                    <Text className={`${typo.labelBold} text-yellow-900`}>{t('products.goldPrice')}</Text>
                  </View>
                  {!!product.categoryNames?.[0] && (
                    <View className="bg-white/15 rounded-xl px-3 py-1.5 flex-row items-center" style={{ gap: 4 }}>
                      <MaterialCommunityIcons name="shape-outline" size={13} color="rgba(255,255,255,0.8)" />
                      <Text className={`${typo.label} text-indigo-100`}>{product.categoryNames[0]}</Text>
                    </View>
                  )}
                </>
              ) : (
                <>
                  <Text className={`${typo.heading} font-extrabold text-white w-full`}>{formatVnd(product.price)}</Text>
                  {!!product.categoryNames?.[0] && (
                    <View className="bg-white/15 rounded-xl px-3 py-1.5 flex-row items-center" style={{ gap: 4 }}>
                      <MaterialCommunityIcons name="shape-outline" size={13} color="rgba(255,255,255,0.8)" />
                      <Text className={`${typo.label} text-indigo-100`}>{product.categoryNames[0]}</Text>
                    </View>
                  )}
                </>
              )}
            </View>
          </View>
        </View>
      </View>

      {/* Image picker sheet */}
      <ImagePickerSheet
        visible={sheetVisible}
        hasImage={!!product.imageUrl}
        onClose={() => setSheetVisible(false)}
        onImageSelected={handleImageSelected}
        onDelete={handleDeleteImage}
      />

      {/* ── Scroll body ── */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 4, paddingBottom: 24, gap: 12 }}
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

        {/* ── Sales stats ── */}
        {statsLoading ? (
          <View style={{ gap: 8 }}>
            <Skeleton height={20} width={140} borderRadius={6} />
            <Skeleton height={88} borderRadius={16} />
            <Skeleton height={72} borderRadius={16} />
          </View>
        ) : stats ? (
          <ProductStatsCard stats={stats} typo={typo} has={has} unit={product.unit} />
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

// ── Product stats card ─────────────────────────────────────────────────────────

function ProductStatsCard({
  stats,
  typo,
  has,
  unit,
}: {
  stats: ProductStatsDTO;
  typo: ReturnType<typeof useTypography>;
  has: (feature: string) => boolean;
  unit?: string;
}) {
  const { t } = useTranslation();

  // Month-on-month revenue comparison
  const pctChange = (() => {
    if (stats.revenueLastMonth === 0) return stats.revenueThisMonth > 0 ? null : 0;
    return ((stats.revenueThisMonth - stats.revenueLastMonth) / stats.revenueLastMonth) * 100;
  })();
  const isUp = pctChange === null || pctChange > 0;
  const isFlat = pctChange === 0;

  return (
    <View style={{ gap: 10 }}>
      {/* Section label */}
      <View className="flex-row items-center" style={{ gap: 6 }}>
        <MaterialCommunityIcons name="chart-bar" size={16} color="#6b7280" />
        <Text className={`${typo.captionBold} text-gray-500 uppercase tracking-wide`}>
          {t('products.stats.title')}
        </Text>
        <Text className={`${typo.caption} text-gray-400`}>· {t('products.stats.period')}</Text>
      </View>

      {/* 4 metric tiles in a 2×2 grid */}
      <View className="flex-row flex-wrap" style={{ gap: 10 }}>
        {/* Orders */}
        <View className="bg-white rounded-2xl border border-gray-100 px-4 py-3.5 flex-1" style={{ minWidth: '45%' }}>
          <View className="w-8 h-8 bg-indigo-50 rounded-full items-center justify-center mb-2">
            <MaterialCommunityIcons name="receipt" size={16} color="#4f46e5" />
          </View>
          <Text className={`${typo.section} font-bold text-gray-900`}>{stats.orderCount}</Text>
          <Text className={`${typo.caption} text-gray-500 mt-0.5`}>{t('products.stats.orderCount')}</Text>
        </View>

        {/* Qty sold */}
        <View className="bg-white rounded-2xl border border-gray-100 px-4 py-3.5 flex-1" style={{ minWidth: '45%' }}>
          <View className="w-8 h-8 bg-emerald-50 rounded-full items-center justify-center mb-2">
            <MaterialCommunityIcons name="package-variant-closed" size={16} color="#059669" />
          </View>
          <Text className={`${typo.section} font-bold text-gray-900`}>
            {stats.qtySold}
            {unit ? <Text className={`${typo.caption} font-normal text-gray-500`}> {unit}</Text> : null}
          </Text>
          <Text className={`${typo.caption} text-gray-500 mt-0.5`}>{t('products.stats.qtySold')}</Text>
        </View>

        {/* Revenue */}
        <View className="bg-white rounded-2xl border border-gray-100 px-4 py-3.5 flex-1" style={{ minWidth: '45%' }}>
          <View className="w-8 h-8 bg-amber-50 rounded-full items-center justify-center mb-2">
            <MaterialCommunityIcons name="cash-multiple" size={16} color="#d97706" />
          </View>
          <Text className={`${typo.label} font-bold text-gray-900`} numberOfLines={1}>{formatVnd(stats.revenue)}</Text>
          <Text className={`${typo.caption} text-gray-500 mt-0.5`}>{t('products.stats.revenue')}</Text>
        </View>

        {/* Last sold */}
        <View className="bg-white rounded-2xl border border-gray-100 px-4 py-3.5 flex-1" style={{ minWidth: '45%' }}>
          <View className="w-8 h-8 bg-sky-50 rounded-full items-center justify-center mb-2">
            <MaterialCommunityIcons name="clock-check-outline" size={16} color="#0284c7" />
          </View>
          <Text className={`${typo.label} font-bold text-gray-900`} numberOfLines={1}>
            {stats.lastSoldAt ? formatDateTime(stats.lastSoldAt) : t('products.stats.never')}
          </Text>
          <Text className={`${typo.caption} text-gray-500 mt-0.5`}>{t('products.stats.lastSold')}</Text>
        </View>
      </View>

      {/* Month-on-month comparison */}
      <View className="bg-white rounded-2xl border border-gray-100 px-4 py-4">
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center" style={{ gap: 6 }}>
            <MaterialCommunityIcons name="trending-up" size={16} color="#6b7280" />
            <Text className={`${typo.captionBold} text-gray-600`}>{t('products.stats.revenue')}</Text>
          </View>
          {!isFlat && (
            <View
              className={`flex-row items-center rounded-full px-2 py-0.5 ${isUp ? 'bg-emerald-50' : 'bg-red-50'}`}
              style={{ gap: 2 }}
            >
              <MaterialCommunityIcons
                name={pctChange === null ? 'arrow-up' : isUp ? 'arrow-up' : 'arrow-down'}
                size={12}
                color={isUp ? '#059669' : '#ef4444'}
              />
              <Text className={`${typo.caption} font-semibold ${isUp ? 'text-emerald-700' : 'text-red-600'}`}>
                {pctChange === null ? t('products.stats.thisMonth') : `${Math.abs(pctChange).toFixed(0)}%`}
              </Text>
            </View>
          )}
        </View>
        <View className="flex-row" style={{ gap: 16 }}>
          <View className="flex-1">
            <Text className={`${typo.caption} text-gray-400 mb-1`}>{t('products.stats.thisMonth')}</Text>
            <Text className={`${typo.label} font-bold text-primary`}>{formatVnd(stats.revenueThisMonth)}</Text>
          </View>
          <View className="w-px bg-gray-100" />
          <View className="flex-1">
            <Text className={`${typo.caption} text-gray-400 mb-1`}>{t('products.stats.lastMonth')}</Text>
            <Text className={`${typo.label} font-semibold text-gray-600`}>{formatVnd(stats.revenueLastMonth)}</Text>
          </View>
        </View>
      </View>

      {/* Top customers */}
      {has('CUSTOMER') && stats.topCustomers.length > 0 && (
        <View className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <View className="flex-row items-center px-4 py-3 border-b border-gray-50" style={{ gap: 6 }}>
            <MaterialCommunityIcons name="account-star-outline" size={16} color="#6b7280" />
            <Text className={`${typo.captionBold} text-gray-600`}>{t('products.stats.topCustomers')}</Text>
          </View>
          {stats.topCustomers.map((c, i) => (
            <View
              key={i}
              className={`flex-row items-center px-4 py-3 ${i < stats.topCustomers.length - 1 ? 'border-b border-gray-50' : ''}`}
            >
              {/* Rank badge */}
              <View
                className="w-6 h-6 rounded-full items-center justify-center mr-3"
                style={{ backgroundColor: i === 0 ? '#fef3c7' : i === 1 ? '#f3f4f6' : '#fdf2f8' }}
              >
                <Text className={`${typo.caption} font-bold`} style={{ color: i === 0 ? '#d97706' : i === 1 ? '#6b7280' : '#a21caf' }}>
                  {i + 1}
                </Text>
              </View>
              <Text className={`${typo.label} text-gray-800 flex-1`} numberOfLines={1}>{c.name}</Text>
              <View className="items-end">
                <Text className={`${typo.label} font-semibold text-primary`}>{formatVnd(c.totalSpend)}</Text>
                <Text className={`${typo.caption} text-gray-400`}>{c.orderCount} {t('products.stats.ordersUnit')}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Top employees */}
      {has('EMPLOYEE') && stats.topEmployees.length > 0 && (
        <View className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <View className="flex-row items-center px-4 py-3 border-b border-gray-50" style={{ gap: 6 }}>
            <MaterialCommunityIcons name="account-tie-outline" size={16} color="#6b7280" />
            <Text className={`${typo.captionBold} text-gray-600`}>{t('products.stats.topEmployees')}</Text>
          </View>
          {stats.topEmployees.map((e, i) => (
            <View
              key={i}
              className={`flex-row items-center px-4 py-3 ${i < stats.topEmployees.length - 1 ? 'border-b border-gray-50' : ''}`}
            >
              <View
                className="w-6 h-6 rounded-full items-center justify-center mr-3"
                style={{ backgroundColor: i === 0 ? '#fef3c7' : i === 1 ? '#f3f4f6' : '#fdf2f8' }}
              >
                <Text className={`${typo.caption} font-bold`} style={{ color: i === 0 ? '#d97706' : i === 1 ? '#6b7280' : '#a21caf' }}>
                  {i + 1}
                </Text>
              </View>
              <Text className={`${typo.label} text-gray-800 flex-1`} numberOfLines={1}>{e.name}</Text>
              <Text className={`${typo.caption} text-gray-500`}>{e.orderCount} {t('products.stats.ordersUnit')}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
