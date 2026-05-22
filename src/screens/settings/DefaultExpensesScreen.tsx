import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAlertStore } from '../../store/alertStore';
import { useToastStore } from '../../store/toastStore';
import { useErrorAlert } from '../../hooks/useErrorAlert';
import { expenseApi, type DefaultExpense } from '../../services/api';
import { formatVnd } from '../../utils/format';
import { useTypography } from '../../hooks/useTypography';
import type { SettingsScreenProps } from '../../types/navigation';

type FormState = { description: string; amount: string; paymentDay: string };
const EMPTY_FORM: FormState = { description: '', amount: '', paymentDay: '' };

export function DefaultExpensesScreen({ navigation }: SettingsScreenProps<'DefaultExpenses'>) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const typo = useTypography();
  const qc = useQueryClient();
  const { show: showAlert } = useAlertStore();
  const { show: showToast } = useToastStore();
  const showErrorAlert = useErrorAlert();

  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<DefaultExpense | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['defaultExpenses'],
    queryFn: () => expenseApi.getDefaults().then((r) => r.data.data),
    staleTime: 5 * 60_000,
  });

  const addMutation = useMutation({
    mutationFn: () =>
      expenseApi.createDefault({
        description: form.description,
        amount: Number(form.amount.replace(/\D/g, '')) || 0,
        paymentDay: form.paymentDay ? Number(form.paymentDay) : null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['defaultExpenses'] });
      showToast(t('settings.defaultExpenses.saveSuccess'));
      setModalVisible(false);
    },
    onError: showErrorAlert,
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      expenseApi.updateDefault(editing!.id, {
        description: form.description,
        amount: Number(form.amount.replace(/\D/g, '')) || 0,
        paymentDay: form.paymentDay ? Number(form.paymentDay) : null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['defaultExpenses'] });
      showToast(t('settings.defaultExpenses.saveSuccess'));
      setModalVisible(false);
    },
    onError: showErrorAlert,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => expenseApi.deleteDefault(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['defaultExpenses'] });
      showToast(t('settings.defaultExpenses.deleteSuccess'));
    },
    onError: showErrorAlert,
  });

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalVisible(true);
  };

  const openEdit = (item: DefaultExpense) => {
    setEditing(item);
    setForm({
      description: item.description,
      amount: item.amount.toString(),
      paymentDay: item.paymentDay?.toString() ?? '',
    });
    setModalVisible(true);
  };

  const handleDelete = (item: DefaultExpense) => {
    showAlert(t('settings.defaultExpenses.deleteTitle'), t('settings.defaultExpenses.deleteMsg'), [
      { label: t('common.cancel'), style: 'cancel' },
      { label: t('settings.defaultExpenses.deleteConfirm'), style: 'destructive', onPress: () => deleteMutation.mutate(item.id) },
    ]);
  };

  const handleSave = () => {
    if (!form.description) return;
    if (editing) updateMutation.mutate();
    else addMutation.mutate();
  };

  const isPending = addMutation.isPending || updateMutation.isPending;


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
          <Text className={`${typo.heading} text-gray-900 dark:text-white flex-1`}>
            {t('settings.defaultExpenses.title')}
          </Text>
          <TouchableOpacity onPress={openAdd} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialCommunityIcons name="plus" size={24} color="#4f46e5" />
          </TouchableOpacity>
        </View>
        <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 mt-1 ml-9`}>{t('settings.defaultExpenses.screenHint')}</Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#4f46e5" />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 12 }}>
          {/* Hint */}
          <View className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-3 flex-row items-start gap-2">
            <MaterialCommunityIcons name="information-outline" size={16} color="#4f46e5" style={{ marginTop: 1 }} />
            <Text className={`${typo.caption} text-indigo-700 dark:text-indigo-400 flex-1`}>{t('settings.defaultExpenses.hint')}</Text>
          </View>

          {items.length === 0 ? (
            <View className="items-center py-12">
              <MaterialCommunityIcons name="cash-remove" size={56} color="#d1d5db" />
              <Text className={`${typo.body} text-gray-400 mt-4 text-center`}>{t('settings.defaultExpenses.empty')}</Text>
              <Text className={`${typo.caption} text-gray-400 mt-1 text-center px-4`}>{t('settings.defaultExpenses.emptyHint')}</Text>
              <TouchableOpacity onPress={openAdd} className="mt-6 bg-indigo-600 px-6 py-3 rounded-2xl">
                <Text className={`${typo.label} text-white`}>{t('settings.defaultExpenses.addBtn')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            items.map((item) => (
              <View key={item.id} className="bg-white dark:bg-gray-800 rounded-2xl px-4 py-3 flex-row items-center">
                <View className="flex-1">
                  <Text className={`${typo.caption} font-medium text-gray-900 dark:text-white`}>{item.description}</Text>
                  <Text className={`${typo.label} text-indigo-600 mt-0.5`}>{formatVnd(item.amount)}</Text>
                  {item.paymentDay ? (
                    <Text className={`${typo.caption} text-gray-400 mt-0.5`}>{t('settings.defaultExpenses.paymentDateHint', { day: item.paymentDay })}</Text>
                  ) : null}
                </View>
                <View className="flex-row gap-3 ml-2">
                  <TouchableOpacity onPress={() => openEdit(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <MaterialCommunityIcons name="pencil-outline" size={20} color="#6b7280" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <MaterialCommunityIcons name="trash-can-outline" size={20} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* Add/Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView className="flex-1 justify-end" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View className="bg-white dark:bg-gray-800 rounded-t-3xl p-6" style={{ paddingBottom: insets.bottom + 16 }}>
            <View className="flex-row items-center mb-4">
              <TouchableOpacity onPress={() => setModalVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} className="mr-3">
                <MaterialCommunityIcons name="close" size={22} color="#6b7280" />
              </TouchableOpacity>
              <Text className={`${typo.section} text-gray-900 dark:text-white flex-1`}>{t('settings.defaultExpenses.formTitle')}</Text>
              <TouchableOpacity onPress={handleSave} disabled={isPending || !form.description} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                {isPending ? <ActivityIndicator size="small" color="#4f46e5" /> : (
                  <Text className={`${typo.labelBold} ${!form.description ? 'text-gray-300 dark:text-gray-600' : 'text-indigo-600 dark:text-indigo-400'}`}>
                    {t('common.save')}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
            <View className="gap-4">
              <View>
                <Text className={`${typo.label} text-gray-700 dark:text-gray-300 mb-2`}>{t('settings.defaultExpenses.nameLabel')}</Text>
                <TextInput
                  value={form.description}
                  onChangeText={(v) => setForm({ ...form, description: v })}
                  placeholder={t('settings.defaultExpenses.namePlaceholder')}
                  placeholderTextColor="#9ca3af"
                  className={`border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 ${typo.inputSize} text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700`}
                />
              </View>
              <View>
                <Text className={`${typo.label} text-gray-700 dark:text-gray-300 mb-2`}>{t('settings.defaultExpenses.amountLabel')}</Text>
                <TextInput
                  value={form.amount}
                  onChangeText={(v) => setForm({ ...form, amount: v.replace(/\D/g, '') })}
                  placeholder={t('settings.defaultExpenses.amountPlaceholder')}
                  placeholderTextColor="#9ca3af"
                  keyboardType="numeric"
                  className={`border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 ${typo.inputSize} text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700`}
                />
              </View>
              <View>
                <Text className={`${typo.label} text-gray-700 dark:text-gray-300 mb-2`}>{t('settings.defaultExpenses.paymentDateLabel')}</Text>
                <TextInput
                  value={form.paymentDay}
                  onChangeText={(v) => setForm({ ...form, paymentDay: v.replace(/\D/g, '') })}
                  placeholder={t('settings.defaultExpenses.paymentDatePlaceholder')}
                  placeholderTextColor="#9ca3af"
                  keyboardType="numeric"
                  maxLength={2}
                  className={`border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 ${typo.inputSize} text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700`}
                />
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
