/**
 * Shared ranking-list primitives used by DashboardScreen and ReportScreen.
 * - SectionHeader  — title + optional "Xem tất cả" link
 * - RankRow        — single ranked item: medal/number · name/sub · value
 */
import { memo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTypography } from '../hooks/useTypography';
import { formatVnd } from '../utils/format';
import { Skeleton } from './Skeleton';

export const RANK_ICONS = ['🥇', '🥈', '🥉'];

export const SectionHeader = memo(function SectionHeader({
  title,
  onSeeAll,
}: {
  title: string;
  onSeeAll?: () => void;
}) {
  const typo = useTypography();
  return (
    <View className="flex-row items-center justify-between mb-3">
      <Text className={`${typo.labelBold} text-gray-800 dark:text-gray-100`}>{title}</Text>
      {onSeeAll && (
        <TouchableOpacity onPress={onSeeAll}>
          <Text className={`${typo.caption} font-medium text-indigo-600 dark:text-indigo-400`}>
            Xem tất cả
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
});

export const RankRow = memo(function RankRow({
  rank,
  name,
  sub,
  value,
  loading,
  isHidden,
  onPress,
}: {
  rank: number;
  name: string;
  sub: string;
  value: number;
  loading: boolean;
  isHidden: boolean;
  onPress?: () => void;
}) {
  const typo = useTypography();

  if (loading) return <Skeleton height={44} borderRadius={12} style={{ marginBottom: 8 }} />;

  const inner = (
    <>
      <Text className={`${typo.caption} mr-3 w-6 text-center`}>
        {rank <= 3 ? RANK_ICONS[rank - 1] : `${rank}`}
      </Text>
      <View className="flex-1">
        <Text className={`${typo.label} text-gray-800 dark:text-gray-100`} numberOfLines={1}>
          {name}
        </Text>
        <Text className={`${typo.caption} text-gray-400 dark:text-gray-500`}>{sub}</Text>
      </View>
      <Text className={`${typo.labelBold} text-gray-800 dark:text-gray-100`}>
        {isHidden ? '••••' : formatVnd(value)}
      </Text>
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        className="flex-row items-center py-2.5 border-b border-gray-50 dark:border-gray-700/50 last:border-0"
      >
        {inner}
      </TouchableOpacity>
    );
  }
  return (
    <View className="flex-row items-center py-2.5 border-b border-gray-50 dark:border-gray-700/50 last:border-0">
      {inner}
    </View>
  );
});
