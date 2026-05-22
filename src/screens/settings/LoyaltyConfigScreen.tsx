import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAlertStore } from '../../store/alertStore';
import { useErrorAlert } from '../../hooks/useErrorAlert';
import { useToastStore } from '../../store/toastStore';
import {
  loyaltyApi,
  type LoyaltyProgramDTO,
  type LoyaltyTierDTO,
  type SaveLoyaltyProgramRequest,
  type SaveLoyaltyTierRequest,
} from '../../services/api';
import { formatVnd } from '../../utils/format';
import { useTypography } from '../../hooks/useTypography';
import type { SettingsScreenProps } from '../../types/navigation';

const TIER_COLORS = ['#4f46e5', '#0891b2', '#059669', '#d97706', '#dc2626', '#9333ea', '#db2777'];

type ProgramForm = {
  pointsPerAmount: string;
  amountPerPoints: string;
  redemptionPointsPerDiscount: string;
  redemptionDiscountAmount: string;
  minRedemptionPoints: string;
  isActive: boolean;
};

type TierForm = {
  name: string;
  minSpend: string;
  pointsMultiplier: string;
  color: string;
  description: string;
  sortOrder: string;
};

const EMPTY_TIER_FORM: TierForm = {
  name: '',
  minSpend: '',
  pointsMultiplier: '1',
  color: TIER_COLORS[0],
  description: '',
  sortOrder: '0',
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

function tierToForm(tier: LoyaltyTierDTO): TierForm {
  return {
    name: tier.name,
    minSpend: String(tier.minSpend),
    pointsMultiplier: String(tier.pointsMultiplier),
    color: tier.color,
    description: tier.description ?? '',
    sortOrder: String(tier.sortOrder),
  };
}

export function LoyaltyConfigScreen({ navigation }: SettingsScreenProps<'LoyaltyConfig'>) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const typo = useTypography();
  const qc = useQueryClient();
  const { show: showAlert } = useAlertStore();
  const { show: showToast } = useToastStore();
  const showErrorAlert = useErrorAlert();

  const [programForm, setProgramForm] = useState<ProgramForm | null>(null);
  const [tierModal, setTierModal] = useState(false);
  const [editingTier, setEditingTier] = useState<LoyaltyTierDTO | null>(null);
  const [tierForm, setTierForm] = useState<TierForm>(EMPTY_TIER_FORM);

  const { data: program, isLoading: programLoading } = useQuery({
    queryKey: ['loyalty-program'],
    queryFn: () => loyaltyApi.getProgram().then((r) => r.data.data),
    staleTime: 5 * 60_000,
    select: (data) => {
      if (!programForm) setProgramForm(programToForm(data));
      return data;
    },
  });

  const { data: tiers = [], isLoading: tiersLoading } = useQuery({
    queryKey: ['loyalty-tiers'],
    queryFn: () => loyaltyApi.getTiers().then((r) => r.data.data),
    staleTime: 5 * 60_000,
  });

  const saveProgramMutation = useMutation({
    mutationFn: (data: SaveLoyaltyProgramRequest) => loyaltyApi.saveProgram(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['loyalty-program'] });
      showToast(t('loyaltyConfig.saveSuccess'));
    },
    onError: showErrorAlert,
  });

  const createTierMutation = useMutation({
    mutationFn: (data: SaveLoyaltyTierRequest) => loyaltyApi.createTier(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['loyalty-tiers'] });
      showToast(t('loyaltyConfig.tier.saveSuccess'));
      setTierModal(false);
    },
    onError: showErrorAlert,
  });

  const updateTierMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: SaveLoyaltyTierRequest }) =>
      loyaltyApi.updateTier(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['loyalty-tiers'] });
      showToast(t('loyaltyConfig.tier.saveSuccess'));
      setTierModal(false);
    },
    onError: showErrorAlert,
  });

  const deleteTierMutation = useMutation({
    mutationFn: (id: number) => loyaltyApi.deleteTier(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['loyalty-tiers'] });
      showToast(t('loyaltyConfig.tier.deleteSuccess'));
    },
    onError: showErrorAlert,
  });

  const setP = (key: keyof ProgramForm, value: string | boolean) => {
    setProgramForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const handleSaveProgram = () => {
    if (!programForm) return;
    const data: SaveLoyaltyProgramRequest = {
      pointsPerAmount: Number(programForm.pointsPerAmount) || 0,
      amountPerPoints: Number(programForm.amountPerPoints) || 0,
      redemptionPointsPerDiscount: Number(programForm.redemptionPointsPerDiscount) || 0,
      redemptionDiscountAmount: Number(programForm.redemptionDiscountAmount) || 0,
      minRedemptionPoints: Number(programForm.minRedemptionPoints) || 0,
      isActive: programForm.isActive,
    };
    saveProgramMutation.mutate(data);
  };

  const openAddTier = () => {
    setEditingTier(null);
    setTierForm({ ...EMPTY_TIER_FORM, sortOrder: String(tiers.length) });
    setTierModal(true);
  };

  const openEditTier = (tier: LoyaltyTierDTO) => {
    setEditingTier(tier);
    setTierForm(tierToForm(tier));
    setTierModal(true);
  };

  const handleDeleteTier = (tier: LoyaltyTierDTO) => {
    showAlert(t('loyaltyConfig.tier.deleteTitle'), t('loyaltyConfig.tier.deleteMsg', { name: tier.name }), [
      { label: t('common.cancel'), style: 'cancel' },
      {
        label: t('common.delete'),
        style: 'destructive',
        onPress: () => deleteTierMutation.mutate(tier.id),
      },
    ]);
  };

  const handleSaveTier = () => {
    const data: SaveLoyaltyTierRequest = {
      name: tierForm.name.trim(),
      minSpend: Number(tierForm.minSpend) || 0,
      pointsMultiplier: Number(tierForm.pointsMultiplier) || 1,
      color: tierForm.color,
      description: tierForm.description.trim() || undefined,
      sortOrder: Number(tierForm.sortOrder) || 0,
    };
    if (!data.name) return;
    if (editingTier) {
      updateTierMutation.mutate({ id: editingTier.id, data });
    } else {
      createTierMutation.mutate(data);
    }
  };

  const setT = (key: keyof TierForm, value: string) =>
    setTierForm((prev) => ({ ...prev, [key]: value }));

  const isSaving = saveProgramMutation.isPending;
  const isTierSaving = createTierMutation.isPending || updateTierMutation.isPending;

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row items-center px-4 pt-4 pb-3 bg-gray-50 dark:bg-gray-900">
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialCommunityIcons name="chevron-left" size={26} color="#4f46e5" />
        </TouchableOpacity>
        <Text className={`${typo.labelBold} text-gray-900 dark:text-white ml-3 flex-1`}>
          {t('loyaltyConfig.title')}
        </Text>
        <TouchableOpacity onPress={handleSaveProgram} disabled={isSaving} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          {isSaving ? <ActivityIndicator size="small" color="#4f46e5" /> : (
            <Text className={`${typo.labelBold} text-indigo-600 dark:text-indigo-400`}>
              {t('common.save')}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {programLoading || tiersLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#4f46e5" />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 32 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Program settings */}
          <SectionLabel label={t('loyaltyConfig.programSection')} />
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
                value={programForm?.isActive ?? false}
                onValueChange={(v) => setP('isActive', v)}
                trackColor={{ true: '#4f46e5' }}
              />
            </View>

            <Divider />

            <FieldRow
              label={t('loyaltyConfig.pointsPerAmount')}
              hint={t('loyaltyConfig.pointsPerAmountHint')}
              value={programForm?.pointsPerAmount ?? ''}
              onChangeText={(v) => setP('pointsPerAmount', v)}
              keyboardType="numeric"
            />
            <FieldRow
              label={t('loyaltyConfig.amountPerPoints')}
              hint={t('loyaltyConfig.amountPerPointsHint')}
              value={programForm?.amountPerPoints ?? ''}
              onChangeText={(v) => setP('amountPerPoints', v)}
              keyboardType="numeric"
            />
            <FieldRow
              label={t('loyaltyConfig.redemptionPointsPerDiscount')}
              hint={t('loyaltyConfig.redemptionPointsPerDiscountHint')}
              value={programForm?.redemptionPointsPerDiscount ?? ''}
              onChangeText={(v) => setP('redemptionPointsPerDiscount', v)}
              keyboardType="numeric"
            />
            <FieldRow
              label={t('loyaltyConfig.redemptionDiscountAmount')}
              hint={t('loyaltyConfig.redemptionDiscountAmountHint')}
              value={programForm?.redemptionDiscountAmount ?? ''}
              onChangeText={(v) => setP('redemptionDiscountAmount', v)}
              keyboardType="numeric"
            />
            <FieldRow
              label={t('loyaltyConfig.minRedemptionPoints')}
              hint={t('loyaltyConfig.minRedemptionPointsHint')}
              value={programForm?.minRedemptionPoints ?? ''}
              onChangeText={(v) => setP('minRedemptionPoints', v)}
              keyboardType="numeric"
            />

          </View>

          {/* Tiers */}
          <View className="flex-row items-center justify-between mt-6 mb-2 px-1">
            <Text className={`${typo.captionBold} text-gray-400 dark:text-gray-500 uppercase tracking-wide`}>
              {t('loyaltyConfig.tiersSection')}
            </Text>
            <TouchableOpacity
              onPress={openAddTier}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              className="flex-row items-center gap-1"
            >
              <MaterialCommunityIcons name="plus" size={16} color="#4f46e5" />
              <Text className={`${typo.captionBold} text-indigo-600 dark:text-indigo-400`}>
                {t('loyaltyConfig.tier.add')}
              </Text>
            </TouchableOpacity>
          </View>

          {tiers.length === 0 ? (
            <View className="bg-white dark:bg-gray-800 rounded-2xl p-6 items-center border border-gray-100 dark:border-gray-700">
              <MaterialCommunityIcons name="trophy-outline" size={36} color="#d1d5db" />
              <Text className={`${typo.caption} text-gray-400 dark:text-gray-500 mt-2 text-center`}>
                {t('loyaltyConfig.tier.empty')}
              </Text>
            </View>
          ) : (
            <View className="gap-3">
              {[...tiers].sort((a, b) => a.sortOrder - b.sortOrder).map((tier) => (
                <TierCard
                  key={tier.id}
                  tier={tier}
                  onEdit={() => openEditTier(tier)}
                  onDelete={() => handleDeleteTier(tier)}
                />
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {/* Tier modal */}
      <Modal visible={tierModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setTierModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 bg-gray-50 dark:bg-gray-900">
          <View className="flex-row items-center px-4 pt-5 pb-3 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
            <TouchableOpacity onPress={() => setTierModal(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialCommunityIcons name="close" size={22} color="#6b7280" />
            </TouchableOpacity>
            <Text className={`${typo.labelBold} text-gray-900 dark:text-white ml-3 flex-1`}>
              {editingTier ? t('loyaltyConfig.tier.editTitle') : t('loyaltyConfig.tier.addTitle')}
            </Text>
            <TouchableOpacity onPress={handleSaveTier} disabled={isTierSaving || !tierForm.name.trim()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              {isTierSaving ? <ActivityIndicator size="small" color="#4f46e5" /> : (
                <Text className={`${typo.labelBold} ${!tierForm.name.trim() ? 'text-gray-300 dark:text-gray-600' : 'text-indigo-600 dark:text-indigo-400'}`}>
                  {t('common.save')}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={{ padding: 16, gap: 16 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 gap-4">
              <FieldRow
                label={t('loyaltyConfig.tier.name')}
                value={tierForm.name}
                onChangeText={(v) => setT('name', v)}
                placeholder={t('loyaltyConfig.tier.namePlaceholder')}
              />
              <FieldRow
                label={t('loyaltyConfig.tier.minSpend')}
                hint={t('loyaltyConfig.tier.minSpendHint')}
                value={tierForm.minSpend}
                onChangeText={(v) => setT('minSpend', v)}
                keyboardType="numeric"
              />
              <FieldRow
                label={t('loyaltyConfig.tier.pointsMultiplier')}
                hint={t('loyaltyConfig.tier.pointsMultiplierHint')}
                value={tierForm.pointsMultiplier}
                onChangeText={(v) => setT('pointsMultiplier', v)}
                keyboardType="numeric"
              />
              <FieldRow
                label={t('loyaltyConfig.tier.sortOrder')}
                hint={t('loyaltyConfig.tier.sortOrderHint')}
                value={tierForm.sortOrder}
                onChangeText={(v) => setT('sortOrder', v)}
                keyboardType="numeric"
              />
              <FieldRow
                label={t('loyaltyConfig.tier.description')}
                value={tierForm.description}
                onChangeText={(v) => setT('description', v)}
                placeholder={t('loyaltyConfig.tier.descriptionPlaceholder')}
              />

              {/* Color picker */}
              <View>
                <Text className={`${typo.captionBold} text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide`}>
                  {t('loyaltyConfig.tier.color')}
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {TIER_COLORS.map((c) => (
                    <TouchableOpacity
                      key={c}
                      onPress={() => setT('color', c)}
                      activeOpacity={0.8}
                      className="w-9 h-9 rounded-full items-center justify-center"
                      style={{ backgroundColor: c }}
                    >
                      {tierForm.color === c && (
                        <MaterialCommunityIcons name="check" size={18} color="#fff" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  const typo = useTypography();
  return (
    <Text className={`${typo.captionBold} text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2 mt-4 px-1`}>
      {label}
    </Text>
  );
}

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

function TierCard({
  tier,
  onEdit,
  onDelete,
}: {
  tier: LoyaltyTierDTO;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const typo = useTypography();
  return (
    <View className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
      <View className="h-1" style={{ backgroundColor: tier.color }} />
      <View className="p-4 flex-row items-start">
        <View className="w-9 h-9 rounded-full items-center justify-center flex-shrink-0 mr-3" style={{ backgroundColor: tier.color + '20' }}>
          <MaterialCommunityIcons name="trophy" size={18} color={tier.color} />
        </View>
        <View className="flex-1">
          <Text className={`${typo.labelBold} text-gray-900 dark:text-white`}>{tier.name}</Text>
          {tier.description ? (
            <Text className={`${typo.caption} text-gray-400 dark:text-gray-500 mt-0.5`}>{tier.description}</Text>
          ) : null}
          <View className="flex-row flex-wrap gap-x-4 gap-y-1 mt-2">
            <StatChip label="Min. spend" value={formatVnd(tier.minSpend)} />
            <StatChip label="Multiplier" value={`×${tier.pointsMultiplier}`} />
          </View>
        </View>
        <View className="flex-row gap-2 ml-2">
          <TouchableOpacity onPress={onEdit} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialCommunityIcons name="pencil-outline" size={18} color="#4f46e5" />
          </TouchableOpacity>
          <TouchableOpacity onPress={onDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialCommunityIcons name="trash-can-outline" size={18} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function StatChip({ label, value }: { label: string; value: string }) {
  const typo = useTypography();
  return (
    <View>
      <Text className={`${typo.caption} text-gray-400 dark:text-gray-500`}>{label}</Text>
      <Text className={`${typo.captionBold} text-gray-700 dark:text-gray-300`}>{value}</Text>
    </View>
  );
}
