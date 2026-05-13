import { useState } from 'react';
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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToastStore } from '../../store/toastStore';
import { useErrorAlert } from '../../hooks/useErrorAlert';
import { inventoryApi, type InventoryItem } from '../../services/api';

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
  const qc = useQueryClient();
  const { show: showToast } = useToastStore();
  const showErrorAlert = useErrorAlert();

  const [filter, setFilter] = useState<'all' | 'low' | 'out'>('all');
  const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null);
  const [newQty, setNewQty] = useState('');
  const [reason, setReason] = useState('reasonRecount');
  const [note, setNote] = useState('');

  const { data: inventory = [], isLoading, refetch } = useQuery({
    queryKey: ['inventory', filter],
    queryFn: () =>
      inventoryApi
        .list(filter === 'all' ? undefined : { status: filter as 'low' | 'out' })
        .then((r) => r.data.data),
    staleTime: 30_000,
  });

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

  const openAdjust = (item: InventoryItem) => {
    setAdjustItem(item);
    setNewQty(item.quantity.toString());
    setReason('reasonRecount');
    setNote('');
  };

  const totalSku = inventory.length;
  const lowCount = inventory.filter((i) => getStatus(i) === 'low').length;
  const outCount = inventory.filter((i) => getStatus(i) === 'out').length;

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
          <Text className="text-xl font-bold text-gray-900 dark:text-white flex-1">{t('inventory.title')}</Text>
        </View>
        <Text className="text-xs text-gray-500 dark:text-gray-400 mb-3 mt-0.5">{t('inventory.hint')}</Text>
        {/* Summary row */}
        <View className="flex-row gap-3 mb-3">
          {[
            { labelKey: 'totalSku', value: totalSku, color: 'text-gray-900 dark:text-white' },
            { labelKey: 'lowStock', value: lowCount, color: 'text-amber-600' },
            { labelKey: 'outOfStock', value: outCount, color: 'text-red-600' },
          ].map((stat) => (
            <View key={stat.labelKey} className="flex-1 bg-gray-50 dark:bg-gray-700 rounded-xl p-3 items-center">
              <Text className={`text-xl font-bold ${stat.color}`}>{stat.value}</Text>
              <Text className="text-xs text-gray-500 dark:text-gray-400 text-center mt-0.5">{t(`inventory.${stat.labelKey}`)}</Text>
            </View>
          ))}
        </View>
        {/* Filter chips */}
        <View className="flex-row gap-2 pb-3">
          {(['all', 'low', 'out'] as const).map((f) => {
            const active = filter === f;
            const labelKey = f === 'all' ? 'filterAll' : f === 'low' ? 'filterLow' : 'filterOut';
            return (
              <TouchableOpacity
                key={f}
                onPress={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-full border ${active ? 'bg-indigo-600 border-indigo-600' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600'}`}
              >
                <Text className={`text-sm font-medium ${active ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                  {t(`inventory.${labelKey}`)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#4f46e5" />
        </View>
      ) : inventory.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <MaterialCommunityIcons name="warehouse" size={56} color="#d1d5db" />
          <Text className="text-base font-semibold text-gray-400 mt-4 text-center">{t('inventory.empty')}</Text>
          <Text className="text-sm text-gray-400 mt-1 text-center">{t('inventory.emptyHint')}</Text>
        </View>
      ) : (
        <FlatList
          data={inventory}
          keyExtractor={(i) => i.productId}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          refreshing={isLoading}
          onRefresh={refetch}
          renderItem={({ item }) => {
            const status = getStatus(item);
            const s = STATUS_STYLES[status];
            return (
              <View className="bg-white dark:bg-gray-800 rounded-2xl px-4 py-3 flex-row items-center">
                <View className="flex-1">
                  <Text className="text-base font-semibold text-gray-900 dark:text-white">{item.productName}</Text>
                  <Text className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    {item.quantity} {item.unit}
                    {item.lowStockThreshold !== null && ` · ${t('inventory.threshold', { value: item.lowStockThreshold })}`}
                  </Text>
                </View>
                <View className={`px-2.5 py-1 rounded-full mr-3 ${s.bg}`}>
                  <Text className={`text-xs font-medium ${s.text}`}>{t(`inventory.${s.labelKey}`)}</Text>
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
                <Text className="text-lg font-bold text-gray-900 dark:text-white">{t('inventory.adjustTitle')}</Text>
                <Text className="text-sm text-gray-500 dark:text-gray-400">{adjustItem?.productName}</Text>
              </View>
              <TouchableOpacity onPress={() => setAdjustItem(null)}>
                <MaterialCommunityIcons name="close" size={22} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('inventory.newQty')}</Text>
            <TextInput
              value={newQty}
              onChangeText={(v) => setNewQty(v.replace(/\D/g, ''))}
              placeholder={t('inventory.newQtyPlaceholder')}
              placeholderTextColor="#9ca3af"
              keyboardType="numeric"
              className="border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 text-base text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 mb-4"
            />

            <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('inventory.reasonLabel')}</Text>
            <View className="flex-row flex-wrap gap-2 mb-4">
              {REASONS.map((r) => (
                <TouchableOpacity
                  key={r}
                  onPress={() => setReason(r)}
                  className={`px-3 py-1.5 rounded-xl border-2 ${reason === r ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-200 dark:border-gray-600'}`}
                >
                  <Text className={`text-sm font-medium ${reason === r ? 'text-indigo-700 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-400'}`}>
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
              className="border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 text-base text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 mb-4"
            />

            <TouchableOpacity
              onPress={() => adjustMutation.mutate()}
              disabled={adjustMutation.isPending || !newQty}
              className={`rounded-2xl py-4 items-center ${adjustMutation.isPending || !newQty ? 'bg-gray-200 dark:bg-gray-700' : 'bg-indigo-600 active:opacity-80'}`}
            >
              {adjustMutation.isPending ? <ActivityIndicator color="#fff" /> : (
                <Text className={`font-bold text-base ${!newQty ? 'text-gray-400' : 'text-white'}`}>
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
