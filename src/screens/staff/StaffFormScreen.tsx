import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { shopUserApi, shopConfigApi } from '../../services/api';
import { useToastStore } from '../../store/toastStore';
import { useAlertStore } from '../../store/alertStore';
import type { MoreScreenProps } from '../../types/navigation';

type Props = MoreScreenProps<'StaffForm'>;

const SERVICE_SHOP_TYPES = new Set([
  'BARBER_SHOP', 'BARBER_SHOP_MEN', 'HAIR_SALON', 'NAIL_SHOP',
  'LASH_PMU_STUDIO', 'SPA_SHOP', 'MASSAGE_SHOP', 'BEAUTY_CLINIC', 'MAKEUP_STUDIO',
]);

const ALL_ASSIGNABLE_ROLES = [
  'MANAGER',
  'CASHIER',
  'RECEPTIONIST',
  'TECHNICIAN',
  'SERVICE_STAFF',
  'ACCOUNTANT',
  'WAREHOUSE_STAFF',
  'CLEANER',
] as const;

const SERVICE_SHOP_ROLES = ['RECEPTIONIST', 'TECHNICIAN'] as const;

const ROLE_COLORS: Record<string, string> = {
  MANAGER: '#7c3aed',
  CASHIER: '#0891b2',
  RECEPTIONIST: '#059669',
  TECHNICIAN: '#d97706',
  SERVICE_STAFF: '#2563eb',
  ACCOUNTANT: '#dc2626',
  WAREHOUSE_STAFF: '#16a34a',
  CLEANER: '#6b7280',
};

function generatePassword(): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `TAPPY-${num}`;
}

type CredentialModalProps = {
  visible: boolean;
  title: string;
  passwordLabel: string;
  username: string;
  password: string;
  iconName: string;
  iconColor: string;
  iconBg: string;
  onClose: () => void;
};

