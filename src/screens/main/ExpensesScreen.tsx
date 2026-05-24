import { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useAlertStore } from '../../store/alertStore';
import { useToastStore } from '../../store/toastStore';
import { useErrorAlert } from '../../hooks/useErrorAlert';
import { useTypography } from '../../hooks/useTypography';
import { useNetworkStore } from '../../store/networkStore';
import { useOfflineQueueStore } from '../../store/offlineQueueStore';
import { expenseApi, type ExpenseData, type DefaultExpense } from '../../services/api';
import { formatVnd, formatDate, formatRelativeDate } from '../../utils/format';
import { ClearableInput } from '../../components/ClearableInput';
import { MoneyInput } from '../../components/MoneyInput';
import { TrendChart } from '../../components/TrendChart';
import type { ChartGranularity } from '../../components/BarChart';
import { DatePickerInput } from '../../components/DatePickerInput';
import { EXPENSE_CATEGORIES, CATEGORY_EMOJI, FB_CATEGORY_ORDER, FB_SHOP_TYPES, FIXED_CATEGORIES, type ExpenseCategory } from '../../constants/expenseCategories';
import { useAuthStore } from '../../store/authStore';
import { PAGE_SIZE } from '../../utils/constants';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ExpensesStackParamList } from '../../types/navigation';

type Props = NativeStackScreenProps<ExpensesStackParamList, 'ExpenseMain'>;

const CAT_FREQ_KEY = 'expense_category_counts';

// ── Payment method display ─────────────────────────────────────────────────────
const PAYMENT_DISPLAY: Record<string, { vi: string; en: string; icon: string }> = {
  CASH:          { vi: 'Tiền mặt',     en: 'Cash',     icon: '💵' },
  BANK_TRANSFER: { vi: 'Chuyển khoản', en: 'Transfer', icon: '🏦' },
  CARD:          { vi: 'Thẻ',          en: 'Card',     icon: '💳' },
};

// ── Category avatar background colours ────────────────────────────────────────
const CATEGORY_BG: Record<string, string> = {
  RENT:         'bg-amber-100 dark:bg-amber-900/30',
  ELECTRICITY:  'bg-yellow-100 dark:bg-yellow-900/30',
  WATER:        'bg-blue-100 dark:bg-blue-900/30',
  INTERNET:     'bg-sky-100 dark:bg-sky-900/30',
  PHONE:        'bg-indigo-100 dark:bg-indigo-900/30',
  SUPPLIES:     'bg-gray-100 dark:bg-gray-700',
  EQUIPMENT:    'bg-orange-100 dark:bg-orange-900/30',
  MARKETING:    'bg-pink-100 dark:bg-pink-900/30',
  SALARY_EXTRA: 'bg-purple-100 dark:bg-purple-900/30',
  TRANSPORT:    'bg-green-100 dark:bg-green-900/30',
  PACKAGING:    'bg-teal-100 dark:bg-teal-900/30',
  SOFTWARE:     'bg-violet-100 dark:bg-violet-900/30',
  CLEANING:     'bg-cyan-100 dark:bg-cyan-900/30',
  TAX:          'bg-red-100 dark:bg-red-900/30',
  BANK_FEE:     'bg-emerald-100 dark:bg-emerald-900/30',
  INSURANCE:    'bg-blue-100 dark:bg-blue-900/30',
  MAINTENANCE:  'bg-orange-100 dark:bg-orange-900/30',
  FOOD_STAFF:   'bg-amber-100 dark:bg-amber-900/30',
  OTHER:        'bg-gray-100 dark:bg-gray-700',
};

type ExpenseRowProps = {
  item: ExpenseData;
  onEdit: (e: ExpenseData) => void;
  onDelete: (e: ExpenseData) => void;
  categoryLabel: (cat: string) => string;
  fixedCategories: Set<string>;
  fixedLabel: string;
  variableLabel: string;
};

