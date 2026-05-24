import { useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import type { TextInput as RNTextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAlertStore } from '../../store/alertStore';
import { useToastStore } from '../../store/toastStore';
import { useErrorAlert } from '../../hooks/useErrorAlert';
import { useAuthStore } from '../../store/authStore';
import { expenseApi, tenantApi, type DefaultExpense } from '../../services/api';
import { formatVnd } from '../../utils/format';
import { useTypography } from '../../hooks/useTypography';
import { ClearableInput } from '../../components/ClearableInput';
import { MoneyInput } from '../../components/MoneyInput';
import {
  EXPENSE_CATEGORIES,
  CATEGORY_EMOJI,
  FIXED_CATEGORIES,
  FB_SHOP_TYPES,
  FB_CATEGORY_ORDER,
  type ExpenseCategory,
} from '../../constants/expenseCategories';
import type { SettingsScreenProps } from '../../types/navigation';

// ── Types ─────────────────────────────────────────────────────────────────────

type FormState = {
  description: string;
  amount: string;
  category: ExpenseCategory;
  paymentDay: number | null; // 1-28, null = no fixed day
};

const EMPTY_FORM: FormState = {
  description: '',
  amount: '',
  category: 'OTHER',
  paymentDay: null,
};

type Suggestion = { name: string; nameEn?: string; emoji: string; category?: string };

// ── Day picker ────────────────────────────────────────────────────────────────

const DAYS = Array.from({ length: 28 }, (_, i) => i + 1);

function DayPicker({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (day: number | null) => void;
}) {
  const { t } = useTranslation();
  const typo = useTypography();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 6, paddingRight: 4 }}
      keyboardShouldPersistTaps="handled"
    >
      {/* "No date" chip */}
      <TouchableOpacity
        onPress={() => onChange(null)}
        activeOpacity={0.7}
        className={`rounded-xl px-3 py-2 border ${
          value === null
            ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-600'
            : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600'
        }`}
      >
        <Text
          className={`${typo.caption} font-medium ${
            value === null
              ? 'text-indigo-600 dark:text-indigo-300'
              : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          {t('settings.defaultExpenses.noFixedDay')}
        </Text>
      </TouchableOpacity>

      {DAYS.map((d) => {
        const isSelected = value === d;
        return (
          <TouchableOpacity
            key={d}
            onPress={() => onChange(isSelected ? null : d)}
            activeOpacity={0.7}
            className={`w-10 h-10 rounded-xl items-center justify-center border ${
              isSelected
                ? 'bg-indigo-600 border-indigo-600'
                : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600'
            }`}
          >
            <Text
              className={`${typo.caption} font-semibold ${
                isSelected ? 'text-white' : 'text-gray-700 dark:text-gray-200'
              }`}
            >
              {d}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export function DefaultExpensesScreen({ navigation }: SettingsScreenProps<'DefaultExpenses'>) {
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const typo = useTypography();
  const qc = useQueryClient();
  const { show: showAlert } = useAlertStore();
  const { show: showToast } = useToastStore();
  const showErrorAlert = useErrorAlert();
  const { shopTypeCode } = useAuthStore();

  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<DefaultExpense | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const amountRef = useRef<RNTextInput>(null);

  // ── Queries ──────────────────────────────────────────────────────────────────

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['defaultExpenses'],
    queryFn: () => expenseApi.getDefaults().then((r) => r.data.data),
    staleTime: 5 * 60_000,
  });

  const { data: suggestions = [] } = useQuery({
    queryKey: ['expense-suggestions', shopTypeCode],
    queryFn: () =>
      tenantApi.getExpenseSuggestions(shopTypeCode ?? 'OTHER').then((r) => r.data.data as Suggestion[]),
    staleTime: 10 * 60_000,
  });

  // Filter out suggestions that are already in the defaults list
  const existingNames = new Set(items.map((i) => i.description));
  const availableChips = suggestions.filter(
    (s) => !existingNames.has(s.name) || editing?.description === s.name,
  );

  // Ordered categories (F&B shops get their order, others get default order)
  const orderedCategories: ExpenseCategory[] = shopTypeCode && FB_SHOP_TYPES.includes(shopTypeCode)
    ? (FB_CATEGORY_ORDER as ExpenseCategory[])
    : (EXPENSE_CATEGORIES as unknown as ExpenseCategory[]);

  // ── Mutations ────────────────────────────────────────────────────────────────

  const addMutation = useMutation({
    mutationFn: () =>
      expenseApi.createDefault({
        description: form.description.trim(),
        amount: Number(form.amount.replace(/\D/g, '')) || 0,
        category: form.category,
        paymentDay: form.paymentDay,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['defaultExpenses'] });
      showToast(t('settings.defaultExpenses.saveSuccess'));
      setModalVisible(false);
    },
    onError: showErrorAlert,
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      expenseApi.updateDefault(editing!.id, {
        description: form.description.trim(),
        amount: Number(form.amount.replace(/\D/g, '')) || 0,
        category: form.category,
        paymentDay: form.paymentDay,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['defaultExpenses'] });
      showToast(t('settings.defaultExpenses.saveSuccess'));
      setModalVisible(false);
    },
    onError: showErrorAlert,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => expenseApi.deleteDefault(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['defaultExpenses'] });
      showToast(t('settings.defaultExpenses.deleteSuccess'));
    },
    onError: showErrorAlert,
  });

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalVisible(true);
  };

  const openEdit = (item: DefaultExpense) => {
    setEditing(item);
    setForm({
      description: item.description,
      amount: item.amount.toString(),
      category: (item.category as ExpenseCategory) || 'OTHER',
      paymentDay: item.paymentDay ?? null,
    });
    setModalVisible(true);
  };

  const handleDelete = (item: DefaultExpense) => {
    showAlert(t('settings.defaultExpenses.deleteTitle'), t('settings.defaultExpenses.deleteMsg'), [
      { label: t('common.cancel'), style: 'cancel' },
      {
        label: t('settings.defaultExpenses.deleteConfirm'),
        style: 'destructive',
        onPress: () => deleteMutation.mutate(item.id),
      },
    ]);
  };

  const handleChipPress = (s: Suggestion) => {
    setForm((f) => ({
      ...f,
      description: s.name,
      category: (s.category as ExpenseCategory) ?? 'OTHER',
    }));
    setTimeout(() => amountRef.current?.focus(), 50);
  };

  const handleSave = () => {
    if (!form.description.trim()) return;
    if (editing) updateMutation.mutate();
    else addMutation.mutate();
  };

  const isPending = addMutation.isPending || updateMutation.isPending;
  const canSave = form.description.trim().length > 0;

  const categoryLabel = (cat: string) =>
    t(`onboarding.step4.categories.${cat}`, { defaultValue: cat });

  // ── List item card ────────────────────────────────────────────────────────────

  const renderItem = (item: DefaultExpense) => {
    const emoji   = CATEGORY_EMOJI[item.category] ?? '🏷️';
    const catName = categoryLabel(item.category ?? 'OTHER');
    const isFixed = FIXED_CATEGORIES.has(item.category);

    return (
      <TouchableOpacity
        key={item.id}
        onPress={() => openEdit(item)}
        activeOpacity={0.7}
        className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden"
      >
        <View className="px-4 pt-3.5 pb-3 flex-row items-start gap-3">
          {/* Emoji badge */}
          <View className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 items-center justify-center flex-shrink-0 mt-0.5">
            <Text className={typo.section}>{emoji}</Text>
          </View>

          {/* Main content */}
          <View className="flex-1 min-w-0">
            <Text
              className={`${typo.caption} font-semibold text-gray-900 dark:text-white`}
              numberOfLines={1}
            >
              {item.description}
            </Text>
            <Text className={`${typo.body} text-indigo-600 dark:text-indigo-400 mt-0.5`}>
              {formatVnd(item.amount)}
            </Text>

            {/* Chip row */}
            <View className="flex-row flex-wrap gap-1.5 mt-2">
              {/* Category chip */}
              <View className="flex-row items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-full px-2 py-0.5">
                <Text className={typo.caption}>{emoji}</Text>
                <Text className={`${typo.caption} text-gray-600 dark:text-gray-300`}>
                  {catName}
                </Text>
              </View>

              {/* Fixed / Variable chip */}
              <View
                className={`flex-row items-center gap-1 rounded-full px-2 py-0.5 ${
                  isFixed
                    ? 'bg-blue-50 dark:bg-blue-900/30'
                    : 'bg-amber-50 dark:bg-amber-900/30'
                }`}
              >
                <MaterialCommunityIcons
                  name={isFixed ? 'lock-outline' : 'sync'}
                  size={10}
                  color={isFixed ? '#3b82f6' : '#d97706'}
                />
                <Text
                  className={`${typo.caption} font-semibold`}
                  style={{ color: isFixed ? '#3b82f6' : '#d97706' }}
                >
                  {t(isFixed ? 'expenses.filterFixed' : 'expenses.filterVariable')}
                </Text>
              </View>

              {/* Payment day chip */}
              {item.paymentDay != null && (
                <View className="flex-row items-center gap-1 bg-indigo-50 dark:bg-indigo-900/30 rounded-full px-2 py-0.5">
                  <MaterialCommunityIcons name="calendar-outline" size={10} color="#4f46e5" />
                  <Text className={`${typo.caption} font-semibold`} style={{ color: '#4f46e5' }}>
                    {t('settings.defaultExpenses.paymentDateHint', { day: item.paymentDay })}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Actions */}
          <TouchableOpacity
            onPress={() => handleDelete(item)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            className="mt-0.5"
          >
            <MaterialCommunityIcons name="trash-can-outline" size={18} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <View
        className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4"
        style={{ paddingTop: insets.top + 12, paddingBottom: 12 }}
      >
        <View className="flex-row items-center mb-0.5">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            className="mr-3"
          >
            <MaterialCommunityIcons name="chevron-left" size={26} color="#4f46e5" />
          </TouchableOpacity>
          <Text className={`${typo.heading} text-gray-900 dark:text-white flex-1`}>
            {t('settings.defaultExpenses.title')}
          </Text>
          <TouchableOpacity onPress={openAdd} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialCommunityIcons name="plus" size={24} color="#4f46e5" />
          </TouchableOpacity>
        </View>
        <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 mt-0.5`}>
          {t('settings.defaultExpenses.screenHint')}
        </Text>
      </View>

      {/* List */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#4f46e5" />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 4, gap: 10 }}
        >
          <View className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-3 flex-row items-start gap-2">
            <MaterialCommunityIcons
              name="information-outline"
              size={16}
              color="#4f46e5"
              style={{ marginTop: 1 }}
            />
            <Text className={`${typo.caption} text-indigo-700 dark:text-indigo-400 flex-1`}>
              {t('settings.defaultExpenses.hint')}
            </Text>
          </View>

          {items.length === 0 ? (
            <View className="items-center py-12">
              <MaterialCommunityIcons name="cash-remove" size={56} color="#d1d5db" />
              <Text className={`${typo.body} text-gray-400 mt-4 text-center`}>
                {t('settings.defaultExpenses.empty')}
              </Text>
              <Text className={`${typo.caption} text-gray-400 mt-1 text-center px-4`}>
                {t('settings.defaultExpenses.emptyHint')}
              </Text>
              <TouchableOpacity
                onPress={openAdd}
                className="mt-6 bg-indigo-600 px-6 py-3 rounded-2xl"
              >
                <Text className={`${typo.label} text-white`}>
                  {t('settings.defaultExpenses.addBtn')}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            items.map(renderItem)
          )}
        </ScrollView>
      )}

      {/* ── Add / Edit Modal ──────────────────────────────────────────────────── */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          className="flex-1 justify-end"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Backdrop */}
          <TouchableOpacity
            className="absolute inset-0 bg-black/40"
            activeOpacity={1}
            onPress={() => setModalVisible(false)}
          />

          <View
            className="bg-white dark:bg-gray-800 rounded-t-3xl"
            style={{ paddingBottom: insets.bottom + 8 }}
          >
            {/* Modal header */}
            <View className="flex-row items-center px-5 pt-5 pb-3 border-b border-gray-100 dark:border-gray-700">
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                className="mr-3"
              >
                <MaterialCommunityIcons name="close" size={22} color="#6b7280" />
              </TouchableOpacity>
              <Text className={`${typo.section} text-gray-900 dark:text-white flex-1`}>
                {editing
                  ? t('settings.defaultExpenses.editTitle')
                  : t('settings.defaultExpenses.formTitle')}
              </Text>
              <TouchableOpacity
                onPress={handleSave}
                disabled={isPending || !canSave}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                {isPending ? (
                  <ActivityIndicator size="small" color="#4f46e5" />
                ) : (
                  <Text
                    className={`${typo.labelBold} ${
                      canSave
                        ? 'text-indigo-600 dark:text-indigo-400'
                        : 'text-gray-300 dark:text-gray-600'
                    }`}
                  >
                    {t('common.save')}
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ gap: 20, paddingTop: 16, paddingBottom: 8 }}
            >
              {/* ── Suggestion chips ────────────────────────────────────────── */}
              {availableChips.length > 0 && (
                <View>
                  <Text className={`${typo.captionBold} text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2 px-5`}>
                    {t('expenses.addScreen.suggestions')}
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
                    keyboardShouldPersistTaps="handled"
                  >
                    {availableChips.map((s) => {
                      const isSelected = form.description === s.name;
                      return (
                        <TouchableOpacity
                          key={s.name}
                          onPress={() => handleChipPress(s)}
                          activeOpacity={0.7}
                          className={`flex-row items-center rounded-full border px-3 py-1.5 ${
                            isSelected
                              ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-300 dark:border-indigo-600'
                              : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                          }`}
                        >
                          <Text className={`${typo.caption} mr-1.5`}>{s.emoji}</Text>
                          <Text
                            className={`${typo.caption} font-medium ${
                              isSelected
                                ? 'text-indigo-600 dark:text-indigo-300'
                                : 'text-gray-700 dark:text-gray-200'
                            }`}
                          >
                            {i18n.language === 'en' ? (s.nameEn || s.name) : s.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              {/* ── Name ───────────────────────────────────────────────────── */}
              <View className="px-5">
                <Text className={`${typo.captionBold} text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2`}>
                  {t('settings.defaultExpenses.nameLabel')}
                </Text>
                <ClearableInput
                  value={form.description}
                  onChangeText={(v) => setForm((f) => ({ ...f, description: v }))}
                  onClear={() => setForm((f) => ({ ...f, description: '' }))}
                  placeholder={t('settings.defaultExpenses.namePlaceholder')}
                  autoCapitalize="sentences"
                  returnKeyType="next"
                  onSubmitEditing={() => amountRef.current?.focus()}
                />
              </View>

              {/* ── Category ────────────────────────────────────────────────── */}
              <View>
                <Text className={`${typo.captionBold} text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 px-5`}>
                  {t('expenses.addSheet.categoryLabel')}
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
                  keyboardShouldPersistTaps="handled"
                >
                  {orderedCategories.map((cat) => {
                    const isSelected = form.category === cat;
                    return (
                      <TouchableOpacity
                        key={cat}
                        onPress={() => setForm((f) => ({ ...f, category: cat }))}
                        activeOpacity={0.7}
                        className={`flex-row items-center rounded-2xl border px-3 py-2 gap-1.5 ${
                          isSelected
                            ? 'bg-indigo-600 border-indigo-600'
                            : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                        }`}
                      >
                        <Text className={typo.label}>{CATEGORY_EMOJI[cat] ?? '🏷️'}</Text>
                        <Text
                          className={`${typo.caption} font-semibold ${
                            isSelected ? 'text-white' : 'text-gray-700 dark:text-gray-200'
                          }`}
                        >
                          {categoryLabel(cat)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* ── Amount ──────────────────────────────────────────────────── */}
              <View className="px-5">
                <Text className={`${typo.captionBold} text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2`}>
                  {t('settings.defaultExpenses.amountLabel')}
                </Text>
                <MoneyInput
                  ref={amountRef}
                  rawValue={form.amount}
                  onChangeRaw={(v) => setForm((f) => ({ ...f, amount: v }))}
                  placeholder={t('settings.defaultExpenses.amountPlaceholder')}
                  returnKeyType="done"
                />
              </View>

              {/* ── Payment day ──────────────────────────────────────────────── */}
              <View>
                <View className="flex-row items-center justify-between px-5 mb-2">
                  <Text className={`${typo.captionBold} text-gray-500 dark:text-gray-400 uppercase tracking-wide`}>
                    {t('settings.defaultExpenses.paymentDateLabel')}
                  </Text>
                  {form.paymentDay !== null && (
                    <Text className={`${typo.caption} text-indigo-600 dark:text-indigo-400 font-medium`}>
                      {t('settings.defaultExpenses.paymentDateHint', { day: form.paymentDay })}
                    </Text>
                  )}
                </View>
                <View className="px-5">
                  <DayPicker
                    value={form.paymentDay}
                    onChange={(day) => setForm((f) => ({ ...f, paymentDay: day }))}
                  />
                </View>
                <Text className={`${typo.caption} text-gray-400 dark:text-gray-500 mt-1.5 px-5`}>
                  {t('settings.defaultExpenses.paymentDateHelpText')}
                </Text>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
