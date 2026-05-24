import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { subscriptionApi, type SubscriptionData } from '../../services/api';
import { SUPPORT } from '../../utils/constants';
import { useTypography } from '../../hooks/useTypography';
import type { SettingsScreenProps } from '../../types/navigation';

const STATUS_STYLES: Record<SubscriptionData['status'], { bg: string; text: string; icon: string }> = {
  ACTIVE: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', icon: 'check-circle' },
  EXPIRED: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', icon: 'alert-circle' },
  SUSPENDED: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', icon: 'pause-circle' },
};

export function SubscriptionScreen({ navigation }: SettingsScreenProps<'Subscription'>) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const typo = useTypography();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['subscription'],
    queryFn: () => subscriptionApi.getCurrent().then((r) => r.data.data),
    staleTime: 5 * 60_000,
  });

  const daysRemaining = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <View
        className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4"
        style={{ paddingTop: insets.top + 12, paddingBottom: 12 }}
      >
        <View className="flex-row items-center mb-0.5">
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} className="mr-3">
            <MaterialCommunityIcons name="chevron-left" size={26} color="#4f46e5" />
          </TouchableOpacity>
          <Text className={`${typo.heading} text-gray-900 dark:text-white flex-1`}>
            {t('settings.subscription.title')}
          </Text>
        </View>
        <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 mt-0.5`}>{t('settings.subscription.hint')}</Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#4f46e5" />
        </View>
      ) : isError ? (
        <View className="flex-1 items-center justify-center px-8">
          <MaterialCommunityIcons name="alert-circle-outline" size={48} color="#d1d5db" />
          <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 text-center mt-3`}>{t('settings.subscription.loadError')}</Text>
          <TouchableOpacity onPress={() => refetch()} className="mt-4 border border-indigo-600 px-5 py-2 rounded-xl">
            <Text className={`${typo.label} font-medium text-indigo-600`}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : data ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 4, gap: 16 }}>
          {/* Plan card */}
          <View className="bg-white dark:bg-gray-800 rounded-2xl p-5">
            <View className="flex-row items-start justify-between mb-4">
              <View>
                <Text className={`${typo.caption} text-gray-500 dark:text-gray-400`}>{t('settings.subscription.planLabel')}</Text>
                <Text className={`${typo.heading} text-gray-900 dark:text-white mt-0.5`}>{data.plan}</Text>
              </View>
              {(() => {
                const s = STATUS_STYLES[data.status] ?? STATUS_STYLES.ACTIVE;
                return (
                  <View className={`flex-row items-center gap-1.5 px-3 py-1.5 rounded-full ${s.bg}`}>
                    <MaterialCommunityIcons name={s.icon as any} size={14} color={data.status === 'ACTIVE' ? '#059669' : data.status === 'EXPIRED' ? '#ef4444' : '#d97706'} />
                    <Text className={`${typo.label} ${s.text}`}>
                      {t(`settings.subscription.status${data.status.charAt(0) + data.status.slice(1).toLowerCase()}`)}
                    </Text>
                  </View>
                );
              })()}
            </View>

            <View className="h-px bg-gray-100 dark:bg-gray-700 mb-4" />

            <View className="gap-4">
              {data.expiresAt ? (
                <View className="flex-row items-center justify-between">
                  <Text className={`${typo.caption} text-gray-500 dark:text-gray-400`}>
                    {t('settings.subscription.expiresAt', { date: formatDate(data.expiresAt) })}
                  </Text>
                  <Text className={`${typo.label} text-amber-600`}>
                    {t('settings.subscription.daysRemaining', { days: daysRemaining(data.expiresAt) })}
                  </Text>
                </View>
              ) : (
                <View className="flex-row items-center justify-between">
                  <Text className={`${typo.caption} text-gray-500 dark:text-gray-400`}>
                    {t('settings.subscription.expiresAt', { date: '—' })}
                  </Text>
                </View>
              )}

              <View className="flex-row items-center justify-between">
                <Text className={`${typo.caption} text-gray-500 dark:text-gray-400`}>
                  {t('settings.subscription.usersLabel')}
                </Text>
                <Text className={`${typo.caption} font-medium text-gray-700 dark:text-gray-300`}>
                  {data.maxUsers == null
                    ? t('settings.subscription.usersUnlimited', { current: data.currentUsers })
                    : t('settings.subscription.usersValue', { current: data.currentUsers, max: data.maxUsers })}
                </Text>
              </View>

              {/* Monthly order usage */}
              <View>
                <View className="flex-row items-center justify-between mb-1.5">
                  <Text className={`${typo.caption} text-gray-500 dark:text-gray-400`}>
                    {t('settings.subscription.ordersLabel')}
                  </Text>
                  <Text className={`${typo.caption} font-medium text-gray-700 dark:text-gray-300`}>
                    {data.maxOrdersPerMonth == null
                      ? t('settings.subscription.ordersUnlimited', { current: data.currentMonthOrders.toLocaleString() })
                      : t('settings.subscription.ordersValue', { current: data.currentMonthOrders.toLocaleString(), max: data.maxOrdersPerMonth.toLocaleString() })}
                  </Text>
                </View>
                {data.maxOrdersPerMonth != null && (() => {
                  const pct = Math.min(1, data.currentMonthOrders / data.maxOrdersPerMonth);
                  const barColor = pct >= 0.9 ? '#ef4444' : pct >= 0.7 ? '#f59e0b' : '#4f46e5';
                  return (
                    <View className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <View style={{ width: `${pct * 100}%`, backgroundColor: barColor }} className="h-full rounded-full" />
                    </View>
                  );
                })()}
              </View>
            </View>
          </View>

          {/* Features */}
          {data.features.length > 0 && (
            <View className="bg-white dark:bg-gray-800 rounded-2xl p-4">
              <Text className={`${typo.label} text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3`}>
                {t('settings.subscription.featuresLabel')}
              </Text>
              <View className="gap-2">
                {data.features.map((f) => (
                  <View key={f} className="flex-row items-center gap-2">
                    <MaterialCommunityIcons name="check" size={16} color="#4f46e5" />
                    <Text className={`${typo.caption} text-gray-700 dark:text-gray-300`}>{f}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Contact */}
          <TouchableOpacity
            onPress={() => Linking.openURL(`tel:${SUPPORT.phone}`)}
            className="bg-indigo-600 rounded-2xl py-4 items-center flex-row justify-center gap-2"
          >
            <MaterialCommunityIcons name="phone" size={18} color="#fff" />
            <Text className={`${typo.labelBold} text-white`}>{t('settings.subscription.contactSupport')}</Text>
          </TouchableOpacity>

          <Text className={`${typo.caption} text-gray-400 text-center`}>{t('settings.subscription.upgradeHint')}</Text>
        </ScrollView>
      ) : null}
    </View>
  );
}
