import { useRef } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Sharing from 'expo-sharing';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BarChart, type BarChartDataPoint, type ChartGranularity } from './BarChart';
import { useTypography } from '../hooks/useTypography';

type Props = {
  data: BarChartDataPoint[];
  color?: string;
  granularity?: ChartGranularity;
  allowedGranularities?: ChartGranularity[];
  onGranularityChange?: (g: ChartGranularity) => void;
  title?: string;
};

export function TrendChart({
  data,
  color = '#4f46e5',
  granularity = 'day',
  allowedGranularities,
  onGranularityChange,
  title,
}: Props) {
  const { t, i18n } = useTranslation();
  const typo = useTypography();
  const cardRef = useRef<View>(null);

  if (data.length === 0) return null;

  const showToggle = allowedGranularities && allowedGranularities.length > 1 && !!onGranularityChange;

  const shareChart = async () => {
    try {
      const { captureRef } = await import('react-native-view-shot');
      const uri = await captureRef(cardRef, { format: 'png', quality: 0.9 });
      await Sharing.shareAsync(uri);
    } catch {
      // sharing cancelled, unavailable, or native module not yet built — silent
    }
  };

  return (
    <View
      ref={cardRef}
      collapsable={false}
      className="bg-white dark:bg-gray-800 rounded-2xl px-4 pt-4 pb-2 border border-gray-100 dark:border-gray-700"
    >
      {(title || showToggle) && (
        <View className="flex-row items-center justify-between mb-3">
          {title ? (
            <Text className={`${typo.captionBold} uppercase tracking-wider text-gray-400 dark:text-gray-500 flex-1 mr-2`}>
              {title}
            </Text>
          ) : (
            <View />
          )}
          {showToggle && (
            <View className="flex-row gap-1.5">
              {allowedGranularities!.map((g) => {
                const active = g === granularity;
                return (
                  <TouchableOpacity
                    key={g}
                    onPress={() => onGranularityChange!(g)}
                    activeOpacity={0.7}
                    className={`px-3 py-1 rounded-full border ${
                      active
                        ? 'bg-indigo-600 border-indigo-600'
                        : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                    }`}
                  >
                    <Text className={`${typo.label} ${active ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                      {t(`chart.granularity.${g}`)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      )}

      <BarChart data={data} color={color} granularity={granularity} lang={i18n.language} />

      <TouchableOpacity
        onPress={shareChart}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        className="self-end mt-2"
      >
        <MaterialCommunityIcons name="share-outline" size={18} color="#9ca3af" />
      </TouchableOpacity>
    </View>
  );
}
