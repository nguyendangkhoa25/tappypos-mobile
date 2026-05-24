import { useState, useCallback, memo } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useToastStore } from '../../store/toastStore';
import { useErrorAlert } from '../../hooks/useErrorAlert';
import { inventoryApi, type InventoryItem } from '../../services/api';
import { useTypography } from '../../hooks/useTypography';
import { ErrorState } from '../../components/ErrorState';
import { ScreenSkeleton } from '../../components/ScreenSkeleton';

type StockStatus = 'ok' | 'low' | 'out';

function getStatus(item: InventoryItem): StockStatus {
  if (item.quantity === 0) return 'out';
  if (item.lowStockThreshold !== null && item.quantity <= item.lowStockThreshold) return 'low';
  return 'ok';
}

const STATUS_STYLES: Record<StockStatus, { bg: string; text: string; labelKey: string }> = {
  ok: { bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-700 dark:text-indigo-400', labelKey: 'statusOk' },
  low: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', labelKey: 'statusLow' },
  out: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', labelKey: 'statusOut' },
};

const REASONS = ['reasonRecount', 'reasonReceive', 'reasonDamage', 'reasonReturn'];

export function InventoryListScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const typo = useTypography();
  const qc = useQueryClient();
  const { show: showToast } = useToastStore();
  const showErrorAlert = useErrorAlert();

  const [filter, setFilter] = useState<'all' | 'low' | 'out'>('all');
  const [search, setSearch] = useState('');
  const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null);
  const [newQty, setNewQty] = useState('');
  const [reason, setReason] = useState('reasonRecount');
  const [note, setNote] = useState('');

  const [isManualRefreshing, setIsManualRefreshing] = useState(false);

  // Always load all items — filter client-side so counts are always accurate
  const { data: inventory = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => inventoryApi.list(undefined).then((r) => r.data.data),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });

  const onRefresh = useCallback(async () => {
    setIsManualRefreshing(true);
    await refetch();
    setIsManualRefreshing(false);
  }, [refetch]);

  const openAdjust = useCallback((item: InventoryItem) => {
    setAdjustItem(item);
    setNewQty(item.quantity.toString());
    setReason('reasonRecount');
    setNote('');
  }, []);

  const adjustMutation = useMutation({
    mutationFn: () =>
      inventoryApi.adjust(adjustItem!.productId, Number(newQty), reason, note || undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory'] });
      showToast(t('inventory.adjustSuccess'));
      setAdjustItem(null);
      setNewQty('');
      setReason('reasonRecount');
      setNote('');
    },
    onError: showErrorAlert,
  });

  // Search-filtered full list — counts are derived from this (cross-count pattern)
  const searchFiltered = search.trim()
    ? inventory.filter((i) => i.productName.toLowerCase().includes(search.toLowerCase()))
    : inventory;

  const totalSku = searchFiltered.length;
  const lowCount = searchFiltered.filter((i) => getStatus(i) === 'low').length;
  const outCount = searchFiltered.filter((i) => getStatus(i) === 'out').length;

  // Apply status chip filter for the actual list
  const displayedInventory =
    filter === 'low' ? searchFiltered.filter((i) => getStatus(i) === 'low') :
    filter === 'out' ? searchFiltered.filter((i) => getStatus(i) === 'out') :
    searchFiltered;

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <View
        className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4"
        style={{ paddingTop: insets.top + 12, paddingBottom: 0 }}
      >
        <View className="flex-row items-center mb-0.5">
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} className="mr-3">
            <MaterialCommunityIcons name="chevron-left" size={26} color="#4f46e5" />
          </TouchableOpacity>
          <Text className={`${typo.heading} text-gray-900 dark:text-white flex-1`}>{t('inventory.title')}</Text>
        </View>
        <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 mb-3 mt-0.5`}>{t('inventory.hint')}</Text>
        {/* Search */}
        <View className="flex-row items-center bg-gray-100 dark:bg-gray-700 rounded-xl px-3 py-2.5 mb-3">
          <MaterialCommunityIcons name="magnify" size={20} color="#9ca3af" />
          <TextInput
            className={`flex-1 ml-2 ${typo.inputSize} text-gray-800 dark:text-gray-100`}
            placeholder={t('inventory.searchPlaceholder')}
            placeholderTextColor="#9ca3af"
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialCommunityIcons name="close-circle" size={18} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>
        {/* Summary row */}
        <View className="flex-row gap-3 mb-3">
          {[
            { labelKey: 'totalSku', value: totalSku, color: 'text-gray-900 dark:text-white' },
            { labelKey: 'lowStock', value: lowCount, color: 'text-amber-600' },
            { labelKey: 'outOfStock', value: outCount, color: 'text-red-600' },
          ].map((stat) => (
            <View key={stat.labelKey} className="flex-1 bg-gray-50 dark:bg-gray-700 rounded-xl p-3 items-center">
              <Text className={`${typo.section} ${stat.color}`}>{stat.value}</Text>
              <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 text-center mt-0.5`}>{t(`inventory.${stat.labelKey}`)}</Text>
            </View>
          ))}
        </View>
        {/* Filter chips */}
        <View className="flex-row gap-2 pb-3">
          {([
            { key: 'all' as const, labelKey: 'filterAll', count: totalSku },
            { key: 'low' as const, labelKey: 'filterLow', count: lowCount },
            { key: 'out' as const, labelKey: 'filterOut', count: outCount },
          ]).map(({ key: f, labelKey, count }) => {
            const active = filter === f;
            return (
              <TouchableOpacity
                key={f}
                onPress={() => setFilter(f)}
                className={`flex-row items-center gap-1.5 px-3.5 py-1.5 rounded-full border ${active ? 'bg-indigo-600 border-indigo-600' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600'}`}
              >
                <Text className={`${typo.caption} font-medium ${active ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                  {t(`inventory.${labelKey}`)}
                </Text>
                {inventory.length > 0 && (
                  <View className={`rounded-full px-1.5 py-0.5 min-w-[18px] items-center ${active ? 'bg-white/25' : 'bg-gray-100 dark:bg-gray-700'}`}>
                    <Text className={`${typo.captionBold} ${active ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`}>{count}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {isError ? (
        <ErrorState onRetry={refetch} />
      ) : isLoading ? (
        <ScreenSkeleton count={5} cardHeight={68} />
      ) : displayedInventory.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <MaterialCommunityIcons name="warehouse" size={56} color="#d1d5db" />
          <Text className={`${typo.body} text-gray-400 mt-4 text-center`}>
            {search.trim() ? t('inventory.noResults') : t('inventory.empty')}
          </Text>
          {!search.trim() && (
            <Text className={`${typo.caption} text-gray-400 mt-1 text-center`}>{t('inventory.emptyHint')}</Text>
          )}
        </View>
      ) : (
        <FlatList
          showsVerticalScrollIndicator={false}
          data={displayedInventory}
          keyExtractor={(i) => i.productId}
          contentContainerStyle={{ padding: 4, gap: 10 }}
          refreshing={isManualRefreshing}
          onRefresh={onRefresh}
          renderItem={({ item }) => {
            const status = getStatus(item);
            const s = STATUS_STYLES[status];
            return (
              <View className="bg-white dark:bg-gray-800 rounded-2xl px-4 py-3 flex-row items-center">
                <View className="flex-1">
                  <Text className={`${typo.labelBold} text-gray-900 dark:text-white`}>{item.productName}</Text>
                  <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 mt-0.5`}>
                    {item.quantity} {item.unit}
                    {item.lowStockThreshold !== null && ` · ${t('inventory.threshold', { value: item.lowStockThreshold })}`}
                  </Text>
                </View>
                <View className={`px-2.5 py-1 rounded-full mr-3 ${s.bg}`}>
                  <Text className={`${typo.captionBold} ${s.text}`}>{t(`inventory.${s.labelKey}`)}</Text>
                </View>
                <TouchableOpacity onPress={() => openAdjust(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <MaterialCommunityIcons name="pencil-outline" size={20} color="#4f46e5" />
                </TouchableOpacity>
              </View>
            );
          }}
        />
      )}

      {/* Adjust Modal */}
      <Modal visible={!!adjustItem} animationType="slide" transparent>
        <KeyboardAvoidingView className="flex-1 justify-end" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View className="bg-white dark:bg-gray-800 rounded-t-3xl p-6" style={{ paddingBottom: insets.bottom + 16 }}>
            <View className="flex-row items-center justify-between mb-4">
              <View>
                <Text className={`${typo.section} text-gray-900 dark:text-white`}>{t('inventory.adjustTitle')}</Text>
                <Text className={`${typo.caption} text-gray-500 dark:text-gray-400`}>{adjustItem?.productName}</Text>
              </View>
              <TouchableOpacity onPress={() => setAdjustItem(null)}>
                <MaterialCommunityIcons name="close" size={22} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <Text className={`${typo.label} text-gray-700 dark:text-gray-300 mb-2`}>{t('inventory.newQty')}</Text>
            <TextInput
              value={newQty}
              onChangeText={(v) => setNewQty(v.replace(/\D/g, ''))}
              placeholder={t('inventory.newQtyPlaceholder')}
              placeholderTextColor="#9ca3af"
              keyboardType="numeric"
              className={`border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 ${typo.inputSize} text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 mb-4`}
            />

            <Text className={`${typo.label} text-gray-700 dark:text-gray-300 mb-2`}>{t('inventory.reasonLabel')}</Text>
            <View className="flex-row flex-wrap gap-2 mb-4">
              {REASONS.map((r) => (
                <TouchableOpacity
                  key={r}
                  onPress={() => setReason(r)}
                  className={`px-3 py-1.5 rounded-xl border-2 ${reason === r ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-200 dark:border-gray-600'}`}
                >
                  <Text className={`${typo.caption} font-medium ${reason === r ? 'text-indigo-700 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-400'}`}>
                    {t(`inventory.${r}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder={t('inventory.notePlaceholder')}
              placeholderTextColor="#9ca3af"
              className={`border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 ${typo.inputSize} text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 mb-4`}
            />

            <TouchableOpacity
              onPress={() => adjustMutation.mutate()}
              disabled={adjustMutation.isPending || !newQty}
              className={`rounded-2xl py-4 items-center ${adjustMutation.isPending || !newQty ? 'bg-gray-200 dark:bg-gray-700' : 'bg-indigo-600 active:opacity-80'}`}
            >
              {adjustMutation.isPending ? <ActivityIndicator color="#fff" /> : (
                <Text className={`${typo.labelBold} ${!newQty ? 'text-gray-400' : 'text-white'}`}>
                  {t('common.save')}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
