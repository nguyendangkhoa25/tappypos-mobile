import { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '../../store/authStore';
import { useAlertStore } from '../../store/alertStore';
import { useFeatureCheck } from '../../hooks/useFeature';
import { authApi } from '../../services/api';
import { useTypography } from '../../hooks/useTypography';
import type { SettingsScreenProps } from '../../types/navigation';

export function SettingsScreen({ navigation }: SettingsScreenProps<'SettingsMain'>) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const typo = useTypography();
  const { logout } = useAuthStore();
  const { show: showAlert } = useAlertStore();
  const has = useFeatureCheck();

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

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="px-5 pt-4 pb-3 bg-gray-50 dark:bg-gray-900">
        <View className="flex-row items-center mb-0.5">
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} className="mr-2 -ml-1">
            <MaterialCommunityIcons name="chevron-left" size={26} color="#4f46e5" />
          </TouchableOpacity>
          <Text className={`${typo.heading} text-gray-900 dark:text-white flex-1`}>
            {t('settings.title')}
          </Text>
        </View>
        <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 mt-0.5`}>{t('settings.hint')}</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 4, paddingHorizontal: 16, paddingBottom: insets.bottom + 32 }}
      >
        {/* Account section */}
        <SectionLabel label={t('settings.sectionAccount')} />
        <MenuGroup>
          <MenuItem
            icon="lock-reset"
            iconBg="bg-orange-100 dark:bg-orange-900/30"
            iconColor="#f97316"
            label={t('settings.changePassword.title')}
            onPress={() => navigation.navigate('ChangePassword')}
          />
          <MenuItem
            icon="shield-check-outline"
            iconBg="bg-green-100 dark:bg-green-900/30"
            iconColor="#16a34a"
            label={t('settings.security')}
            onPress={() => navigation.navigate('Security')}
            isLast
          />
        </MenuGroup>

        {/* System section */}
        <SectionLabel label={t('settings.sectionSystem')} />
        <MenuGroup>
          <MenuItem
            testID="settings-activity-log"
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
            iconBg="bg-gray-100 dark:bg-gray-700"
            iconColor="#9ca3af"
            label={t('settings.deleteAccount.title')}
            onPress={() => {}}
            disabled
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
          <Text className={`${typo.labelBold} text-red-500 dark:text-red-400`}>
            {t('settings.logout')}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  const typo = useTypography();
  return (
    <Text className={`${typo.captionBold} text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2 mt-4 px-1`}>
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
  disabled?: boolean;
  testID?: string;
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
  disabled,
  testID,
}: MenuItemProps) {
  const { t } = useTranslation();
  const typo = useTypography();
  return (
    <>
      <TouchableOpacity
        testID={testID}
        onPress={onPress}
        activeOpacity={disabled ? 1 : 0.7}
        disabled={disabled}
        className="flex-row items-center px-4 py-3.5"
      >
        <View className={`w-9 h-9 rounded-xl ${iconBg} items-center justify-center mr-3 flex-shrink-0`}>
          <MaterialCommunityIcons name={icon as any} size={18} color={disabled ? '#9ca3af' : iconColor} />
        </View>
        <Text
          className={`flex-1 ${typo.caption} font-medium ${disabled ? 'text-gray-400 dark:text-gray-600' : (labelColor ?? 'text-gray-800 dark:text-gray-100')}`}
          numberOfLines={1}
        >
          {label}
        </Text>
        {disabled ? (
          <Text className={`${typo.caption} text-gray-400 dark:text-gray-600 mr-1`}>{t('common.comingSoon')}</Text>
        ) : value ? (
          <Text className={`${typo.caption} text-gray-400 dark:text-gray-500 mr-1`} numberOfLines={1}>
            {value}
          </Text>
        ) : (
          <MaterialCommunityIcons
            name="chevron-right"
            size={16}
            color={Platform.OS === 'android' ? '#9ca3af' : '#c7c7cc'}
          />
        )}
      </TouchableOpacity>
      {!isLast && <View className="h-px bg-gray-100 dark:bg-gray-700 ml-16" />}
    </>
  );
}
