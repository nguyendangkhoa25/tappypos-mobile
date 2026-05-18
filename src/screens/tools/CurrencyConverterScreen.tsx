import { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getLocales } from 'expo-localization';
import { utilitiesApi } from '../../services/api';
import { useTypography } from '../../hooks/useTypography';
import { Skeleton } from '../../components/Skeleton';
import type { ToolsScreenProps } from '../../types/navigation';

type Props = ToolsScreenProps<'CurrencyConverter'>;

const POPULARITY_ORDER = ['USD', 'EUR', 'JPY', 'CNY', 'GBP', 'AUD', 'KRW', 'SGD', 'THB'];

const CURRENCY_FLAG: Record<string, string> = {
  USD: '🇺🇸', EUR: '🇪🇺', JPY: '🇯🇵', CNY: '🇨🇳',
  GBP: '🇬🇧', AUD: '🇦🇺', KRW: '🇰🇷', SGD: '🇸🇬', THB: '🇹🇭',
};

const REGION_DEFAULT: Record<string, string> = {
  JP: 'JPY', KR: 'KRW', SG: 'SGD', TH: 'THB',
  CN: 'CNY', HK: 'CNY', TW: 'CNY',
  GB: 'GBP', AU: 'AUD', NZ: 'AUD',
  FR: 'EUR', DE: 'EUR', IT: 'EUR', ES: 'EUR',
};

function getDefaultCurrency(): string {
  const region = getLocales()[0]?.regionCode ?? '';
  return REGION_DEFAULT[region] ?? 'USD';
}

function fmtVnd(n: number) {
  return n.toLocaleString('en-US');
}

