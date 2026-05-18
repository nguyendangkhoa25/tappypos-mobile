import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MoneyInput } from '../../components/MoneyInput';
import { useCurrency } from '../../hooks/useCurrency';
import { useTypography } from '../../hooks/useTypography';
import type { ToolsScreenProps } from '../../types/navigation';

type Props = ToolsScreenProps<'InterestCalculator'>;
type InterestType = 'simple' | 'compound';

interface CompoundPeriod {
  label: string;
  balance: number;
  earned: number;
}

interface InterestResult {
  type: InterestType;
  monthlyInterest: number;
  totalInterest: number;
  totalAmount: number;
  compoundPeriods?: CompoundPeriod[];
}

function calcResults(
  principal: number,
  annualRate: number,
  termMonths: number,
  type: InterestType,
): InterestResult | null {
  if (!principal || !termMonths) return null;
  if (annualRate < 0) return null;

  const monthlyRate = annualRate / 100 / 12;

  if (type === 'simple') {
    const totalInterest = principal * (annualRate / 100) * (termMonths / 12);
    return {
      type,
      monthlyInterest: totalInterest / termMonths,
      totalInterest,
      totalAmount: principal + totalInterest,
    };
  }

  const totalAmount = principal * Math.pow(1 + monthlyRate, termMonths);
  const totalInterest = totalAmount - principal;

  const useYearly = termMonths > 12;
  const step = useYearly ? 12 : 1;
  const compoundPeriods: CompoundPeriod[] = [];
  let prevBalance = principal;
  let periodNum = 1;
  for (let m = step; m <= termMonths; m += step) {
    const balance = principal * Math.pow(1 + monthlyRate, Math.min(m, termMonths));
    compoundPeriods.push({ label: useYearly ? `Y${periodNum}` : `M${periodNum}`, balance, earned: balance - prevBalance });
    prevBalance = balance;
    periodNum++;
  }
  if (termMonths % step !== 0) {
    compoundPeriods.push({ label: useYearly ? `Y${periodNum}` : `M${periodNum}`, balance: totalAmount, earned: totalAmount - prevBalance });
  }

  return { type, monthlyInterest: totalInterest / termMonths, totalInterest, totalAmount, compoundPeriods };
}

