import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Switch,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToastStore } from '../../store/toastStore';
import { useErrorAlert } from '../../hooks/useErrorAlert';
import { shopConfigApi } from '../../services/api';
import type { SettingsScreenProps } from '../../types/navigation';

const DENOMINATIONS = [1_000, 2_000, 5_000, 10_000, 20_000, 50_000, 100_000, 200_000, 500_000];
const TAX_RATES = [5, 8, 10];

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
  const qc = useQueryClient();
  const { show: showToast } = useToastStore();
  const showErrorAlert = useErrorAlert();

  const [settings, setSettings] = useState<LocalPosSettings | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['posSettings'],
    queryFn: () => shopConfigApi.getPosSettings().then((r) => r.data.data),
    staleTime: 5 * 60_000,
  });

  useEffect(() => {
    if (data && !settings) {
      setSettings({
        posMode: (data.posMode as PosMode) ?? 'LIST',
        defaultTaxRate: data.defaultTaxRate ?? 10,
        taxAutoApply: data.taxAutoApply ?? false,
        denominations: parseDenominations(data.cashDenominations),
      });
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: () =>
      shopConfigApi.updateInfo({
        posMode: settings!.posMode,
        defaultTaxRate: settings!.defaultTaxRate,
        taxAutoApply: settings!.taxAutoApply,
        cashDenominations: serializeDenominations(settings!.denominations),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['posSettings'] });
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
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <View
        className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 flex-row items-center px-4"
        style={{ paddingTop: insets.top + 12, paddingBottom: 12 }}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} className="mr-3">
          <MaterialCommunityIcons name="chevron-left" size={26} color="#4f46e5" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-900 dark:text-white flex-1">
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
            <Text className="font-semibold text-base text-indigo-600">{t('common.save')}</Text>
          )}
        </TouchableOpacity>
      </View>

      {isLoading || !settings ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#4f46e5" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
          {/* POS Mode */}
          <View className="bg-white dark:bg-gray-800 rounded-2xl p-4">
            <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
              {t('settings.posConfig.sectionMode')}
            </Text>
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
                  <Text className={`ml-3 text-base font-medium flex-1 ${
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
          </View>

          {/* Tax */}
          <View className="bg-white dark:bg-gray-800 rounded-2xl p-4">
            <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
              {t('settings.posConfig.sectionTax')}
            </Text>
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-base text-gray-900 dark:text-white flex-1 mr-4">
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
              <Text className="text-sm text-gray-600 dark:text-gray-400">{t('settings.posConfig.taxRate')}</Text>
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
                    <Text className={`text-sm font-semibold ${
                      settings.defaultTaxRate === rate ? 'text-indigo-700 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-400'
                    }`}>{rate}%</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Cash Denominations */}
          <View className="bg-white dark:bg-gray-800 rounded-2xl p-4">
            <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
              {t('settings.posConfig.sectionDenominations')}
            </Text>
            <Text className="text-xs text-gray-400 mb-3">{t('settings.posConfig.denominationsHint')}</Text>
            <View className="flex-row flex-wrap gap-2">
              {DENOMINATIONS.map((d) => {
                const selected = settings.denominations.includes(d);
                return (
                  <TouchableOpacity
                    key={d}
                    onPress={() => toggleDenomination(d)}
                    className={`px-4 py-2 rounded-xl border-2 ${
                      selected
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                        : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700'
                    }`}
                  >
                    <Text className={`text-sm font-medium ${
                      selected ? 'text-indigo-700 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-400'
                    }`}>
                      {formatDenomination(d)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}