const ExpenseRow = memo(function ExpenseRow({
  item, onEdit, onDelete, categoryLabel, fixedCategories, fixedLabel, variableLabel,
}: ExpenseRowProps) {
  const typo = useTypography();
  const { i18n } = useTranslation();
  const lang = i18n.language ?? 'vi';

  const isFixed   = fixedCategories.has(item.category);
  const relDate   = formatRelativeDate(item.expenseDate, lang);
  const payment   = item.paymentMethod ? PAYMENT_DISPLAY[item.paymentMethod] : null;
  const avatarBg  = CATEGORY_BG[item.category] ?? 'bg-gray-100 dark:bg-gray-700';

  return (
    <TouchableOpacity
      onPress={() => onEdit(item)}
      className="bg-white dark:bg-gray-800 rounded-2xl px-4 py-3 flex-row items-start"
    >
      {/* ── Emoji avatar ── */}
      <View className={`w-10 h-10 rounded-2xl items-center justify-center mr-3 mt-0.5 flex-shrink-0 ${avatarBg}`}>
        <Text className={typo.section}>{CATEGORY_EMOJI[item.category] ?? '🏷️'}</Text>
      </View>

      {/* ── Main content ── */}
      <View className="flex-1 mr-2">

        {/* Row 1: description + fixed/variable badge */}
        <View className="flex-row items-center gap-1.5">
          <Text className={`${typo.label} text-gray-900 dark:text-white flex-1`} numberOfLines={1}>
            {item.description || '—'}
          </Text>
          <View className={`px-1.5 py-0.5 rounded-full flex-shrink-0 ${isFixed ? 'bg-gray-100 dark:bg-gray-700' : 'bg-amber-50 dark:bg-amber-900/30'}`}>
            <Text className={`${typo.caption} font-medium ${isFixed ? 'text-gray-500 dark:text-gray-400' : 'text-amber-600 dark:text-amber-400'}`}>
              {isFixed ? fixedLabel : variableLabel}
            </Text>
          </View>
        </View>

        {/* Row 2: relative date · payment method */}
        <View className="flex-row items-center flex-wrap mt-0.5" style={{ gap: 4 }}>
          <Text className={`${typo.caption} text-gray-400`}>{relDate}</Text>
          {payment && (
            <>
              <Text className={`${typo.caption} text-gray-300 dark:text-gray-600`}>·</Text>
              <Text className={`${typo.caption} text-gray-500 dark:text-gray-400`}>
                {payment.icon} {lang === 'vi' ? payment.vi : payment.en}
              </Text>
            </>
          )}
        </View>

        {/* Row 3: category chip · #ref · 👤 created-by */}
        <View className="flex-row items-center flex-wrap mt-1" style={{ gap: 4 }}>
          <View className="bg-indigo-50 dark:bg-indigo-900/20 rounded-full px-2 py-0.5">
            <Text className={`${typo.caption} font-medium text-indigo-700 dark:text-indigo-400`}>
              {categoryLabel(item.category)}
            </Text>
          </View>
          {!!item.referenceNumber && (
            <>
              <Text className={`${typo.caption} text-gray-300 dark:text-gray-600`}>·</Text>
              <Text className={`${typo.caption} text-gray-400`}>#{item.referenceNumber}</Text>
            </>
          )}
          {!!item.createdBy && (
            <>
              <Text className={`${typo.caption} text-gray-300 dark:text-gray-600`}>·</Text>
              <Text className={`${typo.caption} text-gray-400`}>👤 {item.createdBy}</Text>
            </>
          )}
        </View>
      </View>

      {/* ── Amount + delete ── */}
      <View className="items-end flex-shrink-0">
        <Text className={`${typo.labelBold} text-gray-900 dark:text-white`}>{formatVnd(item.amount)}</Text>
        <TouchableOpacity onPress={() => onDelete(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} className="mt-1.5">
          <MaterialCommunityIcons name="trash-can-outline" size={16} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
});

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

export function ExpensesScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const typo = useTypography();
  const qc = useQueryClient();
  const { show: showAlert } = useAlertStore();
  const { show: showToast } = useToastStore();
  const showErrorAlert = useErrorAlert();
  const { isOffline } = useNetworkStore();
  const { addExpense, pendingExpenses } = useOfflineQueueStore();
  const { shopTypeCode } = useAuthStore();
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    AsyncStorage.getItem(CAT_FREQ_KEY).then((raw) => {
      if (raw) setCategoryCounts(JSON.parse(raw));
    }).catch(() => {});
  }, []);

  const incrementCategoryCount = useCallback((cat: string) => {
    setCategoryCounts((prev) => {
      const next = { ...prev, [cat]: (prev[cat] ?? 0) + 1 };
      AsyncStorage.setItem(CAT_FREQ_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const orderedCategories = useMemo<ExpenseCategory[]>(() => {
    const base: ExpenseCategory[] = shopTypeCode && FB_SHOP_TYPES.includes(shopTypeCode)
      ? FB_CATEGORY_ORDER
      : [...EXPENSE_CATEGORIES];
    return [...base].sort((a, b) => (categoryCounts[b] ?? 0) - (categoryCounts[a] ?? 0));
  }, [shopTypeCode, categoryCounts]);

  const [monthOffset, setMonthOffset] = useState(0);
  const [chartGranularity, setChartGranularity] = useState<ChartGranularity>('day');
  const [categoryFilter, setCategoryFilter] = useState<'' | 'FIXED' | 'VARIABLE'>('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [page, setPage] = useState(0);
  const [allExpenses, setAllExpenses] = useState<ExpenseData[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const isLoadingMore = useRef(false);
  const canLoadMore = useRef(false);

  const [sheetVisible, setSheetVisible] = useState(false);
  const [cloneSheetVisible, setCloneSheetVisible] = useState(false);
  const [selectedDefaultIds, setSelectedDefaultIds] = useState<Set<string>>(new Set());
  const [catExpanded, setCatExpanded] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseData | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const descRef = useRef<TextInput>(null);
  const amountRef = useRef<TextInput>(null);

  const period = getMonthRange(monthOffset);

  const handleMonthPrev = useCallback(() => { setMonthOffset((o) => o - 1); setPage(0); setSelectedCategory(''); }, []);
  const handleMonthNext = useCallback(() => { setMonthOffset((o) => Math.min(0, o + 1)); setPage(0); setSelectedCategory(''); }, []);

  const { data: expensesPage, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['expenses', period.from, period.to, page],
    queryFn: async () => {
      const res = await expenseApi.list({
        from: period.from,
        to: period.to,
        page,
        size: PAGE_SIZE,
      });
      const content = [...res.data.data.content].sort(
        (a, b) => (b.expenseDate ?? '').localeCompare(a.expenseDate ?? ''),
      );
      if (page === 0) {
        setAllExpenses(content);
      } else {
        setAllExpenses((prev) => [...prev, ...content]);
      }
      return res.data.data;
    },
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });

  const hasMore = expensesPage ? page < expensesPage.totalPages - 1 : false;

  const displayedExpenses = useMemo(() => {
    let list = allExpenses;
    if (categoryFilter === 'FIXED') list = list.filter((e) => FIXED_CATEGORIES.has(e.category));
    else if (categoryFilter === 'VARIABLE') list = list.filter((e) => !FIXED_CATEGORIES.has(e.category));
    if (selectedCategory) list = list.filter((e) => e.category === selectedCategory);
    return list;
  }, [categoryFilter, selectedCategory, allExpenses]);

  // Categories present in the current month — used to build the chip row
  const presentCategories = useMemo(() =>
    Array.from(new Set(allExpenses.map((e) => e.category))).sort(),
  [allExpenses]);

  // Count per Fixed/Variable chip — respects current selectedCategory so numbers
  // reflect "how many would appear if I tap this chip".
  const filterChipCounts = useMemo(() => {
    const base = selectedCategory
      ? allExpenses.filter((e) => e.category === selectedCategory)
      : allExpenses;
    return {
      '':       base.length,
      FIXED:    base.filter((e) =>  FIXED_CATEGORIES.has(e.category)).length,
      VARIABLE: base.filter((e) => !FIXED_CATEGORIES.has(e.category)).length,
    } as Record<string, number>;
  }, [allExpenses, selectedCategory]);

  // Count per category chip — respects current Fixed/Variable filter.
  const catChipCounts = useMemo(() => {
    const base =
      categoryFilter === 'FIXED'     ? allExpenses.filter((e) =>  FIXED_CATEGORIES.has(e.category)) :
      categoryFilter === 'VARIABLE'  ? allExpenses.filter((e) => !FIXED_CATEGORIES.has(e.category)) :
      allExpenses;
    const counts: Record<string, number> = {};
    for (const cat of presentCategories) {
      counts[cat] = base.filter((e) => e.category === cat).length;
    }
    return counts;
  }, [allExpenses, categoryFilter, presentCategories]);

  useEffect(() => {
    if (!isFetching) isLoadingMore.current = false;
  }, [isFetching]);

  useEffect(() => {
    canLoadMore.current = false;
    const timer = setTimeout(() => { canLoadMore.current = true; }, 400);
    return () => clearTimeout(timer);
  }, [period.from]);

  const handleEndReached = () => {
    if (!canLoadMore.current || !hasMore || isFetching || isLoadingMore.current) return;
    isLoadingMore.current = true;
    setPage((p) => p + 1);
  };

  const handleCategoryFilter = useCallback((filter: '' | 'FIXED' | 'VARIABLE') => {
    setCategoryFilter(filter);
    setSelectedCategory('');
  }, []);

  const handleCategorySelect = useCallback((cat: string) => {
    setSelectedCategory((prev) => (prev === cat ? '' : cat));
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setPage(0);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const { data: summary } = useQuery({
    queryKey: ['expensesSummary', period.from, period.to],
    queryFn: () =>
      expenseApi.summary({ from: period.from, to: period.to }).then((r) => r.data.data),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });

  const { data: chartData = [] } = useQuery({
    queryKey: ['expensesChart', period.from, period.to, chartGranularity],
    queryFn: () =>
      expenseApi.chart({ from: period.from, to: period.to, granularity: chartGranularity as 'hour' | 'day' | 'month' | 'year' }).then((r) => r.data.data),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
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
      if (!editingExpense) incrementCategoryCount(form.category);
    },
    onError: showErrorAlert,
  });

  const handleSave = () => {
    // Offline: queue locally and skip the API call (edit not supported offline)
    if (isOffline && !editingExpense) {
      addExpense({
        description: form.description,
        amount: Number(form.amount),
        category: form.category,
        expenseDate: form.expenseDate,
      });
      setSheetVisible(false);
      showToast(t('expenses.savedOffline'));
      return;
    }
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

  const { data: defaultExpenses = [] } = useQuery<DefaultExpense[]>({
    queryKey: ['defaultExpenses'],
    queryFn: () => expenseApi.getDefaults().then((r) => r.data.data),
    staleTime: 5 * 60 * 1000,
  });

  const cloneMutation = useMutation({
    mutationFn: (ids: string[]) => expenseApi.cloneDefaults(period.from.slice(0, 7), ids),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['expensesSummary'] });
      setPage(0);
      setCloneSheetVisible(false);
      showToast(t('expenses.cloneSuccess'));
    },
    onError: showErrorAlert,
  });

  const FILTER_CHIPS = useMemo(() => [
    { key: '' as const, label: t('expenses.filterAll') },
    { key: 'FIXED' as const, label: t('expenses.filterFixed') },
    { key: 'VARIABLE' as const, label: t('expenses.filterVariable') },
  ], [t]);

  const openAdd = useCallback(() => {
    navigation.navigate('ExpenseAdd', {
      existingNames: allExpenses.map((e) => e.description).filter(Boolean) as string[],
      monthFrom: period.from,
      monthTo: period.to,
    });
  }, [navigation, allExpenses, period.from, period.to]);

  const openEdit = useCallback((e: ExpenseData) => {
    setEditingExpense(e);
    setForm({
      description: e.description ?? '',
      amount: e.amount?.toString() ?? '',
      category: (e.category as ExpenseCategory) ?? 'OTHER',
      expenseDate: (e.expenseDate ?? todayIso()).slice(0, 10),
    });
    setCatExpanded(false);
    setSheetVisible(true);
  }, []);

  const handleDelete = useCallback((e: ExpenseData) => {
    showAlert(t('expenses.addSheet.deleteTitle'), t('expenses.addSheet.deleteMsg'), [
      { label: t('common.cancel'), style: 'cancel' },
      { label: t('expenses.addSheet.deleteConfirm'), style: 'destructive', onPress: () => deleteMutation.mutate(e.id) },
    ]);
  }, [showAlert, t, deleteMutation]);

  const handleClone = useCallback(() => {
    setSelectedDefaultIds(new Set(defaultExpenses.map((d) => d.id)));
    setCloneSheetVisible(true);
  }, [defaultExpenses]);

  const categoryLabel = useCallback((cat: string) =>
    t(`onboarding.step4.categories.${cat}`, { defaultValue: cat }), [t]);

  const categoryChipLabel = useCallback((cat: string) =>
    `${CATEGORY_EMOJI[cat] ?? '🏷️'}  ${categoryLabel(cat)}`, [categoryLabel]);

  const canSave =
    (form.description?.trim() ?? '').length > 0 &&
    Number(form.amount) > 0 &&
    /^\d{4}-\d{2}-\d{2}$/.test(form.expenseDate ?? '');

  const listHeader = useMemo(() => (
    <>
      {pendingExpenses.filter((e) => e.status === 'pending' || e.status === 'syncing').map((e) => (
        <View
          key={e.id}
          className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 mb-2 flex-row items-center gap-3"
        >
          <MaterialCommunityIcons name="clock-outline" size={18} color="#d97706" />
          <View className="flex-1">
            <Text className={`${typo.label} text-amber-800`} numberOfLines={1}>{e.description}</Text>
            <Text className={`${typo.caption} text-amber-600`}>{t('expenses.pendingSync')}</Text>
          </View>
          <Text className={`${typo.label} font-bold text-amber-800`}>{formatVnd(e.amount)}</Text>
        </View>
      ))}
      {chartData.length > 0 && (
        <View className="mb-3">
          <TrendChart
            data={chartData}
            color="#ef4444"
            granularity={chartGranularity}
            allowedGranularities={['day', 'week', 'month']}
            onGranularityChange={setChartGranularity}
            title={t('chart.expenseTitle')}
          />
        </View>
      )}

      {/* ── Fixed / Variable filter ── */}
      <View className="flex-row gap-2 mb-2">
        {FILTER_CHIPS.map((chip) => {
          const active = categoryFilter === chip.key;
          const count  = filterChipCounts[chip.key] ?? 0;
          return (
            <TouchableOpacity
              key={chip.key}
              onPress={() => handleCategoryFilter(chip.key)}
              className={`flex-row items-center gap-1.5 px-3.5 py-1.5 rounded-full border ${
                active
                  ? 'bg-indigo-600 border-indigo-600'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600'
              }`}
            >
              <Text className={`${typo.caption} font-medium ${active ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                {chip.label}
              </Text>
              {allExpenses.length > 0 && (
                <View className={`rounded-full px-1.5 py-0.5 min-w-[18px] items-center ${active ? 'bg-white/25' : 'bg-gray-100 dark:bg-gray-700'}`}>
                  <Text className={`${typo.captionBold} ${active ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`}>{count}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Category chips (dynamic — only categories present this month) ── */}
      {presentCategories.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingBottom: 8 }}
        >
          {presentCategories.map((cat) => {
            const active = selectedCategory === cat;
            const count  = catChipCounts[cat] ?? 0;
            return (
              <TouchableOpacity
                key={cat}
                onPress={() => handleCategorySelect(cat)}
                className={`flex-row items-center gap-1.5 rounded-full border px-3 py-1.5 ${
                  active
                    ? 'bg-indigo-600 border-indigo-600'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600'
                }`}
              >
                <Text className={typo.caption}>{CATEGORY_EMOJI[cat] ?? '🏷️'}</Text>
                <Text className={`${typo.caption} font-medium ${active ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                  {categoryLabel(cat)}
                </Text>
                <View className={`rounded-full px-1.5 py-0.5 min-w-[18px] items-center ${active ? 'bg-white/25' : 'bg-gray-100 dark:bg-gray-700'}`}>
                  <Text className={`${typo.captionBold} ${active ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`}>{count}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </>
  ), [pendingExpenses, chartData, chartGranularity, FILTER_CHIPS, categoryFilter, handleCategoryFilter,
      filterChipCounts, allExpenses.length, presentCategories, catChipCounts,
      selectedCategory, handleCategorySelect, categoryLabel, t, typo]);

  const hasAnyFilter = categoryFilter !== '' || selectedCategory !== '';
  const listEmpty = useMemo(() => (
    <View className="items-center justify-center px-8 py-12">
      <MaterialCommunityIcons name="receipt" size={56} color="#d1d5db" />
      <Text className={`${typo.body} text-gray-400 mt-4 text-center`}>{t('expenses.empty')}</Text>
      <Text className={`${typo.caption} text-gray-400 mt-1 text-center`}>
        {hasAnyFilter ? t('expenses.emptyFilter') : t('expenses.emptyHint')}
      </Text>
      {!hasAnyFilter && (
        <TouchableOpacity
          onPress={handleClone}
          disabled={cloneMutation.isPending}
          className="mt-4 border border-indigo-600 px-6 py-2.5 rounded-2xl"
        >
          <Text className={`${typo.label} text-indigo-600 font-semibold`}>{t('expenses.cloneDefaultsBtn')}</Text>
        </TouchableOpacity>
      )}
    </View>
  ), [hasAnyFilter, handleClone, cloneMutation.isPending, t, typo]);

  const renderItem = useCallback(({ item }: { item: ExpenseData }) => (
    <ExpenseRow
      item={item}
      onEdit={openEdit}
      onDelete={handleDelete}
      categoryLabel={categoryLabel}
      fixedCategories={FIXED_CATEGORIES}
      fixedLabel={t('expenses.fixed')}
      variableLabel={t('expenses.variable')}
    />
  ), [openEdit, handleDelete, categoryLabel, t]);

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <View
        className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4"
        style={{ paddingTop: insets.top + 12, paddingBottom: 0 }}
      >
        <View className="flex-row items-center justify-between mb-0.5">
          <Text className={`${typo.heading} text-gray-900 dark:text-white`}>{t('expenses.title')}</Text>
          <View className="flex-row items-center gap-3">
            <View className="flex-row items-center gap-1">
              <TouchableOpacity onPress={handleMonthPrev} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <MaterialCommunityIcons name="chevron-left" size={22} color="#6b7280" />
              </TouchableOpacity>
              <Text className={`${typo.label} text-gray-700 dark:text-gray-300 w-20 text-center`}>{period.label}</Text>
              <TouchableOpacity
                onPress={handleMonthNext}
                disabled={monthOffset >= 0}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MaterialCommunityIcons name="chevron-right" size={22} color={monthOffset >= 0 ? '#d1d5db' : '#6b7280'} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
        <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 mb-3 mt-0.5`}>{t('expenses.hint')}</Text>

        {/* Summary */}
        {summary && (
          <View className="flex-row gap-2 mb-3">
            <View className="flex-1 bg-gray-50 dark:bg-gray-700 rounded-xl p-2.5 items-center">
              <Text className={`${typo.labelBold} text-gray-900 dark:text-white`}>{formatVnd(summary.total)}</Text>
              <Text className={`${typo.caption} text-gray-500 dark:text-gray-400`}>{t('expenses.total')}</Text>
            </View>
            <View className="flex-1 bg-gray-50 dark:bg-gray-700 rounded-xl p-2.5 items-center">
              <Text className={`${typo.labelBold} text-blue-600`}>{formatVnd(summary.fixed)}</Text>
              <Text className={`${typo.caption} text-gray-500 dark:text-gray-400`}>{t('expenses.fixed')}</Text>
            </View>
            <View className="flex-1 bg-gray-50 dark:bg-gray-700 rounded-xl p-2.5 items-center">
              <Text className={`${typo.labelBold} text-amber-600`}>{formatVnd(summary.variable)}</Text>
              <Text className={`${typo.caption} text-gray-500 dark:text-gray-400`}>{t('expenses.variable')}</Text>
            </View>
          </View>
        )}

        <View style={{ paddingBottom: 12 }} />
      </View>

      {isLoading && page === 0 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#4f46e5" />
        </View>
      ) : (
        <FlatList
          data={displayedExpenses}
          keyExtractor={(e) => e.id}
          contentContainerStyle={{ padding: 4, gap: 8, paddingBottom: insets.bottom + 80 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#059669" />
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
          ListHeaderComponent={listHeader}
          ListEmptyComponent={listEmpty}
          renderItem={renderItem}
        />
      )}
      {/* FAB */}
      <TouchableOpacity
        testID="expense-add-fab"
        onPress={openAdd}
        className="absolute right-5 bg-indigo-600 rounded-full w-14 h-14 items-center justify-center shadow-lg"
        style={{ bottom: insets.bottom + 16 }}
      >
        <MaterialCommunityIcons name="plus" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Clone Selection Sheet */}
      <Modal visible={cloneSheetVisible} animationType="slide" transparent onRequestClose={() => setCloneSheetVisible(false)}>
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-white dark:bg-gray-800 rounded-t-3xl px-6 pt-6" style={{ maxHeight: '80%', paddingBottom: insets.bottom + 16 }}>
            <View className="flex-row items-center justify-between mb-1">
              <Text className={`${typo.section} text-gray-900 dark:text-white`}>{t('expenses.cloneSelectTitle')}</Text>
              <TouchableOpacity onPress={() => setCloneSheetVisible(false)}>
                <MaterialCommunityIcons name="close" size={22} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <Text className={`${typo.caption} text-gray-400 mb-4`}>{t('expenses.cloneSelectHint')}</Text>

            {/* Select all / deselect all */}
            <TouchableOpacity
              onPress={() => setSelectedDefaultIds(
                selectedDefaultIds.size === defaultExpenses.length
                  ? new Set()
                  : new Set(defaultExpenses.map((d) => d.id))
              )}
              className="flex-row items-center gap-2 mb-3"
            >
              <MaterialCommunityIcons
                name={selectedDefaultIds.size === defaultExpenses.length ? 'checkbox-marked' : 'checkbox-blank-outline'}
                size={20}
                color="#4f46e5"
              />
              <Text className={`${typo.label} text-indigo-600`}>
                {selectedDefaultIds.size === defaultExpenses.length ? t('expenses.deselectAll') : t('expenses.selectAll')}
              </Text>
            </TouchableOpacity>

            <ScrollView showsVerticalScrollIndicator={false} className="mb-4">
              {defaultExpenses.map((def) => {
                const selected = selectedDefaultIds.has(def.id);
                return (
                  <TouchableOpacity
                    key={def.id}
                    onPress={() => setSelectedDefaultIds((prev) => {
                      const next = new Set(prev);
                      selected ? next.delete(def.id) : next.add(def.id);
                      return next;
                    })}
                    className="flex-row items-center gap-3 py-3 border-b border-gray-100 dark:border-gray-700"
                  >
                    <MaterialCommunityIcons
                      name={selected ? 'checkbox-marked' : 'checkbox-blank-outline'}
                      size={22}
                      color={selected ? '#4f46e5' : '#9ca3af'}
                    />
                    <View className="flex-1">
                      <Text className={`${typo.label} text-gray-900 dark:text-white`} numberOfLines={1}>
                        {def.description}
                      </Text>
                      <Text className={`${typo.caption} text-gray-400`}>
                        {def.categoryDisplayName} · {formatVnd(def.amount)}
                        {def.paymentDay ? ` · ngày ${def.paymentDay}` : ''}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              onPress={() => cloneMutation.mutate(Array.from(selectedDefaultIds))}
              disabled={cloneMutation.isPending || selectedDefaultIds.size === 0}
              className={`rounded-2xl py-4 items-center ${cloneMutation.isPending || selectedDefaultIds.size === 0 ? 'bg-gray-200 dark:bg-gray-700' : 'bg-indigo-600'}`}
            >
              {cloneMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className={`${typo.labelBold} ${selectedDefaultIds.size === 0 ? 'text-gray-400' : 'text-white'}`}>
                  {t('expenses.cloneDefaultsBtn')} ({selectedDefaultIds.size})
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Add/Edit Sheet */}
      <Modal visible={sheetVisible} animationType="slide" transparent onRequestClose={() => setSheetVisible(false)}>
        <KeyboardAvoidingView className="flex-1 justify-end" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View key={editingExpense?.id ?? 'new'} className="bg-white dark:bg-gray-800 rounded-t-3xl px-6 pt-6" style={{ maxHeight: '90%', paddingBottom: insets.bottom + 16 }}>
            {/* Header */}
            <View className="flex-row items-center justify-between mb-3">
              <Text className={`${typo.section} text-gray-900 dark:text-white`}>
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
                  <Text className={`${typo.caption} text-gray-400 dark:text-gray-500 flex-1 leading-4`}>
                    {t(key)}
                  </Text>
                </View>
              ))}
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Description */}
              <Text className={`${typo.captionBold} text-gray-500 dark:text-gray-400 mb-1.5`}>{t('expenses.addSheet.nameLabel')}</Text>
              <View className="mb-3">
                <ClearableInput
                  ref={descRef}
                  testID="expense-desc-input"
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
              <Text className={`${typo.captionBold} text-gray-500 dark:text-gray-400 mb-1.5`}>{t('expenses.addSheet.amountLabel')}</Text>
              <View className="mb-3">
                <MoneyInput
                  ref={amountRef}
                  testID="expense-amount-input"
                  rawValue={form.amount}
                  onChangeRaw={(v) => setForm((f) => ({ ...f, amount: v }))}
                  placeholder={t('expenses.addSheet.amountPlaceholder')}
                  returnKeyType="done"
                />
              </View>

              {/* Category */}
              <Text className={`${typo.captionBold} text-gray-500 dark:text-gray-400 mb-1.5`}>{t('expenses.addSheet.categoryLabel')}</Text>
              <TouchableOpacity
                onPress={() => setCatExpanded((v) => !v)}
                className="flex-row items-center justify-between border border-indigo-200 dark:border-indigo-700 rounded-xl px-4 py-3 bg-indigo-50 dark:bg-indigo-900/20 mb-1"
              >
                <Text className={`${typo.label} text-indigo-700 dark:text-indigo-300`}>{categoryChipLabel(form.category)}</Text>
                <MaterialCommunityIcons name={catExpanded ? 'chevron-up' : 'chevron-down'} size={20} color="#818cf8" />
              </TouchableOpacity>
              {catExpanded && (
                <View className="border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 mb-3 overflow-hidden">
                  <View className="flex-row flex-wrap gap-2 p-3">
                    {orderedCategories.map((cat) => {
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
                          <Text className={`${typo.label} mr-1.5`}>
                            {CATEGORY_EMOJI[cat] ?? '🏷️'}
                          </Text>
                          <Text className={`${typo.caption} font-medium ${active ? 'text-indigo-600 dark:text-indigo-300' : 'text-gray-700 dark:text-gray-200'}`}>
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
              <Text className={`${typo.captionBold} text-gray-500 dark:text-gray-400 mb-1.5`}>{t('expenses.addSheet.dateLabel')}</Text>
              <View className="border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 bg-gray-50 dark:bg-gray-700 mb-4">
                <DatePickerInput
                  value={form.expenseDate}
                  onChange={(v) => setForm((f) => ({ ...f, expenseDate: v }))}
                  maximumDate={new Date()}
                />
              </View>

              {/* Save */}
              <TouchableOpacity
                testID="expense-save-btn"
                onPress={handleSave}
                disabled={saveMutation.isPending || !canSave}
                className={`rounded-2xl py-4 items-center mb-2 ${saveMutation.isPending || !canSave ? 'bg-gray-200 dark:bg-gray-700' : 'bg-indigo-600 active:opacity-80'}`}
              >
                {saveMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className={`${typo.labelBold} ${!canSave ? 'text-gray-400' : 'text-white'}`}>
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
