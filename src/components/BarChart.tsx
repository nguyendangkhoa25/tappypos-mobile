import { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { formatVnd } from '../utils/format';
import { useTypography } from '../hooks/useTypography';

export type BarChartDataPoint = { label: string; value: number };

export type ChartGranularity = 'hour' | 'day' | 'week' | 'month' | 'year';

type Props = {
  data: BarChartDataPoint[];
  color?: string;
  granularity?: ChartGranularity;
  height?: number;
  lang?: string;
};

const BAR_W = 26;
const CHART_H = 110;
const VALUE_H = 16;
const LABEL_H = 24;
const TOOLTIP_H = 36;
const TOTAL_H = TOOLTIP_H + VALUE_H + CHART_H + LABEL_H;

const MONTH_VI = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];
const MONTH_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function compactVnd(n: number): string {
  if (n === 0) return '0';
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000_000) return `${sign}${+(abs / 1_000_000_000).toFixed(1)}T`;
  if (abs >= 1_000_000) return `${sign}${+(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}${+(abs / 1_000).toFixed(0)}K`;
  return `${sign}${Math.round(n)}`;
}

function barLabel(raw: string, granularity: ChartGranularity, lang: string): string {
  const isVi = lang === 'vi';
  try {
    if (granularity === 'hour') {
      const h = parseInt(raw.split(':')[0] ?? raw, 10);
      return `${h}h`;
    }
    if (granularity === 'day') {
      const d = new Date(raw + 'T00:00:00');
      return isVi
        ? `${d.getDate()}/${d.getMonth() + 1}`
        : `${d.getMonth() + 1}/${d.getDate()}`;
    }
    if (granularity === 'week') {
      // raw = week-start date (Monday) from DATE_TRUNC('week', ...)
      const d = new Date(raw + 'T00:00:00');
      return isVi
        ? `${d.getDate()}/${d.getMonth() + 1}`
        : `${d.getMonth() + 1}/${d.getDate()}`;
    }
    if (granularity === 'month') {
      const m = parseInt((raw.split('-')[1] ?? '1'), 10) - 1;
      return (isVi ? MONTH_VI : MONTH_EN)[m] ?? raw;
    }
    if (granularity === 'year') return raw;
  } catch { /* ignore */ }
  return raw;
}

function tooltipLabel(raw: string, granularity: ChartGranularity, lang: string): string {
  const isVi = lang === 'vi';
  try {
    if (granularity === 'hour') {
      const h = parseInt(raw.split(':')[0] ?? raw, 10);
      return `${String(h).padStart(2, '0')}:00`;
    }
    if (granularity === 'day') {
      const d = new Date(raw + 'T00:00:00');
      return isVi
        ? `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`
        : `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
    }
    if (granularity === 'week') {
      const start = new Date(raw + 'T00:00:00');
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      return isVi
        ? `${start.getDate()}/${start.getMonth() + 1} - ${end.getDate()}/${end.getMonth() + 1}`
        : `${start.getMonth() + 1}/${start.getDate()} - ${end.getMonth() + 1}/${end.getDate()}`;
    }
    if (granularity === 'month') {
      const parts = raw.split('-');
      const m = parseInt(parts[1] ?? '1', 10) - 1;
      const yr = (parts[0] ?? '').slice(2);
      return isVi
        ? `${MONTH_VI[m] ?? parts[1]}/${yr}`
        : `${MONTH_EN[m] ?? parts[1]}/${yr}`;
    }
    if (granularity === 'year') return raw;
  } catch { /* ignore */ }
  return raw;
}

export function BarChart({
  data,
  color = '#4f46e5',
  granularity = 'day',
  height = TOTAL_H,
  lang = 'vi',
}: Props) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const typo = useTypography();

  if (data.length === 0) return null;

  const maxVal = Math.max(...data.map((d) => Math.abs(d.value)), 1);
  const peakIdx = data.reduce(
    (mi, d, i) => (Math.abs(d.value) > Math.abs(data[mi]!.value) ? i : mi),
    0,
  );
  const selected = selectedIdx !== null ? data[selectedIdx] : null;

  return (
    <View style={{ height }}>
      {/* Tooltip pill — always reserves space, content conditional */}
      <View style={{ height: TOOLTIP_H, justifyContent: 'center', alignItems: 'center' }}>
        {selected != null && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: color,
              paddingHorizontal: 14,
              paddingVertical: 6,
              borderRadius: 20,
              gap: 6,
            }}
          >
            <Text className={`${typo.caption} font-semibold text-white`}>
              {tooltipLabel(selected.label, granularity, lang)}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10 }}>·</Text>
            <Text className={`${typo.caption} font-bold text-white`}>
              {formatVnd(selected.value)}
            </Text>
          </View>
        )}
      </View>

      {/* Bars — horizontally scrollable */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 8,
          alignItems: 'flex-end',
          minWidth: '100%',
        }}
        style={{ height: VALUE_H + CHART_H + LABEL_H }}
      >
        {data.map((item, i) => {
          const barH = Math.max(
            (Math.abs(item.value) / maxVal) * CHART_H,
            item.value !== 0 ? 3 : 0,
          );
          const isPeak = i === peakIdx && item.value !== 0;
          const isSelected = i === selectedIdx;
          const barOpacity = isPeak || isSelected ? 1 : 0.6;

          return (
            <Pressable
              key={i}
              onPress={() => setSelectedIdx(isSelected ? null : i)}
              style={{ width: BAR_W + 8, alignItems: 'center' }}
            >
              {/* Peak value label */}
              <View style={{ height: VALUE_H, justifyContent: 'flex-end' }}>
                {isPeak && (
                  <Text
                    style={{
                      fontSize: 8,
                      color,
                      fontWeight: '700',
                      textAlign: 'center',
                    }}
                  >
                    {compactVnd(item.value)}
                  </Text>
                )}
              </View>

              {/* Bar */}
              <View
                style={{ height: CHART_H, width: BAR_W, justifyContent: 'flex-end' }}
              >
                <View
                  style={{
                    height: barH,
                    width: BAR_W,
                    backgroundColor: color,
                    borderRadius: 5,
                    opacity: barOpacity,
                  }}
                />
              </View>

              {/* X-axis label */}
              <Text
                numberOfLines={1}
                style={{
                  fontSize: 9,
                  color: isSelected ? color : '#9ca3af',
                  fontWeight: isSelected ? '700' : '400',
                  marginTop: 3,
                  width: BAR_W + 8,
                  textAlign: 'center',
                }}
              >
                {barLabel(item.label, granularity, lang)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
