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
import { useMutation } from '@tanstack/react-query';
import { feedbackApi } from '../../services/api';
import type { SettingsScreenProps } from '../../types/navigation';

const CATEGORIES = [
  { key: 'BUG', labelKey: 'categoryBug', icon: 'bug-outline' },
  { key: 'IDEA', labelKey: 'categoryIdea', icon: 'lightbulb-outline' },
  { key: 'FEATURE', labelKey: 'categoryFeature', icon: 'star-outline' },
  { key: 'OTHER', labelKey: 'categoryOther', icon: 'dots-horizontal' },
];

export function FeedbackScreen({ navigation }: SettingsScreenProps<'Feedback'>) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const [category, setCategory] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const mutation = useMutation({
    mutationFn: () => feedbackApi.submit({ category, content }),
    onSuccess: () => setSubmitted(true),
    onError: () => setError(t('common.error')),
  });

  const handleSubmit = () => {
    if (!category) { setError(t('settings.feedback.categoryRequired')); return; }
    if (!content.trim()) { setError(t('settings.feedback.contentRequired')); return; }
    setError('');
    mutation.mutate();
  };

  if (submitted) {
    return (
      <View className="flex-1 bg-gray-50 dark:bg-gray-900">
        <View
          className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 flex-row items-center px-4"
          style={{ paddingTop: insets.top + 12, paddingBottom: 12 }}
        >
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} className="mr-3">
            <MaterialCommunityIcons name="chevron-left" size={26} color="#4f46e5" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-gray-900 dark:text-white flex-1">
            {t('settings.feedback.title')}
          </Text>
        </View>
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-20 h-20 rounded-full bg-indigo-100 dark:bg-indigo-900/30 items-center justify-center mb-4">
            <MaterialCommunityIcons name="check" size={40} color="#4f46e5" />
          </View>
          <Text className="text-xl font-bold text-gray-900 dark:text-white text-center">{t('settings.feedback.successTitle')}</Text>
          <Text className="text-sm text-gray-500 dark:text-gray-400 text-center mt-2">{t('settings.feedback.successMsg')}</Text>
          <TouchableOpacity
            onPress={() => { setSubmitted(false); setCategory(''); setContent(''); }}
            className="mt-8 border border-indigo-600 px-6 py-3 rounded-2xl"
          >
            <Text className="text-indigo-600 font-semibold">{t('settings.feedback.submitAnother')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-gray-50 dark:bg-gray-900"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View
        className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4"
        style={{ paddingTop: insets.top + 12, paddingBottom: 12 }}
      >
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} className="mr-3">
            <MaterialCommunityIcons name="chevron-left" size={26} color="#4f46e5" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-gray-900 dark:text-white flex-1">
            {t('settings.feedback.title')}
          </Text>
        </View>
        <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-9">{t('settings.feedback.hint')}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }} keyboardShouldPersistTaps="handled">
        {/* Category */}
        <View className="bg-white dark:bg-gray-800 rounded-2xl p-4">
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
                  <Text className={`text-sm font-medium ${active ? 'text-indigo-700 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-400'}`}>
                    {t(`settings.feedback.${cat.labelKey}`)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Content */}
        <View className="bg-white dark:bg-gray-800 rounded-2xl p-4">
          <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            {t('settings.feedback.contentLabel')}
          </Text>
          <TextInput
            value={content}
            onChangeText={(v) => { setContent(v.slice(0, 500)); setError(''); }}
            placeholder={t('settings.feedback.contentPlaceholder')}
            placeholderTextColor="#9ca3af"
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            className="border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 text-base text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 min-h-[140px]"
          />
          <Text className="text-xs text-gray-400 text-right mt-1">
            {t('settings.feedback.charCount', { count: content.length })}
          </Text>
        </View>

        {error ? (
          <Text className="text-red-500 text-sm px-1">{error}</Text>
        ) : null}

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={mutation.isPending}
          className={`rounded-2xl py-4 items-center ${mutation.isPending ? 'bg-gray-200 dark:bg-gray-700' : 'bg-indigo-600 active:opacity-80'}`}
        >
          {mutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className={`font-bold text-base ${mutation.isPending ? 'text-gray-400' : 'text-white'}`}>
              {t('settings.feedback.submitBtn')}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
