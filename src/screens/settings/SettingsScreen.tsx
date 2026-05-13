import { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Linking,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '../../store/authStore';
import { useUserStore } from '../../store/userStore';
import { useAlertStore } from '../../store/alertStore';
import { useFeatureCheck } from '../../hooks/useFeature';
import { authApi } from '../../services/api';
import { SUPPORT } from '../../utils/constants';
import type { SettingsScreenProps } from '../../types/navigation';

export function SettingsScreen({ navigation }: SettingsScreenProps<'SettingsMain'>) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { logout } = useAuthStore();
  const { nickname, fullName, shopName } = useUserStore();
  const { show: showAlert } = useAlertStore();
  const has = useFeatureCheck();

  const displayName = nickname || fullName || t('settings.profile.unknown');
  const initials = displayName.slice(0, 2).toUpperCase();

  const handleLogout = useCallback(() => {
    showAlert(t('settings.logoutTitle'), t('settings.logoutMsg'), [
      { label: t('common.cancel'), style: 'cancel' },
      {
        label: t('settings.logoutConfirm'),
        style: 'destructive',
        onPress: async () => {
          try { await authApi.logout(); } catch { /* ignore */ }
          await SecureStore.deleteItemAsync('tenant_id');
          useAuthStore.setState({ tenantId: null });
          await logout();
        },
      },
    ]);
  }, [showAlert, t, logout]);

  const openLink = (url: string) => Linking.openURL(url).catch(() => {});

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="px-5 pt-4 pb-3 bg-gray-50 dark:bg-gray-900">
        <View className="flex-row items-center mb-0.5">
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} className="mr-2 -ml-1">
            <MaterialCommunityIcons name="chevron-left" size={26} color="#4f46e5" />
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-gray-900 dark:text-white flex-1">
            {t('settings.title')}
          </Text>
        </View>
        <Text className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t('settings.hint')}</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 32 }}
      >
        {/* Profile card */}
        <TouchableOpacity
          onPress={() => navigation.navigate('ProfileUpdate')}
          activeOpacity={0.7}
          className="bg-white dark:bg-gray-800 rounded-2xl p-4 mb-4 flex-row items-center gap-3 border border-gray-100 dark:border-gray-700"
        >
          <View className="w-14 h-14 rounded-2xl bg-primary items-center justify-center flex-shrink-0">
            <Text className="text-white font-bold text-xl">{initials}</Text>
          </View>
          <View className="flex-1">
            <Text className="text-base font-bold text-gray-900 dark:text-white" numberOfLines={1}>
              {displayName}
            </Text>
            {shopName ? (
              <Text className="text-sm text-gray-400 dark:text-gray-500 mt-0.5" numberOfLines={1}>
                {shopName}
              </Text>
            ) : null}
          </View>
          <MaterialCommunityIcons name="chevron-right" size={20} color="#9ca3af" />
        </TouchableOpacity>

        {/* Account section */}
        <SectionLabel label={t('settings.sectionAccount')} />
        <MenuGroup>
          <MenuItem
            icon="account-outline"
            iconBg="bg-blue-100 dark:bg-blue-900/30"
            iconColor="#3b82f6"
            label={t('settings.profileUpdate')}
            onPress={() => navigation.navigate('ProfileUpdate')}
          />
          <MenuItem
            icon="lock-reset"
            iconBg="bg-orange-100 dark:bg-orange-900/30"
            iconColor="#f97316"
            label={t('settings.changePassword.title')}
            onPress={() => navigation.navigate('ChangePassword')}
            isLast
          />
        </MenuGroup>

        {/* Shop section */}
        <SectionLabel label={t('settings.sectionShop')} />
        <MenuGroup>
          <MenuItem
            icon="store-outline"
            iconBg="bg-indigo-100 dark:bg-indigo-900/30"
            iconColor="#4f46e5"
            label={t('settings.shopInfo.title')}
            onPress={() => navigation.navigate('ShopInfo')}
          />
          {has('SHOP_SETTING') && (
            <MenuItem
              icon="bank-outline"
              iconBg="bg-indigo-100 dark:bg-indigo-900/30"
              iconColor="#4f46e5"
              label={t('settings.bankAccounts.title')}
              onPress={() => navigation.navigate('BankAccounts')}
            />
          )}
          <MenuItem
            icon="point-of-sale"
            iconBg="bg-purple-100 dark:bg-purple-900/30"
            iconColor="#9333ea"
            label={t('settings.posConfig.title')}
            onPress={() => navigation.navigate('POSConfig')}
          />
          <MenuItem
            icon="receipt"
            iconBg="bg-amber-100 dark:bg-amber-900/30"
            iconColor="#d97706"
            label={t('settings.defaultExpenses.title')}
            onPress={() => navigation.navigate('DefaultExpenses')}
            isLast
          />
        </MenuGroup>

        {/* Display & Security section */}
        <SectionLabel label={t('settings.sectionPreferences')} />
        <MenuGroup>
          <MenuItem
            icon="shield-check-outline"
            iconBg="bg-indigo-100 dark:bg-indigo-900/30"
            iconColor="#16a34a"
            label={t('settings.security')}
            onPress={() => navigation.navigate('Security')}
          />
          <MenuItem
            icon="palette-outline"
            iconBg="bg-pink-100 dark:bg-pink-900/30"
            iconColor="#ec4899"
            label={t('settings.display')}
            onPress={() => navigation.navigate('Display')}
            isLast={!has('NOTIFICATION')}
          />
          {has('NOTIFICATION') && (
            <MenuItem
              icon="bell-outline"
              iconBg="bg-yellow-100 dark:bg-yellow-900/30"
              iconColor="#ca8a04"
              label={t('settings.notificationPreferences.title')}
              onPress={() => navigation.navigate('NotificationPreferences')}
              isLast
            />
          )}
        </MenuGroup>

        {/* Tools section */}
        <SectionLabel label={t('settings.sectionTools')} />
        <MenuGroup>
          <MenuItem
            icon="calculator-variant-outline"
            iconBg="bg-violet-100 dark:bg-violet-900/30"
            iconColor="#7c3aed"
            label={t('tools.title')}
            onPress={() => navigation.navigate('UtilitiesHub')}
            isLast
          />
        </MenuGroup>

        {/* Support section */}
        <SectionLabel label={t('settings.sectionSupport')} />
        <MenuGroup>
          {has('FEEDBACK') && (
            <MenuItem
              icon="message-text-outline"
              iconBg="bg-sky-100 dark:bg-sky-900/30"
              iconColor="#0284c7"
              label={t('settings.feedback.title')}
              onPress={() => navigation.navigate('Feedback')}
            />
          )}
          {has('FEEDBACK') && (
            <MenuItem
              icon="history"
              iconBg="bg-slate-100 dark:bg-slate-800"
              iconColor="#64748b"
              label={t('settings.feedbackHistory.title')}
              onPress={() => navigation.navigate('FeedbackHistory')}
            />
          )}
          <MenuItem
            icon="phone-outline"
            iconBg="bg-teal-100 dark:bg-teal-900/30"
            iconColor="#0f766e"
            label={t('settings.hotline')}
            value={SUPPORT.phone}
            onPress={() => openLink(`tel:${SUPPORT.phone}`)}
          />
          <MenuItem
            icon="email-outline"
            iconBg="bg-blue-100 dark:bg-blue-900/30"
            iconColor="#2563eb"
            label={t('settings.email')}
            value={SUPPORT.email}
            onPress={() => openLink(`mailto:${SUPPORT.email}`)}
          />
          <MenuItem
            icon="chat-outline"
            iconBg="bg-sky-100 dark:bg-sky-900/30"
            iconColor="#0ea5e9"
            label="Zalo"
            onPress={() => openLink(SUPPORT.zaloOA)}
            isLast
          />
        </MenuGroup>

        {/* System section */}
        <SectionLabel label={t('settings.sectionSystem')} />
        <MenuGroup>
          <MenuItem
            icon="clipboard-list-outline"
            iconBg="bg-gray-100 dark:bg-gray-700"
            iconColor="#6b7280"
            label={t('settings.activityLog.title')}
            onPress={() => navigation.navigate('ActivityLog')}
          />
          <MenuItem
            icon="file-document-outline"
            iconBg="bg-gray-100 dark:bg-gray-700"
            iconColor="#6b7280"
            label={t('settings.tnc.title')}
            onPress={() => navigation.navigate('TnC')}
          />
          <MenuItem
            icon="trash-can-outline"
            iconBg="bg-red-100 dark:bg-red-900/30"
            iconColor="#dc2626"
            label={t('settings.deleteAccount.title')}
            labelColor="text-red-500 dark:text-red-400"
            onPress={() => navigation.navigate('DeleteAccount')}
            isLast
          />
        </MenuGroup>

        {/* Logout */}
        <TouchableOpacity
          testID="settings-logout-btn"
          onPress={handleLogout}
          activeOpacity={0.7}
          className="mt-2 mb-4 bg-white dark:bg-gray-800 rounded-2xl py-4 items-center border border-gray-100 dark:border-gray-700"
        >
          <Text className="text-red-500 dark:text-red-400 font-semibold text-base">
            {t('settings.logout')}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  return (
    <Text className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2 mt-4 px-1">
      {label}
    </Text>
  );
}

