import { useCallback, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScrollView } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { shopUserApi, type ShopUser } from '../../services/api';
import { useTypography } from '../../hooks/useTypography';
import { Skeleton } from '../../components/Skeleton';
import { ErrorState } from '../../components/ErrorState';
import type { MoreScreenProps } from '../../types/navigation';

type StatusFilter = 'all' | 'active' | 'inactive';
type RoleFilter = 'all' | 'MANAGER' | 'CASHIER' | 'RECEPTIONIST' | 'TECHNICIAN' | 'SERVICE_STAFF' | 'ACCOUNTANT' | 'WAREHOUSE_STAFF' | 'CLEANER';

type Props = MoreScreenProps<'StaffList'>;

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

function RoleBadge({ role }: { role: string }) {
  const { t } = useTranslation();
  const color = ROLE_COLORS[role] ?? '#6b7280';
  return (
    <View
      style={{ backgroundColor: color + '20', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 }}
    >
      <Text style={{ color, fontSize: 11, fontWeight: '600' }}>
        {t(`roles.${role}`, { defaultValue: role })}
      </Text>
    </View>
  );
}

function StaffRow({ item, index, onPress }: { item: ShopUser; index: number; onPress: () => void }) {
  const { t } = useTranslation();
  const typo = useTypography();
  const initials = (item.fullName ?? item.username).charAt(0).toUpperCase();
  const primaryRole = item.roles.find((r) => r.name !== 'SHOP_OWNER') ?? item.roles[0];
  const avatarColor = ROLE_COLORS[primaryRole?.name ?? 'CASHIER'] ?? '#6b7280';
  const isActive = item.active && item.accountNonLocked;

  return (
    <TouchableOpacity
      testID={`staff-row-${index}`}
      onPress={onPress}
      activeOpacity={0.75}
      className="bg-white dark:bg-gray-800 rounded-2xl p-4 mb-3 border border-gray-100 dark:border-gray-700"
    >
      <View className="flex-row items-center">
        <View
          style={{ backgroundColor: avatarColor + '20', width: 44, height: 44, borderRadius: 22 }}
          className="items-center justify-center mr-3"
        >
          <Text style={{ color: avatarColor, fontSize: 18, fontWeight: '700' }}>{initials}</Text>
        </View>
        <View className="flex-1">
          <Text className={`${typo.labelBold} text-gray-900 dark:text-white`} numberOfLines={1}>
            {item.fullName ?? item.username}
          </Text>
          <Text className={`${typo.caption} text-gray-500 dark:text-gray-400`}>{item.username}</Text>
        </View>
        <View className="items-end gap-1">
          <View className="flex-row items-center gap-1">
            <View
              style={{
                width: 7,
                height: 7,
                borderRadius: 3.5,
                backgroundColor: isActive ? '#10b981' : '#ef4444',
              }}
            />
            <Text className={`${typo.caption} text-gray-400 dark:text-gray-500`}>
              {isActive ? t('staff.active') : t('staff.inactive')}
            </Text>
          </View>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={20} color="#d1d5db" style={{ marginLeft: 8 }} />
      </View>
      <View className="flex-row flex-wrap gap-1.5 mt-3 pt-3 border-t border-gray-50 dark:border-gray-700">
        {item.roles.map((r) => (
          <RoleBadge key={r.id} role={r.name} />
        ))}
      </View>
    </TouchableOpacity>
  );
}

