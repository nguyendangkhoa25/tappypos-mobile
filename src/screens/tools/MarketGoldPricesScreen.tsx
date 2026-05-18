import { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { utilitiesApi, type MarketGoldPriceItem } from '../../services/api';
import { useTypography } from '../../hooks/useTypography';
import { Skeleton } from '../../components/Skeleton';
import type { ToolsScreenProps } from '../../types/navigation';

type Props = ToolsScreenProps<'MarketGoldPrices'>;

const STORAGE_KEY = 'market_gold_price_source';
const DEFAULT_SOURCE = 'MIHONG';

const SOURCES: { key: string; label: string }[] = [
  { key: 'SJC',    label: 'SJC' },
  { key: 'MIHONG', label: 'Mi Hồng' },
  { key: 'PNJ',    label: 'PNJ' },
  { key: 'BTMC',   label: 'BTMC' },
];

function fmtPrice(n: number | null) {
  if (n == null) return '—';
  return Math.round(n / 1000).toLocaleString('vi-VN');
}

function fmtTime(iso: string | null) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export function MarketGoldPricesScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const typo = useTypography();
  const { top } = useSafeAreaInsets();
  const [source, setSource] = useState(DEFAULT_SOURCE);
  const [sourceReady, setSourceReady] = useState(false);

  // Restore last selected source
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((v) => {
      if (v && SOURCES.some((s) => s.key === v)) setSource(v);
      setSourceReady(true);
    });
  }, []);

  function selectSource(key: string) {
    setSource(key);
    AsyncStorage.setItem(STORAGE_KEY, key);
  }

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['marketGoldPrices', source],
    queryFn: () => utilitiesApi.getMarketGoldPrices(source).then((r) => r.data.data),
    staleTime: 30 * 60_000,
    enabled: sourceReady,
  });

  const prices: MarketGoldPriceItem[] = data?.prices ?? [];
  const fetchedAt = data?.fetchedAt ?? null;

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <View
        className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 pb-3"
        style={{ paddingTop: top + 12 }}
      >
        <View className="flex-row items-center mb-1">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            className="mr-3"
          >
            <MaterialCommunityIcons name="chevron-left" size={26} color="#4f46e5" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className={`${typo.section} text-gray-900 dark:text-white`}>
              {t('marketGold.title')}
            </Text>
            {fetchedAt ? (
              <Text className={`${typo.caption} text-gray-400`}>{t('marketGold.updatedAt', { time: fmtTime(fetchedAt) })}</Text>
            ) : null}
          </View>
          <TouchableOpacity
            onPress={() => refetch()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons name="refresh" size={22} color="#4f46e5" />
          </TouchableOpacity>
        </View>
        <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 mb-0 mt-0`}>{t('marketGold.hint')}</Text>

        {/* Source tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-2 -mx-1">
          {SOURCES.map((s) => {
            const active = s.key === source;
            return (
              <TouchableOpacity
                key={s.key}
                onPress={() => selectSource(s.key)}
                className={`mx-1 px-4 py-1.5 rounded-full ${active ? 'bg-indigo-600' : 'bg-gray-100 dark:bg-gray-700'}`}
              >
                <Text className={`${typo.label} ${active ? 'text-white' : 'text-gray-600 dark:text-gray-300'}`}>
                  {s.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Content */}
      {isLoading ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 12 }}>
          {[...Array(6)].map((_, i) => (
            <View key={i} className="bg-white dark:bg-gray-800 rounded-2xl p-4">
              <Skeleton height={16} width="66%" style={{ marginBottom: 8 }} />
              <View className="flex-row gap-4">
                <Skeleton height={20} width="33%" />
                <Skeleton height={20} width="33%" />
              </View>
            </View>
          ))}
        </ScrollView>
      ) : prices.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <MaterialCommunityIcons name="gold" size={56} color="#d1d5db" />
          <Text className={`${typo.body} text-gray-400 mt-4 text-center`}>
            {t('marketGold.noData')}
          </Text>
          <Text className={`${typo.caption} text-gray-400 mt-1 text-center`}>
            {t('marketGold.noDataHint')}
          </Text>
          <TouchableOpacity
            onPress={() => refetch()}
            className="mt-5 bg-indigo-600 px-6 py-3 rounded-2xl"
          >
            <Text className={`${typo.label} text-white`}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#4f46e5" />}
        >
          {/* Column headers */}
          <View className="flex-row px-4 items-end">
            <View className="flex-1">
              <Text className={`${typo.captionBold} text-gray-500 dark:text-gray-400 uppercase tracking-wide`}>
                {t('marketGold.type')}
              </Text>
              <Text className={`${typo.caption} text-gray-400 dark:text-gray-500 mt-0.5`}>
                đơn vị × 1.000 ₫
              </Text>
            </View>
            <Text className={`${typo.captionBold} w-32 text-right text-blue-500 uppercase tracking-wide`}>
              {t('marketGold.buy')}
            </Text>
            <Text className={`${typo.captionBold} w-32 text-right text-indigo-600 uppercase tracking-wide`}>
              {t('marketGold.sell')}
            </Text>
          </View>

          <View className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden">
            {prices.map((item, idx) => (
              <View key={`${item.ktype}-${idx}`}>
                {idx > 0 && <View className="h-px bg-gray-100 dark:bg-gray-700 mx-4" />}
                <View className="flex-row items-center px-4 py-3.5">
                  <View className="flex-1 mr-2">
                    <Text className={`${typo.label} text-gray-900 dark:text-white`} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text className={`${typo.caption} text-gray-400 mt-0.5`}>{item.ktype}</Text>
                  </View>
                  <View className="items-end w-32">
                    <Text className={`${typo.labelBold} text-blue-600`}>{fmtPrice(item.buyPrice)}</Text>
                    <Text className={`${typo.labelBold} text-indigo-600 mt-0.5`}>{fmtPrice(item.sellPrice)}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>

          <Text className={`${typo.caption} text-gray-400 text-center`}>
            {t('marketGold.dataSource', { source: SOURCES.find((s) => s.key === source)?.label ?? source })}
          </Text>
        </ScrollView>
      )}
    </View>
  );
}
