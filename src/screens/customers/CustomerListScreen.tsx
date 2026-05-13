import { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { customerApi, type CustomerData } from '../../services/api';
import { PAGE_SIZE } from '../../utils/constants';
import type { HomeScreenProps } from '../../types/navigation';

type Props = HomeScreenProps<'CustomerList'>;

function fmtVnd(n: number) {
  return n.toLocaleString('vi-VN') + ' ₫';
}

function CustomerCard({
  item,
  index,
  onPress,
}: {
  item: CustomerData;
  index: number;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  return (
    <TouchableOpacity
      testID={`customer-row-${index}`}
      onPress={onPress}
      activeOpacity={0.75}
      className="bg-white rounded-2xl p-4 mb-3 border border-gray-100"
    >
      <View className="flex-row items-center">
        <View className="w-11 h-11 rounded-full bg-indigo-50 items-center justify-center mr-3">
          <Text className="text-base font-bold text-indigo-600">
            {item.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View className="flex-1">
          <Text className="text-base font-semibold text-gray-900" numberOfLines={1}>
            {item.name}
          </Text>
          <Text className="text-sm text-gray-500">{item.phone}</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={20} color="#d1d5db" />
      </View>

      <View className="flex-row mt-3 pt-3 border-t border-gray-50" style={{ gap: 16 }}>
        <View className="flex-row items-center">
          <MaterialCommunityIcons name="shopping-outline" size={14} color="#9ca3af" style={{ marginRight: 4 }} />
          <Text className="text-xs text-gray-500">
            {item.totalOrders} {t('customers.orders')}
          </Text>
        </View>
        <View className="flex-row items-center">
          <MaterialCommunityIcons name="star-outline" size={14} color="#9ca3af" style={{ marginRight: 4 }} />
          <Text className="text-xs text-gray-500">
            {item.points} {t('customers.points')}
          </Text>
        </View>
        {item.totalSpend > 0 && (
          <View className="flex-row items-center flex-1 justify-end">
            <Text className="text-xs font-semibold text-indigo-600">
              {fmtVnd(item.totalSpend)}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

export function CustomerListScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { top, bottom } = useSafeAreaInsets();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [allItems, setAllItems] = useState<CustomerData[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const isLoadingMore = useRef(false);
  const canLoadMore = useRef(false);

  const { isLoading, isFetching, refetch, data } = useQuery({
    queryKey: ['customers', search, page],
    queryFn: async () => {
      const res = await customerApi.list({ search: search || undefined, page, size: PAGE_SIZE });
      const { content, totalPages } = res.data.data;
      if (page === 0) {
        setAllItems(content);
      } else {
        setAllItems((prev) => [...prev, ...content]);
      }
      return res.data.data;
    },
    staleTime: 2 * 60 * 1000,
  });

  const hasMore = data ? page < data.totalPages - 1 : false;

  useEffect(() => {
    if (!isFetching) isLoadingMore.current = false;
  }, [isFetching]);

  useEffect(() => {
    canLoadMore.current = false;
    const t = setTimeout(() => { canLoadMore.current = true; }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const commitSearch = () => {
    setSearch(searchInput);
    setPage(0);
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setPage(0);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleEndReached = () => {
    if (!canLoadMore.current || !hasMore || isFetching || isLoadingMore.current) return;
    isLoadingMore.current = true;
    setPage((p) => p + 1);
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View
        className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4"
        style={{ paddingTop: top + 12, paddingBottom: 12 }}
      >
        <View className="flex-row items-center mb-0.5">
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} className="mr-2">
            <MaterialCommunityIcons name="chevron-left" size={26} color="#4f46e5" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-900 dark:text-white flex-1">{t('customers.title')}</Text>
        </View>
        <Text className="text-xs text-gray-500 dark:text-gray-400 mb-3 mt-0.5">{t('customers.hint')}</Text>

        {/* Search */}
        <View className="flex-row items-center gap-2">
          <View className="flex-1 flex-row items-center bg-gray-100 dark:bg-gray-700 rounded-xl px-3 py-2.5">
            <MaterialCommunityIcons name="magnify" size={20} color="#9ca3af" />
            <TextInput
              testID="customer-search-input"
              className="flex-1 ml-2 text-base text-gray-800 dark:text-white"
              placeholder={t('customers.searchPlaceholder')}
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
            <Text className="text-white font-semibold text-sm">{t('customers.searchButton')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {isLoading && page === 0 ? (
        <View className="px-4 pt-4 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <View key={i} className="h-20 bg-gray-200 rounded-2xl animate-pulse" />
          ))}
        </View>
      ) : (
        <FlatList
          data={allItems}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: bottom + 80 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#4f46e5" />
          }
          renderItem={({ item, index }) => (
            <CustomerCard
              item={item}
              index={index}
              onPress={() => navigation.navigate('CustomerDetail', { customerId: item.id })}
            />
          )}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={
            !isLoading ? (
              <View className="items-center py-16">
                <MaterialCommunityIcons name="account-group-outline" size={48} color="#d1d5db" />
                <Text className="text-gray-400 font-semibold mt-3">{t('customers.noCustomers')}</Text>
                <Text className="text-gray-400 text-sm mt-1">{t('customers.noCustomersHint')}</Text>
              </View>
            ) : null
          }
          ListFooterComponent={
            isFetching && page > 0 ? (
              <View className="py-4 items-center">
                <ActivityIndicator size="small" color="#4f46e5" />
              </View>
            ) : null
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        testID="customer-add-fab"
        onPress={() => navigation.navigate('CustomerForm', {})}
        activeOpacity={0.85}
        className="absolute bottom-8 right-6 w-14 h-14 bg-indigo-600 rounded-full items-center justify-center"
        style={{ elevation: 6, shadowColor: '#4f46e5', shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } }}
      >
        <MaterialCommunityIcons name="plus" size={28} color="white" />
      </TouchableOpacity>
    </View>
  );
}
