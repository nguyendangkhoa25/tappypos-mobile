import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { customerApi, type CustomerFormPayload } from '../../services/api';
import { useAlertStore } from '../../store/alertStore';
import { useToastStore } from '../../store/toastStore';
import { useErrorAlert } from '../../hooks/useErrorAlert';
import { Skeleton } from '../../components/Skeleton';
import { PhoneInput } from '../../components/PhoneInput';
import type { HomeScreenProps } from '../../types/navigation';

type Props = HomeScreenProps<'CustomerForm'>;

type Gender = 'MALE' | 'FEMALE' | 'OTHER';

type FormState = {
  name: string;
  phone: string;
  email: string;
  gender: Gender | null;
  dateOfBirth: string;
  zaloId: string;
  facebookId: string;
  hairType: string;
  preferredServices: string;
  allergiesOrSensitivities: string;
  specialRequests: string;
  notes: string;
  idCardNumber: string;
  idCardIssuedDate: string;
  idCardIssuedPlace: string;
  permanentAddress: string;
};

const EMPTY_FORM: FormState = {
  name: '',
  phone: '',
  email: '',
  gender: null,
  dateOfBirth: '',
  zaloId: '',
  facebookId: '',
  hairType: '',
  preferredServices: '',
  allergiesOrSensitivities: '',
  specialRequests: '',
  notes: '',
  idCardNumber: '',
  idCardIssuedDate: '',
  idCardIssuedPlace: '',
  permanentAddress: '',
};