export function StaffListScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const typo = useTypography();
  const { top, bottom } = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['shopUsers'],
    queryFn: () => shopUserApi.list().then((r) => r.data.data),
    staleTime: 120_000,
  });

  const allUsers = data?.content ?? [];
  const users = allUsers.filter((u) => {
    const matchStatus =
      statusFilter === 'active' ? u.active && u.accountNonLocked :
      statusFilter === 'inactive' ? (!u.active || !u.accountNonLocked) : true;
    if (!matchStatus) return false;
    if (roleFilter !== 'all' && !u.roles.some((r) => r.name === roleFilter)) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (u.fullName ?? '').toLowerCase().includes(q) || u.username.toLowerCase().includes(q);
  });

  const STATUS_CHIPS: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: t('staff.filterAll') },
    { key: 'active', label: t('staff.filterActive') },
    { key: 'inactive', label: t('staff.filterInactive') },
  ];

  const ROLE_CHIPS: { key: RoleFilter; label: string }[] = [
    { key: 'all', label: t('staff.filterAll') },
    { key: 'MANAGER', label: t('roles.MANAGER') },
    { key: 'CASHIER', label: t('roles.CASHIER') },
    { key: 'RECEPTIONIST', label: t('roles.RECEPTIONIST') },
    { key: 'TECHNICIAN', label: t('roles.TECHNICIAN') },
    { key: 'SERVICE_STAFF', label: t('roles.SERVICE_STAFF') },
    { key: 'ACCOUNTANT', label: t('roles.ACCOUNTANT') },
    { key: 'WAREHOUSE_STAFF', label: t('roles.WAREHOUSE_STAFF') },
    { key: 'CLEANER', label: t('roles.CLEANER') },
  ];

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['shopUsers'] });
    setRefreshing(false);
  }, [queryClient]);

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <View
        className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4"
        style={{ paddingTop: top + 12, paddingBottom: 12 }}
      >
        <View className="flex-row items-center mb-0.5">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            className="mr-2"
          >
            <MaterialCommunityIcons name="chevron-left" size={26} color="#4f46e5" />
          </TouchableOpacity>
          <Text className={`${typo.heading} text-gray-900 dark:text-white flex-1`}>
            {t('staff.title')}
          </Text>
        </View>
        <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 mb-3 mt-0.5`}>
          {t('staff.hint')}
        </Text>
        {/* Search */}
        <View className="flex-row items-center bg-gray-100 dark:bg-gray-700 rounded-xl px-3 py-2.5 mb-3">
          <MaterialCommunityIcons name="magnify" size={20} color="#9ca3af" />
          <TextInput
            className={`flex-1 ml-2 ${typo.inputSize} text-gray-800 dark:text-gray-100`}
            placeholder={t('staff.searchPlaceholder')}
            placeholderTextColor="#9ca3af"
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialCommunityIcons name="close-circle" size={18} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>
        <View className="flex-row gap-2">
          {STATUS_CHIPS.map((chip) => (
            <TouchableOpacity
              key={chip.key}
              onPress={() => setStatusFilter(chip.key)}
              className={`px-4 py-1.5 rounded-full border ${
                statusFilter === chip.key
                  ? 'bg-indigo-600 border-indigo-600'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600'
              }`}
            >
              <Text className={`${typo.caption} font-medium ${
                statusFilter === chip.key ? 'text-white' : 'text-gray-600 dark:text-gray-400'
              }`}>
                {chip.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingTop: 8 }}>
          {ROLE_CHIPS.map((chip) => (
            <TouchableOpacity
              key={chip.key}
              onPress={() => setRoleFilter(chip.key)}
              className={`px-4 py-1.5 rounded-full border ${
                roleFilter === chip.key
                  ? 'bg-violet-600 border-violet-600'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600'
              }`}
            >
              <Text className={`${typo.caption} font-medium ${
                roleFilter === chip.key ? 'text-white' : 'text-gray-600 dark:text-gray-400'
              }`}>
                {chip.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {isError ? (
        <ErrorState onRetry={refetch} />
      ) : isLoading ? (
        <View className="px-4 pt-4 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <View key={i} className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700">
              <View className="flex-row items-center">
                <Skeleton width={44} height={44} borderRadius={22} style={{ marginRight: 12 }} />
                <View className="flex-1 gap-2">
                  <Skeleton width="55%" height={15} />
                  <Skeleton width="38%" height={12} />
                </View>
                <Skeleton width={52} height={14} borderRadius={6} />
              </View>
              <View className="flex-row gap-1.5 mt-3 pt-3 border-t border-gray-50 dark:border-gray-700">
                <Skeleton width={72} height={20} borderRadius={8} />
              </View>
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, paddingBottom: bottom + 96 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#059669" />
          }
          renderItem={({ item, index }) => (
            <StaffRow
              item={item}
              index={index}
              onPress={() => navigation.navigate('StaffForm', { userId: item.id })}
            />
          )}
          ListEmptyComponent={
            <View className="items-center py-16">
              <MaterialCommunityIcons name="account-multiple-outline" size={48} color="#d1d5db" />
              <Text className={`${typo.body} text-gray-400 mt-3`}>
                {search.trim() ? t('staff.noResults') : t('staff.noStaff')}
              </Text>
              {!search.trim() && (
                <Text className={`${typo.caption} text-gray-400 mt-1 text-center px-8`}>
                  {t('staff.noStaffHint')}
                </Text>
              )}
            </View>
          }
          ListFooterComponent={
            refreshing ? (
              <View className="py-4 items-center">
                <ActivityIndicator size="small" color="#4f46e5" />
              </View>
            ) : null
          }
        />
      )}

      <TouchableOpacity
        testID="staff-add-fab"
        onPress={() => navigation.navigate('StaffForm', {})}
        activeOpacity={0.85}
        className="absolute right-5 bg-indigo-600 rounded-full w-14 h-14 items-center justify-center shadow-lg"
        style={{
          bottom: bottom + 16,
          elevation: 6,
          shadowColor: '#4f46e5',
          shadowOpacity: 0.4,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 4 },
        }}
      >
        <MaterialCommunityIcons name="plus" size={28} color="white" />
      </TouchableOpacity>
    </View>
  );
}
