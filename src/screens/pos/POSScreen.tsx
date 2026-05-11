import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { productApi, categoryApi, type ProductData } from '../../services/api';
import { useCartStore } from '../../store/cartStore';
import { formatVnd } from '../../utils/format';
import { ErrorState } from '../../components/ErrorState';
import { EmptyState } from '../../components/EmptyState';
import { Skeleton } from '../../components/Skeleton';
import type { POSScreenProps } from '../../types/navigation';

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function POSScreen({ navigation }: POSScreenProps<'POSMain'>) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const debouncedSearch = useDebounce(search, 300);
  const { items, addItem } = useCartStore();
  const cartCount = items.reduce((s, i) => s + i.quantity, 0);

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryApi.list().then((r) => r.data.data),
    staleTime: 5 * 60_000,
  });

  const {
    data: productsData,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['products', debouncedSearch, selectedCategory],
    queryFn: () =>
      productApi
        .list({ search: debouncedSearch || undefined, categoryId: selectedCategory ?? undefined })
        .then((r) => r.data.data.content),
  });

  const handleAddToCart = useCallback(
    (product: ProductData) => {
      addItem({
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
        unit: product.unit,
      });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    [addItem],
  );

  const renderProduct = ({ item }: { item: ProductData }) => (
    <TouchableOpacity
      testID={`pos-product-${item.name}`}
      className="flex-1 bg-white m-1.5 rounded-2xl p-3 border border-gray-100 shadow-sm active:opacity-80"
      onPress={() => handleAddToCart(item)}
    >
      <Text className="font-semibold text-gray-800 text-sm" numberOfLines={2}>
        {item.name}
      </Text>
      <Text className="text-xs text-gray-400 mt-1">{item.unit}</Text>
      <View className="flex-row justify-between items-center mt-2">
        {item.dynamicPrice ? (
          <Text className="text-xs font-semibold text-warning">{t('pos.goldPrice')}</Text>
        ) : (
          <Text className="text-sm font-bold text-primary">{formatVnd(item.price)}</Text>
        )}
        <MaterialCommunityIcons name="plus-circle" size={22} color="#4f46e5" />
      </View>
    </TouchableOpacity>
  );

  if (isError) return <ErrorState onRetry={refetch} />;

  return (
    <View className="flex-1 bg-gray-50" style={{ paddingTop: insets.top }}>
      {/* Header bar */}
      <View className="bg-white px-4 pb-3 pt-3 shadow-sm">
        <View className="flex-row items-center gap-3">
          <View className="flex-1 flex-row items-center bg-gray-100 rounded-xl px-3 py-2.5">
            <MaterialCommunityIcons name="magnify" size={20} color="#9ca3af" />
            <TextInput
              className="flex-1 ml-2 text-base text-gray-800"
              placeholder={t('pos.searchPlaceholder')}
              placeholderTextColor="#9ca3af"
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <MaterialCommunityIcons name="close-circle" size={18} color="#9ca3af" />
              </TouchableOpacity>
            )}
          </View>

          {/* Order history button */}
          <TouchableOpacity
            testID="pos-order-list-btn"
            className="bg-gray-100 rounded-xl p-2.5 active:opacity-80"
            onPress={() => navigation.navigate('OrderList')}
          >
            <MaterialCommunityIcons name="clipboard-list-outline" size={22} color="#374151" />
          </TouchableOpacity>

          {/* Cart button — badge is outside the TouchableOpacity so its text is independently accessible */}
          <View className="relative">
            <TouchableOpacity
              testID="pos-cart-btn"
              className="bg-primary rounded-xl p-2.5 active:opacity-80"
              onPress={() => navigation.navigate('Cart')}
            >
              <MaterialCommunityIcons name="cart-outline" size={22} color="#fff" />
            </TouchableOpacity>
            {cartCount > 0 && (
              <View
                className="absolute -top-1 -right-1 bg-red-500 rounded-full w-5 h-5 items-center justify-center"
                pointerEvents="none"
              >
                <Text testID="pos-cart-count" className="text-white text-xs font-bold">
                  {cartCount > 99 ? '99+' : cartCount}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Category chips */}
        {categories && categories.length > 0 && (
          <FlatList
            className="mt-3"
            horizontal
            showsHorizontalScrollIndicator={false}
            data={[{ id: null, name: t('pos.allCategories') }, ...categories]}
            keyExtractor={(item) => item.id ?? '__all__'}
            renderItem={({ item }) => (
              <TouchableOpacity
                className={`mr-2 px-4 py-1.5 rounded-full border ${
                  selectedCategory === item.id
                    ? 'bg-primary border-primary'
                    : 'bg-white border-gray-200'
                }`}
                onPress={() => setSelectedCategory(item.id ?? null)}
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

      {/* Product grid */}
      {isLoading ? (
        <View className="flex-row flex-wrap p-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <View key={i} className="w-1/2 p-1.5">
              <Skeleton height={110} borderRadius={16} />
            </View>
          ))}
        </View>
      ) : !productsData?.length ? (
        <EmptyState icon="📦" title={t('pos.noProducts')} />
      ) : (
        <FlatList
          data={productsData}
          keyExtractor={(item) => item.id}
          renderItem={renderProduct}
          numColumns={2}
          contentContainerStyle={{ padding: 6 }}
        />
      )}
    </View>
  );
}
