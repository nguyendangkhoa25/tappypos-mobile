import { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { formatVnd } from '../utils/format';
import { useTypography } from '../hooks/useTypography';

export type BarChartDataPoint = { label: string; value: number };

export type ChartGranularity = 'hour' | 'day' | 'week' | 'month' | 'year';

// ── Shared label helpers (also used by NetChart) ─────────────────────────────

const MONTH_VI_LABELS = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];
const MONTH_EN_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function barLabel(raw: string, granularity: ChartGranularity, lang: string): string {
  const isVi = lang === 'vi';
  try {
    if (granularity === 'hour') {
      const h = parseInt(raw.split(':')[0] ?? raw, 10);
      return `${h}h`;
    }
    if (granularity === 'day' || granularity === 'week') {
      const d = new Date(raw + 'T00:00:00');
      return isVi ? `${d.getDate()}/${d.getMonth() + 1}` : `${d.getMonth() + 1}/${d.getDate()}`;
    }
    if (granularity === 'month') {
      const m = parseInt((raw.split('-')[1] ?? '1'), 10) - 1;
      return (isVi ? MONTH_VI_LABELS : MONTH_EN_LABELS)[m] ?? raw;
    }
    if (granularity === 'year') return raw;
  } catch { /* ignore */ }
  return raw;
}

export function tooltipLabel(raw: string, granularity: ChartGranularity, lang: string): string {
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
        ? `${start.getDate()}/${start.getMonth() + 1} – ${end.getDate()}/${end.getMonth() + 1}`
        : `${start.getMonth() + 1}/${start.getDate()} – ${end.getMonth() + 1}/${end.getDate()}`;
    }
    if (granularity === 'month') {
      const parts = raw.split('-');
      const m = parseInt(parts[1] ?? '1', 10) - 1;
      const yr = (parts[0] ?? '').slice(2);
      return isVi
        ? `${MONTH_VI_LABELS[m] ?? parts[1]}/${yr}`
        : `${MONTH_EN_LABELS[m] ?? parts[1]}/${yr}`;
    }
    if (granularity === 'year') return raw;
  } catch { /* ignore */ }
  return raw;
}

type Props = {
  data: BarChartDataPoint[];
  color?: string;
  /** Optional second data series — renders paired bars when provided */
  secondaryData?: BarChartDataPoint[];
  secondaryColor?: string;
  /**
   * When true and secondaryData is present: renders one stacked bar per bucket
   * (primary on top, secondary on bottom) instead of side-by-side paired bars.
   */
  stacked?: boolean;
  granularity?: ChartGranularity;
  height?: number;
  lang?: string;
};

const SINGLE_BAR_W = 26;
const DUAL_BAR_W   = 18;
const DUAL_GAP     = 3;
const CHART_H      = 110;
const VALUE_H      = 16;
const LABEL_H      = 24;
const TOOLTIP_H    = 36;
const TOTAL_H      = TOOLTIP_H + VALUE_H + CHART_H + LABEL_H;

function compactVnd(n: number): string {
  if (n === 0) return '0';
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000_000) return `${sign}${+(abs / 1_000_000_000).toFixed(1)}T`;
  if (abs >= 1_000_000) return `${sign}${+(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}${+(abs / 1_000).toFixed(0)}K`;
  return `${sign}${Math.round(n)}`;
}


