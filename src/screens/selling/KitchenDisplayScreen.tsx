/**
 * KitchenDisplayScreen — real-time kitchen order board.
 *
 * Shows all PENDING + IN_PROGRESS orders for the tenant, oldest first.
 * Auto-refreshes every 15 seconds. Kitchen staff can tap each item to
 * cycle its status: PENDING → IN_PROGRESS → COMPLETED → PENDING (undo).
 */

import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { kitchenApi, type KitchenOrder, type KitchenOrderItem } from '../../services/api';
import { useErrorAlert } from '../../hooks/useErrorAlert';
import { useTypography } from '../../hooks/useTypography';
import { EmptyState } from '../../components/EmptyState';

// ── helpers ──────────────────────────────────────────────────────────────────

function formatElapsed(createdAt: string): string {
  const diff = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60_000);
  if (diff < 60) return `${diff}p`;
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return m > 0 ? `${h}g${m}p` : `${h}g`;
}

type ItemStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';

const STATUS_STYLES: Record<ItemStatus, { badge: string; text: string; dot: string }> = {
  PENDING:     { badge: 'bg-gray-100 dark:bg-gray-700',   text: 'text-gray-500 dark:text-gray-400',   dot: 'bg-gray-400' },
  IN_PROGRESS: { badge: 'bg-amber-100 dark:bg-amber-900/40', text: 'text-amber-700 dark:text-amber-400', dot: 'bg-amber-400' },
  COMPLETED:   { badge: 'bg-green-100 dark:bg-green-900/40', text: 'text-green-700 dark:text-green-400', dot: 'bg-green-500' },
};

// ── KitchenItemRow ────────────────────────────────────────────────────────────