function SectionHeader({ icon, title }: { icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']; title: string }) {
  return (
    <View className="flex-row items-center mb-3 mt-1">
      <MaterialCommunityIcons name={icon} size={15} color="#6b7280" style={{ marginRight: 6 }} />
      <Text className="text-xs font-bold text-gray-500 uppercase tracking-wide">{title}</Text>
    </View>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="mb-4">
      <Text className="text-sm font-medium text-gray-700 mb-1.5">{label}</Text>
      {children}
    </View>
  );
}

function StyledInput({
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline,
  maxLength,
  onBlur,
  autoFocus,
  testID,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'decimal-pad';
  multiline?: boolean;
  maxLength?: number;
  onBlur?: () => void;
  autoFocus?: boolean;
  testID?: string;
}) {
  return (
    <TextInput
      testID={testID}
      className={`border border-gray-200 rounded-xl px-3 bg-white text-gray-900 ${multiline ? 'py-3 text-sm' : 'py-3 text-base'}`}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#9ca3af"
      keyboardType={keyboardType ?? 'default'}
      multiline={multiline}
      maxLength={maxLength}
      onBlur={onBlur}
      autoFocus={autoFocus}
      style={multiline ? { height: 80, textAlignVertical: 'top' } : undefined}
    />
  );
}

export function CustomerFormScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { top } = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { show: showAlert } = useAlertStore();
  const { show: showToast } = useToastStore();
  const showErrorAlert = useErrorAlert();
  const { customerId } = route.params;
  const isEdit = !!customerId;

  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const { isLoading: loadingCustomer } = useQuery({
    queryKey: ['customer', customerId],
    queryFn: () => customerApi.getById(customerId!).then((r) => r.data.data),
    enabled: isEdit,
    staleTime: 300_000,
  });

  useEffect(() => {
    if (!isEdit) return;
    customerApi.getById(customerId!).then((r) => {
      const c = r.data.data;
      setForm({
        name: c.name ?? '',
        phone: c.phone ?? '',
        email: c.email ?? '',
        gender: (c.gender as Gender | null) ?? null,
        dateOfBirth: c.dateOfBirth ?? c.birthday ?? '',
        zaloId: c.zaloId ?? '',
        facebookId: c.facebookId ?? '',
        hairType: c.hairType ?? '',
        preferredServices: c.preferredServices ?? '',
        allergiesOrSensitivities: c.allergiesOrSensitivities ?? '',
        specialRequests: c.specialRequests ?? '',
        notes: c.notes ?? c.note ?? '',
        idCardNumber: c.idCardNumber ?? '',
        idCardIssuedDate: c.idCardIssuedDate ?? '',
        idCardIssuedPlace: c.idCardIssuedPlace ?? '',
        permanentAddress: c.permanentAddress ?? '',
      });
    }).catch(() => {});
  }, [customerId, isEdit]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const createMutation = useMutation({
    mutationFn: (payload: CustomerFormPayload) => customerApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      showToast(t('customers.createSuccess'));
      navigation.goBack();
    },
    onError: showErrorAlert,
  });

  const updateMutation = useMutation({
    mutationFn: (payload: Partial<CustomerFormPayload>) => customerApi.update(customerId!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customer', customerId] });
      showToast(t('customers.updateSuccess'));
      navigation.goBack();
    },
    onError: showErrorAlert,
  });

  async function handlePhoneBlur() {
    const phone = form.phone.trim();
    if (phone.length < 10) return;
    try {
      const res = await customerApi.checkPhone(phone);
      const existing = res.data.data;
      if (existing && existing.id !== customerId) {
        showAlert(
          t('customers.phoneConflictTitle'),
          t('customers.phoneConflictMsg', { name: existing.name }),
          [
            { label: t('common.cancel'), style: 'cancel', onPress: () => set('phone', '') },
            { label: t('customers.phoneConflictContinue') },
          ],
        );
      }
    } catch {
      // Ignore check-phone errors
    }
  }

  function validate(): boolean {
    if (!form.name.trim()) {
      showAlert(t('common.error'), t('customers.nameRequired'), [{ label: t('common.close'), style: 'cancel' }]);
      return false;
    }
    if (!form.phone.trim()) {
      showAlert(t('common.error'), t('customers.phoneRequired'), [{ label: t('common.close'), style: 'cancel' }]);
      return false;
    }
    if (form.phone.replace(/\D/g, '').length < 10) {
      showAlert(t('common.error'), t('customers.phoneTooShort'), [{ label: t('common.close'), style: 'cancel' }]);
      return false;
    }
    return true;
  }

  function buildPayload(): CustomerFormPayload {
    return {
      name: form.name.trim(),
      phone: form.phone.trim(),
      ...(form.email.trim() && { email: form.email.trim() }),
      ...(form.gender && { gender: form.gender }),
      ...(form.dateOfBirth.trim() && { dateOfBirth: form.dateOfBirth.trim() }),
      ...(form.zaloId.trim() && { zaloId: form.zaloId.trim() }),
      ...(form.facebookId.trim() && { facebookId: form.facebookId.trim() }),
      ...(form.hairType.trim() && { hairType: form.hairType.trim() }),
      ...(form.preferredServices.trim() && { preferredServices: form.preferredServices.trim() }),
      ...(form.allergiesOrSensitivities.trim() && { allergiesOrSensitivities: form.allergiesOrSensitivities.trim() }),
      ...(form.specialRequests.trim() && { specialRequests: form.specialRequests.trim() }),
      ...(form.notes.trim() && { notes: form.notes.trim() }),
      ...(form.idCardNumber.trim() && { idCardNumber: form.idCardNumber.trim() }),
      ...(form.idCardIssuedDate.trim() && { idCardIssuedDate: form.idCardIssuedDate.trim() }),
      ...(form.idCardIssuedPlace.trim() && { idCardIssuedPlace: form.idCardIssuedPlace.trim() }),
      ...(form.permanentAddress.trim() && { permanentAddress: form.permanentAddress.trim() }),
    };
  }

  function handleSubmit() {
    if (!validate()) return;
    const payload = buildPayload();
    if (isEdit) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  if (isEdit && loadingCustomer) {
    return (
      <View className="flex-1 bg-gray-50">
        <View className="bg-primary px-6 pb-5" style={{ paddingTop: top + 16 }}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="white" />
          </TouchableOpacity>
        </View>
        <View className="px-4 pt-4" style={{ gap: 12 }}>
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} height={52} borderRadius={12} />)}
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-gray-50"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View className="bg-primary px-6 pb-5" style={{ paddingTop: top + 16 }}>
        <View className="flex-row items-center justify-between">
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="white" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-white">
            {isEdit ? t('customers.editCustomer') : t('customers.addCustomer')}
          </Text>
          <View style={{ width: 24 }} />
        </View>
        <Text className="text-xs text-indigo-200 mt-1">{t('customers.formHint')}</Text>
      </View>

      <ScrollView
        className="flex-1 px-4 pt-4"
        contentContainerStyle={{ paddingBottom: 16 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Section 1 – Basic Info */}
        <View className="bg-white rounded-2xl p-4 mb-4 border border-gray-100">
          <SectionHeader icon="account-outline" title={t('customers.sectionBasic')} />

          <FormField label={`${t('customers.name')} *`}>
            <StyledInput
              testID="customer-name"
              value={form.name}
              onChangeText={(v) => set('name', v)}
              placeholder={t('customers.namePlaceholder')}
              autoFocus={!isEdit}
            />
          </FormField>

          <FormField label={`${t('customers.phone')} *`}>
            <PhoneInput
              testID="customer-phone"
              value={form.phone}
              onChangeRaw={(v) => set('phone', v)}
              placeholder={t('customers.phonePlaceholder')}
              onBlur={handlePhoneBlur}
            />
          </FormField>

          <FormField label={t('customers.email')}>
            <StyledInput
              value={form.email}
              onChangeText={(v) => set('email', v)}
              placeholder={t('customers.emailPlaceholder')}
              keyboardType="email-address"
            />
          </FormField>

          <FormField label={t('customers.gender')}>
            <View className="flex-row" style={{ gap: 8 }}>
              {(['MALE', 'FEMALE', 'OTHER'] as Gender[]).map((g) => {
                const label = g === 'MALE' ? t('customers.genderMale') : g === 'FEMALE' ? t('customers.genderFemale') : t('customers.genderOther');
                const selected = form.gender === g;
                return (
                  <TouchableOpacity
                    key={g}
                    onPress={() => set('gender', selected ? null : g)}
                    activeOpacity={0.75}
                    className={`flex-1 py-2.5 rounded-xl items-center border ${selected ? 'bg-primary border-primary' : 'bg-gray-50 border-gray-200'}`}
                  >
                    <Text className={`text-sm font-semibold ${selected ? 'text-white' : 'text-gray-600'}`}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </FormField>

          <FormField label={t('customers.dateOfBirth')}>
            <StyledInput
              value={form.dateOfBirth}
              onChangeText={(v) => set('dateOfBirth', v)}
              placeholder={t('customers.dateOfBirthPlaceholder')}
            />
          </FormField>
        </View>

        {/* Section 2 – Social Contact */}
        <View className="bg-white rounded-2xl p-4 mb-4 border border-gray-100">
          <SectionHeader icon="message-outline" title={t('customers.sectionSocial')} />

          <FormField label={t('customers.zaloId')}>
            <StyledInput
              value={form.zaloId}
              onChangeText={(v) => set('zaloId', v)}
              placeholder={t('customers.zaloPlaceholder')}
              keyboardType="phone-pad"
            />
          </FormField>

          <FormField label={t('customers.facebookId')}>
            <StyledInput
              value={form.facebookId}
              onChangeText={(v) => set('facebookId', v)}
              placeholder={t('customers.facebookPlaceholder')}
            />
          </FormField>
        </View>

        {/* Section 3 – Preferences & Notes */}
        <View className="bg-white rounded-2xl p-4 mb-4 border border-gray-100">
          <SectionHeader icon="heart-outline" title={t('customers.sectionPrefs')} />

          <FormField label={t('customers.hairType')}>
            <StyledInput
              value={form.hairType}
              onChangeText={(v) => set('hairType', v)}
              placeholder={t('customers.hairTypePlaceholder')}
            />
          </FormField>

          <FormField label={t('customers.preferredServices')}>
            <StyledInput
              value={form.preferredServices}
              onChangeText={(v) => set('preferredServices', v)}
              placeholder={t('customers.preferredServicesPlaceholder')}
              multiline
              maxLength={500}
            />
            <Text className="text-xs text-gray-400 text-right mt-1">
              {form.preferredServices.length}/500
            </Text>
          </FormField>

          <FormField label={t('customers.allergies')}>
            <StyledInput
              value={form.allergiesOrSensitivities}
              onChangeText={(v) => set('allergiesOrSensitivities', v)}
              placeholder={t('customers.allergiesPlaceholder')}
              multiline
            />
          </FormField>

          <FormField label={t('customers.specialRequests')}>
            <StyledInput
              value={form.specialRequests}
              onChangeText={(v) => set('specialRequests', v)}
              placeholder={t('customers.specialRequestsPlaceholder')}
              multiline
            />
          </FormField>

          <FormField label={t('customers.notes')}>
            <StyledInput
              value={form.notes}
              onChangeText={(v) => set('notes', v)}
              placeholder={t('customers.notesPlaceholder')}
              multiline
            />
          </FormField>
        </View>

        {/* Section 4 – ID Document */}
        <View className="bg-white rounded-2xl p-4 mb-6 border border-gray-100">
          <SectionHeader icon="card-account-details-outline" title={t('customers.sectionId')} />

          <FormField label={t('customers.idCardNumber')}>
            <StyledInput
              value={form.idCardNumber}
              onChangeText={(v) => set('idCardNumber', v)}
              placeholder={t('customers.idCardNumberPlaceholder')}
              keyboardType="decimal-pad"
            />
          </FormField>

          <FormField label={t('customers.idCardIssuedDate')}>
            <StyledInput
              value={form.idCardIssuedDate}
              onChangeText={(v) => set('idCardIssuedDate', v)}
              placeholder={t('customers.idCardIssuedDatePlaceholder')}
            />
          </FormField>

          <FormField label={t('customers.idCardIssuedPlace')}>
            <StyledInput
              value={form.idCardIssuedPlace}
              onChangeText={(v) => set('idCardIssuedPlace', v)}
              placeholder={t('customers.idCardIssuedPlaceholder')}
            />
          </FormField>

          <FormField label={t('customers.permanentAddress')}>
            <StyledInput
              value={form.permanentAddress}
              onChangeText={(v) => set('permanentAddress', v)}
              placeholder={t('customers.permanentAddressPlaceholder')}
              multiline
            />
          </FormField>
        </View>

      </ScrollView>

      {/* Fixed footer — always above keyboard thanks to KeyboardAvoidingView */}
      <View className="px-4 pb-6 pt-3 bg-gray-50">
        <TouchableOpacity
          testID="customer-form-submit"
          onPress={handleSubmit}
          disabled={isPending}
          activeOpacity={0.8}
          className={`rounded-2xl py-4 items-center ${isPending ? 'bg-gray-300' : 'bg-primary'}`}
        >
          {isPending ? (
            <View className="flex-row items-center">
              <ActivityIndicator color="#fff" style={{ marginRight: 8 }} />
              <Text className="text-white font-bold text-base">{t('customers.saving')}</Text>
            </View>
          ) : (
            <Text className="text-white font-bold text-base">
              {isEdit ? t('common.save') : t('customers.addCustomer')}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
