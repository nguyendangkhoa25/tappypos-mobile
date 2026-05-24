import { useState, useEffect, useCallback, useMemo } from 'react';
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
  Switch,
} from 'react-native';
import { ErrorState } from '../../components/ErrorState';
import { Skeleton } from '../../components/Skeleton';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { shopUserApi, shopConfigApi, employeeApi } from '../../services/api';
import { AvatarImage } from '../../components/AvatarImage';
import { ImagePickerSheet } from '../../components/ImagePickerSheet';
import type { EmployeeProfile } from '../../services/api';
import { useToastStore } from '../../store/toastStore';
import { useAlertStore } from '../../store/alertStore';
import { DatePickerInput } from '../../components/DatePickerInput';
import { IdCardSection, EMPTY_ID_CARD_DATA, type IdCardData } from '../../components/IdCardSection';
import { useAuthStore } from '../../store/authStore';
import { useTypography } from '../../hooks/useTypography';
import { PhoneInput } from '../../components/PhoneInput';
import type { MoreScreenProps } from '../../types/navigation';

// ── Feature Matrix Constants ──────────────────────────────────────────────────

/** Direct dependencies: selecting feature X auto-selects its deps (transitively). */
const FEATURE_DEPS: Record<string, string[]> = {
  SALARY:           ['EMPLOYEE'],
  SALARY_VIEW_ALL:  ['SALARY'],
  COMMISSION:       ['EMPLOYEE', 'ORDER'],
  COMMISSION_VIEW_ALL: ['COMMISSION'],
  ORDER_VIEW_ALL:   ['ORDER'],
  MY_WORK:          ['EMPLOYEE'],
  LOYALTY:          ['CUSTOMER', 'ORDER'],
  INVENTORY:        ['PRODUCT'],
  VENDOR:           ['PRODUCT'],
  POS:              ['ORDER', 'PRODUCT'],
  PROMOTION:        ['ORDER'],
  INVOICE:          ['ORDER'],
  REVENUE:          ['ORDER'],
  ACCOUNTING:       ['REVENUE', 'EXPENSE'],
  GOLD_PRICE_CHART: ['GOLD_PRICE'],
  PAWN:             ['GOLD_PRICE', 'CUSTOMER'],
  TABLE_SERVICE:    ['POS'],           // F&B table grid requires the POS sell flow (ORDER + PRODUCT transitively)
};

