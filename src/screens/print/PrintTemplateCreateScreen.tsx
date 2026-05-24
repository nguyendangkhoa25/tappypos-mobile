import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToastStore } from '../../store/toastStore';
import { useErrorAlert } from '../../hooks/useErrorAlert';
import { printTemplateApi } from '../../services/api';
import { useTypography } from '../../hooks/useTypography';
import type { PrintTemplateScreenProps } from '../../types/navigation';

const TEMPLATE_TYPES = [
  { value: 'POS_RECEIPT',      labelKey: 'printTemplates.create.typePosReceipt' },
  { value: 'PAWN_STAMP',       labelKey: 'printTemplates.create.typePawnStamp' },
  { value: 'PRODUCT_STAMP',    labelKey: 'printTemplates.create.typeProductStamp' },
  { value: 'INVENTORY_STAMP',  labelKey: 'printTemplates.create.typeInventoryStamp' },
] as const;

export function PrintTemplateCreateScreen({ navigation }: PrintTemplateScreenProps<'PrintTemplateCreate'>) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const typo = useTypography();
  const qc = useQueryClient();
  const { show: showToast } = useToastStore();
  const showErrorAlert = useErrorAlert();

  const [name, setName] = useState('');
  const [type, setType] = useState<string>('POS_RECEIPT');

  const createMutation = useMutation({
    mutationFn: () =>
      printTemplateApi.create({ name: name.trim(), type, isDefault: false, config: {} }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['printTemplates'] });
      showToast(t('printTemplates.create.success'));
      navigation.replace('PrintTemplateDetail', { templateId: res.data.data.id });
    },
    onError: showErrorAlert,
  });

  const canSave = name.trim().length > 0 && !createMutation.isPending;

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-gray-50 dark:bg-gray-900"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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
            {t('printTemplates.create.title')}
          </Text>
          <TouchableOpacity
            onPress={() => createMutation.mutate()}
            disabled={!canSave}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {createMutation.isPending ? (
              <ActivityIndicator size="small" color="#4f46e5" />
            ) : (
              <Text className={`${typo.labelBold} ${canSave ? 'text-indigo-600' : 'text-gray-300 dark:text-gray-600'}`}>
                {t('common.save')}
              </Text>
            )}
          </TouchableOpacity>
        </View>
        <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 mt-0.5`}>
          {t('printTemplates.create.hint')}
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}
      >
        {/* Name */}
        <View className="bg-white dark:bg-gray-800 rounded-2xl px-4 py-3 mb-3 border border-gray-100 dark:border-gray-700">
          <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 mb-1.5`}>
            {t('printTemplates.detail.nameLabel')}
          </Text>
          <TextInput
            className={`${typo.inputSize} text-gray-900 dark:text-white`}
            value={name}
            onChangeText={setName}
            placeholder={t('printTemplates.detail.namePlaceholder')}
            placeholderTextColor="#9ca3af"
            autoFocus
            returnKeyType="done"
            maxLength={80}
          />
        </View>

        {/* Type */}
        <Text className={`${typo.captionBold} text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 ml-1`}>
          {t('printTemplates.create.typeLabel')}
        </Text>
        <View className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden mb-3">
          {TEMPLATE_TYPES.map((tt, i) => (
            <TouchableOpacity
              key={tt.value}
              onPress={() => setType(tt.value)}
              className={`flex-row items-center px-4 py-3.5 ${i < TEMPLATE_TYPES.length - 1 ? 'border-b border-gray-100 dark:border-gray-700' : ''}`}
              activeOpacity={0.7}
            >
              <View className={`w-5 h-5 rounded-full border-2 mr-3 items-center justify-center ${type === tt.value ? 'border-indigo-600 bg-indigo-600' : 'border-gray-300 dark:border-gray-600'}`}>
                {type === tt.value && (
                  <View className="w-2 h-2 rounded-full bg-white" />
                )}
              </View>
              <Text className={`${typo.label} ${type === tt.value ? 'text-indigo-600 dark:text-indigo-400 font-semibold' : 'text-gray-800 dark:text-gray-200'} flex-1`}>
                {t(tt.labelKey)}
              </Text>
              {type === tt.value && (
                <MaterialCommunityIcons name="check" size={18} color="#4f46e5" />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
