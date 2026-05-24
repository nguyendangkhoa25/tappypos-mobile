import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTypography } from '../../hooks/useTypography';
import type { ToolsScreenProps } from '../../types/navigation';

type Props = ToolsScreenProps<'UtilitiesHub'>;

type ToolScreen = 'CurrencyConverter' | 'InterestCalculator' | 'LoanCalculator' | 'TaxCalculator' | 'BillSplitter' | 'BudgetRule' | 'Breakeven' | 'MarketGoldPrices';

type Tool = {
  titleKey: string;
  descKey: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  screen: ToolScreen;
  color: string;
  bg: string;
};

type ToolGroup = {
  titleKey: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  tools: Tool[];
};

const TOOL_GROUPS: ToolGroup[] = [
  {
    titleKey: 'utilities.groupCalc',
    icon: 'calculator-variant-outline',
    tools: [
      {
        titleKey: 'utilities.interestTitle',
        descKey: 'utilities.interestDesc',
        icon: 'trending-up',
        screen: 'InterestCalculator',
        color: '#4f46e5',
        bg: '#eef2ff',
      },
      {
        titleKey: 'utilities.loanTitle',
        descKey: 'utilities.loanDesc',
        icon: 'bank-outline',
        screen: 'LoanCalculator',
        color: '#7c3aed',
        bg: '#ede9fe',
      },
      {
        titleKey: 'utilities.taxTitle',
        descKey: 'utilities.taxDesc',
        icon: 'file-document-outline',
        screen: 'TaxCalculator',
        color: '#b45309',
        bg: '#fef3c7',
      },
      {
        titleKey: 'utilities.budgetRuleTitle',
        descKey: 'utilities.budgetRuleDesc',
        icon: 'chart-pie',
        screen: 'BudgetRule',
        color: '#4f46e5',
        bg: '#eef2ff',
      },
    ],
  },
  {
    titleKey: 'utilities.groupTools',
    icon: 'apps',
    tools: [
      {
        titleKey: 'utilities.currencyTitle',
        descKey: 'utilities.currencyDesc',
        icon: 'swap-horizontal',
        screen: 'CurrencyConverter',
        color: '#7c3aed',
        bg: '#ede9fe',
      },
      {
        titleKey: 'utilities.marketGoldTitle',
        descKey: 'utilities.marketGoldDesc',
        icon: 'gold',
        screen: 'MarketGoldPrices',
        color: '#b45309',
        bg: '#fef3c7',
      },
      {
        titleKey: 'utilities.billSplitTitle',
        descKey: 'utilities.billSplitDesc',
        icon: 'account-group-outline',
        screen: 'BillSplitter',
        color: '#0891b2',
        bg: '#ecfeff',
      },
      {
        titleKey: 'utilities.breakevenTitle',
        descKey: 'utilities.breakevenDesc',
        icon: 'scale-balance',
        screen: 'Breakeven',
        color: '#e11d48',
        bg: '#fff1f2',
      },
    ],
  },
];

export function UtilitiesScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const typo = useTypography();
  const { top, bottom } = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <View className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4" style={{ paddingTop: top + 12, paddingBottom: 12 }}>
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} className="mr-3">
            <MaterialCommunityIcons name="chevron-left" size={26} color="#4f46e5" />
          </TouchableOpacity>
          <Text className={`${typo.section} text-gray-900 dark:text-white flex-1`}>{t('tools.title')}</Text>
        </View>
        <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 mt-0.5`}>{t('tools.subtitle')}</Text>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 4, paddingBottom: bottom + 32 }}>
        {TOOL_GROUPS.map((group) => (
          <View key={group.titleKey} className="mb-5">
            <View className="flex-row items-center mb-3">
              <MaterialCommunityIcons name={group.icon} size={15} color="#6b7280" style={{ marginRight: 6 }} />
              <Text className={`${typo.captionBold} text-gray-500 uppercase tracking-wide`}>
                {t(group.titleKey)}
              </Text>
            </View>

            <View className="flex-row flex-wrap" style={{ gap: 12 }}>
              {group.tools.map((tool) => (
                <TouchableOpacity
                  key={tool.screen}
                  onPress={() => navigation.navigate(tool.screen)}
                  activeOpacity={0.75}
                  className="bg-white rounded-2xl p-4 border border-gray-100"
                  style={{ width: '47.5%' }}
                >
                  <View
                    className="w-12 h-12 rounded-xl items-center justify-center mb-3"
                    style={{ backgroundColor: tool.bg }}
                  >
                    <MaterialCommunityIcons name={tool.icon} size={24} color={tool.color} />
                  </View>
                  <Text className={`${typo.labelBold} text-gray-900 mb-1`} numberOfLines={2}>
                    {t(tool.titleKey)}
                  </Text>
                  <Text className={`${typo.caption} text-gray-500`} numberOfLines={2}>
                    {t(tool.descKey)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