const FEATURE_META: Record<string, { name: string; desc: string }> = {
  DASHBOARD:            { name: 'Bảng Điều Khiển',         desc: 'Xem tổng quan và thống kê chính' },
  ORDER:                { name: 'Đơn Hàng',                 desc: 'Tạo và quản lý đơn hàng' },
  ORDER_VIEW_ALL:       { name: 'Xem Tất Cả Đơn Hàng',     desc: 'Xem đơn của toàn bộ nhân viên' },
  MY_WORK:              { name: 'Công Việc Của Tôi',        desc: 'Xem công việc được giao' },
  PRODUCT:              { name: 'Sản Phẩm & Dịch Vụ',      desc: 'Quản lý danh sách sản phẩm' },
  PROMOTION:            { name: 'Khuyến Mãi',               desc: 'Tạo và quản lý khuyến mãi' },
  EMPLOYEE:             { name: 'Nhân Viên',                desc: 'Quản lý hồ sơ nhân viên' },
  SALARY:               { name: 'Lương',                    desc: 'Quản lý bảng lương và chi trả' },
  SALARY_VIEW_ALL:      { name: 'Xem Tất Cả Bảng Lương',   desc: 'Xem lương của toàn bộ nhân viên' },
  CUSTOMER:             { name: 'Khách Hàng',               desc: 'Quản lý thông tin khách hàng' },
  LOYALTY:              { name: 'Tích Điểm',                desc: 'Chương trình tích điểm khách hàng' },
  INVOICE:              { name: 'Hóa Đơn',                  desc: 'Xuất hóa đơn điện tử' },
  REVENUE:              { name: 'Doanh Thu',                 desc: 'Xem báo cáo doanh thu' },
  EXPENSE:              { name: 'Chi Phí',                   desc: 'Quản lý chi phí hoạt động' },
  USER:                 { name: 'Người Dùng',               desc: 'Quản lý tài khoản và phân quyền' },
  SHOP_INFO:            { name: 'Thông Tin Cửa Hàng',       desc: 'Cập nhật thông tin và cấu hình' },
  VENDOR:               { name: 'Nhà Cung Cấp',             desc: 'Quản lý nhà cung cấp và đơn nhập' },
  INVENTORY:            { name: 'Quản Lý Kho',              desc: 'Quản lý tồn kho' },
  POS:                  { name: 'Điểm Bán Hàng',            desc: 'Bán hàng tại quầy' },
  ACTIVITY_LOG:         { name: 'Nhật Ký Hoạt Động',       desc: 'Xem lịch sử thao tác của nhân viên' },
  PAWN:                 { name: 'Cầm Đồ',                   desc: 'Quản lý hợp đồng cầm đồ' },
  NOTIFICATION:         { name: 'Thông Báo',                desc: 'Nhận thông báo từ hệ thống' },
  FEEDBACK:             { name: 'Góp Ý',                    desc: 'Gửi phản hồi đến quản trị hệ thống' },
  PRINT_TEMPLATE:       { name: 'Mẫu In',                   desc: 'Quản lý mẫu in biên nhận' },
  BANK_ACCOUNT:         { name: 'Tài Khoản Ngân Hàng',     desc: 'Quản lý tài khoản ngân hàng' },
  ACCOUNTING:           { name: 'Kế Toán',                  desc: 'Báo cáo kế toán tổng hợp' },
  GOLD_PRICE:           { name: 'Bảng Giá Vàng',            desc: 'Quản lý bảng giá vàng' },
  GOLD_PRICE_CHART:     { name: 'Biểu Đồ Giá Vàng',        desc: 'Xem biểu đồ giá vàng thực tế' },
  COMMISSION:           { name: 'Hoa Hồng',                 desc: 'Tính hoa hồng cho nhân viên' },
  COMMISSION_VIEW_ALL:  { name: 'Xem Hoa Hồng Toàn Đội',   desc: 'Xem hoa hồng của tất cả nhân viên' },
  GOOGLE_DRIVE:         { name: 'Google Drive',             desc: 'Kết nối Google Drive lưu ảnh' },
  APPOINTMENT:          { name: 'Lịch Hẹn',                 desc: 'Quản lý lịch hẹn với khách hàng' },
  TABLE_SERVICE:        { name: 'Quản Lý Bàn',              desc: 'Theo dõi trạng thái bàn' },
};

type FeatureNode = { feature: string; children?: string[] };
type FeatureCategory = { key: string; label: string; items: FeatureNode[] };

const FEATURE_CATEGORIES: FeatureCategory[] = [
  { key: 'core',     label: 'Cơ Bản',              items: [{ feature: 'DASHBOARD' }, { feature: 'ORDER', children: ['ORDER_VIEW_ALL'] }, { feature: 'POS' }, { feature: 'MY_WORK' }] },
  { key: 'products', label: 'Sản Phẩm & Kho',      items: [{ feature: 'PRODUCT' }, { feature: 'INVENTORY' }, { feature: 'VENDOR' }, { feature: 'PROMOTION' }] },
  { key: 'customers',label: 'Khách Hàng',           items: [{ feature: 'CUSTOMER' }, { feature: 'LOYALTY' }] },
  { key: 'staff',    label: 'Nhân Viên',            items: [{ feature: 'EMPLOYEE' }, { feature: 'SALARY', children: ['SALARY_VIEW_ALL'] }, { feature: 'COMMISSION', children: ['COMMISSION_VIEW_ALL'] }] },
  { key: 'finance',  label: 'Tài Chính',            items: [{ feature: 'REVENUE' }, { feature: 'EXPENSE' }, { feature: 'INVOICE' }, { feature: 'ACCOUNTING' }] },
  { key: 'shop',     label: 'Quản Lý Cửa Hàng',    items: [{ feature: 'SHOP_INFO' }, { feature: 'USER' }, { feature: 'PRINT_TEMPLATE' }, { feature: 'BANK_ACCOUNT' }, { feature: 'ACTIVITY_LOG' }] },
  { key: 'special',  label: 'Đặc Biệt',             items: [{ feature: 'PAWN' }, { feature: 'GOLD_PRICE', children: ['GOLD_PRICE_CHART'] }, { feature: 'APPOINTMENT' }, { feature: 'TABLE_SERVICE' }, { feature: 'GOOGLE_DRIVE' }] },
  { key: 'system',   label: 'Hệ Thống',             items: [{ feature: 'NOTIFICATION' }, { feature: 'FEEDBACK' }] },
];

/**
 * Features that are ALWAYS mandatory for a given role.
 * These are locked regardless of what else is selected — the role cannot function without them.
 * Mirrors ROLE_REQUIRED_FEATURES in frontend/src/constants/tenantConstants.js.
 */
