import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useAlertStore } from '../../store/alertStore';
import { useErrorAlert } from '../../hooks/useErrorAlert';
import { useToastStore } from '../../store/toastStore';
import {
  loyaltyApi,
  type LoyaltyProgramDTO,
  type LoyaltyTierDTO,
  type SaveLoyaltyTierRequest,
} from '../../services/api';
import { formatVnd } from '../../utils/format';
import { useTypography } from '../../hooks/useTypography';
import { Skeleton } from '../../components/Skeleton';
import type { SettingsScreenProps } from '../../types/navigation';

type Props = SettingsScreenProps<'LoyaltyConfig'>;

const TIER_COLORS = ['#4f46e5', '#0891b2', '#059669', '#d97706', '#dc2626', '#9333ea', '#db2777'];
const EXAMPLE_SPEND = 1_000_000;

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

export function LoyaltyConfigScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const typo = useTypography();
  const qc = useQueryClient();
  const { show: showAlert } = useAlertStore();
  const { show: showToast } = useToastStore();
  const showErrorAlert = useErrorAlert();

  const [tierModal, setTierModal] = useState(false);
  const [editingTier, setEditingTier] = useState<LoyaltyTierDTO | null>(null);
  const [tierForm, setTierForm] = useState<TierForm>(EMPTY_TIER_FORM);

  const { data: program, isLoading: programLoading } = useQuery({
    queryKey: ['loyalty-program'],
    queryFn: () => loyaltyApi.getProgram().then((r) => r.data.data ?? null),
    staleTime: 5 * 60_000,
  });

  const { data: tiers = [], isLoading: tiersLoading } = useQuery({
    queryKey: ['loyalty-tiers'],
    queryFn: () => loyaltyApi.getTiers().then((r) => r.data.data),
    staleTime: 5 * 60_000,
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
    showAlert(
      t('loyaltyConfig.tier.deleteTitle'),
      t('loyaltyConfig.tier.deleteMsg', { name: tier.name }),
      [
        { label: t('common.cancel'), style: 'cancel' },
        {
          label: t('common.delete'),
          style: 'destructive',
          onPress: () => deleteTierMutation.mutate(tier.id),
        },
      ],
    );
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

  const isTierSaving = createTierMutation.isPending || updateTierMutation.isPending;
  const isLoading = programLoading || tiersLoading;

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900" style={{ paddingTop: insets.top }}>
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
            {t('loyaltyConfig.title')}
          </Text>
          {/* Edit icon */}
          <TouchableOpacity
            onPress={() => navigation.navigate('LoyaltyProgramEdit')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            className="ml-2"
          >
            <MaterialCommunityIcons name="pencil-outline" size={22} color="#4f46e5" />
          </TouchableOpacity>
        </View>
        <Text className={`${typo.caption} text-gray-400 dark:text-gray-500 mt-1`}>
          {t('loyaltyConfig.detailHint')}
        </Text>
      </View>

      {isLoading ? (
        <View className="p-4" style={{ gap: 12 }}>
          <Skeleton width="100%" height={160} borderRadius={16} />
          <Skeleton width="100%" height={80} borderRadius={16} />
          <Skeleton width="100%" height={80} borderRadius={16} />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            padding: 4,
            paddingBottom: insets.bottom + 32,
          }}
        >
          {/* Program preview card */}
          {program && <PreviewCard program={program} />}

          {/* Tiers */}
          <View className="flex-row items-center justify-between mt-4 mb-3">
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
            <View style={{ gap: 10 }}>
              {[...tiers]
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((tier) => (
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

      {/* Tier add/edit modal */}
      <Modal
        visible={tierModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setTierModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1 bg-gray-50 dark:bg-gray-900"
        >
          <View className="flex-row items-center px-4 pt-5 pb-3 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
            <TouchableOpacity
              onPress={() => setTierModal(false)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialCommunityIcons name="close" size={22} color="#6b7280" />
            </TouchableOpacity>
            <Text className={`${typo.labelBold} text-gray-900 dark:text-white ml-3 flex-1`}>
              {editingTier ? t('loyaltyConfig.tier.editTitle') : t('loyaltyConfig.tier.addTitle')}
            </Text>
            <TouchableOpacity
              onPress={handleSaveTier}
              disabled={isTierSaving || !tierForm.name.trim()}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              {isTierSaving ? (
                <ActivityIndicator size="small" color="#4f46e5" />
              ) : (
                <Text
                  className={`${typo.labelBold} ${
                    !tierForm.name.trim()
                      ? 'text-gray-300 dark:text-gray-600'
                      : 'text-indigo-600 dark:text-indigo-400'
                  }`}
                >
                  {t('common.save')}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={{ padding: 4, gap: 16 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 gap-4">
              <TierFieldRow
                label={t('loyaltyConfig.tier.name')}
                value={tierForm.name}
                onChangeText={(v) => setT('name', v)}
                placeholder={t('loyaltyConfig.tier.namePlaceholder')}
              />
              <TierFieldRow
                label={t('loyaltyConfig.tier.minSpend')}
                hint={t('loyaltyConfig.tier.minSpendHint')}
                value={tierForm.minSpend}
                onChangeText={(v) => setT('minSpend', v)}
                keyboardType="numeric"
              />
              <TierFieldRow
                label={t('loyaltyConfig.tier.pointsMultiplier')}
                hint={t('loyaltyConfig.tier.pointsMultiplierHint')}
                value={tierForm.pointsMultiplier}
                onChangeText={(v) => setT('pointsMultiplier', v)}
                keyboardType="numeric"
              />
              <TierFieldRow
                label={t('loyaltyConfig.tier.sortOrder')}
                hint={t('loyaltyConfig.tier.sortOrderHint')}
                value={tierForm.sortOrder}
                onChangeText={(v) => setT('sortOrder', v)}
                keyboardType="numeric"
              />
              <TierFieldRow
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

// ── Preview Card ──────────────────────────────────────────────────────────────

function PreviewCard({ program }: { program: LoyaltyProgramDTO }) {
  const { t } = useTranslation();
  const typo = useTypography();

  const ppa  = Math.max(1, program.pointsPerAmount  || 1);
  const rppd = Math.max(1, program.redemptionPointsPerDiscount || 1);
  const rda  = program.redemptionDiscountAmount || 0;
  const mrp  = program.minRedemptionPoints || 0;

  const examplePoints   = Math.floor(EXAMPLE_SPEND / ppa);
  const exampleDiscount = Math.floor(examplePoints / rppd) * rda;
  const canRedeem       = mrp === 0 || examplePoints >= mrp;

  const rules = [
    {
      icon: 'star-plus-outline'    as const,
      color: '#059669',
      bg: '#05966912',
      label: t('loyaltyConfig.preview.earnRule'),
      value: `${formatVnd(ppa)} = 1đ`,
    },
    {
      icon: 'gift-open-outline'    as const,
      color: '#7c3aed',
      bg: '#7c3aed12',
      label: t('loyaltyConfig.preview.redeemRule'),
      value: `${rppd}đ = ${formatVnd(rda)}`,
    },
    {
      icon: 'shield-check-outline' as const,
      color: '#0891b2',
      bg: '#0891b212',
      label: t('loyaltyConfig.preview.minRule'),
      value: mrp > 0 ? `≥ ${mrp}đ` : t('loyaltyConfig.preview.noMin'),
    },
  ];

  return (
    <View className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
      {/* Header row */}
      <View className="flex-row items-center justify-between px-4 pt-3.5 pb-3 border-b border-gray-50 dark:border-gray-700">
        <View className="flex-row items-center">
          <MaterialCommunityIcons name="star-circle-outline" size={15} color="#6b7280" style={{ marginRight: 5 }} />
          <Text className={`${typo.captionBold} text-gray-500 dark:text-gray-400 uppercase tracking-wide`}>
            {t('loyaltyConfig.programSection')}
          </Text>
        </View>
        {/* Active / Inactive badge */}
        <View
          className={`flex-row items-center rounded-full px-2.5 py-0.5 ${
            program.isActive
              ? 'bg-emerald-50 dark:bg-emerald-900/30'
              : 'bg-gray-100 dark:bg-gray-700'
          }`}
        >
          <View
            className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
              program.isActive ? 'bg-emerald-500' : 'bg-gray-400'
            }`}
          />
          <Text
            className={`${typo.caption} ${
              program.isActive
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-gray-400 dark:text-gray-500'
            }`}
          >
            {program.isActive
              ? t('loyaltyConfig.preview.active')
              : t('loyaltyConfig.preview.inactive')}
          </Text>
        </View>
      </View>

      {/* 3 rule chips */}
      <View className="flex-row px-4 py-3.5 border-b border-gray-50 dark:border-gray-700" style={{ gap: 8 }}>
        {rules.map((rule) => (
          <View
            key={rule.label}
            className="flex-1 rounded-xl p-2.5 items-center"
            style={{ backgroundColor: rule.bg }}
          >
            <MaterialCommunityIcons name={rule.icon} size={18} color={rule.color} />
            <Text
              className={`${typo.caption} text-gray-500 dark:text-gray-400 text-center mt-1`}
              numberOfLines={1}
            >
              {rule.label}
            </Text>
            <Text
              className={`${typo.captionBold} text-center mt-0.5`}
              style={{ color: rule.color }}
              numberOfLines={2}
              adjustsFontSizeToFit
            >
              {rule.value}
            </Text>
          </View>
        ))}
      </View>

      {/* Example */}
      <View className="px-4 py-3.5">
        <View className="flex-row items-center mb-2.5">
          <MaterialCommunityIcons name="lightbulb-outline" size={13} color="#d97706" style={{ marginRight: 4 }} />
          <Text className={`${typo.captionBold} text-amber-600 dark:text-amber-400 uppercase tracking-wide`}>
            {t('loyaltyConfig.preview.exampleTitle')}
          </Text>
        </View>

        <View className="flex-row items-start mb-1.5">
          <View className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 items-center justify-center mr-2 mt-0.5 flex-shrink-0">
            <Text className={`${typo.caption} font-bold`} style={{ color: '#059669' }}>1</Text>
          </View>
          <Text className={`${typo.caption} text-gray-600 dark:text-gray-300 flex-1`}>
            {t('loyaltyConfig.preview.exampleEarn', {
              spend: '1.000.000 ₫',
              points: examplePoints.toLocaleString(),
            })}
          </Text>
        </View>

        <View className="flex-row items-start">
          <View
            className={`w-5 h-5 rounded-full items-center justify-center mr-2 mt-0.5 flex-shrink-0 ${
              canRedeem ? 'bg-violet-100 dark:bg-violet-900/40' : 'bg-gray-100 dark:bg-gray-700'
            }`}
          >
            <Text className={`${typo.caption} font-bold`} style={{ color: canRedeem ? '#7c3aed' : '#9ca3af' }}>
              2
            </Text>
          </View>
          {canRedeem ? (
            <Text className={`${typo.caption} text-gray-600 dark:text-gray-300 flex-1`}>
              {t('loyaltyConfig.preview.exampleWorth', {
                points: examplePoints.toLocaleString(),
                amount: formatVnd(exampleDiscount),
              })}
            </Text>
          ) : (
            <Text className={`${typo.caption} text-gray-400 dark:text-gray-500 flex-1`}>
              {t('loyaltyConfig.preview.exampleNotEnough', {
                points: examplePoints.toLocaleString(),
                min: mrp.toLocaleString(),
              })}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function TierFieldRow({
  label,
  hint,
  value,
  onChangeText,
  keyboardType = 'default',
  placeholder,
}: {
  label: string;
  hint?: string;
  value: string;
  onChangeText: (v: string) => void;
  keyboardType?: 'default' | 'numeric';
  placeholder?: string;
}) {
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
  const { t } = useTranslation();
  return (
    <View className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
      <View className="h-1" style={{ backgroundColor: tier.color }} />
      <View className="p-4 flex-row items-start">
        <View
          className="w-9 h-9 rounded-full items-center justify-center flex-shrink-0 mr-3"
          style={{ backgroundColor: tier.color + '20' }}
        >
          <MaterialCommunityIcons name="trophy" size={18} color={tier.color} />
        </View>
        <View className="flex-1">
          <Text className={`${typo.labelBold} text-gray-900 dark:text-white`}>{tier.name}</Text>
          {tier.description ? (
            <Text className={`${typo.caption} text-gray-400 dark:text-gray-500 mt-0.5`}>
              {tier.description}
            </Text>
          ) : null}
          <View className="flex-row flex-wrap gap-x-4 gap-y-1 mt-2">
            <StatChip label={t('loyaltyConfig.tier.minSpendShort')} value={formatVnd(tier.minSpend)} />
            <StatChip label={t('loyaltyConfig.tier.multiplierShort')} value={`×${tier.pointsMultiplier}`} />
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
