import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { feedbackApi, type FeedbackData } from '../../services/api';
import type { SettingsScreenProps } from '../../types/navigation';

const STATUS_COLORS: Record<FeedbackData['status'], { bg: string; text: string }> = {
  RECEIVED: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400' },
  PROCESSING: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400' },
  RESOLVED: { bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-700 dark:text-indigo-400' },
};

export function FeedbackHistoryScreen({ navigation }: SettingsScreenProps<'FeedbackHistory'>) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['feedbackHistory'],
    queryFn: () => feedbackApi.getMy().then((r) => r.data.data),
    staleTime: 2 * 60_000,
  });

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const categoryLabel = (cat: FeedbackData['category']) =>
    t(`settings.feedbackHistory.category${cat.charAt(0) + cat.slice(1).toLowerCase()}`);

  const statusLabel = (status: FeedbackData['status']) => {
    const map: Record<FeedbackData['status'], string> = {
      RECEIVED: t('settings.feedbackHistory.statusReceived'),
      PROCESSING: t('settings.feedbackHistory.statusProcessing'),
      RESOLVED: t('settings.feedbackHistory.statusResolved'),
    };
    return map[status];
  };

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <View
        className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4"
        style={{ paddingTop: insets.top + 12, paddingBottom: 12 }}
      >
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} className="mr-3">
            <MaterialCommunityIcons name="chevron-left" size={26} color="#4f46e5" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-gray-900 dark:text-white flex-1">
            {t('settings.feedbackHistory.title')}
          </Text>
        </View>
        <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-9">{t('settings.feedbackHistory.hint')}</Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#4f46e5" />
        </View>
      ) : items.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <MaterialCommunityIcons name="message-text-outline" size={56} color="#d1d5db" />
          <Text className="text-base font-semibold text-gray-400 mt-4 text-center">{t('settings.feedbackHistory.empty')}</Text>
          <Text className="text-sm text-gray-400 mt-1 text-center">{t('settings.feedbackHistory.emptyHint')}</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          renderItem={({ item }) => {
            const colors = STATUS_COLORS[item.status] ?? STATUS_COLORS.RECEIVED;
            return (
              <View className="bg-white dark:bg-gray-800 rounded-2xl p-4">
                <View className="flex-row items-start justify-between mb-2">
                  <View className="bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                    <Text className="text-xs font-medium text-gray-600 dark:text-gray-400">{categoryLabel(item.category)}</Text>
                  </View>
                  <View className={`px-3 py-1 rounded-full ${colors.bg}`}>
                    <Text className={`text-xs font-medium ${colors.text}`}>{statusLabel(item.status)}</Text>
                  </View>
                </View>
                <Text className="text-sm text-gray-700 dark:text-gray-300 leading-5" numberOfLines={3}>
                  {item.content}
                </Text>
                <Text className="text-xs text-gray-400 mt-2">{formatDate(item.createdAt)}</Text>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}
