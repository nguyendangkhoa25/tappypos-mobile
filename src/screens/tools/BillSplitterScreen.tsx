import { useState } from 'react';
import { View, Text, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MoneyInput } from '../../components/MoneyInput';
import { useCurrency } from '../../hooks/useCurrency';
import { useTypography } from '../../hooks/useTypography';
import type { ToolsScreenProps } from '../../types/navigation';

type Props = ToolsScreenProps<'BillSplitter'>;

const MIN_PEOPLE = 2;
const MAX_PEOPLE = 20;

export function BillSplitterScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const typo = useTypography();
  const { top, bottom } = useSafeAreaInsets();
  const { fmt } = useCurrency();

  const [total, setTotal] = useState('');
  const [people, setPeople] = useState(2);

  const totalNum = parseInt(total, 10) || 0;
  const perPerson = totalNum > 0 ? Math.ceil(totalNum / people) : 0;

  return (
    <KeyboardAvoidingView className="flex-1 bg-gray-50 dark:bg-gray-900" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4" style={{ paddingTop: top + 12, paddingBottom: 12 }}>
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} className="mr-3">
            <MaterialCommunityIcons name="chevron-left" size={26} color="#4f46e5" />
          </TouchableOpacity>
          <Text className={`${typo.heading} text-gray-900 dark:text-white flex-1`}>{t('billSplit.title')}</Text>
        </View>
      </View>

      <ScrollView className="flex-1" keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: bottom + 32 }}>
        <View className="bg-white rounded-2xl p-4 mb-3 border border-gray-100">
          <Text className={`${typo.label} text-gray-700 mb-2`}>{t('billSplit.total')}</Text>
          <MoneyInput rawValue={total} onChangeRaw={setTotal} placeholder="0" />
        </View>

        <View className="bg-white rounded-2xl p-4 mb-3 border border-gray-100">
          <Text className={`${typo.label} text-gray-700 mb-3`}>{t('billSplit.people')}</Text>
          <View className="flex-row items-center justify-center" style={{ gap: 24 }}>
            <TouchableOpacity
              onPress={() => setPeople((p) => Math.max(MIN_PEOPLE, p - 1))}
              disabled={people <= MIN_PEOPLE}
              className="w-12 h-12 rounded-full bg-gray-100 items-center justify-center"
            >
              <Text className={`text-2xl font-bold ${people <= MIN_PEOPLE ? 'text-gray-300' : 'text-gray-700'}`}>−</Text>
            </TouchableOpacity>
            <Text className="font-bold text-gray-900 dark:text-white w-16 text-center" style={{ fontSize: typo.displaySize }}>{people}</Text>
            <TouchableOpacity
              onPress={() => setPeople((p) => Math.min(MAX_PEOPLE, p + 1))}
              disabled={people >= MAX_PEOPLE}
              className="w-12 h-12 rounded-full bg-gray-100 items-center justify-center"
            >
              <Text className={`text-2xl font-bold ${people >= MAX_PEOPLE ? 'text-gray-300' : 'text-gray-700'}`}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {perPerson > 0 && (
          <View className="bg-cyan-50 rounded-2xl p-5 items-center border border-cyan-100">
            <Text className={`${typo.label} text-cyan-700 mb-2`}>{t('billSplit.resultLabel')}</Text>
            <Text className={`${typo.heading} text-cyan-700`}>{fmt(perPerson)}</Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
