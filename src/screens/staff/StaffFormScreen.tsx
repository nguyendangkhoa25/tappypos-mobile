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
  ActivityIndicator,
} from 'react-native';
import { ErrorState } from '../../components/ErrorState';
import { Skeleton } from '../../components/Skeleton';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { shopUserApi, shopConfigApi, employeeApi, orderApi } from '../../services/api';
import type { EmployeeProfile } from '../../services/api';
import { TrendChart } from '../../components/TrendChart';
import type { ChartGranularity } from '../../components/BarChart';
import { useToastStore } from '../../store/toastStore';
import { useAlertStore } from '../../store/alertStore';
import { DatePickerInput } from '../../components/DatePickerInput';
import { useAuthStore } from '../../store/authStore';
import { useTypography } from '../../hooks/useTypography';
import type { MoreScreenProps } from '../../types/navigation';

type Props = MoreScreenProps<'StaffForm'>;

const SERVICE_SHOP_TYPES = new Set([
  'BARBER_SHOP', 'BARBER_SHOP_MEN', 'HAIR_SALON', 'NAIL_SHOP',
  'LASH_PMU_STUDIO', 'SPA_SHOP', 'MASSAGE_SHOP', 'BEAUTY_CLINIC', 'MAKEUP_STUDIO',
]);

