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
import { useUserStore } from '../../store/userStore';
import { useToastStore } from '../../store/toastStore';
import { userApi } from '../../services/api';
import { useTypography } from '../../hooks/useTypography';
import * as SecureStore from 'expo-secure-store';

export function ProfileUpdateScreen({ navigation }: { navigation: { goBack: () => void } }) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const typo = useTypography();
  const { nickname, fullName, setAll } = useUserStore();
  const { show: showToast } = useToastStore();

  const [nicknameDraft, setNicknameDraft] = useState(nickname);
  const [fullNameDraft, setFullNameDraft] = useState(fullName);
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    SecureStore.getItemAsync('phone').then((v) => { if (v) setPhone(v); });
  }, []);

  const isDirty = nicknameDraft !== nickname || fullNameDraft !== fullName;

  const initials = (nickname || fullName || '?').trim().charAt(0).toUpperCase();

  const handleSave = async () => {
    if (!isDirty) return;
    setLoading(true);
    try {
      await userApi.updateProfile({ nickname: nicknameDraft, fullName: fullNameDraft });
      await setAll({ nickname: nicknameDraft, fullName: fullNameDraft });
      showToast(t('settings.profileSettings.saveSuccess'));
      navigation.goBack();
    } catch {
      // network error — toast is shown by interceptor
    } finally {
      setLoading(false);
    }
  };

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
        <View className="flex-row items-center mb-0.5">
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} className="mr-3">
            <MaterialCommunityIcons name="chevron-left" size={26} color="#4f46e5" />
          </TouchableOpacity>
          <Text className={`${typo.heading} text-gray-900 dark:text-white flex-1`}>
            {t('settings.profileSettings.title')}
          </Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={!isDirty || loading}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#4f46e5" />
            ) : (
              <Text className={`${typo.labelBold} ${isDirty ? 'text-indigo-600' : 'text-gray-300 dark:text-gray-600'}`}>
                {t('common.save')}
              </Text>
            )}
          </TouchableOpacity>
        </View>
        <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 mb-0 mt-0.5`}>{t('settings.profileSettings.hint')}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 16 }} keyboardShouldPersistTaps="handled">
        {/* Avatar */}
        <View className="items-center py-4">
          <View className="w-20 h-20 rounded-full items-center justify-center" style={{ backgroundColor: '#4f46e5' }}>
            <Text className={`${typo.heading} text-white`}>{initials}</Text>
          </View>
        </View>

        {/* Form */}
        <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 gap-4">
          <View>
            <Text className={`${typo.label} text-gray-700 dark:text-gray-300 mb-2`}>
              {t('settings.profileSettings.nicknameLabel')}
            </Text>
            <TextInput
              value={nicknameDraft}
              onChangeText={setNicknameDraft}
              placeholder={t('settings.profileSettings.nicknamePlaceholder')}
              placeholderTextColor="#9ca3af"
              className={`border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 ${typo.inputSize}`}
              returnKeyType="next"
              maxLength={20}
            />
            <Text className={`${typo.caption} text-gray-400 dark:text-gray-500 mt-1`}>
              {t('settings.profileSettings.nicknameHint', { count: 20 - (nicknameDraft?.length ?? 0) })}
            </Text>
          </View>

          <View>
            <Text className={`${typo.label} text-gray-700 dark:text-gray-300 mb-2`}>
              {t('settings.profileSettings.fullNameLabel')}
            </Text>
            <TextInput
              value={fullNameDraft}
              onChangeText={setFullNameDraft}
              placeholder={t('settings.profileSettings.fullNamePlaceholder')}
              placeholderTextColor="#9ca3af"
              className={`border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 ${typo.inputSize}`}
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />
          </View>

          <View>
            <Text className={`${typo.label} text-gray-700 dark:text-gray-300 mb-2`}>
              {t('settings.profileSettings.phoneLabel')}
            </Text>
            <View className="border border-gray-100 dark:border-gray-700 rounded-xl px-4 py-3 bg-gray-100 dark:bg-gray-750 flex-row items-center">
              <Text className={`${typo.caption} text-gray-400 dark:text-gray-500 flex-1`}>{phone || '—'}</Text>
              <MaterialCommunityIcons name="lock-outline" size={16} color="#9ca3af" />
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