export function BarChart({
  data,
  color = '#4f46e5',
  secondaryData,
  secondaryColor = '#f43f5e',
  stacked,
  granularity = 'day',
  height = TOTAL_H,
  lang = 'vi',
}: Props) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const typo = useTypography();

  const isDual     = (secondaryData?.length ?? 0) > 0;
  const isStacked  = stacked === true && isDual;
  const barW       = isStacked ? SINGLE_BAR_W : isDual ? DUAL_BAR_W : SINGLE_BAR_W;
  const itemW      = isStacked ? SINGLE_BAR_W + 8 : isDual ? DUAL_BAR_W * 2 + DUAL_GAP + 8 : SINGLE_BAR_W + 8;

  // O(1) label → value lookup for the secondary series
  const secMap = useMemo<Map<string, number>>(
    () => new Map(secondaryData?.map((d) => [d.label, d.value]) ?? []),
    [secondaryData],
  );

  if (data.length === 0) return null;

  const maxVal = isStacked
    ? Math.max(...data.map((d) => d.value + (secMap.get(d.label) ?? 0)), 1)
    : Math.max(
        ...data.map((d) => Math.abs(d.value)),
        ...(isDual ? Array.from(secMap.values()).map(Math.abs) : []),
        1,
      );

  const peakIdx = isStacked
    ? data.reduce((mi, d, i) => {
        const ti = d.value + (secMap.get(d.label) ?? 0);
        const tm = data[mi]!.value + (secMap.get(data[mi]!.label) ?? 0);
        return ti > tm ? i : mi;
      }, 0)
    : data.reduce(
        (mi, d, i) => (Math.abs(d.value) > Math.abs(data[mi]!.value) ? i : mi),
        0,
      );

  const selected    = selectedIdx !== null ? data[selectedIdx] : null;
  const selectedSec = isDual && selected != null ? (secMap.get(selected.label) ?? 0) : null;

  return (
    <View style={{ height }}>
      {/* ── Tooltip pill — always reserves space ── */}
      <View style={{ height: TOOLTIP_H, justifyContent: 'center', alignItems: 'center' }}>
        {selected != null && (
          isStacked ? (
            // Stacked: date pill + revenue pill (emerald) + expense pill (rose)
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View
                style={{
                  backgroundColor: '#374151',
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 20,
                }}
              >
                <Text className={`${typo.caption} font-semibold text-white`}>
                  {tooltipLabel(selected.label, granularity, lang)}
                </Text>
              </View>
              <View
                style={{
                  backgroundColor: color,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 20,
                }}
              >
                <Text className={`${typo.caption} font-bold text-white`}>
                  {formatVnd(selected.value)}
                </Text>
              </View>
              <View
                style={{
                  backgroundColor: secondaryColor,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 20,
                }}
              >
                <Text className={`${typo.caption} font-bold text-white`}>
                  {formatVnd(selectedSec ?? 0)}
                </Text>
              </View>
            </View>
          ) : isDual ? (
            // Two pills side-by-side: date + primary value | secondary value
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: color,
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 20,
                  gap: 4,
                }}
              >
                <Text className={`${typo.caption} font-semibold text-white`}>
                  {tooltipLabel(selected.label, granularity, lang)}
                </Text>
                <Text className={typo.caption} style={{ color: 'rgba(255,255,255,0.55)' }}>·</Text>
                <Text className={`${typo.caption} font-bold text-white`}>
                  {formatVnd(selected.value)}
                </Text>
              </View>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: secondaryColor,
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 20,
                }}
              >
                <Text className={`${typo.caption} font-bold text-white`}>
                  {formatVnd(selectedSec ?? 0)}
                </Text>
              </View>
            </View>
          ) : (
            // Single pill
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
              <Text className={typo.caption} style={{ color: 'rgba(255,255,255,0.55)' }}>·</Text>
              <Text className={`${typo.caption} font-bold text-white`}>
                {formatVnd(selected.value)}
              </Text>
            </View>
          )
        )}
      </View>

      {/* ── Bars — horizontally scrollable ── */}
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
          const barH       = Math.max((Math.abs(item.value) / maxVal) * CHART_H, item.value !== 0 ? 3 : 0);
          const isPeak     = i === peakIdx && item.value !== 0;
          const isSelected = i === selectedIdx;
          const barOpacity = isPeak || isSelected ? 1 : 0.6;

          const secValue   = isDual ? (secMap.get(item.label) ?? 0) : 0;
          const secBarH    = isDual ? Math.max((Math.abs(secValue) / maxVal) * CHART_H, secValue !== 0 ? 3 : 0) : 0;
          const secOpacity = isSelected ? 1 : 0.6;

          // ── Stacked bar variables (only used when isStacked) ────────────────
          const stackedRev   = item.value;
          const stackedExp   = isDual ? (secMap.get(item.label) ?? 0) : 0;
          const stackedTotal = stackedRev + stackedExp;
          const stackedTotalH = isStacked
            ? Math.max((stackedTotal / maxVal) * CHART_H, stackedTotal > 0 ? 3 : 0)
            : 0;
          const stackedExpH  = isStacked && stackedTotal > 0
            ? Math.round((stackedExp / stackedTotal) * stackedTotalH)
            : 0;
          const stackedRevH  = stackedTotalH - stackedExpH;
          const stackedRadius = Math.min(5, stackedTotalH / 2);
          const isStackedPeak = isStacked && stackedTotal > 0 && i === peakIdx;

          return (
            <Pressable
              key={i}
              onPress={() => setSelectedIdx(isSelected ? null : i)}
              style={{ width: itemW, alignItems: 'center' }}
            >
              {/* Peak value label */}
              <View style={{ height: VALUE_H, justifyContent: 'flex-end' }}>
                {(isStacked ? isStackedPeak : isPeak) && (
                  <Text className={`${typo.caption} font-bold text-center`} style={{ color }}>
                    {isStacked ? compactVnd(stackedTotal) : compactVnd(item.value)}
                  </Text>
                )}
              </View>

              {/* Bar(s) */}
              {isStacked ? (
                // One stacked bar: revenue (primary color) on top, expenses (secondary) on bottom
                <View style={{ height: CHART_H, width: barW, justifyContent: 'flex-end' }}>
                  {stackedTotal > 0 && (
                    <View
                      style={{
                        width: barW,
                        height: stackedTotalH,
                        borderRadius: stackedRadius,
                        overflow: 'hidden',
                        opacity: isSelected ? 1 : 0.65,
                      }}
                    >
                      <View style={{ height: stackedRevH, backgroundColor: color }} />
                      <View style={{ height: stackedExpH, backgroundColor: secondaryColor }} />
                    </View>
                  )}
                </View>
              ) : isDual ? (
                // Grouped dual bars
                <View
                  style={{
                    height: CHART_H,
                    flexDirection: 'row',
                    alignItems: 'flex-end',
                    gap: DUAL_GAP,
                  }}
                >
                  <View style={{ height: CHART_H, width: barW, justifyContent: 'flex-end' }}>
                    <View style={{ height: barH, width: barW, backgroundColor: color, borderRadius: 5, opacity: barOpacity }} />
                  </View>
                  <View style={{ height: CHART_H, width: barW, justifyContent: 'flex-end' }}>
                    <View style={{ height: secBarH, width: barW, backgroundColor: secondaryColor, borderRadius: 5, opacity: secOpacity }} />
                  </View>
                </View>
              ) : (
                // Single bar
                <View style={{ height: CHART_H, width: barW, justifyContent: 'flex-end' }}>
                  <View style={{ height: barH, width: barW, backgroundColor: color, borderRadius: 5, opacity: barOpacity }} />
                </View>
              )}

              {/* X-axis label */}
              <Text
                numberOfLines={1}
                className={`${typo.caption} text-center`}
                style={{
                  color: isSelected ? color : '#9ca3af',
                  fontWeight: isSelected ? '700' : '400',
                  marginTop: 3,
                  width: itemW,
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
