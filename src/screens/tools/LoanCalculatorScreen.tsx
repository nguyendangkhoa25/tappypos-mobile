import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MoneyInput } from '../../components/MoneyInput';
import { useCurrency } from '../../hooks/useCurrency';
import { useTypography } from '../../hooks/useTypography';
import type { ToolsScreenProps } from '../../types/navigation';

type Props = ToolsScreenProps<'LoanCalculator'>;
type RepaymentMethod = 'reducing' | 'emi';

type AmortizationRow = {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  remaining: number;
};

function calcAmortization(principal: number, annualRate: number, termMonths: number, method: RepaymentMethod): AmortizationRow[] {
  if (!principal || annualRate < 0 || !termMonths) return [];
  const monthlyRate = annualRate / 100 / 12;
  const rows: AmortizationRow[] = [];

  if (method === 'emi') {
    const emi = monthlyRate === 0
      ? principal / termMonths
      : (principal * monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / (Math.pow(1 + monthlyRate, termMonths) - 1);
    let remaining = principal;
    for (let m = 1; m <= termMonths; m++) {
      const interest = remaining * monthlyRate;
      const principalPaid = emi - interest;
      remaining = Math.max(0, remaining - principalPaid);
      rows.push({ month: m, payment: Math.round(emi), principal: Math.round(principalPaid), interest: Math.round(interest), remaining: Math.round(remaining) });
    }
  } else {
    const monthlyPrincipal = principal / termMonths;
    let remaining = principal;
    for (let m = 1; m <= termMonths; m++) {
      const interest = remaining * monthlyRate;
      remaining = Math.max(0, remaining - monthlyPrincipal);
      rows.push({ month: m, payment: Math.round(monthlyPrincipal + interest), principal: Math.round(monthlyPrincipal), interest: Math.round(interest), remaining: Math.round(remaining) });
    }
  }
  return rows;
}

function compactMoney(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}tỷ`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}tr`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return String(n);
}

const PREVIEW_ROWS = 6;

