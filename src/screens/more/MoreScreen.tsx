import { useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFeatureCheck } from '../../hooks/useFeature';
import { useUserStore } from '../../store/userStore';
import { useTypography } from '../../hooks/useTypography';
import { SUPPORT } from '../../utils/constants';
import type { MoreScreenProps } from '../../types/navigation';

type ListItem = {
  key: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  label: string;
  hint?: string;
  onPress: () => void;
};

export function MoreScreen({ navigation }: MoreScreenProps<'MoreMain'>) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const typo = useTypography();
  const has = useFeatureCheck();
  const { nickname, fullName } = useUserStore();
  const openLink = (url: string) => Linking.openURL(url).catch(() => {});

  const displayName = nickname || fullName || t('profile.unknown');
  const initials = displayName.trim().charAt(0).toUpperCase();

  // First 2 sections expanded by default, rest collapsed
  const SECTION_KEYS = ['catalog', 'people', 'ops', 'shopConfig', 'tools', 'support', 'settings'] as const;
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(
    new Set(SECTION_KEYS.slice(2)),
  );
  const toggle = (key: string) =>
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  // ── Catalog section ──────────────────────────────────────────────────────────
  const catalogItems: ListItem[] = [
    {
      key: 'products',
      icon: 'package-variant-closed',
      iconBg: 'bg-violet-100 dark:bg-violet-900/30',
      iconColor: '#7c3aed',
      label: t('more.products'),
      hint: t('products.hint'),
      onPress: () => navigation.navigate('Products'),
    },
    {
      key: 'categories',
      icon: 'tag-multiple-outline',
      iconBg: 'bg-pink-100 dark:bg-pink-900/30',
      iconColor: '#db2777',
      label: t('more.categories'),
      hint: t('categories.hint'),
      onPress: () => navigation.navigate('Categories'),
    },
    {
      key: 'combos',
      icon: 'gift-outline',
      iconBg: 'bg-orange-100 dark:bg-orange-900/30',
      iconColor: '#ea580c',
      label: t('more.combos'),
      hint: t('combos.hint'),
      onPress: () => navigation.navigate('Combos'),
    },
    ...(has('INVENTORY') ? [{
      key: 'inventory',
      icon: 'warehouse',
      iconBg: 'bg-indigo-100 dark:bg-indigo-900/30',
      iconColor: '#4f46e5',
      label: t('more.inventory'),
      hint: t('inventory.hint'),
      onPress: () => navigation.navigate('Inventory'),
    } as ListItem] : []),
  ];

  // ── People section ───────────────────────────────────────────────────────────
  const peopleItems: ListItem[] = [
    {
      key: 'customers',
      icon: 'account-group-outline',
      iconBg: 'bg-blue-100 dark:bg-blue-900/30',
      iconColor: '#2563eb',
      label: t('more.customers'),
      hint: t('customers.hint'),
      onPress: () => navigation.navigate('Customers'),
    },
    ...(has('APPOINTMENT') ? [{
      key: 'appointments',
      icon: 'calendar-clock-outline',
      iconBg: 'bg-teal-100 dark:bg-teal-900/30',
      iconColor: '#0d9488',
      label: t('more.appointments'),
      hint: t('appt.hint'),
      onPress: () => navigation.navigate('AppointmentList'),
    } as ListItem] : []),
    ...(has('USER') ? [{
      key: 'staff',
      icon: 'account-multiple-outline',
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/30',
      iconColor: '#059669',
      label: t('more.staff'),
      hint: t('staff.hint'),
      onPress: () => navigation.navigate('StaffList'),
    } as ListItem] : []),
    ...(has('ORDER_VIEW_ALL') ? [{
      key: 'staffPerformance',
      icon: 'chart-bar',
      iconBg: 'bg-violet-100 dark:bg-violet-900/30',
      iconColor: '#7c3aed',
      label: t('more.staffPerformance'),
      hint: t('perf.hint'),
      onPress: () => navigation.navigate('StaffPerformance'),
    } as ListItem] : []),
  ];

  // ── Operations section ───────────────────────────────────────────────────────
  const opsItems: ListItem[] = [
    {
      key: 'mywork',
      icon: 'clipboard-check-outline',
      iconBg: 'bg-teal-100 dark:bg-teal-900/30',
      iconColor: '#0d9488',
      label: t('more.myWork'),
      hint: t('myWork.hint'),
      onPress: () => navigation.navigate('MyWork'),
    },
    ...(has('ORDER_VIEW_ALL') ? [{
      key: 'queueView',
      icon: 'account-clock-outline',
      iconBg: 'bg-indigo-100 dark:bg-indigo-900/30',
      iconColor: '#4f46e5',
      label: t('more.queueView'),
      hint: t('queue.hint'),
      onPress: () => navigation.navigate('QueueView'),
    } as ListItem] : []),
    ...(has('GOLD_PRICE') || has('PAWN') ? [{
      key: 'goldPrice',
      icon: 'gold',
      iconBg: 'bg-amber-100 dark:bg-amber-900/30',
      iconColor: '#d97706',
      label: t('more.goldPrice'),
      hint: t('gold.hint'),
      onPress: () => navigation.navigate('GoldPrice'),
    } as ListItem] : []),
    ...(has('NOTIFICATION') ? [{
      key: 'notifications',
      icon: 'bell-outline',
      iconBg: 'bg-yellow-100 dark:bg-yellow-900/30',
      iconColor: '#ca8a04',
      label: t('more.notifications'),
      hint: t('notifications.hint'),
      onPress: () => navigation.navigate('Notifications'),
    } as ListItem] : []),
  ];

  // ── Tools section ────────────────────────────────────────────────────────────
  const toolsItems: ListItem[] = [
    {
      key: 'currencyConverter',
      icon: 'swap-horizontal',
      iconBg: 'bg-violet-100 dark:bg-violet-900/30',
      iconColor: '#7c3aed',
      label: t('utilities.currencyTitle'),
      hint: t('currencyConverter.hint'),
      onPress: () => navigation.navigate('CurrencyConverter'),
    },
    {
      key: 'interestCalc',
      icon: 'trending-up',
      iconBg: 'bg-indigo-100 dark:bg-indigo-900/30',
      iconColor: '#4f46e5',
      label: t('utilities.interestTitle'),
      hint: t('interestCalc.hint'),
      onPress: () => navigation.navigate('InterestCalculator'),
    },
    {
      key: 'loanCalc',
      icon: 'bank-outline',
      iconBg: 'bg-purple-100 dark:bg-purple-900/30',
      iconColor: '#7c3aed',
      label: t('utilities.loanTitle'),
      hint: t('loanCalc.hint'),
      onPress: () => navigation.navigate('LoanCalculator'),
    },
    {
      key: 'taxCalc',
      icon: 'file-document-outline',
      iconBg: 'bg-amber-100 dark:bg-amber-900/30',
      iconColor: '#b45309',
      label: t('utilities.taxTitle'),
      hint: t('taxCalc.hint'),
      onPress: () => navigation.navigate('TaxCalculator'),
    },
    {
      key: 'budgetRule',
      icon: 'chart-pie',
      iconBg: 'bg-indigo-100 dark:bg-indigo-900/30',
      iconColor: '#4f46e5',
      label: t('utilities.budgetRuleTitle'),
      hint: t('budgetRule.hint'),
      onPress: () => navigation.navigate('BudgetRule'),
    },
    {
      key: 'billSplit',
      icon: 'account-group-outline',
      iconBg: 'bg-cyan-100 dark:bg-cyan-900/30',
      iconColor: '#0891b2',
      label: t('utilities.billSplitTitle'),
      hint: t('more.hintBillSplit'),
      onPress: () => navigation.navigate('BillSplitter'),
    },
    {
      key: 'breakeven',
      icon: 'scale-balance',
      iconBg: 'bg-rose-100 dark:bg-rose-900/30',
      iconColor: '#e11d48',
      label: t('utilities.breakevenTitle'),
      hint: t('breakeven.hint'),
      onPress: () => navigation.navigate('Breakeven'),
    },
    {
      key: 'marketGoldPrices',
      icon: 'gold',
      iconBg: 'bg-amber-100 dark:bg-amber-900/30',
      iconColor: '#b45309',
      label: t('utilities.marketGoldTitle'),
      hint: t('marketGold.hint'),
      onPress: () => navigation.navigate('MarketGoldPrices'),
    },
  ];

  // ── Shop config section (list rows) ─────────────────────────────────────────
  const shopConfigItems: ListItem[] = [
    {
      key: 'shopInfo',
      icon: 'store-outline',
      iconBg: 'bg-indigo-100 dark:bg-indigo-900/30',
      iconColor: '#4f46e5',
      label: t('more.shopInfo'),
      hint: t('settings.shopInfo.hint'),
      onPress: () => navigation.navigate('ShopInfo'),
    },
    {
      key: 'posConfig',
      icon: 'point-of-sale',
      iconBg: 'bg-purple-100 dark:bg-purple-900/30',
      iconColor: '#9333ea',
      label: t('more.posConfig'),
      hint: t('settings.posConfig.hint'),
      onPress: () => navigation.navigate('POSConfig'),
    },
    ...(has('SHOP_SETTING') ? [{
      key: 'bankAccounts',
      icon: 'bank-outline',
      iconBg: 'bg-indigo-100 dark:bg-indigo-900/30',
      iconColor: '#4f46e5',
      label: t('more.bankAccounts'),
      hint: t('settings.bankAccounts.hint'),
      onPress: () => navigation.navigate('BankAccounts'),
    } as ListItem] : []),
    {
      key: 'defaultExpenses',
      icon: 'receipt',
      iconBg: 'bg-amber-100 dark:bg-amber-900/30',
      iconColor: '#d97706',
      label: t('more.defaultExpenses'),
      hint: t('more.hintDefaultExpenses'),
      onPress: () => navigation.navigate('DefaultExpenses'),
    },
    {
      key: 'printTemplates',
      icon: 'printer-outline',
      iconBg: 'bg-slate-100 dark:bg-slate-800',
      iconColor: '#475569',
      label: t('more.printTemplates'),
      hint: t('printTemplates.hint'),
      onPress: () => navigation.navigate('PrintTemplates'),
    },
    ...(has('LOYALTY') ? [{
      key: 'loyaltyConfig',
      icon: 'star-circle-outline',
      iconBg: 'bg-pink-100 dark:bg-pink-900/30',
      iconColor: '#db2777',
      label: t('more.loyaltyConfig'),
      hint: t('more.hintLoyaltyConfig'),
      onPress: () => navigation.navigate('LoyaltyConfig'),
    } as ListItem] : []),
    {
      key: 'display',
      icon: 'palette-outline',
      iconBg: 'bg-pink-100 dark:bg-pink-900/30',
      iconColor: '#ec4899',
      label: t('settings.display'),
      hint: t('settings.displaySettings.hint'),
      onPress: () => navigation.navigate('Display'),
    },
    ...(has('NOTIFICATION') ? [{
      key: 'notificationPreferences',
      icon: 'bell-cog-outline',
      iconBg: 'bg-yellow-100 dark:bg-yellow-900/30',
      iconColor: '#ca8a04',
      label: t('settings.notificationPreferences.title'),
      hint: t('settings.notificationPreferences.hint'),
      onPress: () => navigation.navigate('NotificationPreferences'),
    } as ListItem] : []),
  ];

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900" style={{ paddingTop: insets.top }}>
      <View className="px-5 pt-4 pb-3 bg-gray-50 dark:bg-gray-900">
        <Text className={`${typo.heading} text-gray-900 dark:text-white`}>{t('more.title')}</Text>
        <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 mt-0.5`}>{t('more.hint')}</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 32 }}
      >
        {/* Profile card */}
        <TouchableOpacity
          onPress={() => navigation.navigate('ProfileUpdate')}
          activeOpacity={0.7}
          className="bg-white dark:bg-gray-800 rounded-2xl p-4 mb-1 flex-row items-center gap-3 border border-gray-100 dark:border-gray-700"
        >
          <View className="w-14 h-14 rounded-2xl bg-indigo-600 items-center justify-center flex-shrink-0">
            <Text className={`${typo.section} text-white`}>{initials}</Text>
          </View>
          <View className="flex-1">
            <Text className={`${typo.labelBold} text-gray-900 dark:text-white`} numberOfLines={1}>{displayName}</Text>
            {fullName && fullName !== displayName ? (
              <Text className={`${typo.caption} text-gray-400 dark:text-gray-500 mt-0.5`} numberOfLines={1}>{fullName}</Text>
            ) : null}
            <Text className={`${typo.caption} text-indigo-500 mt-1`}>{t('settings.profileSettings.title')} & {t('settings.title').toLowerCase()}</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={20} color="#9ca3af" />
        </TouchableOpacity>

        {catalogItems.length > 0 && (
          <>
            <SectionLabel label={t('more.sectionCatalog')} isCollapsed={collapsedSections.has('catalog')} onToggle={() => toggle('catalog')} />
            {!collapsedSections.has('catalog') && (
              <View className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700">
                {catalogItems.map((item, index) => (
                  <ConfigRow key={item.key} item={item} isLast={index === catalogItems.length - 1} />
                ))}
              </View>
            )}
          </>
        )}

        {peopleItems.length > 0 && (
          <>
            <SectionLabel label={t('more.sectionPeople')} isCollapsed={collapsedSections.has('people')} onToggle={() => toggle('people')} />
            {!collapsedSections.has('people') && (
              <View className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700">
                {peopleItems.map((item, index) => (
                  <ConfigRow key={item.key} item={item} isLast={index === peopleItems.length - 1} />
                ))}
              </View>
            )}
          </>
        )}

        {opsItems.length > 0 && (
          <>
            <SectionLabel label={t('more.sectionOperations')} isCollapsed={collapsedSections.has('ops')} onToggle={() => toggle('ops')} />
            {!collapsedSections.has('ops') && (
              <View className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700">
                {opsItems.map((item, index) => (
                  <ConfigRow key={item.key} item={item} isLast={index === opsItems.length - 1} />
                ))}
              </View>
            )}
          </>
        )}

        <SectionLabel label={t('more.sectionShopConfig')} isCollapsed={collapsedSections.has('shopConfig')} onToggle={() => toggle('shopConfig')} />
        {!collapsedSections.has('shopConfig') && (
          <View className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700">
            {shopConfigItems.map((item, index) => (
              <ConfigRow key={item.key} item={item} isLast={index === shopConfigItems.length - 1} />
            ))}
          </View>
        )}

        <SectionLabel label={t('tools.title')} isCollapsed={collapsedSections.has('tools')} onToggle={() => toggle('tools')} />
        {!collapsedSections.has('tools') && (
          <View className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700">
            {toolsItems.map((item, index) => (
              <ConfigRow key={item.key} item={item} isLast={index === toolsItems.length - 1} />
            ))}
          </View>
        )}

        <SectionLabel label={t('settings.sectionSupport')} isCollapsed={collapsedSections.has('support')} onToggle={() => toggle('support')} />
        {!collapsedSections.has('support') && (
          <View className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700">
            {has('FEEDBACK') && (
              <ConfigRow
                item={{
                  key: 'feedback',
                  icon: 'message-text-outline',
                  iconBg: 'bg-sky-100 dark:bg-sky-900/30',
                  iconColor: '#0284c7',
                  label: t('settings.feedback.title'),
                  hint: t('settings.feedback.hint'),
                  onPress: () => navigation.navigate('Feedback'),
                }}
                isLast={false}
              />
            )}
            <ConfigRow
              item={{
                key: 'hotline',
                icon: 'phone-outline',
                iconBg: 'bg-teal-100 dark:bg-teal-900/30',
                iconColor: '#0f766e',
                label: `${t('settings.hotline')}: ${SUPPORT.phone}`,
                hint: t('more.hintHotline'),
                onPress: () => openLink(`tel:${SUPPORT.phone}`),
              }}
              isLast={false}
            />
            <ConfigRow
              item={{
                key: 'email',
                icon: 'email-outline',
                iconBg: 'bg-blue-100 dark:bg-blue-900/30',
                iconColor: '#2563eb',
                label: SUPPORT.email,
                hint: t('more.hintEmail'),
                onPress: () => openLink(`mailto:${SUPPORT.email}`),
              }}
              isLast={false}
            />
            <ConfigRow
              item={{
                key: 'zalo',
                icon: 'chat-outline',
                iconBg: 'bg-sky-100 dark:bg-sky-900/30',
                iconColor: '#0ea5e9',
                label: 'Zalo',
                hint: t('more.hintZalo'),
                onPress: () => openLink(SUPPORT.zaloOA),
              }}
              isLast
            />
          </View>
        )}

        <SectionLabel label={t('settings.title')} isCollapsed={collapsedSections.has('settings')} onToggle={() => toggle('settings')} />
        {!collapsedSections.has('settings') && (
          <TouchableOpacity
            testID="more-settings-entry"
            onPress={() => navigation.navigate('Settings')}
            activeOpacity={0.7}
            className="bg-white dark:bg-gray-800 rounded-2xl p-4 flex-row items-center gap-3 border border-gray-100 dark:border-gray-700"
          >
            <View className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-700 items-center justify-center">
              <MaterialCommunityIcons name="cog-outline" size={24} color="#6b7280" />
            </View>
            <View className="flex-1">
              <Text className={`${typo.labelBold} text-gray-800 dark:text-gray-100`}>
                {t('settings.title')}
              </Text>
              <Text className={`${typo.caption} text-gray-400 dark:text-gray-500 mt-0.5`}>
                {t('more.settingsHint')}
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color="#9ca3af" />
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

function SectionLabel({ label, isCollapsed, onToggle }: { label: string; isCollapsed: boolean; onToggle: () => void }) {
  const typo = useTypography();
  return (
    <TouchableOpacity
      onPress={onToggle}
      activeOpacity={0.6}
      className="flex-row items-center justify-between mb-2 mt-4 px-1"
    >
      <Text className={`${typo.captionBold} text-gray-400 dark:text-gray-500 uppercase tracking-wide`}>
        {label}
      </Text>
      <MaterialCommunityIcons
        name={isCollapsed ? 'chevron-down' : 'chevron-up'}
        size={15}
        color="#9ca3af"
      />
    </TouchableOpacity>
  );
}

function ConfigRow({ item, isLast }: { item: ListItem; isLast: boolean }) {
  const typo = useTypography();
  return (
    <>
      <TouchableOpacity
        testID={`more-config-${item.key}`}
        onPress={item.onPress}
        activeOpacity={0.7}
        className="flex-row items-center px-4 py-3.5"
      >
        <View className={`w-9 h-9 rounded-xl ${item.iconBg} items-center justify-center mr-3 flex-shrink-0`}>
          <MaterialCommunityIcons name={item.icon as any} size={18} color={item.iconColor} />
        </View>
        <View className="flex-1">
          <Text className={`${typo.caption} font-medium text-gray-800 dark:text-gray-100`} numberOfLines={1}>
            {item.label}
          </Text>
          {item.hint && (
            <Text className={`${typo.caption} text-gray-400 dark:text-gray-500 mt-0.5`} numberOfLines={1}>
              {item.hint}
            </Text>
          )}
        </View>
        <MaterialCommunityIcons name="chevron-right" size={16} color="#9ca3af" />
      </TouchableOpacity>
      {!isLast && <View className="h-px bg-gray-100 dark:bg-gray-700 ml-16" />}
    </>
  );
}
