import { useState, useRef, useEffect } from 'react';
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
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAlertStore } from '../../store/alertStore';
import { useToastStore } from '../../store/toastStore';
import { useErrorAlert } from '../../hooks/useErrorAlert';
import { expenseApi, type ExpenseData } from '../../services/api';
import { formatVnd, formatDate } from '../../utils/format';
import { ClearableInput } from '../../components/ClearableInput';
import { MoneyInput } from '../../components/MoneyInput';
import { BarChart } from '../../components/BarChart';
import { DatePickerInput } from '../../components/DatePickerInput';
import { EXPENSE_CATEGORIES, CATEGORY_EMOJI, type ExpenseCategory } from '../../constants/expenseCategories';
import { PAGE_SIZE } from '../../utils/constants';

function getMonthRange(offset = 0): { from: string; to: string; label: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + offset;
  const d = new Date(y, m, 1);
  const from = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  const to = `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}`;
  const label = `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  return { from, to, label };
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

const EMPTY_FORM = {
  description: '',
  amount: '',
  category: 'OTHER' as ExpenseCategory,
  expenseDate: todayIso(),
};

export function ExpensesScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { show: showAlert } = useAlertStore();
  const { show: showToast } = useToastStore();
  const showErrorAlert = useErrorAlert();

  const [monthOffset, setMonthOffset] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState<'' | 'FIXED' | 'VARIABLE'>('');
  const [page, setPage] = useState(0);
  const [allExpenses, setAllExpenses] = useState<ExpenseData[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const isLoadingMore = useRef(false);
  const canLoadMore = useRef(false);

  const [sheetVisible, setSheetVisible] = useState(false);
  const [catExpanded, setCatExpanded] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseData | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const descRef = useRef<TextInput>(null);
  const amountRef = useRef<TextInput>(null);

  const period = getMonthRange(monthOffset);

  // Reset page when month changes
  useEffect(() => {
    setPage(0);
  }, [period.from]);

  const { data: expensesPage, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['expenses', period.from, period.to, categoryFilter, page],
    queryFn: async () => {
      const res = await expenseApi.list({
        from: period.from,
        to: period.to,
        ...(categoryFilter ? { category: categoryFilter } : {}),
        page,
        size: PAGE_SIZE,
      });
      const content = res.data.data.content;
      if (page === 0) {
        setAllExpenses(content);
      } else {
        setAllExpenses((prev) => [...prev, ...content]);
      }
      return res.data.data;
    },
    staleTime: 30_000,
  });

  const hasMore = expensesPage ? page < expensesPage.totalPages - 1 : false;

  useEffect(() => {
    if (!isFetching) isLoadingMore.current = false;
  }, [isFetching]);

  useEffect(() => {
    canLoadMore.current = false;
    const timer = setTimeout(() => { canLoadMore.current = true; }, 400);
    return () => clearTimeout(timer);
  }, [period.from, categoryFilter]);

  const handleEndReached = () => {
    if (!canLoadMore.current || !hasMore || isFetching || isLoadingMore.current) return;
    isLoadingMore.current = true;
    setPage((p) => p + 1);
  };

  const handleCategoryFilter = (filter: '' | 'FIXED' | 'VARIABLE') => {
    setCategoryFilter(filter);
    setPage(0);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    setPage(0);
    await refetch();
    setRefreshing(false);
  };

  const { data: summary } = useQuery({
    queryKey: ['expensesSummary', period.from, period.to],
    queryFn: () =>
      expenseApi.summary({ from: period.from, to: period.to }).then((r) => r.data.data),
    staleTime: 30_000,
  });

  const { data: chartData = [] } = useQuery({
    queryKey: ['expensesChart', period.from, period.to],
    queryFn: () =>
      expenseApi.chart({ from: period.from, to: period.to, granularity: 'day' }).then((r) => r.data.data),
    staleTime: 30_000,
  });

  const saveMutation = useMutation({
    mutationFn: ({ expenseId, ...payload }: { expenseId: string | null } & typeof EMPTY_FORM & { amount: string }) => {
      const request = {
        description: payload.description,
        amount: Number(payload.amount),
        category: payload.category,
        expenseDate: payload.expenseDate,
      };
      if (expenseId) return expenseApi.update(expenseId, request);
      return expenseApi.create(request);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expensesSummary'] });
      setPage(0);
      setSheetVisible(false);
      showToast(t('expenses.addSheet.saveSuccess'));
    },
    onError: showErrorAlert,
  });

  const handleSave = () => {
    saveMutation.mutate({
      expenseId: editingExpense?.id ?? null,
      ...form,
    });
  };

  const deleteMutation = useMutation({
    mutationFn: (id: string) => expenseApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expensesSummary'] });
      setPage(0);
      showToast(t('expenses.addSheet.deleteSuccess'));
    },
    onError: showErrorAlert,
  });

  const cloneMutation = useMutation({
    mutationFn: () => expenseApi.cloneDefaults(period.from.slice(0, 7)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expensesSummary'] });
      setPage(0);
      showToast(t('expenses.cloneSuccess'));
    },
    onError: showErrorAlert,
  });

  const FILTER_CHIPS: { key: '' | 'FIXED' | 'VARIABLE'; label: string }[] = [
    { key: '', label: t('expenses.filterAll') },
    { key: 'FIXED', label: t('expenses.filterFixed') },
    { key: 'VARIABLE', label: t('expenses.filterVariable') },
  ];

  const openAdd = () => {
    setEditingExpense(null);
    setForm(EMPTY_FORM);
    setCatExpanded(false);
    setSheetVisible(true);
  };

  const openEdit = (e: ExpenseData) => {
    setEditingExpense(e);
    setForm({
      description: e.description ?? '',
      amount: e.amount?.toString() ?? '',
      category: (e.category as ExpenseCategory) ?? 'OTHER',
      expenseDate: (e.expenseDate ?? todayIso()).slice(0, 10),
    });
    setCatExpanded(false);
    setSheetVisible(true);
  };

  const handleDelete = (e: ExpenseData) => {
    showAlert(t('expenses.addSheet.deleteTitle'), t('expenses.addSheet.deleteMsg'), [
      { label: t('common.cancel'), style: 'cancel' },
      { label: t('expenses.addSheet.deleteConfirm'), style: 'destructive', onPress: () => deleteMutation.mutate(e.id) },
    ]);
  };

  const handleClone = () => {
    showAlert(t('expenses.cloneDefaultsTitle'), t('expenses.cloneDefaultsMsg'), [
      { label: t('common.cancel'), style: 'cancel' },
      { label: t('expenses.cloneDefaultsBtn'), onPress: () => cloneMutation.mutate() },
    ]);
  };

  const categoryLabel = (cat: string) =>
    t(`onboarding.step4.categories.${cat}`, { defaultValue: cat });

  const categoryChipLabel = (cat: string) =>
    `${CATEGORY_EMOJI[cat] ?? '🏷️'}  ${categoryLabel(cat)}`;

  const canSave =
    (form.description?.trim() ?? '').length > 0 &&
    Number(form.amount) > 0 &&
    /^\d{4}-\d{2}-\d{2}$/.test(form.expenseDate ?? '');

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <View
        className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4"
        style={{ paddingTop: insets.top + 12, paddingBottom: 0 }}
      >
        <View className="flex-row items-center justify-between mb-0.5">
          <Text className="text-xl font-bold text-gray-900 dark:text-white">{t('expenses.title')}</Text>
          <View className="flex-row items-center gap-1">
            <TouchableOpacity onPress={() => setMonthOffset((o) => o - 1)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialCommunityIcons name="chevron-left" size={22} color="#6b7280" />
            </TouchableOpacity>
            <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 w-16 text-center">{period.label}</Text>
            <TouchableOpacity
              onPress={() => setMonthOffset((o) => Math.min(0, o + 1))}
              disabled={monthOffset >= 0}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialCommunityIcons name="chevron-right" size={22} color={monthOffset >= 0 ? '#d1d5db' : '#6b7280'} />
            </TouchableOpacity>
          </View>
        </View>
        <Text className="text-xs text-gray-500 dark:text-gray-400 mb-3">{t('expenses.hint')}</Text>

        {/* Summary */}
        {summary && (
          <View className="flex-row gap-2 mb-3">
            <View className="flex-1 bg-gray-50 dark:bg-gray-700 rounded-xl p-2.5 items-center">
              <Text className="text-sm font-bold text-gray-900 dark:text-white">{formatVnd(summary.total)}</Text>
              <Text className="text-xs text-gray-500 dark:text-gray-400">{t('expenses.total')}</Text>
            </View>
            <View className="flex-1 bg-gray-50 dark:bg-gray-700 rounded-xl p-2.5 items-center">
              <Text className="text-sm font-bold text-blue-600">{formatVnd(summary.fixed)}</Text>
              <Text className="text-xs text-gray-500 dark:text-gray-400">{t('expenses.fixed')}</Text>
            </View>
            <View className="flex-1 bg-gray-50 dark:bg-gray-700 rounded-xl p-2.5 items-center">
              <Text className="text-sm font-bold text-amber-600">{formatVnd(summary.variable)}</Text>
              <Text className="text-xs text-gray-500 dark:text-gray-400">{t('expenses.variable')}</Text>
            </View>
          </View>
        )}

        {/* Category filter chips */}
        <View className="flex-row gap-2 pb-3">
          {FILTER_CHIPS.map((chip) => (
            <TouchableOpacity
              key={chip.key}
              onPress={() => handleCategoryFilter(chip.key)}
              className={`px-4 py-1.5 rounded-full border ${
                categoryFilter === chip.key
                  ? 'bg-indigo-600 border-indigo-600'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600'
              }`}
            >
              <Text className={`text-sm font-medium ${categoryFilter === chip.key ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                {chip.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {isLoading && page === 0 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#4f46e5" />
        </View>
      ) : allExpenses.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <MaterialCommunityIcons name="receipt" size={56} color="#d1d5db" />
          <Text className="text-base font-semibold text-gray-400 mt-4 text-center">{t('expenses.empty')}</Text>
          <Text className="text-sm text-gray-400 mt-1 text-center">{t('expenses.emptyHint')}</Text>
          <TouchableOpacity
            onPress={handleClone}
            disabled={cloneMutation.isPending}
            className="mt-4 border border-indigo-600 px-6 py-2.5 rounded-2xl"
          >
            <Text className="text-indigo-600 font-semibold text-sm">{t('expenses.cloneDefaultsBtn')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={allExpenses}
          keyExtractor={(e) => e.id}
          contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: insets.bottom + 80 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4f46e5" />
          }
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            isFetching && page > 0 ? (
              <View className="py-4 items-center">
                <ActivityIndicator size="small" color="#4f46e5" />
              </View>
            ) : null
          }
          ListHeaderComponent={chartData.length > 0 ? (
            <View className="bg-white dark:bg-gray-800 rounded-2xl px-4 pt-4 pb-2 mb-2">
              <BarChart data={chartData} color="#ef4444" granularity="day" />
            </View>
          ) : null}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => openEdit(item)}
              className="bg-white dark:bg-gray-800 rounded-2xl px-4 py-3 flex-row items-center"
            >
              <View className="flex-1 mr-3">
                <View className="flex-row items-center gap-2">
                  <Text className="text-base font-semibold text-gray-900 dark:text-white flex-1" numberOfLines={1}>
                    {item.description || '—'}
                  </Text>
                  <View className="flex-row items-center px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700">
                    <Text style={{ fontSize: 12 }} className="mr-1">{CATEGORY_EMOJI[item.category] ?? '🏷️'}</Text>
                    <Text className="text-xs font-medium text-indigo-700 dark:text-indigo-400">
                      {categoryLabel(item.category)}
                    </Text>
                  </View>
                </View>
                <Text className="text-xs text-gray-400 mt-0.5">{formatDate(item.expenseDate)}</Text>
              </View>
              <View className="items-end">
                <Text className="text-base font-bold text-gray-900 dark:text-white">{formatVnd(item.amount)}</Text>
                <TouchableOpacity onPress={() => handleDelete(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} className="mt-1">
                  <MaterialCommunityIcons name="trash-can-outline" size={16} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        onPress={openAdd}
        className="absolute right-5 bg-indigo-600 rounded-full w-14 h-14 items-center justify-center shadow-lg"
        style={{ bottom: insets.bottom + 16 }}
      >
        <MaterialCommunityIcons name="plus" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Add/Edit Sheet */}
      <Modal visible={sheetVisible} animationType="slide" transparent onRequestClose={() => setSheetVisible(false)}>
        <KeyboardAvoidingView className="flex-1 justify-end" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View key={editingExpense?.id ?? 'new'} className="bg-white dark:bg-gray-800 rounded-t-3xl px-6 pt-6" style={{ maxHeight: '90%', paddingBottom: insets.bottom + 16 }}>
            {/* Header */}
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-lg font-bold text-gray-900 dark:text-white">
                {editingExpense ? t('expenses.addSheet.editTitle') : t('expenses.addSheet.title')}
              </Text>
              <TouchableOpacity onPress={() => setSheetVisible(false)}>
                <MaterialCommunityIcons name="close" size={22} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {/* Hints */}
            <View className="gap-1 mb-4">
              {(
                [
                  { icon: 'text-short', key: 'expenses.addSheet.hint1' },
                  { icon: 'tag-outline', key: 'expenses.addSheet.hint2' },
                  { icon: 'calendar-outline', key: 'expenses.addSheet.hint3' },
                ] as const
              ).map(({ icon, key }) => (
                <View key={key} className="flex-row items-center gap-2">
                  <MaterialCommunityIcons name={icon} size={13} color="#9ca3af" />
                  <Text className="text-xs text-gray-400 dark:text-gray-500 flex-1 leading-4">
                    {t(key)}
                  </Text>
                </View>
              ))}
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Description */}
              <Text className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">{t('expenses.addSheet.nameLabel')}</Text>
              <View className="mb-3">
                <ClearableInput
                  ref={descRef}
                  value={form.description}
                  onChangeText={(v) => setForm((f) => ({ ...f, description: v }))}
                  onClear={() => setForm((f) => ({ ...f, description: '' }))}
                  placeholder={t('expenses.addSheet.namePlaceholder')}
                  returnKeyType="next"
                  onSubmitEditing={() => amountRef.current?.focus()}
                  autoCapitalize="sentences"
                />
              </View>

              {/* Amount */}
              <Text className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">{t('expenses.addSheet.amountLabel')}</Text>
              <View className="mb-3">
                <MoneyInput
                  ref={amountRef}
                  rawValue={form.amount}
                  onChangeRaw={(v) => setForm((f) => ({ ...f, amount: v }))}
                  placeholder={t('expenses.addSheet.amountPlaceholder')}
                  returnKeyType="done"
                />
              </View>

              {/* Category */}
              <Text className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">{t('expenses.addSheet.categoryLabel')}</Text>
              <TouchableOpacity
                onPress={() => setCatExpanded((v) => !v)}
                className="flex-row items-center justify-between border border-indigo-200 dark:border-indigo-700 rounded-xl px-4 py-3 bg-indigo-50 dark:bg-indigo-900/20 mb-1"
              >
                <Text className="text-base font-medium text-indigo-700 dark:text-indigo-300">{categoryChipLabel(form.category)}</Text>
                <MaterialCommunityIcons name={catExpanded ? 'chevron-up' : 'chevron-down'} size={20} color="#818cf8" />
              </TouchableOpacity>
              {catExpanded && (
                <View className="border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 mb-3 overflow-hidden">
                  <View className="flex-row flex-wrap gap-2 p-3">
                    {EXPENSE_CATEGORIES.map((cat) => {
                      const active = form.category === cat;
                      return (
                        <TouchableOpacity
                          key={cat}
                          activeOpacity={0.7}
                          onPress={() => { setForm((f) => ({ ...f, category: cat })); setCatExpanded(false); }}
                          className={`flex-row items-center rounded-full border px-3 py-1.5 ${
                            active
                              ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-300 dark:border-indigo-600'
                              : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-600'
                          }`}
                        >
                          <Text style={{ fontSize: 15, lineHeight: 20 }} className="mr-1.5">
                            {CATEGORY_EMOJI[cat] ?? '🏷️'}
                          </Text>
                          <Text className={`text-sm font-medium ${active ? 'text-indigo-600 dark:text-indigo-300' : 'text-gray-700 dark:text-gray-200'}`}>
                            {active ? '✓ ' : ''}{categoryLabel(cat)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}
              {!catExpanded && <View className="mb-2" />}

              {/* Date */}
              <Text className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">{t('expenses.addSheet.dateLabel')}</Text>
              <View className="border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 bg-gray-50 dark:bg-gray-700 mb-4">
                <DatePickerInput
                  value={form.expenseDate}
                  onChange={(v) => setForm((f) => ({ ...f, expenseDate: v }))}
                  maximumDate={new Date()}
                />
              </View>

              {/* Save */}
              <TouchableOpacity
                onPress={handleSave}
                disabled={saveMutation.isPending || !canSave}
                className={`rounded-2xl py-4 items-center mb-2 ${saveMutation.isPending || !canSave ? 'bg-gray-200 dark:bg-gray-700' : 'bg-indigo-600 active:opacity-80'}`}
              >
                {saveMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className={`font-bold text-base ${!canSave ? 'text-gray-400' : 'text-white'}`}>
                    {t('common.save')}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </View>
  );
}
