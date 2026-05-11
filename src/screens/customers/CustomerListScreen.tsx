import { useState, useCallback } from 'react';
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
import type { HomeScreenProps } from '../../types/navigation';

type Props = HomeScreenProps<'CustomerList'>;

function fmtVnd(n: number) {
  return n.toLocaleString('vi-VN') + ' ₫';
}

function CustomerCard({
  item,
  onPress,
}: {
  item: CustomerData;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      className="bg-white rounded-2xl p-4 mb-3 border border-gray-100"
    >
      <View className="flex-row items-center">
        <View className="w-11 h-11 rounded-full bg-primary-light items-center justify-center mr-3">
          <Text className="text-base font-bold text-primary">
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
            <Text className="text-xs font-semibold text-primary">
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
  const { top } = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [allItems, setAllItems] = useState<CustomerData[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const { isLoading, refetch } = useQuery({
    queryKey: ['customers', search, page],
    queryFn: async () => {
      const res = await customerApi.list({ search: search || undefined, page, size: 30 });
      const { content, totalPages } = res.data.data;
      if (page === 0) {
        setAllItems(content);
      } else {
        setAllItems((prev) => [...prev, ...content]);
      }
      setHasMore(page < totalPages - 1);
      return res.data.data;
    },
    staleTime: 2 * 60 * 1000,
  });

  const handleSearch = useCallback((text: string) => {
    setSearch(text);
    setPage(0);
    setAllItems([]);
    setHasMore(true);
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setPage(0);
    setAllItems([]);
    setHasMore(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleLoadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      setPage((p) => p + 1);
    }
  }, [isLoading, hasMore]);

  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-primary px-6 pb-4" style={{ paddingTop: top + 16 }}>
        <View className="flex-row items-center justify-between mb-4">
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="white" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-white">{t('customers.title')}</Text>
          <View style={{ width: 24 }} />
        </View>
        <View className="flex-row items-center bg-white/15 rounded-xl px-3 py-2.5">
          <MaterialCommunityIcons name="magnify" size={18} color="rgba(255,255,255,0.7)" style={{ marginRight: 8 }} />
          <TextInput
            className="flex-1 text-white text-sm"
            placeholder={t('customers.searchPlaceholder')}
            placeholderTextColor="rgba(255,255,255,0.6)"
            value={search}
            onChangeText={handleSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <MaterialCommunityIcons name="close-circle" size={16} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={allItems}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#4f46e5" />
        }
        renderItem={({ item }) => (
          <CustomerCard
            item={item}
            onPress={() => navigation.navigate('CustomerDetail', { customerId: item.id })}
          />
        )}
        onEndReached={handleLoadMore}
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
          isLoading ? (
            <View className="py-4 items-center">
              <ActivityIndicator color="#4f46e5" />
            </View>
          ) : hasMore && allItems.length > 0 ? (
            <TouchableOpacity onPress={handleLoadMore} className="py-3 items-center">
              <Text className="text-sm text-primary font-semibold">{t('customers.loadMore')}</Text>
            </TouchableOpacity>
          ) : null
        }
      />

      {/* FAB */}
      <TouchableOpacity
        testID="customer-add-fab"
        onPress={() => navigation.navigate('CustomerForm', {})}
        activeOpacity={0.85}
        className="absolute bottom-8 right-6 w-14 h-14 bg-primary rounded-full items-center justify-center"
        style={{ elevation: 6, shadowColor: '#4f46e5', shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } }}
      >
        <MaterialCommunityIcons name="plus" size={28} color="white" />
      </TouchableOpacity>
    </View>
  );
}
