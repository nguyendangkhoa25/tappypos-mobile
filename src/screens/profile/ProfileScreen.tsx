import { View, Text, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { profileApi, authApi } from '../../services/api';
import { useTypography } from '../../hooks/useTypography';
import { useAuthStore } from '../../store/authStore';
import { useUserStore } from '../../store/userStore';
import { useAlertStore } from '../../store/alertStore';
import { Skeleton } from '../../components/Skeleton';
import i18n from '../../i18n';
type Props = {
  navigation: { goBack: () => void; navigate: (screen: 'ProfileSettings') => void };
};

export function ProfileScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const typo = useTypography();
  const insets = useSafeAreaInsets();
  const { logout } = useAuthStore();
  const { nickname, fullName: storedFullName } = useUserStore();
  const { show: showAlert } = useAlertStore();
  const isVietnamese = i18n.language === 'vi';

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: () => profileApi.getMe().then((r) => r.data.data),
    staleTime: 5 * 60_000,
  });

  const handleLogout = () => {
    showAlert(t('profile.logoutTitle'), t('profile.logoutConfirm'), [
      { label: t('common.cancel'), style: 'cancel' },
      {
        label: t('auth.logout'),
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

  return (
    <ScrollView
      className="flex-1 bg-gray-50 dark:bg-gray-900"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
    >
      {/* Header */}
      <View className="bg-primary px-6 pb-8" style={{ paddingTop: insets.top + 12 }}>
        <View className="flex-row items-center mb-5">
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} className="mr-3">
            <MaterialCommunityIcons name="chevron-left" size={26} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className={`${typo.section} text-white`}>{t('profile.title')}</Text>
            <Text className={`${typo.caption} text-white/70 mt-0.5`}>{t('profile.hint')}</Text>
          </View>
        </View>
        <TouchableOpacity
          className="flex-row items-center justify-between"
          activeOpacity={0.75}
          onPress={() => navigation.navigate('ProfileSettings')}
        >
          {isLoading ? (
            <View className="gap-2 flex-1 mr-4">
              <Skeleton height={22} width={140} borderRadius={6} variant="light" />
              <Skeleton height={16} width={100} borderRadius={6} variant="light" />
            </View>
          ) : (
            <View className="flex-1 mr-4">
              <View className="flex-row items-center gap-2">
                <Text className={`${typo.section} text-white`} numberOfLines={1}>
                  {nickname || storedFullName || profile?.username}
                </Text>
                <MaterialCommunityIcons name="pencil-outline" size={15} color="rgba(255,255,255,0.6)" />
              </View>
              {storedFullName && storedFullName !== nickname && (
                <Text className={`${typo.caption} text-white/70 mt-0.5`} numberOfLines={1}>{storedFullName}</Text>
              )}
              <Text className={`${typo.caption} text-white/50 mt-1`}>{t('settings.profileSettings.title')}</Text>
            </View>
          )}
          <View className="w-16 h-16 bg-white/20 rounded-full items-center justify-center">
            <MaterialCommunityIcons name="account" size={36} color="#fff" />
          </View>
        </TouchableOpacity>
      </View>

      <View className="px-4 pt-4">
        {/* Account info */}
        <View className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden mb-4 border border-gray-100 dark:border-gray-700">
          <SectionHeader label={t('profile.sectionInfo')} />
          {isLoading ? (
            <View className="p-4 gap-3">
              <Skeleton height={16} borderRadius={6} />
              <Skeleton height={16} borderRadius={6} />
            </View>
          ) : (
            <>
              <InfoRow label={t('profile.username')} value={profile?.username ?? '—'} />
              {profile?.shopName && <InfoRow label={t('profile.shopName')} value={profile.shopName} />}
              {profile?.role && <InfoRow label={t('profile.role')} value={profile.role} />}
              <TouchableOpacity
                className="flex-row items-center px-4 py-3.5 gap-2 active:opacity-70"
                onPress={() => navigation.navigate('ProfileSettings')}
              >
                <MaterialCommunityIcons name="pencil-outline" size={16} color="#4f46e5" />
                <Text className={`${typo.caption} font-medium flex-1 text-indigo-600 dark:text-indigo-400`}>{t('profile.editProfile')}</Text>
                <MaterialCommunityIcons name="chevron-right" size={16} color="#4f46e5" />
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Language */}
        <View className="bg-white rounded-2xl overflow-hidden mb-4 border border-gray-100">
          <SectionHeader label={t('profile.language')} />
          <View className="flex-row items-center justify-between px-4 py-3.5">
            <Text className={`${typo.caption} text-gray-700`}>
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
          <Text className={`${typo.labelBold} text-danger`}>{t('profile.logout')}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function SectionHeader({ label }: { label: string }) {
  const typo = useTypography();
  return (
    <View className="px-4 py-3 border-b border-gray-50 bg-gray-50/50">
      <Text className={`${typo.captionBold} text-gray-500 uppercase tracking-wide`}>{label}</Text>
    </View>
  );
}

function InfoRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  const typo = useTypography();
  return (
    <View
      className={`flex-row justify-between items-center px-4 py-3.5 ${
        last ? '' : 'border-b border-gray-50'
      }`}
    >
      <Text className={`${typo.caption} text-gray-500`}>{label}</Text>
      <Text className={`${typo.caption} font-medium text-gray-800 flex-1 text-right ml-4`} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}
