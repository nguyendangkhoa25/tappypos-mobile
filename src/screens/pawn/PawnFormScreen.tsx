import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Switch, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  pawnApi, customerApi,
  type PawnCategory, type PawnInterestMode, type CustomerData,
} from '../../services/api';
import { useTypography } from '../../hooks/useTypography';
import { useToastStore } from '../../store/toastStore';
import { useErrorAlert } from '../../hooks/useErrorAlert';
import { DatePickerInput } from '../../components/DatePickerInput';
import { MoneyInput } from '../../components/MoneyInput';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { SellingStackParamList } from '../../types/navigation';

type Nav = NativeStackNavigationProp<SellingStackParamList>;
type RouteT = RouteProp<SellingStackParamList, 'PawnForm'>;

const CATEGORIES: PawnCategory[] = ['GENERAL', 'ELECTRONICS', 'VEHICLE', 'WATCH', 'REAL_ESTATE'];
const CATEGORY_ICONS: Record<PawnCategory, React.ComponentProps<typeof MaterialCommunityIcons>['name']> = {
  GENERAL:      'package-variant-closed',
  ELECTRONICS:  'cellphone',
  VEHICLE:      'motorbike',
  WATCH:        'watch',
  REAL_ESTATE:  'home-city-outline',
};

function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function SectionHeader({ icon, title }: { icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']; title: string }) {
  const typo = useTypography();
  return (
    <View className="flex-row items-center mb-3 mt-1">
      <MaterialCommunityIcons name={icon} size={15} color="#6b7280" style={{ marginRight: 6 }} />
      <Text className={`${typo.captionBold} text-gray-500 dark:text-gray-400 uppercase tracking-wide`}>{title}</Text>
    </View>
  );
}

function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  const typo = useTypography();
  return (
    <View className="mb-4">
      <Text className={`${typo.caption} font-medium text-gray-700 dark:text-gray-300 mb-1.5`}>
        {label}{required && <Text className="text-red-500"> *</Text>}
      </Text>
      {children}
    </View>
  );
}