export function CurrencyConverterScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const typo = useTypography();
  const { top, bottom } = useSafeAreaInsets();

  const defaultCurrency = useMemo(() => getDefaultCurrency(), []);
  const [selectedCode, setSelectedCode] = useState(() => getDefaultCurrency());
  const [amount, setAmount] = useState('');
  const [direction, setDirection] = useState<'toVnd' | 'fromVnd'>('toVnd');
  const [customRateEnabled, setCustomRateEnabled] = useState(false);
  const [customRateInput, setCustomRateInput] = useState('');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['exchange-rates'],
    queryFn: () => utilitiesApi.getExchangeRates().then((r) => r.data.data),
    staleTime: 30 * 60 * 1000,
    retry: 2,
  });

  const rates = data?.rates ?? [];

  const sortedRates = useMemo(() => [...rates].sort((a, b) => {
    if (a.currencyCode === defaultCurrency) return -1;
    if (b.currencyCode === defaultCurrency) return 1;
    const ai = POPULARITY_ORDER.indexOf(a.currencyCode);
    const bi = POPULARITY_ORDER.indexOf(b.currencyCode);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  }), [rates, defaultCurrency]);

  const selected = rates.find((r) => r.currencyCode === selectedCode);
  const inputNum = parseFloat(amount.replace(/,/g, '')) || 0;
  const customRate = parseFloat(customRateInput.replace(/,/g, '')) || 0;

  function handleSelectCurrency(code: string) {
    setSelectedCode(code);
    setCustomRateEnabled(false);
    setCustomRateInput('');
  }

  function handleToggleCustomRate() {
    if (!customRateEnabled) {
      const prefill = selected?.transferRate ?? selected?.buyRate ?? selected?.sellRate;
      if (prefill) setCustomRateInput(String(prefill));
    }
    setCustomRateEnabled((prev) => !prev);
  }

  type ConvertResult =
    | { mode: 'live'; buy: string; transfer: string; sell: string }
    | { mode: 'custom'; value: string; rate: number };

  function calcResult(): ConvertResult | null {
    if (!inputNum) return null;
    const useCustom = customRateEnabled || (isError && customRate > 0);
    if (useCustom) {
      if (!customRate) return null;
      const value = direction === 'toVnd'
        ? fmtVnd(Math.round(inputNum * customRate))
        : (inputNum / customRate).toFixed(4);
      return { mode: 'custom', value, rate: customRate };
    }
    if (!selected) return null;
    if (direction === 'toVnd') {
      return {
        mode: 'live',
        buy:      selected.buyRate      ? fmtVnd(Math.round(inputNum * selected.buyRate))      : '—',
        transfer: selected.transferRate ? fmtVnd(Math.round(inputNum * selected.transferRate)) : '—',
        sell:     selected.sellRate     ? fmtVnd(Math.round(inputNum * selected.sellRate))     : '—',
      };
    }
    return {
      mode: 'live',
      buy:      selected.buyRate      ? (inputNum / selected.buyRate).toFixed(4)      : '—',
      transfer: selected.transferRate ? (inputNum / selected.transferRate).toFixed(4) : '—',
      sell:     selected.sellRate     ? (inputNum / selected.sellRate).toFixed(4)     : '—',
    };
  }

  const result = calcResult();

  const fetchedAt = data?.fetchedAt
    ? new Date(data.fetchedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <View className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4" style={{ paddingTop: top + 12, paddingBottom: 12 }}>
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} className="mr-3">
            <MaterialCommunityIcons name="chevron-left" size={26} color="#4f46e5" />
          </TouchableOpacity>
          <Text className={`${typo.heading} text-gray-900 dark:text-white flex-1`}>{t('currencyConverter.title')}</Text>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: bottom + 32 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* Hint */}
        <View className="flex-row items-start bg-indigo-50 rounded-xl px-3 py-2.5 border border-indigo-100 mb-3">
          <Text className="text-indigo-400 mr-2 mt-0.5">💡</Text>
          <Text className={`${typo.caption} text-indigo-600 leading-4 flex-1`}>{t('currencyConverter.hint')}</Text>
        </View>

        {/* Disclaimer */}
        <View className="flex-row items-start bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 mb-3">
          <MaterialCommunityIcons name="information-outline" size={16} color="#d97706" style={{ marginTop: 1, marginRight: 6 }} />
          <Text className={`${typo.caption} flex-1 text-amber-700 leading-4`}>{t('currencyConverter.disclaimer')}</Text>
        </View>

        {/* Loading */}
        {isLoading && (
          <View style={{ gap: 10, paddingVertical: 8 }}>
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} height={52} borderRadius={12} />)}
          </View>
        )}

        {/* Error with retry + manual rate fallback */}
        {isError && (
          <>
            <TouchableOpacity onPress={() => refetch()} className="flex-row items-center justify-center py-3 mb-3">
              <MaterialCommunityIcons name="refresh" size={16} color="#ef4444" style={{ marginRight: 6 }} />
              <Text className={`${typo.caption} font-semibold text-red-500`}>{t('currencyConverter.error')} · {t('currencyConverter.retry')}</Text>
            </TouchableOpacity>
            <View className="bg-white rounded-2xl p-4 mb-3 border border-gray-100">
              <Text className={`${typo.label} text-gray-700 mb-2`}>
                {t('currencyConverter.manualRateLabel', { code: selectedCode })}
              </Text>
              <TextInput
                className={`border border-gray-300 rounded-xl px-3 py-3 ${typo.inputSize} bg-white text-gray-900`}
                value={customRateInput}
                onChangeText={setCustomRateInput}
                keyboardType="decimal-pad"
                placeholder={t('currencyConverter.ratePlaceholder')}
                placeholderTextColor="#9ca3af"
              />
            </View>
          </>
        )}

        {/* Currency selector */}
        {rates.length > 0 && (
          <>
            {fetchedAt && (
              <Text className={`${typo.caption} text-gray-400 mb-3 text-right`}>
                {t('currencyConverter.lastUpdated')}: {fetchedAt} · {data?.source}
              </Text>
            )}

            <View className="bg-white rounded-2xl p-4 mb-3 border border-gray-100">
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row" style={{ gap: 8 }}>
                  {sortedRates.map((r) => (
                    <TouchableOpacity
                      key={r.currencyCode}
                      onPress={() => handleSelectCurrency(r.currencyCode)}
                      activeOpacity={0.75}
                      className={`flex-row items-center px-3 py-2 rounded-xl ${selectedCode === r.currencyCode ? 'bg-primary' : 'bg-gray-100'}`}
                    >
                      <Text className={`${typo.label} mr-1.5`}>{CURRENCY_FLAG[r.currencyCode] ?? '🏳️'}</Text>
                      <Text className={`${typo.label} ${selectedCode === r.currencyCode ? 'text-white' : 'text-gray-700'}`}>
                        {r.currencyCode}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Rate info card */}
            {selected && (
              <View className="bg-white rounded-2xl p-4 mb-3 border border-gray-100">
                <View className="flex-row justify-between items-center mb-3">
                  <Text className={`${typo.label} text-gray-700`}>
                    {t('currencyConverter.currentRates')} · {CURRENCY_FLAG[selectedCode]} {selectedCode}/VND
                  </Text>
                  <TouchableOpacity
                    onPress={handleToggleCustomRate}
                    activeOpacity={0.75}
                    className={`flex-row items-center px-2.5 py-1 rounded-lg ${customRateEnabled ? 'bg-primary-light' : 'bg-gray-100'}`}
                  >
                    <MaterialCommunityIcons
                      name={customRateEnabled ? 'pencil' : 'pencil-outline'}
                      size={13}
                      color={customRateEnabled ? '#4f46e5' : '#9ca3af'}
                      style={{ marginRight: 4 }}
                    />
                    <Text className={`${typo.caption} font-semibold ${customRateEnabled ? 'text-primary' : 'text-gray-400'}`}>
                      {t('currencyConverter.customRate')}
                    </Text>
                  </TouchableOpacity>
                </View>

                {!customRateEnabled ? (
                  <View className="flex-row" style={{ gap: 8 }}>
                    {[
                      { label: t('currencyConverter.buy'),      rate: selected.buyRate },
                      { label: t('currencyConverter.transfer'), rate: selected.transferRate },
                      { label: t('currencyConverter.sell'),     rate: selected.sellRate },
                    ].map(({ label, rate }) => (
                      <View key={label} className="flex-1 bg-gray-50 rounded-xl px-3 py-2.5">
                        <Text className={`${typo.caption} text-gray-400 mb-1`}>{label}</Text>
                        <Text className={`${typo.label} text-gray-800`}>
                          {rate ? fmtVnd(Number(rate)) : '—'}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View>
                    <Text className={`${typo.caption} text-gray-500 mb-1.5`}>
                      {t('currencyConverter.manualRateLabel', { code: selectedCode })}
                    </Text>
                    <TextInput
                      className={`border border-primary rounded-xl px-3 py-3 ${typo.inputSize} bg-white text-gray-900`}
                      value={customRateInput}
                      onChangeText={setCustomRateInput}
                      keyboardType="decimal-pad"
                      placeholder={t('currencyConverter.ratePlaceholder')}
                      placeholderTextColor="#9ca3af"
                      autoFocus
                    />
                    {customRate > 0 && (
                      <Text className={`${typo.caption} text-primary mt-1.5`}>
                        1 {selectedCode} = {fmtVnd(customRate)} VND
                      </Text>
                    )}
                  </View>
                )}
              </View>
            )}
          </>
        )}

        {/* Direction toggle */}
        {(selected || (isError && customRateInput)) && (
          <View className="bg-white rounded-2xl p-4 mb-3 border border-gray-100">
            <View className="flex-row rounded-xl overflow-hidden border border-gray-200">
              {([
                { key: 'toVnd',   label: `${CURRENCY_FLAG[selectedCode] ?? ''} ${selectedCode} → VND` },
                { key: 'fromVnd', label: `VND → ${CURRENCY_FLAG[selectedCode] ?? ''} ${selectedCode}` },
              ] as const).map(({ key, label }) => (
                <TouchableOpacity
                  key={key}
                  onPress={() => setDirection(key)}
                  activeOpacity={0.75}
                  className={`flex-1 py-2.5 items-center ${direction === key ? 'bg-primary' : 'bg-white'}`}
                >
                  <Text className={`${typo.label} ${direction === key ? 'text-white' : 'text-gray-600'}`}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Amount input */}
        {(selected || (isError && customRateInput)) && (
          <View className="bg-white rounded-2xl p-4 mb-3 border border-gray-100">
            <Text className={`${typo.label} text-gray-700 mb-2`}>
              {direction === 'toVnd' ? selectedCode : 'VND'}
            </Text>
            <TextInput
              className={`border border-gray-300 rounded-xl px-3 py-3 ${typo.inputSize} bg-white text-gray-900`}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor="#9ca3af"
            />
          </View>
        )}

        {/* Result */}
        {result && (
          <View className="bg-primary-light rounded-2xl p-4 border border-indigo-200">
            <Text className={`${typo.labelBold} text-primary mb-3`}>
              {direction === 'toVnd' ? 'VND' : selectedCode}
            </Text>

            {result.mode === 'live' && selected && (
              <>
                <RateRow label={t('currencyConverter.buy')}      rate={selected.buyRate}      result={result.buy} />
                <RateRow label={t('currencyConverter.transfer')} rate={selected.transferRate} result={result.transfer} />
                <RateRow label={t('currencyConverter.sell')}     rate={selected.sellRate}     result={result.sell} />
              </>
            )}

            {result.mode === 'custom' && (
              <RateRow
                label={t('currencyConverter.customRateResult')}
                rate={result.rate}
                result={result.value}
              />
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function RateRow({ label, rate, result }: { label: string; rate: number | null | undefined; result: string }) {
  const typo = useTypography();
  return (
    <View className="flex-row justify-between items-center mb-2">
      <Text className={`${typo.caption} text-gray-600`}>
        {label}
        {rate ? <Text className={`${typo.caption} text-gray-400`}> ({fmtVnd(Number(rate))})</Text> : null}
      </Text>
      <Text className={`${typo.labelBold} text-primary`}>{result}</Text>
    </View>
  );
}
