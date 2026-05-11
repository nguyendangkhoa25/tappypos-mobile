import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { productApi, categoryApi, type ProductData } from '../../services/api';
import { formatVnd } from '../../utils/format';
import { Skeleton } from '../../components/Skeleton';
import { ErrorState } from '../../components/ErrorState';
import { EmptyState } from '../../components/EmptyState';
import type { ProductsScreenProps } from '../../types/navigation';

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function ProductListScreen({ navigation }: ProductsScreenProps<'ProductList'>) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const debouncedSearch = useDebounce(search, 300);

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryApi.list().then((r) => r.data.data),
    staleTime: 5 * 60_000,
  });

  const { data: products, isLoading, isError, refetch } = useQuery({
    queryKey: ['products', debouncedSearch, selectedCategory],
    queryFn: () =>
      productApi
        .list({ search: debouncedSearch || undefined, categoryId: selectedCategory ?? undefined })
        .then((r) => r.data.data.content),
  });

  const onRefresh = async () => {
    setRefreshing(true);
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

      <Text className="text-xs text-gray-400 mt-1">{item.categoryName ?? '—'}</Text>

      <View className="mt-2">
        {item.dynamicPrice ? (
          <Text className="text-xs font-bold text-warning">{t('products.goldPrice')}</Text>
        ) : (
          <Text className="text-sm font-bold text-primary">{formatVnd(item.price)}</Text>
        )}
        <Text className="text-xs text-gray-400 mt-0.5">{item.unit}</Text>
      </View>

      {item.stockQuantity !== null && (
        <View
          className={`mt-2 self-start px-2 py-0.5 rounded-full ${
            item.inStock ? 'bg-green-50' : 'bg-red-50'
          }`}
        >
          <Text
            className={`text-xs font-medium ${item.inStock ? 'text-primary' : 'text-danger'}`}
          >
            {item.inStock ? t('products.inStock') : t('products.outOfStock')}
            {item.stockQuantity != null && ` (${item.stockQuantity})`}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  if (isError) return <ErrorState onRetry={refetch} />;

  return (
    <View className="flex-1 bg-gray-50" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="bg-white px-4 pt-3 pb-3 shadow-sm">
        <Text className="text-2xl font-bold text-gray-900 mb-3">{t('products.title')}</Text>

        <View className="flex-row items-center bg-gray-100 rounded-xl px-3 py-2.5 mb-3">
          <MaterialCommunityIcons name="magnify" size={20} color="#9ca3af" />
          <TextInput
            className="flex-1 ml-2 text-base text-gray-800"
            placeholder={t('products.searchPlaceholder')}
            placeholderTextColor="#9ca3af"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <MaterialCommunityIcons name="close-circle" size={18} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>

        {categories && categories.length > 0 && (
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={[{ id: null, name: t('products.allCategories') }, ...categories]}
            keyExtractor={(item) => item.id ?? '__all__'}
            renderItem={({ item }) => (
              <TouchableOpacity
                className={`mr-2 px-4 py-1.5 rounded-full border ${
                  selectedCategory === item.id
                    ? 'bg-primary border-primary'
                    : 'bg-white border-gray-200'
                }`}
                onPress={() => setSelectedCategory(selectedCategory === item.id ? null : (item.id ?? null))}
              >
                <Text
                  className={`text-sm font-medium ${
                    selectedCategory === item.id ? 'text-white' : 'text-gray-600'
                  }`}
                >
                  {item.name}
                </Text>
              </TouchableOpacity>
            )}
          />
        )}
      </View>

      {isLoading ? (
        <View className="flex-row flex-wrap p-3">
          {[0, 1, 2, 3].map((i) => (
            <View key={i} className="w-1/2 p-1.5">
              <Skeleton height={130} borderRadius={16} />
            </View>
          ))}
        </View>
      ) : !products?.length ? (
        <EmptyState
          icon="📦"
          title={t('products.noProducts')}
          description={t('products.noProductsHint')}
        />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          renderItem={renderProduct}
          numColumns={2}
          contentContainerStyle={{ padding: 6, paddingBottom: insets.bottom + 16 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4f46e5" />
          }
        />
      )}
    </View>
  );
}
