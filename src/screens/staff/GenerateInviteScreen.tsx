import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  Share,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { shopUserApi, invitationApi, type InvitationCodeResponse } from '../../services/api';
import { useTypography } from '../../hooks/useTypography';
import type { MoreScreenProps } from '../../types/navigation';

// ── Countdown timer ───────────────────────────────────────────────────────────

function useCountdown(initialSeconds: number) {
  const [remaining, setRemaining] = useState(initialSeconds);

  useEffect(() => {
    if (remaining <= 0) return;
    const id = setInterval(() => setRemaining((s) => Math.max(0, s - 1)), 1_000);
    return () => clearInterval(id);
  }, [remaining]);

  const reset = useCallback((seconds: number) => setRemaining(seconds), []);
  return { remaining, reset, expired: remaining <= 0 };
}

function formatCountdown(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${s}s`;
}

// ── Role colour map (reuse from StaffListScreen) ──────────────────────────────

const ROLE_COLORS: Record<string, string> = {
  SHOP_OWNER: '#4f46e5',
  MANAGER: '#7c3aed',
  CASHIER: '#0891b2',
  RECEPTIONIST: '#059669',
  TECHNICIAN: '#d97706',
  SERVICE_STAFF: '#2563eb',
  ACCOUNTANT: '#dc2626',
  WAREHOUSE_STAFF: '#16a34a',
  CLEANER: '#6b7280',
};

// ── Screen ────────────────────────────────────────────────────────────────────

export function GenerateInviteScreen({ navigation }: MoreScreenProps<'GenerateInvite'>) {
  const { top, bottom } = useSafeAreaInsets();
  const { t } = useTranslation();
  const typo = useTypography();

  const [selectedRole, setSelectedRole] = useState<string>('SERVICE_STAFF');
  const [invitation, setInvitation] = useState<InvitationCodeResponse | null>(null);
  const { remaining, reset, expired } = useCountdown(0);

  // Fetch available roles for the role picker
  const { data: rolesData } = useQuery({
    queryKey: ['shopRoles'],
    queryFn: async () => {
      // Use tenant-features endpoint to list roles available; fall back to defaults
      const res = await shopUserApi.list();
      // Collect unique role names from current staff list
      const roles = new Set<string>();
      (res.data.data?.content ?? []).forEach((u) =>
        u.roles.forEach((r) => roles.add(r.name))
      );
      // Always show at least these common roles
      ['CASHIER', 'SERVICE_STAFF', 'RECEPTIONIST', 'MANAGER', 'SHOP_OWNER', 'CLEANER'].forEach(
        (r) => roles.add(r)
      );
      return Array.from(roles).filter((r) => r !== 'MASTER_TENANT' && r !== 'AGENT');
    },
    staleTime: 5 * 60_000,
  });

  const roles = rolesData ?? ['SERVICE_STAFF', 'CASHIER', 'RECEPTIONIST', 'MANAGER', 'SHOP_OWNER'];

  // Generate mutation
  const generateMutation = useMutation({
    mutationFn: () => invitationApi.generate({ roleName: selectedRole }),
    onSuccess: (res) => {
      const data = res.data.data!;
      setInvitation(data);
      reset(data.secondsRemaining);
    },
    onError: () => {
      Alert.alert(t('common.error'), t('common.requestFailed'));
    },
  });

  const handleGenerate = () => {
    setInvitation(null);
    generateMutation.mutate();
  };

  const handleCopy = async () => {
    if (!invitation) return;
    await Clipboard.setStringAsync(invitation.code);
    Alert.alert('', t('staff.invite.copied'));
  };

  const handleShare = async () => {
    if (!invitation) return;
    await Share.share({
      message: `Mã mời tham gia cửa hàng trên TappyPOS: ${invitation.code}\n(Còn hiệu lực trong 5 phút)`,
    });
  };

  const roleColor = ROLE_COLORS[selectedRole] ?? '#6b7280';

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <View
        className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4"
        style={{ paddingTop: top + 12, paddingBottom: 12 }}
      >
        <View className="flex-row items-center mb-1">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            className="mr-2"
          >
            <MaterialCommunityIcons name="chevron-left" size={26} color="#4f46e5" />
          </TouchableOpacity>
          <Text className={`${typo.heading} text-gray-900 dark:text-white flex-1`}>
            {t('staff.invite.title')}
          </Text>
        </View>
        <Text className={`${typo.caption} text-gray-500 dark:text-gray-400`}>
          {t('staff.invite.subtitle')}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 4, paddingBottom: bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Role picker */}
        <Text className={`${typo.labelBold} text-gray-700 dark:text-gray-300 mb-2`}>
          {t('staff.invite.roleLabel')}
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
          className="mb-5"
        >
          {roles.map((role) => {
            const isSelected = role === selectedRole;
            const color = ROLE_COLORS[role] ?? '#6b7280';
            return (
              <TouchableOpacity
                key={role}
                onPress={() => setSelectedRole(role)}
                style={{
                  backgroundColor: isSelected ? color : color + '18',
                  borderRadius: 20,
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                }}
              >
                <Text
                  className={`${typo.caption} font-semibold`}
                  style={{ color: isSelected ? 'white' : color }}
                >
                  {t(`roles.${role}`, { defaultValue: role })}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Hint */}
        <View className="flex-row items-start gap-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 mb-5">
          <MaterialCommunityIcons name="information-outline" size={16} color="#3b82f6" style={{ marginTop: 1 }} />
          <Text className="text-blue-700 dark:text-blue-300 text-xs flex-1 leading-5">
            {t('staff.invite.hint')}
          </Text>
        </View>

        {/* Generate button */}
        <TouchableOpacity
          onPress={handleGenerate}
          disabled={generateMutation.isPending}
          className="rounded-2xl py-4 items-center justify-center mb-6"
          style={{ backgroundColor: generateMutation.isPending ? '#d1d5db' : '#4f46e5' }}
        >
          {generateMutation.isPending ? (
            <View className="flex-row items-center gap-2">
              <ActivityIndicator color="white" size="small" />
              <Text className="text-white font-semibold text-base">{t('staff.invite.generating')}</Text>
            </View>
          ) : (
            <Text className="text-white font-semibold text-base">
              {invitation ? t('staff.invite.regenerateBtn') : t('staff.invite.generateBtn')}
            </Text>
          )}
        </TouchableOpacity>

        {/* Invitation code card */}
        {invitation && (
          <View
            className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700"
            style={{ shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}
          >
            {/* Code + countdown */}
            <View className="items-center mb-5">
              {/* Countdown badge */}
              <View
                className="flex-row items-center gap-1 rounded-full px-3 py-1 mb-3"
                style={{ backgroundColor: expired ? '#fef2f2' : '#f0fdf4' }}
              >
                <MaterialCommunityIcons
                  name="clock-outline"
                  size={14}
                  color={expired ? '#ef4444' : '#059669'}
                />
                <Text
                  className={`${typo.caption} font-bold`}
                  style={{ color: expired ? '#ef4444' : '#059669' }}
                >
                  {expired ? t('staff.invite.expired') : formatCountdown(remaining)}
                </Text>
              </View>

              {/* The code itself */}
              <Text
                style={{
                  fontSize: typo.displaySize,
                  fontWeight: '800',
                  letterSpacing: 8,
                  color: expired ? '#9ca3af' : '#111827',
                  fontFamily: 'monospace',
                }}
              >
                {invitation.code}
              </Text>

              {/* Role chip */}
              <View
                className="flex-row items-center gap-1 rounded-full px-3 py-1 mt-2"
                style={{ backgroundColor: roleColor + '18' }}
              >
                <MaterialCommunityIcons name="account" size={13} color={roleColor} />
                <Text className={`${typo.caption} font-semibold`} style={{ color: roleColor }}>
                  {t(`roles.${invitation.roleName}`, { defaultValue: invitation.roleName })}
                </Text>
              </View>
            </View>

            {/* Action buttons */}
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={handleCopy}
                disabled={expired}
                className="flex-1 flex-row items-center justify-center gap-2 rounded-xl py-3 border border-indigo-200 dark:border-indigo-700"
                style={{ opacity: expired ? 0.4 : 1 }}
              >
                <MaterialCommunityIcons name="content-copy" size={18} color="#4f46e5" />
                <Text className="text-indigo-600 dark:text-indigo-400 font-semibold text-sm">
                  {t('staff.invite.copyBtn')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleShare}
                disabled={expired}
                className="flex-1 flex-row items-center justify-center gap-2 rounded-xl py-3 bg-indigo-600"
                style={{ opacity: expired ? 0.4 : 1 }}
              >
                <MaterialCommunityIcons name="share-variant" size={18} color="white" />
                <Text className="text-white font-semibold text-sm">
                  {t('staff.invite.shareBtn')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