const ALL_ASSIGNABLE_ROLES = [
  'MANAGER', 'CASHIER', 'RECEPTIONIST', 'TECHNICIAN',
  'SERVICE_STAFF', 'ACCOUNTANT', 'WAREHOUSE_STAFF', 'CLEANER',
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

/** Convert DD/MM/YYYY → YYYY-MM-DD for the backend. Returns undefined if input is empty/invalid. */
function toIsoDate(input: string): string | undefined {
  const parts = input.trim().split('/');
  if (parts.length !== 3) return undefined;
  const [d, m, y] = parts;
  if (!d || !m || !y || y.length !== 4) return undefined;
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

/** Convert YYYY-MM-DD from the backend → DD/MM/YYYY for display. */
function fromIsoDate(isoDate: string | null | undefined): string {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('T')[0].split('-');
  return `${d}/${m}/${y}`;
}

// ── Local UI Components ───────────────────────────────────────────────────────

type CollapseProps = {
  title: string;
  icon: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
};

function CollapseSection({ title, icon, isOpen, onToggle, children }: CollapseProps) {
  const typo = useTypography();
  return (
    <View className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700">
      <TouchableOpacity
        onPress={onToggle}
        activeOpacity={0.7}
        className="flex-row items-center px-4 py-3.5"
      >
        <MaterialCommunityIcons name={icon as any} size={18} color="#4f46e5" />
        <Text className={`flex-1 ${typo.label} text-gray-700 dark:text-gray-200 ml-2.5`}>
          {title}
        </Text>
        <MaterialCommunityIcons
          name={isOpen ? 'chevron-up' : 'chevron-down'}
          size={20}
          color="#9ca3af"
        />
      </TouchableOpacity>
      {isOpen && (
        <View className="border-t border-gray-100 dark:border-gray-700 px-4 pb-4 pt-3 gap-4">
          {children}
        </View>
      )}
    </View>
  );
}

function FieldLabel({ label }: { label: string }) {
  const typo = useTypography();
  return (
    <Text className={`${typo.caption} font-medium text-gray-700 dark:text-gray-300 mb-1.5`}>
      {label}
    </Text>
  );
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
  visible, title, passwordLabel, username, password, iconName, iconColor, iconBg, onClose,
}: CredentialModalProps) {
  const { t } = useTranslation();
  const typo = useTypography();
  const showToast = useToastStore((s) => s.show);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 bg-black/50 items-center justify-center px-6">
        <View className="bg-white dark:bg-gray-800 rounded-3xl p-6 w-full">
          <View className="items-center mb-4">
            <View className="w-14 h-14 rounded-full items-center justify-center mb-3" style={{ backgroundColor: iconBg }}>
              <MaterialCommunityIcons name={iconName as any} size={30} color={iconColor} />
            </View>
            <Text className={`${typo.section} text-gray-900 dark:text-white`}>{title}</Text>
          </View>
          <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 text-center mb-4`}>
            {t('staff.credentialHint')}
          </Text>
          <View className="bg-gray-50 dark:bg-gray-700 rounded-2xl p-4 gap-3 mb-4">
            <View>
              <Text className={`${typo.caption} text-gray-400 dark:text-gray-500 mb-1`}>{t('staff.username')}</Text>
              <Text className={`${typo.labelBold} text-gray-900 dark:text-white font-mono`}>{username}</Text>
            </View>
            <View className="h-px bg-gray-200 dark:bg-gray-600" />
            <View>
              <Text className={`${typo.caption} text-gray-400 dark:text-gray-500 mb-1`}>{passwordLabel}</Text>
              <View className="flex-row items-center justify-between">
                <Text className={`${typo.section} text-indigo-600 tracking-widest flex-1`}>{password}</Text>
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
          </View>
          <TouchableOpacity onPress={onClose} activeOpacity={0.8} className="bg-indigo-600 rounded-2xl py-3.5 items-center">
            <Text className={`${typo.labelBold} text-white`}>{t('staff.gotIt')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export function StaffFormScreen({ route, navigation }: Props) {
  const { userId } = route.params ?? {};
  const isEdit = !!userId;
  const { t } = useTranslation();
  const typo = useTypography();
  const { top, bottom } = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const showToast = useToastStore((s) => s.show);
  const showAlert = useAlertStore((s) => s.show);
  const rawTenantId = useAuthStore((s) => s.tenantId);
  const tenantSuffix = rawTenantId ? (rawTenantId.match(/(\d+)$/) ?? [])[1] ?? '' : '';
  const features = useAuthStore((s) => s.features);
  const currentUserId = useAuthStore((s) => s.currentUserId);
  const canViewAllOrders = features.includes('ORDER_VIEW_ALL');

  // ── Account fields
  const [fullName, setFullName] = useState('');
  const [nickName, setNickName] = useState('');
  const [username, setUsername] = useState('');
  const [selectedRole, setSelectedRole] = useState('CASHIER');
  const [password, setPassword] = useState(() => generatePassword());
  const [passwordVisible, setPasswordVisible] = useState(true);

  // ── Contact fields
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  // ── Work info fields
  const [hireDate, setHireDate] = useState('');
  const [baseWage, setBaseWage] = useState('');
  const [commissionRate, setCommissionRate] = useState('');

  // ── Personal fields
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [permanentAddress, setPermanentAddress] = useState('');

  // ── ID card fields
  const [idCardNumber, setIdCardNumber] = useState('');
  const [idCardIssuedDate, setIdCardIssuedDate] = useState('');
  const [idCardIssuedPlace, setIdCardIssuedPlace] = useState('');

  // ── Notes
  const [notes, setNotes] = useState('');

  // ── Performance section
  const [chartGranularity, setChartGranularity] = useState<ChartGranularity>('day');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('ALL');

  // ── UI state
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
  const [resetPassModal, setResetPassModal] = useState<{ visible: boolean; password: string }>({
    visible: false,
    password: '',
  });
  const [createCredModal, setCreateCredModal] = useState<{ visible: boolean; username: string; password: string }>({
    visible: false, username: '', password: '',
  });

  const toggleSection = useCallback((key: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  // ── Queries
  const { data: shopInfo } = useQuery({
    queryKey: ['shopConfig'],
    queryFn: () => shopConfigApi.getInfo().then((r) => r.data.data),
    staleTime: 10 * 60_000,
  });

  const isServiceShop = SERVICE_SHOP_TYPES.has(shopInfo?.shopTypeCode ?? '');
  const availableRoles = isServiceShop ? [...SERVICE_SHOP_ROLES] : [...ALL_ASSIGNABLE_ROLES];

  const { data: existingUser, isLoading: loadingUser, isError: userError, refetch: refetchUser } = useQuery({
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

  const { data: employeeProfile } = useQuery<EmployeeProfile | null>({
    queryKey: ['employeeByUser', existingUser?.id],
    queryFn: async () => {
      try {
        const r = await employeeApi.getByUserId(existingUser!.id);
        return r.data;
      } catch (err: any) {
        if (err?.response?.status === 404 || err?.response?.status === 403) return null;
        throw err;
      }
    },
    enabled: isEdit && !!existingUser,
    staleTime: 120_000,
    retry: false,
  });

  // ── Performance queries (edit mode, ORDER_VIEW_ALL feature only)
  const staffUsername = existingUser?.username ?? null;

  const chartRange = (() => {
    const now = new Date();
    const days = chartGranularity === 'year' ? 1095 : chartGranularity === 'month' ? 365 : chartGranularity === 'week' ? 84 : 30;
    const from = new Date(now.getTime() - days * 864e5);
    return {
      from: from.toISOString().split('T')[0],
      to: now.toISOString().split('T')[0],
    };
  })();

  const { data: staffSummary } = useQuery({
    queryKey: ['staffSummary', staffUsername],
    queryFn: () => {
      const now = new Date();
      const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const to = now.toISOString().split('T')[0];
      return orderApi.staffSummary({ createdBy: staffUsername!, from, to }).then((r) => r.data.data);
    },
    enabled: isEdit && !!staffUsername && canViewAllOrders && openSections.has('perf'),
    staleTime: 60_000,
  });

  const { data: staffChartData } = useQuery({
    queryKey: ['staffChart', staffUsername, chartRange.from, chartRange.to, chartGranularity],
    queryFn: () =>
      orderApi.staffChart({ createdBy: staffUsername!, ...chartRange, granularity: chartGranularity })
        .then((r) => r.data.data),
    enabled: isEdit && !!staffUsername && canViewAllOrders && openSections.has('perf'),
    staleTime: 60_000,
  });

  const { data: staffOrdersData } = useQuery({
    queryKey: ['staffOrders', staffUsername, orderStatusFilter],
    queryFn: () =>
      orderApi.staffOrders({
        createdBy: staffUsername!,
        status: orderStatusFilter === 'ALL' ? undefined : orderStatusFilter,
        size: 10,
      }).then((r) => r.data.data),
    enabled: isEdit && !!staffUsername && canViewAllOrders && openSections.has('orders'),
    staleTime: 60_000,
  });

  // ── Populate form from existing data
  useEffect(() => {
    if (existingUser) {
      setFullName(existingUser.fullName ?? '');
      const role = existingUser.roles.find((r) => r.name !== 'SHOP_OWNER') ?? existingUser.roles[0];
      setSelectedRole(role?.name ?? 'CASHIER');
    }
  }, [existingUser]);

  useEffect(() => {
    if (employeeProfile) {
      setNickName(employeeProfile.nickName ?? '');
      setPhone(employeeProfile.phone ?? '');
      setEmail(employeeProfile.email ?? '');
      setHireDate(fromIsoDate(employeeProfile.hireDate));
      setBaseWage(employeeProfile.baseWage != null ? String(employeeProfile.baseWage) : '');
      setCommissionRate(employeeProfile.commissionRate != null ? String(employeeProfile.commissionRate) : '');
      setDateOfBirth(fromIsoDate(employeeProfile.dateOfBirth));
      setGender(employeeProfile.gender ?? '');
      setPermanentAddress(employeeProfile.permanentAddress ?? '');
      setIdCardNumber(employeeProfile.idCardNumber ?? '');
      setIdCardIssuedDate(fromIsoDate(employeeProfile.idCardIssuedDate));
      setIdCardIssuedPlace(employeeProfile.idCardIssuedPlace ?? '');
      setNotes(employeeProfile.notes ?? '');

      // Auto-open sections that have data
      const auto = new Set<string>();
      if (employeeProfile.phone || employeeProfile.email) auto.add('contact');
      if (employeeProfile.hireDate || employeeProfile.baseWage != null) auto.add('work');
      if (employeeProfile.dateOfBirth || employeeProfile.gender || employeeProfile.permanentAddress) auto.add('personal');
      if (employeeProfile.idCardNumber) auto.add('idcard');
      if (employeeProfile.notes) auto.add('notes');
      setOpenSections(auto);
    }
  }, [employeeProfile]);

  useEffect(() => {
    if (!isEdit && isServiceShop) {
      setSelectedRole('TECHNICIAN');
    }
  }, [isEdit, isServiceShop]);

  const regeneratePassword = useCallback(() => setPassword(generatePassword()), []);

  // ── Derived values
  const fullUsername = tenantSuffix ? `${username.trim()}.${tenantSuffix}` : username.trim();

  function buildProfilePayload() {
    return {
      nickName: nickName.trim() || undefined,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      hireDate: toIsoDate(hireDate),
      baseWage: baseWage.trim() ? parseFloat(baseWage.replace(/[^\d.]/g, '')) : undefined,
      commissionRate: commissionRate.trim() ? parseFloat(commissionRate) : undefined,
      dateOfBirth: toIsoDate(dateOfBirth),
      gender: gender || undefined,
      permanentAddress: permanentAddress.trim() || undefined,
      idCardNumber: idCardNumber.trim() || undefined,
      idCardIssuedDate: toIsoDate(idCardIssuedDate),
      idCardIssuedPlace: idCardIssuedPlace.trim() || undefined,
      notes: notes.trim() || undefined,
    };
  }

  function hasProfileData(payload: ReturnType<typeof buildProfilePayload>) {
    return Object.values(payload).some((v) => v !== undefined);
  }

  // ── Mutations
  const createMutation = useMutation({
    mutationFn: async () => {
      const userRes = await shopUserApi.create({
        username: fullUsername,
        password,
        fullName: fullName.trim(),
        roleNames: [selectedRole],
      });
      const newUser = userRes.data.data;
      const profilePayload = buildProfilePayload();
      if (hasProfileData(profilePayload)) {
        try {
          await employeeApi.create({
            fullName: fullName.trim(),
            ...profilePayload,
            userId: Number(newUser.id),
          });
        } catch { /* silently ignore profile errors */ }
      }
      return newUser;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopUsers'] });
      setCreateCredModal({ visible: true, username: fullUsername, password });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showAlert(t('common.error'), msg ?? t('common.errorGeneric'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      await shopUserApi.update(userId!, {
        fullName: fullName.trim() || undefined,
        roleNames: [selectedRole],
      });
      const profilePayload = buildProfilePayload();
      const profileHasData = hasProfileData(profilePayload) || nickName.trim().length > 0;
      if (profileHasData) {
        try {
          if (employeeProfile?.id) {
            await employeeApi.update(employeeProfile.id, {
              fullName: fullName.trim() || undefined,
              ...profilePayload,
            });
          } else {
            await employeeApi.create({
              fullName: fullName.trim(),
              ...profilePayload,
              userId: Number(existingUser!.id),
            });
          }
        } catch { /* silently ignore profile errors */ }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopUsers'] });
      queryClient.invalidateQueries({ queryKey: ['shopUser', userId] });
      queryClient.invalidateQueries({ queryKey: ['employeeByUser', existingUser?.id] });
      showToast(t('staff.updateSuccess'));
      navigation.goBack();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showAlert(t('common.error'), msg ?? t('common.errorGeneric'));
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (enable: boolean) => shopUserApi.toggleEnable(userId!, enable),
    onSuccess: (_, enable) => {
      queryClient.invalidateQueries({ queryKey: ['shopUsers'] });
      queryClient.invalidateQueries({ queryKey: ['shopUser', userId] });
      showToast(enable ? t('staff.activateSuccess') : t('staff.deactivateSuccess'));
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showAlert(t('common.error'), msg ?? t('common.errorGeneric'));
    },
  });

  const resetPassMutation = useMutation({
    mutationFn: () => shopUserApi.resetPassword(userId!),
    onSuccess: (res) => {
      setResetPassModal({ visible: true, password: res.data.data.tempPassword });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showAlert(t('common.error'), msg ?? t('common.errorGeneric'));
    },
  });

  // ── Handlers
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

  const isSelf = isEdit && !!currentUserId && existingUser?.id === currentUserId;
  const isSaving = createMutation.isPending || updateMutation.isPending;
  const isCurrentUserActive = existingUser ? existingUser.active && existingUser.accountNonLocked : true;

  // ── Gender chips
  const GENDERS = [
    { key: 'Nam', label: t('staff.genderMale') },
    { key: 'Nữ', label: t('staff.genderFemale') },
    { key: 'Khác', label: t('staff.genderOther') },
  ];

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-gray-50 dark:bg-gray-900"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4" style={{ paddingTop: top + 12, paddingBottom: 12 }}>
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            className="mr-3"
          >
            <MaterialCommunityIcons name="chevron-left" size={26} color="#4f46e5" />
          </TouchableOpacity>
          <Text className={`${typo.heading} text-gray-900 dark:text-white flex-1`} numberOfLines={1}>
            {isEdit ? t('staff.edit') : t('staff.add')}
          </Text>
          {!isSelf && (
            <TouchableOpacity onPress={isEdit ? () => updateMutation.mutate() : handleCreate} disabled={isSaving} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              {isSaving ? <ActivityIndicator size="small" color="#4f46e5" /> : (
                <Text className={`${typo.labelBold} text-indigo-600 dark:text-indigo-400`}>{t('common.save')}</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
        <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 mt-1 ml-9`}>
          {isSelf ? t('staff.cannotEditSelf') : isEdit ? t('staff.editHint') : t('staff.formHint')}
        </Text>
      </View>

      {isEdit && userError ? (
        <ErrorState onRetry={refetchUser} />
      ) : isEdit && loadingUser ? (
        <View className="p-4 gap-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} height={72} borderRadius={16} />)}
        </View>
      ) : (
        <>
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: bottom + 24 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Section 1: Account (always visible) ── */}
          <View className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
            <View className="flex-row items-center px-4 py-3.5 border-b border-gray-100 dark:border-gray-700">
              <MaterialCommunityIcons name="account-key-outline" size={18} color="#4f46e5" />
              <Text className={`flex-1 ${typo.label} text-gray-700 dark:text-gray-200 ml-2.5`}>
                {t('staff.sectionAccount')}
              </Text>
            </View>
            <View className="px-4 pb-4 pt-3 gap-4">
              {/* Full Name */}
              <View>
                <FieldLabel label={t('staff.fullName')} />
                <TextInput
                  testID="staff-fullname"
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder={t('staff.fullNamePlaceholder')}
                  placeholderTextColor="#9ca3af"
                  editable={!isSelf}
                  className={`${typo.inputSize} text-gray-900 dark:text-white${isSelf ? ' opacity-60' : ''}`}
                />
              </View>

              {/* Nickname */}
              <View>
                <FieldLabel label={t('staff.nickName')} />
                <TextInput
                  value={nickName}
                  onChangeText={setNickName}
                  placeholder={t('staff.nickNamePlaceholder')}
                  placeholderTextColor="#9ca3af"
                  editable={!isSelf}
                  className={`${typo.inputSize} text-gray-900 dark:text-white${isSelf ? ' opacity-60' : ''}`}
                />
              </View>

              {/* Username — create only */}
              {!isEdit && (
                <View>
                  <FieldLabel label={t('staff.username')} />
                  <View className="flex-row items-center">
                    <TextInput
                      testID="staff-username"
                      value={username}
                      onChangeText={setUsername}
                      placeholder={t('staff.usernamePlaceholder')}
                      placeholderTextColor="#9ca3af"
                      keyboardType="phone-pad"
                      autoCapitalize="none"
                      className={`flex-1 ${typo.inputSize} text-gray-900 dark:text-white`}
                    />
                    {tenantSuffix ? (
                      <Text className={`${typo.labelBold} text-gray-400 dark:text-gray-500 ml-0.5`}>
                        .{tenantSuffix}
                      </Text>
                    ) : null}
                  </View>
                </View>
              )}

              {/* Username — edit display */}
              {isEdit && existingUser && (
                <View>
                  <FieldLabel label={t('staff.username')} />
                  <Text className={`${typo.labelBold} text-gray-400 dark:text-gray-500`}>
                    {existingUser.username}
                  </Text>
                </View>
              )}

              {/* Auto-generated password — create only */}
              {!isEdit && (
                <View className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 border border-amber-200 dark:border-amber-700">
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className={`${typo.captionBold} text-gray-500 dark:text-gray-400`}>
                      {t('staff.tempPassword')}
                    </Text>
                    <TouchableOpacity
                      onPress={regeneratePassword}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      className="flex-row items-center gap-1"
                    >
                      <MaterialCommunityIcons name="refresh" size={14} color="#4f46e5" />
                      <Text className={`${typo.captionBold} text-indigo-600`}>{t('staff.regenerate')}</Text>
                    </TouchableOpacity>
                  </View>
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className={`${typo.section} text-indigo-600 tracking-widest flex-1`}>
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
                    <Text className={`${typo.caption} text-amber-600 dark:text-amber-400 flex-1`}>
                      {t('staff.tempPasswordHint')}
                    </Text>
                  </View>
                </View>
              )}

              {/* Role picker */}
              <View>
                <FieldLabel label={t('staff.role')} />
                <View className="gap-2 mt-0.5">
                  {availableRoles.map((role) => {
                    const color = ROLE_COLORS[role] ?? '#6b7280';
                    const isSelected = selectedRole === role;
                    return (
                      <TouchableOpacity
                        key={role}
                        onPress={() => !isSelf && setSelectedRole(role)}
                        activeOpacity={isSelf ? 1 : 0.7}
                        className="flex-row items-center py-3 px-3 rounded-xl border"
                        style={{
                          borderColor: isSelected ? color : '#e5e7eb',
                          backgroundColor: isSelected ? color + '10' : 'transparent',
                        }}
                      >
                        <View
                          style={{
                            width: 20, height: 20, borderRadius: 10,
                            borderWidth: 2,
                            borderColor: isSelected ? color : '#d1d5db',
                            backgroundColor: isSelected ? color : 'transparent',
                            alignItems: 'center', justifyContent: 'center', marginRight: 10,
                          }}
                        >
                          {isSelected && <MaterialCommunityIcons name="check" size={12} color="white" />}
                        </View>
                        <Text
                          style={{ color: isSelected ? color : undefined }}
                          className={`${typo.labelBold} ${isSelected ? '' : 'text-gray-700 dark:text-gray-200'}`}
                        >
                          {t(`roles.${role}`, { defaultValue: role })}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>
          </View>

          {/* ── Section 2: Contact ── */}
          <CollapseSection
            title={t('staff.sectionContact')}
            icon="phone-outline"
            isOpen={openSections.has('contact')}
            onToggle={() => toggleSection('contact')}
          >
            <View>
              <FieldLabel label={t('staff.phone')} />
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder={t('staff.phonePlaceholder')}
                placeholderTextColor="#9ca3af"
                keyboardType="phone-pad"
                editable={!isSelf}
                className={`${typo.inputSize} text-gray-900 dark:text-white${isSelf ? ' opacity-60' : ''}`}
              />
            </View>
            <View>
              <FieldLabel label={t('staff.email')} />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder={t('staff.emailPlaceholder')}
                placeholderTextColor="#9ca3af"
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!isSelf}
                className={`${typo.inputSize} text-gray-900 dark:text-white${isSelf ? ' opacity-60' : ''}`}
              />
            </View>
          </CollapseSection>

          {/* ── Section 3: Work Info ── */}
          <CollapseSection
            title={t('staff.sectionWorkInfo')}
            icon="briefcase-outline"
            isOpen={openSections.has('work')}
            onToggle={() => toggleSection('work')}
          >
            <View>
              <FieldLabel label={t('staff.hireDate')} />
              <View pointerEvents={isSelf ? 'none' : 'auto'} style={isSelf ? { opacity: 0.6 } : undefined}>
                <DatePickerInput
                  value={hireDate}
                  onChange={setHireDate}
                  placeholder={t('staff.hireDatePlaceholder')}
                  maximumDate={new Date()}
                />
              </View>
            </View>
            <View>
              <FieldLabel label={t('staff.baseWage')} />
              <TextInput
                value={baseWage}
                onChangeText={setBaseWage}
                placeholder={t('staff.baseWagePlaceholder')}
                placeholderTextColor="#9ca3af"
                keyboardType="numeric"
                editable={!isSelf}
                className={`${typo.inputSize} text-gray-900 dark:text-white${isSelf ? ' opacity-60' : ''}`}
              />
            </View>
            <View>
              <FieldLabel label={t('staff.commissionRate')} />
              <TextInput
                value={commissionRate}
                onChangeText={setCommissionRate}
                placeholder={t('staff.commissionRatePlaceholder')}
                placeholderTextColor="#9ca3af"
                keyboardType="decimal-pad"
                editable={!isSelf}
                className={`${typo.inputSize} text-gray-900 dark:text-white${isSelf ? ' opacity-60' : ''}`}
              />
            </View>
          </CollapseSection>

          {/* ── Section 4: Personal Info ── */}
          <CollapseSection
            title={t('staff.sectionPersonal')}
            icon="account-outline"
            isOpen={openSections.has('personal')}
            onToggle={() => toggleSection('personal')}
          >
            <View>
              <FieldLabel label={t('staff.dateOfBirth')} />
              <View pointerEvents={isSelf ? 'none' : 'auto'} style={isSelf ? { opacity: 0.6 } : undefined}>
                <DatePickerInput
                  value={dateOfBirth}
                  onChange={setDateOfBirth}
                  placeholder={t('staff.hireDatePlaceholder')}
                  maximumDate={new Date()}
                />
              </View>
            </View>
            <View>
              <FieldLabel label={t('staff.gender')} />
              <View className="flex-row gap-2 mt-0.5">
                {GENDERS.map((g) => (
                  <TouchableOpacity
                    key={g.key}
                    onPress={() => !isSelf && setGender((prev) => (prev === g.key ? '' : g.key))}
                    className={`px-4 py-1.5 rounded-full border ${
                      gender === g.key
                        ? 'bg-indigo-600 border-indigo-600'
                        : 'border-gray-200 dark:border-gray-600'
                    }`}
                  >
                    <Text className={`${typo.caption} font-medium ${
                      gender === g.key ? 'text-white' : 'text-gray-600 dark:text-gray-300'
                    }`}>
                      {g.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View>
              <FieldLabel label={t('staff.permanentAddress')} />
              <TextInput
                value={permanentAddress}
                onChangeText={setPermanentAddress}
                placeholder={t('staff.permanentAddressPlaceholder')}
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={2}
                editable={!isSelf}
                className={`${typo.inputSize} text-gray-900 dark:text-white${isSelf ? ' opacity-60' : ''}`}
                style={{ textAlignVertical: 'top' }}
              />
            </View>
          </CollapseSection>

          {/* ── Section 5: ID Card ── */}
          <CollapseSection
            title={t('staff.sectionIdCard')}
            icon="card-account-details-outline"
            isOpen={openSections.has('idcard')}
            onToggle={() => toggleSection('idcard')}
          >
            <View>
              <FieldLabel label={t('staff.idCardNumber')} />
              <TextInput
                value={idCardNumber}
                onChangeText={setIdCardNumber}
                placeholder={t('staff.idCardNumberPlaceholder')}
                placeholderTextColor="#9ca3af"
                keyboardType="numeric"
                editable={!isSelf}
                className={`${typo.inputSize} text-gray-900 dark:text-white${isSelf ? ' opacity-60' : ''}`}
              />
            </View>
            <View>
              <FieldLabel label={t('staff.idCardIssuedDate')} />
              <View pointerEvents={isSelf ? 'none' : 'auto'} style={isSelf ? { opacity: 0.6 } : undefined}>
                <DatePickerInput
                  value={idCardIssuedDate}
                  onChange={setIdCardIssuedDate}
                  placeholder={t('staff.hireDatePlaceholder')}
                  maximumDate={new Date()}
                />
              </View>
            </View>
            <View>
              <FieldLabel label={t('staff.idCardIssuedPlace')} />
              <TextInput
                value={idCardIssuedPlace}
                onChangeText={setIdCardIssuedPlace}
                placeholder={t('staff.idCardIssuedPlacePlaceholder')}
                placeholderTextColor="#9ca3af"
                editable={!isSelf}
                className={`${typo.inputSize} text-gray-900 dark:text-white${isSelf ? ' opacity-60' : ''}`}
              />
            </View>
          </CollapseSection>

          {/* ── Section 6: Notes ── */}
          <CollapseSection
            title={t('staff.sectionNotes')}
            icon="note-text-outline"
            isOpen={openSections.has('notes')}
            onToggle={() => toggleSection('notes')}
          >
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder={t('staff.notesPlaceholder')}
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={4}
              editable={!isSelf}
              className={`${typo.inputSize} text-gray-900 dark:text-white${isSelf ? ' opacity-60' : ''}`}
              style={{ textAlignVertical: 'top', minHeight: 80 }}
            />
          </CollapseSection>

          {/* ── Section 7: Performance (edit + ORDER_VIEW_ALL only) ── */}
          {isEdit && canViewAllOrders && (
            <CollapseSection
              title={t('staff.sectionPerformance')}
              icon="chart-bar"
              isOpen={openSections.has('perf')}
              onToggle={() => toggleSection('perf')}
            >
              {/* Summary stats grid */}
              <View className="flex-row flex-wrap gap-2">
                {([
                  { key: 'perfOrders', value: staffSummary?.orderCount ?? '–' },
                  { key: 'perfRevenue', value: staffSummary?.totalRevenue != null ? new Intl.NumberFormat('vi-VN').format(staffSummary.totalRevenue) + ' ₫' : '–' },
                  { key: 'perfCompleted', value: staffSummary?.completedCount ?? '–' },
                  { key: 'perfCancelled', value: staffSummary?.cancelledCount ?? '–' },
                ] as const).map((stat) => (
                  <View key={stat.key} className="flex-1 bg-gray-50 dark:bg-gray-700 rounded-xl p-3" style={{ minWidth: '45%' }}>
                    <Text className={`${typo.caption} text-gray-500 dark:text-gray-400`}>{t(`staff.${stat.key}`)}</Text>
                    <Text className={`${typo.labelBold} text-gray-900 dark:text-white mt-0.5`}>{String(stat.value)}</Text>
                  </View>
                ))}
              </View>
              {/* Trend chart */}
              <TrendChart
                data={staffChartData ?? []}
                color="#4f46e5"
                granularity={chartGranularity}
                allowedGranularities={['day', 'week', 'month', 'year']}
                onGranularityChange={setChartGranularity}
              />
            </CollapseSection>
          )}

          {/* ── Section 8: Orders (edit + ORDER_VIEW_ALL only) ── */}
          {isEdit && canViewAllOrders && (
            <CollapseSection
              title={t('staff.sectionOrders')}
              icon="receipt"
              isOpen={openSections.has('orders')}
              onToggle={() => toggleSection('orders')}
            >
              {/* Status filter chips */}
              {isServiceShop && (
                <View className="flex-row gap-2 flex-wrap">
                  {(['ALL', 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const).map((s) => (
                    <TouchableOpacity
                      key={s}
                      onPress={() => setOrderStatusFilter(s)}
                      className={`px-3 py-1 rounded-full border ${
                        orderStatusFilter === s
                          ? 'bg-indigo-600 border-indigo-600'
                          : 'border-gray-200 dark:border-gray-600'
                      }`}
                    >
                      <Text className={`${typo.captionBold} ${orderStatusFilter === s ? 'text-white' : 'text-gray-600 dark:text-gray-300'}`}>
                        {s === 'ALL' ? t('staff.orderStatusAll')
                          : s === 'PENDING' ? t('staff.orderStatusPending')
                          : s === 'IN_PROGRESS' ? 'Đang làm'
                          : s === 'COMPLETED' ? t('staff.orderStatusCompleted')
                          : t('staff.orderStatusCancelled')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {/* Order rows */}
              {staffOrdersData?.content.length === 0 ? (
                <Text className={`${typo.caption} text-gray-400 text-center py-4`}>{t('staff.noOrders')}</Text>
              ) : (
                staffOrdersData?.content.map((order) => {
                  const statusColor = order.status === 'COMPLETED' ? '#10b981'
                    : order.status === 'CANCELLED' ? '#ef4444'
                    : order.status === 'PENDING' ? '#f59e0b'
                    : '#3b82f6';
                  return (
                    <View
                      key={order.id}
                      className="flex-row items-center py-2.5 border-b border-gray-50 dark:border-gray-700"
                    >
                      <View className="flex-1">
                        <Text className={`${typo.label} text-gray-800 dark:text-gray-100`}>
                          #{order.orderNumber}
                        </Text>
                        <Text className={`${typo.caption} text-gray-400 mt-0.5`}>
                          {order.customerName ?? '—'} · {new Date(order.createdAt).toLocaleDateString('vi-VN')}
                        </Text>
                      </View>
                      <View className="items-end gap-1">
                        <Text className={`${typo.labelBold} text-gray-900 dark:text-white`}>
                          {new Intl.NumberFormat('vi-VN').format(order.total)} ₫
                        </Text>
                        <View style={{ backgroundColor: statusColor + '20', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                          <Text style={{ color: statusColor, fontSize: 10, fontWeight: '600' }}>
                            {order.status === 'COMPLETED' ? t('staff.orderStatusCompleted')
                              : order.status === 'CANCELLED' ? t('staff.orderStatusCancelled')
                              : order.status === 'PENDING' ? t('staff.orderStatusPending')
                              : 'Đang làm'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })
              )}
            </CollapseSection>
          )}

          {/* ── Edit-only actions ── */}
          {isEdit && existingUser && !isSelf && (
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
                <Text className={`flex-1 ${typo.labelBold} text-gray-800 dark:text-gray-200`}>
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
                <View className={`w-10 h-10 rounded-xl items-center justify-center mr-3 ${
                  isCurrentUserActive ? 'bg-red-50 dark:bg-red-900/30' : 'bg-green-50 dark:bg-green-900/30'
                }`}>
                  <MaterialCommunityIcons
                    name={isCurrentUserActive ? 'account-cancel-outline' : 'account-check-outline'}
                    size={20}
                    color={isCurrentUserActive ? '#dc2626' : '#16a34a'}
                  />
                </View>
                <Text className={`flex-1 ${typo.labelBold} ${
                  isCurrentUserActive ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                }`}>
                  {isCurrentUserActive ? t('staff.deactivate') : t('staff.activate')}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
        </>
      )}

      {/* One-time credential modal */}
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

      {/* Reset password modal */}
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
