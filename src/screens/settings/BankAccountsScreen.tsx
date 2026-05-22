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
import { useErrorAlert } from '../../hooks/useErrorAlert';
import { useToastStore } from '../../store/toastStore';
import { shopConfigApi, type BankAccount } from '../../services/api';
import { useTypography } from '../../hooks/useTypography';
import type { SettingsScreenProps } from '../../types/navigation';

type FormState = { bankCode: string; bankName: string; accountNumber: string; accountName: string };
const EMPTY_FORM: FormState = { bankCode: '', bankName: '', accountNumber: '', accountName: '' };

export function BankAccountsScreen({ navigation }: SettingsScreenProps<'BankAccounts'>) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const typo = useTypography();
  const qc = useQueryClient();
  const { show: showAlert } = useAlertStore();
  const { show: showToast } = useToastStore();
  const showErrorAlert = useErrorAlert();

  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<BankAccount | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const { data: banks = [], isLoading } = useQuery({
    queryKey: ['banks'],
    queryFn: () => shopConfigApi.getBanks().then((r) => r.data.data),
    staleTime: 5 * 60_000,
  });

  const addMutation = useMutation({
    mutationFn: () => shopConfigApi.addBank({ ...form }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['banks'] });
      showToast(t('settings.bankAccounts.saveSuccess'));
      setModalVisible(false);
    },
    onError: showErrorAlert,
  });

  const updateMutation = useMutation({
    mutationFn: () => shopConfigApi.updateBank(editing!.id, { ...form }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['banks'] });
      showToast(t('settings.bankAccounts.saveSuccess'));
      setModalVisible(false);
    },
    onError: showErrorAlert,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => shopConfigApi.deleteBank(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['banks'] });
      showToast(t('settings.bankAccounts.deleteSuccess'));
    },
    onError: showErrorAlert,
  });

  const setDefaultMutation = useMutation({
    mutationFn: (id: number) => shopConfigApi.setDefaultBank(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['banks'] }),
    onError: showErrorAlert,
  });

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalVisible(true);
  };

  const openEdit = (bank: BankAccount) => {
    setEditing(bank);
    setForm({ bankCode: bank.bankCode, bankName: bank.bankName, accountNumber: bank.accountNumber, accountName: bank.accountName });
    setModalVisible(true);
  };

  const handleDelete = (bank: BankAccount) => {
    showAlert(t('settings.bankAccounts.deleteTitle'), t('settings.bankAccounts.deleteMsg'), [
      { label: t('common.cancel'), style: 'cancel' },
      { label: t('settings.bankAccounts.deleteConfirm'), style: 'destructive', onPress: () => deleteMutation.mutate(bank.id) },
    ]);
  };

  const handleSave = () => {
    if (!form.bankCode || !form.accountNumber || !form.accountName) return;
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
            {t('settings.bankAccounts.title')}
          </Text>
          <TouchableOpacity onPress={openAdd} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialCommunityIcons name="plus" size={24} color="#4f46e5" />
          </TouchableOpacity>
        </View>
        <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 mt-1 ml-9`}>{t('settings.bankAccounts.hint')}</Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#4f46e5" />
        </View>
      ) : banks.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <MaterialCommunityIcons name="bank-outline" size={56} color="#d1d5db" />
          <Text className={`${typo.body} text-gray-400 mt-4 text-center`}>{t('settings.bankAccounts.empty')}</Text>
          <Text className={`${typo.caption} text-gray-400 mt-1 text-center`}>{t('settings.bankAccounts.emptyHint')}</Text>
          <TouchableOpacity onPress={openAdd} className="mt-6 bg-indigo-600 px-6 py-3 rounded-2xl">
            <Text className={`${typo.label} text-white`}>{t('settings.bankAccounts.addBtn')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
          {banks.map((bank) => (
            <View key={bank.id} className="bg-white dark:bg-gray-800 rounded-2xl p-4">
              <View className="flex-row items-start justify-between">
                <View className="flex-1">
                  <View className="flex-row items-center gap-2 mb-1">
                    <Text className={`${typo.labelBold} text-gray-900 dark:text-white`}>{bank.bankCode}</Text>
                    {bank.isDefault && (
                      <View className="bg-indigo-100 dark:bg-indigo-900/30 px-2 py-0.5 rounded-full">
                        <Text className={`${typo.captionBold} text-indigo-700 dark:text-indigo-400`}>{t('settings.bankAccounts.defaultBadge')}</Text>
                      </View>
                    )}
                  </View>
                  <Text className={`${typo.caption} text-gray-600 dark:text-gray-300`}>{bank.accountNumber}</Text>
                  <Text className={`${typo.caption} text-gray-500 dark:text-gray-400`}>{bank.accountName}</Text>
                  {bank.bankName ? <Text className={`${typo.caption} text-gray-400 mt-0.5`}>{bank.bankName}</Text> : null}
                </View>
                <View className="flex-row gap-3 ml-2">
                  <TouchableOpacity onPress={() => openEdit(bank)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <MaterialCommunityIcons name="pencil-outline" size={20} color="#6b7280" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(bank)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <MaterialCommunityIcons name="trash-can-outline" size={20} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
              {!bank.isDefault && (
                <TouchableOpacity
                  onPress={() => setDefaultMutation.mutate(bank.id)}
                  className="mt-3 border border-gray-200 dark:border-gray-600 rounded-xl py-2 items-center"
                >
                  <Text className={`${typo.label} font-medium text-indigo-600`}>{t('settings.bankAccounts.setDefault')}</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
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
              <Text className={`${typo.section} text-gray-900 dark:text-white flex-1`}>{t('settings.bankAccounts.formTitle')}</Text>
              <TouchableOpacity onPress={handleSave} disabled={isPending || !form.bankCode || !form.accountNumber || !form.accountName} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                {isPending ? <ActivityIndicator size="small" color="#4f46e5" /> : (
                  <Text className={`${typo.labelBold} ${!form.bankCode || !form.accountNumber || !form.accountName ? 'text-gray-300 dark:text-gray-600' : 'text-indigo-600 dark:text-indigo-400'}`}>
                    {t('common.save')}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {[
                { key: 'bankCode', label: t('settings.bankAccounts.bankCodeLabel'), placeholder: t('settings.bankAccounts.bankCodePlaceholder'), autoCapitalize: 'characters' as const },
                { key: 'bankName', label: t('settings.bankAccounts.bankNameLabel'), placeholder: t('settings.bankAccounts.bankNamePlaceholder') },
                { key: 'accountNumber', label: t('settings.bankAccounts.accountNoLabel'), placeholder: t('settings.bankAccounts.accountNoPlaceholder'), keyboard: 'numeric' as const },
                { key: 'accountName', label: t('settings.bankAccounts.accountNameLabel'), placeholder: t('settings.bankAccounts.accountNamePlaceholder'), autoCapitalize: 'words' as const },
              ].map((f) => (
                <View key={f.key} className="mb-4">
                  <Text className={`${typo.label} text-gray-700 dark:text-gray-300 mb-2`}>{f.label}</Text>
                  <TextInput
                    value={(form as Record<string, string>)[f.key] ?? ''}
                    onChangeText={(v) => setForm({ ...form, [f.key]: v || null })}
                    placeholder={f.placeholder}
                    placeholderTextColor="#9ca3af"
                    keyboardType={f.keyboard}
                    autoCapitalize={f.autoCapitalize ?? 'none'}
                    className={`border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 ${typo.inputSize} text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700`}
                  />
                </View>
              ))}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
