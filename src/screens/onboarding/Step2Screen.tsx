import { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SectionList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
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
import { useOnboardingFlow } from '../../hooks/useOnboardingFlow';
import { useTypography } from '../../hooks/useTypography';
import {
  ONBOARDING_UNITS,
  SHOP_TYPE_UNIT_PRIORITY,
  DEFAULT_ONBOARDING_UNIT,
  type UnitDef,
} from '../../constants/productConstants';
import type { OnboardingScreenProps } from '../../types/navigation';
import type { ProductTemplate } from '../../services/api';
import type { OnboardingProduct } from '../../store/onboardingStore';
import type { EdgeInsets } from 'react-native-safe-area-context';

// ── Pawn type picker ──────────────────────────────────────────────────────────

const PAWN_ITEM_TYPES: { code: string; emoji: string; labelKey: string }[] = [
  { code: 'GOLD',        emoji: '🥇', labelKey: 'onboarding.step2.pawn.types.GOLD' },
  { code: 'ELECTRONICS', emoji: '📱', labelKey: 'onboarding.step2.pawn.types.ELECTRONICS' },
  { code: 'MOTORBIKE',   emoji: '🛵', labelKey: 'onboarding.step2.pawn.types.MOTORBIKE' },
  { code: 'CAR',         emoji: '🚗', labelKey: 'onboarding.step2.pawn.types.CAR' },
  { code: 'WATCH',       emoji: '⌚', labelKey: 'onboarding.step2.pawn.types.WATCH' },
  { code: 'REAL_ESTATE', emoji: '🏠', labelKey: 'onboarding.step2.pawn.types.REAL_ESTATE' },
  { code: 'GENERAL',     emoji: '📦', labelKey: 'onboarding.step2.pawn.types.GENERAL' },
  { code: 'OTHER',       emoji: '🔧', labelKey: 'onboarding.step2.pawn.types.OTHER' },
];

function PawnTypePickerView({
  insets, pawnTypes, setPawnTypes, stepIndex, totalSteps, onBack, onSkip, onContinue,
}: {
  insets: EdgeInsets;
  pawnTypes: string[];
  setPawnTypes: (types: string[]) => void;
  stepIndex: number;
  totalSteps: number;
  onBack: () => void;
  onSkip: () => void;
  onContinue: () => void;
}) {
  const { t } = useTranslation();
  const typo = useTypography();
  const selected = new Set(pawnTypes);

  const toggle = (code: string) => {
    const next = new Set(selected);
    if (next.has(code)) { next.delete(code); } else { next.add(code); }
    setPawnTypes([...next]);
  };

  return (
    <View className="flex-1 bg-white dark:bg-gray-900" style={{ paddingTop: insets.top + 8 }}>
      <View className="px-6 mb-2">
        <OnboardingHeader step={stepIndex} total={totalSteps} onBack={onBack} />
        <Text className={`${typo.heading} text-gray-900 dark:text-white mt-4 mb-1`}>
          {t('onboarding.step2.pawn.title')}
        </Text>
        <View className="gap-1.5 mt-1 mb-4">
          {(
            [
              { icon: 'check-all',            key: 'onboarding.step2.pawn.hint1' },
              { icon: 'tag-multiple-outline', key: 'onboarding.step2.pawn.hint2' },
              { icon: 'pencil-outline',       key: 'onboarding.step2.pawn.hint3' },
            ] as const
          ).map(({ icon, key }) => (
            <View key={key} className="flex-row items-center gap-2">
              <MaterialCommunityIcons name={icon} size={13} color="#9ca3af" />
              <Text className={`${typo.caption} text-gray-400 dark:text-gray-500 flex-1 leading-4`}>{t(key)}</Text>
            </View>
          ))}
        </View>
      </View>

      <ScrollView
        className="flex-1 px-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 16 }}
      >
        <View className="flex-row flex-wrap gap-3">
          {PAWN_ITEM_TYPES.map((item) => {
            const isOn = selected.has(item.code);
            return (
              <TouchableOpacity
                key={item.code}
                onPress={() => toggle(item.code)}
                activeOpacity={0.75}
                style={{ width: '47%' }}
                className={`rounded-2xl border-2 px-4 py-4 items-center gap-2 ${
                  isOn
                    ? 'bg-indigo-50 dark:bg-indigo-900/30 border-primary'
                    : 'bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-700'
                }`}
              >
                {isOn && (
                  <View className="absolute top-2.5 right-2.5">
                    <MaterialCommunityIcons name="check-circle" size={18} color="#4f46e5" />
                  </View>
                )}
                <Text style={{ fontSize: 36 }}>{item.emoji}</Text>
                <Text
                  className={`${typo.label} text-center ${
                    isOn ? 'text-primary' : 'text-gray-700 dark:text-gray-200'
                  }`}
                >
                  {t(item.labelKey)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <View
        className="bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-700 px-6 pt-3"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        <View className="flex-row gap-3 items-center">
          <TouchableOpacity
            onPress={onSkip}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            className="px-2 py-3.5"
          >
            <Text className={`${typo.label} text-gray-400 dark:text-gray-500`}>
              {t('onboarding.common.skip')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 bg-primary active:opacity-80 rounded-2xl py-3.5 flex-row items-center justify-center gap-2"
            onPress={onContinue}
          >
            <Text className={`${typo.labelBold} text-white`}>{t('onboarding.common.continue')}</Text>
            {selected.size > 0 && (
              <View className="bg-white/25 rounded-full px-2 py-0.5">
                <Text className="text-white text-xs font-bold">{selected.size}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ── Product edit / add sheet ──────────────────────────────────────────────────

type SheetValues = {
  templateId: string;
  name: string;
  rawPrice: string;
  unit: string;
  dynamicPrice: boolean;
  durationMinutes: string;
  showDuration: boolean;
};

function ProductEditSheet({
  values,
  onClose,
  onSave,
  backendCode,
}: {
  values: SheetValues | null;
  onClose: () => void;
  onSave: (data: {
    templateId: string;
    name: string;
    price: number;
    unit: string;
    dynamicPrice: boolean;
    durationMinutes: number;
  }) => void;
  backendCode: string | null;
}) {
  const { t } = useTranslation();
  const typo = useTypography();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState('');
  const [rawPrice, setRawPrice] = useState('');
  const [unit, setUnit] = useState(DEFAULT_ONBOARDING_UNIT);
  const [dynamicPrice, setDynamicPrice] = useState(false);
  const [durationStr, setDurationStr] = useState('');

  useEffect(() => {
    if (values) {
      setName(values.name);
      setRawPrice(values.rawPrice);
      setUnit(values.unit);
      setDynamicPrice(values.dynamicPrice);
      setDurationStr(values.durationMinutes);
    }
  }, [values]);

  const visibleUnits = useMemo(() => {
    const priority = [unit, ...(SHOP_TYPE_UNIT_PRIORITY[backendCode ?? ''] ?? [])];
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
  }, [backendCode, unit]);

  const isAdd = !values?.templateId || values.templateId.startsWith('custom_');

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave({
      templateId: values?.templateId ?? `custom_${Date.now()}`,
      name: trimmed,
      price: dynamicPrice ? 0 : (rawPrice ? parseInt(rawPrice, 10) : 0),
      unit,
      dynamicPrice,
      durationMinutes: values?.showDuration
        ? (durationStr ? parseInt(durationStr, 10) : 0)
        : (durationStr ? parseInt(durationStr, 10) : 0),
    });
  };

  return (
    <Modal visible={!!values} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        className="flex-1 justify-end"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity className="flex-1" activeOpacity={1} onPress={onClose} />

        <View
          className="bg-white dark:bg-gray-900 rounded-t-3xl overflow-hidden"
          style={{ paddingBottom: insets.bottom + 8 }}
        >
          {/* Sheet handle */}
          <View className="items-center pt-3 pb-0">
            <View className="w-10 h-1 rounded-full bg-gray-200 dark:bg-gray-700" />
          </View>

          {/* Header */}
          <View className="flex-row items-center justify-between px-5 pt-3 pb-3 border-b border-gray-100 dark:border-gray-800">
            <Text className={`${typo.section} text-gray-900 dark:text-white`}>
              {isAdd ? t('onboarding.step2.addProduct') : t('onboarding.step2.editProduct')}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialCommunityIcons name="close" size={22} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <ScrollView
            className="px-5 pt-4"
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 8 }}
          >
            {/* Name */}
            <View className="mb-4">
              <Text className={`${typo.captionBold} text-gray-500 dark:text-gray-400 mb-1.5`}>
                {t('onboarding.step2.nameLabel')}
              </Text>
              <ClearableInput
                value={name}
                onChangeText={setName}
                onClear={() => setName('')}
                placeholder={t('onboarding.step2.customNamePlaceholder')}
                autoCapitalize="sentences"
                autoFocus={isAdd}
              />
            </View>

            {/* Price */}
            <View className="mb-4">
              <View className="flex-row items-center justify-between mb-1.5">
                <Text className={`${typo.captionBold} text-gray-500 dark:text-gray-400`}>
                  {t('onboarding.step2.priceLabel')}
                </Text>
                <TouchableOpacity
                  onPress={() => setDynamicPrice((v) => !v)}
                  activeOpacity={0.7}
                  className="flex-row items-center gap-1.5"
                >
                  <View
                    className={`w-8 h-4.5 rounded-full relative ${
                      dynamicPrice ? 'bg-amber-400' : 'bg-gray-200 dark:bg-gray-600'
                    }`}
                    style={{ height: 18, width: 32 }}
                  >
                    <View
                      className="w-4 h-4 rounded-full bg-white absolute top-0.5"
                      style={{
                        width: 14,
                        height: 14,
                        top: 2,
                        left: dynamicPrice ? 16 : 2,
                        shadowColor: '#000',
                        shadowOpacity: 0.15,
                        shadowRadius: 1,
                        elevation: 1,
                      }}
                    />
                  </View>
                  <Text
                    className={`${typo.caption} font-medium ${
                      dynamicPrice
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-gray-400 dark:text-gray-500'
                    }`}
                  >
                    ⚡ {t('onboarding.step2.dynamicPriceShort')}
                  </Text>
                </TouchableOpacity>
              </View>
              {dynamicPrice ? (
                <View className="flex-row items-center gap-2 px-3 py-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-100 dark:border-amber-800">
                  <MaterialCommunityIcons name="sync" size={14} color="#d97706" />
                  <Text className={`${typo.caption} text-amber-700 dark:text-amber-300 font-medium flex-1`}>
                    {t('onboarding.step2.dynamicPriceNote')}
                  </Text>
                </View>
              ) : (
                <MoneyInput
                  rawValue={rawPrice}
                  onChangeRaw={setRawPrice}
                  placeholder={t('onboarding.step2.pricePlaceholder')}
                />
              )}
            </View>

            {/* Unit */}
            <View className="mb-4">
              <Text className={`${typo.captionBold} text-gray-500 dark:text-gray-400 mb-1.5`}>
                {t('onboarding.step2.unitLabel')}
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {visibleUnits.slice(0, 8).map((ud) => {
                  const active = unit === ud.value;
                  return (
                    <TouchableOpacity
                      key={ud.value}
                      onPress={() => setUnit(ud.value)}
                      className={`px-3 py-1.5 rounded-full border ${
                        active
                          ? 'bg-primary border-primary'
                          : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                      }`}
                    >
                      <Text
                        className={`${typo.caption} font-medium ${
                          active ? 'text-white' : 'text-gray-600 dark:text-gray-300'
                        }`}
                      >
                        {t(ud.i18nKey)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Duration (service shops) */}
            {(values?.showDuration || (durationStr && parseInt(durationStr, 10) > 0)) && (
              <View className="mb-2">
                <Text className={`${typo.captionBold} text-gray-500 dark:text-gray-400 mb-1.5`}>
                  {t('onboarding.step2.durationLabel')}
                </Text>
                <ClearableInput
                  value={durationStr}
                  onChangeText={(v) => setDurationStr(v.replace(/\D/g, ''))}
                  onClear={() => setDurationStr('')}
                  placeholder={t('onboarding.step2.durationPlaceholder')}
                  keyboardType="numeric"
                />
              </View>
            )}
          </ScrollView>

          {/* Action buttons */}
          <View className="flex-row gap-3 px-5 pt-3 border-t border-gray-100 dark:border-gray-800">
            <TouchableOpacity
              onPress={onClose}
              className="flex-1 border border-gray-200 dark:border-gray-700 rounded-2xl py-3.5 items-center"
            >
              <Text className={`${typo.labelBold} text-gray-600 dark:text-gray-300`}>
                {t('common.cancel')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSave}
              disabled={!name.trim()}
              className={`flex-2 rounded-2xl py-3.5 items-center ${
                name.trim() ? 'bg-primary' : 'bg-gray-100 dark:bg-gray-700'
              }`}
              style={{ flex: 2 }}
            >
              <Text
                className={`${typo.labelBold} ${
                  name.trim() ? 'text-white' : 'text-gray-400 dark:text-gray-500'
                }`}
              >
                {t('common.save')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Product row ───────────────────────────────────────────────────────────────

function ProductRow({
  template,
  product,
  isSelected,
  onToggle,
  onEdit,
}: {
  template: ProductTemplate;
  product: OnboardingProduct | null;
  isSelected: boolean;
  onToggle: () => void;
  onEdit: () => void;
}) {
  const typo = useTypography();
  const { t } = useTranslation();
  const displayName = product?.name ?? template.name;
  const currentPrice = product?.price ?? template.price;
  const isDynamic = product?.dynamicPrice ?? template.dynamicPrice;
  const duration = product?.durationMinutes ?? template.durationMinutes;

  return (
    <View className="flex-row items-center px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-50 dark:border-gray-700">
      {/* Left: checkbox + info (tap to toggle) */}
      <TouchableOpacity
        onPress={onToggle}
        activeOpacity={0.7}
        className="flex-1 flex-row items-center min-w-0"
      >
        <MaterialCommunityIcons
          name={isSelected ? 'checkbox-marked' : 'checkbox-blank-outline'}
          size={22}
          color={isSelected ? '#4f46e5' : '#d1d5db'}
          style={{ marginRight: 12 }}
        />
        <Text style={{ fontSize: 18 }}>{template.emoji}</Text>
        <View className="flex-1 ml-2 min-w-0">
          <Text
            className={`${typo.caption} font-medium ${
              isSelected ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-600'
            }`}
            numberOfLines={1}
          >
            {displayName}
          </Text>
          {isSelected && (
            <View className="flex-row items-center flex-wrap mt-0.5 gap-x-1.5">
              {isDynamic ? (
                <Text className={`${typo.caption} text-amber-600 dark:text-amber-400`}>
                  ⚡ {t('onboarding.step2.dynamicPriceHint')}
                </Text>
              ) : currentPrice > 0 ? (
                <Text className={`${typo.caption} text-indigo-600 dark:text-indigo-400 font-medium`}>
                  {formatVnd(currentPrice)}
                </Text>
              ) : (
                <Text className={`${typo.caption} text-gray-300 dark:text-gray-600`}>
                  {t('onboarding.step2.noPriceHint')}
                </Text>
              )}
              {duration > 0 && (
                <Text className={`${typo.caption} text-gray-400 dark:text-gray-500`}>
                  · {duration}{t('onboarding.step2.minuteSuffix')}
                </Text>
              )}
            </View>
          )}
        </View>
      </TouchableOpacity>

      {/* Right: edit button (only when selected) */}
      {isSelected && (
        <TouchableOpacity
          onPress={onEdit}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
          className="flex-row items-center gap-1 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 px-2.5 py-1.5 rounded-xl ml-2 shrink-0"
        >
          <MaterialCommunityIcons name="pencil-outline" size={13} color="#4f46e5" />
          <Text className={`${typo.caption} text-primary font-semibold`} style={{ fontSize: 11 }}>
            {t('onboarding.common.edit')}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export function Step2Screen({ navigation }: OnboardingScreenProps<'Step2'>) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const typo = useTypography();
  const {
    step2,
    pawnTypes,
    addProduct,
    removeProduct,
    updateProduct,
    setStep2,
    setPawnTypes,
    initProducts,
    completeStep,
  } = useOnboardingStore();

  const [sheet, setSheet] = useState<SheetValues | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  const toggleSection = (title: string) =>
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      next.has(title) ? next.delete(title) : next.add(title);
      return next;
    });

  const selectedIds = useMemo(
    () => new Set(step2.products.map((p) => p.templateId)),
    [step2.products],
  );

  const { totalSteps, getStepIndex, getNextScreen, steps, backendCode } = useOnboardingFlow();
  const isPawn = steps.includes('PAWN_TYPES');

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['product-templates', backendCode],
    queryFn: async () => {
      const res = await tenantApi.getProductTemplates(backendCode ?? 'OTHER');
      return res.data.data as ProductTemplate[];
    },
    staleTime: 10 * 60_000,
  });

  useEffect(() => {
    if (templates.length > 0) initProducts(templates);
  }, [templates, initProducts]);

  const sections = useMemo(() => {
    const map = new Map<string, ProductTemplate[]>();
    for (const tpl of templates) {
      const key = tpl.categoryName || t('onboarding.step2.noCategory');
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(tpl);
    }
    return Array.from(map.entries()).map(([title, allData]) => ({
      title,
      allData,
      data: collapsedSections.has(title) ? [] : allData,
    }));
  }, [templates, t, collapsedSections]);

  const allSelected = templates.length > 0 && selectedIds.size === templates.length;

  const handleSelectAll = () => {
    setStep2({
      products: templates.map((t) => {
        const existing = step2.products.find((p) => p.templateId === t.id);
        return {
          templateId: t.id,
          name: t.name,
          price: existing?.price ?? t.price,
          unit: t.unit,
          dynamicPrice: t.dynamicPrice,
          categoryName: t.categoryName,
          durationMinutes: t.durationMinutes,
        };
      }),
    });
  };

  const handleDeselectAll = () => setStep2({ products: [] });

  const handleToggle = (template: ProductTemplate) => {
    if (selectedIds.has(template.id)) {
      removeProduct(template.id);
    } else {
      addProduct({
        templateId: template.id,
        name: template.name,
        price: template.price,
        unit: template.unit,
        dynamicPrice: template.dynamicPrice,
        categoryName: template.categoryName,
        durationMinutes: template.durationMinutes,
      });
    }
  };

  const openEditSheet = (template: ProductTemplate) => {
    const stored = step2.products.find((p) => p.templateId === template.id);
    setSheet({
      templateId: template.id,
      name: stored?.name ?? template.name,
      rawPrice: stored?.price ? String(stored.price) : template.price ? String(template.price) : '',
      unit: stored?.unit ?? template.unit,
      dynamicPrice: stored?.dynamicPrice ?? template.dynamicPrice,
      durationMinutes: String(stored?.durationMinutes ?? template.durationMinutes ?? 0),
      showDuration: (template.durationMinutes ?? 0) > 0,
    });
  };

  const openAddSheet = () => {
    setSheet({
      templateId: '',
      name: '',
      rawPrice: '',
      unit: SHOP_TYPE_UNIT_PRIORITY[backendCode ?? '']?.[0] ?? DEFAULT_ONBOARDING_UNIT,
      dynamicPrice: false,
      durationMinutes: '',
      showDuration: false,
    });
  };

  const handleSheetSave = (data: {
    templateId: string;
    name: string;
    price: number;
    unit: string;
    dynamicPrice: boolean;
    durationMinutes: number;
  }) => {
    const isNew = !data.templateId || data.templateId.startsWith('custom_');
    if (isNew) {
      const templateId = data.templateId || `custom_${Date.now()}`;
      if (!selectedIds.has(templateId)) {
        addProduct({
          templateId,
          name: data.name,
          price: data.price,
          unit: data.unit,
          dynamicPrice: data.dynamicPrice,
          durationMinutes: data.durationMinutes,
        });
      }
    } else {
      // Ensure the product is selected before updating
      if (!selectedIds.has(data.templateId)) {
        const tpl = templates.find((t) => t.id === data.templateId);
        addProduct({
          templateId: data.templateId,
          name: data.name,
          price: data.price,
          unit: data.unit,
          dynamicPrice: data.dynamicPrice,
          categoryName: tpl?.categoryName,
          durationMinutes: data.durationMinutes,
        });
      } else {
        updateProduct(data.templateId, {
          name: data.name,
          price: data.price,
          unit: data.unit,
          dynamicPrice: data.dynamicPrice,
          durationMinutes: data.durationMinutes,
        });
      }
    }
    setSheet(null);
  };

  const handleContinue = () => {
    if (isPawn) {
      completeStep(1);
      navigation.navigate(getNextScreen('PAWN_TYPES') as any);
      return;
    }
    completeStep(1);
    navigation.navigate(getNextScreen('PRODUCT_SETUP') as any);
  };

  const handleSkip = () => {
    if (isPawn) {
      setPawnTypes([]);
    } else {
      setStep2({ products: [] });
    }
    navigation.navigate(getNextScreen(isPawn ? 'PAWN_TYPES' : 'PRODUCT_SETUP') as any);
  };

  // ── Pawn shop: type picker ──────────────────────────────────────────────────
  if (isPawn) {
    return (
      <PawnTypePickerView
        insets={insets}
        pawnTypes={pawnTypes}
        setPawnTypes={setPawnTypes}
        stepIndex={getStepIndex('PAWN_TYPES')}
        totalSteps={totalSteps}
        onBack={() => navigation.goBack()}
        onSkip={handleSkip}
        onContinue={handleContinue}
      />
    );
  }

  // ── Product setup UI ────────────────────────────────────────────────────────

  const ListHeader = (
    <View>
      <View className="px-6 pt-2 pb-3">
        <Text className={`${typo.heading} text-gray-900 dark:text-white mb-1`}>
          {t('onboarding.step2.title')}
        </Text>
        <View className="gap-1 mt-1">
          {(
            [
              { icon: 'check-all' as const,      key: 'onboarding.step2.hint1' },
              { icon: 'pencil-outline' as const,  key: 'onboarding.step2.hint2edit' },
              { icon: 'plus-circle-outline' as const, key: 'onboarding.step2.hint3add' },
            ]
          ).map(({ icon, key }) => (
            <View key={key} className="flex-row items-center gap-2">
              <MaterialCommunityIcons name={icon} size={13} color="#9ca3af" />
              <Text className={`${typo.caption} text-gray-400 dark:text-gray-500 flex-1 leading-4`}>
                {t(key)}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View className="flex-row items-center justify-between px-4 py-2 border-b border-gray-100 dark:border-gray-700">
        <TouchableOpacity
          onPress={allSelected ? handleDeselectAll : handleSelectAll}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text className={`${typo.label} text-indigo-500`}>
            {allSelected ? t('onboarding.step2.deselectAll') : t('onboarding.step2.selectAll')}
          </Text>
        </TouchableOpacity>
        <View className="flex-row items-center gap-1.5 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-full">
          <MaterialCommunityIcons name="check-circle-outline" size={14} color="#4f46e5" />
          <Text className={`${typo.captionBold} text-indigo-600 dark:text-indigo-400`}>
            {t('onboarding.step2.selectedCount', { count: selectedIds.size })}
          </Text>
        </View>
      </View>
    </View>
  );

  const ListFooter = (
    <View className="mb-4 mt-1">
      <TouchableOpacity
        onPress={openAddSheet}
        activeOpacity={0.75}
        className="flex-row items-center justify-center gap-2 mx-4 py-3.5 rounded-2xl border-2 border-dashed border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-900/10"
      >
        <MaterialCommunityIcons name="plus-circle-outline" size={18} color="#6366f1" />
        <Text className={`${typo.label} text-indigo-500`}>
          {t('onboarding.step2.addCustom')}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white dark:bg-gray-900"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View className="px-6" style={{ paddingTop: insets.top + 8 }}>
        <OnboardingHeader
          step={getStepIndex('PRODUCT_SETUP')}
          total={totalSteps}
          onBack={() => navigation.goBack()}
        />
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#4f46e5" size="large" />
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={ListHeader}
          ListFooterComponent={ListFooter}
          renderSectionHeader={({ section: { title, allData } }) => {
            const isCollapsed = collapsedSections.has(title);
            const selectedCount = allData.filter((t) => selectedIds.has(t.id)).length;
            return (
              <TouchableOpacity
                onPress={() => toggleSection(title)}
                activeOpacity={0.7}
                className="flex-row items-center px-4 py-2 bg-gray-50 dark:bg-gray-900"
              >
                <Text className={`${typo.captionBold} text-indigo-500 uppercase tracking-wide`}>
                  {title}
                </Text>
                <Text className={`${typo.caption} text-indigo-400 ml-1.5`}>
                  {selectedCount}/{allData.length}
                </Text>
                <View className="flex-1 h-px bg-indigo-100 dark:bg-indigo-900/30 ml-2 mr-1" />
                <MaterialCommunityIcons
                  name={isCollapsed ? 'chevron-down' : 'chevron-up'}
                  size={16}
                  color="#6366f1"
                />
              </TouchableOpacity>
            );
          }}
          renderItem={({ item: tpl }) => {
            const isSelected = selectedIds.has(tpl.id);
            const product = step2.products.find((p) => p.templateId === tpl.id) ?? null;
            return (
              <ProductRow
                template={tpl}
                product={product}
                isSelected={isSelected}
                onToggle={() => handleToggle(tpl)}
                onEdit={() => openEditSheet(tpl)}
              />
            );
          }}
          stickySectionHeadersEnabled
        />
      )}

      {/* Footer */}
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
            <Text className={`${typo.label} text-gray-400 dark:text-gray-500`}>
              {t('onboarding.common.skip')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 bg-primary active:opacity-80 rounded-2xl py-3.5 flex-row items-center justify-center gap-2"
            onPress={handleContinue}
          >
            <Text className={`${typo.labelBold} text-white`}>
              {t('onboarding.common.continue')}
            </Text>
            {selectedIds.size > 0 && (
              <View className="bg-white/25 rounded-full px-2 py-0.5">
                <Text className={`${typo.captionBold} text-white`}>{selectedIds.size}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Product edit / add sheet */}
      <ProductEditSheet
        values={sheet}
        onClose={() => setSheet(null)}
        onSave={handleSheetSave}
        backendCode={backendCode}
      />
    </KeyboardAvoidingView>
  );
}
