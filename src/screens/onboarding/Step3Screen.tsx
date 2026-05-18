import { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SectionList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { tenantApi } from '../../services/api';
import { useOnboardingStore } from '../../store/onboardingStore';
import { OnboardingHeader } from './OnboardingHeader';
import { MoneyInput } from '../../components/MoneyInput';
import { ClearableInput } from '../../components/ClearableInput';
import { formatVnd } from '../../utils/format';
import { getBackendCode } from '../../utils/shopTypes';
import { useOnboardingFlow } from '../../hooks/useOnboardingFlow';
import { useTypography } from '../../hooks/useTypography';
import type { OnboardingScreenProps } from '../../types/navigation';
import type { OnboardingExpense } from '../../store/onboardingStore';

export const CATEGORY_EMOJI: Record<string, string> = {
  RENT: '🏠', ELECTRICITY: '⚡', WATER: '💧', INTERNET: '📶',
  PHONE: '📱', SALARY_EXTRA: '👥', CLEANING: '🧹', MAINTENANCE: '🔩',
  SOFTWARE: '💻', MARKETING: '📣', BANK_FEE: '🏦', INSURANCE: '🛡️',
  TAX: '🏛️', EQUIPMENT: '🎥', SUPPLIES: '🖨️', OTHER: '💰',
  FOOD_STAFF: '🍱', PACKAGING: '📦', TRANSPORT: '🚚',
};

type Suggestion = { name: string; nameEn?: string; emoji: string; category?: string };

// ── Expense edit / add sheet ──────────────────────────────────────────────────

const DAY_NUMBERS = Array.from({ length: 31 }, (_, i) => i + 1);

type SheetValues = {
  name: string;
  rawAmount: string;
  expenseType: 'FIXED' | 'VARIABLE';
  paymentDay: number | undefined;
  note: string;
  category: string;
  isCustom: boolean;
};

function ExpenseEditSheet({
  values,
  onClose,
  onSave,
}: {
  values: SheetValues | null;
  onClose: () => void;
  onSave: (data: {
    name: string;
    monthlyAmount: number;
    expenseType: 'FIXED' | 'VARIABLE';
    paymentDate: number | undefined;
    note: string;
    category: string;
  }) => void;
}) {
  const { t } = useTranslation();
  const typo = useTypography();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState('');
  const [rawAmount, setRawAmount] = useState('');
  const [expenseType, setExpenseType] = useState<'FIXED' | 'VARIABLE'>('FIXED');
  const [paymentDay, setPaymentDay] = useState<number | undefined>(undefined);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (values) {
      setName(values.name);
      setRawAmount(values.rawAmount);
      setExpenseType(values.expenseType);
      setPaymentDay(values.paymentDay);
      setNote(values.note);
    }
  }, [values]);

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave({
      name: trimmed,
      monthlyAmount: rawAmount ? parseInt(rawAmount, 10) : 0,
      expenseType,
      paymentDate: paymentDay,
      note: note.trim(),
      category: values?.category ?? 'OTHER',
    });
  };

  const isAdd = values?.isCustom && !values.name;

  return (
    <Modal visible={!!values} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        className="flex-1 justify-end"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity className="flex-1" activeOpacity={1} onPress={onClose} />

        <View
          className="bg-white dark:bg-gray-900 rounded-t-3xl overflow-hidden"
          style={{ paddingBottom: insets.bottom + 8 }}
        >
          {/* Handle */}
          <View className="items-center pt-3 pb-0">
            <View className="w-10 h-1 rounded-full bg-gray-200 dark:bg-gray-700" />
          </View>

          {/* Header */}
          <View className="flex-row items-center justify-between px-5 pt-3 pb-3 border-b border-gray-100 dark:border-gray-800">
            <View className="flex-row items-center gap-2">
              {values?.category ? (
                <Text style={{ fontSize: 20 }}>{CATEGORY_EMOJI[values.category] ?? '💰'}</Text>
              ) : null}
              <Text className={`${typo.section} text-gray-900 dark:text-white`}>
                {isAdd ? t('onboarding.step3.addExpense') : t('onboarding.step3.editExpense')}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialCommunityIcons name="close" size={22} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <ScrollView
            className="px-5 pt-4"
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 8 }}
          >
            {/* Name (editable for custom, read-only for suggestions) */}
            {values?.isCustom ? (
              <View className="mb-4">
                <Text className={`${typo.captionBold} text-gray-500 dark:text-gray-400 mb-1.5`}>
                  {t('onboarding.step3.nameLabel')}
                </Text>
                <ClearableInput
                  value={name}
                  onChangeText={setName}
                  onClear={() => setName('')}
                  placeholder={t('onboarding.step3.namePlaceholder')}
                  autoCapitalize="sentences"
                  autoFocus={isAdd}
                />
              </View>
            ) : (
              <View className="mb-4 px-3 py-2.5 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <Text className={`${typo.caption} text-gray-400 dark:text-gray-500 mb-0.5`}>
                  {t('onboarding.step3.nameLabel')}
                </Text>
                <Text className={`${typo.label} text-gray-800 dark:text-white font-medium`} numberOfLines={2}>
                  {name}
                </Text>
              </View>
            )}

            {/* Amount */}
            <View className="mb-4">
              <Text className={`${typo.captionBold} text-gray-500 dark:text-gray-400 mb-1.5`}>
                {t('onboarding.step3.amountLabel')}
              </Text>
              <MoneyInput
                rawValue={rawAmount}
                onChangeRaw={setRawAmount}
                placeholder={t('onboarding.step3.amountPlaceholder')}
                autoFocus={!isAdd && !values?.isCustom}
              />
            </View>

            {/* Expense type */}
            <View className="mb-4">
              <Text className={`${typo.captionBold} text-gray-500 dark:text-gray-400 mb-1.5`}>
                {t('onboarding.step3.typeLabel')}
              </Text>
              <View className="flex-row gap-2">
                {(['FIXED', 'VARIABLE'] as const).map((type) => {
                  const active = expenseType === type;
                  return (
                    <TouchableOpacity
                      key={type}
                      onPress={() => setExpenseType(type)}
                      className={`flex-1 py-2.5 rounded-xl border items-center ${
                        active
                          ? type === 'FIXED'
                            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
                            : 'bg-orange-50 dark:bg-orange-900/20 border-orange-300 dark:border-orange-700'
                          : 'bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-700'
                      }`}
                    >
                      <Text
                        className={`${typo.label} font-semibold ${
                          active
                            ? type === 'FIXED'
                              ? 'text-blue-600 dark:text-blue-400'
                              : 'text-orange-600 dark:text-orange-400'
                            : 'text-gray-400 dark:text-gray-500'
                        }`}
                      >
                        {t(`onboarding.step3.type.${type}`)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Payment day */}
            <View className="mb-4">
              <Text className={`${typo.captionBold} text-gray-500 dark:text-gray-400 mb-1.5`}>
                {t('onboarding.step3.paymentDayLabel')}
              </Text>
              <View className="flex-row flex-wrap gap-1.5">
                {DAY_NUMBERS.map((day) => {
                  const active = paymentDay === day;
                  return (
                    <TouchableOpacity
                      key={day}
                      onPress={() => setPaymentDay(active ? undefined : day)}
                      className={`rounded-lg items-center justify-center ${
                        active
                          ? 'bg-indigo-600'
                          : 'bg-gray-100 dark:bg-gray-700'
                      }`}
                      style={{ width: 36, height: 36 }}
                    >
                      <Text
                        className={`${typo.caption} font-semibold ${
                          active ? 'text-white' : 'text-gray-600 dark:text-gray-300'
                        }`}
                      >
                        {day}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {paymentDay && (
                <TouchableOpacity
                  onPress={() => setPaymentDay(undefined)}
                  hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                  className="mt-1.5 self-start"
                >
                  <Text className={`${typo.caption} text-gray-400 dark:text-gray-500`}>
                    {t('onboarding.step3.clearDay')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Note */}
            <View className="mb-2">
              <Text className={`${typo.captionBold} text-gray-500 dark:text-gray-400 mb-1.5`}>
                {t('onboarding.step3.noteLabel')}
              </Text>
              <ClearableInput
                value={note}
                onChangeText={setNote}
                onClear={() => setNote('')}
                placeholder={t('onboarding.step3.notePlaceholder')}
                autoCapitalize="sentences"
              />
            </View>
          </ScrollView>

          {/* Action buttons */}
          <View className="flex-row gap-3 px-5 pt-3 border-t border-gray-100 dark:border-gray-800">
            <TouchableOpacity
              onPress={onClose}
              className="flex-1 border border-gray-200 dark:border-gray-700 rounded-2xl py-3.5 items-center"
            >
              <Text className={`${typo.labelBold} text-gray-600 dark:text-gray-300`}>
                {t('common.cancel')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSave}
              disabled={!!values?.isCustom && !name.trim()}
              className={`rounded-2xl py-3.5 items-center ${
                !values?.isCustom || name.trim() ? 'bg-primary' : 'bg-gray-100 dark:bg-gray-700'
              }`}
              style={{ flex: 2 }}
            >
              <Text
                className={`${typo.labelBold} ${
                  !values?.isCustom || name.trim() ? 'text-white' : 'text-gray-400 dark:text-gray-500'
                }`}
              >
                {t('common.save')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Expense row ───────────────────────────────────────────────────────────────

function ExpenseRow({
  expense,
  suggestion,
  isSelected,
  onToggle,
  onEdit,
}: {
  expense: OnboardingExpense | null;
  suggestion: Suggestion;
  isSelected: boolean;
  onToggle: () => void;
  onEdit: () => void;
}) {
  const typo = useTypography();
  const { t } = useTranslation();
  const emoji = suggestion.emoji || CATEGORY_EMOJI[suggestion.category ?? ''] || '💰';

  return (
    <View className="flex-row items-center px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-50 dark:border-gray-700">
      {/* Left: checkbox + info (tap to toggle) */}
      <TouchableOpacity
        onPress={onToggle}
        activeOpacity={0.7}
        className="flex-1 flex-row items-center min-w-0"
      >
        <MaterialCommunityIcons
          name={isSelected ? 'checkbox-marked' : 'checkbox-blank-outline'}
          size={22}
          color={isSelected ? '#4f46e5' : '#d1d5db'}
          style={{ marginRight: 12 }}
        />
        <Text style={{ fontSize: 18 }}>{emoji}</Text>
        <View className="flex-1 ml-2 min-w-0">
          <Text
            className={`${typo.caption} font-medium ${
              isSelected ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-600'
            }`}
            numberOfLines={1}
          >
            {suggestion.name}
          </Text>
          {isSelected && (
            <View className="flex-row items-center flex-wrap mt-0.5 gap-x-1.5">
              {expense?.monthlyAmount && expense.monthlyAmount > 0 ? (
                <Text className={`${typo.caption} text-indigo-600 dark:text-indigo-400 font-medium`}>
                  {formatVnd(expense.monthlyAmount)}
                </Text>
              ) : (
                <Text className={`${typo.caption} text-gray-300 dark:text-gray-600`}>
                  {t('onboarding.step3.noPriceHint')}
                </Text>
              )}
              {expense?.expenseType && (
                <Text
                  className={`${typo.caption} font-medium ${
                    expense.expenseType === 'FIXED'
                      ? 'text-blue-500 dark:text-blue-400'
                      : 'text-orange-500 dark:text-orange-400'
                  }`}
                >
                  · {t(`onboarding.step3.type.${expense.expenseType}`)}
                </Text>
              )}
              {expense?.paymentDate && (
                <Text className={`${typo.caption} text-gray-400 dark:text-gray-500`}>
                  · {t('onboarding.step3.paymentDateChip', { day: expense.paymentDate })}
                </Text>
              )}
            </View>
          )}
        </View>
      </TouchableOpacity>

      {/* Right: edit button (only when selected) */}
      {isSelected && (
        <TouchableOpacity
          onPress={onEdit}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
          className="flex-row items-center gap-1 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 px-2.5 py-1.5 rounded-xl ml-2 shrink-0"
        >
          <MaterialCommunityIcons name="pencil-outline" size={13} color="#4f46e5" />
          <Text className={`${typo.caption} text-primary font-semibold`} style={{ fontSize: 11 }}>
            {t('onboarding.common.edit')}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export function Step3Screen({ navigation }: OnboardingScreenProps<'Step3'>) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const typo = useTypography();
  const {
    shopTypeCode, step3, setStep3, addExpense, removeExpense, updateExpense, initExpenses, completeStep,
  } = useOnboardingStore();

  const [sheet, setSheet] = useState<SheetValues | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  const toggleSection = (key: string) =>
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const backendCode = getBackendCode(shopTypeCode);
  const { totalSteps, getStepIndex, getNextScreen } = useOnboardingFlow();

  const { data: suggestions = [], isLoading } = useQuery({
    queryKey: ['expense-suggestions', backendCode],
    queryFn: async () => {
      const res = await tenantApi.getExpenseSuggestions(backendCode ?? 'OTHER');
      return res.data.data as Suggestion[];
    },
    staleTime: 5 * 60_000,
  });

  useEffect(() => {
    if (suggestions.length > 0) initExpenses(suggestions);
  }, [suggestions, initExpenses]);

  const selectedNames = useMemo(
    () => new Set(step3.expenses.map((e) => e.name)),
    [step3.expenses],
  );

  const expenseByName = useMemo(() => {
    const map = new Map<string, OnboardingExpense>();
    for (const e of step3.expenses) map.set(e.name, e);
    return map;
  }, [step3.expenses]);

  const sections = useMemo(() => {
    const map = new Map<string, Suggestion[]>();
    for (const sg of suggestions) {
      const key = sg.category ?? 'OTHER';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(sg);
    }
    return Array.from(map.entries()).map(([categoryKey, allData]) => ({
      categoryKey,
      title: `${CATEGORY_EMOJI[categoryKey] ?? '💰'} ${t(`onboarding.step3.category.${categoryKey}`, { defaultValue: categoryKey })}`,
      allData,
      data: collapsedSections.has(categoryKey) ? [] : allData,
    }));
  }, [suggestions, collapsedSections, t]);

  const allSelected = suggestions.length > 0 && selectedNames.size === suggestions.length;

  const handleSelectAll = () => {
    setStep3({
      initialized: true,
      expenses: suggestions.map((sg) => {
        const existing = expenseByName.get(sg.name);
        return existing ?? { name: sg.name, monthlyAmount: 0, category: sg.category ?? 'OTHER', expenseType: 'FIXED' };
      }),
    });
  };

  const handleDeselectAll = () => setStep3({ expenses: [], initialized: true });

  const handleToggle = (sg: Suggestion) => {
    if (selectedNames.has(sg.name)) {
      removeExpense(sg.name);
    } else {
      addExpense({ name: sg.name, monthlyAmount: 0, category: sg.category ?? 'OTHER', expenseType: 'FIXED' });
    }
  };

  const openEditSheet = (sg: Suggestion) => {
    const expense = expenseByName.get(sg.name);
    setSheet({
      name: sg.name,
      rawAmount: expense?.monthlyAmount ? String(expense.monthlyAmount) : '',
      expenseType: expense?.expenseType ?? 'FIXED',
      paymentDay: expense?.paymentDate,
      note: expense?.note ?? '',
      category: sg.category ?? 'OTHER',
      isCustom: false,
    });
  };

  const openAddSheet = () => {
    setSheet({
      name: '',
      rawAmount: '',
      expenseType: 'FIXED',
      paymentDay: undefined,
      note: '',
      category: 'OTHER',
      isCustom: true,
    });
  };

  const handleSheetSave = (data: {
    name: string;
    monthlyAmount: number;
    expenseType: 'FIXED' | 'VARIABLE';
    paymentDate: number | undefined;
    note: string;
    category: string;
  }) => {
    const existing = expenseByName.get(data.name);
    if (existing) {
      updateExpense(data.name, {
        monthlyAmount: data.monthlyAmount,
        expenseType: data.expenseType,
        paymentDate: data.paymentDate,
        note: data.note || undefined,
        category: data.category,
      });
    } else {
      // Custom add — ensure not duplicate
      if (!selectedNames.has(data.name)) {
        addExpense({
          name: data.name,
          monthlyAmount: data.monthlyAmount,
          category: data.category,
          expenseType: data.expenseType,
          paymentDate: data.paymentDate,
          note: data.note || undefined,
        });
      }
    }
    setSheet(null);
  };

  const handleContinue = () => {
    completeStep(2);
    navigation.navigate(getNextScreen('EXPENSE_SETUP') as any);
  };

  const handleSkip = () => {
    setStep3({ expenses: [], initialized: true });
    completeStep(2);
    navigation.navigate(getNextScreen('EXPENSE_SETUP') as any);
  };

  const ListHeader = (
    <View>
      <View className="px-6 pt-2 pb-3">
        <Text className={`${typo.heading} text-gray-900 dark:text-white mb-1`}>
          {t('onboarding.step3.title')}
        </Text>
        <View className="gap-1 mt-1">
          {(
            [
              { icon: 'check-all' as const,        key: 'onboarding.step3.hint1' },
              { icon: 'pencil-outline' as const,    key: 'onboarding.step3.hint2edit' },
              { icon: 'plus-circle-outline' as const, key: 'onboarding.step3.hint3add' },
            ]
          ).map(({ icon, key }) => (
            <View key={key} className="flex-row items-center gap-2">
              <MaterialCommunityIcons name={icon} size={13} color="#9ca3af" />
              <Text className={`${typo.caption} text-gray-400 dark:text-gray-500 flex-1 leading-4`}>
                {t(key)}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Select / Deselect all bar */}
      <View className="flex-row items-center justify-between px-4 py-2 border-b border-gray-100 dark:border-gray-700">
        <TouchableOpacity
          onPress={allSelected ? handleDeselectAll : handleSelectAll}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text className={`${typo.label} text-indigo-500`}>
            {allSelected ? t('onboarding.step2.deselectAll') : t('onboarding.step2.selectAll')}
          </Text>
        </TouchableOpacity>
        <View className="flex-row items-center gap-1.5 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-full">
          <MaterialCommunityIcons name="check-circle-outline" size={14} color="#4f46e5" />
          <Text className={`${typo.captionBold} text-indigo-600 dark:text-indigo-400`}>
            {t('onboarding.step2.selectedCount', { count: selectedNames.size })}
          </Text>
        </View>
      </View>
    </View>
  );

  const ListFooter = (
    <View className="mb-4 mt-1">
      <TouchableOpacity
        onPress={openAddSheet}
        activeOpacity={0.75}
        className="flex-row items-center justify-center gap-2 mx-4 py-3.5 rounded-2xl border-2 border-dashed border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-900/10"
      >
        <MaterialCommunityIcons name="plus-circle-outline" size={18} color="#6366f1" />
        <Text className={`${typo.label} text-indigo-500`}>
          {t('onboarding.step3.addCustom')}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white dark:bg-gray-900"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Fixed header */}
      <View className="px-6" style={{ paddingTop: insets.top + 8 }}>
        <OnboardingHeader step={getStepIndex('EXPENSE_SETUP')} total={totalSteps} onBack={() => navigation.goBack()} />
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#4f46e5" size="large" />
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.name}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          stickySectionHeadersEnabled
          ListHeaderComponent={ListHeader}
          ListFooterComponent={ListFooter}
          renderSectionHeader={({ section: { categoryKey, title, allData } }) => {
            const isCollapsed = collapsedSections.has(categoryKey);
            const selectedCount = allData.filter((sg) => selectedNames.has(sg.name)).length;
            return (
              <TouchableOpacity
                onPress={() => toggleSection(categoryKey)}
                activeOpacity={0.7}
                className="flex-row items-center px-4 py-2 bg-gray-50 dark:bg-gray-900"
              >
                <Text className={`${typo.captionBold} text-indigo-500 uppercase tracking-wide`}>
                  {title}
                </Text>
                <Text className={`${typo.caption} text-indigo-400 ml-1.5`}>
                  {selectedCount}/{allData.length}
                </Text>
                <View className="flex-1 h-px bg-indigo-100 dark:bg-indigo-900/30 ml-2 mr-1" />
                <MaterialCommunityIcons
                  name={isCollapsed ? 'chevron-down' : 'chevron-up'}
                  size={16}
                  color="#6366f1"
                />
              </TouchableOpacity>
            );
          }}
          renderItem={({ item: sg }) => {
            const isSelected = selectedNames.has(sg.name);
            const expense = expenseByName.get(sg.name) ?? null;
            return (
              <ExpenseRow
                suggestion={sg}
                expense={expense}
                isSelected={isSelected}
                onToggle={() => handleToggle(sg)}
                onEdit={() => openEditSheet(sg)}
              />
            );
          }}
        />
      )}

      {/* Footer */}
      <View
        className="bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-700 px-6 pt-3"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        <View className="flex-row gap-3 items-center">
          <TouchableOpacity
            onPress={handleSkip}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            className="px-2 py-3.5"
          >
            <Text className={`${typo.label} text-gray-400 dark:text-gray-500`}>
              {t('onboarding.common.skip')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 bg-primary active:opacity-80 rounded-2xl py-3.5 flex-row items-center justify-center gap-2"
            onPress={handleContinue}
          >
            <Text className={`${typo.labelBold} text-white`}>
              {t('onboarding.common.continue')}
            </Text>
            {selectedNames.size > 0 && (
              <View className="bg-white/25 rounded-full px-2 py-0.5">
                <Text className={`${typo.captionBold} text-white`}>{selectedNames.size}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Expense edit / add sheet */}
      <ExpenseEditSheet
        values={sheet}
        onClose={() => setSheet(null)}
        onSave={handleSheetSave}
      />
    </KeyboardAvoidingView>
  );
}
