import { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { TextInput } from 'react-native';
import { useToastStore } from '../../store/toastStore';
import { useErrorAlert } from '../../hooks/useErrorAlert';
import { useTypography } from '../../hooks/useTypography';
import { useAuthStore } from '../../store/authStore';
import { expenseApi, tenantApi } from '../../services/api';
import { ClearableInput } from '../../components/ClearableInput';
import { MoneyInput } from '../../components/MoneyInput';
import { DatePickerInput } from '../../components/DatePickerInput';
import { CATEGORY_EMOJI, type ExpenseCategory } from '../../constants/expenseCategories';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ExpensesStackParamList } from '../../types/navigation';

type Suggestion = { name: string; nameEn?: string; emoji: string; category?: string };

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

type Props = NativeStackScreenProps<ExpensesStackParamList, 'ExpenseAdd'>;

export function ExpenseAddScreen({ navigation, route }: Props) {
  const { existingNames } = route.params;
  const existingSet = new Set(existingNames);

  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const typo = useTypography();
  const qc = useQueryClient();
  const { show: showToast } = useToastStore();
  const showErrorAlert = useErrorAlert();
  const { shopTypeCode } = useAuthStore();

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('OTHER');
  const [expenseDate, setExpenseDate] = useState(todayIso());

  const amountRef = useRef<TextInput>(null);

  const { data: suggestions = [], isLoading: suggestionsLoading } = useQuery({
    queryKey: ['expense-suggestions', shopTypeCode],
    queryFn: async () => {
      const res = await tenantApi.getExpenseSuggestions(shopTypeCode ?? 'OTHER');
      return res.data.data as Suggestion[];
    },
    staleTime: 5 * 60_000,
  });

  const availableChips = suggestions.filter((s) => !existingSet.has(s.name));

  const handleChipPress = (s: Suggestion) => {
    setDescription(s.name);
    setCategory((s.category as ExpenseCategory) ?? 'OTHER');
    setTimeout(() => amountRef.current?.focus(), 50);
  };

  const saveMutation = useMutation({
    mutationFn: () =>
      expenseApi.create({ description, amount: Number(amount), category, expenseDate }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['expensesSummary'] });
      qc.invalidateQueries({ queryKey: ['expensesChart'] });
      showToast(t('expenses.addSheet.saveSuccess'));
      navigation.goBack();
    },
    onError: showErrorAlert,
  });

  const canSave =
    description.trim().length > 0 &&
    Number(amount) > 0 &&
    /^\d{4}-\d{2}-\d{2}$/.test(expenseDate);

  const categoryLabel = (cat: string) =>
    t(`onboarding.step4.categories.${cat}`, { defaultValue: cat });

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-gray-50 dark:bg-gray-900"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View
        className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4"
        style={{ paddingTop: insets.top + 12, paddingBottom: 12 }}
      >
        <View className="flex-row items-center gap-3">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons name="chevron-left" size={26} color="#4f46e5" />
          </TouchableOpacity>
          <Text className={`${typo.heading} text-gray-900 dark:text-white flex-1`}>
            {t('expenses.addSheet.title')}
          </Text>
          <TouchableOpacity onPress={() => saveMutation.mutate()} disabled={saveMutation.isPending || !canSave} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            {saveMutation.isPending ? <ActivityIndicator size="small" color="#4f46e5" /> : (
              <Text className={`${typo.label} ${canSave ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-300 dark:text-gray-600'}`}>{t('common.save')}</Text>
            )}
          </TouchableOpacity>
        </View>
        <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 mt-1 ml-9`}>
          {t('expenses.addScreen.hint')}
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      >
        {/* Suggestion chips */}
        <View className="pt-4 pb-3">
          <Text className={`${typo.captionBold} text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2 px-4`}>
            {t('expenses.addScreen.suggestions')}
          </Text>
          {suggestionsLoading ? (
            <ActivityIndicator color="#4f46e5" style={{ marginLeft: 16 }} />
          ) : availableChips.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
              keyboardShouldPersistTaps="handled"
            >
              {availableChips.map((s) => {
                const isSelected = description === s.name;
                return (
                  <TouchableOpacity
                    key={s.name}
                    onPress={() => handleChipPress(s)}
                    activeOpacity={0.7}
                    className={`flex-row items-center rounded-full border px-3 py-1.5 ${
                      isSelected
                        ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-300 dark:border-indigo-600'
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600'
                    }`}
                  >
                    <Text className={`${typo.label} mr-1.5`}>
                      {s.emoji}
                    </Text>
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
          ) : null}
        </View>

        {/* Form */}
        <View className="px-4 gap-4">
          {/* Description */}
          <View>
            <Text className={`${typo.captionBold} text-gray-500 dark:text-gray-400 mb-1.5`}>
              {t('expenses.addSheet.nameLabel')}
            </Text>
            <ClearableInput
              value={description}
              onChangeText={setDescription}
              onClear={() => setDescription('')}
              placeholder={t('expenses.addSheet.namePlaceholder')}
              returnKeyType="next"
              onSubmitEditing={() => amountRef.current?.focus()}
              autoCapitalize="sentences"
              autoFocus
            />
          </View>

          {/* Amount */}
          <View>
            <Text className={`${typo.captionBold} text-gray-500 dark:text-gray-400 mb-1.5`}>
              {t('expenses.addSheet.amountLabel')}
            </Text>
            <MoneyInput
              ref={amountRef}
              rawValue={amount}
              onChangeRaw={setAmount}
              placeholder={t('expenses.addSheet.amountPlaceholder')}
              returnKeyType="done"
            />
          </View>

          {/* Category — auto-set by chip; shown read-only */}
          <View>
            <Text className={`${typo.captionBold} text-gray-500 dark:text-gray-400 mb-1.5`}>
              {t('expenses.addSheet.categoryLabel')}
            </Text>
            <View className="flex-row items-center bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 rounded-xl px-4 py-3">
              <Text className={`${typo.section} mr-2`}>{CATEGORY_EMOJI[category] ?? '🏷️'}</Text>
              <Text className={`${typo.label} text-indigo-700 dark:text-indigo-300 flex-1`}>
                {categoryLabel(category)}
              </Text>
              <Text className={`${typo.caption} text-gray-400 dark:text-gray-500`}>
                {t('expenses.addScreen.categoryHint')}
              </Text>
            </View>
          </View>

          {/* Date */}
          <View>
            <Text className={`${typo.captionBold} text-gray-500 dark:text-gray-400 mb-1.5`}>
              {t('expenses.addSheet.dateLabel')}
            </Text>
            <View className="border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 bg-white dark:bg-gray-800">
              <DatePickerInput
                value={expenseDate}
                onChange={setExpenseDate}
                maximumDate={new Date()}
              />
            </View>
          </View>
        </View>
      </ScrollView>

    </KeyboardAvoidingView>
  );
}