export function PawnFormScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const typo = useTypography();
  const inputClass = `border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-3 ${typo.inputSize} text-gray-900 dark:text-white bg-white dark:bg-gray-700`;
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteT>();
  const qc = useQueryClient();
  const showError = useErrorAlert();
  const showToast = useToastStore((s) => s.show);

  const { pawnId, customerId: initCustomerId, customerName: initCustomerName } = route.params ?? {};
  const isEdit = !!pawnId;

  const { data: settings } = useQuery({
    queryKey: ['pawnSettings'],
    queryFn: () => pawnApi.getSettings().then((r) => r.data.data),
    staleTime: 5 * 60_000,
  });

  const { data: existingPawn, isLoading: isLoadingPawn } = useQuery({
    queryKey: ['pawn', pawnId],
    queryFn: () => pawnApi.getById(pawnId!).then((r) => r.data.data),
    enabled: isEdit,
    staleTime: 30_000,
  });

  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerData | null>(null);
  const [isWalkIn, setIsWalkIn] = useState(!initCustomerId);
  const [walkInName, setWalkInName] = useState(initCustomerName ?? '');

  const { data: customerResults } = useQuery({
    queryKey: ['customerSearch', customerSearch],
    queryFn: () => customerApi.list({ search: customerSearch, size: 20 }).then((r) => r.data.data),
    enabled: customerSearch.length >= 2 && !isWalkIn,
    staleTime: 10_000,
  });

  const [itemName, setItemName] = useState('');
  const [itemBrand, setItemBrand] = useState('');
  const [itemType, setItemType] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [itemWeight, setItemWeight] = useState('');
  const [itemValue, setItemValue] = useState('');
  const [category, setCategory] = useState<PawnCategory>('GENERAL');
  const [pawnAmount, setPawnAmount] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [pawnDate, setPawnDate] = useState(new Date().toISOString().slice(0, 10));
  const [pawnDueDate, setPawnDueDate] = useState('');
  const [calcMode, setCalcMode] = useState<PawnInterestMode>('DAILY_30');

  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [conditionGrade, setConditionGrade] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [address, setAddress] = useState('');

  useEffect(() => {
    if (settings && !isEdit) {
      setInterestRate(String(settings.interestRate ?? ''));
      const modeMap: Record<number, PawnInterestMode> = { 30: 'DAILY_30', 25: 'DAILY_25', 1: 'MONTHLY', 15: 'BIWEEKLY' };
      setCalcMode(modeMap[settings.interestType] ?? 'DAILY_30');
      if (settings.dueDate > 0) {
        setPawnDueDate(addDays(settings.dueDate));
      }
    }
  }, [settings, isEdit]);

  useEffect(() => {
    if (!existingPawn) return;
    setItemName(existingPawn.itemName ?? '');
    setItemBrand(existingPawn.itemBrand ?? '');
    setItemType(existingPawn.itemType ?? '');
    setItemDescription(existingPawn.itemDescription ?? '');
    setItemWeight(existingPawn.itemWeight ? String(existingPawn.itemWeight) : '');
    setItemValue(existingPawn.itemValue ? String(existingPawn.itemValue) : '');
    setCategory((existingPawn.pawnCategory as PawnCategory) ?? 'GENERAL');
    setPawnAmount(String(existingPawn.pawnAmount));
    setInterestRate(String(existingPawn.interestRate));
    setPawnDate(existingPawn.pawnDate.slice(0, 10));
    setPawnDueDate(existingPawn.pawnDueDate.slice(0, 10));
    setCalcMode(existingPawn.interestCalcMode ?? 'MONTHLY');
    if (existingPawn.customerName) setWalkInName(existingPawn.customerName);
    setIsWalkIn(!existingPawn.customerId);
    const el = existingPawn.electronicsDetail;
    if (el) { setBrand(el.brand ?? ''); setModel(el.model ?? ''); setSerialNumber(el.serialNumber ?? ''); setConditionGrade(el.conditionGrade ?? ''); }
    const vl = existingPawn.vehicleDetail;
    if (vl) { setBrand(vl.brand ?? ''); setModel(vl.model ?? ''); setLicensePlate(vl.licensePlate ?? ''); setConditionGrade(vl.conditionGrade ?? ''); }
    const wl = existingPawn.watchDetail;
    if (wl) { setBrand(wl.brand ?? ''); setModel(wl.model ?? ''); setSerialNumber(wl.serialNumber ?? ''); setConditionGrade(wl.conditionGrade ?? ''); }
    const re = existingPawn.realEstateDetail;
    if (re) { setAddress(re.address ?? ''); }
  }, [existingPawn]);

  const buildPayload = () => ({
    customerId: selectedCustomer?.id
      ? Number(selectedCustomer.id)
      : (isEdit && existingPawn?.customerId ? existingPawn.customerId : undefined),
    customerName: isWalkIn ? (walkInName.trim() || undefined) : undefined,
    visitingGuest: isWalkIn,
    itemName: itemName.trim(),
    itemBrand: itemBrand.trim() || undefined,
    itemType: itemType.trim() || undefined,
    itemDescription: itemDescription.trim() || undefined,
    itemWeight: itemWeight ? parseFloat(itemWeight) : undefined,
    itemValue: itemValue ? parseFloat(itemValue.replace(/\D/g, '')) : undefined,
    pawnDate: new Date(pawnDate).toISOString(),
    pawnDueDate: new Date(pawnDueDate).toISOString(),
    pawnAmount: parseFloat(pawnAmount.replace(/\D/g, '')) || 0,
    interestRate: parseFloat(interestRate) || 0,
    interestCalcMode: calcMode,
    pawnCategory: category,
    electronicsDetail: category === 'ELECTRONICS' ? { brand, model, serialNumber, conditionGrade } : undefined,
    vehicleDetail: category === 'VEHICLE' ? { brand, model, licensePlate, conditionGrade } : undefined,
    watchDetail: category === 'WATCH' ? { brand, model, serialNumber, conditionGrade } : undefined,
    realEstateDetail: category === 'REAL_ESTATE' ? { address } : undefined,
    generalDetail: category === 'GENERAL' ? { brand, model, conditionGrade } : undefined,
  });

  const createMutation = useMutation({
    mutationFn: () => pawnApi.create(buildPayload()),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['pawns'] });
      qc.invalidateQueries({ queryKey: ['pawnKPIs'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast(t('pawn.form.submit'), undefined, 'success');
      navigation.replace('PawnDetail', { pawnId: res.data.data.pawnId });
    },
    onError: showError,
  });

  const updateMutation = useMutation({
    mutationFn: () => pawnApi.update(pawnId!, buildPayload()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pawn', pawnId] });
      qc.invalidateQueries({ queryKey: ['pawns'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast(t('pawn.form.update'), undefined, 'success');
      navigation.goBack();
    },
    onError: showError,
  });

  const isValid = !!(itemName.trim() && pawnAmount && interestRate && pawnDate && pawnDueDate);
  const isPending = createMutation.isPending || updateMutation.isPending;

  if (isEdit && isLoadingPawn) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 dark:bg-gray-900">
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

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
            {isEdit ? t('pawn.form.editTitle') : t('pawn.form.title')}
          </Text>
          <TouchableOpacity onPress={() => isEdit ? updateMutation.mutate() : createMutation.mutate()} disabled={!isValid || isPending} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            {isPending ? <ActivityIndicator size="small" color="#4f46e5" /> : (
              <Text className={`${typo.labelBold} ${isValid ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-300 dark:text-gray-600'}`}>
                {isEdit ? t('pawn.form.update') : t('pawn.form.submit')}
              </Text>
            )}
          </TouchableOpacity>
        </View>
        <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 mt-1 ml-9`}>{t('pawn.formHint')}</Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Section: Customer */}
        <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 mb-4 border border-gray-100 dark:border-gray-700">
          <SectionHeader icon="account-outline" title={t('pawn.form.customerSection')} />

          <View className="flex-row items-center justify-between mb-4">
            <Text className={`${typo.caption} font-medium text-gray-700 dark:text-gray-300`}>{t('pawn.form.walkIn')}</Text>
            <Switch value={isWalkIn} onValueChange={setIsWalkIn} trackColor={{ true: '#4f46e5' }} thumbColor="#fff" />
          </View>

          {isWalkIn ? (
            <FormField label={t('pawn.form.customerName')}>
              <TextInput
                value={walkInName}
                onChangeText={setWalkInName}
                placeholder={t('pawn.noCustomer')}
                placeholderTextColor="#9ca3af"
                className={inputClass}
              />
            </FormField>
          ) : (
            <>
              {selectedCustomer ? (
                <TouchableOpacity
                  onPress={() => { setSelectedCustomer(null); setCustomerSearch(''); }}
                  className="flex-row items-center bg-primary/10 dark:bg-primary/20 rounded-xl px-4 py-3"
                >
                  <MaterialCommunityIcons name="account-check" size={18} color="#4f46e5" />
                  <View className="ml-2 flex-1">
                    <Text className={`${typo.label} text-primary`}>{selectedCustomer.name}</Text>
                    <Text className={`${typo.caption} text-gray-500 dark:text-gray-400`}>{selectedCustomer.phone}</Text>
                  </View>
                  <MaterialCommunityIcons name="close" size={16} color="#9ca3af" />
                </TouchableOpacity>
              ) : (
                <FormField label={t('pawn.form.selectCustomer')}>
                  <TextInput
                    value={customerSearch}
                    onChangeText={setCustomerSearch}
                    placeholder={t('customers.searchPlaceholder')}
                    placeholderTextColor="#9ca3af"
                    className={inputClass}
                  />
                  {customerResults?.content && customerSearch.length >= 2 && (
                    <View className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-600 mt-2 overflow-hidden">
                      {customerResults.content.slice(0, 5).map((c) => (
                        <TouchableOpacity
                          key={c.id}
                          onPress={() => { setSelectedCustomer(c); setCustomerSearch(''); }}
                          className="flex-row items-center px-4 py-3 border-b border-gray-50 dark:border-gray-700"
                        >
                          <MaterialCommunityIcons name="account-outline" size={16} color="#6b7280" />
                          <View className="ml-2">
                            <Text className={`${typo.caption} font-medium text-gray-900 dark:text-white`}>{c.name}</Text>
                            <Text className={`${typo.caption} text-gray-400`}>{c.phone}</Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </FormField>
              )}
            </>
          )}
        </View>

        {/* Section: Item */}
        <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 mb-4 border border-gray-100 dark:border-gray-700">
          <SectionHeader icon="package-variant-closed-outline" title={t('pawn.form.itemSection')} />

          <FormField label={`${t('pawn.form.itemName')} *`}>
            <TextInput
              value={itemName}
              onChangeText={setItemName}
              placeholder={t('pawn.form.itemNamePlaceholder')}
              placeholderTextColor="#9ca3af"
              className={inputClass}
            />
          </FormField>

          <View className="flex-row" style={{ gap: 12 }}>
            <View className="flex-1">
              <FormField label={t('pawn.form.itemBrand')}>
                <TextInput
                  value={itemBrand}
                  onChangeText={setItemBrand}
                  placeholder="VD: Apple, Honda..."
                  placeholderTextColor="#9ca3af"
                  className={inputClass}
                />
              </FormField>
            </View>
            <View className="flex-1">
              <FormField label={t('pawn.form.itemType')}>
                <TextInput
                  value={itemType}
                  onChangeText={setItemType}
                  placeholder="VD: Điện thoại..."
                  placeholderTextColor="#9ca3af"
                  className={inputClass}
                />
              </FormField>
            </View>
          </View>

          <View className="flex-row" style={{ gap: 12 }}>
            <View className="flex-1">
              <FormField label={t('pawn.form.itemWeight')}>
                <TextInput
                  value={itemWeight}
                  onChangeText={setItemWeight}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor="#9ca3af"
                  className={inputClass}
                />
              </FormField>
            </View>
            <View className="flex-1">
              <FormField label={t('pawn.form.itemValue')}>
                <MoneyInput
                  rawValue={itemValue}
                  onChangeRaw={setItemValue}
                  placeholder="0"
                />
              </FormField>
            </View>
          </View>

          <FormField label={t('pawn.form.itemDescription')}>
            <TextInput
              value={itemDescription}
              onChangeText={setItemDescription}
              multiline
              placeholder={t('pawn.form.itemDescription')}
              placeholderTextColor="#9ca3af"
              className={inputClass}
              style={{ textAlignVertical: 'top', minHeight: 72 }}
            />
          </FormField>
        </View>

        {/* Section: Category */}
        <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 mb-4 border border-gray-100 dark:border-gray-700">
          <SectionHeader icon="shape-outline" title={t('pawn.form.category')} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row" style={{ gap: 8 }}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setCategory(cat)}
                  className={`flex-row items-center rounded-full px-3 py-2 border ${
                    category === cat ? 'bg-primary border-primary' : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                  }`}
                >
                  <MaterialCommunityIcons
                    name={CATEGORY_ICONS[cat]}
                    size={14}
                    color={category === cat ? '#fff' : '#6b7280'}
                  />
                  <Text className={`${typo.captionBold} ml-1 ${category === cat ? 'text-white' : 'text-gray-600 dark:text-gray-300'}`}>
                    {t(`pawn.category.${cat}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Section: Category-specific details */}
        {(category === 'ELECTRONICS' || category === 'VEHICLE' || category === 'WATCH' || category === 'GENERAL') && (
          <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 mb-4 border border-gray-100 dark:border-gray-700">
            <SectionHeader
              icon={CATEGORY_ICONS[category]}
              title={
                category === 'ELECTRONICS' ? t('pawn.form.electronicsSection') :
                category === 'VEHICLE' ? t('pawn.form.vehicleSection') :
                category === 'WATCH' ? t('pawn.form.watchSection') :
                t('pawn.detail.item')
              }
            />
            <View className="flex-row" style={{ gap: 12 }}>
              <View className="flex-1">
                <FormField label={t('pawn.form.brand')}>
                  <TextInput
                    value={brand}
                    onChangeText={setBrand}
                    placeholder="VD: Apple..."
                    placeholderTextColor="#9ca3af"
                    className={inputClass}
                  />
                </FormField>
              </View>
              <View className="flex-1">
                <FormField label={t('pawn.form.model')}>
                  <TextInput
                    value={model}
                    onChangeText={setModel}
                    placeholder="VD: iPhone 15..."
                    placeholderTextColor="#9ca3af"
                    className={inputClass}
                  />
                </FormField>
              </View>
            </View>
            {(category === 'ELECTRONICS' || category === 'WATCH') && (
              <FormField label={t('pawn.form.serialNumber')}>
                <TextInput
                  value={serialNumber}
                  onChangeText={setSerialNumber}
                  placeholder="IMEI / Serial..."
                  placeholderTextColor="#9ca3af"
                  className={inputClass}
                />
              </FormField>
            )}
            {category === 'VEHICLE' && (
              <FormField label={t('pawn.form.licensePlate')}>
                <TextInput
                  value={licensePlate}
                  onChangeText={setLicensePlate}
                  placeholder="VD: 51F-12345"
                  placeholderTextColor="#9ca3af"
                  className={inputClass}
                />
              </FormField>
            )}
            <FormField label={t('pawn.form.conditionGrade')}>
              <TextInput
                value={conditionGrade}
                onChangeText={setConditionGrade}
                placeholder="VD: Tốt, Mới 95%..."
                placeholderTextColor="#9ca3af"
                className={inputClass}
              />
            </FormField>
          </View>
        )}

        {category === 'REAL_ESTATE' && (
          <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 mb-4 border border-gray-100 dark:border-gray-700">
            <SectionHeader icon="home-city-outline" title={t('pawn.form.realEstateSection')} />
            <FormField label={t('pawn.form.address')}>
              <TextInput
                value={address}
                onChangeText={setAddress}
                multiline
                placeholder="Địa chỉ bất động sản..."
                placeholderTextColor="#9ca3af"
                className={inputClass}
                style={{ textAlignVertical: 'top', minHeight: 72 }}
              />
            </FormField>
          </View>
        )}

        {/* Section: Contract */}
        <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 mb-4 border border-gray-100 dark:border-gray-700">
          <SectionHeader icon="file-document-outline" title={t('pawn.form.contractSection')} />

          <FormField label={`${t('pawn.form.pawnAmount')} *`}>
            <TextInput
              value={pawnAmount}
              onChangeText={setPawnAmount}
              keyboardType="numeric"
              placeholder="0 ₫"
              placeholderTextColor="#9ca3af"
              className={inputClass}
            />
          </FormField>

          <View className="flex-row" style={{ gap: 12 }}>
            <View className="flex-1">
              <FormField label={`${t('pawn.form.pawnDate')} *`}>
                <View className="border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-3 bg-white dark:bg-gray-700">
                  <DatePickerInput value={pawnDate} onChange={setPawnDate} />
                </View>
              </FormField>
            </View>
            <View className="flex-1">
              <FormField label={`${t('pawn.form.pawnDueDate')} *`}>
                <View className="border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-3 bg-white dark:bg-gray-700">
                  <DatePickerInput
                    value={pawnDueDate}
                    onChange={setPawnDueDate}
                    minimumDate={pawnDate ? new Date(pawnDate + 'T00:00:00') : undefined}
                  />
                </View>
              </FormField>
            </View>
          </View>

          <FormField label={`${t('pawn.form.interestRate')} *`}>
            <View className="flex-row border border-gray-200 dark:border-gray-600 rounded-xl overflow-hidden">
              <TextInput
                value={interestRate}
                onChangeText={setInterestRate}
                keyboardType="decimal-pad"
                placeholder="3"
                placeholderTextColor="#9ca3af"
                className={`flex-1 ${typo.inputSize} text-gray-900 dark:text-white px-3 py-3 bg-white dark:bg-gray-700`}
              />
              <View className="px-3 py-3 bg-gray-50 dark:bg-gray-600 border-l border-gray-200 dark:border-gray-600">
                <Text className={`${typo.label} text-gray-500 dark:text-gray-300`}>%/tháng</Text>
              </View>
            </View>
          </FormField>

          <FormField label={t('pawn.form.interestCalcMode')}>
            <View className="border border-gray-200 dark:border-gray-600 rounded-xl overflow-hidden">
              {(['DAILY_30', 'DAILY_25', 'MONTHLY', 'BIWEEKLY'] as PawnInterestMode[]).map((mode, i, arr) => (
                <TouchableOpacity
                  key={mode}
                  onPress={() => setCalcMode(mode)}
                  activeOpacity={0.7}
                  className={`flex-row items-center px-4 py-3 ${
                    i < arr.length - 1 ? 'border-b border-gray-100 dark:border-gray-700' : ''
                  } ${calcMode === mode ? 'bg-primary/5 dark:bg-primary/10' : 'bg-white dark:bg-gray-800'}`}
                >
                  <View className={`w-4 h-4 rounded-full border-2 items-center justify-center mr-3 ${
                    calcMode === mode ? 'border-primary' : 'border-gray-300 dark:border-gray-600'
                  }`}>
                    {calcMode === mode && <View className="w-2 h-2 rounded-full bg-primary" />}
                  </View>
                  <Text className={`${typo.caption} font-medium flex-1 ${
                    calcMode === mode ? 'text-primary' : 'text-gray-800 dark:text-white'
                  }`}>
                    {t(`pawn.settings.calcMode_${mode}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </FormField>
        </View>
      </ScrollView>

    </KeyboardAvoidingView>
  );
}
