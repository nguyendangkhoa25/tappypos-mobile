import { useRef, useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard,
  type TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { tenantApi } from '../../services/api';
import { useOnboardingStore } from '../../store/onboardingStore';
import { OnboardingHeader } from './OnboardingHeader';
import { MoneyInput } from '../../components/MoneyInput';
import { ClearableInput } from '../../components/ClearableInput';
import { formatVnd } from '../../utils/format';
import { getBackendCode } from '../../utils/shopTypes';
import { ONBOARDING_UNITS, SHOP_TYPE_UNIT_PRIORITY, DEFAULT_ONBOARDING_UNIT, type UnitDef } from '../../constants/productConstants';
import type { OnboardingScreenProps } from '../../types/navigation';
import type { ProductTemplate } from '../../services/api';
import type { OnboardingProduct } from '../../store/onboardingStore';

export function Step2Screen({ navigation }: OnboardingScreenProps<'Step2'>) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { shopTypeCode, step2, addProduct, removeProduct, setStep2, completeStep } =
    useOnboardingStore();

  // current form state
  const [name, setName] = useState('');
  const [rawPrice, setRawPrice] = useState('');
  const [unit, setUnit] = useState(DEFAULT_ONBOARDING_UNIT);
  const [isDynamic, setIsDynamic] = useState(false);
  const [chipFilter, setChipFilter] = useState('');

  const [kbVisible, setKbVisible] = useState(false);

  const nameRef = useRef<TextInput>(null);
  const priceRef = useRef<TextInput>(null);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKbVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKbVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  const selectedIds = useMemo(
    () => new Set(step2.products.map((p) => p.templateId)),
    [step2.products],
  );

  const backendCode = getBackendCode(shopTypeCode);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['product-templates', backendCode],
    queryFn: async () => {
      const res = await tenantApi.getProductTemplates(backendCode ?? 'OTHER');
      return res.data.data as ProductTemplate[];
    },
    staleTime: 10 * 60_000,
  });

  // units ordered by: currently selected → shop type priority → rest
  const visibleUnits = useMemo(() => {
    const priority = [
      unit,
      ...(SHOP_TYPE_UNIT_PRIORITY[backendCode ?? ''] ?? []),
    ];
    const seen = new Set<string>();
    const ordered: UnitDef[] = [];
    for (const v of priority) {
      if (seen.has(v)) continue;
      seen.add(v);
      const def = ONBOARDING_UNITS.find((u) => u.value === v);
      if (def) ordered.push(def);
    }
    for (const def of ONBOARDING_UNITS) {
      if (!seen.has(def.value)) ordered.push(def);
    }
    return ordered;
  }, [shopTypeCode, unit]);

  // suggestion chips: filter by what's typed, not-selected first
  const visibleChips = useMemo(() => {
    const q = chipFilter.toLowerCase().trim();
    const notSel = templates.filter((t) => !selectedIds.has(t.id));
    const sel = templates.filter((t) => selectedIds.has(t.id));
    if (!q) return [...notSel, ...sel].slice(0, 20);
    const hit = (t: ProductTemplate) => t.name.toLowerCase().includes(q);
    return [...notSel.filter(hit), ...sel.filter(hit), ...notSel.filter((t) => !hit(t))].slice(0, 20);
  }, [templates, chipFilter, selectedIds]);

  const resetForm = () => {
    setName('');
    setRawPrice('');
    setUnit(DEFAULT_ONBOARDING_UNIT);
    setIsDynamic(false);
    setChipFilter('');
  };

  const handleNameChange = (v: string) => {
    setName(v);
    setChipFilter(v);
    if (!v.trim()) setIsDynamic(false);
  };

  const handleSuggestionPress = (tpl: ProductTemplate) => {
    // tap already-selected chip → remove it
    if (selectedIds.has(tpl.id)) {
      removeProduct(tpl.id);
      return;
    }
    setName(tpl.name);
    setChipFilter(tpl.name);
    setIsDynamic(tpl.dynamicPrice);
    setUnit(tpl.unit || DEFAULT_ONBOARDING_UNIT);
    setRawPrice(!tpl.dynamicPrice && tpl.price > 0 ? String(tpl.price) : '');
    setTimeout(() => {
      if (!tpl.dynamicPrice) priceRef.current?.focus();
    }, 50);
  };

  const doAdd = (
    n: string,
    price: string,
    u: string,
    dynamic: boolean,
  ) => {
    const trimmed = n.trim();
    if (!trimmed) return;
    const matched = templates.find((t) => t.name.toLowerCase() === trimmed.toLowerCase());
    const templateId = matched?.id ?? `custom_${Date.now()}`;
    if (selectedIds.has(templateId)) return; // already in list
    addProduct({
      templateId,
      name: trimmed,
      price: dynamic ? 0 : price ? parseInt(price, 10) : 0,
      unit: u,
      dynamicPrice: dynamic,
    });
  };

  const handleAdd = () => {
    if (!name.trim()) { nameRef.current?.focus(); return; }
    doAdd(name, rawPrice, unit, isDynamic);
    resetForm();
    setTimeout(() => nameRef.current?.focus(), 50);
  };

  const handleChipEdit = (product: OnboardingProduct) => {
    removeProduct(product.templateId);
    setName(product.name);
    setRawPrice(product.price > 0 ? String(product.price) : '');
    setUnit(product.unit || DEFAULT_ONBOARDING_UNIT);
    setIsDynamic(product.dynamicPrice);
    setChipFilter(product.name);
    setTimeout(() => nameRef.current?.focus(), 50);
  };

  const handleContinue = () => {
    // commit unsaved form item if there's a name
    if (name.trim()) doAdd(name, rawPrice, unit, isDynamic);
    completeStep(1);
    navigation.navigate('Step3');
  };

  const handleSkip = () => {
    setStep2({ products: [] });
    navigation.navigate('Step3');
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white dark:bg-gray-900"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Fixed header */}
      <View className="px-6" style={{ paddingTop: insets.top + 8 }}>
        <OnboardingHeader step={1} total={4} onBack={() => navigation.goBack()} />
        <Text className={`text-2xl font-bold text-gray-900 dark:text-white ${kbVisible ? 'mt-2 mb-1' : 'mt-4 mb-1'}`}>
          {t('onboarding.step2.title')}
        </Text>
        {!kbVisible && (
          <View className="mb-3 gap-1.5 mt-1">
            {(
              [
                { icon: 'lightning-bolt', key: 'onboarding.step2.hint1' },
                { icon: 'tag-outline',    key: 'onboarding.step2.hint2' },
                { icon: 'pencil-outline', key: 'onboarding.step2.hint3' },
              ] as const
            ).map(({ icon, key }) => (
              <View key={key} className="flex-row items-center gap-2">
                <MaterialCommunityIcons name={icon} size={13} color="#9ca3af" />
                <Text className="text-xs text-gray-400 dark:text-gray-500 flex-1 leading-4">
                  {t(key)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <ScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Committed product chips */}
        {step2.products.length > 0 && (
          <View className="px-6 pt-1 pb-2 flex-row flex-wrap gap-2">
            {step2.products.map((product) => (
              <TouchableOpacity
                key={product.templateId}
                onPress={() => handleChipEdit(product)}
                activeOpacity={0.75}
                className="flex-row items-center bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 rounded-full pl-3 pr-1.5 py-1.5"
              >
                <Text className="text-sm font-medium text-indigo-700 dark:text-indigo-300 mr-1.5">
                  {product.name}
                  {product.dynamicPrice
                    ? ' · ⚡'
                    : product.price > 0
                      ? `: ${formatVnd(product.price)}`
                      : ''}
                </Text>
                <TouchableOpacity
                  onPress={() => removeProduct(product.templateId)}
                  hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
                >
                  <MaterialCommunityIcons name="close" size={13} color="#818cf8" />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Suggestion chips — horizontal single-row scroll */}
        <View className={kbVisible ? 'mt-1 mb-2' : 'mt-3 mb-4'}>
          {isLoading ? (
            <ActivityIndicator color="#4f46e5" style={{ marginLeft: 24 }} />
          ) : (
            <>
              {!kbVisible && (
                <Text className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2 px-6">
                  {t('onboarding.step2.topSuggestions')}
                </Text>
              )}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 24, gap: 8 }}
                keyboardShouldPersistTaps="handled"
              >
                {visibleChips.map((tpl) => {
                  const isOn = selectedIds.has(tpl.id);
                  return (
                    <TouchableOpacity
                      key={tpl.id}
                      onPress={() => handleSuggestionPress(tpl)}
                      activeOpacity={0.7}
                      className={`flex-row items-center rounded-full border px-3 py-1.5 ${
                        isOn
                          ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-300 dark:border-indigo-600'
                          : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-600'
                      }`}
                    >
                      <Text style={{ fontSize: 16, lineHeight: 20 }} className="mr-1.5">
                        {tpl.emoji}
                      </Text>
                      <Text
                        className={`text-sm font-medium ${
                          isOn
                            ? 'text-indigo-600 dark:text-indigo-300'
                            : 'text-gray-700 dark:text-gray-200'
                        }`}
                      >
                        {isOn ? '✓ ' : ''}{tpl.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </>
          )}
        </View>

        {/* Input form */}
        <View className="px-6 pb-6 gap-4">
          {/* Name + Add */}
          <View>
          <View className="flex-row gap-2 items-stretch">
            <View className="flex-1">
              <ClearableInput
                ref={nameRef}
                value={name}
                onChangeText={handleNameChange}
                onClear={() => { setName(''); setChipFilter(''); setIsDynamic(false); }}
                placeholder={t('onboarding.step2.customNamePlaceholder')}
                returnKeyType="next"
                onSubmitEditing={() => {
                  if (!isDynamic) priceRef.current?.focus();
                  else handleAdd();
                }}
                autoCapitalize="words"
              />
            </View>
            <TouchableOpacity
              onPress={handleAdd}
              activeOpacity={0.75}
              disabled={!name.trim()}
              className={`rounded-xl px-4 items-center justify-center ${
                name.trim() ? 'bg-primary' : 'bg-gray-100 dark:bg-gray-800'
              }`}
            >
              <MaterialCommunityIcons
                name="plus"
                size={22}
                color={name.trim() ? 'white' : '#9ca3af'}
              />
            </TouchableOpacity>
          </View>
          {name.trim() ? (
            <TouchableOpacity onPress={handleAdd} activeOpacity={0.6} className="flex-row items-center gap-1.5 mt-2 px-1">
              <MaterialCommunityIcons name="keyboard-return" size={13} color="#4f46e5" />
              <Text className="text-xs text-primary font-medium flex-1" numberOfLines={1}>
                {t('onboarding.step2.addBtn')} &ldquo;{name.trim()}&rdquo;
                {rawPrice ? `  ·  ${rawPrice ? parseInt(rawPrice, 10).toLocaleString('vi-VN') : ''}₫` : ''}
                {unit !== DEFAULT_ONBOARDING_UNIT ? `  ·  ${unit}` : ''}
              </Text>
            </TouchableOpacity>
          ) : null}
          </View>

          {/* Price */}
          <View>
            <Text className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">
              {t('onboarding.step2.priceLabel')}
            </Text>
            {isDynamic ? (
              <View className="flex-row items-center gap-2 px-3 py-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-100 dark:border-amber-800">
                <MaterialCommunityIcons name="sync" size={14} color="#d97706" />
                <Text className="text-sm text-amber-700 dark:text-amber-300 font-medium">
                  {t('onboarding.step2.dynamicPriceNote')}
                </Text>
              </View>
            ) : (
              <MoneyInput
                ref={priceRef}
                rawValue={rawPrice}
                onChangeRaw={setRawPrice}
                placeholder={t('onboarding.step2.pricePlaceholder')}
                returnKeyType="done"
                onSubmitEditing={handleAdd}
              />
            )}
          </View>

          {/* Unit */}
          <View>
            <Text className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">
              {t('onboarding.step2.unitLabel')}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-6">
              <View className="flex-row gap-2 px-6">
                {visibleUnits.map((ud) => {
                  const active = unit === ud.value;
                  return (
                    <TouchableOpacity
                      key={ud.value}
                      onPress={() => setUnit(ud.value)}
                      className={`px-3 py-1.5 rounded-full border ${
                        active
                          ? 'bg-primary border-primary'
                          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600'
                      }`}
                    >
                      <Text
                        className={`text-xs font-medium ${
                          active ? 'text-white' : 'text-gray-600 dark:text-gray-300'
                        }`}
                      >
                        {t(ud.i18nKey)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>

        </View>
      </ScrollView>

      {/* Footer — navigation only */}
      <View
        className="bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-700 px-6 pt-3"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        <View className="flex-row gap-3 items-center">
          <TouchableOpacity
            onPress={handleSkip}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            className="px-2 py-3.5"
          >
            <Text className="font-semibold text-sm text-gray-400 dark:text-gray-500">
              {t('onboarding.common.skip')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 bg-primary active:opacity-80 rounded-2xl py-3.5 flex-row items-center justify-center gap-2"
            onPress={handleContinue}
          >
            <Text className="text-white font-bold text-base">
              {t('onboarding.common.continue')}
            </Text>
            {step2.products.length > 0 && (
              <View className="bg-white/25 rounded-full px-2 py-0.5">
                <Text className="text-white text-xs font-bold">{step2.products.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
