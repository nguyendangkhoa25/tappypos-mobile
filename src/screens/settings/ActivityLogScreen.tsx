import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useInfiniteQuery, keepPreviousData } from '@tanstack/react-query';
import { activityLogApi, type ActivityLogEntry } from '../../services/api';
import { useTypography } from '../../hooks/useTypography';
import { useFeatureCheck } from '../../hooks/useFeature';
import type { SettingsScreenProps } from '../../types/navigation';

// ── Filter categories ─────────────────────────────────────────────────────────
// `key`     matches activity_log.target_type in the DB ('' = All)
// `feature` is the JWT feature flag that must be present to show this chip;
//            null means the chip is always visible
const CATEGORIES = [
  { key: '',               labelKey: 'filterAll',           icon: 'view-list-outline',            feature: null },
  { key: 'ORDER',          labelKey: 'filterOrder',         icon: 'cart-outline',                 feature: 'ORDER' },
  { key: 'PRODUCT',        labelKey: 'filterProduct',       icon: 'package-variant-closed',       feature: 'PRODUCT' },
  { key: 'CUSTOMER',       labelKey: 'filterCustomer',      icon: 'account-outline',              feature: 'CUSTOMER' },
  { key: 'EMPLOYEE',       labelKey: 'filterEmployee',      icon: 'account-multiple-outline',     feature: 'EMPLOYEE' },
  { key: 'EXPENSE',        labelKey: 'filterExpense',       icon: 'cash-minus',                   feature: 'EXPENSE' },
  { key: 'INVENTORY',      labelKey: 'filterInventory',     icon: 'warehouse',                    feature: 'INVENTORY' },
  { key: 'PAWN',           labelKey: 'filterPawn',          icon: 'handshake-outline',            feature: 'PAWN' },
  { key: 'SALARY',         labelKey: 'filterSalary',        icon: 'currency-usd',                 feature: 'SALARY' },
  { key: 'SALARY_ADVANCE', labelKey: 'filterSalaryAdvance', icon: 'cash-fast',                    feature: 'SALARY' },
  { key: 'VENDOR',         labelKey: 'filterVendor',        icon: 'store-outline',                feature: 'VENDOR' },
  { key: 'PURCHASE_ORDER', labelKey: 'filterPurchaseOrder', icon: 'clipboard-arrow-down-outline', feature: 'VENDOR' },
  { key: 'USER',           labelKey: 'filterUser',          icon: 'account-circle-outline',       feature: null },
];

// ── Dot colour per targetType ─────────────────────────────────────────────────
const TYPE_COLOR: Record<string, string> = {
  ORDER:          '#4f46e5',
  PRODUCT:        '#7c3aed',
  CUSTOMER:       '#2563eb',
  EMPLOYEE:       '#059669',
  EXPENSE:        '#ef4444',
  INVENTORY:      '#0891b2',
  PAWN:           '#d97706',
  SALARY:         '#16a34a',
  SALARY_ADVANCE: '#65a30d',
  VENDOR:         '#db2777',
  PURCHASE_ORDER: '#0369a1',
  USER:           '#6b7280',
};

