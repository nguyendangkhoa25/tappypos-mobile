import { useState } from 'react';
import { View, Text, TextInput, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MoneyInput } from '../../components/MoneyInput';
import { useCurrency } from '../../hooks/useCurrency';
import { useTypography } from '../../hooks/useTypography';
import type { ToolsScreenProps } from '../../types/navigation';

type Props = ToolsScreenProps<'Breakeven'>;

interface BreakevenResult {
  breakevenMonths: number | null;
  totalA_at_breakeven: number;
  totalB_at_breakeven: number;
  savings10yr: number;
  cheaperOption: 'A' | 'B' | 'equal';
}

function calcBreakeven(upfrontA: number, monthlyA: number, upfrontB: number, monthlyB: number): BreakevenResult | null {
  if ((!upfrontA && !monthlyA) || (!upfrontB && !monthlyB)) return null;
  const diff = monthlyA - monthlyB;
  let breakevenMonths: number | null;
  if (diff === 0) {
    breakevenMonths = null;
  } else {
    const n = (upfrontB - upfrontA) / diff;
    breakevenMonths = n <= 0 ? null : Math.ceil(n);
  }

  const months120 = 120;
  const totalA_120 = upfrontA + monthlyA * months120;
  const totalB_120 = upfrontB + monthlyB * months120;
  const bm = breakevenMonths ?? months120;

  let cheaperOption: 'A' | 'B' | 'equal';
  if (totalA_120 < totalB_120) cheaperOption = 'A';
  else if (totalB_120 < totalA_120) cheaperOption = 'B';
  else cheaperOption = 'equal';

  return {
    breakevenMonths,
    totalA_at_breakeven: upfrontA + monthlyA * bm,
    totalB_at_breakeven: upfrontB + monthlyB * bm,
    savings10yr: Math.abs(totalA_120 - totalB_120),
    cheaperOption,
  };
}

