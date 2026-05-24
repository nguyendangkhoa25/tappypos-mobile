import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useErrorAlert } from '../../hooks/useErrorAlert';
import { useToastStore } from '../../store/toastStore';
import {
  loyaltyApi,
  type LoyaltyProgramDTO,
  type SaveLoyaltyProgramRequest,
} from '../../services/api';
import { useTypography } from '../../hooks/useTypography';
import type { SettingsScreenProps } from '../../types/navigation';

type Props = SettingsScreenProps<'LoyaltyProgramEdit'>;

type ProgramForm = {
  pointsPerAmount: string;
  amountPerPoints: string;
  redemptionPointsPerDiscount: string;
  redemptionDiscountAmount: string;
  minRedemptionPoints: string;
  isActive: boolean;
};

function programToForm(p: LoyaltyProgramDTO): ProgramForm {
  return {
    pointsPerAmount: String(p.pointsPerAmount),
    amountPerPoints: String(p.amountPerPoints),
    redemptionPointsPerDiscount: String(p.redemptionPointsPerDiscount),
    redemptionDiscountAmount: String(p.redemptionDiscountAmount),
    minRedemptionPoints: String(p.minRedemptionPoints),
    isActive: p.isActive,
  };
}

export function LoyaltyProgramEditScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const typo = useTypography();
  const qc = useQueryClient();
  const { show: showToast } = useToastStore();
  const showErrorAlert = useErrorAlert();

  const [form, setForm] = useState<ProgramForm | null>(null);

  useQuery({
    queryKey: ['loyalty-program'],
    queryFn: () => loyaltyApi.getProgram().then((r) => r.data.data ?? null),
    staleTime: 5 * 60_000,
    select: (data) => {
      if (data && !form) setForm(programToForm(data));
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: (data: SaveLoyaltyProgramRequest) => loyaltyApi.saveProgram(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['loyalty-program'] });
      showToast(t('loyaltyConfig.saveSuccess'));
      navigation.goBack();
    },
    onError: showErrorAlert,
  });

  const setF = (key: keyof ProgramForm, value: string | boolean) =>
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));

  const handleSave = () => {
    if (!form) return;
    const data: SaveLoyaltyProgramRequest = {
      pointsPerAmount: Number(form.pointsPerAmount) || 0,
      amountPerPoints: Number(form.amountPerPoints) || 0,
      redemptionPointsPerDiscount: Number(form.redemptionPointsPerDiscount) || 0,
      redemptionDiscountAmount: Number(form.redemptionDiscountAmount) || 0,
      minRedemptionPoints: Number(form.minRedemptionPoints) || 0,
      isActive: form.isActive,
    };
    saveMutation.mutate(data);
  };

  const isSaving = saveMutation.isPending;

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-gray-50 dark:bg-gray-900"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ paddingTop: insets.top }}
    >
      {/* Header */}
      <View className="px-4 pt-4 pb-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            className="mr-3"
          >
            <MaterialCommunityIcons name="chevron-left" size={26} color="#4f46e5" />
          </TouchableOpacity>
          <Text className={`${typo.section} text-gray-900 dark:text-white flex-1`}>
            {t('loyaltyConfig.editTitle')}
          </Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={isSaving || !form}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            className="ml-2"
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#4f46e5" />
            ) : (
              <Text className={`${typo.labelBold} text-indigo-600 dark:text-indigo-400`}>
                {t('common.save')}
              </Text>
            )}
          </TouchableOpacity>
        </View>
        <Text className={`${typo.caption} text-gray-400 dark:text-gray-500 mt-1`}>
          {t('loyaltyConfig.editHint')}
        </Text>
      </View>

      {!form ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#4f46e5" />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            padding: 4,
            paddingBottom: insets.bottom + 32,
            gap: 16,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 gap-4">
            {/* Active toggle */}
            <View className="flex-row items-center justify-between">
              <View className="flex-1 mr-4">
                <Text className={`${typo.label} text-gray-800 dark:text-white`}>
                  {t('loyaltyConfig.isActive')}
                </Text>
                <Text className={`${typo.caption} text-gray-400 dark:text-gray-500 mt-0.5`}>
                  {t('loyaltyConfig.isActiveHint')}
                </Text>
              </View>
              <Switch
                value={form.isActive}
                onValueChange={(v) => setF('isActive', v)}
                trackColor={{ true: '#4f46e5' }}
              />
            </View>

            <Divider />

            <FieldRow
              label={t('loyaltyConfig.pointsPerAmount')}
              hint={t('loyaltyConfig.pointsPerAmountHint')}
              value={form.pointsPerAmount}
              onChangeText={(v) => setF('pointsPerAmount', v)}
              keyboardType="numeric"
            />
            <FieldRow
              label={t('loyaltyConfig.amountPerPoints')}
              hint={t('loyaltyConfig.amountPerPointsHint')}
              value={form.amountPerPoints}
              onChangeText={(v) => setF('amountPerPoints', v)}
              keyboardType="numeric"
            />
            <FieldRow
              label={t('loyaltyConfig.redemptionPointsPerDiscount')}
              hint={t('loyaltyConfig.redemptionPointsPerDiscountHint')}
              value={form.redemptionPointsPerDiscount}
              onChangeText={(v) => setF('redemptionPointsPerDiscount', v)}
              keyboardType="numeric"
            />
            <FieldRow
              label={t('loyaltyConfig.redemptionDiscountAmount')}
              hint={t('loyaltyConfig.redemptionDiscountAmountHint')}
              value={form.redemptionDiscountAmount}
              onChangeText={(v) => setF('redemptionDiscountAmount', v)}
              keyboardType="numeric"
            />
            <FieldRow
              label={t('loyaltyConfig.minRedemptionPoints')}
              hint={t('loyaltyConfig.minRedemptionPointsHint')}
              value={form.minRedemptionPoints}
              onChangeText={(v) => setF('minRedemptionPoints', v)}
              keyboardType="numeric"
            />
          </View>
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function Divider() {
  return <View className="h-px bg-gray-100 dark:bg-gray-700" />;
}

type FieldRowProps = {
  label: string;
  hint?: string;
  value: string;
  onChangeText: (v: string) => void;
  keyboardType?: 'default' | 'numeric';
  placeholder?: string;
};

function FieldRow({ label, hint, value, onChangeText, keyboardType = 'default', placeholder }: FieldRowProps) {
  const typo = useTypography();
  return (
    <View>
      <Text className={`${typo.captionBold} text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide`}>
        {label}
      </Text>
      {hint && (
        <Text className={`${typo.caption} text-gray-400 dark:text-gray-500 mb-1.5`}>{hint}</Text>
      )}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholder={placeholder}
        placeholderTextColor="#9ca3af"
        className={`border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 ${typo.inputSize} text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700`}
      />
    </View>
  );
}