function KitchenItemRow({
  item,
  onBump,
  bumping,
}: {
  item: KitchenOrderItem;
  onBump: (id: number) => void;
  bumping: boolean;
}) {
  const { t } = useTranslation();
  const typo = useTypography();
  const status = (item.itemStatus ?? 'PENDING') as ItemStatus;
  const styles = STATUS_STYLES[status];

  return (
    <View className="flex-row items-start py-2 gap-3">
      {/* Qty bubble */}
      <View className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-700 items-center justify-center flex-shrink-0 mt-0.5">
        <Text className={`${typo.captionBold} text-gray-700 dark:text-gray-200`}>{item.quantity}</Text>
      </View>

      {/* Name + note */}
      <View className="flex-1 min-w-0">
        <Text
          className={`${typo.label} ${
            status === 'COMPLETED' ? 'text-gray-400 dark:text-gray-600 line-through' : 'text-gray-800 dark:text-gray-100'
          }`}
          numberOfLines={2}
        >
          {item.productName}
        </Text>
        {item.note ? (
          <Text className={`${typo.caption} text-amber-600 dark:text-amber-400 italic mt-0.5`} numberOfLines={1}>
            → {item.note}
          </Text>
        ) : null}
      </View>

      {/* Status tap badge */}
      <TouchableOpacity
        onPress={() => onBump(item.id)}
        disabled={bumping}
        className={`flex-row items-center gap-1 rounded-full px-2.5 py-1 ${styles.badge} ${bumping ? 'opacity-50' : 'active:opacity-70'}`}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      >
        {bumping ? (
          <ActivityIndicator size="small" color="#6b7280" />
        ) : (
          <>
            <View className={`w-1.5 h-1.5 rounded-full ${styles.dot}`} />
            <Text className={`${typo.captionBold} ${styles.text}`}>
              {t(`kitchen.itemStatus.${status}`)}
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

// ── helpers ───────────────────────────────────────────────────────────────────

function formatPickupTime(isoString: string): string {
  const d = new Date(isoString);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// ── KitchenOrderCard ──────────────────────────────────────────────────────────

function KitchenOrderCard({
  order,
  onBump,
  bumpingId,
}: {
  order: KitchenOrder;
  onBump: (itemId: number) => void;
  bumpingId: number | null;
}) {
  const { t } = useTranslation();
  const typo = useTypography();

  const isTakeaway = !!order.pickupTime;
  const allDone = order.items.every((i) => (i.itemStatus ?? 'PENDING') === 'COMPLETED');
  const elapsed = formatElapsed(order.createdAt);

  // Card border colour: done=green, takeaway=amber, dine-in=default
  const cardClass = allDone
    ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
    : isTakeaway
      ? 'bg-amber-50 dark:bg-amber-900/10 border-2 border-amber-400 dark:border-amber-600'
      : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700';

  const headerClass = allDone
    ? 'bg-green-100/60 dark:bg-green-900/20 border-green-200 dark:border-green-800'
    : isTakeaway
      ? 'bg-amber-100/60 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700'
      : 'bg-gray-50 dark:bg-gray-700/50 border-gray-100 dark:border-gray-700';

  return (
    <View className={`rounded-2xl mb-3 overflow-hidden border ${cardClass}`}>
      {/* Card header */}
      <View className={`flex-row items-center px-4 py-2.5 border-b ${headerClass}`}>
        {isTakeaway ? (
          <MaterialCommunityIcons
            name="moped"
            size={15}
            color={allDone ? '#16a34a' : '#d97706'}
          />
        ) : (
          <MaterialCommunityIcons
            name={allDone ? 'check-circle' : 'silverware-fork-knife'}
            size={15}
            color={allDone ? '#16a34a' : '#4f46e5'}
          />
        )}
        <Text
          className={`${typo.labelBold} ml-1.5 flex-1 ${
            allDone
              ? 'text-green-700 dark:text-green-400'
              : isTakeaway
                ? 'text-amber-700 dark:text-amber-400'
                : 'text-gray-800 dark:text-white'
          }`}
        >
          {isTakeaway
            ? `🛵 ${order.tableLabel ?? t('kitchen.takeaway')}`
            : (order.tableLabel ?? t('kitchen.noTable'))}
        </Text>
        <Text className={`${typo.caption} text-gray-400 mr-2`}>
          {t('kitchen.order', { number: order.orderNumber })}
        </Text>
        <View
          className={`flex-row items-center gap-1 rounded-full px-2 py-0.5 ${
            allDone ? 'bg-green-200 dark:bg-green-800' : 'bg-amber-100 dark:bg-amber-900/30'
          }`}
        >
          <MaterialCommunityIcons name="clock-outline" size={11} color={allDone ? '#16a34a' : '#d97706'} />
          <Text
            className={`${typo.captionBold} ${allDone ? 'text-green-700 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}
           
          >
            {elapsed}
          </Text>
        </View>
      </View>

      {/* Pickup time strip (takeaway only) */}
      {isTakeaway && order.pickupTime && (
        <View className="flex-row items-center gap-1.5 px-4 py-1.5 bg-amber-50 dark:bg-amber-900/10 border-b border-amber-200 dark:border-amber-800">
          <MaterialCommunityIcons name="alarm" size={13} color="#d97706" />
          <Text className={`${typo.captionBold} text-amber-700 dark:text-amber-400`}>
            {t('kitchen.pickupAt', { time: formatPickupTime(order.pickupTime) })}
          </Text>
        </View>
      )}

      {/* Items */}
      <View className="px-4 py-1 divide-y divide-gray-100 dark:divide-gray-700">
        {order.items.map((item) => (
          <KitchenItemRow
            key={item.id}
            item={item}
            onBump={onBump}
            bumping={bumpingId === item.id}
          />
        ))}
      </View>

      {/* All-done footer */}
      {allDone && (
        <View className="flex-row items-center justify-center gap-1.5 py-2 bg-green-100/60 dark:bg-green-900/20 border-t border-green-200 dark:border-green-800">
          <MaterialCommunityIcons name="check-all" size={14} color="#16a34a" />
          <Text className={`${typo.captionBold} text-green-700 dark:text-green-400`}>
            {t('kitchen.allDone')}
          </Text>
        </View>
      )}
    </View>
  );
}

// ── KitchenDisplayScreen ──────────────────────────────────────────────────────

export function KitchenDisplayScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const typo = useTypography();
  const navigation = useNavigation();
  const qc = useQueryClient();
  const showErrorAlert = useErrorAlert();

  const { data: orders = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ['kitchen-orders'],
    queryFn: () => kitchenApi.getOrders().then((r) => r.data.data),
    refetchInterval: 15_000,
    staleTime: 0,
  });

  // Track which item is being bumped (per-item spinner)
  const [bumpingId, setBumpingId] = useState<number | null>(null);

  const handleBump = useCallback(async (itemId: number) => {
    if (bumpingId !== null) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setBumpingId(itemId);
    try {
      const res = await kitchenApi.bumpItem(itemId);
      const updated = res.data.data;
      // patch the item in cache without a full network round-trip
      qc.setQueryData<KitchenOrder[]>(['kitchen-orders'], (prev) =>
        (prev ?? []).map((order) => ({
          ...order,
          items: order.items.map((i) =>
            i.id === itemId ? { ...i, itemStatus: updated.itemStatus } : i,
          ),
        })),
      );
    } catch (e) {
      showErrorAlert(e);
      refetch();
    } finally {
      setBumpingId(null);
    }
  }, [bumpingId, qc, showErrorAlert, refetch]);

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          className="mr-3 p-1"
        >
          <MaterialCommunityIcons name="arrow-left" size={22} color="#6b7280" />
        </TouchableOpacity>
        <MaterialCommunityIcons name="chef-hat" size={18} color="#4f46e5" />
        <Text className={`${typo.heading} text-gray-900 dark:text-white ml-2 flex-1`}>
          {t('kitchen.title')}
        </Text>
        {/* Active order count badge */}
        {orders.length > 0 && (
          <View className="bg-red-500 rounded-full min-w-[22px] h-5.5 px-1.5 items-center justify-center mr-2">
            <Text className="text-white text-xs font-bold">{orders.length}</Text>
          </View>
        )}
        {/* Auto-refresh indicator */}
        {isFetching && !isLoading && (
          <ActivityIndicator size="small" color="#4f46e5" className="mr-1" />
        )}
        <TouchableOpacity
          onPress={() => refetch()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          className="p-1"
        >
          <MaterialCommunityIcons name="refresh" size={20} color="#6b7280" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#4f46e5" />
        </View>
      ) : orders.length === 0 ? (
        <EmptyState
          icon="🍳"
          title={t('kitchen.empty')}
          description={t('kitchen.emptyHint')}
        />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <KitchenOrderCard
              order={item}
              onBump={handleBump}
              bumpingId={bumpingId}
            />
          )}
          contentContainerStyle={{
            padding: 12,
            paddingBottom: insets.bottom + 16,
          }}
          refreshControl={
            <RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => refetch()} colors={['#4f46e5']} />
          }
        />
      )}
    </View>
  );
}
