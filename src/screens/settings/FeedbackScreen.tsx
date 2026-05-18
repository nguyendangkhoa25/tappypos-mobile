import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { feedbackApi, type FeedbackData } from '../../services/api';
import { ScreenSkeleton } from '../../components/ScreenSkeleton';
import { useTypography } from '../../hooks/useTypography';

const CATEGORIES = [
  { key: 'BUG', labelKey: 'categoryBug', icon: 'bug-outline' },
  { key: 'IDEA', labelKey: 'categoryIdea', icon: 'lightbulb-outline' },
  { key: 'FEATURE', labelKey: 'categoryFeature', icon: 'star-outline' },
  { key: 'OTHER', labelKey: 'categoryOther', icon: 'dots-horizontal' },
];

const STATUS_FILTERS: Array<FeedbackData['status'] | 'ALL'> = [
  'ALL', 'RECEIVED', 'PROCESSING', 'RESOLVED',
];

const STATUS_COLORS: Record<FeedbackData['status'], { bg: string; text: string }> = {
  RECEIVED:   { bg: 'bg-blue-100 dark:bg-blue-900/30',   text: 'text-blue-700 dark:text-blue-400' },
  PROCESSING: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400' },
  RESOLVED:   { bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-700 dark:text-indigo-400' },
};

type Props = { navigation: { goBack: () => void } };

export function FeedbackScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const typo = useTypography();
  const queryClient = useQueryClient();

  // Form state
  const [category, setCategory] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // Filter state
  const [statusFilter, setStatusFilter] = useState<FeedbackData['status'] | 'ALL'>('ALL');

  // History query — fixed: backend returns Spring Page, access .content
  const { data: allItems = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['feedbackHistory'],
    queryFn: () => feedbackApi.getMy().then((r) => r.data.content),
    staleTime: 2 * 60_000,
  });

  const filtered = statusFilter === 'ALL'
    ? allItems
    : allItems.filter((i) => i.status === statusFilter);

  const mutation = useMutation({
    mutationFn: () => feedbackApi.submit({ category, content }),
    onSuccess: () => {
      setSubmitted(true);
      setCategory('');
      setContent('');
      queryClient.invalidateQueries({ queryKey: ['feedbackHistory'] });
    },
    onError: () => setError(t('common.error')),
  });

  const handleSubmit = () => {
    if (!category) { setError(t('settings.feedback.categoryRequired')); return; }
    if (!content.trim()) { setError(t('settings.feedback.contentRequired')); return; }
    setError('');
    mutation.mutate();
  };

  const statusLabel = (s: FeedbackData['status']) => {
    const map: Record<FeedbackData['status'], string> = {
      RECEIVED:   t('settings.feedbackHistory.statusReceived'),
      PROCESSING: t('settings.feedbackHistory.statusProcessing'),
      RESOLVED:   t('settings.feedbackHistory.statusResolved'),
    };
    return map[s];
  };

  const categoryLabel = (cat: FeedbackData['category']) =>
    t(`settings.feedbackHistory.category${cat.charAt(0) + cat.slice(1).toLowerCase()}`);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const filterLabel = (f: FeedbackData['status'] | 'ALL') =>
    f === 'ALL' ? t('common.all') : statusLabel(f);

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-gray-50 dark:bg-gray-900"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View
        className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4"
        style={{ paddingTop: insets.top + 12, paddingBottom: 12 }}
      >
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} className="mr-3">
            <MaterialCommunityIcons name="chevron-left" size={26} color="#4f46e5" />
          </TouchableOpacity>
          <Text className={`${typo.heading} text-gray-900 dark:text-white flex-1`}>
            {t('settings.feedback.title')}
          </Text>
          {!submitted && (
            <TouchableOpacity onPress={handleSubmit} disabled={mutation.isPending} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              {mutation.isPending ? (
                <ActivityIndicator size="small" color="#4f46e5" />
              ) : (
                <Text className={`${typo.labelBold} text-indigo-600 dark:text-indigo-400`}>
                  {t('settings.feedback.submitBtn')}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>
        <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 mt-1 ml-9`}>{t('settings.feedback.hint')}</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: insets.bottom + 32 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Form / Success ───────────────────────────────────────────── */}
        {submitted ? (
          <View className="bg-white dark:bg-gray-800 rounded-2xl p-5 items-center border border-gray-100 dark:border-gray-700">
            <View className="w-14 h-14 rounded-full bg-indigo-100 dark:bg-indigo-900/30 items-center justify-center mb-3">
              <MaterialCommunityIcons name="check" size={30} color="#4f46e5" />
            </View>
            <Text className={`${typo.labelBold} text-gray-900 dark:text-white text-center`}>
              {t('settings.feedback.successTitle')}
            </Text>
            <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 text-center mt-1`}>
              {t('settings.feedback.successMsg')}
            </Text>
            <TouchableOpacity
              onPress={() => setSubmitted(false)}
              className="mt-4 border border-indigo-600 px-5 py-2.5 rounded-xl"
            >
              <Text className={`${typo.label} text-indigo-600`}>{t('settings.feedback.submitAnother')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Category chips */}
            <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700">
              <View className="flex-row flex-wrap gap-2">
                {CATEGORIES.map((cat) => {
                  const active = category === cat.key;
                  return (
                    <TouchableOpacity
                      key={cat.key}
                      onPress={() => { setCategory(cat.key); setError(''); }}
                      className={`flex-row items-center gap-2 px-4 py-2 rounded-xl border-2 ${
                        active
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                          : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700'
                      }`}
                    >
                      <MaterialCommunityIcons
                        name={cat.icon as any}
                        size={16}
                        color={active ? '#4f46e5' : '#9ca3af'}
                      />
                      <Text className={`${typo.caption} font-medium ${active ? 'text-indigo-700 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-400'}`}>
                        {t(`settings.feedback.${cat.labelKey}`)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Content */}
            <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700">
              <Text className={`${typo.label} text-gray-700 dark:text-gray-300 mb-2`}>
                {t('settings.feedback.contentLabel')}
              </Text>
              <TextInput
                testID="feedback-content-input"
                value={content}
                onChangeText={(v) => { setContent(v.slice(0, 500)); setError(''); }}
                placeholder={t('settings.feedback.contentPlaceholder')}
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                className={`border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 ${typo.inputSize} text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 min-h-[120px]`}
              />
              <Text className={`${typo.caption} text-gray-400 text-right mt-1`}>
                {t('settings.feedback.charCount', { count: content.length })}
              </Text>
            </View>

            {error ? <Text className={`${typo.caption} text-red-500 px-1 -mt-2`}>{error}</Text> : null}
          </>
        )}

        {/* ── History ──────────────────────────────────────────────────── */}
        <View className="flex-row items-center justify-between mt-2">
          <Text className={`${typo.captionBold} text-gray-400 dark:text-gray-500 uppercase tracking-wide px-1`}>
            {t('settings.feedbackHistory.title')}
          </Text>
          {!isLoading && allItems.length > 0 && (
            <Text className={`${typo.caption} text-gray-400 dark:text-gray-500`}>
              {allItems.length}
            </Text>
          )}
        </View>

        {/* Status filter chips */}
        {!isLoading && allItems.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mt-2">
            <View className="flex-row gap-2 py-1">
              {STATUS_FILTERS.map((f) => {
                const active = statusFilter === f;
                return (
                  <TouchableOpacity
                    key={f}
                    onPress={() => setStatusFilter(f)}
                    className={`px-4 py-1.5 rounded-full border ${
                      active
                        ? 'bg-indigo-600 border-indigo-600'
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600'
                    }`}
                  >
                    <Text className={`${typo.captionBold} ${active ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                      {filterLabel(f)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        )}

        {/* List */}
        {isError ? (
          <TouchableOpacity onPress={() => refetch()} className="bg-white dark:bg-gray-800 rounded-2xl p-4 items-center border border-gray-100 dark:border-gray-700">
            <Text className={`${typo.caption} text-gray-500 dark:text-gray-400`}>{t('common.errorStateMsg')}</Text>
            <Text className={`${typo.label} text-indigo-600 mt-1`}>{t('common.retry')}</Text>
          </TouchableOpacity>
        ) : isLoading ? (
          <ScreenSkeleton count={3} cardHeight={90} />
        ) : filtered.length === 0 ? (
          <View className="bg-white dark:bg-gray-800 rounded-2xl p-6 items-center border border-gray-100 dark:border-gray-700">
            <MaterialCommunityIcons name="message-text-outline" size={40} color="#d1d5db" />
            <Text className={`${typo.label} text-gray-400 mt-3 text-center`}>
              {allItems.length === 0
                ? t('settings.feedbackHistory.empty')
                : t('common.all') + ': 0'}
            </Text>
            {allItems.length === 0 && (
              <Text className={`${typo.caption} text-gray-400 mt-1 text-center`}>
                {t('settings.feedbackHistory.emptyHint')}
              </Text>
            )}
          </View>
        ) : (
          <View className="gap-3">
            {filtered.map((item) => {
              const colors = STATUS_COLORS[item.status] ?? STATUS_COLORS.RECEIVED;
              return (
                <View key={item.id} className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700">
                  <View className="flex-row items-start justify-between mb-2">
                    <View className="bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                      <Text className={`${typo.captionBold} text-gray-600 dark:text-gray-400`}>
                        {categoryLabel(item.category)}
                      </Text>
                    </View>
                    <View className={`px-3 py-1 rounded-full ${colors.bg}`}>
                      <Text className={`${typo.captionBold} ${colors.text}`}>
                        {statusLabel(item.status)}
                      </Text>
                    </View>
                  </View>
                  <Text className={`${typo.caption} text-gray-700 dark:text-gray-300 leading-5`} numberOfLines={3}>
                    {item.content}
                  </Text>
                  <Text className={`${typo.caption} text-gray-400 mt-2`}>{formatDate(item.createdAt)}</Text>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
