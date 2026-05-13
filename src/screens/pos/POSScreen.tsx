import { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { productApi, categoryApi, type ProductData } from '../../services/api';
import { PAGE_SIZE } from '../../utils/constants';
import { useCartStore } from '../../store/cartStore';
import { formatVnd } from '../../utils/format';
import { MoneyInput } from '../../components/MoneyInput';
import { ErrorState } from '../../components/ErrorState';
import { EmptyState } from '../../components/EmptyState';
import { Skeleton } from '../../components/Skeleton';
import type { POSScreenProps } from '../../types/navigation';

export function POSScreen({ navigation }: POSScreenProps<'POSMain'>) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [allProducts, setAllProducts] = useState<ProductData[]>([]);
  const isLoadingMore = useRef(false);
  const canLoadMore = useRef(false);
  const { items, addItem, updatePrice } = useCartStore();
  const cartCount = items.reduce((s, i) => s + i.quantity, 0);

  const [sheetProduct, setSheetProduct] = useState<ProductData | null>(null);
  const [sheetPrice, setSheetPrice] = useState('');
  const [sheetQty, setSheetQty] = useState(1);

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryApi.list().then((r) => r.data.data),
    staleTime: 5 * 60_000,
  });

  const {
    data: productsPage,
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useQuery({
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

  const commitSearch = () => {
    setSearch(searchInput);
    setPage(0);
  };

  const handleCategoryChange = (id: string | null) => {
    setSelectedCategory(id);
    setPage(0);
  };

  useEffect(() => {
    if (!isFetching) isLoadingMore.current = false;
  }, [isFetching]);

  useEffect(() => {
    canLoadMore.current = false;
    const t = setTimeout(() => { canLoadMore.current = true; }, 400);
    return () => clearTimeout(t);
  }, [search, selectedCategory]);

  const handleEndReached = () => {
    if (!canLoadMore.current || !hasMore || isFetching || isLoadingMore.current) return;
    isLoadingMore.current = true;
    setPage((p) => p + 1);
  };

  const openSheet = useCallback((product: ProductData) => {
    setSheetProduct(product);
    setSheetPrice(String(product.price || ''));
    setSheetQty(1);
  }, []);

  const handleConfirmAdd = useCallback(() => {
    if (!sheetProduct) return;
    const price = parseInt(sheetPrice, 10) || 0;
    const existing = items.find((i) => i.productId === sheetProduct.id);
    if (existing) {
      updatePrice(sheetProduct.id, price);
      const { updateQty } = useCartStore.getState();
      updateQty(sheetProduct.id, existing.quantity + sheetQty);
    } else {
      addItem({
        productId: sheetProduct.id,
        name: sheetProduct.name,
        price,
        quantity: sheetQty,
        unit: sheetProduct.unit,
      });
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSheetProduct(null);
  }, [sheetProduct, sheetPrice, sheetQty, items, addItem, updatePrice]);

  const renderProduct = ({ item }: { item: ProductData }) => (
    <TouchableOpacity
      testID={`pos-product-${item.name}`}
      className="flex-1 bg-white dark:bg-gray-800 m-1.5 rounded-2xl p-3 border border-gray-100 dark:border-gray-700 active:opacity-80"
      onPress={() => openSheet(item)}
    >
      <Text className="font-semibold text-gray-800 dark:text-white text-sm" numberOfLines={2}>
        {item.name}
      </Text>
      <Text className="text-xs text-gray-400 dark:text-gray-500 mt-1">{item.unit}</Text>
      <View className="flex-row justify-between items-center mt-2">
        {item.dynamicPrice ? (
          <Text className="text-xs font-semibold text-warning">{t('pos.goldPrice')}</Text>
        ) : (
          <Text className="text-sm font-bold text-indigo-600">{formatVnd(item.price)}</Text>
        )}
        <MaterialCommunityIcons name="plus-circle" size={22} color="#4f46e5" />
      </View>
    </TouchableOpacity>
  );

  if (isError) return <ErrorState onRetry={refetch} />;

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <View
        className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4"
        style={{ paddingTop: insets.top + 12, paddingBottom: 0 }}
      >
        {/* Title row */}
        <View className="flex-row items-center justify-between mb-0.5">
          <Text className="text-xl font-bold text-gray-900 dark:text-white">{t('selling.title')}</Text>
          <View className="flex-row items-center gap-3">
<TouchableOpacity
              testID="pos-order-list-btn"
              className="bg-gray-100 dark:bg-gray-700 rounded-xl p-2.5 active:opacity-80"
              onPress={() => navigation.navigate('OrderList')}
            >
              <MaterialCommunityIcons name="clipboard-list-outline" size={22} color="#374151" />
            </TouchableOpacity>
            <View className="relative">
              <TouchableOpacity
                testID="pos-cart-btn"
                className="bg-indigo-600 rounded-xl p-2.5 active:opacity-80"
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
        </View>

        {/* Hint */}
        <Text className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 mb-3">{t('selling.hint')}</Text>

        {/* Search bar */}
        <View className="flex-row items-center gap-2 mb-3">
          <View className="flex-1 flex-row items-center bg-gray-100 dark:bg-gray-700 rounded-xl px-3 py-2.5">
            <MaterialCommunityIcons name="magnify" size={20} color="#9ca3af" />
            <TextInput
              className="flex-1 ml-2 text-base text-gray-800 dark:text-white"
              placeholder={t('pos.searchPlaceholder')}
              placeholderTextColor="#9ca3af"
              value={searchInput}
              onChangeText={setSearchInput}
              returnKeyType="search"
              onSubmitEditing={commitSearch}
            />
            {searchInput.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setSearchInput('');
                  setSearch('');
                  setPage(0);
                }}
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
            <Text className="text-white font-semibold text-sm">{t('pos.searchButton')}</Text>
          </TouchableOpacity>
        </View>

        {/* Category chips */}
        {categories && categories.length > 0 && (
          <FlatList
            className="mb-3"
            horizontal
            showsHorizontalScrollIndicator={false}
            data={[{ id: null, name: t('pos.allCategories') }, ...categories]}
            keyExtractor={(item) => item.id ?? '__all__'}
            contentContainerStyle={{ gap: 8 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                className={`px-4 py-1.5 rounded-full border ${
                  selectedCategory === item.id
                    ? 'bg-indigo-600 border-indigo-600'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600'
                }`}
                onPress={() => handleCategoryChange(item.id ?? null)}
              >
                <Text
                  className={`text-sm font-medium ${
                    selectedCategory === item.id ? 'text-white' : 'text-gray-600 dark:text-gray-400'
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
      {isLoading && page === 0 ? (
        <View className="flex-row flex-wrap p-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <View key={i} className="w-1/2 p-1.5">
              <Skeleton height={110} borderRadius={16} />
            </View>
          ))}
        </View>
      ) : !allProducts.length ? (
        <EmptyState icon="📦" title={t('pos.noProducts')} />
      ) : (
        <FlatList
          data={allProducts}
          keyExtractor={(item) => item.id}
          renderItem={renderProduct}
          numColumns={2}
          contentContainerStyle={{ padding: 6 }}
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

      {/* Add-to-cart sheet */}
      <Modal
        visible={!!sheetProduct}
        transparent
        animationType="slide"
        onRequestClose={() => setSheetProduct(null)}
      >
        <TouchableOpacity
          className="flex-1 bg-black/40"
          activeOpacity={1}
          onPress={() => setSheetProduct(null)}
        />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View
            className="bg-white dark:bg-gray-800 rounded-t-3xl px-6 pt-5"
            style={{ paddingBottom: insets.bottom + 24 }}
          >
            <View className="w-10 h-1 bg-gray-200 dark:bg-gray-600 rounded-full self-center mb-4" />

            <Text className="text-lg font-bold text-gray-900 dark:text-white mb-5" numberOfLines={2}>
              {sheetProduct?.name}
            </Text>

            <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1.5">{t('pos.price')}</Text>
            <MoneyInput
              rawValue={sheetPrice}
              onChangeRaw={setSheetPrice}
              className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 text-xl font-bold text-gray-900 dark:text-white mb-5"
            />

            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400">{t('pos.quantity')}</Text>
              <View className="flex-row items-center gap-4">
                <TouchableOpacity
                  className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 items-center justify-center active:opacity-70"
                  onPress={() => setSheetQty((q) => Math.max(1, q - 1))}
                >
                  <MaterialCommunityIcons name="minus" size={18} color="#374151" />
                </TouchableOpacity>
                <Text className="text-xl font-bold text-gray-900 dark:text-white w-8 text-center">{sheetQty}</Text>
                <TouchableOpacity
                  className="w-10 h-10 rounded-full bg-indigo-600 items-center justify-center active:opacity-70"
                  onPress={() => setSheetQty((q) => q + 1)}
                >
                  <MaterialCommunityIcons name="plus" size={18} color="white" />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              className="bg-indigo-600 rounded-2xl py-4 items-center active:opacity-80"
              onPress={handleConfirmAdd}
            >
              <Text className="text-white font-bold text-lg">{t('pos.addToCart')}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
