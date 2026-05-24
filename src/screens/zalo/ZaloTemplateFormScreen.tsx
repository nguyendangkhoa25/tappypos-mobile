import { useState, useEffect } from 'react';
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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { zaloTemplateApi } from '../../services/api';
import { useToastStore } from '../../store/toastStore';
import { useErrorAlert } from '../../hooks/useErrorAlert';
import { useTypography } from '../../hooks/useTypography';
import type { SettingsScreenProps } from '../../types/navigation';

type Props = SettingsScreenProps<'ZaloTemplateForm'>;

export function ZaloTemplateFormScreen({ route, navigation }: Props) {
  const { templateId } = route.params ?? {};
  const isEdit = !!templateId;
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const typo = useTypography();
  const qc = useQueryClient();
  const { show: showToast } = useToastStore();
  const showErrorAlert = useErrorAlert();

  const [name, setName] = useState('');
  const [zaloTemplateId, setZaloTemplateId] = useState('');

  const { data: existing } = useQuery({
    queryKey: ['zaloTemplate', templateId],
    queryFn: () => zaloTemplateApi.getById(templateId!).then((r) => r.data.data),
    enabled: isEdit,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!existing) return;
    setName(existing.name);
    setZaloTemplateId(existing.templateId);
  }, [existing]);

  const saveMutation = useMutation({
    mutationFn: () =>
      isEdit
        ? zaloTemplateApi.update(templateId!, { name: name.trim(), templateId: zaloTemplateId.trim() })
        : zaloTemplateApi.create({ name: name.trim(), templateId: zaloTemplateId.trim() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['zaloTemplates'] });
      if (templateId) qc.invalidateQueries({ queryKey: ['zaloTemplate', templateId] });
      showToast(t('zalo.templates.saveSuccess'));
      navigation.goBack();
    },
    onError: showErrorAlert,
  });

  const canSave = name.trim().length > 0 && zaloTemplateId.trim().length > 0;

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
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            className="mr-3"
          >
            <MaterialCommunityIcons name="chevron-left" size={26} color="#4f46e5" />
          </TouchableOpacity>
          <Text className={`${typo.heading} text-gray-900 dark:text-white flex-1`}>
            {isEdit ? t('zalo.templates.edit') : t('zalo.templates.new')}
          </Text>
          <TouchableOpacity
            onPress={() => saveMutation.mutate()}
            disabled={!canSave || saveMutation.isPending}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {saveMutation.isPending ? (
              <ActivityIndicator size="small" color="#4f46e5" />
            ) : (
              <Text className={`${typo.labelBold} ${canSave ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-600'}`}>
                {t('common.save')}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 4, paddingBottom: insets.bottom + 32 }}
      >
        {/* Form card */}
        <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700">
          {/* Name */}
          <View className="mb-5">
            <Text className={`${typo.caption} font-medium text-gray-700 dark:text-gray-300 mb-1.5`}>
              {t('zalo.templates.nameLabel')} *
            </Text>
            <TextInput
              className={`border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-3 ${typo.inputSize} text-gray-900 dark:text-white bg-white dark:bg-gray-700`}
              placeholder={t('zalo.templates.namePlaceholder')}
              placeholderTextColor="#9ca3af"
              value={name}
              onChangeText={setName}
              returnKeyType="next"
            />
          </View>

          {/* Template ID */}
          <View className="mb-2">
            <Text className={`${typo.caption} font-medium text-gray-700 dark:text-gray-300 mb-1.5`}>
              {t('zalo.templates.templateIdLabel')} *
            </Text>
            <TextInput
              className={`border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-3 ${typo.inputSize} text-gray-900 dark:text-white bg-white dark:bg-gray-700`}
              placeholder={t('zalo.templates.templateIdPlaceholder')}
              placeholderTextColor="#9ca3af"
              value={zaloTemplateId}
              onChangeText={setZaloTemplateId}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={() => canSave && saveMutation.mutate()}
            />
          </View>
        </View>

        {/* Help box */}
        <View className="mt-4 flex-row items-start bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-4 border border-blue-100 dark:border-blue-800" style={{ gap: 10 }}>
          <MaterialCommunityIcons name="information-outline" size={16} color="#3b82f6" style={{ marginTop: 1 }} />
          <Text className={`${typo.caption} text-blue-700 dark:text-blue-300 flex-1 leading-5`}>
            {t('zalo.templates.helpText')}
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