function CredentialModal({
  visible,
  title,
  passwordLabel,
  username,
  password,
  iconName,
  iconColor,
  iconBg,
  onClose,
}: CredentialModalProps) {
  const { t } = useTranslation();
  const showToast = useToastStore((s) => s.show);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(password);
    showToast(t('staff.passwordCopied'));
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 bg-black/50 items-center justify-center px-6">
        <View className="bg-white dark:bg-gray-800 rounded-3xl p-6 w-full">
          <View className="items-center mb-4">
            <View
              className="w-14 h-14 rounded-full items-center justify-center mb-3"
              style={{ backgroundColor: iconBg }}
            >
              <MaterialCommunityIcons name={iconName as any} size={30} color={iconColor} />
            </View>
            <Text className="text-lg font-bold text-gray-900 dark:text-white">{title}</Text>
          </View>

          <Text className="text-sm text-gray-500 dark:text-gray-400 text-center mb-4">
            {t('staff.credentialHint')}
          </Text>

          <View className="bg-gray-50 dark:bg-gray-700 rounded-2xl p-4 gap-3 mb-4">
            <View>
              <Text className="text-xs text-gray-400 dark:text-gray-500 mb-1">
                {t('staff.username')}
              </Text>
              <Text className="text-base font-semibold text-gray-900 dark:text-white font-mono">
                {username}
              </Text>
            </View>
            <View className="h-px bg-gray-200 dark:bg-gray-600" />
            <View>
              <Text className="text-xs text-gray-400 dark:text-gray-500 mb-1">{passwordLabel}</Text>
              <View className="flex-row items-center justify-between">
                <Text className="text-xl font-bold text-indigo-600 tracking-widest flex-1">
                  {password}
                </Text>
                <TouchableOpacity
                  onPress={handleCopy}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <MaterialCommunityIcons name="content-copy" size={20} color="#4f46e5" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <TouchableOpacity
            onPress={onClose}
            activeOpacity={0.8}
            className="bg-indigo-600 rounded-2xl py-3.5 items-center"
          >
            <Text className="text-white font-bold text-base">{t('staff.gotIt')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export function StaffFormScreen({ route, navigation }: Props) {
  const { userId } = route.params ?? {};
  const isEdit = !!userId;
  const { t } = useTranslation();
  const { top } = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const showToast = useToastStore((s) => s.show);
  const showAlert = useAlertStore((s) => s.show);

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [selectedRole, setSelectedRole] = useState('CASHIER');
  const [password, setPassword] = useState(() => generatePassword());
  const [passwordVisible, setPasswordVisible] = useState(true);
  const [resetPassModal, setResetPassModal] = useState<{ visible: boolean; password: string }>({
    visible: false,
    password: '',
  });
  const [createCredModal, setCreateCredModal] = useState<{
    visible: boolean;
    username: string;
    password: string;
  }>({ visible: false, username: '', password: '' });

  const { data: shopInfo } = useQuery({
    queryKey: ['shopConfig'],
    queryFn: () => shopConfigApi.getInfo().then((r) => r.data.data),
    staleTime: 10 * 60_000,
  });

  const isServiceShop = SERVICE_SHOP_TYPES.has(shopInfo?.shopTypeCode ?? '');
  const availableRoles = isServiceShop ? [...SERVICE_SHOP_ROLES] : [...ALL_ASSIGNABLE_ROLES];

  const { data: existingUser, isLoading: loadingUser } = useQuery({
    queryKey: ['shopUser', userId],
    queryFn: () =>
      shopUserApi.list().then((r) => {
        const found = r.data.data.content.find((u) => u.id === userId);
        if (!found) throw new Error('not_found');
        return found;
      }),
    enabled: isEdit,
    staleTime: 120_000,
  });

  useEffect(() => {
    if (existingUser) {
      setFullName(existingUser.fullName ?? '');
      const role = existingUser.roles.find((r) => r !== 'SHOP_OWNER') ?? existingUser.roles[0] ?? 'CASHIER';
      setSelectedRole(role);
    }
  }, [existingUser]);

  useEffect(() => {
    if (!isEdit && isServiceShop) {
      setSelectedRole('TECHNICIAN');
    }
  }, [isEdit, isServiceShop]);

  const regeneratePassword = useCallback(() => {
    setPassword(generatePassword());
  }, []);

  const createMutation = useMutation({
    mutationFn: () =>
      shopUserApi.create({
        username: username.trim(),
        password,
        fullName: fullName.trim(),
        roleNames: [selectedRole],
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopUsers'] });
      setCreateCredModal({ visible: true, username: username.trim(), password });
    },
    onError: (err: any) => {
      showAlert(t('common.error'), err?.response?.data?.message ?? t('common.errorGeneric'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      shopUserApi.update(userId!, {
        fullName: fullName.trim() || undefined,
        roleNames: [selectedRole],
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopUsers'] });
      queryClient.invalidateQueries({ queryKey: ['shopUser', userId] });
      showToast(t('staff.updateSuccess'));
      navigation.goBack();
    },
    onError: (err: any) => {
      showAlert(t('common.error'), err?.response?.data?.message ?? t('common.errorGeneric'));
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (enable: boolean) => shopUserApi.toggleEnable(userId!, enable),
    onSuccess: (_, enable) => {
      queryClient.invalidateQueries({ queryKey: ['shopUsers'] });
      queryClient.invalidateQueries({ queryKey: ['shopUser', userId] });
      showToast(enable ? t('staff.activateSuccess') : t('staff.deactivateSuccess'));
    },
    onError: (err: any) => {
      showAlert(t('common.error'), err?.response?.data?.message ?? t('common.errorGeneric'));
    },
  });

  const resetPassMutation = useMutation({
    mutationFn: () => shopUserApi.resetPassword(userId!),
    onSuccess: (res) => {
      setResetPassModal({ visible: true, password: res.data.data.tempPassword });
    },
    onError: (err: any) => {
      showAlert(t('common.error'), err?.response?.data?.message ?? t('common.errorGeneric'));
    },
  });

  const handleCreate = () => {
    if (!fullName.trim()) {
      showAlert(t('common.error'), t('staff.errorFullNameRequired'));
      return;
    }
    if (!username.trim()) {
      showAlert(t('common.error'), t('staff.errorUsernameRequired'));
      return;
    }
    createMutation.mutate();
  };

  const handleToggle = () => {
    if (!existingUser) return;
    const isActive = existingUser.active && existingUser.accountNonLocked;
    showAlert(
      isActive ? t('staff.deactivate') : t('staff.activate'),
      isActive ? t('staff.deactivateConfirmMsg') : t('staff.activateConfirmMsg'),
      [
        { label: t('common.cancel'), style: 'cancel' },
        {
          label: isActive ? t('staff.deactivate') : t('staff.activate'),
          style: isActive ? 'destructive' : 'default',
          onPress: () => toggleMutation.mutate(!isActive),
        },
      ],
    );
  };

  const handleResetPassword = () => {
    showAlert(t('staff.resetPassword'), t('staff.resetPasswordMsg'), [
      { label: t('common.cancel'), style: 'cancel' },
      { label: t('staff.resetPassword'), onPress: () => resetPassMutation.mutate() },
    ]);
  };

  const isSaving = createMutation.isPending || updateMutation.isPending || loadingUser;
  const isCurrentUserActive = existingUser
    ? existingUser.active && existingUser.accountNonLocked
    : true;

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-gray-50 dark:bg-gray-900"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View
        className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4"
        style={{ paddingTop: top + 12, paddingBottom: 12 }}
      >
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            className="mr-2"
          >
            <MaterialCommunityIcons name="chevron-left" size={26} color="#4f46e5" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-900 dark:text-white flex-1">
            {isEdit ? t('staff.edit') : t('staff.add')}
          </Text>
          <TouchableOpacity
            onPress={isEdit ? () => updateMutation.mutate() : handleCreate}
            disabled={isSaving}
            className="bg-indigo-600 rounded-xl px-4 py-2"
            activeOpacity={0.8}
          >
            <Text className="text-white font-semibold text-sm">
              {isSaving ? '...' : t('common.save')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, gap: 12 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Full name */}
        <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700">
          <Text className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
            {t('staff.fullName')}
          </Text>
          <TextInput
            value={fullName}
            onChangeText={setFullName}
            placeholder={t('staff.fullNamePlaceholder')}
            placeholderTextColor="#9ca3af"
            className="text-base text-gray-900 dark:text-white"
          />
        </View>

        {/* Username — create only, editable */}
        {!isEdit && (
          <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700">
            <Text className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
              {t('staff.username')}
            </Text>
            <TextInput
              value={username}
              onChangeText={setUsername}
              placeholder={t('staff.usernamePlaceholder')}
              placeholderTextColor="#9ca3af"
              keyboardType="phone-pad"
              autoCapitalize="none"
              className="text-base text-gray-900 dark:text-white"
            />
          </View>
        )}

        {/* Username display — edit mode, read-only */}
        {isEdit && existingUser && (
          <View className="bg-gray-50 dark:bg-gray-700 rounded-2xl p-4 border border-gray-100 dark:border-gray-600">
            <Text className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-1">
              {t('staff.username')}
            </Text>
            <Text className="text-base text-gray-500 dark:text-gray-400">{existingUser.username}</Text>
          </View>
        )}

        {/* Auto-generated password — create only */}
        {!isEdit && (
          <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-amber-200 dark:border-amber-700">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-xs font-medium text-gray-500 dark:text-gray-400">
                {t('staff.tempPassword')}
              </Text>
              <TouchableOpacity
                onPress={regeneratePassword}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                className="flex-row items-center gap-1"
              >
                <MaterialCommunityIcons name="refresh" size={14} color="#4f46e5" />
                <Text className="text-xs text-indigo-600 font-medium">{t('staff.regenerate')}</Text>
              </TouchableOpacity>
            </View>

            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-xl font-bold text-indigo-600 tracking-widest flex-1">
                {passwordVisible ? password : '••••••••••'}
              </Text>
              <View className="flex-row items-center gap-3 ml-2">
                <TouchableOpacity
                  onPress={() => setPasswordVisible((v) => !v)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <MaterialCommunityIcons
                    name={passwordVisible ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#9ca3af"
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={async () => {
                    await Clipboard.setStringAsync(password);
                    showToast(t('staff.passwordCopied'));
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <MaterialCommunityIcons name="content-copy" size={20} color="#4f46e5" />
                </TouchableOpacity>
              </View>
            </View>

            <View className="flex-row items-center gap-1.5">
              <MaterialCommunityIcons name="alert-circle-outline" size={13} color="#d97706" />
              <Text className="text-xs text-amber-600 dark:text-amber-400 flex-1">
                {t('staff.tempPasswordHint')}
              </Text>
            </View>
          </View>
        )}

        {/* Role picker */}
        <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700">
          <Text className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3">
            {t('staff.role')}
          </Text>
          <View className="gap-2">
            {availableRoles.map((role) => {
              const color = ROLE_COLORS[role] ?? '#6b7280';
              const isSelected = selectedRole === role;
              return (
                <TouchableOpacity
                  key={role}
                  onPress={() => setSelectedRole(role)}
                  activeOpacity={0.7}
                  className="flex-row items-center py-3 px-3 rounded-xl border"
                  style={{
                    borderColor: isSelected ? color : '#e5e7eb',
                    backgroundColor: isSelected ? color + '10' : 'transparent',
                  }}
                >
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      borderWidth: 2,
                      borderColor: isSelected ? color : '#d1d5db',
                      backgroundColor: isSelected ? color : 'transparent',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 10,
                    }}
                  >
                    {isSelected && (
                      <MaterialCommunityIcons name="check" size={12} color="white" />
                    )}
                  </View>
                  <Text
                    style={{ color: isSelected ? color : undefined }}
                    className={`text-base font-medium ${isSelected ? '' : 'text-gray-700 dark:text-gray-200'}`}
                  >
                    {t(`roles.${role}`, role)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Edit-only actions */}
        {isEdit && existingUser && (
          <View className="gap-2">
            <TouchableOpacity
              onPress={handleResetPassword}
              disabled={resetPassMutation.isPending}
              activeOpacity={0.7}
              className="bg-white dark:bg-gray-800 rounded-2xl p-4 flex-row items-center border border-gray-100 dark:border-gray-700"
            >
              <View className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 items-center justify-center mr-3">
                <MaterialCommunityIcons name="lock-reset" size={20} color="#2563eb" />
              </View>
              <Text className="flex-1 text-base font-medium text-gray-800 dark:text-gray-200">
                {t('staff.resetPassword')}
              </Text>
              <MaterialCommunityIcons name="chevron-right" size={20} color="#9ca3af" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleToggle}
              disabled={toggleMutation.isPending}
              activeOpacity={0.7}
              className="bg-white dark:bg-gray-800 rounded-2xl p-4 flex-row items-center border border-gray-100 dark:border-gray-700"
            >
              <View
                className={`w-10 h-10 rounded-xl items-center justify-center mr-3 ${
                  isCurrentUserActive
                    ? 'bg-red-50 dark:bg-red-900/30'
                    : 'bg-green-50 dark:bg-green-900/30'
                }`}
              >
                <MaterialCommunityIcons
                  name={isCurrentUserActive ? 'account-cancel-outline' : 'account-check-outline'}
                  size={20}
                  color={isCurrentUserActive ? '#dc2626' : '#16a34a'}
                />
              </View>
              <Text
                className={`flex-1 text-base font-medium ${
                  isCurrentUserActive
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-green-600 dark:text-green-400'
                }`}
              >
                {isCurrentUserActive ? t('staff.deactivate') : t('staff.activate')}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* One-time credential modal after staff creation */}
      <CredentialModal
        visible={createCredModal.visible}
        title={t('staff.credentialModal')}
        passwordLabel={t('staff.tempPassword')}
        username={createCredModal.username}
        password={createCredModal.password}
        iconName="account-check"
        iconColor="#059669"
        iconBg="#d1fae5"
        onClose={() => {
          setCreateCredModal({ visible: false, username: '', password: '' });
          showToast(t('staff.createSuccess'));
          navigation.goBack();
        }}
      />

      {/* Reset password modal — edit mode only */}
      <CredentialModal
        visible={resetPassModal.visible}
        title={t('staff.resetPassword')}
        passwordLabel={t('staff.newPassword')}
        username={existingUser?.username ?? ''}
        password={resetPassModal.password}
        iconName="lock-reset"
        iconColor="#2563eb"
        iconBg="#dbeafe"
        onClose={() => setResetPassModal({ visible: false, password: '' })}
      />
    </KeyboardAvoidingView>
  );
}
