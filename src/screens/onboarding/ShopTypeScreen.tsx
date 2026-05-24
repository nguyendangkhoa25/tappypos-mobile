import { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import {
  SPECIFIC_SHOP_TYPES,
  SHOP_TYPE_GROUPS,
  getBackendCode,
  isGroupSupported,
  type SpecificShopType,
} from '../../utils/shopTypes';
import { useOnboardingStore } from '../../store/onboardingStore';
import { useAuthStore } from '../../store/authStore';
import { useOnboardingFlow } from '../../hooks/useOnboardingFlow';
import { OnboardingHeader } from './OnboardingHeader';
import { useTypography } from '../../hooks/useTypography';
import type { OnboardingScreenProps } from '../../types/navigation';

export function ShopTypeScreen({ navigation }: OnboardingScreenProps<'ShopType'>) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const typo = useTypography();
  const { shopTypeCode, setShopType, setStep2, setStep3, completeStep } = useOnboardingStore();
  const { totalSteps } = useOnboardingFlow();
  const logout = useAuthStore((s) => s.logout);
  const [selected, setSelected] = useState<string>(shopTypeCode ?? '');
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  // Unsupported groups are collapsed by default; user can expand to browse
  const [expandedUnsupported, setExpandedUnsupported] = useState<Set<string>>(new Set());

  const toggleUnsupportedGroup = (groupId: string) => {
    setExpandedUnsupported((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const canGoBack = navigation.canGoBack();

  // Two cards per row with 24px side padding and 8px gap between cards
  const cardWidth = (Dimensions.get('window').width - 48 - 8) / 2;

  const filteredTypes = useMemo(() => {
    const normalize = (s: string) =>
      s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const q = normalize(filter.trim());
    const byGroup = activeGroup
      ? SPECIFIC_SHOP_TYPES.filter((s) => s.group === activeGroup)
      : SPECIFIC_SHOP_TYPES;
    if (!q) return byGroup;
    return byGroup.filter((type) => {
      const name = normalize(t(`onboarding.shopType.specific.${type.id}.name`));
      const examples = normalize(t(`onboarding.shopType.specific.${type.id}.examples`, { defaultValue: '' }));
      return name.includes(q) || examples.includes(q);
    });
  }, [activeGroup, filter, t]);

  const handleGroupPress = (groupId: string | null) => {
    setActiveGroup(groupId);
    setFilter('');
  };

  const handleContinue = () => {
    if (!selected) return;
    if (getBackendCode(selected) !== getBackendCode(shopTypeCode)) {
      setStep2({ products: [] });
      setStep3({ expenses: [] });
    }
    setShopType(selected);
    completeStep(0);
    navigation.navigate('Step1');
  };

  const renderGridCard = (type: SpecificShopType) => {
    const supported = isGroupSupported(type.group);
    const isSelected = selected === type.id;
    const localName = t(`onboarding.shopType.specific.${type.id}.name`);

    if (!supported) {
      return (
        <View
          key={type.id}
          style={{ width: cardWidth, minHeight: 88, opacity: 0.45 }}
          className="rounded-2xl p-3 items-center justify-center border-2 bg-gray-50 dark:bg-gray-800 border-transparent"
        >
          <Text className={typo.heading}>{type.emoji}</Text>
          <Text
            className={`${typo.captionBold} text-center mt-1.5 leading-4 text-gray-500 dark:text-gray-400`}
            numberOfLines={2}
          >
            {localName}
          </Text>
          <View className="absolute top-1.5 right-1.5 bg-gray-200 dark:bg-gray-700 rounded-full px-1.5 py-0.5">
            <Text className={`${typo.caption} text-gray-400 dark:text-gray-500`}>
              {t('onboarding.shopType.comingSoon')}
            </Text>
          </View>
        </View>
      );
    }

    return (
      <TouchableOpacity
        key={type.id}
        onPress={() => setSelected(type.id)}
        activeOpacity={0.7}
        style={{ width: cardWidth, minHeight: 88 }}
        className={`rounded-2xl p-3 items-center justify-center border-2 ${
          isSelected
            ? 'bg-indigo-50 dark:bg-indigo-900/30 border-primary'
            : 'bg-gray-50 dark:bg-gray-800 border-transparent'
        }`}
      >
        <Text className={typo.heading}>{type.emoji}</Text>
        <Text
          className={`${typo.captionBold} text-center mt-1.5 leading-4 ${
            isSelected ? 'text-primary dark:text-indigo-300' : 'text-gray-700 dark:text-gray-200'
          }`}
          numberOfLines={2}
        >
          {localName}
        </Text>
        {isSelected && (
          <View className="absolute top-1.5 right-1.5">
            <MaterialCommunityIcons name="check-circle" size={14} color="#4f46e5" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const showGrouped = !activeGroup && !filter;

  return (
    <View className="flex-1 bg-white dark:bg-gray-900" style={{ paddingTop: insets.top }}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View className="pt-8 pb-4">
          <View className="px-6">
            <OnboardingHeader
              step={0}
              total={totalSteps}
              onBack={canGoBack ? () => navigation.goBack() : undefined}
            />
            {!canGoBack && (
              <TouchableOpacity onPress={logout} className="self-end mt-1 py-1">
                <Text className={`${typo.caption} text-gray-400 dark:text-gray-500`}>
                  {t('auth.logout')}
                </Text>
              </TouchableOpacity>
            )}

            <Text className={`${typo.heading} text-gray-900 dark:text-white mt-6 mb-1`}>
              {t('onboarding.shopType.title')}
            </Text>
            <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 leading-5 mb-4`}>
              {t('onboarding.shopType.subtitle')}
            </Text>

            {/* Search input */}
            <View className="flex-row items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-2xl px-3.5 py-3 mb-3 border border-gray-100 dark:border-gray-700">
              <MaterialCommunityIcons name="magnify" size={18} color="#9ca3af" />
              <TextInput
                value={filter}
                onChangeText={(v) => {
                  setFilter(v);
                  if (v) setActiveGroup(null);
                }}
                placeholder={t('onboarding.shopType.filterPlaceholder')}
                placeholderTextColor="#9ca3af"
                className={`flex-1 ${typo.inputSize} text-gray-800 dark:text-gray-100`}
                returnKeyType="done"
              />
              {filter.length > 0 && (
                <TouchableOpacity onPress={() => setFilter('')}>
                  <MaterialCommunityIcons name="close-circle" size={16} color="#9ca3af" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Group filter chips — horizontal scroll */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 24, gap: 8 }}
            className="mb-5"
          >
            <TouchableOpacity
              onPress={() => handleGroupPress(null)}
              activeOpacity={0.7}
              className={`flex-row items-center rounded-full border px-4 py-2 ${
                showGrouped
                  ? 'bg-primary border-primary'
                  : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-600'
              }`}
            >
              <Text
                className={`${typo.label} ${
                  showGrouped ? 'text-white' : 'text-gray-600 dark:text-gray-300'
                }`}
              >
                {t('onboarding.shopType.groupAll')}
              </Text>
            </TouchableOpacity>

            {SHOP_TYPE_GROUPS.map((group) => {
              const isActive = activeGroup === group.id && !filter;
              const supported = isGroupSupported(group.id);
              return (
                <TouchableOpacity
                  key={group.id}
                  onPress={() => handleGroupPress(group.id)}
                  activeOpacity={0.7}
                  style={!supported ? { opacity: 0.45 } : undefined}
                  className={`flex-row items-center gap-1.5 rounded-full border px-4 py-2 ${
                    isActive
                      ? 'bg-primary border-primary'
                      : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-600'
                  }`}
                >
                  <Text className={typo.label}>{group.emoji}</Text>
                  <Text
                    className={`${typo.label} ${
                      isActive ? 'text-white' : 'text-gray-600 dark:text-gray-300'
                    }`}
                  >
                    {t(`onboarding.shopType.groups.${group.id}`)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Shop type grid */}
          {showGrouped ? (
            // All selected: supported groups first, then collapsed "coming soon" section
            <View className="px-6 gap-6">
              {/* ── Supported groups ── */}
              {SHOP_TYPE_GROUPS.filter((g) => isGroupSupported(g.id)).map((group) => {
                const groupTypes = SPECIFIC_SHOP_TYPES.filter((s) => s.group === group.id);
                return (
                  <View key={group.id}>
                    <View className="flex-row items-center gap-2 mb-3">
                      <Text className={typo.label}>{group.emoji}</Text>
                      <Text className={`${typo.captionBold} text-gray-400 dark:text-gray-500 uppercase tracking-widest`}>
                        {t(`onboarding.shopType.groups.${group.id}`)}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {groupTypes.map((type) => renderGridCard(type))}
                    </View>
                  </View>
                );
              })}

              {/* ── "Coming soon" divider ── */}
              <View className="flex-row items-center gap-3 mt-2">
                <View className="flex-1 h-px bg-gray-100 dark:bg-gray-700" />
                <View className="flex-row items-center gap-1.5 bg-gray-100 dark:bg-gray-800 rounded-full px-3 py-1">
                  <MaterialCommunityIcons name="clock-outline" size={12} color="#9ca3af" />
                  <Text className={`${typo.caption} text-gray-400 dark:text-gray-500`}>
                    {t('onboarding.shopType.comingSoon')}
                  </Text>
                </View>
                <View className="flex-1 h-px bg-gray-100 dark:bg-gray-700" />
              </View>

              {/* ── Unsupported groups — collapsed by default ── */}
              {SHOP_TYPE_GROUPS.filter((g) => !isGroupSupported(g.id)).map((group) => {
                const groupTypes = SPECIFIC_SHOP_TYPES.filter((s) => s.group === group.id);
                const isExpanded = expandedUnsupported.has(group.id);
                return (
                  <View key={group.id}>
                    <TouchableOpacity
                      onPress={() => toggleUnsupportedGroup(group.id)}
                      activeOpacity={0.7}
                      className="flex-row items-center gap-2"
                    >
                      <Text className={`${typo.label} opacity-40`}>{group.emoji}</Text>
                      <Text
                        className={`${typo.captionBold} text-gray-300 dark:text-gray-600 uppercase tracking-widest flex-1`}
                      >
                        {t(`onboarding.shopType.groups.${group.id}`)}
                      </Text>
                      <MaterialCommunityIcons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={16}
                        color="#d1d5db"
                      />
                    </TouchableOpacity>
                    {isExpanded && (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                        {groupTypes.map((type) => renderGridCard(type))}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          ) : (
            // Filtered / group-specific: flat 2-column grid
            <View className="px-6">
              {filteredTypes.length > 0 ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {filteredTypes.map((type) => renderGridCard(type))}
                </View>
              ) : (
                <Text className={`${typo.caption} text-gray-400 dark:text-gray-500 text-center py-10`}>
                  {t('onboarding.shopType.noResults')}
                </Text>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      <View
        className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-900 px-6 pt-4 border-t border-gray-100 dark:border-gray-700"
        style={{ paddingBottom: insets.bottom + 16 }}
      >
        <TouchableOpacity
          className={`rounded-2xl py-4 items-center justify-center ${
            selected ? 'bg-primary active:opacity-80' : 'bg-gray-200 dark:bg-gray-700'
          }`}
          onPress={handleContinue}
          disabled={!selected}
        >
          <Text
            className={`${typo.labelBold} ${
              selected ? 'text-white' : 'text-gray-400 dark:text-gray-500'
            }`}
          >
            {t('onboarding.shopType.continue')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
