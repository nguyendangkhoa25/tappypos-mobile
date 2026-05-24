import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { productApi, categoryApi, type ProductData, type ProductSummary } from '../../services/api';
import { formatVnd } from '../../utils/format';
import { PAGE_SIZE } from '../../utils/constants';
import { useTypography } from '../../hooks/useTypography';
import { Skeleton } from '../../components/Skeleton';
import { ErrorState } from '../../components/ErrorState';
import { EmptyState } from '../../components/EmptyState';
import { ProductImage } from '../../components/ProductImage';
import type { ProductsScreenProps } from '../../types/navigation';

export function ProductListScreen({ navigation }: ProductsScreenProps<'ProductList'>) {
  const { t } = useTranslation();
  const typo = useTypography();
  const insets = useSafeAreaInsets();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [allProducts, setAllProducts] = useState<ProductData[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const isLoadingMore = useRef(false);
  const canLoadMore = useRef(false);

  const { data: summary } = useQuery({
    queryKey: ['products-summary'],
    queryFn: () => productApi.summary().then((r) => r.data.data),
    staleTime: 60_000,
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryApi.list().then((r) => r.data.data),
    staleTime: 5 * 60_000,
  });

  const { data: productsPage, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ['products', search, selectedCategory, page],
    queryFn: async () => {
      const res = search
        ? await productApi.search({ keyword: search, page, size: PAGE_SIZE })
        : await productApi.list({ categoryId: selectedCategory ?? undefined, page, size: PAGE_SIZE });
      return res.data.data;
    },
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
  });

  // Sync allProducts from query result — using useEffect avoids the anti-pattern
  // of side-effects inside queryFn, and correctly handles warm-cache remounts where
  // queryFn never runs but productsPage is immediately available.
  useEffect(() => {
    if (!productsPage) return;
    if (page === 0) {
      setAllProducts(productsPage.content);
    } else {
      setAllProducts((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        const newItems = productsPage.content.filter((item) => !existingIds.has(item.id));
        return [...prev, ...newItems];
      });
    }
  }, [productsPage, page]);

  const hasMore = productsPage ? page < productsPage.totalPages - 1 : false;

  useEffect(() => {
    if (!isFetching) isLoadingMore.current = false;
  }, [isFetching]);

  useEffect(() => {
    canLoadMore.current = false;
    const timer = setTimeout(() => { canLoadMore.current = true; }, 400);
    return () => clearTimeout(timer);
  }, [search, selectedCategory]);

  const commitSearch = useCallback(() => {
    setSearch(searchInput);
    setPage(0);
  }, [searchInput]);

  const handleCategoryChange = useCallback((id: string | null) => {
    setSelectedCategory(id);
    setPage(0);
  }, []);

  const handleEndReached = useCallback(() => {
    if (!canLoadMore.current || !hasMore || isFetching || isLoadingMore.current) return;
    isLoadingMore.current = true;
    setPage((p) => p + 1);
  }, [hasMore, isFetching]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setPage(0);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  // categoryId → emoji lookup (built from already-loaded categories)
  const categoryEmojiMap = useMemo(() => {
    const map = new Map<string, string>();
    categories?.forEach((c) => { if (c.emoji) map.set(c.id, c.emoji); });
    return map;
  }, [categories]);

  const fmtDuration = useCallback((min: number) => {
    if (min <= 0) return '';
    if (min < 60) return `${min}p`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m > 0 ? `${h}h${m}p` : `${h}h`;
  }, []);

  const renderProduct = useCallback(({ item }: { item: ProductData }) => {
    // Low stock: in stock but quantity ≤ 5 (matches backend reorderLevel heuristic for display)
    const isLowStock = item.inStock === true && item.stockQuantity !== null && item.stockQuantity <= 5;
    const catEmoji = item.categoryIds?.[0] ? categoryEmojiMap.get(item.categoryIds[0]) : undefined;

    return (
      <TouchableOpacity
        testID={`product-card-${item.id}`}
        className="flex-1 bg-white dark:bg-gray-800 m-1.5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm active:opacity-80 overflow-hidden"
        onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
      >
        {/* Thumbnail */}
        <ProductImage uri={item.imageUrl} style={{ width: '100%', height: 112 }} iconSize={32} />

        {/* Info */}
        <View className="p-3">

          {/* Name */}
          <Text className={`${typo.label} text-gray-800 dark:text-white`} numberOfLines={2}>
            {item.name}
          </Text>

          {/* Description — 1 subtle line */}
          {item.description ? (
            <Text className={`${typo.caption} text-gray-400 dark:text-gray-500 mt-0.5`} numberOfLines={1}>
              {item.description}
            </Text>
          ) : null}

          {/* Category (with emoji) + Product type badge */}
          <View className="flex-row flex-wrap items-center gap-1 mt-1">
            {item.categoryNames?.[0] ? (
              <Text className={`${typo.caption} text-gray-400 dark:text-gray-500`} numberOfLines={1}>
                {catEmoji ? `${catEmoji} ` : ''}{item.categoryNames[0]}
              </Text>
            ) : null}
            {item.productTypeName ? (
              <View className="bg-gray-100 dark:bg-gray-700 rounded-full px-1.5 py-0.5">
                <Text className={`${typo.caption} text-gray-500 dark:text-gray-400`} numberOfLines={1}>
                  {item.productTypeName}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Price row + duration / commission badges */}
          <View className="mt-1.5 flex-row items-end justify-between">
            <View className="flex-1 mr-1">
              {item.dynamicPrice ? (
                <Text className={`${typo.captionBold} text-amber-600`}>{t('products.goldPrice')}</Text>
              ) : (
                <Text className={`${typo.labelBold} text-indigo-600 dark:text-indigo-400`} numberOfLines={1}>
                  {formatVnd(item.price)}
                </Text>
              )}
              <Text className={`${typo.caption} text-gray-400 mt-0.5`}>{item.unit}</Text>
            </View>

            {/* Duration & Commission stacked on right */}
            <View className="items-end gap-1">
              {item.durationMinutes > 0 && (
                <View className="flex-row items-center gap-0.5 bg-blue-50 dark:bg-blue-900/20 rounded-full px-1.5 py-0.5">
                  <MaterialCommunityIcons name="clock-outline" size={10} color="#3b82f6" />
                  <Text className={`${typo.caption} text-blue-600 dark:text-blue-400`}>
                    {fmtDuration(item.durationMinutes)}
                  </Text>
                </View>
              )}
              {item.commissionRate != null && item.commissionRate > 0 && (
                <View className="flex-row items-center gap-0.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-full px-1.5 py-0.5">
                  <MaterialCommunityIcons name="percent" size={10} color="#059669" />
                  <Text className={`${typo.caption} text-emerald-600 dark:text-emerald-400`}>
                    {item.commissionRate}%
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Stock badge — green / amber low / red out */}
          {item.stockQuantity != null && (
            <View className={`mt-2 self-start flex-row items-center gap-0.5 px-2 py-0.5 rounded-full ${
              !item.inStock
                ? 'bg-red-50 dark:bg-red-900/20'
                : isLowStock
                ? 'bg-amber-50 dark:bg-amber-900/20'
                : 'bg-green-50 dark:bg-green-900/20'
            }`}>
              <MaterialCommunityIcons
                name={!item.inStock ? 'close-circle-outline' : isLowStock ? 'alert-circle-outline' : 'check-circle-outline'}
                size={11}
                color={!item.inStock ? '#ef4444' : isLowStock ? '#d97706' : '#16a34a'}
              />
              <Text className={`${typo.caption} font-medium ${
                !item.inStock ? 'text-red-500 dark:text-red-400'
                : isLowStock ? 'text-amber-600 dark:text-amber-400'
                : 'text-green-600 dark:text-green-400'
              }`}>
                {!item.inStock
                  ? t('products.outOfStock')
                  : isLowStock
                  ? t('products.lowStock')
                  : t('products.inStock')}
                {` (${item.stockQuantity})`}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  }, [navigation, t, typo, categoryEmojiMap, fmtDuration]);

  if (isError) return <ErrorState onRetry={refetch} />;

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 pt-3 pb-3">
        <View className="flex-row items-center mb-1">
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} className="mr-2">
            <MaterialCommunityIcons name="chevron-left" size={26} color="#4f46e5" />
          </TouchableOpacity>
          <Text className={`${typo.heading} text-gray-900 dark:text-white flex-1`}>{t('products.title')}</Text>
          <TouchableOpacity onPress={() => navigation.navigate('ProductCreate')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialCommunityIcons name="plus" size={24} color="#4f46e5" />
          </TouchableOpacity>
        </View>
        <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 mt-0.5 mb-3`}>{t('products.hint')}</Text>

        {/* Summary row */}
        {summary && (
          <View className="flex-row gap-3 mb-3">
            {([
              { key: 'totalProducts', value: summary.total, color: 'text-gray-900' },
              { key: 'lowStock',      value: summary.lowStock, color: 'text-amber-600' },
              { key: 'outOfStock',    value: summary.outOfStock, color: 'text-red-600' },
            ] as const).map((stat) => (
              <View key={stat.key} className="flex-1 bg-gray-50 rounded-xl p-3 items-center">
                <Text className={`${typo.section} font-bold ${stat.color}`}>{stat.value}</Text>
                <Text className={`${typo.caption} text-gray-500 text-center mt-0.5`}>{t(`products.${stat.key}`)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Search */}
        <View className="flex-row items-center gap-2 mb-3">
          <View className="flex-1 flex-row items-center bg-gray-100 dark:bg-gray-700 rounded-xl px-3 py-2.5">
            <MaterialCommunityIcons name="magnify" size={20} color="#9ca3af" />
            <TextInput
              testID="product-search-input"
              className={`flex-1 ml-2 ${typo.inputSize} text-gray-800 dark:text-white`}
              placeholder={t('products.searchPlaceholder')}
              placeholderTextColor="#9ca3af"
              value={searchInput}
              onChangeText={setSearchInput}
              returnKeyType="search"
              onSubmitEditing={commitSearch}
            />
            {searchInput.length > 0 && (
              <TouchableOpacity
                onPress={() => { setSearchInput(''); setSearch(''); setPage(0); }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MaterialCommunityIcons name="close-circle" size={18} color="#9ca3af" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            onPress={commitSearch}
            className="bg-indigo-600 rounded-xl px-4 py-2.5 items-center justify-center"
            activeOpacity={0.8}
          >
            <Text className={`${typo.label} text-white`}>{t('products.searchButton')}</Text>
          </TouchableOpacity>
        </View>

        {/* Category chips */}
        {categories && categories.length > 0 && (
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={[{ id: null, name: t('products.allCategories'), productCount: summary?.total ?? null, emoji: '' }, ...categories]}
            keyExtractor={(item) => item.id ?? '__all__'}
            contentContainerStyle={{ gap: 8 }}
            renderItem={({ item }) => {
              const active = selectedCategory === item.id;
              return (
                <TouchableOpacity
                  className={`flex-row items-center gap-1 px-3 py-1.5 rounded-full border ${
                    active
                      ? 'bg-indigo-600 border-indigo-600'
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600'
                  }`}
                  onPress={() => handleCategoryChange(active ? null : (item.id ?? null))}
                >
                  <Text className={`${typo.caption} font-medium ${active ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                    {item.emoji ? `${item.emoji} ` : ''}{item.name}
                  </Text>
                  {item.productCount != null && item.productCount > 0 && (
                    <View className={`rounded-full px-1.5 min-w-[18px] items-center ${active ? 'bg-white/20' : 'bg-indigo-50 dark:bg-indigo-900/30'}`}>
                      <Text className={`${typo.caption} font-bold ${active ? 'text-white' : 'text-indigo-600 dark:text-indigo-400'}`}>
                        {item.productCount}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            }}
          />
        )}
      </View>

      {/* Product grid */}
      {isLoading && page === 0 ? (
        <View className="flex-row flex-wrap p-3">
          {[0, 1, 2, 3].map((i) => (
            <View key={i} className="w-1/2 p-1.5">
              <Skeleton height={130} borderRadius={16} />
            </View>
          ))}
        </View>
      ) : !allProducts.length ? (
        <EmptyState icon="📦" title={t('products.noProducts')} description={t('products.noProductsHint')} />
      ) : (
        <FlatList
          showsVerticalScrollIndicator={false}
          data={allProducts}
          keyExtractor={(item) => item.id}
          renderItem={renderProduct}
          numColumns={2}
          contentContainerStyle={{ padding: 4, paddingBottom: insets.bottom + 80 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#059669" />
          }
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            isFetching && page > 0 ? (
              <View className="py-4 items-center" style={{ width: '100%' }}>
                <ActivityIndicator size="small" color="#4f46e5" />
              </View>
            ) : null
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        testID="product-add-fab"
        onPress={() => navigation.navigate('ProductCreate')}
        className="absolute right-5 bg-indigo-600 rounded-full w-14 h-14 items-center justify-center shadow-lg"
        style={{ bottom: insets.bottom + 16 }}
      >
        <MaterialCommunityIcons name="plus" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}
