import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  ScrollView,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard,
  Switch,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customerApi, type CustomerData } from '../services/api';
import { useFeatureCheck } from '../hooks/useFeature';
import { useTypography } from '../hooks/useTypography';
import type { SelectedCustomer } from '../store/cartStore';
import { PhoneInput, stripPhone } from './PhoneInput';

/**
 * Vietnamese phone numbers: 10 digits starting with 0, or +84 prefix.
 * Strips spaces and dashes before testing.
 */
const PHONE_RE = /^(\+84|0)[0-9]{9}$/;

function isPhoneLike(input: string): boolean {
  return PHONE_RE.test(input.replace(/[\s\-.() ]/g, ''));
}

/** Vietnamese honorifics shown as a separate single-select row above the name input. */
const HONORIFICS = ['Anh', 'Chị', 'Em', 'Bác', 'Cô', 'Chú', 'Ông', 'Bà'];

/**
 * ~100 popular Vietnamese given names seeded as quick-tap chips.
 * Sorted roughly by frequency; no honorifics.
 */
const DEFAULT_NAME_CHIPS = [
  'An', 'Bảo', 'Bích', 'Bình', 'Cẩm', 'Chi', 'Công', 'Cường',
  'Diễm', 'Diệu', 'Điệp', 'Định', 'Đạt', 'Đông', 'Đức', 'Dung', 'Dũng', 'Dương',
  'Giang', 'Hà', 'Hải', 'Hằng', 'Hào', 'Hậu', 'Hiếu', 'Hoài', 'Hoàng',
  'Hoa', 'Hồng', 'Hùng', 'Hưng', 'Hương', 'Huyền',
  'Khánh', 'Khang', 'Khoa', 'Kiên', 'Kim',
  'Lâm', 'Lan', 'Lệ', 'Liên', 'Linh', 'Loan', 'Lộc', 'Long', 'Lực', 'Ly',
  'Mai', 'Mạnh', 'Minh', 'My',
  'Nam', 'Nga', 'Ngân', 'Nghĩa', 'Ngọc', 'Nguyệt', 'Nhã', 'Nhân', 'Nhung', 'Nhu',
  'Phát', 'Phong', 'Phúc', 'Phương', 'Phượng',
  'Quân', 'Quang', 'Quỳnh',
  'Sơn',
  'Tài', 'Tâm', 'Thanh', 'Thành', 'Thảo', 'Thắng', 'Thi', 'Thiện',
  'Thu', 'Thủy', 'Thùy', 'Tiên', 'Tiến', 'Tín', 'Toàn',
  'Trang', 'Trinh', 'Trí', 'Truc', 'Trung', 'Tú', 'Tuấn', 'Tùng', 'Tuyết',
  'Uyên',
  'Văn', 'Vân', 'Việt', 'Vinh',
  'Xuân', 'Yến',
];
const GUEST_NAMES_KEY = '@tappypos/guest_names';
const MAX_HISTORY = 50;

/**
 * Persists recently used unmanaged customer names in AsyncStorage.
 * Returns the history list and an `addName` function to call on confirm.
 */
function useGuestNameHistory() {
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(GUEST_NAMES_KEY).then((raw) => {
      if (raw) setHistory(JSON.parse(raw) as string[]);
    });
  }, []);

  const addName = useCallback(async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const updated = [trimmed, ...history.filter((n) => n !== trimmed)].slice(0, MAX_HISTORY);
    setHistory(updated);
    await AsyncStorage.setItem(GUEST_NAMES_KEY, JSON.stringify(updated));
  }, [history]);

  return { history, addName };
}

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Currently selected customer. null = anonymous walk-in. */
  value: SelectedCustomer | null;
  onChange: (customer: SelectedCustomer | null) => void;
  /**
   * Optional: called with the full CustomerData object when a managed customer
   * is selected or created. Useful for consumers that need loyalty points, preferences, etc.
   */
  onManagedCustomerData?: (data: CustomerData) => void;
};

