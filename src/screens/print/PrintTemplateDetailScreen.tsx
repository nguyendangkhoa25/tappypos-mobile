import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToastStore } from '../../store/toastStore';
import { useErrorAlert } from '../../hooks/useErrorAlert';
import { printTemplateApi } from '../../services/api';
import { useTypography } from '../../hooks/useTypography';
import type { PrintTemplateScreenProps } from '../../types/navigation';

type TemplateConfig = {
  showLogo: boolean;
  showAddress: boolean;
  showPhone: boolean;
  showQR: boolean;
  showDate: boolean;
  showStaff: boolean;
  showNote: boolean;
  footerText: string;
};

const DEFAULT_CONFIG: TemplateConfig = {
  showLogo: true,
  showAddress: true,
  showPhone: true,
  showQR: false,
  showDate: true,
  showStaff: true,
  showNote: true,
  footerText: '',
};

const CONFIG_FIELD_KEYS: { key: keyof Omit<TemplateConfig, 'footerText'>; i18nKey: string }[] = [
  { key: 'showLogo', i18nKey: 'printTemplates.detail.showLogo' },
  { key: 'showAddress', i18nKey: 'printTemplates.detail.showAddress' },
  { key: 'showPhone', i18nKey: 'printTemplates.detail.showPhone' },
  { key: 'showQR', i18nKey: 'printTemplates.detail.showQR' },
  { key: 'showDate', i18nKey: 'printTemplates.detail.showDate' },
  { key: 'showStaff', i18nKey: 'printTemplates.detail.showStaff' },
  { key: 'showNote', i18nKey: 'printTemplates.detail.showNote' },
];

export function PrintTemplateDetailScreen({ navigation, route }: PrintTemplateScreenProps<'PrintTemplateDetail'>) {
  const { templateId } = route.params;
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const typo = useTypography();
  const qc = useQueryClient();
  const { show: showToast } = useToastStore();
  const showErrorAlert = useErrorAlert();

  const [name, setName] = useState('');
  const [config, setConfig] = useState<TemplateConfig>(DEFAULT_CONFIG);

  const { data: template, isLoading } = useQuery({
    queryKey: ['printTemplate', templateId],
    queryFn: () => printTemplateApi.getById(templateId).then((r) => r.data.data),
    staleTime: 0,
  });

  useEffect(() => {
    if (template) {
      setName(template.name);
      const merged = { ...DEFAULT_CONFIG, ...(template.config as Partial<TemplateConfig>) };
      if (!merged.footerText) merged.footerText = t('printTemplates.detail.footerDefault');
      setConfig(merged);
    }
  }, [template]);

  const saveMutation = useMutation({
    mutationFn: () =>
      printTemplateApi.update(templateId, { name, config: config as Record<string, unknown> }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['printTemplates'] });
      qc.invalidateQueries({ queryKey: ['printTemplate', templateId] });
      showToast(t('common.saved'));
      navigation.goBack();
    },
    onError: showErrorAlert,
  });

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
          <Text className={`${typo.heading} text-gray-900 dark:text-white flex-1`}>{name || '...'}</Text>
          <TouchableOpacity
            onPress={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !name.trim()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {saveMutation.isPending ? (
              <ActivityIndicator size="small" color="#4f46e5" />
            ) : (
              <Text className={`${typo.labelBold} text-indigo-600`}>{t('common.save')}</Text>
            )}
          </TouchableOpacity>
        </View>
        <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 mb-0 mt-0.5`}>{t('printTemplates.detailHint')}</Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#4f46e5" />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 16 }}>
          {/* Name */}
          <View className="bg-white dark:bg-gray-800 rounded-2xl p-4">
            <Text className={`${typo.label} text-gray-700 dark:text-gray-300 mb-2`}>{t('printTemplates.detail.nameLabel')}</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={t('printTemplates.detail.namePlaceholder')}
              placeholderTextColor="#9ca3af"
              className={`border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 ${typo.inputSize} text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700`}
            />
          </View>

          {/* Toggle fields */}
          <View className="bg-white dark:bg-gray-800 rounded-2xl p-4">
            <Text className={`${typo.label} text-gray-700 dark:text-gray-300 mb-3`}>{t('printTemplates.detail.contentLabel')}</Text>
            {CONFIG_FIELD_KEYS.map((field, idx) => (
              <View key={field.key}>
                {idx > 0 && <View className="h-px bg-gray-100 dark:bg-gray-700 my-2" />}
                <View className="flex-row items-center justify-between py-1">
                  <Text className={`${typo.caption} text-gray-800 dark:text-gray-200`}>{t(field.i18nKey)}</Text>
                  <Switch
                    value={config[field.key]}
                    onValueChange={(v) => setConfig({ ...config, [field.key]: v })}
                    trackColor={{ true: '#4f46e5' }}
                    thumbColor="#fff"
                  />
                </View>
              </View>
            ))}
          </View>

          {/* Footer text */}
          <View className="bg-white dark:bg-gray-800 rounded-2xl p-4">
            <Text className={`${typo.label} text-gray-700 dark:text-gray-300 mb-2`}>{t('printTemplates.detail.footerLabel')}</Text>
            <TextInput
              value={config.footerText}
              onChangeText={(v) => setConfig({ ...config, footerText: v })}
              placeholder={t('printTemplates.detail.footerPlaceholder')}
              placeholderTextColor="#9ca3af"
              className={`border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 ${typo.inputSize} text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700`}
            />
          </View>

          {/* Preview hint */}
          <View className="bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl p-4 flex-row items-center gap-3">
            <MaterialCommunityIcons name="information-outline" size={20} color="#4f46e5" />
            <Text className={`${typo.caption} text-indigo-700 dark:text-indigo-400 flex-1`}>
              {t('printTemplates.detail.previewHint')}
            </Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}
