import { useState } from 'react';
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
import { productApi, categoryApi, type ProductTypeData, type CategoryData } from '../../services/api';
import { useAlertStore } from '../../store/alertStore';
import { useErrorAlert } from '../../hooks/useErrorAlert';
import { formatVnd } from '../../utils/format';
import { isDynamicPriceType, getDefaultUnit } from '../../constants/productConstants';
import type { ProductsScreenProps } from '../../types/navigation';

type Props = ProductsScreenProps<'ProductCreate'>;

type FormState = {
  name: string;
  price: string;
  unit: string;
  categoryId: string | null;
  categoryName: string | null;
  description: string;
  durationMinutes: string;
};

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="mb-4">
      <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
        {label}
      </Text>
      {children}
    </View>
  );
}

function StyledInput(props: React.ComponentProps<typeof TextInput>) {
  return (
    <TextInput
      className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900"
      placeholderTextColor="#9ca3af"
      {...props}
    />
  );
}

export function ProductCreateScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { top, bottom } = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { show: showAlert } = useAlertStore();
  const showErrorAlert = useErrorAlert();

  const [selectedType, setSelectedType] = useState<ProductTypeData | null>(null);
  const [typePickerVisible, setTypePickerVisible] = useState(false);
  const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);
  const [form, setForm] = useState<FormState>({
    name: '',
    price: '',
    unit: '',
    categoryId: null,
    categoryName: null,
    description: '',
    durationMinutes: '',
  });

  const { data: types = [], isLoading: typesLoading } = useQuery({
    queryKey: ['product-types'],
    queryFn: () => productApi.types().then((r) => r.data.data),
    staleTime: 10 * 60_000,
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryApi.list().then((r) => r.data.data),
    staleTime: 5 * 60_000,
  });

  const isService = selectedType?.code === 'SERVICE';
  const isDynamic = isDynamicPriceType(selectedType?.code);

  const mutation = useMutation({
    mutationFn: async () => {
      const skuRes = await productApi.suggestSku(form.name.trim(), selectedType!.code);
      const sku = skuRes.data.data;
      return productApi.create({
        productTypeId: Number(selectedType!.id),
        sku,
        name: form.name.trim(),
        price: isDynamic ? 0 : Number(form.price.replace(/\D/g, '')) || 0,
        unit: form.unit.trim(),
        categoryIds: form.categoryId ? [Number(form.categoryId)] : null,
        description: form.description.trim() || null,
        status: 'ACTIVE',
        durationMinutes: isService && form.durationMinutes ? Number(form.durationMinutes) || null : null,
        attributes: {},
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products-summary'] });
      navigation.goBack();
    },
    onError: showErrorAlert,
  });

  const handleSave = () => {
    if (!selectedType) {
      showAlert(t('common.error'), t('products.typeRequired'), [{ label: t('common.close'), style: 'cancel' }]);
      return;
    }
    if (!form.name.trim()) {
      showAlert(t('common.error'), t('products.nameRequired'), [{ label: t('common.close'), style: 'cancel' }]);
      return;
    }
    mutation.mutate();
  };

  const selectCategory = (cat: CategoryData | null) => {
    setForm((f) => ({ ...f, categoryId: cat?.id ?? null, categoryName: cat?.name ?? null }));
    setCategoryPickerVisible(false);
  };

  const selectType = (type: ProductTypeData) => {
    setSelectedType(type);
    setTypePickerVisible(false);
    setForm((f) => ({ ...f, unit: getDefaultUnit(type.code) }));
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-gray-50"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View className="bg-primary px-6 pb-5" style={{ paddingTop: top + 16 }}>
        <View className="flex-row items-center justify-between">
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="white" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-white">{t('products.addProduct')}</Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={mutation.isPending}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {mutation.isPending ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text className="text-white font-bold text-base">{t('common.save')}</Text>
            )}
          </TouchableOpacity>
        </View>
        <Text className="text-xs text-indigo-200 mt-1">{t('products.addHint')}</Text>
      </View>

      <ScrollView
        className="flex-1 px-4 pt-4"
        contentContainerStyle={{ paddingBottom: bottom + 24 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Product type selector */}
        <View className="bg-white rounded-2xl p-4 mb-4 border border-gray-100">
          <FormField label={`${t('products.productType')} *`}>
            <TouchableOpacity
              className={`border rounded-xl px-4 py-3 flex-row items-center justify-between ${
                selectedType ? 'bg-indigo-50 border-indigo-200' : 'bg-gray-50 border-gray-200'
              }`}
              onPress={() => setTypePickerVisible(true)}
              disabled={typesLoading}
            >
              {selectedType ? (
                <View className="flex-row items-center flex-1" style={{ gap: 8 }}>
                  <View className="bg-indigo-100 rounded-lg px-2 py-0.5">
                    <Text className="text-xs font-bold text-indigo-700">{selectedType.code}</Text>
                  </View>
                  <Text className="text-base text-gray-900 font-medium flex-1">{selectedType.name}</Text>
                </View>
              ) : (
                <Text className="text-base text-gray-400 flex-1">{t('products.selectType')}</Text>
              )}
              <MaterialCommunityIcons name="chevron-down" size={20} color="#9ca3af" />
            </TouchableOpacity>
          </FormField>
        </View>

        {/* Main fields */}
        <View className="bg-white rounded-2xl p-4 mb-4 border border-gray-100">
          <FormField label={`${t('products.name')} *`}>
            <StyledInput
              value={form.name}
              onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
              placeholder={t('products.namePlaceholder')}
              autoCapitalize="words"
            />
          </FormField>

          {isDynamic ? (
            <View className="mb-4 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 flex-row items-center" style={{ gap: 8 }}>
              <MaterialCommunityIcons name="gold" size={18} color="#d97706" />
              <Text className="text-sm text-yellow-700 flex-1">{t('products.goldPrice')}</Text>
            </View>
          ) : (
            <FormField label={t('products.price')}>
              <StyledInput
                value={form.price}
                onChangeText={(v) => setForm((f) => ({ ...f, price: v.replace(/[^0-9]/g, '') }))}
                placeholder={t('products.pricePlaceholder')}
                keyboardType="numeric"
              />
              {form.price ? (
                <Text className="text-xs text-gray-400 mt-1 ml-1">= {formatVnd(Number(form.price))}</Text>
              ) : null}
            </FormField>
          )}

          <FormField label={t('products.unit')}>
            <StyledInput
              value={form.unit}
              onChangeText={(v) => setForm((f) => ({ ...f, unit: v }))}
              placeholder={t('products.unitPlaceholder')}
            />
          </FormField>

          {isService && (
            <FormField label={`${t('products.duration')} (${t('products.minutes')})`}>
              <StyledInput
                value={form.durationMinutes}
                onChangeText={(v) => setForm((f) => ({ ...f, durationMinutes: v.replace(/\D/g, '') }))}
                placeholder={t('products.durationPlaceholder')}
                keyboardType="numeric"
              />
            </FormField>
          )}

          <FormField label={t('products.category')}>
            <TouchableOpacity
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 flex-row items-center justify-between"
              onPress={() => setCategoryPickerVisible(true)}
            >
              <Text className={form.categoryName ? 'text-gray-900 text-base' : 'text-gray-400 text-base'}>
                {form.categoryName ?? t('products.selectCategory')}
              </Text>
              <MaterialCommunityIcons name="chevron-down" size={20} color="#9ca3af" />
            </TouchableOpacity>
          </FormField>
        </View>

        {/* Description */}
        <View className="bg-white rounded-2xl p-4 border border-gray-100">
          <FormField label={t('products.description')}>
            <StyledInput
              value={form.description}
              onChangeText={(v) => setForm((f) => ({ ...f, description: v }))}
              placeholder={t('products.descriptionPlaceholder')}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              style={{ minHeight: 100 }}
            />
          </FormField>
        </View>
      </ScrollView>

      {/* Product type picker modal */}
      <Modal
        visible={typePickerVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setTypePickerVisible(false)}
      >
        <TouchableOpacity
          className="flex-1 bg-black/40"
          activeOpacity={1}
          onPress={() => setTypePickerVisible(false)}
        />
        <View className="bg-white rounded-t-3xl px-4 pt-4" style={{ paddingBottom: bottom + 16 }}>
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-bold text-gray-900">{t('products.selectType')}</Text>
            <TouchableOpacity onPress={() => setTypePickerVisible(false)}>
              <MaterialCommunityIcons name="close" size={22} color="#6b7280" />
            </TouchableOpacity>
          </View>
          <FlatList
            data={types}
            keyExtractor={(item) => item.id}
            style={{ maxHeight: 360 }}
            renderItem={({ item }) => {
              const isSelected = selectedType?.id === item.id;
              return (
                <TouchableOpacity
                  className={`flex-row items-center px-4 py-3.5 rounded-xl mb-1 ${isSelected ? 'bg-indigo-50' : ''}`}
                  onPress={() => selectType(item)}
                >
                  <View className="bg-indigo-100 rounded-lg px-2 py-0.5 mr-3">
                    <Text className="text-xs font-bold text-indigo-700">{item.code}</Text>
                  </View>
                  <View className="flex-1">
                    <Text className={`text-base font-medium ${isSelected ? 'text-primary' : 'text-gray-800'}`}>
                      {item.name}
                    </Text>
                    {item.description ? (
                      <Text className="text-xs text-gray-400 mt-0.5" numberOfLines={1}>{item.description}</Text>
                    ) : null}
                  </View>
                  {isSelected && <MaterialCommunityIcons name="check" size={20} color="#4f46e5" />}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </Modal>

      {/* Category picker modal */}
      <Modal
        visible={categoryPickerVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setCategoryPickerVisible(false)}
      >
        <TouchableOpacity
          className="flex-1 bg-black/40"
          activeOpacity={1}
          onPress={() => setCategoryPickerVisible(false)}
        />
        <View className="bg-white rounded-t-3xl px-4 pt-4" style={{ paddingBottom: bottom + 16 }}>
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-bold text-gray-900">{t('products.selectCategory')}</Text>
            <TouchableOpacity onPress={() => setCategoryPickerVisible(false)}>
              <MaterialCommunityIcons name="close" size={22} color="#6b7280" />
            </TouchableOpacity>
          </View>
          <FlatList
            data={[null, ...(categories ?? [])]}
            keyExtractor={(item) => item?.id ?? '__none__'}
            style={{ maxHeight: 320 }}
            renderItem={({ item }) => {
              const isSelected = item === null ? form.categoryId === null : form.categoryId === item.id;
              return (
                <TouchableOpacity
                  className={`flex-row items-center px-4 py-3.5 rounded-xl mb-1 ${isSelected ? 'bg-indigo-50' : ''}`}
                  onPress={() => selectCategory(item)}
                >
                  {item ? (
                    <Text className="text-xl mr-3">{item.emoji}</Text>
                  ) : (
                    <MaterialCommunityIcons name="tag-off-outline" size={20} color="#9ca3af" style={{ marginRight: 12 }} />
                  )}
                  <Text className={`text-base flex-1 ${isSelected ? 'text-primary font-semibold' : 'text-gray-700'}`}>
                    {item?.name ?? t('products.noCategory')}
                  </Text>
                  {isSelected && <MaterialCommunityIcons name="check" size={20} color="#4f46e5" />}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}