export function CustomerPickerSheet({
  visible,
  onClose,
  value,
  onChange,
  onManagedCustomerData,
}: Props) {
  const { t } = useTranslation();
  const typo = useTypography();
  const insets = useSafeAreaInsets();
  const has = useFeatureCheck();
  const qc = useQueryClient();
  const { history: nameHistory, addName } = useGuestNameHistory();

  /**
   * true  = unmanaged mode (walk-in or named guest, no DB record)
   * false = managed mode   (search & pick from customer DB)
   */
  const [isUnmanaged, setIsUnmanaged] = useState(false);
  const [selectedHonorific, setSelectedHonorific] = useState<string | null>(null);
  const [guestNameInput, setGuestNameInput] = useState('');

  // Chips = history first (most recent), then default seeds not already in history.
  const nameChips = useMemo(() => {
    const historyLower = nameHistory.map((n) => n.toLowerCase());
    return [
      ...nameHistory,
      ...DEFAULT_NAME_CHIPS.filter((n) => !historyLower.includes(n.toLowerCase())),
    ];
  }, [nameHistory]);

  // When the user types, float matching chips to the top (startsWith first, then contains).
  const displayedChips = useMemo(() => {
    const q = guestNameInput.trim().toLowerCase();
    if (!q) return nameChips;
    const starts   = nameChips.filter((n) => n.toLowerCase().startsWith(q));
    const contains = nameChips.filter((n) => !n.toLowerCase().startsWith(q) && n.toLowerCase().includes(q));
    const rest     = nameChips.filter((n) => !n.toLowerCase().includes(q));
    return [...starts, ...contains, ...rest];
  }, [nameChips, guestNameInput]);

  /** What the user has typed into the search box. */
  const [customerSearch, setCustomerSearch] = useState('');
  /**
   * The term that was actually submitted for search (via button tap or Return key).
   * The API query is driven by this value, not `customerSearch`.
   */
  const [submittedSearch, setSubmittedSearch] = useState('');

  // Quick-create form state
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [quickCreateName, setQuickCreateName] = useState('');
  const [quickCreatePhone, setQuickCreatePhone] = useState('');
  const [quickCreateError, setQuickCreateError] = useState('');

  // Initialise state from current value when sheet opens; reset on close.
  useEffect(() => {
    if (visible) {
      const unmanaged = value?.type === 'guest';
      setIsUnmanaged(unmanaged);
      if (value?.type === 'guest') setGuestNameInput(value.name);
    } else {
      setIsUnmanaged(false);
      setSelectedHonorific(null);
      setGuestNameInput('');
      setCustomerSearch('');
      setSubmittedSearch('');
      setShowQuickCreate(false);
      setQuickCreateName('');
      setQuickCreatePhone('');
      setQuickCreateError('');
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggleUnmanaged = (val: boolean) => {
    setIsUnmanaged(val);
    if (val) {
      // Switching to unmanaged — drop any managed customer selection.
      onChange(null);
      setGuestNameInput('');
    }
    // Switching back to managed — keep value as null until the user picks someone.
  };

  // Smart prefill when a search is submitted: detect phone vs name.
  useEffect(() => {
    setShowQuickCreate(false);
    setQuickCreateError('');
    const trimmed = submittedSearch.trim();
    if (isPhoneLike(trimmed)) {
      setQuickCreatePhone(stripPhone(trimmed));
      setQuickCreateName('');
    } else {
      setQuickCreateName(trimmed);
      setQuickCreatePhone('');
    }
  }, [submittedSearch]);

  const handleSearchChange = (text: string) => {
    setCustomerSearch(text);
    if (!text.trim()) setSubmittedSearch('');
  };

  const handleSearch = () => {
    const term = customerSearch.trim();
    if (!term) return;
    Keyboard.dismiss();
    setSubmittedSearch(term);
  };

  const { data: recentCustomers = [] } = useQuery({
    queryKey: ['customers', 'recent'],
    queryFn: () => customerApi.recent(5).then((r) => r.data.data),
    staleTime: 60_000,
    enabled: has('CUSTOMER') && visible && !isUnmanaged,
  });

  const { data: searchResults = [], isFetching: searching } = useQuery({
    queryKey: ['customers', 'search', submittedSearch],
    queryFn: () =>
      customerApi.list({ search: submittedSearch, size: 10 }).then((r) => r.data.data.content),
    staleTime: 30_000,
    enabled: has('CUSTOMER') && submittedSearch.length >= 1 && !isUnmanaged,
  });

  const displayCustomers = submittedSearch.length >= 1 ? searchResults : recentCustomers;

  const createMutation = useMutation({
    mutationFn: () =>
      customerApi.create({
        name: quickCreateName.trim(),
        ...(quickCreatePhone ? { phone: quickCreatePhone } : undefined),
      }),
    onSuccess: (res) => {
      const created = res.data.data;
      qc.invalidateQueries({ queryKey: ['customers', 'recent'] });
      qc.invalidateQueries({ queryKey: ['customers', 'search'] });
      onChange({ type: 'managed', id: created.id, name: created.name, phone: created.phone });
      onManagedCustomerData?.(created);
      onClose();
    },
    onError: () => {
      setQuickCreateError(t('customers.createError'));
    },
  });

  const handleQuickCreate = () => {
    setQuickCreateError('');
    const name = quickCreateName.trim();
    // quickCreatePhone is already raw digits (stripped by PhoneInput's onChangeRaw)
    if (!name) { setQuickCreateError(t('customers.nameRequired')); return; }
    if (quickCreatePhone && quickCreatePhone.length !== 10) {
      setQuickCreateError(t('customers.phoneTooShort'));
      return;
    }
    createMutation.mutate();
  };

  /** Confirm unmanaged selection and close. Honorific + name are combined; both optional. */
  const confirmGuest = () => {
    const namePart = guestNameInput.trim();
    const fullName = [selectedHonorific, namePart].filter(Boolean).join(' ');
    if (fullName) {
      if (namePart) addName(namePart); // store only the name part in chip history
      onChange({ type: 'guest', name: fullName });
    }
    // else: value is already null (walk-in)
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1, justifyContent: 'flex-end' }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Backdrop — absolute so it doesn't compete for layout space */}
        <TouchableOpacity
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)' }}
          activeOpacity={1}
          onPress={onClose}
        />
        <View
          className="bg-white dark:bg-gray-900 rounded-t-3xl px-5 pt-4"
          style={{ paddingBottom: insets.bottom + 16 }}
        >
          {/* Drag handle */}
          <View className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full self-center mb-4" />

          {/* Title row — Khách lẻ chip pinned top-right */}
          <View className="flex-row items-center justify-between mb-4">
            <Text className={`${typo.section} text-gray-900 dark:text-white`}>
              {t('pos.selectCustomer')}
            </Text>
            <TouchableOpacity
              className={`flex-row items-center gap-1 px-3 py-1.5 rounded-full border ${
                !value
                  ? 'border-primary bg-primary-light dark:bg-indigo-900/30'
                  : 'border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800'
              }`}
              onPress={() => { onChange(null); onClose(); }}
            >
              <MaterialCommunityIcons
                name={!value ? 'check-circle' : 'account-outline'}
                size={14}
                color={!value ? '#4f46e5' : '#9ca3af'}
              />
              <Text className={`${typo.captionBold} ${!value ? 'text-primary' : 'text-gray-400 dark:text-gray-500'}`}>
                {t('pos.walkIn')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── Managed / Unmanaged toggle ── */}
          <View className="flex-row items-center justify-between mb-4 py-3 px-4 bg-gray-50 dark:bg-gray-800 rounded-2xl">
            <View className="flex-1 mr-3">
              <Text className={`${typo.labelBold} ${isUnmanaged ? 'text-amber-600 dark:text-amber-400' : 'text-gray-800 dark:text-gray-100'}`}>
                {isUnmanaged ? t('pos.unmanaged') : t('pos.managedCustomer')}
              </Text>
              <Text className={`${typo.caption} text-gray-400 dark:text-gray-500`}>
                {isUnmanaged ? t('pos.unmanagedHint') : t('pos.managedCustomerHint')}
              </Text>
            </View>
            <Switch
              value={isUnmanaged}
              onValueChange={handleToggleUnmanaged}
              trackColor={{ false: '#d1d5db', true: '#a5b4fc' }}
              thumbColor={isUnmanaged ? '#4f46e5' : '#f3f4f6'}
            />
          </View>

          {/* Fixed-height container keeps the sheet the same size on toggle */}
          <View style={{ minHeight: 260 }}>

          {/* ── Unmanaged mode: honorifics + name input + chips ── */}
          {isUnmanaged && (
            <>
              {/* Honorific chips — single scrollable row */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ alignItems: 'center' }}
                style={{ marginBottom: 8 }}
              >
                {HONORIFICS.map((h, i) => (
                  <TouchableOpacity
                    key={h}
                    style={{ marginRight: i < HONORIFICS.length - 1 ? 6 : 0 }}
                    className={`px-4 py-2 rounded-xl border ${
                      selectedHonorific === h
                        ? 'bg-indigo-600 border-indigo-600'
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600'
                    }`}
                    onPress={() => setSelectedHonorific(selectedHonorific === h ? null : h)}
                  >
                    <Text className={`${typo.captionBold} ${
                      selectedHonorific === h ? 'text-white' : 'text-gray-600 dark:text-gray-300'
                    }`}>
                      {h}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Split input: [gray honorific prefix | name text]  [Xác nhận] */}
              <View className="flex-row items-center gap-2 mb-3">
                <View
                  className="flex-1 flex-row bg-gray-100 dark:bg-gray-800 rounded-xl px-3"
                  style={{ height: 44, alignItems: 'flex-end', paddingBottom: 10 }}
                >
                  {selectedHonorific && (
                    <Text style={{ fontSize: typo.inputFontSizePx, lineHeight: typo.inputFontSizePx + 4, marginRight: 16 }} className="text-gray-800 dark:text-gray-100">
                      {selectedHonorific}
                    </Text>
                  )}
                  <TextInput
                    className="flex-1 text-gray-800 dark:text-gray-100"
                    style={{ fontSize: typo.inputFontSizePx, lineHeight: typo.inputFontSizePx + 4, padding: 0 }}
                    placeholder={selectedHonorific ? t('customers.namePlaceholder') : t('pos.guestNamePlaceholder')}
                    placeholderTextColor="#9ca3af"
                    value={guestNameInput}
                    onChangeText={setGuestNameInput}
                    returnKeyType="done"
                    onSubmitEditing={confirmGuest}
                  />
                  {guestNameInput.length > 0 && (
                    <TouchableOpacity
                      onPress={() => setGuestNameInput('')}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={{ paddingBottom: 2 }}
                    >
                      <MaterialCommunityIcons name="close-circle" size={16} color="#9ca3af" />
                    </TouchableOpacity>
                  )}
                </View>
                <TouchableOpacity
                  className="px-4 py-2.5 rounded-xl bg-primary"
                  onPress={confirmGuest}
                >
                  <Text className={`${typo.captionBold} text-white`}>{t('common.confirm')}</Text>
                </TouchableOpacity>
              </View>

              {/* Name chips — 4 rows visible, scrollable for the rest */}
              <ScrollView
                style={{ maxHeight: 148 }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <View className="flex-row flex-wrap" style={{ gap: 6 }}>
                  {displayedChips.map((chip) => {
                    const active = guestNameInput === chip;
                    return (
                      <TouchableOpacity
                        key={chip}
                        className={`px-4 py-2 rounded-xl border items-center ${
                          active
                            ? 'bg-indigo-600 border-indigo-600'
                            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600'
                        }`}
                        onPress={() => setGuestNameInput(chip)}
                      >
                        <Text className={`${typo.captionBold} ${
                          active ? 'text-white' : 'text-gray-600 dark:text-gray-300'
                        }`}>
                          {chip}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            </>
          )}

          {/* ── Managed mode: search + results ── */}
          {!isUnmanaged && (
            <>
              {/* Search bar — single row, spinner inline */}
              <View className="flex-row items-center bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 mb-3" style={{ height: 48 }}>
                <MaterialCommunityIcons
                  name="magnify"
                  size={20}
                  color={customerSearch.length > 0 ? '#4f46e5' : '#9ca3af'}
                />
                <TextInput
                  className={`flex-1 mx-3 ${typo.inputSize} text-gray-800 dark:text-gray-100`}
                  placeholder={t('pos.searchCustomer')}
                  placeholderTextColor="#9ca3af"
                  value={customerSearch}
                  onChangeText={handleSearchChange}
                  returnKeyType="search"
                  onSubmitEditing={handleSearch}
                />
                {searching && <ActivityIndicator size="small" color="#9ca3af" />}
                {!searching && customerSearch.length > 0 && (
                  <TouchableOpacity
                    onPress={() => handleSearchChange('')}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <MaterialCommunityIcons name="close-circle" size={18} color="#9ca3af" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Section label */}
              {displayCustomers.length > 0 && (
                <Text className={`${typo.caption} text-gray-400 dark:text-gray-500 mb-2 px-1`}>
                  {submittedSearch ? t('common.searchResults') : t('customers.recentCustomers')}
                </Text>
              )}

              {/* Results list */}
              {displayCustomers.length > 0 && (
                <FlatList
                  data={displayCustomers}
                  keyExtractor={(c) => c.id}
                  style={{ maxHeight: 196 }}
                  keyboardShouldPersistTaps="handled"
                  renderItem={({ item: c }) => {
                    const active = value?.type === 'managed' && value.id === c.id;
                    return (
                      <TouchableOpacity
                        className={`flex-row items-center px-3 py-3 rounded-2xl mb-1.5 ${
                          active
                            ? 'bg-indigo-50 dark:bg-indigo-900/30'
                            : 'bg-gray-50 dark:bg-gray-800'
                        }`}
                        activeOpacity={0.7}
                        onPress={() => {
                          onChange({ type: 'managed', id: c.id, name: c.name, phone: c.phone });
                          onManagedCustomerData?.(c);
                          onClose();
                        }}
                      >
                        {/* Avatar */}
                        <View className={`w-9 h-9 rounded-full items-center justify-center mr-3 ${
                          active ? 'bg-indigo-600' : 'bg-indigo-100 dark:bg-indigo-900/50'
                        }`}>
                          <Text className={`${typo.labelBold} ${active ? 'text-white' : 'text-indigo-600 dark:text-indigo-300'}`}>
                            {c.name.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        {/* Info */}
                        <View className="flex-1">
                          <Text className={`${typo.labelBold} ${active ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-800 dark:text-gray-100'}`}>
                            {c.name}
                          </Text>
                          {!!c.phone && (
                            <Text className={`${typo.caption} mt-0.5 ${active ? 'text-indigo-400' : 'text-gray-400 dark:text-gray-500'}`}>
                              {c.phone}
                            </Text>
                          )}
                        </View>
                        {active && (
                          <MaterialCommunityIcons name="check-circle" size={20} color="#4f46e5" />
                        )}
                      </TouchableOpacity>
                    );
                  }}
                />
              )}

              {/* ── Create customer ── */}
              {showQuickCreate ? (
                /* Expanded form */
                <View className="mt-2 rounded-2xl overflow-hidden border border-indigo-100 dark:border-indigo-800/60">
                  {/* Header band */}
                  <View className="flex-row items-center justify-between px-4 py-3 bg-indigo-50 dark:bg-indigo-900/30">
                    <View className="flex-row items-center gap-2">
                      <MaterialCommunityIcons name="account-plus-outline" size={17} color="#4f46e5" />
                      <Text className={`${typo.labelBold} text-indigo-700 dark:text-indigo-300`}>
                        {t('pos.addNewCustomer')}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => { setShowQuickCreate(false); setQuickCreateError(''); }}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      disabled={createMutation.isPending}
                    >
                      <MaterialCommunityIcons name="close" size={18} color="#6b7280" />
                    </TouchableOpacity>
                  </View>

                  {/* Form body */}
                  <View className="px-4 pt-3 pb-4 bg-white dark:bg-gray-900/60">
                    {/* Name */}
                    <View className="mb-3">
                      <View className="flex-row items-center gap-1 mb-1.5">
                        <Text className={`${typo.caption} text-gray-600 dark:text-gray-400`}>
                          {t('customers.name')}
                        </Text>
                        <Text className={`${typo.caption} text-red-400`}>*</Text>
                      </View>
                      <TextInput
                        className={`bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 ${typo.inputSize} text-gray-800 dark:text-gray-100`}
                        placeholder={t('customers.namePlaceholder')}
                        placeholderTextColor="#9ca3af"
                        value={quickCreateName}
                        onChangeText={(v) => { setQuickCreateName(v); setQuickCreateError(''); }}
                        returnKeyType="next"
                        autoFocus={!quickCreateName && !quickCreatePhone}
                      />
                    </View>

                    {/* Phone */}
                    <View className="mb-3">
                      <View className="flex-row items-center justify-between mb-1.5">
                        <Text className={`${typo.caption} text-gray-600 dark:text-gray-400`}>
                          {t('customers.phone')}
                        </Text>
                        <View className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded-full">
                          <Text className={`${typo.caption} text-gray-400 dark:text-gray-500`}>
                            {t('common.optional')}
                          </Text>
                        </View>
                      </View>
                      <PhoneInput
                        value={quickCreatePhone}
                        onChangeRaw={setQuickCreatePhone}
                        placeholder={t('customers.phonePlaceholder')}
                        returnKeyType="done"
                        onSubmitEditing={handleQuickCreate}
                        autoFocus={!!quickCreateName && !quickCreatePhone}
                      />
                    </View>

                    {/* Inline error */}
                    {quickCreateError ? (
                      <View className="flex-row items-center gap-1.5 mb-3">
                        <MaterialCommunityIcons name="alert-circle-outline" size={14} color="#ef4444" />
                        <Text className={`${typo.caption} text-red-500 flex-1`}>{quickCreateError}</Text>
                      </View>
                    ) : null}

                    {/* Save & select */}
                    <TouchableOpacity
                      className={`rounded-xl py-3 items-center flex-row justify-center gap-2 ${
                        createMutation.isPending ? 'bg-indigo-300 dark:bg-indigo-800' : 'bg-indigo-600'
                      }`}
                      onPress={handleQuickCreate}
                      disabled={createMutation.isPending}
                      activeOpacity={0.85}
                    >
                      {createMutation.isPending ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <MaterialCommunityIcons name="account-check-outline" size={17} color="#fff" />
                          <Text className={`${typo.labelBold} text-white`}>{t('pos.saveAndSelect')}</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                /* Dashed trigger button */
                <TouchableOpacity
                  className="flex-row items-center justify-center gap-2.5 mt-2 py-3.5 rounded-2xl border-2 border-dashed border-indigo-200 dark:border-indigo-800/70"
                  activeOpacity={0.7}
                  onPress={() => setShowQuickCreate(true)}
                >
                  <View className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/50 items-center justify-center">
                    <MaterialCommunityIcons name="plus" size={17} color="#4f46e5" />
                  </View>
                  <Text className={`${typo.labelBold} text-indigo-600 dark:text-indigo-400`}>
                    {t('pos.addNewCustomer')}
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}

          </View>{/* end fixed-height container */}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
