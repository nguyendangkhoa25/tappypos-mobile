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
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAlertStore } from '../../store/alertStore';
import { useAuthStore } from '../../store/authStore';
import { userApi } from '../../services/api';
import { useTypography } from '../../hooks/useTypography';
import type { SettingsScreenProps } from '../../types/navigation';

export function DeleteAccountScreen({ navigation }: SettingsScreenProps<'DeleteAccount'>) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const typo = useTypography();
  const { show: showAlert } = useAlertStore();
  const { logout } = useAuthStore();
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);

  const keyword = t('settings.deleteAccount.confirmKeyword');
  const canDelete = confirmText === keyword && !loading;

  const handleDelete = () => {
    showAlert(
      t('settings.deleteAccount.confirmDialogTitle'),
      t('settings.deleteAccount.confirmDialogMsg'),
      [
        { label: t('common.cancel'), style: 'cancel' },
        {
          label: t('settings.deleteAccount.confirmDialogBtn'),
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await userApi.deleteAccount();
              // Wipe all local storage
              await Promise.all([
                SecureStore.deleteItemAsync('access_token'),
                SecureStore.deleteItemAsync('refresh_token'),
                SecureStore.deleteItemAsync('tenant_id'),
                SecureStore.deleteItemAsync('phone'),
                SecureStore.deleteItemAsync('pin_enabled'),
                SecureStore.deleteItemAsync('biometric_enabled'),
                SecureStore.deleteItemAsync('nickname'),
                SecureStore.deleteItemAsync('full_name'),
                SecureStore.deleteItemAsync('shop_name'),
                AsyncStorage.clear(),
              ]);
              await logout();
            } catch {
              setLoading(false);
            }
          },
        },
      ],
    );
  };

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
          <Text className={`${typo.heading} text-gray-900 dark:text-white flex-1`}>
            {t('settings.deleteAccount.title')}
          </Text>
        </View>
        <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 mt-1 ml-9`}>{t('settings.deleteAccount.hint')}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 16 }} keyboardShouldPersistTaps="handled">
        {/* Warning card */}
        <View className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-4 border border-red-200 dark:border-red-800">
          <View className="flex-row items-center gap-2 mb-3">
            <MaterialCommunityIcons name="alert-circle" size={20} color="#ef4444" />
            <Text className={`${typo.labelBold} text-red-700 dark:text-red-400`}>
              {t('settings.deleteAccount.warningTitle')}
            </Text>
          </View>
          {[
            t('settings.deleteAccount.warning1'),
            t('settings.deleteAccount.warning2'),
            t('settings.deleteAccount.warning3'),
          ].map((w, i) => (
            <View key={i} className="flex-row items-start gap-2 mb-1.5">
              <Text className="text-red-400 mt-0.5">•</Text>
              <Text className={`${typo.caption} text-red-600 dark:text-red-400 flex-1`}>{w}</Text>
            </View>
          ))}
        </View>

        {/* Confirm input */}
        <View className="bg-white dark:bg-gray-800 rounded-2xl p-4">
          <Text className={`${typo.label} text-gray-700 dark:text-gray-300 mb-2`}>
            {t('settings.deleteAccount.confirmLabel')}
          </Text>
          <TextInput
            value={confirmText}
            onChangeText={setConfirmText}
            placeholder={t('settings.deleteAccount.confirmPlaceholder')}
            placeholderTextColor="#9ca3af"
            autoCapitalize="characters"
            className={`border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 ${typo.inputSize} text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 font-mono`}
          />
        </View>

        <TouchableOpacity
          onPress={handleDelete}
          disabled={!canDelete}
          className={`rounded-2xl py-4 items-center justify-center ${
            canDelete ? 'bg-red-600 active:opacity-80' : 'bg-gray-200 dark:bg-gray-700'
          }`}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className={`${typo.labelBold} ${canDelete ? 'text-white' : 'text-gray-400 dark:text-gray-500'}`}>
              {loading ? t('settings.deleteAccount.deleting') : t('settings.deleteAccount.deleteBtn')}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