export function ActivityLogScreen({ navigation }: SettingsScreenProps<'ActivityLog'>) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const typo = useTypography();
  const has = useFeatureCheck();
  const [category, setCategory] = useState('');

  // Only show chips the shop actually has access to
  const visibleCategories = CATEGORIES.filter((c) => !c.feature || has(c.feature));

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['activityLog', category],
    queryFn: ({ pageParam = 0 }) =>
      activityLogApi
        .list({ page: pageParam as number, targetType: category || undefined })
        .then((r) => r.data.data),
    getNextPageParam: (last, pages) =>
      pages.length < last.totalPages ? pages.length : undefined,
    initialPageParam: 0,
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });

  const entries = data?.pages.flatMap((p) => p.content) ?? [];

  const formatDate = useCallback((iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }, []);

  // Translate raw action enum → human-readable label
  const actionLabel = useCallback(
    (action: string) => t(`settings.activityLog.actions.${action}`, { defaultValue: action }),
    [t],
  );

  const handleCategoryChange = useCallback((key: string) => setCategory(key), []);

  const renderItem = useCallback(({ item, index }: { item: ActivityLogEntry; index: number }) => {
    const dotColor = item.targetType ? (TYPE_COLOR[item.targetType] ?? '#9ca3af') : '#9ca3af';
    return (
      <View
        testID={`activity-entry-${index}`}
        className="bg-white dark:bg-gray-800 mx-4 mb-2 rounded-2xl px-4 py-3"
      >
        <View className="flex-row items-start gap-3">
          {/* Coloured dot = targetType indicator */}
          <View
            className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
            style={{ backgroundColor: dotColor }}
          />

          <View className="flex-1">
            {/* Translated action name */}
            <Text className={`${typo.label} text-gray-800 dark:text-gray-200`}>
              {actionLabel(item.action)}
            </Text>

            {/* Human-readable description from the backend */}
            {!!item.description && (
              <Text
                className={`${typo.caption} text-gray-500 dark:text-gray-400 mt-0.5`}
                numberOfLines={2}
              >
                {item.description}
              </Text>
            )}

            {/* Footer: actor · #targetId · date */}
            <View className="flex-row items-center flex-wrap mt-1" style={{ gap: 4 }}>
              <Text className={`${typo.caption} text-gray-400`}>
                {item.actorFullName ?? item.actorUsername}
              </Text>
              {!!item.targetId && (
                <>
                  <Text className={`${typo.caption} text-gray-300 dark:text-gray-600`}>·</Text>
                  <Text className={`${typo.caption} text-gray-400`}>#{item.targetId}</Text>
                </>
              )}
              <Text className={`${typo.caption} text-gray-300 dark:text-gray-600`}>·</Text>
              <Text className={`${typo.caption} text-gray-400`}>{formatDate(item.createdAt)}</Text>
            </View>
          </View>
        </View>
      </View>
    );
  }, [actionLabel, formatDate, typo]);

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <View
        className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4"
        style={{ paddingTop: insets.top + 12, paddingBottom: 12 }}
      >
        <View className="flex-row items-center mb-0.5">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            className="mr-3"
          >
            <MaterialCommunityIcons name="chevron-left" size={26} color="#4f46e5" />
          </TouchableOpacity>
          <Text className={`${typo.heading} text-gray-900 dark:text-white flex-1`}>
            {t('settings.activityLog.title')}
          </Text>
        </View>
        <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 mt-0.5`}>
          {t('settings.activityLog.hint')}
        </Text>
      </View>

      {/* Scrollable filter chips */}
      <View className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
        <FlatList
          horizontal
          data={visibleCategories}
          keyExtractor={(c) => c.key}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 8 }}
          renderItem={({ item: cat }) => {
            const active = category === cat.key;
            return (
              <TouchableOpacity
                onPress={() => handleCategoryChange(cat.key)}
                className={`flex-row items-center gap-1.5 px-3 py-1.5 rounded-full border ${
                  active
                    ? 'bg-indigo-600 border-indigo-600'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600'
                }`}
              >
                <MaterialCommunityIcons
                  name={cat.icon as any}
                  size={13}
                  color={active ? '#fff' : '#9ca3af'}
                />
                <Text
                  className={`${typo.caption} font-medium ${
                    active ? 'text-white' : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {t(`settings.activityLog.${cat.labelKey}`)}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#4f46e5" />
        </View>
      ) : entries.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <MaterialCommunityIcons name="clipboard-text-outline" size={56} color="#d1d5db" />
          <Text className={`${typo.body} text-gray-400 mt-4 text-center`}>
            {t('settings.activityLog.empty')}
          </Text>
          <Text className={`${typo.caption} text-gray-400 mt-1 text-center`}>
            {category
              ? t('settings.activityLog.emptyFilter')
              : t('settings.activityLog.emptyHint')}
          </Text>
        </View>
      ) : (
        <FlatList
          showsVerticalScrollIndicator={false}
          data={entries}
          keyExtractor={(e) => String(e.id)}
          renderItem={renderItem}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: insets.bottom + 16 }}
          onEndReached={() => { if (hasNextPage && !isFetchingNextPage) fetchNextPage(); }}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            isFetchingNextPage
              ? <ActivityIndicator color="#4f46e5" style={{ margin: 16 }} />
              : null
          }
        />
      )}
    </View>
  );
}
