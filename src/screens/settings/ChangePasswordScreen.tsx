import { useRef, useState } from 'react';
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
import { isAxiosError } from 'axios';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PasswordInput } from '../../components/PasswordInput';
import { useToastStore } from '../../store/toastStore';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../services/api';
import type { SettingsScreenProps } from '../../types/navigation';

export function ChangePasswordScreen({ navigation }: SettingsScreenProps<'ChangePassword'>) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { show: showToast } = useToastStore();
  const { logout } = useAuthStore();

  const [current, setCurrent] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const newRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const canSubmit = current.length > 0 && newPwd.length >= 8 && confirm.length > 0 && !loading;

  const handleSubmit = async () => {
    setError('');
    if (newPwd !== confirm) {
      setError(t('settings.changePassword.mismatch'));
      return;
    }
    setLoading(true);
    try {
      await authApi.changePassword(current, newPwd);
      showToast(t('settings.changePassword.success'));
      await logout();
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 401) {
        setError(t('settings.changePassword.wrongCurrent'));
      } else {
        setError(t('common.error'));
      }
    } finally {
      setLoading(false);
    }
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
          <Text className="text-lg font-bold text-gray-900 dark:text-white flex-1">
            {t('settings.changePassword.title')}
          </Text>
        </View>
        <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-9">{t('settings.changePassword.hint')}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }} keyboardShouldPersistTaps="handled">
        <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 gap-4">
          <View>
            <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              {t('settings.changePassword.currentLabel')}
            </Text>
            <PasswordInput
              value={current}
              onChangeText={(v) => { setCurrent(v); setError(''); }}
              placeholder={t('settings.changePassword.currentPlaceholder')}
              returnKeyType="next"
              onSubmitEditing={() => newRef.current?.focus()}
              showStrength={false}
            />
          </View>

          <View>
            <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              {t('settings.changePassword.newLabel')}
            </Text>
            <PasswordInput
              ref={newRef}
              value={newPwd}
              onChangeText={(v) => { setNewPwd(v); setError(''); }}
              placeholder={t('settings.changePassword.newPlaceholder')}
              returnKeyType="next"
              onSubmitEditing={() => confirmRef.current?.focus()}
              showStrength
            />
          </View>

          <View>
            <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              {t('settings.changePassword.confirmLabel')}
            </Text>
            <PasswordInput
              ref={confirmRef}
              value={confirm}
              onChangeText={(v) => { setConfirm(v); setError(''); }}
              placeholder={t('settings.changePassword.confirmPlaceholder')}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
              showStrength={false}
            />
          </View>

          {error ? (
            <Text className="text-red-500 text-sm">{error}</Text>
          ) : null}
        </View>

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={!canSubmit}
          className={`rounded-2xl py-4 items-center justify-center ${
            canSubmit ? 'bg-indigo-600 active:opacity-80' : 'bg-gray-200 dark:bg-gray-700'
          }`}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className={`font-bold text-base ${canSubmit ? 'text-white' : 'text-gray-400 dark:text-gray-500'}`}>
              {t('settings.changePassword.submitBtn')}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
