import { useState, useMemo, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { tenantApi } from '../../services/api';
import { useOnboardingStore } from '../../store/onboardingStore';
import { OnboardingHeader } from './OnboardingHeader';
import { MoneyInput } from '../../components/MoneyInput';
import { ClearableInput } from '../../components/ClearableInput';
import { DayPickerModal } from '../../components/DayPickerModal';
import { formatVnd } from '../../utils/format';
import { getBackendCode } from '../../utils/shopTypes';
import type { OnboardingScreenProps } from '../../types/navigation';
import type { OnboardingExpense } from '../../store/onboardingStore';
import { CATEGORY_EMOJI } from '../../constants/expenseCategories';

export { CATEGORY_EMOJI };

type Suggestion = { name: string; emoji: string; category?: string };

const EXPENSE_CATEGORY_MAP: Record<string, string> = {
  'Tiền thuê mặt bằng':           'RENT',
  'Tiền điện':                     'ELECTRICITY',
  'Tiền nước':                     'WATER',
  'Internet / WiFi':               'INTERNET',
  'Tiền điện thoại':               'PHONE',
  'Lương nhân viên':               'SALARY_EXTRA',
  'Vệ sinh cửa hàng':              'CLEANING',
  'Sửa chữa / bảo trì':            'MAINTENANCE',
  'Phí phần mềm quản lý':          'SOFTWARE',
  'Chi phí quảng cáo / fanpage':   'MARKETING',
  'Phí ngân hàng / chuyển khoản':  'BANK_FEE',
  'Bảo hiểm cửa hàng':             'INSURANCE',
  'Thuế môn bài / phí kinh doanh': 'TAX',
  'Camera / thiết bị an ninh':     'EQUIPMENT',
  'In ấn / văn phòng phẩm':        'SUPPLIES',
  'Trang trí / nội thất cửa hàng': 'EQUIPMENT',
  'Đồng phục nhân viên':           'SALARY_EXTRA',
  'Ăn uống nhân viên':             'FOOD_STAFF',
  'Chi phí giao hàng':             'TRANSPORT',
  'Bao bì / túi đựng':             'PACKAGING',
  'Nguyên liệu / thực phẩm':       'SUPPLIES',
  'Gas / nhiên liệu nấu ăn':        'EQUIPMENT',
  'Dụng cụ bếp / nhà hàng':        'EQUIPMENT',
  'Nguyên liệu cà phê / trà':      'SUPPLIES',
  'Ly / cốc / đồ pha chế':         'PACKAGING',
  'Phí hoa hồng ứng dụng giao đồ ăn': 'TRANSPORT',
  'Tủ lạnh bảo quản thuốc':        'EQUIPMENT',
  'Phí kiểm định / giấy phép dược phẩm': 'TAX',
  'Bao bì đóng gói thuốc':         'PACKAGING',
  'Phí sàn thương mại điện tử':    'MARKETING',
  'Móc treo / giá trưng bày':       'EQUIPMENT',
  'Bao bì / túi thời trang':        'PACKAGING',
  'Linh kiện / phụ kiện thay thế': 'SUPPLIES',
  'Chi phí bảo hành / dịch vụ sau bán': 'MAINTENANCE',
  'Chi phí giám định hàng hóa':    'EQUIPMENT',
  'Két sắt / thiết bị bảo mật':    'EQUIPMENT',
  'Phí bảo hiểm hàng quý giá':     'INSURANCE',
  'Vật tư dịch vụ (dao, kéo, hóa chất)': 'SUPPLIES',
  'Khăn / đồ vệ sinh cá nhân':     'CLEANING',
  'Bảo trì / thuê ghế cắt tóc':   'MAINTENANCE',
  'Phí kiểm kho / kiểm đếm hàng': 'SUPPLIES',
  'Túi nilon / bao bì siêu thị':   'PACKAGING',
};

export function Step3Screen({ navigation }: OnboardingScreenProps<'Step3'>) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { shopTypeCode, step3, setStep3, addExpense, removeExpense, completeStep } =
    useOnboardingStore();

  const [expenseName, setExpenseName] = useState('');
  const [rawAmount, setRawAmount] = useState('');
  const [expenseType, setExpenseType] = useState<'FIXED' | 'VARIABLE'>('FIXED');
  const [paymentDate, setPaymentDate] = useState<number | undefined>(undefined);
  const [dayPickerVisible, setDayPickerVisible] = useState(false);
  const [chipFilter, setChipFilter] = useState('');
  const [kbVisible, setKbVisible] = useState(false);

  const nameRef = useRef<TextInput>(null);
  const amountRef = useRef<TextInput>(null);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKbVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKbVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  const selectedNames = useMemo(
    () => new Set(step3.expenses.map((e) => e.name)),
    [step3.expenses],
  );

  const backendCode = getBackendCode(shopTypeCode);

  const { data, isLoading } = useQuery({
    queryKey: ['expense-suggestions', backendCode],
    queryFn: async () => {
      const res = await tenantApi.getExpenseSuggestions(backendCode ?? 'OTHER');
      return res.data.data as Suggestion[];
    },
    staleTime: 5 * 60_000,
  });

  const visibleChips = useMemo(() => {
    const all = data ?? [];
    const q = chipFilter.toLowerCase().trim();
    const notSel = all.filter((s) => !selectedNames.has(s.name));
    const sel = all.filter((s) => selectedNames.has(s.name));
    if (!q) return [...notSel, ...sel].slice(0, 20);
    const hit = (s: Suggestion) => s.name.toLowerCase().includes(q);
    return [...notSel.filter(hit), ...sel.filter(hit), ...notSel.filter((s) => !hit(s))].slice(0, 20);
  }, [data, chipFilter, step3.expenses]);

  const resetForm = () => {
    setExpenseName('');
    setRawAmount('');
    setPaymentDate(undefined);
    setChipFilter('');
  };

  const handleNameChange = (v: string) => {
    setExpenseName(v);
    setChipFilter(v);
  };

  const doAdd = (name: string, amount: string, type: 'FIXED' | 'VARIABLE', date: number | undefined) => {
    const trimmed = name.trim();
    if (!trimmed || selectedNames.has(trimmed)) return;
    addExpense({
      name: trimmed,
      monthlyAmount: amount ? parseInt(amount, 10) : 0,
      expenseType: type,
      paymentDate: date,
      category: EXPENSE_CATEGORY_MAP[trimmed] ?? 'OTHER',
    });
  };

  const handleAdd = () => {
    if (!expenseName.trim()) { nameRef.current?.focus(); return; }
    doAdd(expenseName, rawAmount, expenseType, paymentDate);
    resetForm();
    setTimeout(() => nameRef.current?.focus(), 50);
  };

  const handleSuggestionPress = (s: Suggestion) => {
    if (selectedNames.has(s.name)) {
      removeExpense(s.name);
      return;
    }
    setExpenseName(s.name);
    setChipFilter(s.name);
    setTimeout(() => amountRef.current?.focus(), 50);
  };

  const handleChipEdit = (expense: OnboardingExpense) => {
    removeExpense(expense.name);
    setExpenseName(expense.name);
    setRawAmount(expense.monthlyAmount > 0 ? String(expense.monthlyAmount) : '');
    setExpenseType(expense.expenseType ?? 'FIXED');
    setPaymentDate(expense.paymentDate);
    setChipFilter(expense.name);
    setTimeout(() => nameRef.current?.focus(), 50);
  };

  const handleContinue = () => {
    if (expenseName.trim()) doAdd(expenseName, rawAmount, expenseType, paymentDate);
    completeStep(2);
    navigation.navigate('Step4');
  };

  const handleSkip = () => {
    setStep3({ expenses: [] });
    completeStep(2);
    navigation.navigate('Step4');
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white dark:bg-gray-900"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Fixed header */}
      <View className="px-6" style={{ paddingTop: insets.top + 8 }}>
        <OnboardingHeader step={2} total={4} onBack={() => navigation.goBack()} />
        <Text className={`text-2xl font-bold text-gray-900 dark:text-white ${kbVisible ? 'mt-2 mb-1' : 'mt-4 mb-1'}`}>
          {t('onboarding.step3.title')}
        </Text>
        {!kbVisible && (
          <View className="mb-3 gap-1.5 mt-1">
            {(
              [
                { icon: 'lightning-bolt', key: 'onboarding.step3.hint1' },
                { icon: 'cash-multiple',  key: 'onboarding.step3.hint2' },
                { icon: 'chart-line',     key: 'onboarding.step3.hint3' },
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
        )}
      </View>

      <ScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Committed expense chips */}
        {step3.expenses.length > 0 && (
          <View className="px-6 pt-1 pb-2 flex-row flex-wrap gap-2">
            {step3.expenses.map((expense) => (
              <TouchableOpacity
                key={expense.name}
                onPress={() => handleChipEdit(expense)}
                activeOpacity={0.75}
                className="flex-row items-center bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 rounded-full pl-3 pr-1.5 py-1.5"
              >
                <Text className="text-sm font-medium text-indigo-700 dark:text-indigo-300 mr-1.5">
                  {CATEGORY_EMOJI[expense.category ?? ''] ?? '💰'} {expense.name}
                  {expense.monthlyAmount > 0 ? `: ${formatVnd(expense.monthlyAmount)}` : ''}
                  {expense.paymentDate ? `  ·  ${t('onboarding.step3.paymentDateChip', { day: expense.paymentDate })}` : ''}
                </Text>
                <TouchableOpacity
                  onPress={() => removeExpense(expense.name)}
                  hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
                >
                  <MaterialCommunityIcons name="close" size={13} color="#818cf8" />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Suggestion chips — horizontal single-row scroll */}
        <View className={kbVisible ? 'mt-1 mb-2' : 'mt-3 mb-4'}>
          {isLoading ? (
            <ActivityIndicator color="#4f46e5" style={{ marginLeft: 24 }} />
          ) : (
            <>
              {!kbVisible && (
                <Text className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2 px-6">
                  {t('onboarding.step3.topSuggestions')}
                </Text>
              )}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 24, gap: 8 }}
                keyboardShouldPersistTaps="handled"
              >
                {visibleChips.map((s) => {
                  const isOn = selectedNames.has(s.name);
                  return (
                    <TouchableOpacity
                      key={s.name}
                      onPress={() => handleSuggestionPress(s)}
                      activeOpacity={0.7}
                      className={`flex-row items-center rounded-full border px-3 py-1.5 ${
                        isOn
                          ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-300 dark:border-indigo-600'
                          : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-600'
                      }`}
                    >
                      <Text style={{ fontSize: 16, lineHeight: 20 }} className="mr-1.5">
                        {s.emoji}
                      </Text>
                      <Text
                        className={`text-sm font-medium ${
                          isOn
                            ? 'text-indigo-600 dark:text-indigo-300'
                            : 'text-gray-700 dark:text-gray-200'
                        }`}
                      >
                        {isOn ? '✓ ' : ''}{s.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </>
          )}
        </View>

        {/* Input form */}
        <View className="px-6 pb-6 gap-4">
          {/* Name + Add */}
          <View>
            <View className="flex-row gap-2 items-stretch">
              <View className="flex-1">
                <ClearableInput
                  ref={nameRef}
                  value={expenseName}
                  onChangeText={handleNameChange}
                  onClear={() => { setExpenseName(''); setChipFilter(''); }}
                  placeholder={t('onboarding.step3.namePlaceholder')}
                  returnKeyType="next"
                  onSubmitEditing={() => amountRef.current?.focus()}
                  autoCapitalize="sentences"
                />
              </View>
              <TouchableOpacity
                onPress={handleAdd}
                activeOpacity={0.75}
                disabled={!expenseName.trim()}
                className={`rounded-xl px-4 items-center justify-center ${
                  expenseName.trim() ? 'bg-primary' : 'bg-gray-100 dark:bg-gray-800'
                }`}
              >
                <MaterialCommunityIcons
                  name="plus"
                  size={22}
                  color={expenseName.trim() ? 'white' : '#9ca3af'}
                />
              </TouchableOpacity>
            </View>
            {expenseName.trim() ? (
              <TouchableOpacity onPress={handleAdd} activeOpacity={0.6} className="flex-row items-center gap-1.5 mt-2 px-1">
                <MaterialCommunityIcons name="keyboard-return" size={13} color="#4f46e5" />
                <Text className="text-xs text-primary font-medium flex-1" numberOfLines={1}>
                  {t('onboarding.step3.addBtn')} &ldquo;{expenseName.trim()}&rdquo;
                  {rawAmount ? `  ·  ${parseInt(rawAmount, 10).toLocaleString('vi-VN')}₫` : ''}
                  {'  ·  '}{t(`onboarding.step3.type.${expenseType}`)}
                  {paymentDate ? `  ·  ${t('onboarding.step3.paymentDateChip', { day: paymentDate })}` : ''}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Amount + calendar */}
          <View>
            <Text className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">
              {t('onboarding.step3.amountLabel')}
            </Text>
            <View className="flex-row gap-2 items-start">
              <View className="flex-1">
                <MoneyInput
                  ref={amountRef}
                  rawValue={rawAmount}
                  onChangeRaw={setRawAmount}
                  placeholder={t('onboarding.step3.amountPlaceholder')}
                  returnKeyType="done"
                  onSubmitEditing={handleAdd}
                />
              </View>
              <TouchableOpacity
                onPress={() => setDayPickerVisible(true)}
                activeOpacity={0.75}
                className={`flex-row gap-1 rounded-xl px-3 py-3 items-center justify-center border ${
                  paymentDate
                    ? 'border-indigo-300 dark:border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20'
                    : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800'
                }`}
              >
                <MaterialCommunityIcons
                  name="calendar-month-outline"
                  size={18}
                  color={paymentDate ? '#4f46e5' : '#9ca3af'}
                />
                {paymentDate ? (
                  <Text className="text-xs font-bold text-primary dark:text-indigo-300">
                    {paymentDate}
                  </Text>
                ) : null}
              </TouchableOpacity>
            </View>
          </View>

          {/* Type chips */}
          <View>
            <Text className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">
              {t('onboarding.step3.typeLabel')}
            </Text>
            <View className="flex-row gap-2">
              {(['FIXED', 'VARIABLE'] as const).map((tp) => {
                const active = expenseType === tp;
                return (
                  <TouchableOpacity
                    key={tp}
                    onPress={() => setExpenseType(tp)}
                    className={`px-4 py-1.5 rounded-full border ${
                      active
                        ? 'bg-primary border-primary'
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600'
                    }`}
                  >
                    <Text className={`text-sm font-medium ${active ? 'text-white' : 'text-gray-600 dark:text-gray-300'}`}>
                      {t(`onboarding.step3.type.${tp}`)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

        </View>
      </ScrollView>

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
            <Text className="font-semibold text-sm text-gray-400 dark:text-gray-500">
              {t('onboarding.common.skip')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 bg-primary active:opacity-80 rounded-2xl py-3.5 flex-row items-center justify-center gap-2"
            onPress={handleContinue}
          >
            <Text className="text-white font-bold text-base">
              {t('onboarding.common.continue')}
            </Text>
            {step3.expenses.length > 0 && (
              <View className="bg-white/25 rounded-full px-2 py-0.5">
                <Text className="text-white text-xs font-bold">{step3.expenses.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>
      <DayPickerModal
        visible={dayPickerVisible}
        selected={paymentDate ? String(paymentDate) : ''}
        onSelect={(day) => setPaymentDate(day ? parseInt(day, 10) : undefined)}
        onClose={() => setDayPickerVisible(false)}
        title={t('onboarding.step4.labelPaymentDate')}
        clearLabel={t('onboarding.step4.paymentDateClear')}
      />
    </KeyboardAvoidingView>
  );
}
