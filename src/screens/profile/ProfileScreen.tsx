import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { profileApi, authApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { Skeleton } from '../../components/Skeleton';
import i18n from '../../i18n';

export function ProfileScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { logout } = useAuthStore();
  const [changingPassword, setChangingPassword] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const isVietnamese = i18n.language === 'vi';

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: () => profileApi.getMe().then((r) => r.data.data),
  });

  const passwordMutation = useMutation({
    mutationFn: () => authApi.changePassword(currentPw, newPw),
    onSuccess: () => {
      Alert.alert('✓', t('profile.passwordChanged'));
      setChangingPassword(false);
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
    },
    onError: () => Alert.alert(t('common.error'), t('common.errorStateMsg')),
  });

  const handleLogout = () => {
    Alert.alert(t('profile.logoutTitle'), t('profile.logoutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('auth.logout'),
        style: 'destructive',
        onPress: async () => {
          try {
            await authApi.logout();
          } catch {
            // Logout is best-effort; clear local state regardless
          }
          await logout();
        },
      },
    ]);
  };

  const handleLanguageToggle = async () => {
    const lang = isVietnamese ? 'en' : 'vi';
    await i18n.changeLanguage(lang);
    await SecureStore.setItemAsync('language', lang);
  };

  const handleChangePassword = () => {
    if (!currentPw || !newPw || !confirmPw) return;
    if (newPw !== confirmPw) {
      Alert.alert(t('common.error'), t('profile.passwordMismatch'));
      return;
    }
    if (newPw.length < 6) {
      Alert.alert(t('common.error'), t('profile.passwordTooShort'));
      return;
    }
    passwordMutation.mutate();
  };

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
    >
      {/* Header */}
      <View className="bg-primary px-6 pt-16 pb-8">
        <View className="w-16 h-16 bg-white/20 rounded-full items-center justify-center mb-3">
          <MaterialCommunityIcons name="account" size={36} color="#fff" />
        </View>
        {isLoading ? (
          <>
            <Skeleton height={22} width={140} borderRadius={6} variant="light" style={{ marginBottom: 8 }} />
            <Skeleton height={16} width={100} borderRadius={6} variant="light" />
          </>
        ) : (
          <>
            <Text className="text-white text-xl font-bold">
              {profile?.fullName ?? profile?.username}
            </Text>
            <Text className="text-white/70 text-sm mt-1">{profile?.shopName}</Text>
          </>
        )}
      </View>

      <View className="px-4 pt-4">
        {/* Account info */}
        <View className="bg-white rounded-2xl overflow-hidden mb-4 border border-gray-100">
          <SectionHeader label={t('profile.title')} />
          {isLoading ? (
            <View className="p-4 gap-3">
              <Skeleton height={16} borderRadius={6} />
              <Skeleton height={16} borderRadius={6} />
            </View>
          ) : (
            <>
              <InfoRow label={t('profile.username')} value={profile?.username ?? '—'} />
              {profile?.shopName && <InfoRow label={t('profile.shopName')} value={profile.shopName} />}
              {profile?.role && <InfoRow label={t('profile.role')} value={profile.role} last />}
            </>
          )}
        </View>

        {/* Language */}
        <View className="bg-white rounded-2xl overflow-hidden mb-4 border border-gray-100">
          <SectionHeader label={t('profile.language')} />
          <View className="flex-row items-center justify-between px-4 py-3.5">
            <Text className="text-base text-gray-700">
              {isVietnamese ? t('profile.vietnamese') : t('profile.english')}
            </Text>
            <Switch
              value={isVietnamese}
              onValueChange={handleLanguageToggle}
              trackColor={{ false: '#e0e7ff', true: '#4f46e5' }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Change password */}
        <View className="bg-white rounded-2xl overflow-hidden mb-4 border border-gray-100">
          <TouchableOpacity
            className="flex-row items-center justify-between px-4 py-4"
            onPress={() => setChangingPassword((v) => !v)}
          >
            <View className="flex-row items-center gap-3">
              <MaterialCommunityIcons name="lock-outline" size={20} color="#4f46e5" />
              <Text className="text-base font-medium text-gray-800">{t('profile.changePassword')}</Text>
            </View>
            <MaterialCommunityIcons
              name={changingPassword ? 'chevron-up' : 'chevron-down'}
              size={20}
              color="#9ca3af"
            />
          </TouchableOpacity>

          {changingPassword && (
            <View className="px-4 pb-4 gap-3">
              <PasswordInput
                placeholder={t('profile.currentPassword')}
                value={currentPw}
                onChangeText={setCurrentPw}
              />
              <PasswordInput
                placeholder={t('profile.newPassword')}
                value={newPw}
                onChangeText={setNewPw}
              />
              <PasswordInput
                placeholder={t('profile.confirmPassword')}
                value={confirmPw}
                onChangeText={setConfirmPw}
              />
              <TouchableOpacity
                className={`rounded-xl py-3 items-center ${
                  passwordMutation.isPending ? 'bg-gray-300' : 'bg-primary active:opacity-80'
                }`}
                onPress={handleChangePassword}
                disabled={passwordMutation.isPending}
              >
                {passwordMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-white font-semibold">{t('common.save')}</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* App version */}
        <View className="bg-white rounded-2xl overflow-hidden mb-4 border border-gray-100">
          <InfoRow
            label={t('profile.appVersion')}
            value={Constants.expoConfig?.version ?? '1.0.0'}
            last
          />
        </View>

        {/* Logout */}
        <TouchableOpacity
          className="bg-white rounded-2xl py-4 items-center border border-red-100 active:opacity-80"
          onPress={handleLogout}
        >
          <Text className="text-danger font-bold text-base">{t('profile.logout')}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <View className="px-4 py-3 border-b border-gray-50 bg-gray-50/50">
      <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</Text>
    </View>
  );
}

function InfoRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View
      className={`flex-row justify-between items-center px-4 py-3.5 ${
        last ? '' : 'border-b border-gray-50'
      }`}
    >
      <Text className="text-gray-500 text-base">{label}</Text>
      <Text className="text-gray-800 font-medium text-base flex-1 text-right ml-4" numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function PasswordInput({
  placeholder,
  value,
  onChangeText,
}: {
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
}) {
  const [show, setShow] = useState(false);
  return (
    <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-4">
      <TextInput
        className="flex-1 py-3 text-base text-gray-900"
        placeholder={placeholder}
        placeholderTextColor="#9ca3af"
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={!show}
      />
      <TouchableOpacity onPress={() => setShow((v) => !v)}>
        <MaterialCommunityIcons
          name={show ? 'eye-off-outline' : 'eye-outline'}
          size={20}
          color="#9ca3af"
        />
      </TouchableOpacity>
    </View>
  );
}
