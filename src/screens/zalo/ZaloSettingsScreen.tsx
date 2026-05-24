import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { zaloOaApi } from '../../services/api';
import { useTypography } from '../../hooks/useTypography';
import type { SettingsScreenProps } from '../../types/navigation';

type Props = SettingsScreenProps<'ZaloSettings'>;

export function ZaloSettingsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const typo = useTypography();

  const { data: oaStatus } = useQuery({
    queryKey: ['zaloOaStatus'],
    queryFn: () => zaloOaApi.getStatus().then((r) => r.data.data),
    staleTime: 60_000,
  });

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="px-5 pt-4 pb-3 bg-gray-50 dark:bg-gray-900">
        <View className="flex-row items-center mb-0.5">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            className="mr-2 -ml-1"
          >
            <MaterialCommunityIcons name="chevron-left" size={26} color="#4f46e5" />
          </TouchableOpacity>
          <Text className={`${typo.heading} text-gray-900 dark:text-white flex-1`}>
            {t('zalo.settings.title')}
          </Text>
        </View>
        <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 mt-0.5`}>
          {t('zalo.settings.hint')}
        </Text>
      </View>

      <View className="px-4 mt-2">
        {/* Notification templates section */}
        <Text className={`${typo.captionBold} text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2 mt-2 px-1`}>
          {t('zalo.settings.sectionNotifications')}
        </Text>
        <View className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700">
          <MenuItem
            icon="bell-ring-outline"
            iconBg="bg-blue-100 dark:bg-blue-900/30"
            iconColor="#0068ff"
            label={t('zalo.settings.appointmentTemplates')}
            description={t('zalo.settings.appointmentTemplatesDesc')}
            onPress={() => navigation.navigate('ZaloTemplateList')}
          />
        </View>

        {/* Zalo Official Account */}
        <Text className={`${typo.captionBold} text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2 mt-5 px-1`}>
          {t('zalo.settings.sectionOA')}
        </Text>
        <View className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700">
          <MenuItem
            icon="link-variant"
            iconBg="bg-indigo-100 dark:bg-indigo-900/30"
            iconColor="#4f46e5"
            label={t('zalo.settings.connectOA')}
            description={t('zalo.settings.connectOADesc')}
            connected={oaStatus?.connected}
            onPress={() => navigation.navigate('ZaloOaConnect')}
          />
        </View>
      </View>
    </View>
  );
}

// ── sub-component ─────────────────────────────────────────────────────────────

function MenuItem({
  icon,
  iconBg,
  iconColor,
  label,
  description,
  onPress,
  connected,
}: {
  icon: string;
  iconBg: string;
  iconColor: string;
  label: string;
  description: string;
  onPress: () => void;
  /** When true, shows a green "Connected" badge instead of the chevron */
  connected?: boolean;
}) {
  const { t } = useTranslation();
  const typo = useTypography();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className="flex-row items-center px-4 py-3.5"
    >
      <View className={`w-10 h-10 rounded-xl ${iconBg} items-center justify-center mr-3 flex-shrink-0`}>
        <MaterialCommunityIcons name={icon as any} size={20} color={iconColor} />
      </View>
      <View className="flex-1">
        <Text className={`${typo.label} text-gray-800 dark:text-gray-100`}>{label}</Text>
        <Text className={`${typo.caption} text-gray-400 dark:text-gray-500 mt-0.5`} numberOfLines={2}>
          {description}
        </Text>
      </View>
      {connected ? (
        <View className="bg-green-100 dark:bg-green-900/30 px-2.5 py-1 rounded-full ml-2">
          <Text className={`${typo.captionBold} text-green-700 dark:text-green-300`}>
            {t('zalo.oa.activeBadge')}
          </Text>
        </View>
      ) : (
        <MaterialCommunityIcons
          name="chevron-right"
          size={16}
          color={Platform.OS === 'android' ? '#9ca3af' : '#c7c7cc'}
        />
      )}
    </TouchableOpacity>
  );
}