export function LoanCalculatorScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const typo = useTypography();
  const { top, bottom } = useSafeAreaInsets();

  const [amount, setAmount] = useState('');
  const [rate, setRate] = useState('');
  const [term, setTerm] = useState('');
  const [method, setMethod] = useState<RepaymentMethod>('reducing');
  const [income, setIncome] = useState('');
  const [showAllRows, setShowAllRows] = useState(false);
  const [showIncomeInput, setShowIncomeInput] = useState(false);

  const principal = parseInt(amount, 10) || 0;
  const annualRate = parseFloat(rate) || 0;
  const termMonths = parseInt(term, 10) || 0;
  const monthlyIncome = parseInt(income, 10) || 0;

  const rows = calcAmortization(principal, annualRate, termMonths, method);
  const hasResults = rows.length > 0;

  const firstPayment = rows[0]?.payment ?? 0;
  const totalInterest = rows.reduce((s, r) => s + r.interest, 0);
  const totalPayment = principal + totalInterest;

  const affordancePct = monthlyIncome > 0 ? Math.round((firstPayment / monthlyIncome) * 100) : null;
  const isOverBudget = affordancePct !== null && affordancePct > 30;

  const displayRows = showAllRows ? rows : rows.slice(0, PREVIEW_ROWS);

  return (
    <KeyboardAvoidingView className="flex-1 bg-gray-50 dark:bg-gray-900" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4" style={{ paddingTop: top + 12, paddingBottom: 12 }}>
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} className="mr-3">
            <MaterialCommunityIcons name="chevron-left" size={26} color="#4f46e5" />
          </TouchableOpacity>
          <Text className={`${typo.heading} text-gray-900 dark:text-white flex-1`}>{t('loanCalc.title')}</Text>
        </View>
      </View>

      <ScrollView className="flex-1" keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: bottom + 32 }}>
        <View className="flex-row items-start bg-indigo-50 rounded-xl px-3 py-2.5 border border-indigo-100 mb-3">
          <Text className="text-indigo-400 mr-2 mt-0.5">💡</Text>
          <Text className={`${typo.caption} text-indigo-600 leading-4 flex-1`}>{t('loanCalc.hint')}</Text>
        </View>

        <View className="bg-white rounded-2xl p-4 mb-3 border border-gray-100">
          <Text className={`${typo.label} text-gray-700 mb-2`}>{t('loanCalc.amount')}</Text>
          <MoneyInput rawValue={amount} onChangeRaw={setAmount} placeholder="0" />
        </View>

        <View className="flex-row mb-3" style={{ gap: 10 }}>
          <View className="flex-1 bg-white rounded-2xl p-4 border border-gray-100">
            <Text className={`${typo.label} text-gray-700 mb-2`}>{t('loanCalc.rate')}</Text>
            <TextInput
              className={`border border-gray-300 rounded-xl px-3 py-3 ${typo.inputSize} bg-white text-gray-900`}
              value={rate}
              onChangeText={setRate}
              keyboardType="decimal-pad"
              placeholder={t('loanCalc.rateHint')}
              placeholderTextColor="#9ca3af"
            />
          </View>
          <View className="flex-1 bg-white rounded-2xl p-4 border border-gray-100">
            <Text className={`${typo.label} text-gray-700 mb-2`}>{t('loanCalc.term')}</Text>
            <TextInput
              className={`border border-gray-300 rounded-xl px-3 py-3 ${typo.inputSize} bg-white text-gray-900`}
              value={term}
              onChangeText={setTerm}
              keyboardType="number-pad"
              placeholder={t('loanCalc.termHint')}
              placeholderTextColor="#9ca3af"
            />
          </View>
        </View>

        <View className="bg-white rounded-2xl p-4 mb-3 border border-gray-100">
          <Text className={`${typo.label} text-gray-700 mb-3`}>{t('loanCalc.repaymentMethod')}</Text>
          <View className="flex-row rounded-xl overflow-hidden border border-gray-200">
            {(['reducing', 'emi'] as RepaymentMethod[]).map((m) => (
              <TouchableOpacity
                key={m}
                onPress={() => setMethod(m)}
                activeOpacity={0.75}
                className={`flex-1 py-2.5 items-center px-2 ${method === m ? 'bg-violet-600' : 'bg-white'}`}
              >
                <Text className={`${typo.caption} font-semibold text-center ${method === m ? 'text-white' : 'text-gray-600'}`}>
                  {t(`loanCalc.${m}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity onPress={() => setShowIncomeInput((v) => !v)} activeOpacity={0.75} className="flex-row items-center mb-3">
          <MaterialCommunityIcons name={showIncomeInput ? 'chevron-down' : 'chevron-right'} size={14} color="#7c3aed" />
          <Text className={`${typo.captionBold} text-violet-600 ml-1`}>{t('loanCalc.monthlyIncome')}</Text>
        </TouchableOpacity>

        {showIncomeInput && (
          <View className="bg-white rounded-2xl p-4 mb-3 border border-gray-100">
            <MoneyInput rawValue={income} onChangeRaw={setIncome} placeholder="0" />
          </View>
        )}

        {hasResults && (
          <>
            {affordancePct !== null && (
              <View className={`flex-row items-center rounded-xl px-3 py-2.5 mb-3 border ${
                isOverBudget ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'
              }`}>
                <MaterialCommunityIcons
                  name={isOverBudget ? 'alert-outline' : 'check-circle-outline'}
                  size={16}
                  color={isOverBudget ? '#dc2626' : '#059669'}
                  style={{ marginRight: 6 }}
                />
                <Text className={`${typo.captionBold} flex-1 ${isOverBudget ? 'text-red-600' : 'text-emerald-600'}`}>
                  {t(isOverBudget ? 'loanCalc.affordabilityWarning' : 'loanCalc.affordabilityOk', { pct: affordancePct })}
                </Text>
              </View>
            )}

            <View className="bg-violet-50 rounded-2xl p-4 mb-3 border border-violet-100">
              <Text className={`${typo.labelBold} text-violet-700 mb-3`}>{t('loanCalc.resultsTitle')}</Text>
              <SummaryRow label={method === 'emi' ? t('loanCalc.monthlyPayment') : t('loanCalc.firstMonthPayment')} value={firstPayment} highlight />
              <SummaryRow label={t('loanCalc.totalInterest')} value={totalInterest} red />
              <View className="border-t border-violet-200 mt-2 pt-2">
                <SummaryRow label={t('loanCalc.totalPayment')} value={totalPayment} bold />
              </View>
            </View>

            <View className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-3">
              <View className="px-4 py-3 border-b border-gray-100">
                <Text className={`${typo.labelBold} text-gray-700`}>{t('loanCalc.amortization')}</Text>
              </View>
              <View className="flex-row px-3 py-2 bg-gray-50">
                <Text className={`${typo.captionBold} w-10 text-gray-500`}>{t('loanCalc.month')}</Text>
                <Text className={`${typo.captionBold} flex-1 text-gray-500 text-right`}>{t('loanCalc.payment')}</Text>
                <Text className={`${typo.captionBold} flex-1 text-gray-500 text-right`}>{t('loanCalc.principal')}</Text>
                <Text className={`${typo.captionBold} flex-1 text-gray-500 text-right`}>{t('loanCalc.interest')}</Text>
                <Text className={`${typo.captionBold} flex-1 text-gray-500 text-right`}>{t('loanCalc.remaining')}</Text>
              </View>
              {displayRows.map((row, idx) => (
                <View key={row.month} className={`flex-row px-3 py-2 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                  <Text className={`${typo.caption} w-10 text-gray-500`}>{row.month}</Text>
                  <Text className={`${typo.captionBold} flex-1 text-gray-800 text-right`}>{compactMoney(row.payment)}</Text>
                  <Text className={`${typo.caption} flex-1 text-violet-600 text-right`}>{compactMoney(row.principal)}</Text>
                  <Text className={`${typo.caption} flex-1 text-red-500 text-right`}>{compactMoney(row.interest)}</Text>
                  <Text className={`${typo.caption} flex-1 text-gray-600 text-right`}>{compactMoney(row.remaining)}</Text>
                </View>
              ))}
              {rows.length > PREVIEW_ROWS && (
                <TouchableOpacity onPress={() => setShowAllRows((v) => !v)} activeOpacity={0.75} className="px-4 py-3 items-center border-t border-gray-100">
                  <Text className={`${typo.captionBold} text-violet-600`}>
                    {showAllRows ? t('loanCalc.collapse') : t('loanCalc.showAll', { n: rows.length })}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}

        <View className="flex-row items-start bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 mt-2">
          <MaterialCommunityIcons name="information-outline" size={16} color="#d97706" style={{ marginTop: 1, marginRight: 6 }} />
          <Text className={`${typo.caption} flex-1 text-amber-700 leading-4`}>{t('loanCalc.disclaimer')}</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function SummaryRow({ label, value, highlight, bold, red }: { label: string; value: number; highlight?: boolean; bold?: boolean; red?: boolean }) {
  const { fmt } = useCurrency();
  const typo = useTypography();
  return (
    <View className="flex-row justify-between items-center mb-2">
      <Text className={`${bold || highlight ? `${typo.labelBold} text-gray-800` : `${typo.caption} text-gray-600`}`}>{label}</Text>
      <Text className={`${typo.labelBold} ${red ? 'text-red-600' : highlight ? 'text-violet-700' : 'text-gray-800'}`}>
        {fmt(Math.round(value))}
      </Text>
    </View>
  );
}
