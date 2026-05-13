import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToastStore } from '../../store/toastStore';
import { useErrorAlert } from '../../hooks/useErrorAlert';
import { goldPriceApi, type GoldPrice } from '../../services/api';
import { formatVnd, formatDate } from '../../utils/format';
import { BarChart } from '../../components/BarChart';
import { DatePickerInput } from '../../components/DatePickerInput';
import type { GoldPriceScreenProps } from '../../types/navigation';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function GoldPriceScreen({ navigation }: GoldPriceScreenProps<'GoldPriceMain'>) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { show: showToast } = useToastStore();
  const showErrorAlert = useErrorAlert();

  const [sheetVisible, setSheetVisible] = useState(false);
  const [form, setForm] = useState({ date: todayIso(), buyPrice: '', sellPrice: '', note: '' });

  const { data: current, isLoading: loadingCurrent } = useQuery({
    queryKey: ['goldPrice', 'current'],
    queryFn: () => goldPriceApi.getCurrent().then((r) => r.data.data),
    staleTime: 5 * 60_000,
  });

  const { data: history = [], isLoading: loadingHistory } = useQuery({
    queryKey: ['goldPrice', 'history'],
    queryFn: () => goldPriceApi.getHistory(7).then((r) => r.data.data),
    staleTime: 5 * 60_000,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      goldPriceApi.create({
        date: form.date,
        buyPrice: Number(form.buyPrice.replace(/\D/g, '')),
        sellPrice: Number(form.sellPrice.replace(/\D/g, '')),
        note: form.note || null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['goldPrice'] });
      showToast(t('gold.saveSuccess'));
      setSheetVisible(false);
    },
    onError: showErrorAlert,
  });

  const openSheet = () => {
    setForm({
      date: todayIso(),
      buyPrice: current ? current.buyPrice.toString() : '',
      sellPrice: current ? current.sellPrice.toString() : '',
      note: '',
    });
    setSheetVisible(true);
  };

  const sellLtBuy =
    Number(form.sellPrice.replace(/\D/g, '')) > 0 &&
    Number(form.buyPrice.replace(/\D/g, '')) > 0 &&
    Number(form.sellPrice.replace(/\D/g, '')) < Number(form.buyPrice.replace(/\D/g, ''));

  const canSave =
    form.date.length === 10 &&
    Number(form.buyPrice.replace(/\D/g, '')) > 0 &&
    Number(form.sellPrice.replace(/\D/g, '')) > 0;

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <View
        className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 flex-row items-center px-4"
        style={{ paddingTop: insets.top + 12, paddingBottom: 12 }}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} className="mr-3">
          <MaterialCommunityIcons name="chevron-left" size={26} color="#4f46e5" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-lg font-bold text-gray-900 dark:text-white">{t('gold.title')}</Text>
          <Text className="text-xs text-gray-500 dark:text-gray-400">{t('gold.hint')}</Text>
          {current && (
            <Text className="text-xs text-gray-400">{t('gold.lastUpdated', { time: formatDate(current.date) })}</Text>
          )}
        </View>
        <TouchableOpacity onPress={openSheet} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialCommunityIcons name="pencil-outline" size={22} color="#4f46e5" />
        </TouchableOpacity>
      </View>

      {loadingCurrent ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#4f46e5" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
          {/* Price cards */}
          {current ? (
            <View className="flex-row gap-3">
              <View className="flex-1 bg-white dark:bg-gray-800 rounded-2xl p-4">
                <Text className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('gold.buyPrice')}</Text>
                <Text className="text-xl font-bold text-blue-600">{formatVnd(current.buyPrice)}</Text>
                <Text className="text-xs text-gray-400 mt-0.5">{t('gold.perChi')}</Text>
              </View>
              <View className="flex-1 bg-white dark:bg-gray-800 rounded-2xl p-4">
                <Text className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('gold.sellPrice')}</Text>
                <Text className="text-xl font-bold text-indigo-600">{formatVnd(current.sellPrice)}</Text>
                <Text className="text-xs text-gray-400 mt-0.5">{t('gold.perChi')}</Text>
              </View>
            </View>
          ) : (
            <View className="bg-white dark:bg-gray-800 rounded-2xl p-8 items-center">
              <MaterialCommunityIcons name="gold" size={48} color="#d1d5db" />
              <Text className="text-base font-semibold text-gray-400 mt-3 text-center">{t('gold.noData')}</Text>
              <Text className="text-sm text-gray-400 mt-1 text-center">{t('gold.noDataHint')}</Text>
              <TouchableOpacity
                onPress={openSheet}
                className="mt-4 bg-indigo-600 px-6 py-3 rounded-2xl"
              >
                <Text className="text-white font-semibold">{t('gold.updateTitle')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* 7-day buy price chart */}
          {history.length > 1 && (
            <View className="bg-white dark:bg-gray-800 rounded-2xl px-4 pt-4 pb-2">
              <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">{t('gold.history7day')}</Text>
              <BarChart
                data={[...history].reverse().map((g) => ({ label: g.date, value: g.buyPrice }))}
                color="#4f46e5"
                granularity="day"
              />
            </View>
          )}

          {/* History */}
          {history.length > 0 && (
            <View className="bg-white dark:bg-gray-800 rounded-2xl p-4">
              <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">{t('gold.history')}</Text>
              {history.map((g: GoldPrice, idx: number) => (
                <View key={g.date}>
                  {idx > 0 && <View className="h-px bg-gray-100 dark:bg-gray-700 my-2" />}
                  <View className="flex-row items-center">
                    <Text className="text-sm text-gray-600 dark:text-gray-400 flex-1">{formatDate(g.date)}</Text>
                    <View className="items-end">
                      <Text className="text-xs text-blue-500">{t('gold.buyLabel')}: {formatVnd(g.buyPrice)}</Text>
                      <Text className="text-xs text-indigo-600">{t('gold.sellLabel')}: {formatVnd(g.sellPrice)}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {/* Update sheet */}
      <Modal visible={sheetVisible} animationType="slide" transparent>
        <KeyboardAvoidingView className="flex-1 justify-end" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View className="bg-white dark:bg-gray-800 rounded-t-3xl p-6" style={{ paddingBottom: insets.bottom + 16 }}>
            <View className="flex-row items-center justify-between mb-5">
              <Text className="text-lg font-bold text-gray-900 dark:text-white">{t('gold.updateTitle')}</Text>
              <TouchableOpacity onPress={() => setSheetVisible(false)}>
                <MaterialCommunityIcons name="close" size={22} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('gold.updateDate')}</Text>
            <View className="border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 bg-gray-50 dark:bg-gray-700 mb-4">
              <DatePickerInput
                value={form.date}
                onChange={(v) => setForm({ ...form, date: v })}
                maximumDate={new Date()}
              />
            </View>

            <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('gold.updateBuy')}</Text>
            <TextInput
              value={form.buyPrice}
              onChangeText={(v) => setForm({ ...form, buyPrice: v.replace(/\D/g, '') })}
              placeholder="0"
              placeholderTextColor="#9ca3af"
              keyboardType="numeric"
              className="border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 text-base text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 mb-4"
            />

            <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('gold.updateSell')}</Text>
            <TextInput
              value={form.sellPrice}
              onChangeText={(v) => setForm({ ...form, sellPrice: v.replace(/\D/g, '') })}
              placeholder="0"
              placeholderTextColor="#9ca3af"
              keyboardType="numeric"
              className={`border rounded-xl px-4 py-3 text-base text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 mb-1 ${sellLtBuy ? 'border-amber-400' : 'border-gray-200 dark:border-gray-600'}`}
            />
            {sellLtBuy && (
              <Text className="text-xs text-amber-500 mb-3">{t('gold.warnSellLtBuy')}</Text>
            )}
            {!sellLtBuy && <View className="mb-3" />}

            <TextInput
              value={form.note}
              onChangeText={(v) => setForm({ ...form, note: v })}
              placeholder={t('gold.updateNotePlaceholder')}
              placeholderTextColor="#9ca3af"
              className="border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 text-base text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 mb-4"
            />

            <TouchableOpacity
              onPress={() => createMutation.mutate()}
              disabled={createMutation.isPending || !canSave}
              className={`rounded-2xl py-4 items-center ${createMutation.isPending || !canSave ? 'bg-gray-200 dark:bg-gray-700' : 'bg-indigo-600 active:opacity-80'}`}
            >
              {createMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className={`font-bold text-base ${!canSave ? 'text-gray-400' : 'text-white'}`}>
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
