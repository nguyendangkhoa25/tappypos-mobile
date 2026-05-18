import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { productApi, categoryApi, type CategoryData } from '../../services/api';
import { useAlertStore } from '../../store/alertStore';
import { useErrorAlert } from '../../hooks/useErrorAlert';
import { MoneyInput } from '../../components/MoneyInput';
import { Skeleton } from '../../components/Skeleton';
import { getUnitsForType } from '../../constants/productConstants';
import { useTypography } from '../../hooks/useTypography';
import type { ProductsScreenProps } from '../../types/navigation';

type Props = ProductsScreenProps<'ProductEdit'>;

type FormState = {
  name: string;
  price: string;
  unit: string;
  categoryId: string | null;
  categoryName: string | null;
  categoryEmoji: string | null;
  description: string;
  durationMinutes: string;
};

function SectionHeader({ icon, title }: { icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']; title: string }) {
  const typo = useTypography();
  return (
    <View className="flex-row items-center mb-3 mt-1">
      <MaterialCommunityIcons name={icon} size={15} color="#6b7280" style={{ marginRight: 6 }} />
      <Text className={`${typo.captionBold} text-gray-500 dark:text-gray-400 uppercase tracking-wide`}>{title}</Text>
    </View>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  const typo = useTypography();
  return (
    <View className="mb-4">
      <Text className={`${typo.caption} font-medium text-gray-700 dark:text-gray-300 mb-1.5`}>{label}</Text>
      {children}
    </View>
  );
}

export function ProductEditScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const typo = useTypography();
  const { top, bottom } = useSafeAreaInsets();
  const { productId } = route.params;
  const queryClient = useQueryClient();
  const { show: showAlert } = useAlertStore();
  const showErrorAlert = useErrorAlert();

  const [form, setForm] = useState<FormState>({
    name: '', price: '', unit: '',
    categoryId: null, categoryName: null, categoryEmoji: null,
    description: '', durationMinutes: '',
  });
  const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', productId],
    queryFn: () => productApi.getById(productId).then((r) => r.data.data),
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryApi.list().then((r) => r.data.data),
    staleTime: 5 * 60_000,
  });

  useEffect(() => {
    if (!product) return;
    const catId = product.categoryIds?.[0] ?? null;
    const catEmoji = catId && categories
      ? (categories.find((c) => c.id === catId)?.emoji ?? null)
      : null;
    setForm({
      name: product.name,
      price: product.dynamicPrice ? '0' : String(product.price),
      unit: product.unit ?? '',
      categoryId: catId,
      categoryName: product.categoryNames?.[0] ?? null,
      categoryEmoji: catEmoji,
      description: product.description ?? '',
      durationMinutes: product.durationMinutes ? String(product.durationMinutes) : '',
    });
  }, [product, categories]);

  const isService = product?.productTypeCode === 'SERVICE';
  const typeCode = product?.productTypeCode ?? null;

  const baseUnits = getUnitsForType(typeCode);
  const unitChips = form.unit && !baseUnits.includes(form.unit)
    ? [...baseUnits, form.unit]
    : baseUnits;

  const mutation = useMutation({
    mutationFn: () =>
      productApi.update(productId, {
        name: form.name.trim(),
        price: product?.dynamicPrice ? 0 : Number(form.price) || 0,
        unit: form.unit.trim(),
        categoryIds: form.categoryId ? [Number(form.categoryId)] : null,
        description: form.description.trim() || null,
        status: product?.status ?? 'ACTIVE',
        durationMinutes: isService && form.durationMinutes
          ? Number(form.durationMinutes) || null
          : null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      navigation.goBack();
    },
    onError: showErrorAlert,
  });

  const handleSave = () => {
    if (!form.name.trim()) {
      showAlert(t('common.error'), t('products.nameRequired'), [{ label: t('common.close'), style: 'cancel' }]);
      return;
    }
    mutation.mutate();
  };

  const selectCategory = (cat: CategoryData | null) => {
    setForm((f) => ({
      ...f,
      categoryId: cat?.id ?? null,
      categoryName: cat?.name ?? null,
      categoryEmoji: cat?.emoji ?? null,
    }));
    setCategoryPickerVisible(false);
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-gray-50 dark:bg-gray-900">
        <View className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4" style={{ paddingTop: top + 12, paddingBottom: 12 }}>
          <View className="flex-row items-center">
            <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} className="mr-3">
              <MaterialCommunityIcons name="chevron-left" size={26} color="#4f46e5" />
            </TouchableOpacity>
            <Text className={`${typo.heading} text-gray-900 dark:text-white flex-1`}>{t('products.editProduct')}</Text>
          </View>
        </View>
        <View className="px-4 pt-4" style={{ gap: 12 }}>
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} height={52} borderRadius={12} />)}
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-gray-50 dark:bg-gray-900"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4" style={{ paddingTop: top + 12, paddingBottom: 12 }}>
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} className="mr-3">
            <MaterialCommunityIcons name="chevron-left" size={26} color="#4f46e5" />
          </TouchableOpacity>
          <Text className={`${typo.heading} text-gray-900 dark:text-white flex-1`} numberOfLines={1}>{t('products.editProduct')}</Text>
          <TouchableOpacity onPress={handleSave} disabled={mutation.isPending} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            {mutation.isPending ? <ActivityIndicator size="small" color="#4f46e5" /> : (
              <Text className={`${typo.body} text-indigo-600 dark:text-indigo-400`}>{t('common.save')}</Text>
            )}
          </TouchableOpacity>
        </View>
        <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 mt-1 ml-9`} numberOfLines={1}>{product?.name}</Text>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottom + 24 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Section 1 — Basic info */}
        <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 mb-4 border border-gray-100 dark:border-gray-700">
          <SectionHeader icon="information-outline" title={t('products.sectionInfo')} />

          <FormField label={`${t('products.name')} *`}>
            <TextInput
              className={`border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-3 bg-white dark:bg-gray-700 ${typo.inputSize} text-gray-900 dark:text-white`}
              value={form.name}
              onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
              placeholder={t('products.namePlaceholder')}
              placeholderTextColor="#9ca3af"
              autoCapitalize="words"
            />
          </FormField>

          {product?.dynamicPrice ? (
            <View className="mb-4 flex-row items-center bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl px-4 py-3" style={{ gap: 8 }}>
              <MaterialCommunityIcons name="gold" size={18} color="#d97706" />
              <Text className={`${typo.caption} text-amber-700 dark:text-amber-400 flex-1`}>{t('products.goldPrice')}</Text>
            </View>
          ) : (
            <View className="flex-row mb-4" style={{ gap: 12 }}>
              <View className="flex-1">
                <Text className={`${typo.caption} font-medium text-gray-700 dark:text-gray-300 mb-1.5`}>{t('products.price')}</Text>
                <MoneyInput
                  rawValue={form.price}
                  onChangeRaw={(v) => setForm((f) => ({ ...f, price: v }))}
                  placeholder="0"
                />
              </View>
              {isService && (
                <View style={{ width: 108 }}>
                  <Text className={`${typo.caption} font-medium text-gray-700 dark:text-gray-300 mb-1.5`}>{t('products.duration')}</Text>
                  <View className="flex-row items-center border border-gray-200 dark:border-gray-600 rounded-xl overflow-hidden bg-white dark:bg-gray-700">
                    <TextInput
                      className={`flex-1 px-3 py-3 ${typo.inputSize} text-gray-900 dark:text-white`}
                      value={form.durationMinutes}
                      onChangeText={(v) => setForm((f) => ({ ...f, durationMinutes: v.replace(/\D/g, '') }))}
                      placeholder="0"
                      placeholderTextColor="#9ca3af"
                      keyboardType="number-pad"
                    />
                    <View className="px-2 py-3 bg-gray-50 dark:bg-gray-600 border-l border-gray-200 dark:border-gray-600">
                      <Text className={`${typo.label} text-gray-500 dark:text-gray-300`}>{t('products.minutes')}</Text>
                    </View>
                  </View>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Section 2 — Unit chips */}
        <View className="bg-white dark:bg-gray-800 rounded-2xl mb-4 border border-gray-100 dark:border-gray-700">
          <View className="px-4 pt-4 pb-2">
            <SectionHeader icon="tag-outline" title={t('products.sectionUnit')} />
            <Text className={`${typo.caption} font-medium text-gray-700 dark:text-gray-300 mb-2`}>{t('products.unit')}</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingBottom: 16 }}
          >
            {unitChips.map((u) => {
              const selected = form.unit === u;
              return (
                <TouchableOpacity
                  key={u}
                  onPress={() => setForm((f) => ({ ...f, unit: selected ? '' : u }))}
                  activeOpacity={0.7}
                  className={`px-4 py-2 rounded-full border ${
                    selected
                      ? 'bg-indigo-600 border-indigo-600'
                      : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                  }`}
                >
                  <Text className={`${typo.caption} font-medium ${selected ? 'text-white' : 'text-gray-600 dark:text-gray-300'}`}>
                    {t(`products.units.${u}`, { defaultValue: u })}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Section 3 — Category */}
        <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 mb-4 border border-gray-100 dark:border-gray-700">
          <SectionHeader icon="shape-outline" title={t('products.sectionCategory')} />
          <FormField label={t('products.category')}>
            {form.categoryId ? (
              <View className="flex-row items-center" style={{ gap: 8 }}>
                <TouchableOpacity
                  onPress={() => setCategoryPickerVisible(true)}
                  activeOpacity={0.75}
                  className="flex-row items-center bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 rounded-full px-3 py-2"
                  style={{ gap: 6 }}
                >
                  {form.categoryEmoji ? (
                    <Text className={`${typo.label}`}>{form.categoryEmoji}</Text>
                  ) : (
                    <MaterialCommunityIcons name="shape" size={15} color="#4f46e5" />
                  )}
                  <Text className={`${typo.label} text-indigo-700 dark:text-indigo-300`}>{form.categoryName}</Text>
                  <MaterialCommunityIcons name="pencil-outline" size={13} color="#818cf8" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => selectCategory(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <MaterialCommunityIcons name="close-circle" size={20} color="#d1d5db" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => setCategoryPickerVisible(true)}
                activeOpacity={0.7}
                className="flex-row items-center border border-dashed border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3"
                style={{ gap: 8 }}
              >
                <MaterialCommunityIcons name="plus-circle-outline" size={18} color="#9ca3af" />
                <Text className={`${typo.caption} text-gray-400 dark:text-gray-500`}>{t('products.selectCategory')}</Text>
              </TouchableOpacity>
            )}
          </FormField>
        </View>

        {/* Section 4 — Description */}
        <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 mb-4 border border-gray-100 dark:border-gray-700">
          <SectionHeader icon="text-box-outline" title={t('products.sectionDescription')} />
          <FormField label={t('products.description')}>
            <TextInput
              className={`border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-3 bg-white dark:bg-gray-700 ${typo.inputSize} text-gray-900 dark:text-white`}
              value={form.description}
              onChangeText={(v) => setForm((f) => ({ ...f, description: v }))}
              placeholder={t('products.descriptionPlaceholder')}
              placeholderTextColor="#9ca3af"
              multiline
              textAlignVertical="top"
              style={{ minHeight: 90 }}
            />
          </FormField>
        </View>
      </ScrollView>

      {/* Category picker modal */}
      <Modal
        visible={categoryPickerVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setCategoryPickerVisible(false)}
      >
        <TouchableOpacity className="flex-1 bg-black/40" activeOpacity={1} onPress={() => setCategoryPickerVisible(false)} />
        <View className="bg-white dark:bg-gray-800 rounded-t-3xl px-4 pt-5" style={{ paddingBottom: bottom + 16 }}>
          <View className="flex-row items-center justify-between mb-4">
            <Text className={`${typo.section} text-gray-900 dark:text-white`}>{t('products.selectCategory')}</Text>
            <TouchableOpacity onPress={() => setCategoryPickerVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialCommunityIcons name="close" size={22} color="#6b7280" />
            </TouchableOpacity>
          </View>
          <FlatList
            data={[null, ...(categories ?? [])]}
            keyExtractor={(item) => item?.id ?? '__none__'}
            style={{ maxHeight: 380 }}
            renderItem={({ item }) => {
              const isSelected = item === null ? form.categoryId === null : form.categoryId === item.id;
              return (
                <TouchableOpacity
                  onPress={() => selectCategory(item)}
                  activeOpacity={0.7}
                  className={`flex-row items-center px-4 py-3.5 rounded-xl mb-1 ${isSelected ? 'bg-indigo-50 dark:bg-indigo-900/30' : ''}`}
                >
                  {item
                    ? <Text className={`${typo.section} mr-3`}>{item.emoji}</Text>
                    : <MaterialCommunityIcons name="tag-off-outline" size={20} color="#9ca3af" style={{ marginRight: 12 }} />}
                  <Text className={`${typo.label} flex-1 ${isSelected ? 'text-indigo-700 dark:text-indigo-300 font-semibold' : 'text-gray-700 dark:text-gray-300'}`}>
                    {item?.name ?? t('products.noCategory')}
                  </Text>
                  {isSelected && <MaterialCommunityIcons name="check-circle" size={20} color="#4f46e5" />}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}
