import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Switch,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import type { TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToastStore } from '../../store/toastStore';
import { useErrorAlert } from '../../hooks/useErrorAlert';
import { shopConfigApi } from '../../services/api';
import { useTypography } from '../../hooks/useTypography';
import { MoneyInput } from '../../components/MoneyInput';
import type { SettingsScreenProps } from '../../types/navigation';

const DENOMINATIONS = [1_000, 2_000, 5_000, 10_000, 20_000, 50_000, 100_000, 200_000, 500_000];
const TAX_RATES = [5, 8, 10];

const SERVICE_SHOP_CODES = [
  'BARBER_SHOP', 'BARBER_SHOP_MEN', 'HAIR_SALON', 'NAIL_SHOP',
  'LASH_PMU_STUDIO', 'SPA_SHOP', 'MASSAGE_SHOP', 'BEAUTY_CLINIC', 'MAKEUP_STUDIO',
];

type PosMode = 'LIST' | 'BARCODE' | 'TABLE';

type LocalPosSettings = {
  posMode: PosMode;
  defaultTaxRate: number;
  taxAutoApply: boolean;
  denominations: number[];
};

function parseDenominations(raw: string | null): number[] {
  if (!raw) return [50_000, 100_000, 200_000, 500_000];
  return raw.split(',').map(Number).filter(Boolean).sort((a, b) => a - b);
}

function serializeDenominations(arr: number[]): string {
  return [...arr].sort((a, b) => a - b).join(',');
}

