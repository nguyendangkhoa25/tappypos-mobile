import { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { SPECIFIC_SHOP_TYPES, SHOP_TYPE_GROUPS, getBackendCode } from '../../utils/shopTypes';
import { useOnboardingStore } from '../../store/onboardingStore';
import { OnboardingHeader } from './OnboardingHeader';
import type { OnboardingScreenProps } from '../../types/navigation';

export function ShopTypeScreen({ navigation }: OnboardingScreenProps<'ShopType'>) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { shopTypeCode, setShopType, setStep2, setStep3, completeStep } = useOnboardingStore();
  const [selected, setSelected] = useState<string>(shopTypeCode ?? '');
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [filter, setFilter] = useState('');

  const filteredTypes = useMemo(() => {
    const q = filter.toLowerCase().trim();
    const byGroup = activeGroup
      ? SPECIFIC_SHOP_TYPES.filter((t) => t.group === activeGroup)
      : SPECIFIC_SHOP_TYPES;
    if (!q) return byGroup;
    return byGroup.filter((type) => {
      const name = t(`onboarding.shopType.specific.${type.id}.name`);
      const examples = t(`onboarding.shopType.specific.${type.id}.examples`, { defaultValue: '' });
      return name.toLowerCase().includes(q) || examples.toLowerCase().includes(q);
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
              total={4}
              onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
            />

            <Text className="text-2xl font-bold text-gray-900 dark:text-white mt-6 mb-1">
              {t('onboarding.shopType.title')}
            </Text>
            <Text className="text-sm text-gray-500 dark:text-gray-400 leading-5 mb-4">
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
                className="flex-1 text-sm text-gray-800 dark:text-gray-100"
                returnKeyType="done"
              />
              {filter.length > 0 && (
                <TouchableOpacity onPress={() => setFilter('')}>
                  <MaterialCommunityIcons name="close-circle" size={16} color="#9ca3af" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Group chips — horizontal scroll, full bleed */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 24, gap: 8 }}
            className="mb-4"
          >
            {/* All */}
            <TouchableOpacity
              onPress={() => handleGroupPress(null)}
              activeOpacity={0.7}
              className={`flex-row items-center rounded-full border px-4 py-2 ${
                activeGroup === null && !filter
                  ? 'bg-primary border-primary'
                  : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-600'
              }`}
            >
              <Text
                className={`text-sm font-semibold ${
                  activeGroup === null && !filter
                    ? 'text-white'
                    : 'text-gray-600 dark:text-gray-300'
                }`}
              >
                {t('onboarding.shopType.groupAll')}
              </Text>
            </TouchableOpacity>

            {SHOP_TYPE_GROUPS.map((group) => {
              const isActive = activeGroup === group.id && !filter;
              return (
                <TouchableOpacity
                  key={group.id}
                  onPress={() => handleGroupPress(group.id)}
                  activeOpacity={0.7}
                  className={`flex-row items-center gap-1.5 rounded-full border px-4 py-2 ${
                    isActive
                      ? 'bg-primary border-primary'
                      : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-600'
                  }`}
                >
                  <Text style={{ fontSize: 14 }}>{group.emoji}</Text>
                  <Text
                    className={`text-sm font-semibold ${
                      isActive ? 'text-white' : 'text-gray-600 dark:text-gray-300'
                    }`}
                  >
                    {t(`onboarding.shopType.groups.${group.id}`)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Type list */}
          <View className="px-6 gap-2">
            {filteredTypes.map((type) => {
              const isSelected = selected === type.id;
              const localName = t(`onboarding.shopType.specific.${type.id}.name`);
              const examples = t(`onboarding.shopType.specific.${type.id}.examples`, {
                defaultValue: '',
              });
              return (
                <TouchableOpacity
                  key={type.id}
                  onPress={() => setSelected(type.id)}
                  activeOpacity={0.7}
                  className={`rounded-2xl p-4 flex-row items-center gap-3 border-2 ${
                    isSelected
                      ? 'bg-indigo-50 dark:bg-indigo-900/30 border-primary'
                      : 'bg-gray-50 dark:bg-gray-800 border-transparent'
                  }`}
                >
                  <Text style={{ fontSize: 28 }}>{type.emoji}</Text>
                  <View className="flex-1">
                    <Text
                      className={`text-sm font-bold ${
                        isSelected
                          ? 'text-primary dark:text-indigo-300'
                          : 'text-gray-800 dark:text-gray-100'
                      }`}
                    >
                      {localName}
                    </Text>
                    {examples ? (
                      <Text
                        className="text-xs text-gray-400 dark:text-gray-500 mt-0.5"
                        numberOfLines={1}
                      >
                        {examples}
                      </Text>
                    ) : null}
                  </View>
                  {isSelected && (
                    <MaterialCommunityIcons name="check-circle" size={20} color="#4f46e5" />
                  )}
                </TouchableOpacity>
              );
            })}
            {filteredTypes.length === 0 && (
              <Text className="text-sm text-gray-400 dark:text-gray-500 text-center py-10">
                {t('onboarding.shopType.noResults')}
              </Text>
            )}
          </View>
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
            className={`font-bold text-base ${selected ? 'text-white' : 'text-gray-400 dark:text-gray-500'}`}
          >
            {t('onboarding.shopType.continue')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
