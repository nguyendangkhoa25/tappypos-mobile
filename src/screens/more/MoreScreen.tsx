import { ScrollView, View, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFeatureCheck } from '../../hooks/useFeature';
import type { MoreScreenProps } from '../../types/navigation';

type GridItem = {
  key: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  label: string;
  onPress: () => void;
};

export function MoreScreen({ navigation }: MoreScreenProps<'MoreMain'>) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const has = useFeatureCheck();

  const manageItems: GridItem[] = [
    {
      key: 'products',
      icon: 'package-variant-closed',
      iconBg: 'bg-violet-100 dark:bg-violet-900/30',
      iconColor: '#7c3aed',
      label: t('more.products'),
      onPress: () => navigation.navigate('Products'),
    },
    {
      key: 'inventory',
      icon: 'warehouse',
      iconBg: 'bg-indigo-100 dark:bg-indigo-900/30',
      iconColor: '#4f46e5',
      label: t('more.inventory'),
      onPress: () => navigation.navigate('Inventory'),
    },
    {
      key: 'customers',
      icon: 'account-group-outline',
      iconBg: 'bg-blue-100 dark:bg-blue-900/30',
      iconColor: '#2563eb',
      label: t('more.customers'),
      onPress: () => navigation.navigate('Customers'),
    },
    {
      key: 'combos',
      icon: 'gift-outline',
      iconBg: 'bg-orange-100 dark:bg-orange-900/30',
      iconColor: '#ea580c',
      label: t('more.combos'),
      onPress: () => navigation.navigate('Combos'),
    },
    {
      key: 'categories',
      icon: 'tag-multiple-outline',
      iconBg: 'bg-pink-100 dark:bg-pink-900/30',
      iconColor: '#db2777',
      label: t('more.categories'),
      onPress: () => navigation.navigate('Categories'),
    },
    {
      key: 'print',
      icon: 'printer-outline',
      iconBg: 'bg-slate-100 dark:bg-slate-800',
      iconColor: '#475569',
      label: t('more.printTemplates'),
      onPress: () => navigation.navigate('PrintTemplates'),
    },
  ];

  const opsItems: GridItem[] = [
    {
      key: 'goldPrice',
      icon: 'gold',
      iconBg: 'bg-amber-100 dark:bg-amber-900/30',
      iconColor: '#d97706',
      label: t('more.goldPrice'),
      onPress: () => navigation.navigate('GoldPrice'),
    },
    {
      key: 'mywork',
      icon: 'clipboard-check-outline',
      iconBg: 'bg-teal-100 dark:bg-teal-900/30',
      iconColor: '#0d9488',
      label: t('more.myWork'),
      onPress: () => navigation.navigate('MyWork'),
    },
    ...(has('NOTIFICATION') ? [{
      key: 'notifications',
      icon: 'bell-outline',
      iconBg: 'bg-yellow-100 dark:bg-yellow-900/30',
      iconColor: '#ca8a04',
      label: t('more.notifications'),
      onPress: () => navigation.navigate('Notifications'),
    } as GridItem] : []),
  ];

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900" style={{ paddingTop: insets.top }}>
      <View className="px-5 pt-4 pb-3 bg-gray-50 dark:bg-gray-900">
        <Text className="text-2xl font-bold text-gray-900 dark:text-white">{t('more.title')}</Text>
        <Text className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t('more.hint')}</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 32 }}
      >
        <SectionLabel label={t('more.sectionManage')} />
        <Grid items={manageItems} />

        <SectionLabel label={t('more.sectionOperations')} />
        <Grid items={opsItems} />

        <SectionLabel label={t('settings.title')} />
        <TouchableOpacity
          onPress={() => navigation.navigate('Settings')}
          activeOpacity={0.7}
          className="bg-white dark:bg-gray-800 rounded-2xl p-4 flex-row items-center gap-3 border border-gray-100 dark:border-gray-700"
        >
          <View className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-700 items-center justify-center">
            <MaterialCommunityIcons name="cog-outline" size={24} color="#6b7280" />
          </View>
          <View className="flex-1">
            <Text className="text-base font-semibold text-gray-800 dark:text-gray-100">
              {t('settings.title')}
            </Text>
            <Text className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {t('more.settingsHint')}
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={20} color="#9ca3af" />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <Text className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2 mt-4 px-1">
      {label}
    </Text>
  );
}

function Grid({ items }: { items: GridItem[] }) {
  const rows: GridItem[][] = [];
  for (let i = 0; i < items.length; i += 2) {
    rows.push(items.slice(i, i + 2));
  }
  return (
    <View className="gap-2">
      {rows.map((row, ri) => (
        <View key={ri} className="flex-row gap-2">
          {row.map((item) => (
            <GridTile key={item.key} item={item} />
          ))}
          {row.length === 1 && <View className="flex-1" />}
        </View>
      ))}
    </View>
  );
}

function GridTile({ item }: { item: GridItem }) {
  return (
    <TouchableOpacity
      onPress={item.onPress}
      activeOpacity={0.7}
      className="flex-1 bg-white dark:bg-gray-800 rounded-2xl p-4 items-center gap-2 border border-gray-100 dark:border-gray-700"
    >
      <View className={`w-12 h-12 rounded-2xl ${item.iconBg} items-center justify-center`}>
        <MaterialCommunityIcons name={item.icon as any} size={24} color={item.iconColor} />
      </View>
      <Text
        className="text-sm font-semibold text-gray-700 dark:text-gray-200 text-center leading-4"
        numberOfLines={2}
      >
        {item.label}
      </Text>
    </TouchableOpacity>
  );
}