export function InterestCalculatorScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const typo = useTypography();
  const { top, bottom } = useSafeAreaInsets();

  const [principal, setPrincipal] = useState('');
  const [rate, setRate] = useState('');
  const [term, setTerm] = useState('');
  const [interestType, setInterestType] = useState<InterestType>('simple');

  const results = calcResults(parseInt(principal, 10) || 0, parseFloat(rate) || 0, parseInt(term, 10) || 0, interestType);

  return (
    <KeyboardAvoidingView className="flex-1 bg-gray-50 dark:bg-gray-900" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4" style={{ paddingTop: top + 12, paddingBottom: 12 }}>
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} className="mr-3">
            <MaterialCommunityIcons name="chevron-left" size={26} color="#4f46e5" />
          </TouchableOpacity>
          <Text className={`${typo.heading} text-gray-900 dark:text-white flex-1`}>{t('interestCalc.title')}</Text>
        </View>
      </View>

      <ScrollView className="flex-1" keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: bottom + 32 }}>
        <View className="flex-row items-start bg-indigo-50 rounded-xl px-3 py-2.5 border border-indigo-100 mb-3">
          <Text className="text-indigo-400 mr-2 mt-0.5">💡</Text>
          <Text className={`${typo.caption} text-indigo-600 leading-4 flex-1`}>{t('interestCalc.hint')}</Text>
        </View>

        <View className="flex-row items-start bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 mb-3">
          <MaterialCommunityIcons name="information-outline" size={16} color="#d97706" style={{ marginTop: 1, marginRight: 6 }} />
          <Text className={`${typo.caption} flex-1 text-amber-700 leading-4`}>{t('interestCalc.disclaimer')}</Text>
        </View>

        <View className="bg-white rounded-2xl p-4 mb-3 border border-gray-100">
          <Text className={`${typo.label} text-gray-700 mb-2`}>{t('interestCalc.principal')}</Text>
          <MoneyInput rawValue={principal} onChangeRaw={setPrincipal} placeholder="0" />
        </View>

        <View className="flex-row mb-3" style={{ gap: 10 }}>
          <View className="flex-1 bg-white rounded-2xl p-4 border border-gray-100">
            <Text className={`${typo.label} text-gray-700 mb-2`}>{t('interestCalc.rate')}</Text>
            <TextInput
              className={`border border-gray-300 rounded-xl px-3 py-3 ${typo.inputSize} bg-white text-gray-900`}
              value={rate}
              onChangeText={setRate}
              keyboardType="decimal-pad"
              placeholder={t('interestCalc.rateHint')}
              placeholderTextColor="#9ca3af"
            />
          </View>
          <View className="flex-1 bg-white rounded-2xl p-4 border border-gray-100">
            <Text className={`${typo.label} text-gray-700 mb-2`}>{t('interestCalc.term')}</Text>
            <TextInput
              className={`border border-gray-300 rounded-xl px-3 py-3 ${typo.inputSize} bg-white text-gray-900`}
              value={term}
              onChangeText={setTerm}
              keyboardType="number-pad"
              placeholder={t('interestCalc.termHint')}
              placeholderTextColor="#9ca3af"
            />
          </View>
        </View>

        <View className="bg-white rounded-2xl p-4 mb-3 border border-gray-100">
          <Text className={`${typo.label} text-gray-700 mb-3`}>{t('interestCalc.interestType')}</Text>
          <View className="flex-row rounded-xl overflow-hidden border border-gray-200">
            {(['simple', 'compound'] as InterestType[]).map((type) => (
              <TouchableOpacity
                key={type}
                onPress={() => setInterestType(type)}
                activeOpacity={0.75}
                className={`flex-1 py-2.5 items-center ${interestType === type ? 'bg-indigo-600' : 'bg-white'}`}
              >
                <Text className={`${typo.label} ${interestType === type ? 'text-white' : 'text-gray-600'}`}>
                  {t(`interestCalc.${type}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {results && (
          <>
            <View className="bg-indigo-50 rounded-2xl p-4 border border-indigo-100 mb-3">
              <Text className={`${typo.labelBold} text-indigo-700 mb-3`}>{t('interestCalc.resultsTitle')}</Text>
              <ResultRow
                label={results.type === 'compound' ? t('interestCalc.avgMonthlyInterest') : t('interestCalc.monthlyInterest')}
                value={results.monthlyInterest}
              />
              <ResultRow label={t('interestCalc.totalInterest')} value={results.totalInterest} />
              <View className="border-t border-indigo-200 mt-3 pt-3">
                <ResultRow label={t('interestCalc.totalAmount')} value={results.totalAmount} highlight />
              </View>
            </View>

            {results.compoundPeriods && results.compoundPeriods.length > 0 && (
              <View className="bg-white rounded-2xl p-4 border border-gray-100">
                <Text className={`${typo.labelBold} text-gray-700 mb-3`}>{t('interestCalc.breakdown')}</Text>
                <View className="flex-row mb-2">
                  <Text className={`${typo.captionBold} w-12 text-gray-400`}>{t('interestCalc.period')}</Text>
                  <Text className={`${typo.captionBold} flex-1 text-gray-400 text-right`}>{t('interestCalc.earned')}</Text>
                  <Text className={`${typo.captionBold} flex-1 text-gray-400 text-right`}>{t('interestCalc.balance')}</Text>
                </View>
                {results.compoundPeriods.map((p) => (
                  <CompoundPeriodRow key={p.label} period={p} />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function ResultRow({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  const { fmt } = useCurrency();
  const typo = useTypography();
  return (
    <View className="flex-row justify-between items-center mb-2">
      <Text className={`${highlight ? `${typo.labelBold} text-indigo-800` : `${typo.caption} text-gray-600`}`}>{label}</Text>
      <Text className={`${highlight ? `${typo.labelBold} text-indigo-700` : `${typo.label} text-gray-800`}`}>
        {fmt(Math.round(value))}
      </Text>
    </View>
  );
}

function CompoundPeriodRow({ period }: { period: CompoundPeriod }) {
  const { fmt } = useCurrency();
  const typo = useTypography();
  return (
    <View className="flex-row py-1.5 border-t border-gray-100">
      <Text className={`${typo.captionBold} w-12 text-indigo-600`}>{period.label}</Text>
      <Text className={`${typo.caption} flex-1 text-emerald-600 text-right`}>+{fmt(Math.round(period.earned))}</Text>
      <Text className={`${typo.captionBold} flex-1 text-gray-700 text-right`}>{fmt(Math.round(period.balance))}</Text>
    </View>
  );
}