const ROLE_REQUIRED_FEATURES: Record<string, string[]> = {
  MANAGER:         ['DASHBOARD', 'ORDER'],
  CASHIER:         ['ORDER', 'POS'],
  ACCOUNTANT:      ['REVENUE'],
  WAREHOUSE_STAFF: ['INVENTORY'],
  SERVICE_STAFF:   ['ORDER'],
  TECHNICIAN:      ['ORDER'],
  RECEPTIONIST:    ['CUSTOMER'],
  CLEANER:         ['DASHBOARD'],
};

/** Per-role default features (used to pre-populate the matrix when custom is enabled). */
const ROLE_DEFAULT_FEATURES: Record<string, string[]> = {
  MANAGER:        ['DASHBOARD', 'MY_WORK', 'ORDER', 'ORDER_VIEW_ALL', 'PRODUCT', 'PROMOTION', 'EMPLOYEE', 'CUSTOMER', 'LOYALTY', 'INVOICE', 'ACCOUNTING', 'REVENUE', 'EXPENSE', 'SHOP_INFO', 'PRINT_TEMPLATE', 'BANK_ACCOUNT', 'VENDOR', 'INVENTORY', 'POS', 'TABLE_SERVICE', 'ACTIVITY_LOG', 'PAWN', 'GOLD_PRICE', 'GOLD_PRICE_CHART', 'NOTIFICATION', 'FEEDBACK', 'COMMISSION', 'COMMISSION_VIEW_ALL', 'SALARY', 'SALARY_VIEW_ALL'],
  CASHIER:        ['DASHBOARD', 'MY_WORK', 'ORDER', 'POS', 'TABLE_SERVICE', 'CUSTOMER', 'LOYALTY', 'PROMOTION', 'NOTIFICATION', 'FEEDBACK', 'COMMISSION'],
  ACCOUNTANT:     ['DASHBOARD', 'MY_WORK', 'REVENUE', 'EXPENSE', 'SALARY', 'INVOICE', 'ACCOUNTING', 'CUSTOMER', 'NOTIFICATION', 'FEEDBACK'],
  WAREHOUSE_STAFF:['DASHBOARD', 'MY_WORK', 'INVENTORY', 'PRODUCT', 'VENDOR', 'NOTIFICATION'],
  SERVICE_STAFF:  ['DASHBOARD', 'MY_WORK', 'ORDER', 'POS', 'TABLE_SERVICE', 'CUSTOMER', 'NOTIFICATION'],
  TECHNICIAN:     ['DASHBOARD', 'MY_WORK', 'ORDER', 'PRODUCT', 'CUSTOMER', 'INVENTORY', 'POS', 'NOTIFICATION'],
  RECEPTIONIST:   ['DASHBOARD', 'MY_WORK', 'ORDER', 'CUSTOMER', 'POS', 'TABLE_SERVICE', 'NOTIFICATION'],
  CLEANER:        ['DASHBOARD', 'MY_WORK', 'NOTIFICATION'],
};

/** Collect all transitive dependencies for a feature (BFS). */
function getAllDeps(feature: string): string[] {
  const visited = new Set<string>();
  const queue = [...(FEATURE_DEPS[feature] ?? [])];
  while (queue.length > 0) {
    const curr = queue.shift()!;
    if (visited.has(curr)) continue;
    visited.add(curr);
    (FEATURE_DEPS[curr] ?? []).forEach((d) => queue.push(d));
  }
  return [...visited];
}

/**
 * Which OTHER selected features (transitively) require `featureKey` as a dependency?
 * Returns their display names so we can show "Bắt buộc cho: X, Y".
 */
function getRequiredByNames(selected: Set<string>, featureKey: string): string[] {
  const names: string[] = [];
  selected.forEach((f) => {
    if (f !== featureKey && getAllDeps(f).includes(featureKey)) {
      names.push(FEATURE_META[f]?.name ?? f);
    }
  });
  return names;
}

/**
 * Is `featureKey` mandatory for `role` (i.e. the role cannot function without it)?
 * Returns the Vietnamese role label if locked, null otherwise.
 */
function getRoleRequiredReason(role: string, featureKey: string): string | null {
  const required = ROLE_REQUIRED_FEATURES[role];
  if (!required) return null;
  // Also lock transitive deps of each role-required feature
  const allRoleRequired = new Set<string>(required);
  required.forEach((f) => getAllDeps(f).forEach((d) => allRoleRequired.add(d)));
  return allRoleRequired.has(featureKey) ? (ROLE_LABELS[role] ?? role) : null;
}

