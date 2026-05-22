import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToastStore } from '../../store/toastStore';
import { useAlertStore } from '../../store/alertStore';
import { useErrorAlert } from '../../hooks/useErrorAlert';
import { comboApi, productExtApi, type ComboItem, type ProductData } from '../../services/api';
import { useTypography } from '../../hooks/useTypography';
import { formatVnd } from '../../utils/format';
import { MoneyInput } from '../../components/MoneyInput';
import type { ComboScreenProps } from '../../types/navigation';

type FormItem = { productId: string; productName: string; quantity: number; price: number };

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

export function ComboEditScreen({ navigation, route }: ComboScreenProps<'ComboEdit'>) {
  const { comboId } = route.params ?? {};
  const isEdit = !!comboId;
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const typo = useTypography();
  const qc = useQueryClient();
  const { show: showToast } = useToastStore();
  const { show: showAlert } = useAlertStore();
  const showErrorAlert = useErrorAlert();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [items, setItems] = useState<FormItem[]>([]);
  const [price, setPrice] = useState('');
  const [active, setActive] = useState(true);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const [error, setError] = useState('');

  const { isLoading: loadingEdit } = useQuery({
    queryKey: ['combo', comboId],
    queryFn: () => comboApi.list().then((r) => r.data.data.find((c) => c.id === comboId)),
    enabled: isEdit,
    staleTime: 0,
    onSuccess: (data: any) => {
      if (data) {
        setName(data.name);
        setDescription(data.description ?? '');
        setPrice(data.price.toString());
        setActive(data.active);
        setItems(data.items.map((i: ComboItem) => ({ ...i })));
      }
    },
  } as any);

  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ['productsForCombo'],
    queryFn: () => productExtApi.list({ size: 100 }).then((r) => r.data.data.content),
    staleTime: 5 * 60_000,
    enabled: pickerVisible,
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        name,
        description: description || null,
        price: Number(price),
        active,
        items: items.map((i) => ({ productId: i.productId, productName: i.productName, quantity: i.quantity, price: i.price })),
      };
      if (isEdit) return comboApi.update(comboId!, payload);
      return comboApi.create(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['combos'] });
      showToast(t('combos.saveSuccess'));
      navigation.goBack();
    },
    onError: showErrorAlert,
  });

  const retailTotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const savings = Number(price) > 0 ? retailTotal - Number(price) : 0;

  const handleSave = () => {
    if (!name.trim()) { setError(t('combos.validationName')); return; }
    if (items.length < 2) { setError(t('combos.validationProducts')); return; }
    if (!price || Number(price) <= 0) { setError(t('combos.validationPrice')); return; }
    setError('');
    saveMutation.mutate();
  };

  const addProduct = (product: ProductData) => {
    if (items.find((i) => i.productId === product.id)) return;
    setItems([...items, { productId: product.id, productName: product.name, quantity: 1, price: product.price }]);
    setPickerVisible(false);
  };

  const removeItem = (productId: string) => {
    showAlert(t('common.confirm'), '', [
      { label: t('common.cancel'), style: 'cancel' },
      { label: t('common.confirm'), style: 'destructive', onPress: () => setItems(items.filter((i) => i.productId !== productId)) },
    ]);
  };

  const updateQty = (productId: string, delta: number) => {
    setItems(items.map((i) => i.productId === productId ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i));
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(pickerSearch.toLowerCase()),
  );

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-gray-50 dark:bg-gray-900"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4" style={{ paddingTop: insets.top + 12, paddingBottom: 12 }}>
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} className="mr-3">
            <MaterialCommunityIcons name="chevron-left" size={26} color="#4f46e5" />
          </TouchableOpacity>
          <Text className={`${typo.heading} text-gray-900 dark:text-white flex-1`} numberOfLines={1}>
            {isEdit ? t('combos.editTitle') : t('combos.createTitle')}
          </Text>
          <TouchableOpacity onPress={handleSave} disabled={saveMutation.isPending} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            {saveMutation.isPending ? <ActivityIndicator size="small" color="#4f46e5" /> : (
              <Text className={`${typo.labelBold} text-indigo-600 dark:text-indigo-400`}>{t('common.save')}</Text>
            )}
          </TouchableOpacity>
        </View>
        <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 mt-1 ml-9`}>{t('combos.editHint')}</Text>
      </View>

      {loadingEdit ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#4f46e5" />
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Section: Basic info */}
          <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 mb-4 border border-gray-100 dark:border-gray-700">
            <SectionHeader icon="information-outline" title={t('combos.sectionInfo')} />
            <FormField label={`${t('combos.nameLabel')} *`}>
              <TextInput
                value={name}
                onChangeText={(v) => { setName(v); setError(''); }}
                placeholder={t('combos.namePlaceholder')}
                placeholderTextColor="#9ca3af"
                className={`border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-3 ${typo.inputSize} text-gray-900 dark:text-white bg-white dark:bg-gray-700`}
              />
            </FormField>
            <FormField label={t('combos.descLabel')}>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder={t('combos.descPlaceholder')}
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={2}
                textAlignVertical="top"
                className={`border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-3 ${typo.inputSize} text-gray-900 dark:text-white bg-white dark:bg-gray-700`}
              />
            </FormField>
          </View>

          {/* Section: Products */}
          <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 mb-4 border border-gray-100 dark:border-gray-700">
            <View className="flex-row items-center mb-3 mt-1">
              <MaterialCommunityIcons name="package-variant" size={15} color="#6b7280" style={{ marginRight: 6 }} />
              <Text className={`${typo.captionBold} text-gray-500 dark:text-gray-400 uppercase tracking-wide flex-1`}>
                {t('combos.sectionProducts')} ({items.length})
              </Text>
              <TouchableOpacity
                onPress={() => setPickerVisible(true)}
                className="flex-row items-center"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={{ gap: 4 }}
              >
                <MaterialCommunityIcons name="plus" size={16} color="#4f46e5" />
                <Text className={`${typo.label} text-indigo-600 dark:text-indigo-400`}>{t('combos.addProduct')}</Text>
              </TouchableOpacity>
            </View>
            {items.map((item, idx) => (
              <View key={item.productId}>
                {idx > 0 && <View className="h-px bg-gray-100 dark:bg-gray-700 my-2" />}
                <View className="flex-row items-center" style={{ gap: 8 }}>
                  <View className="flex-1">
                    <Text className={`${typo.caption} font-medium text-gray-900 dark:text-white`}>{item.productName}</Text>
                    <Text className={`${typo.caption} text-gray-500 mt-0.5`}>{formatVnd(item.price)} × {item.quantity}</Text>
                  </View>
                  <TouchableOpacity onPress={() => updateQty(item.productId, -1)} className="w-8 h-8 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
                    <MaterialCommunityIcons name="minus" size={16} color="#6b7280" />
                  </TouchableOpacity>
                  <Text className={`${typo.labelBold} text-gray-900 dark:text-white w-6 text-center`}>{item.quantity}</Text>
                  <TouchableOpacity onPress={() => updateQty(item.productId, 1)} className="w-8 h-8 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
                    <MaterialCommunityIcons name="plus" size={16} color="#6b7280" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => removeItem(item.productId)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <MaterialCommunityIcons name="close-circle" size={18} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            {items.length === 0 && (
              <Text className={`${typo.caption} text-gray-400 text-center py-2`}>{t('combos.validationProducts')}</Text>
            )}
          </View>

          {/* Section: Price */}
          <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 mb-4 border border-gray-100 dark:border-gray-700">
            <SectionHeader icon="tag-outline" title={t('combos.sectionPrice')} />
            <FormField label={`${t('combos.priceLabel')} *`}>
              <MoneyInput
                rawValue={price}
                onChangeRaw={(digits) => { setPrice(digits); setError(''); }}
                placeholder={t('combos.pricePlaceholder')}
              />
            </FormField>
            <View className="flex-row justify-between">
              <Text className={`${typo.caption} text-gray-500 dark:text-gray-400`}>{t('combos.retailTotal')}</Text>
              <Text className={`${typo.caption} text-gray-700 dark:text-gray-300`}>{formatVnd(retailTotal)}</Text>
            </View>
            {savings > 0 && (
              <View className="flex-row justify-between mt-1">
                <Text className={`${typo.caption} text-indigo-600 dark:text-indigo-400`}>{t('combos.savingsLabel')}</Text>
                <Text className={`${typo.label} text-indigo-600 dark:text-indigo-400`}>{formatVnd(savings)}</Text>
              </View>
            )}
          </View>

          {/* Section: Status */}
          <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 mb-4 border border-gray-100 dark:border-gray-700">
            <SectionHeader icon="toggle-switch-outline" title={t('combos.sectionStatus')} />
            <View className="flex-row items-center justify-between">
              <Text className={`${typo.caption} text-gray-900 dark:text-white`}>{t('combos.active')}</Text>
              <Switch value={active} onValueChange={setActive} trackColor={{ true: '#4f46e5' }} thumbColor="#fff" />
            </View>
          </View>

          {error ? <Text className={`${typo.caption} text-red-500 px-4`}>{error}</Text> : null}
        </ScrollView>
      )}


      {/* Product Picker Modal */}
      <Modal visible={pickerVisible} animationType="slide" transparent>
        <View className="flex-1 bg-black/40 justify-end">
          <View className="bg-white dark:bg-gray-800 rounded-t-3xl" style={{ maxHeight: '70%', paddingBottom: insets.bottom }}>
            <View className="flex-row items-center justify-between px-4 pt-5 pb-3">
              <Text className={`${typo.section} text-gray-900 dark:text-white`}>{t('combos.addProduct')}</Text>
              <TouchableOpacity onPress={() => setPickerVisible(false)}>
                <MaterialCommunityIcons name="close" size={22} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <View className="px-4 pb-2">
              <TextInput
                value={pickerSearch}
                onChangeText={setPickerSearch}
                placeholder={t('combos.searchPlaceholder')}
                placeholderTextColor="#9ca3af"
                className={`border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 ${typo.inputSize} text-gray-900 dark:text-white bg-white dark:bg-gray-700`}
              />
            </View>
            {loadingProducts ? (
              <View className="py-8 items-center">
                <ActivityIndicator color="#4f46e5" />
              </View>
            ) : (
              <FlatList
                data={filteredProducts}
                keyExtractor={(p) => p.id}
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
                renderItem={({ item: p }) => {
                  const added = items.some((i) => i.productId === p.id);
                  return (
                    <TouchableOpacity
                      onPress={() => !added && addProduct(p)}
                      className={`flex-row items-center py-3 border-b border-gray-100 dark:border-gray-700 ${added ? 'opacity-40' : ''}`}
                    >
                      <View className="flex-1">
                        <Text className={`${typo.caption} text-gray-900 dark:text-white`}>{p.name}</Text>
                        <Text className={`${typo.caption} text-indigo-600 dark:text-indigo-400 mt-0.5`}>{formatVnd(p.price)}</Text>
                      </View>
                      {added ? (
                        <MaterialCommunityIcons name="check-circle" size={20} color="#4f46e5" />
                      ) : (
                        <MaterialCommunityIcons name="plus-circle-outline" size={20} color="#4f46e5" />
                      )}
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}
