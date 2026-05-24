import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAlertStore } from '../../store/alertStore';
import { useToastStore } from '../../store/toastStore';
import { useErrorAlert } from '../../hooks/useErrorAlert';
import { printTemplateApi, type PrintTemplate } from '../../services/api';
import { useTypography } from '../../hooks/useTypography';
import { formatDate } from '../../utils/format';
import { ErrorState } from '../../components/ErrorState';
import { ScreenSkeleton } from '../../components/ScreenSkeleton';
import type { PrintTemplateScreenProps } from '../../types/navigation';

export function PrintTemplateListScreen({ navigation }: PrintTemplateScreenProps<'PrintTemplateList'>) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const typo = useTypography();
  const qc = useQueryClient();
  const { show: showAlert } = useAlertStore();
  const { show: showToast } = useToastStore();
  const showErrorAlert = useErrorAlert();

  const { data: templates = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['printTemplates'],
    queryFn: () => printTemplateApi.list().then((r) => r.data.data),
    staleTime: 5 * 60_000,
  });

  const setDefaultMutation = useMutation({
    mutationFn: (id: string) => printTemplateApi.setDefault(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['printTemplates'] });
      showToast(t('printTemplates.setDefaultSuccess'));
    },
    onError: showErrorAlert,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => printTemplateApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['printTemplates'] });
      showToast(t('printTemplates.deleteSuccess'));
    },
    onError: showErrorAlert,
  });

  const handleDelete = (tmpl: PrintTemplate) => {
    if (tmpl.isDefault) {
      showAlert(t('printTemplates.deleteTitle'), t('printTemplates.deleteDefaultError'), [
        { label: t('common.close'), style: 'cancel' },
      ]);
      return;
    }
    showAlert(t('printTemplates.deleteTitle'), t('printTemplates.deleteMsg'), [
      { label: t('common.cancel'), style: 'cancel' },
      { label: t('printTemplates.deleteConfirm'), style: 'destructive', onPress: () => deleteMutation.mutate(tmpl.id) },
    ]);
  };

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
          <Text className={`${typo.heading} text-gray-900 dark:text-white flex-1`}>{t('printTemplates.title')}</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('PrintTemplateCreate')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons name="plus" size={24} color="#4f46e5" />
          </TouchableOpacity>
        </View>
        <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 mt-0.5`}>{t('printTemplates.hint')}</Text>
      </View>

      {isError ? (
        <ErrorState onRetry={refetch} />
      ) : isLoading ? (
        <ScreenSkeleton count={4} cardHeight={72} />
      ) : templates.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <MaterialCommunityIcons name="printer-outline" size={56} color="#d1d5db" />
          <Text className={`${typo.body} text-gray-400 mt-4 text-center`}>{t('printTemplates.empty')}</Text>
          <Text className={`${typo.caption} text-gray-400 mt-1 text-center`}>{t('printTemplates.emptyHint')}</Text>
        </View>
      ) : (
        <FlatList
          showsVerticalScrollIndicator={false}
          data={templates}
          keyExtractor={(t) => t.id}
          contentContainerStyle={{ padding: 4, gap: 10 }}
          refreshing={isLoading}
          onRefresh={refetch}
          renderItem={({ item, index }) => (
            <TouchableOpacity
              testID={`print-template-row-${index}`}
              onPress={() => navigation.navigate('PrintTemplateDetail', { templateId: item.id })}
              className="bg-white dark:bg-gray-800 rounded-2xl px-4 py-3"
            >
              <View className="flex-row items-center">
                <View className="flex-1 mr-3">
                  <View className="flex-row items-center gap-2 mb-1">
                    <Text className={`${typo.labelBold} text-gray-900 dark:text-white`}>{item.name}</Text>
                    {item.isDefault && (
                      <View className="bg-indigo-100 dark:bg-indigo-900/30 px-2 py-0.5 rounded-full">
                        <Text className={`${typo.captionBold} text-indigo-700 dark:text-indigo-400`}>{t('printTemplates.defaultBadge')}</Text>
                      </View>
                    )}
                  </View>
                  <View className="flex-row items-center gap-2">
                    <View className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                      <Text className={`${typo.caption} text-gray-600 dark:text-gray-400`}>{item.type}</Text>
                    </View>
                    <Text className={`${typo.caption} text-gray-400`}>{formatDate(item.updatedAt)}</Text>
                  </View>
                </View>
                <View className="flex-row items-center gap-3">
                  {!item.isDefault && (
                    <TouchableOpacity
                      onPress={() => setDefaultMutation.mutate(item.id)}
                      disabled={setDefaultMutation.isPending}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <MaterialCommunityIcons name="star-outline" size={20} color="#f59e0b" />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={() => handleDelete(item)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <MaterialCommunityIcons name="trash-can-outline" size={20} color="#ef4444" />
                  </TouchableOpacity>
                  <MaterialCommunityIcons name="chevron-right" size={20} color="#9ca3af" />
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}