/** Vietnamese labels for roles — used in lock reason messages. */
const ROLE_LABELS: Record<string, string> = {
  MANAGER:         'Quản lý',
  CASHIER:         'Thu ngân',
  ACCOUNTANT:      'Kế toán',
  WAREHOUSE_STAFF: 'Thủ kho',
  SERVICE_STAFF:   'Nhân viên phục vụ',
  TECHNICIAN:      'Kỹ thuật viên',
  RECEPTIONIST:    'Lễ tân',
  CLEANER:         'Tạp vụ',
};

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

// ── Feature Matrix Component ──────────────────────────────────────────────────

type FeatureRowProps = {
  featureKey: string;
  isSelected: boolean;
  /** Locked because another selected feature depends on this one. */
  isDepRequired: boolean;
  depRequiredByNames: string[];
  /** Locked because the current role mandates this feature. */
  isRoleRequired: boolean;
  roleRequiredReason: string | null;
  isAvailable: boolean;
  indent?: boolean;
  onToggle: (key: string) => void;
  typo: ReturnType<typeof useTypography>;
};

function FeatureRow({
  featureKey, isSelected, isDepRequired, depRequiredByNames,
  isRoleRequired, roleRequiredReason, isAvailable, indent, onToggle, typo,
}: FeatureRowProps) {
  const showToast = useToastStore((s) => s.show);
  const meta = FEATURE_META[featureKey];

  if (!isAvailable || !meta) return null;

  const isLocked = isDepRequired || isRoleRequired;

  const lockMessage = isRoleRequired
    ? `🔒 Bắt buộc cho vai trò: ${roleRequiredReason}`
    : isDepRequired
    ? `🔒 Bắt buộc cho: ${depRequiredByNames.join(', ')}`
    : null;

  const handlePress = () => {
    if (isLocked) {
      if (lockMessage) showToast(lockMessage);
      return;
    }
    onToggle(featureKey);
  };

  // Role-required: amber tint; dependency-required: indigo tint; unselected: gray
  const borderColor = isRoleRequired ? '#fbbf24' : isDepRequired ? '#a5b4fc' : isSelected ? '#4f46e5' : '#d1d5db';
  const bgColor = isSelected
    ? (isRoleRequired ? '#fef3c7' : isDepRequired ? '#c7d2fe' : '#4f46e5')
    : 'transparent';
  const checkColor = isRoleRequired ? '#d97706' : isDepRequired ? '#4f46e5' : 'white';
  const textStyle = isRoleRequired ? { color: '#d97706' } : isDepRequired ? { color: '#6366f1' } : undefined;

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      className="flex-row items-start py-2.5"
      style={indent ? { paddingLeft: 24 } : undefined}
    >
      {/* Indent connector */}
      {indent && (
        <View style={{ width: 16, alignItems: 'center', marginRight: 4, paddingTop: 2 }}>
          <Text className={`${typo.label} text-gray-300`}>└</Text>
        </View>
      )}
      {/* Checkbox */}
      <View
        style={{
          width: 20, height: 20, borderRadius: 5, borderWidth: 2,
          borderColor, backgroundColor: bgColor,
          alignItems: 'center', justifyContent: 'center',
          marginRight: 10, marginTop: 1, flexShrink: 0,
        }}
      >
        {isSelected && (
          isLocked
            ? <MaterialCommunityIcons name="lock" size={11} color={checkColor} />
            : <MaterialCommunityIcons name="check" size={12} color="white" />
        )}
      </View>
      {/* Text */}
      <View className="flex-1">
        <Text
          className={`${typo.label} ${isSelected ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}
          style={textStyle}
        >
          {meta.name}
        </Text>
        <Text className={`${typo.caption} text-gray-400 dark:text-gray-500 mt-0.5`}>
          {lockMessage ?? meta.desc}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

type FeatureMatrixProps = {
  tenantFeatures: string[];
  selectedFeatures: Set<string>;
  selectedRole: string;
  onToggle: (key: string) => void;
  typo: ReturnType<typeof useTypography>;
};

function FeatureMatrix({ tenantFeatures, selectedFeatures, selectedRole, onToggle, typo }: FeatureMatrixProps) {
  const tenantSet = useMemo(() => new Set(tenantFeatures), [tenantFeatures]);

  const categories = useMemo(() =>
    FEATURE_CATEGORIES.filter((cat) =>
      cat.items.some(
        ({ feature, children }) =>
          tenantSet.has(feature) || children?.some((c) => tenantSet.has(c))
      )
    ),
    [tenantSet]
  );

  if (categories.length === 0) {
    return (
      <View className="items-center py-6">
        <Text className={`${typo.caption} text-gray-400 dark:text-gray-500`}>Không có tính năng nào</Text>
      </View>
    );
  }

  return (
    <View className="gap-4">
      {categories.map((cat) => {
        const visibleItems = cat.items.filter(
          ({ feature, children }) =>
            tenantSet.has(feature) || children?.some((c) => tenantSet.has(c))
        );
        return (
          <View key={cat.key}>
            {/* Category header */}
            <Text
              className={`${typo.captionBold} text-indigo-500 dark:text-indigo-400 uppercase tracking-wider mb-1`}
            >
              {cat.label}
            </Text>
            {/* Feature rows */}
            {visibleItems.map(({ feature, children }) => {
              const depRequiredBy = getRequiredByNames(selectedFeatures, feature);
              const roleReason = getRoleRequiredReason(selectedRole, feature);
              return (
                <View key={feature}>
                  {tenantSet.has(feature) && (
                    <FeatureRow
                      featureKey={feature}
                      isSelected={selectedFeatures.has(feature)}
                      isDepRequired={depRequiredBy.length > 0}
                      depRequiredByNames={depRequiredBy}
                      isRoleRequired={roleReason !== null}
                      roleRequiredReason={roleReason}
                      isAvailable={tenantSet.has(feature)}
                      onToggle={onToggle}
                      typo={typo}
                    />
                  )}
                  {/* Sub-features */}
                  {children?.map((child) => {
                    const childDepRequiredBy = getRequiredByNames(selectedFeatures, child);
                    const childRoleReason = getRoleRequiredReason(selectedRole, child);
                    return (
                      <FeatureRow
                        key={child}
                        featureKey={child}
                        isSelected={selectedFeatures.has(child)}
                        isDepRequired={childDepRequiredBy.length > 0}
                        depRequiredByNames={childDepRequiredBy}
                        isRoleRequired={childRoleReason !== null}
                        roleRequiredReason={childRoleReason}
                        isAvailable={tenantSet.has(child)}
                        indent
                        onToggle={onToggle}
                        typo={typo}
                      />
                    );
                  })}
                </View>
              );
            })}
          </View>
        );
      })}
    </View>
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

  // ── ID card fields (all managed as one block)
  const [idCard, setIdCard] = useState<IdCardData>(EMPTY_ID_CARD_DATA);
  function setIdCardField<K extends keyof IdCardData>(key: K, val: IdCardData[K]) {
    setIdCard((prev) => ({ ...prev, [key]: val }));
  }

  // ── Notes
  const [notes, setNotes] = useState('');

  // ── Feature matrix
  const [useCustomFeatures, setUseCustomFeatures] = useState(false);
  const [selectedFeatures, setSelectedFeatures] = useState<Set<string>>(new Set());

  // ── UI state
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
  const [avatarPickerVisible, setAvatarPickerVisible] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
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

  const { data: tenantFeatures = [] } = useQuery({
    queryKey: ['tenantFeatures'],
    queryFn: () => shopUserApi.tenantFeatures().then((r) => r.data.data ?? []),
    staleTime: 30 * 60_000,
  });

  const isServiceShop = SERVICE_SHOP_TYPES.has(shopInfo?.shopTypeCode ?? '');
  const availableRoles = isServiceShop ? [...SERVICE_SHOP_ROLES] : [...ALL_ASSIGNABLE_ROLES];

  const { data: existingUser, isLoading: loadingUser, isError: userError, refetch: refetchUser } = useQuery({
    queryKey: ['shopUser', userId],
    queryFn: () => shopUserApi.getById(userId!).then((r) => r.data.data),
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

  // ── Populate form from existing data
  useEffect(() => {
    if (existingUser) {
      setFullName(existingUser.fullName ?? '');
      const role = existingUser.roles.find((r) => r.name !== 'SHOP_OWNER') ?? existingUser.roles[0];
      setSelectedRole(role?.name ?? 'CASHIER');
      // Load per-user feature overrides if set
      if (existingUser.userFeatureNames && existingUser.userFeatureNames.length > 0) {
        setUseCustomFeatures(true);
        setSelectedFeatures(new Set(existingUser.userFeatureNames));
      }
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
      setIdCard({
        idCardNumber: employeeProfile.idCardNumber ?? '',
        idCardFullName: employeeProfile.idCardFullName ?? '',
        idCardSex: employeeProfile.idCardSex ?? '',
        idCardNationality: employeeProfile.idCardNationality ?? '',
        idCardPlaceOfOrigin: employeeProfile.idCardPlaceOfOrigin ?? '',
        idCardPlaceOfResidence: employeeProfile.idCardPlaceOfResidence ?? employeeProfile.permanentAddress ?? '',
        idCardDateOfBirth: fromIsoDate(employeeProfile.idCardDateOfBirth),
        idCardIssuedDate: fromIsoDate(employeeProfile.idCardIssuedDate),
        idCardIssuedPlace: employeeProfile.idCardIssuedPlace ?? '',
      });
      setNotes(employeeProfile.notes ?? '');

      // Auto-open sections that have data
      const auto = new Set<string>();
      if (employeeProfile.phone || employeeProfile.email) auto.add('contact');
      if (employeeProfile.hireDate || employeeProfile.baseWage != null) auto.add('work');
      if (employeeProfile.dateOfBirth || employeeProfile.gender) auto.add('personal');
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

  // When role changes while custom features is ON: ensure role-required features stay selected
  useEffect(() => {
    if (!useCustomFeatures) return;
    const tenantSet = new Set(tenantFeatures);
    setSelectedFeatures((prev) => mergeRoleRequired(prev, selectedRole, tenantSet));
  }, [selectedRole, useCustomFeatures]); // intentionally omit tenantFeatures + mergeRoleRequired (stable)

  const regeneratePassword = useCallback(() => setPassword(generatePassword()), []);

  /** Toggle individual feature; auto-selects transitive deps on enable. */
  const handleToggleFeature = useCallback((featureKey: string) => {
    setSelectedFeatures((prev) => {
      const isSelected = prev.has(featureKey);
      // Guard: locked by dependency of another selected feature
      if (isSelected && getRequiredByNames(prev, featureKey).length > 0) return prev;
      // Guard: role-required (can't remove)
      if (isSelected && getRoleRequiredReason(selectedRole, featureKey) !== null) return prev;
      const next = new Set(prev);
      if (isSelected) {
        next.delete(featureKey);
      } else {
        next.add(featureKey);
        // Auto-select all transitive dependencies
        getAllDeps(featureKey).forEach((dep) => next.add(dep));
      }
      return next;
    });
  }, [selectedRole]);

  /**
   * Merge role-required features (+ their transitive deps) into a feature set,
   * filtered to only features the tenant has.
   */
  const mergeRoleRequired = useCallback((base: Set<string>, role: string, tenantSet: Set<string>) => {
    const required = ROLE_REQUIRED_FEATURES[role] ?? [];
    const merged = new Set(base);
    required.forEach((f) => {
      if (tenantSet.has(f)) {
        merged.add(f);
        getAllDeps(f).forEach((d) => { if (tenantSet.has(d)) merged.add(d); });
      }
    });
    return merged;
  }, []);

  /** Toggle the "use custom features" switch. Pre-populates from role defaults on first enable. */
  const handleCustomToggle = useCallback((val: boolean) => {
    setUseCustomFeatures(val);
    if (val && selectedFeatures.size === 0) {
      // Pre-populate from role defaults ∩ tenant features, then add role-required
      const roleDefs = ROLE_DEFAULT_FEATURES[selectedRole] ?? [];
      const tenantSet = new Set(tenantFeatures);
      const base = new Set(roleDefs.filter((f) => tenantSet.has(f)));
      setSelectedFeatures(mergeRoleRequired(base, selectedRole, tenantSet));
    }
  }, [selectedFeatures.size, selectedRole, tenantFeatures, mergeRoleRequired]);

  // ── Derived values
  const fullUsername = tenantSuffix ? `${username.trim()}.${tenantSuffix}` : username.trim();

  function buildProfilePayload() {
    const id = idCard;
    return {
      nickName: nickName.trim() || undefined,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      hireDate: toIsoDate(hireDate),
      baseWage: baseWage.trim() ? parseFloat(baseWage.replace(/[^\d.]/g, '')) : undefined,
      commissionRate: commissionRate.trim() ? parseFloat(commissionRate) : undefined,
      dateOfBirth: toIsoDate(dateOfBirth),
      gender: gender || undefined,
      // ID card fields
      idCardNumber: id.idCardNumber.trim() || undefined,
      idCardFullName: id.idCardFullName.trim() || undefined,
      idCardSex: id.idCardSex || undefined,
      idCardNationality: id.idCardNationality.trim() || undefined,
      idCardPlaceOfOrigin: id.idCardPlaceOfOrigin.trim() || undefined,
      idCardPlaceOfResidence: id.idCardPlaceOfResidence.trim() || undefined,
      permanentAddress: id.idCardPlaceOfResidence.trim() || undefined, // backward compat
      idCardDateOfBirth: id.idCardDateOfBirth || undefined,
      idCardIssuedDate: toIsoDate(id.idCardIssuedDate),
      idCardIssuedPlace: id.idCardIssuedPlace.trim() || undefined,
      notes: notes.trim() || undefined,
    };
  }

  function hasProfileData(payload: ReturnType<typeof buildProfilePayload>) {
    return Object.values(payload).some((v) => v !== undefined);
  }

  // ── Mutations
  // Build the final featureNames to send, ensuring role-required are always present
  const buildFeatureNames = useCallback((): string[] | undefined => {
    if (!useCustomFeatures || selectedFeatures.size === 0) return undefined;
    const tenantSet = new Set(tenantFeatures);
    const final = mergeRoleRequired(selectedFeatures, selectedRole, tenantSet);
    return [...final];
  }, [useCustomFeatures, selectedFeatures, selectedRole, tenantFeatures, mergeRoleRequired]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const userRes = await shopUserApi.create({
        username: fullUsername,
        password,
        fullName: fullName.trim(),
        roleNames: [selectedRole],
        featureNames: buildFeatureNames(),
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
        // Custom ON → send role-required-guaranteed set; Custom OFF → send [] to clear overrides
        featureNames: useCustomFeatures ? buildFeatureNames() : [],
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

  // ── Avatar handlers (only available in edit mode once employee profile exists)
  const handleAvatarSelected = async (uri: string) => {
    if (!employeeProfile?.id) return;
    setAvatarUploading(true);
    try {
      await employeeApi.uploadAvatar(employeeProfile.id, uri);
      queryClient.invalidateQueries({ queryKey: ['employeeByUser', existingUser?.id] });
      showToast(t('staff.avatarUpdated'));
    } catch {
      showToast(t('common.errorGeneric'));
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleAvatarDelete = async () => {
    if (!employeeProfile?.id) return;
    setAvatarUploading(true);
    try {
      await employeeApi.deleteAvatar(employeeProfile.id);
      queryClient.invalidateQueries({ queryKey: ['employeeByUser', existingUser?.id] });
      showToast(t('staff.avatarDeleted'));
    } catch {
      showToast(t('common.errorGeneric'));
    } finally {
      setAvatarUploading(false);
    }
  };

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

  // JWT `sub` is the username string, NOT the UUID — compare against existingUser.username.
  const isSelf = isEdit && !!currentUserId && existingUser?.username === currentUserId;
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
        <View className="flex-row items-center mb-0.5">
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
        <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 mt-0.5`}>
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
          contentContainerStyle={{ padding: 4, gap: 12, paddingBottom: bottom + 24 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Avatar (edit mode with linked employee only) ── */}
          {isEdit && employeeProfile?.id != null && (
            <View className="items-center py-2">
              <TouchableOpacity
                onPress={() => !isSelf && setAvatarPickerVisible(true)}
                activeOpacity={isSelf ? 1 : 0.8}
                style={{ position: 'relative' }}
              >
                <AvatarImage uri={employeeProfile.avatarUrl} name={fullName || (existingUser?.fullName ?? '')} size={80} color="#4f46e5" />
                {!isSelf && (
                  <View
                    style={{
                      position: 'absolute', bottom: 0, right: 0,
                      width: 24, height: 24, borderRadius: 12,
                      backgroundColor: '#4f46e5', alignItems: 'center', justifyContent: 'center',
                      borderWidth: 2, borderColor: 'white',
                    }}
                  >
                    <MaterialCommunityIcons name="camera" size={13} color="white" />
                  </View>
                )}
                {avatarUploading && (
                  <View
                    style={{
                      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                      borderRadius: 40, backgroundColor: 'rgba(0,0,0,0.4)',
                      alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <ActivityIndicator size="small" color="white" />
                  </View>
                )}
              </TouchableOpacity>
              {!isSelf && (
                <Text className={`${typo.caption} text-gray-400 mt-2`}>{t('staff.tapToChangeAvatar')}</Text>
              )}
            </View>
          )}

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

          {/* ── Section 1.5: Feature Access (custom permissions) ── */}
          {!isSelf && (
            <CollapseSection
              title={t('staff.sectionFeatureAccess')}
              icon="shield-lock-outline"
              isOpen={openSections.has('features')}
              onToggle={() => toggleSection('features')}
            >
              {/* Toggle: custom vs role default */}
              <View className="flex-row items-center justify-between py-1">
                <View className="flex-1 mr-3">
                  <Text className={`${typo.label} text-gray-700 dark:text-gray-200`}>
                    {t('staff.featureCustomLabel')}
                  </Text>
                  <Text className={`${typo.caption} text-gray-400 dark:text-gray-500 mt-0.5`}>
                    {useCustomFeatures
                      ? t('staff.featureCustomHintOn')
                      : t('staff.featureCustomHintOff')}
                  </Text>
                </View>
                <Switch
                  value={useCustomFeatures}
                  onValueChange={handleCustomToggle}
                  trackColor={{ false: '#d1d5db', true: '#818cf8' }}
                  thumbColor={useCustomFeatures ? '#4f46e5' : '#f4f4f5'}
                />
              </View>

              {/* Feature matrix — visible when custom is ON */}
              {useCustomFeatures && (
                <>
                  {/* Info banner */}
                  <View className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-3 flex-row items-start gap-2.5">
                    <MaterialCommunityIcons name="information-outline" size={16} color="#6366f1" style={{ marginTop: 1 }} />
                    <Text className={`${typo.caption} text-indigo-700 dark:text-indigo-300 flex-1`}>
                      {t('staff.featureMatrixInfo')}
                    </Text>
                  </View>

                  {/* Selected count badge */}
                  <View className="flex-row items-center justify-between">
                    <Text className={`${typo.caption} text-gray-500 dark:text-gray-400`}>
                      {t('staff.featureSelectedCount', { count: selectedFeatures.size })}
                    </Text>
                    <TouchableOpacity
                      onPress={() => {
                        const tenantSet = new Set(tenantFeatures);
                        const roleDefs = ROLE_DEFAULT_FEATURES[selectedRole] ?? [];
                        const base = new Set(roleDefs.filter((f) => tenantSet.has(f)));
                        setSelectedFeatures(mergeRoleRequired(base, selectedRole, tenantSet));
                      }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text className={`${typo.captionBold} text-indigo-600 dark:text-indigo-400`}>
                        {t('staff.featureResetToRole')}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {tenantFeatures.length === 0 ? (
                    <View style={{ marginTop: 8 }}>
                      <Skeleton height={40} borderRadius={12} />
                    </View>
                  ) : (
                    <FeatureMatrix
                      tenantFeatures={tenantFeatures}
                      selectedFeatures={selectedFeatures}
                      selectedRole={selectedRole}
                      onToggle={handleToggleFeature}
                      typo={typo}
                    />
                  )}
                </>
              )}
            </CollapseSection>
          )}

          {/* ── Section 2: Contact ── */}
          <CollapseSection
            title={t('staff.sectionContact')}
            icon="phone-outline"
            isOpen={openSections.has('contact')}
            onToggle={() => toggleSection('contact')}
          >
            <View>
              <FieldLabel label={t('staff.phone')} />
              <View className={isSelf ? 'opacity-60' : undefined}>
                <PhoneInput
                  value={phone}
                  onChangeRaw={setPhone}
                  placeholder={t('staff.phonePlaceholder')}
                  editable={!isSelf}
                />
              </View>
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
                  clearable
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
                  maximumDate={new Date(new Date().setFullYear(new Date().getFullYear() - 18))}
                  clearable
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
          </CollapseSection>

          {/* ── Section 5: ID Card ── */}
          <CollapseSection
            title={t('staff.sectionIdCard')}
            icon="card-account-details-outline"
            isOpen={openSections.has('idcard')}
            onToggle={() => toggleSection('idcard')}
          >
            <View pointerEvents={isSelf ? 'none' : 'auto'} style={isSelf ? { opacity: 0.6 } : undefined}>
              <IdCardSection value={idCard} onChange={setIdCardField} />
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

      {/* Avatar picker */}
      <ImagePickerSheet
        visible={avatarPickerVisible}
        hasImage={!!employeeProfile?.avatarUrl}
        title={t('staff.avatarSheetTitle')}
        onClose={() => setAvatarPickerVisible(false)}
        onImageSelected={handleAvatarSelected}
        onDelete={handleAvatarDelete}
      />
    </KeyboardAvoidingView>
  );
}
