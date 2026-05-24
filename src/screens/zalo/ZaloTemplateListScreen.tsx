import { View, Text, TouchableOpacity, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { zaloTemplateApi, type ZaloMessageTemplate } from '../../services/api';
import { useAlertStore } from '../../store/alertStore';
import { useToastStore } from '../../store/toastStore';
import { useErrorAlert } from '../../hooks/useErrorAlert';
import { useTypography } from '../../hooks/useTypography';
import { formatDate } from '../../utils/format';
import { ErrorState } from '../../components/ErrorState';
import { ScreenSkeleton } from '../../components/ScreenSkeleton';
import type { SettingsScreenProps } from '../../types/navigation';

type Props = SettingsScreenProps<'ZaloTemplateList'>;

export function ZaloTemplateListScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const typo = useTypography();
  const qc = useQueryClient();
  const { show: showAlert } = useAlertStore();
  const { show: showToast } = useToastStore();
  const showErrorAlert = useErrorAlert();

  const { data: templates = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['zaloTemplates'],
    queryFn: () => zaloTemplateApi.list().then((r) => r.data.data ?? []),
    staleTime: 5 * 60_000,
  });

  const setDefaultMutation = useMutation({
    mutationFn: (id: number) => zaloTemplateApi.setDefault(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['zaloTemplates'] });
      showToast(t('zalo.templates.setDefaultSuccess'));
    },
    onError: showErrorAlert,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => zaloTemplateApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['zaloTemplates'] });
      showToast(t('zalo.templates.deleteSuccess'));
    },
    onError: showErrorAlert,
  });

  function handleDelete(tmpl: ZaloMessageTemplate) {
    if (tmpl.isDefault) {
      showAlert(t('zalo.templates.deleteTitle'), t('zalo.templates.deleteDefaultError'), [
        { label: t('common.close'), style: 'cancel' },
      ]);
      return;
    }
    showAlert(t('zalo.templates.deleteTitle'), t('zalo.templates.deleteConfirm', { name: tmpl.name }), [
      { label: t('common.cancel'), style: 'cancel' },
      { label: t('common.delete'), style: 'destructive', onPress: () => deleteMutation.mutate(tmpl.id) },
    ]);
  }

  if (isLoading) return <ScreenSkeleton />;
  if (isError) return <ErrorState onRetry={refetch} />;

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
            {t('zalo.templates.title')}
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('ZaloTemplateForm', {})}
            hitSlop={8}
          >
            <MaterialCommunityIcons name="plus" size={24} color="#4f46e5" />
          </TouchableOpacity>
        </View>
        <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 mt-0.5`}>
          {t('zalo.templates.hint')}
        </Text>
      </View>

      <FlatList
        data={templates}
        keyExtractor={(item) => String(item.id)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 4, paddingBottom: insets.bottom + 40 }}
        ListEmptyComponent={
          <View className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-4 border border-blue-100 dark:border-blue-800 mt-2">
            <View className="flex-row items-start" style={{ gap: 10 }}>
              <MaterialCommunityIcons name="information-outline" size={18} color="#3b82f6" style={{ marginTop: 1 }} />
              <Text className={`${typo.caption} text-blue-700 dark:text-blue-300 flex-1 leading-5`}>
                {t('zalo.templates.usingGlobalDefault')}
              </Text>
            </View>
          </View>
        }
        renderItem={({ item: tmpl }) => (
          <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 mb-3 border border-gray-100 dark:border-gray-700">
            {/* Name + default badge */}
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center flex-1 mr-2" style={{ gap: 8 }}>
                <Text className={`${typo.labelBold} text-gray-900 dark:text-white`} numberOfLines={1}>
                  {tmpl.name}
                </Text>
                {tmpl.isDefault && (
                  <View className="bg-blue-100 dark:bg-blue-900/40 px-2 py-0.5 rounded-full">
                    <Text className={`${typo.captionBold} text-blue-700 dark:text-blue-300`}>
                      {t('zalo.templates.default')}
                    </Text>
                  </View>
                )}
              </View>
              {/* Actions */}
              <View className="flex-row" style={{ gap: 8 }}>
                <TouchableOpacity
                  onPress={() => navigation.navigate('ZaloTemplateForm', { templateId: tmpl.id })}
                  hitSlop={8}
                >
                  <MaterialCommunityIcons name="pencil-outline" size={18} color="#6b7280" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(tmpl)} hitSlop={8}>
                  <MaterialCommunityIcons name="trash-can-outline" size={18} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Template ID chip */}
            <View className="flex-row items-center bg-gray-50 dark:bg-gray-700 rounded-lg px-3 py-2 mb-2" style={{ gap: 6 }}>
              <MaterialCommunityIcons name="identifier" size={14} color="#9ca3af" />
              <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 flex-1`} numberOfLines={1}>
                {t('zalo.templates.templateIdLabel')}: {tmpl.templateId}
              </Text>
            </View>

            {/* Updated date + set-default button */}
            <View className="flex-row items-center justify-between mt-1">
              <Text className={`${typo.caption} text-gray-400 dark:text-gray-500`}>
                {formatDate(tmpl.updatedAt)}
              </Text>
              {!tmpl.isDefault && (
                <TouchableOpacity
                  onPress={() => setDefaultMutation.mutate(tmpl.id)}
                  disabled={setDefaultMutation.isPending}
                  className="flex-row items-center" style={{ gap: 4 }}
                >
                  <MaterialCommunityIcons name="star-outline" size={14} color="#4f46e5" />
                  <Text className={`${typo.captionBold} text-indigo-600 dark:text-indigo-400`}>
                    {t('zalo.templates.setDefault')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      />

      {/* FAB */}
      <TouchableOpacity
        onPress={() => navigation.navigate('ZaloTemplateForm', {})}
        className="absolute right-5 w-14 h-14 rounded-full bg-indigo-600 items-center justify-center shadow-lg"
        style={{ bottom: insets.bottom + 16 }}
      >
        <MaterialCommunityIcons name="plus" size={28} color="white" />
      </TouchableOpacity>
    </View>
  );
}