function MenuGroup({ children }: { children: React.ReactNode }) {
  return (
    <View className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700">
      {children}
    </View>
  );
}

type MenuItemProps = {
  icon: string;
  iconBg: string;
  iconColor: string;
  label: string;
  labelColor?: string;
  value?: string;
  onPress: () => void;
  isLast?: boolean;
};

function MenuItem({
  icon,
  iconBg,
  iconColor,
  label,
  labelColor,
  value,
  onPress,
  isLast,
}: MenuItemProps) {
  return (
    <>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        className="flex-row items-center px-4 py-3.5"
      >
        <View className={`w-9 h-9 rounded-xl ${iconBg} items-center justify-center mr-3 flex-shrink-0`}>
          <MaterialCommunityIcons name={icon as any} size={18} color={iconColor} />
        </View>
        <Text
          className={`flex-1 text-sm font-medium ${labelColor ?? 'text-gray-800 dark:text-gray-100'}`}
          numberOfLines={1}
        >
          {label}
        </Text>
        {value ? (
          <Text className="text-xs text-gray-400 dark:text-gray-500 mr-1" numberOfLines={1}>
            {value}
          </Text>
        ) : null}
        <MaterialCommunityIcons
          name="chevron-right"
          size={16}
          color={Platform.OS === 'android' ? '#9ca3af' : '#c7c7cc'}
        />
      </TouchableOpacity>
      {!isLast && <View className="h-px bg-gray-100 dark:bg-gray-700 ml-16" />}
    </>
  );
}
