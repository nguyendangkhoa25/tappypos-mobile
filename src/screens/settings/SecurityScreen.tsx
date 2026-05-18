import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Switch, ScrollView, ActivityIndicator, Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { useAlertStore } from '../../store/alertStore';
import { useTypography } from '../../hooks/useTypography';
import type { SettingsScreenProps } from '../../types/navigation';

export function SecurityScreen({ navigation }: SettingsScreenProps<'Security'>) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const typo = useTypography();
  const { pinEnabled, biometricEnabled, setPinEnabled, setBiometricEnabled } = useAuthStore();
  const { show: showAlert } = useAlertStore();
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState<'face' | 'fingerprint' | 'none'>('none');
  const [checkingBiometric, setCheckingBiometric] = useState(true);

  useEffect(() => {
    Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
      LocalAuthentication.supportedAuthenticationTypesAsync(),
    ]).then(([hasHardware, isEnrolled, types]) => {
      setBiometricAvailable(hasHardware && isEnrolled);
      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        setBiometricType('face');
      } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        setBiometricType('fingerprint');
      }
      setCheckingBiometric(false);
    });
  }, []);

  const handlePinToggle = (value: boolean) => {
    if (value) {
      navigation.navigate('PinSetup', { mode: 'setup' });
    } else {
      showAlert(
        t('settings.securitySettings.disablePinTitle'),
        t('settings.securitySettings.disablePinMsg'),
        [
          { label: t('common.cancel'), style: 'cancel' },
          {
            label: t('settings.securitySettings.disableConfirm'),
            style: 'destructive',
            onPress: async () => {
              if (biometricEnabled) await setBiometricEnabled(false);
              await setPinEnabled(false);
            },
          },
        ],
      );
    }
  };

  const handleBiometricToggle = async (value: boolean) => {
    await setBiometricEnabled(value);
  };

  const biometricIcon = biometricType === 'face'
    ? 'face-recognition'
    : biometricType === 'fingerprint'
    ? 'fingerprint'
    : 'shield-account-outline';

  const biometricLabel = biometricType === 'face'
    ? t('settings.securitySettings.faceId')
    : biometricType === 'fingerprint'
    ? t('settings.securitySettings.fingerprint')
    : t('settings.securitySettings.biometricTitle');

  const biometricSubtitle = !biometricAvailable
    ? t('settings.securitySettings.biometricNotAvailable')
    : !pinEnabled
    ? t('settings.securitySettings.biometricRequiresPin')
    : t('settings.securitySettings.biometricSubtitle');

  const biometricToggleEnabled = biometricEnabled && pinEnabled && biometricAvailable;

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <View className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4" style={{ paddingTop: insets.top + 12, paddingBottom: 12 }}>
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            className="mr-3"
          >
            <MaterialCommunityIcons name="chevron-left" size={26} color="#4f46e5" />
          </TouchableOpacity>
          <Text className={`${typo.heading} text-gray-900 dark:text-white flex-1`}>
            {t('settings.securitySettings.title')}
          </Text>
        </View>
        <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 mt-1 ml-9`}>{t('settings.securitySettings.hint')}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 40 }}>

        {/* PIN section */}
        <Text className={`${typo.captionBold} text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2 px-1`}>
          {t('settings.securitySettings.sectionPin')}
        </Text>
        <View className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden mb-4">
          <View className="flex-row items-center px-4 py-4">
            <View className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 items-center justify-center mr-3">
              <MaterialCommunityIcons name="numeric" size={20} color="#4f46e5" />
            </View>
            <View className="flex-1 mr-3">
              <Text className={`${typo.label} text-gray-800 dark:text-white`}>
                {t('settings.securitySettings.pinTitle')}
              </Text>
              <Text className={`${typo.caption} text-gray-400 dark:text-gray-500 mt-0.5`} numberOfLines={2}>
                {t('settings.securitySettings.pinSubtitle')}
              </Text>
            </View>
            <Switch
              value={pinEnabled}
              onValueChange={handlePinToggle}
              trackColor={{ false: '#d1d5db', true: '#a5b4fc' }}
              thumbColor={pinEnabled ? '#4f46e5' : (Platform.OS === 'android' ? '#f3f4f6' : undefined)}
            />
          </View>

          {pinEnabled && (
            <>
              <View className="h-px bg-gray-100 dark:bg-gray-700 mx-4" />
              <TouchableOpacity
                onPress={() => navigation.navigate('PinSetup', { mode: 'change' })}
                className="flex-row items-center justify-between px-4 py-4"
                activeOpacity={0.7}
              >
                <Text className={`${typo.caption} font-medium text-gray-700 dark:text-gray-300`}>
                  {t('settings.securitySettings.changePin')}
                </Text>
                <MaterialCommunityIcons name="chevron-right" size={18} color="#9ca3af" />
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Biometric section */}
        <Text className={`${typo.captionBold} text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2 px-1`}>
          {t('settings.securitySettings.sectionBiometric')}
        </Text>
        <View className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden mb-4">
          <View className="flex-row items-center px-4 py-4">
            <View className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 items-center justify-center mr-3">
              <MaterialCommunityIcons name={biometricIcon as any} size={20} color="#16a34a" />
            </View>
            <View className="flex-1 mr-3">
              <Text className={`${typo.label} text-gray-800 dark:text-white`}>
                {biometricLabel}
              </Text>
              <Text className={`${typo.caption} text-gray-400 dark:text-gray-500 mt-0.5`} numberOfLines={2}>
                {checkingBiometric ? t('common.loading') : biometricSubtitle}
              </Text>
            </View>
            {checkingBiometric ? (
              <ActivityIndicator size="small" color="#9ca3af" />
            ) : (
              <Switch
                value={biometricToggleEnabled}
                onValueChange={handleBiometricToggle}
                disabled={!biometricAvailable || !pinEnabled}
                trackColor={{ false: '#d1d5db', true: '#bbf7d0' }}
                thumbColor={biometricToggleEnabled ? '#16a34a' : (Platform.OS === 'android' ? '#f3f4f6' : undefined)}
              />
            )}
          </View>
        </View>

        {/* Info note */}
        <View className="flex-row items-start gap-2 px-1">
          <MaterialCommunityIcons name="information-outline" size={14} color="#9ca3af" style={{ marginTop: 1 }} />
          <Text className={`${typo.caption} text-gray-400 dark:text-gray-500 flex-1 leading-4`}>
            {t('settings.securitySettings.infoNote')}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
