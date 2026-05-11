import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MoneyInput } from '../../components/MoneyInput';
import { useCurrency } from '../../hooks/useCurrency';
import type { ToolsScreenProps } from '../../types/navigation';

type Props = ToolsScreenProps<'BudgetRule'>;
type RuleType = '503020' | '6jars';

interface BudgetBucket {
  labelKey: string;
  descKey: string;
  pct: number;
  color: string;
  bg: string;
}

const RULE_503020: BudgetBucket[] = [
  { labelKey: 'budgetRule.needs', descKey: 'budgetRule.needsDesc', pct: 50, color: '#059669', bg: '#d1fae5' },
  { labelKey: 'budgetRule.wants', descKey: 'budgetRule.wantsDesc', pct: 30, color: '#d97706', bg: '#fef3c7' },
  { labelKey: 'budgetRule.savings', descKey: 'budgetRule.savingsDesc', pct: 20, color: '#4f46e5', bg: '#eef2ff' },
];

const RULE_6JARS: BudgetBucket[] = [
  { labelKey: 'budgetRule.jar_necessities', descKey: 'budgetRule.jar_necessitiesDesc', pct: 55, color: '#059669', bg: '#d1fae5' },
  { labelKey: 'budgetRule.jar_play', descKey: 'budgetRule.jar_playDesc', pct: 10, color: '#f59e0b', bg: '#fef3c7' },
  { labelKey: 'budgetRule.jar_education', descKey: 'budgetRule.jar_educationDesc', pct: 10, color: '#0891b2', bg: '#ecfeff' },
  { labelKey: 'budgetRule.jar_ltss', descKey: 'budgetRule.jar_ltssDesc', pct: 10, color: '#4f46e5', bg: '#eef2ff' },
  { labelKey: 'budgetRule.jar_give', descKey: 'budgetRule.jar_giveDesc', pct: 5, color: '#ec4899', bg: '#fdf2f8' },
  { labelKey: 'budgetRule.jar_financial', descKey: 'budgetRule.jar_financialDesc', pct: 10, color: '#7c3aed', bg: '#ede9fe' },
];

export function BudgetRuleScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { top } = useSafeAreaInsets();
  const { fmt } = useCurrency();

  const [income, setIncome] = useState('');
  const [rule, setRule] = useState<RuleType>('503020');

  const incomeNum = parseInt(income, 10) || 0;
  const buckets = rule === '503020' ? RULE_503020 : RULE_6JARS;

  return (
    <KeyboardAvoidingView className="flex-1 bg-gray-50" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View className="bg-violet-600 px-6 pb-5" style={{ paddingTop: top + 16 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} className="mb-3">
          <MaterialCommunityIcons name="arrow-left" size={24} color="white" />
        </TouchableOpacity>
        <Text className="text-2xl font-bold text-white">{t('budgetRule.title')}</Text>
      </View>

      <ScrollView className="flex-1 px-4 pt-4" keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 40 }}>
        <View className="flex-row items-start bg-indigo-50 rounded-xl px-3 py-2.5 border border-indigo-100 mb-3">
          <Text className="text-indigo-400 mr-2 mt-0.5">💡</Text>
          <Text className="text-xs text-indigo-600 leading-4 flex-1">{t('budgetRule.hint')}</Text>
        </View>

        <View className="bg-white rounded-2xl p-4 mb-3 border border-gray-100">
          <Text className="text-sm font-semibold text-gray-700 mb-3">{t('budgetRule.ruleLabel')}</Text>
          <View className="flex-row rounded-xl overflow-hidden border border-gray-200">
            {(['503020', '6jars'] as RuleType[]).map((r) => (
              <TouchableOpacity
                key={r}
                onPress={() => setRule(r)}
                activeOpacity={0.75}
                className={`flex-1 py-2.5 items-center ${rule === r ? 'bg-violet-600' : 'bg-white'}`}
              >
                <Text className={`text-sm font-semibold ${rule === r ? 'text-white' : 'text-gray-600'}`}>
                  {t(`budgetRule.rule_${r}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View className="bg-white rounded-2xl p-4 mb-3 border border-gray-100">
          <Text className="text-sm font-semibold text-gray-700 mb-2">{t('budgetRule.incomeLabel')}</Text>
          <MoneyInput rawValue={income} onChangeRaw={setIncome} placeholder="0" />
        </View>

        {incomeNum > 0 && (
          <View style={{ gap: 10 }}>
            {buckets.map((b) => {
              const amount = Math.round(incomeNum * b.pct / 100);
              return (
                <View key={b.labelKey} className="bg-white rounded-2xl p-4 border border-gray-100">
                  <View className="flex-row items-center mb-2">
                    <View className="w-10 h-10 rounded-xl items-center justify-center mr-3" style={{ backgroundColor: b.bg }}>
                      <Text className="text-base font-bold" style={{ color: b.color }}>{b.pct}%</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-bold text-gray-900">{t(b.labelKey)}</Text>
                      <Text className="text-xs text-gray-500">{t(b.descKey)}</Text>
                    </View>
                    <Text className="text-base font-bold" style={{ color: b.color }}>{fmt(amount)}</Text>
                  </View>
                  <View className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <View className="h-full rounded-full" style={{ width: `${b.pct}%`, backgroundColor: b.color }} />
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View className="flex-row items-start bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 mt-3">
          <MaterialCommunityIcons name="information-outline" size={16} color="#d97706" style={{ marginTop: 1, marginRight: 6 }} />
          <Text className="flex-1 text-xs text-amber-700 leading-4">{t('budgetRule.disclaimer')}</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