export function BreakevenScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const typo = useTypography();
  const { top, bottom } = useSafeAreaInsets();
  const { fmt } = useCurrency();

  const [nameA, setNameA] = useState('');
  const [upfrontA, setUpfrontA] = useState('');
  const [monthlyA, setMonthlyA] = useState('');

  const [nameB, setNameB] = useState('');
  const [upfrontB, setUpfrontB] = useState('');
  const [monthlyB, setMonthlyB] = useState('');

  const result = calcBreakeven(
    parseInt(upfrontA, 10) || 0,
    parseInt(monthlyA, 10) || 0,
    parseInt(upfrontB, 10) || 0,
    parseInt(monthlyB, 10) || 0,
  );

  const labelA = nameA || t('breakeven.optionA');
  const labelB = nameB || t('breakeven.optionB');

  const fmtMonths = (m: number) => {
    const y = Math.floor(m / 12);
    const mo = m % 12;
    const parts: string[] = [];
    if (y > 0) parts.push(`${y} ${t('breakeven.years')}`);
    if (mo > 0) parts.push(`${mo} ${t('breakeven.months')}`);
    return parts.join(' ') || `0 ${t('breakeven.months')}`;
  };

  return (
    <KeyboardAvoidingView className="flex-1 bg-gray-50 dark:bg-gray-900" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4" style={{ paddingTop: top + 12, paddingBottom: 12 }}>
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} className="mr-3">
            <MaterialCommunityIcons name="chevron-left" size={26} color="#4f46e5" />
          </TouchableOpacity>
          <Text className={`${typo.heading} text-gray-900 dark:text-white flex-1`}>{t('breakeven.title')}</Text>
        </View>
      </View>

      <ScrollView className="flex-1" keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: bottom + 32 }}>
        <View className="flex-row items-start bg-indigo-50 rounded-xl px-3 py-2.5 border border-indigo-100 mb-3">
          <Text className="text-indigo-400 mr-2 mt-0.5">💡</Text>
          <Text className={`${typo.caption} text-indigo-600 leading-4 flex-1`}>{t('breakeven.hint')}</Text>
        </View>

        {/* Option A */}
        <View className="bg-white rounded-2xl p-4 mb-3 border border-gray-100">
          <View className="flex-row items-center mb-3">
            <View className="w-7 h-7 rounded-full bg-blue-100 items-center justify-center mr-2">
              <Text className={`${typo.captionBold} text-blue-600`}>A</Text>
            </View>
            <TextInput
              className={`flex-1 ${typo.inputSize} font-semibold text-gray-700`}
              value={nameA}
              onChangeText={setNameA}
              placeholder={t('breakeven.namePlaceholder')}
              placeholderTextColor="#9ca3af"
            />
          </View>
          <Text className={`${typo.caption} text-gray-500 mb-1`}>{t('breakeven.upfront')}</Text>
          <MoneyInput rawValue={upfrontA} onChangeRaw={setUpfrontA} placeholder="0" />
          <Text className={`${typo.caption} text-gray-500 mb-1 mt-3`}>{t('breakeven.monthly')}</Text>
          <MoneyInput rawValue={monthlyA} onChangeRaw={setMonthlyA} placeholder="0" />
        </View>

        {/* Option B */}
        <View className="bg-white rounded-2xl p-4 mb-3 border border-gray-100">
          <View className="flex-row items-center mb-3">
            <View className="w-7 h-7 rounded-full bg-orange-100 items-center justify-center mr-2">
              <Text className={`${typo.captionBold} text-orange-600`}>B</Text>
            </View>
            <TextInput
              className={`flex-1 ${typo.inputSize} font-semibold text-gray-700`}
              value={nameB}
              onChangeText={setNameB}
              placeholder={t('breakeven.namePlaceholder')}
              placeholderTextColor="#9ca3af"
            />
          </View>
          <Text className={`${typo.caption} text-gray-500 mb-1`}>{t('breakeven.upfront')}</Text>
          <MoneyInput rawValue={upfrontB} onChangeRaw={setUpfrontB} placeholder="0" />
          <Text className={`${typo.caption} text-gray-500 mb-1 mt-3`}>{t('breakeven.monthly')}</Text>
          <MoneyInput rawValue={monthlyB} onChangeRaw={setMonthlyB} placeholder="0" />
        </View>

        {result && (
          <View className="bg-rose-50 rounded-2xl p-4 border border-rose-100">
            <Text className={`${typo.labelBold} text-rose-700 mb-3`}>{t('breakeven.resultsTitle')}</Text>

            <View className="bg-white rounded-xl p-3 mb-3 border border-rose-100">
              <Text className={`${typo.caption} text-gray-500 mb-1`}>{t('breakeven.breakevenPoint')}</Text>
              {result.breakevenMonths !== null ? (
                <>
                  <Text className={`${typo.section} text-rose-600`}>{fmtMonths(result.breakevenMonths)}</Text>
                  <Text className={`${typo.caption} text-gray-500 mt-1`}>{t('breakeven.breakevenNote', { a: labelA, b: labelB })}</Text>
                </>
              ) : (
                <Text className={`${typo.labelBold} text-gray-600`}>{t('breakeven.noBreakeven')}</Text>
              )}
            </View>

            <Text className={`${typo.caption} text-gray-500 mb-2`}>
              {result.breakevenMonths !== null ? t('breakeven.totalAtBreakeven') : t('breakeven.totalAt10yr')}
            </Text>
            <View className="flex-row mb-3" style={{ gap: 8 }}>
              <View className="flex-1 bg-blue-50 rounded-xl p-3 border border-blue-100">
                <Text className={`${typo.captionBold} text-blue-600 mb-1`}>{labelA}</Text>
                <Text className={`${typo.labelBold} text-blue-700`}>{fmt(Math.round(result.totalA_at_breakeven))}</Text>
              </View>
              <View className="flex-1 bg-orange-50 rounded-xl p-3 border border-orange-100">
                <Text className={`${typo.captionBold} text-orange-600 mb-1`}>{labelB}</Text>
                <Text className={`${typo.labelBold} text-orange-700`}>{fmt(Math.round(result.totalB_at_breakeven))}</Text>
              </View>
            </View>

            <View className="flex-row items-center">
              <MaterialCommunityIcons
                name={result.cheaperOption === 'equal' ? 'minus-circle-outline' : 'check-circle'}
                size={16}
                color={result.cheaperOption === 'equal' ? '#9ca3af' : '#059669'}
                style={{ marginRight: 6 }}
              />
              <Text className={`${typo.caption} flex-1 text-gray-600`}>
                {result.cheaperOption === 'equal'
                  ? t('breakeven.verdict_equal')
                  : t('breakeven.verdict_cheaper', { option: result.cheaperOption === 'A' ? labelA : labelB, amount: fmt(Math.round(result.savings10yr)) })}
              </Text>
            </View>
          </View>
        )}

        <View className="flex-row items-start bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 mt-3">
          <MaterialCommunityIcons name="information-outline" size={16} color="#d97706" style={{ marginTop: 1, marginRight: 6 }} />
          <Text className={`${typo.caption} flex-1 text-amber-700 leading-4`}>{t('breakeven.disclaimer')}</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
