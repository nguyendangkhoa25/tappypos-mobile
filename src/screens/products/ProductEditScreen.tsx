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
import { ClearableInput } from '../../components/ClearableInput';
import { MoneyInput } from '../../components/MoneyInput';
import { Skeleton } from '../../components/Skeleton';
import { getUnitsForType } from '../../constants/productConstants';
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

function Divider() {
  return <View className="h-px bg-gray-100 mx-4" />;
}

function FieldLabel({ text }: { text: string }) {
  return <Text className="text-sm font-medium text-gray-700 mb-1.5">{text}</Text>;
}

export function ProductEditScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
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

  // Available unit chips for this product type; always include the current unit if it's custom
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
      <View className="flex-1 bg-white">
        <View className="bg-primary px-4 pb-6" style={{ paddingTop: top + 16 }}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="white" />
          </TouchableOpacity>
        </View>
        <View className="px-4 pt-4" style={{ gap: 16 }}>
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} height={56} borderRadius={12} />)}
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* ── Header ── */}
      <View className="bg-primary px-4 pb-5" style={{ paddingTop: top + 16 }}>
        <View className="flex-row items-center" style={{ gap: 10 }}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="white" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-white flex-1">{t('products.editProduct')}</Text>
        </View>
        <View className="flex-row items-center mt-3 mb-1" style={{ gap: 6 }}>
          {isService && <MaterialCommunityIcons name="scissors-cutting" size={15} color="#a5b4fc" />}
          <Text className="text-base font-semibold text-white flex-1" numberOfLines={2}>{product?.name}</Text>
        </View>
        <Text className="text-xs text-indigo-200">{t('products.editHint')}</Text>
      </View>

      {/* ── Form ── */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: bottom + 80 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Name */}
        <View className="px-4 pt-4 pb-3">
          <FieldLabel text={`${t('products.name')} *`} />
          <ClearableInput
            value={form.name}
            onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
            onClear={() => setForm((f) => ({ ...f, name: '' }))}
            placeholder={t('products.namePlaceholder')}
            autoCapitalize="words"
          />
        </View>

        <Divider />

        {/* Price — and duration on the same row for services */}
        <View className="px-4 pt-3 pb-3">
          {product?.dynamicPrice ? (
            <View className="flex-row items-center bg-amber-50 border border-amber-200 rounded-xl px-4 py-3" style={{ gap: 8 }}>
              <MaterialCommunityIcons name="gold" size={18} color="#d97706" />
              <Text className="text-sm text-amber-700 flex-1">{t('products.goldPrice')}</Text>
            </View>
          ) : (
            <View className="flex-row" style={{ gap: 12 }}>
              {/* Price */}
              <View className="flex-1">
                <FieldLabel text={t('products.price')} />
                <MoneyInput
                  rawValue={form.price}
                  onChangeRaw={(v) => setForm((f) => ({ ...f, price: v }))}
                  placeholder="0"
                />
              </View>

              {/* Duration — only for services, inline with price */}
              {isService && (
                <View style={{ width: 108 }}>
                  <FieldLabel text={t('products.duration')} />
                  <View className="flex-row items-center border border-gray-300 rounded-xl overflow-hidden bg-white">
                    <TextInput
                      className="flex-1 px-3 py-3 text-base text-gray-900"
                      value={form.durationMinutes}
                      onChangeText={(v) => setForm((f) => ({ ...f, durationMinutes: v.replace(/\D/g, '') }))}
                      placeholder="0"
                      placeholderTextColor="#9ca3af"
                      keyboardType="number-pad"
                    />
                    <View className="px-2 py-3 bg-gray-50 border-l border-gray-200">
                      <Text className="text-gray-500 text-sm font-semibold">{t('products.minutes')}</Text>
                    </View>
                  </View>
                </View>
              )}
            </View>
          )}
        </View>

        <Divider />

        {/* Unit — chips only, filtered by product type */}
        <View className="pt-3 pb-3">
          <View className="px-4">
            <FieldLabel text={t('products.unit')} />
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
          >
            {unitChips.map((u) => {
              const selected = form.unit === u;
              return (
                <TouchableOpacity
                  key={u}
                  onPress={() => setForm((f) => ({ ...f, unit: selected ? '' : u }))}
                  activeOpacity={0.7}
                  className={`px-4 py-2 rounded-full border ${
                    selected ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-gray-200'
                  }`}
                >
                  <Text className={`text-sm font-medium ${selected ? 'text-white' : 'text-gray-600'}`}>
                    {t(`products.units.${u}`, { defaultValue: u })}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <Divider />

        {/* Category */}
        <View className="px-4 pt-3 pb-3">
          <FieldLabel text={t('products.category')} />
          {form.categoryId ? (
            <View className="flex-row items-center" style={{ gap: 8 }}>
              <TouchableOpacity
                onPress={() => setCategoryPickerVisible(true)}
                activeOpacity={0.75}
                className="flex-row items-center bg-indigo-50 border border-indigo-200 rounded-full px-3 py-2"
                style={{ gap: 6 }}
              >
                {form.categoryEmoji ? (
                  <Text style={{ fontSize: 15, lineHeight: 20 }}>{form.categoryEmoji}</Text>
                ) : (
                  <MaterialCommunityIcons name="shape" size={15} color="#4f46e5" />
                )}
                <Text className="text-sm font-semibold text-indigo-700">{form.categoryName}</Text>
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
              className="flex-row items-center border border-dashed border-gray-300 rounded-xl px-4 py-3"
              style={{ gap: 8 }}
            >
              <MaterialCommunityIcons name="plus-circle-outline" size={18} color="#9ca3af" />
              <Text className="text-sm text-gray-400">{t('products.selectCategory')}</Text>
            </TouchableOpacity>
          )}
        </View>

        <Divider />

        {/* Description */}
        <View className="px-4 pt-3 pb-4">
          <FieldLabel text={t('products.description')} />
          <TextInput
            className="border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 bg-gray-50"
            value={form.description}
            onChangeText={(v) => setForm((f) => ({ ...f, description: v }))}
            placeholder={t('products.descriptionPlaceholder')}
            placeholderTextColor="#9ca3af"
            multiline
            textAlignVertical="top"
            style={{ minHeight: 90 }}
          />
        </View>
      </ScrollView>

      {/* ── Save footer ── */}
      <View
        className="px-4 pt-2.5 bg-white border-t border-gray-100"
        style={{ paddingBottom: bottom + 10 }}
      >
        <TouchableOpacity
          onPress={handleSave}
          disabled={mutation.isPending}
          activeOpacity={0.8}
          className={`rounded-2xl py-3 flex-row items-center justify-center ${mutation.isPending ? 'bg-gray-300' : 'bg-primary'}`}
          style={{ gap: 8 }}
        >
          {mutation.isPending
            ? <ActivityIndicator color="#fff" size="small" />
            : <MaterialCommunityIcons name="content-save-outline" size={18} color="#fff" />}
          <Text className="text-white font-bold text-base">
            {mutation.isPending ? t('products.saving') : t('common.save')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Category picker modal ── */}
      <Modal
        visible={categoryPickerVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setCategoryPickerVisible(false)}
      >
        <TouchableOpacity className="flex-1 bg-black/40" activeOpacity={1} onPress={() => setCategoryPickerVisible(false)} />
        <View className="bg-white rounded-t-3xl px-4 pt-5" style={{ paddingBottom: bottom + 16 }}>
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-bold text-gray-900">{t('products.selectCategory')}</Text>
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
                  className={`flex-row items-center px-4 py-3.5 rounded-xl mb-1 ${isSelected ? 'bg-indigo-50' : ''}`}
                >
                  {item
                    ? <Text className="text-xl mr-3">{item.emoji}</Text>
                    : <MaterialCommunityIcons name="tag-off-outline" size={20} color="#9ca3af" style={{ marginRight: 12 }} />}
                  <Text className={`text-base flex-1 ${isSelected ? 'text-indigo-700 font-semibold' : 'text-gray-700'}`}>
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
