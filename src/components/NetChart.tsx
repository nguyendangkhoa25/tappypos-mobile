/**
 * NetChart — zero-centered bar chart for signed data (profit/loss, running balance).
 *
 * - Bars above the midline = positive (emerald)
 * - Bars below the midline = negative (rose)
 * - Tap to show a tooltip with the exact value
 *
 * Used by ReportScreen for:
 *   1. Net profit per period  (revenue − expenses each bucket)
 *   2. Running balance        (cumulative net over the selected range)
 */
import { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useTypography } from '../hooks/useTypography';
import { formatVnd } from '../utils/format';
import { barLabel, tooltipLabel } from './BarChart';
import type { ChartGranularity } from './BarChart';

export type NetChartDataPoint = { label: string; value: number };

type Props = {
  data: NetChartDataPoint[];
  granularity?: ChartGranularity;
  lang?: string;
};

const BAR_W     = 22;
const ITEM_W    = BAR_W + 8;
const HALF_H    = 52;      // px above AND below the zero line
const CHART_H   = HALF_H * 2;
const TOOLTIP_H = 36;
const LABEL_H   = 22;
const TOTAL_H   = TOOLTIP_H + CHART_H + LABEL_H;

const PROFIT_COLOR = '#059669'; // emerald-600
const LOSS_COLOR   = '#f43f5e'; // rose-500
const ZERO_COLOR   = '#e5e7eb'; // gray-200

export function NetChart({ data, granularity = 'day', lang = 'vi' }: Props) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const typo = useTypography();

  if (data.length === 0 || data.every((d) => d.value === 0)) return null;

  const maxAbs   = Math.max(...data.map((d) => Math.abs(d.value)), 1);
  const selected = selectedIdx != null ? data[selectedIdx] : null;

  return (
    <View style={{ height: TOTAL_H }}>
      {/* ── Tooltip pill — always reserves space ── */}
      <View style={{ height: TOOLTIP_H, justifyContent: 'center', alignItems: 'center' }}>
        {selected != null && (() => {
          const isPos   = selected.value >= 0;
          const bgColor = isPos ? PROFIT_COLOR : LOSS_COLOR;
          return (
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 6,
              backgroundColor: bgColor,
              paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
            }}>
              <Text className={`${typo.caption} font-semibold text-white`}>
                {tooltipLabel(selected.label, granularity, lang)}
              </Text>
              <Text className={typo.caption} style={{ color: 'rgba(255,255,255,0.55)' }}>·</Text>
              <Text className={`${typo.caption} font-bold text-white`}>
                {isPos ? '+' : ''}{formatVnd(selected.value)}
              </Text>
            </View>
          );
        })()}
      </View>

      {/* ── Zero-centred bars + x-axis labels ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 8,
          alignItems: 'center',
          minWidth: '100%',
        }}
        style={{ height: CHART_H + LABEL_H }}
      >
        {data.map((item, i) => {
          const isSelected = i === selectedIdx;
          const isPos      = item.value >= 0;
          const barColor   = isPos ? PROFIT_COLOR : LOSS_COLOR;
          const barH       = Math.max((Math.abs(item.value) / maxAbs) * HALF_H, item.value !== 0 ? 3 : 0);
          const opacity    = isSelected ? 1 : 0.65;

          return (
            <Pressable
              key={i}
              onPress={() => setSelectedIdx(isSelected ? null : i)}
              style={{ width: ITEM_W, alignItems: 'center' }}
            >
              {/* Chart cell */}
              <View style={{ height: CHART_H, width: BAR_W, position: 'relative' }}>
                {/* Zero line */}
                <View style={{
                  position: 'absolute',
                  top: HALF_H - 0.5,
                  left: 0, right: 0,
                  height: 1,
                  backgroundColor: ZERO_COLOR,
                }} />

                {/* Bar — grows up from zero for profits, down for losses */}
                {isPos ? (
                  <View style={{
                    position: 'absolute',
                    bottom: HALF_H,
                    left: 0, right: 0,
                    height: barH,
                    backgroundColor: barColor,
                    borderTopLeftRadius: 4, borderTopRightRadius: 4,
                    opacity,
                  }} />
                ) : (
                  <View style={{
                    position: 'absolute',
                    top: HALF_H,
                    left: 0, right: 0,
                    height: barH,
                    backgroundColor: barColor,
                    borderBottomLeftRadius: 4, borderBottomRightRadius: 4,
                    opacity,
                  }} />
                )}
              </View>

              {/* X-axis label */}
              <Text
                numberOfLines={1}
                className={`${typo.caption} text-center`}
                style={{
                  color: isSelected ? barColor : '#9ca3af',
                  fontWeight: isSelected ? '700' : '400',
                  marginTop: 3,
                  width: ITEM_W,
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