export function POSConfigScreen({ navigation }: SettingsScreenProps<'POSConfig'>) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const typo = useTypography();
  const qc = useQueryClient();
  const { show: showToast } = useToastStore();
  const showErrorAlert = useErrorAlert();

  const [settings, setSettings] = useState<LocalPosSettings | null>(null);
  const [showAddDenom, setShowAddDenom] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const customInputRef = useRef<TextInput>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['posConfig'],
    queryFn: () => shopConfigApi.getPosConfig().then((r) => r.data.data),
    staleTime: 5 * 60_000,
  });

  const { data: shopInfo } = useQuery({
    queryKey: ['shopConfig'],
    queryFn: () => shopConfigApi.getInfo().then((r) => r.data.data),
    staleTime: 10 * 60_000,
  });

  const isServiceShop = SERVICE_SHOP_CODES.includes(shopInfo?.shopTypeCode ?? '');

  useEffect(() => {
    if (data && !settings) {
      setSettings({
        posMode: (data.posMode as PosMode) ?? 'LIST',
        defaultTaxRate: 10,
        taxAutoApply: data.vatEnabled ?? false,
        denominations: parseDenominations(data.cashDenominations),
      });
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: () =>
      shopConfigApi.updatePosConfig({
        posMode: settings!.posMode,
        vatEnabled: settings!.taxAutoApply,
        cashDenominations: serializeDenominations(settings!.denominations),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['posConfig'] });
      showToast(t('settings.posConfig.saveSuccess'));
      navigation.goBack();
    },
    onError: showErrorAlert,
  });

  const toggleDenomination = (d: number) => {
    if (!settings) return;
    const next = settings.denominations.includes(d)
      ? settings.denominations.filter((x) => x !== d)
      : [...settings.denominations, d];
    setSettings({ ...settings, denominations: next });
  };

  // Custom denominations = saved values not in the preset list
  const customDenominations = settings
    ? settings.denominations.filter((d) => !DENOMINATIONS.includes(d))
    : [];

  // All chips to show = presets + any custom ones, sorted
  const allDenominations = [...new Set([...DENOMINATIONS, ...customDenominations])].sort((a, b) => a - b);

  const confirmAddDenom = () => {
    const val = parseInt(customInput.replace(/[^0-9]/g, ''), 10);
    if (!val || val <= 0 || !settings) return;
    if (!allDenominations.includes(val)) {
      // Add + auto-select the new denomination
      setSettings({ ...settings, denominations: [...settings.denominations, val] });
    }
    setCustomInput('');
    setShowAddDenom(false);
  };

  const removeCustomDenom = (d: number) => {
    if (!settings) return;
    setSettings({ ...settings, denominations: settings.denominations.filter((x) => x !== d) });
  };

  const modeOptions: { value: PosMode; label: string; icon: string }[] = [
    { value: 'LIST', label: t('settings.posConfig.modeList'), icon: 'view-list-outline' },
    { value: 'BARCODE', label: t('settings.posConfig.modeBarcode'), icon: 'barcode-scan' },
    { value: 'TABLE', label: t('settings.posConfig.modeTable'), icon: 'table-furniture' },
  ];

  const formatDenomination = (v: number) =>
    v >= 1_000_000
      ? `${v / 1_000_000}tr`
      : v >= 1_000
      ? `${v / 1_000}k`
      : `${v}`;

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-gray-50 dark:bg-gray-900"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View
        className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4"
        style={{ paddingTop: insets.top + 12, paddingBottom: 12 }}
      >
        <View className="flex-row items-center mb-0.5">
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} className="mr-3">
            <MaterialCommunityIcons name="chevron-left" size={26} color="#4f46e5" />
          </TouchableOpacity>
          <Text className={`${typo.heading} text-gray-900 dark:text-white flex-1`}>
            {t('settings.posConfig.title')}
          </Text>
          <TouchableOpacity
            onPress={() => mutation.mutate()}
            disabled={!settings || mutation.isPending}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {mutation.isPending ? (
              <ActivityIndicator size="small" color="#4f46e5" />
            ) : (
              <Text className={`${typo.labelBold} text-indigo-600`}>{t('common.save')}</Text>
            )}
          </TouchableOpacity>
        </View>
        <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 mt-0.5`}>{t('settings.posConfig.hint')}</Text>
      </View>

      {isLoading || !settings ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#4f46e5" />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 4, gap: 16 }}>
          {/* POS Mode */}
          <View className="bg-white dark:bg-gray-800 rounded-2xl p-4">
            <Text className={`${typo.label} text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3`}>
              {t('settings.posConfig.sectionMode')}
            </Text>
            {isServiceShop ? (
              <View className="flex-row items-start p-3 rounded-xl border-2 border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 gap-3">
                <MaterialCommunityIcons name="lock-outline" size={20} color="#9ca3af" style={{ marginTop: 1 }} />
                <View className="flex-1">
                  <Text className={`${typo.caption} font-medium text-gray-700 dark:text-gray-300`}>
                    {t('settings.posConfig.modeServiceLocked')}
                  </Text>
                  <Text className={`${typo.caption} text-gray-400 dark:text-gray-500 mt-0.5`}>
                    {t('settings.posConfig.modeServiceLockedHint')}
                  </Text>
                </View>
              </View>
            ) : (
              <View className="gap-2">
                {modeOptions.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => setSettings({ ...settings, posMode: opt.value })}
                    className={`flex-row items-center p-3 rounded-xl border-2 ${
                      settings.posMode === opt.value
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                        : 'border-gray-100 dark:border-gray-700'
                    }`}
                  >
                    <MaterialCommunityIcons
                      name={opt.icon as any}
                      size={20}
                      color={settings.posMode === opt.value ? '#4f46e5' : '#9ca3af'}
                    />
                    <Text className={`ml-3 ${typo.caption} font-medium flex-1 ${
                      settings.posMode === opt.value ? 'text-indigo-700 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-300'
                    }`}>
                      {opt.label}
                    </Text>
                    {settings.posMode === opt.value && (
                      <MaterialCommunityIcons name="check-circle" size={18} color="#4f46e5" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Tax */}
          <View className="bg-white dark:bg-gray-800 rounded-2xl p-4">
            <Text className={`${typo.label} text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3`}>
              {t('settings.posConfig.sectionTax')}
            </Text>
            <View className="flex-row items-center justify-between mb-4">
              <Text className={`${typo.caption} text-gray-900 dark:text-white flex-1 mr-4`}>
                {t('settings.posConfig.taxAutoApply')}
              </Text>
              <Switch
                value={settings.taxAutoApply}
                onValueChange={(v) => setSettings({ ...settings, taxAutoApply: v })}
                trackColor={{ true: '#4f46e5' }}
                thumbColor="#fff"
              />
            </View>
            <View className="flex-row items-center justify-between">
              <Text className={`${typo.caption} text-gray-600 dark:text-gray-400`}>{t('settings.posConfig.taxRate')}</Text>
              <View className="flex-row gap-2">
                {TAX_RATES.map((rate) => (
                  <TouchableOpacity
                    key={rate}
                    onPress={() => setSettings({ ...settings, defaultTaxRate: rate })}
                    className={`px-3 py-1.5 rounded-lg border-2 ${
                      settings.defaultTaxRate === rate
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                        : 'border-gray-200 dark:border-gray-600'
                    }`}
                  >
                    <Text className={`${typo.label} ${
                      settings.defaultTaxRate === rate ? 'text-indigo-700 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-400'
                    }`}>{rate}%</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Cash Denominations */}
          <View className="bg-white dark:bg-gray-800 rounded-2xl p-4">
            <Text className={`${typo.label} text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1`}>
              {t('settings.posConfig.sectionDenominations')}
            </Text>
            <Text className={`${typo.caption} text-gray-400 mb-3`}>{t('settings.posConfig.denominationsHint')}</Text>
            <View className="flex-row flex-wrap gap-2">
              {allDenominations.map((d) => {
                const selected = settings.denominations.includes(d);
                const isCustom = !DENOMINATIONS.includes(d);
                return (
                  <TouchableOpacity
                    key={d}
                    onPress={() => toggleDenomination(d)}
                    className={`flex-row items-center px-3 py-2 rounded-xl border-2 ${
                      selected
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                        : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700'
                    }`}
                  >
                    <Text className={`${typo.caption} font-medium ${
                      selected ? 'text-indigo-700 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-400'
                    }`}>
                      {formatDenomination(d)}
                    </Text>
                    {isCustom && (
                      <TouchableOpacity
                        onPress={() => removeCustomDenom(d)}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 4 }}
                        className="ml-1.5"
                      >
                        <MaterialCommunityIcons
                          name="close-circle"
                          size={14}
                          color={selected ? '#6366f1' : '#9ca3af'}
                        />
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>
                );
              })}

              {/* Add custom denomination chip */}
              {!showAddDenom && (
                <TouchableOpacity
                  onPress={() => setShowAddDenom(true)}
                  className="flex-row items-center px-3 py-2 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600"
                >
                  <MaterialCommunityIcons name="plus" size={14} color="#9ca3af" />
                  <Text className={`${typo.caption} text-gray-400 ml-1`}>
                    {t('settings.posConfig.addDenomination')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Money input form — shown when user taps + */}
            {showAddDenom && (
              <View className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 mb-2`}>
                  {t('settings.posConfig.addDenominationLabel')}
                </Text>
                <MoneyInput
                  ref={customInputRef}
                  rawValue={customInput}
                  onChangeRaw={setCustomInput}
                  placeholder="0"
                  returnKeyType="done"
                  onSubmitEditing={confirmAddDenom}
                  autoFocus
                />
                <View className="flex-row gap-2 mt-3">
                  <TouchableOpacity
                    onPress={() => { setShowAddDenom(false); setCustomInput(''); }}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 items-center"
                  >
                    <Text className={`${typo.label} text-gray-500 dark:text-gray-400`}>{t('common.cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={confirmAddDenom}
                    disabled={!customInput}
                    className={`flex-1 py-2.5 rounded-xl items-center ${customInput ? 'bg-indigo-600' : 'bg-indigo-200 dark:bg-indigo-900/40'}`}
                  >
                    <Text className={`${typo.label} font-semibold ${customInput ? 'text-white' : 'text-indigo-300'}`}>
                      {t('settings.posConfig.addDenominationConfirm')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}
