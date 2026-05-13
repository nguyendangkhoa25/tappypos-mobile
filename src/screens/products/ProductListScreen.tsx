import { useState, useRef, useEffect } from 'react';
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
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { productApi, categoryApi, type ProductData, type ProductSummary } from '../../services/api';
import { formatVnd } from '../../utils/format';
import { PAGE_SIZE } from '../../utils/constants';
import { Skeleton } from '../../components/Skeleton';
import { ErrorState } from '../../components/ErrorState';
import { EmptyState } from '../../components/EmptyState';
import type { ProductsScreenProps } from '../../types/navigation';

export function ProductListScreen({ navigation }: ProductsScreenProps<'ProductList'>) {
  const { t } = useTranslation();
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
      const content = res.data.data.content;
      if (page === 0) {
        setAllProducts(content);
      } else {
        setAllProducts((prev) => [...prev, ...content]);
      }
      return res.data.data;
    },
  });

  const hasMore = productsPage ? page < productsPage.totalPages - 1 : false;

  useEffect(() => {
    if (!isFetching) isLoadingMore.current = false;
  }, [isFetching]);

  useEffect(() => {
    canLoadMore.current = false;
    const t = setTimeout(() => { canLoadMore.current = true; }, 400);
    return () => clearTimeout(t);
  }, [search, selectedCategory]);

  const commitSearch = () => {
    setSearch(searchInput);
    setPage(0);
  };

  const handleCategoryChange = (id: string | null) => {
    setSelectedCategory(id);
    setPage(0);
  };

  const handleEndReached = () => {
    if (!canLoadMore.current || !hasMore || isFetching || isLoadingMore.current) return;
    isLoadingMore.current = true;
    setPage((p) => p + 1);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    setPage(0);
    await refetch();
    setRefreshing(false);
  };

  const renderProduct = ({ item }: { item: ProductData }) => (
    <TouchableOpacity
      className="flex-1 bg-white m-1.5 rounded-2xl p-4 border border-gray-100 shadow-sm active:opacity-80"
      onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
    >
      <Text className="font-semibold text-gray-800 text-sm" numberOfLines={2}>
        {item.name}
      </Text>
      <Text className="text-xs text-gray-400 mt-1">{item.categoryNames?.[0] ?? '—'}</Text>
      <View className="mt-2">
        {item.dynamicPrice ? (
          <Text className="text-xs font-bold text-amber-600">{t('products.goldPrice')}</Text>
        ) : (
          <Text className="text-sm font-bold text-indigo-600">{formatVnd(item.price)}</Text>
        )}
        <Text className="text-xs text-gray-400 mt-0.5">{item.unit}</Text>
      </View>
      {item.stockQuantity != null && (
        <View
          className={`mt-2 self-start px-2 py-0.5 rounded-full ${item.inStock ? 'bg-green-50' : 'bg-red-50'}`}
        >
          <Text className={`text-xs font-medium ${item.inStock ? 'text-green-600' : 'text-red-500'}`}>
            {item.inStock ? t('products.inStock') : t('products.outOfStock')}
            {item.stockQuantity != null && ` (${item.stockQuantity})`}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  if (isError) return <ErrorState onRetry={refetch} />;

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 pt-3 pb-3">
        <View className="flex-row items-center mb-1">
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} className="mr-2">
            <MaterialCommunityIcons name="chevron-left" size={26} color="#4f46e5" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-900 dark:text-white flex-1">{t('products.title')}</Text>
        </View>
        <Text className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 mb-3">{t('products.hint')}</Text>

        {/* Summary row */}
        {summary && (
          <View className="flex-row gap-3 mb-3">
            {([
              { key: 'totalProducts', value: summary.total, color: 'text-gray-900' },
              { key: 'lowStock',      value: summary.lowStock, color: 'text-amber-600' },
              { key: 'outOfStock',    value: summary.outOfStock, color: 'text-red-600' },
            ] as const).map((stat) => (
              <View key={stat.key} className="flex-1 bg-gray-50 rounded-xl p-3 items-center">
                <Text className={`text-xl font-bold ${stat.color}`}>{stat.value}</Text>
                <Text className="text-xs text-gray-500 text-center mt-0.5">{t(`products.${stat.key}`)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Search */}
        <View className="flex-row items-center gap-2 mb-3">
          <View className="flex-1 flex-row items-center bg-gray-100 dark:bg-gray-700 rounded-xl px-3 py-2.5">
            <MaterialCommunityIcons name="magnify" size={20} color="#9ca3af" />
            <TextInput
              className="flex-1 ml-2 text-base text-gray-800 dark:text-white"
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
            <Text className="text-white font-semibold text-sm">{t('products.searchButton')}</Text>
          </TouchableOpacity>
        </View>

        {/* Category chips */}
        {categories && categories.length > 0 && (
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={[{ id: null, name: t('products.allCategories') }, ...categories]}
            keyExtractor={(item) => item.id ?? '__all__'}
            contentContainerStyle={{ gap: 8 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                className={`px-4 py-1.5 rounded-full border ${
                  selectedCategory === item.id
                    ? 'bg-indigo-600 border-indigo-600'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600'
                }`}
                onPress={() => handleCategoryChange(selectedCategory === item.id ? null : (item.id ?? null))}
              >
                <Text className={`text-sm font-medium ${selectedCategory === item.id ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            )}
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
          data={allProducts}
          keyExtractor={(item) => item.id}
          renderItem={renderProduct}
          numColumns={2}
          contentContainerStyle={{ padding: 6, paddingBottom: insets.bottom + 80 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4f46e5" />
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
        onPress={() => navigation.navigate('ProductCreate')}
        className="absolute right-5 bg-indigo-600 rounded-full w-14 h-14 items-center justify-center shadow-lg"
        style={{ bottom: insets.bottom + 16 }}
      >
        <MaterialCommunityIcons name="plus" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}
