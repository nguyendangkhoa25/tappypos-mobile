import { useState, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAlertStore } from '../../store/alertStore';
import { useErrorAlert } from '../../hooks/useErrorAlert';
import { useToastStore } from '../../store/toastStore';
import { shopConfigApi, profileApi, type BankAccount } from '../../services/api';
import { useTypography } from '../../hooks/useTypography';
import { VIETNAM_BANKS, bankLogoUrl, type VietnamBank } from '../../constants/vietnamBanks';
import type { SettingsScreenProps } from '../../types/navigation';

// ── Types ─────────────────────────────────────────────────────────────────────

type FormState = {
  bankBin: string;
  bankCode: string;
  bankName: string;
  bankShortName: string;
  accountNumber: string;
  accountName: string;
};

const EMPTY_FORM: FormState = {
  bankBin: '',
  bankCode: '',
  bankName: '',
  bankShortName: '',
  accountNumber: '',
  accountName: '',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/** TextInput with an inline × clear button */
function ClearableInput({
  value,
  onChangeText,
  placeholder,
  autoCapitalize,
  keyboardType,
  typoClass,
  rightToggle,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: 'default' | 'numeric' | 'phone-pad' | 'email-address';
  typoClass: string;
  /** Optional element shown at the right (e.g. keyboard toggle) */
  rightToggle?: React.ReactNode;
}) {
  return (
    <View className="flex-row items-center border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 px-4">
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9ca3af"
        keyboardType={keyboardType ?? 'default'}
        autoCapitalize={autoCapitalize ?? 'none'}
        className={`flex-1 py-3 ${typoClass} text-gray-900 dark:text-white`}
      />
      {rightToggle}
      {value.length > 0 && (
        <TouchableOpacity onPress={() => onChangeText('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} className="ml-1">
          <MaterialCommunityIcons name="close-circle" size={18} color="#9ca3af" />
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Bank chip (vertical: logo on top, name below) ────────────────────────────

function BankChip({
  bank,
  selected,
  onPress,
}: {
  bank: VietnamBank;
  selected: boolean;
  onPress: () => void;
}) {
  const typo = useTypography();
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{ width: 76 }}
      className={`items-center px-2 pt-2 pb-2.5 rounded-2xl mr-2 border ${
        selected
          ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-400 dark:border-indigo-500'
          : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600'
      }`}
    >
      {/* Logo */}
      <View
        className={`w-10 h-10 rounded-xl items-center justify-center mb-1.5 ${
          selected ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-600'
        }`}
        style={{ borderWidth: selected ? 1.5 : 0, borderColor: selected ? '#6366f1' : 'transparent' }}
      >
        {bank.logoUrl ? (
          <Image
            source={{ uri: bank.logoUrl! }}
            style={{ width: 30, height: 30, borderRadius: 6 }}
            resizeMode="contain"
          />
        ) : (
          <Text
            className={typo.captionBold}
            style={{ color: selected ? '#4f46e5' : '#6b7280' }}
            numberOfLines={1}
          >
            {bank.code}
          </Text>
        )}
      </View>
      {/* Name — 2 lines so longer names don't get cut */}
      <Text
        numberOfLines={2}
        className={`${typo.caption} text-center`}
        style={{
          lineHeight: 14,
          fontWeight: selected ? '600' : '400',
          color: selected ? '#4338ca' : '#4b5563',
        }}
      >
        {bank.shortName}
      </Text>
    </TouchableOpacity>
  );
}

// ── Selected bank display ─────────────────────────────────────────────────────

function SelectedBankRow({
  bank,
  onClear,
  typo,
}: {
  bank: VietnamBank;
  onClear: () => void;
  typo: ReturnType<typeof useTypography>;
}) {
  return (
    <View className="flex-row items-center bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 rounded-xl px-4 py-3 gap-3">
      {bank.logoUrl ? (
        <Image
          source={{ uri: bank.logoUrl! }}
          style={{ width: 32, height: 32, borderRadius: 6 }}
          resizeMode="contain"
        />
      ) : (
        <View className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-800 items-center justify-center">
          <MaterialCommunityIcons name="bank-outline" size={18} color="#4f46e5" />
        </View>
      )}
      <View className="flex-1">
        <Text className={`${typo.labelBold} text-gray-900 dark:text-white`}>{bank.shortName}</Text>
        <Text className={`${typo.caption} text-gray-500 dark:text-gray-400`} numberOfLines={1}>{bank.name}</Text>
      </View>
      <TouchableOpacity onPress={onClear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <MaterialCommunityIcons name="close-circle" size={20} color="#9ca3af" />
      </TouchableOpacity>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export function BankAccountsScreen({ navigation }: SettingsScreenProps<'BankAccounts'>) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const typo = useTypography();
  const qc = useQueryClient();
  const { show: showAlert } = useAlertStore();
  const { show: showToast } = useToastStore();
  const showErrorAlert = useErrorAlert();

  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<BankAccount | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  // Bank picker state
  const [bankSearch, setBankSearch] = useState('');

  // Keyboard mode for account number: 'numeric' | 'default'
  const [acctNumKb, setAcctNumKb] = useState<'numeric' | 'default'>('numeric');

  const searchRef = useRef<TextInput>(null);

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: banks = [], isLoading } = useQuery({
    queryKey: ['banks'],
    queryFn: () => shopConfigApi.getBanks().then((r) => r.data.data),
    staleTime: 5 * 60_000,
  });

  const { data: profile } = useQuery({
    queryKey: ['my-profile'],
    queryFn: () => profileApi.getMe().then((r) => r.data.data),
    staleTime: 5 * 60_000,
  });

  const { data: shopInfo } = useQuery({
    queryKey: ['shop-config'],
    queryFn: () => shopConfigApi.getInfo().then((r) => r.data.data),
    staleTime: 5 * 60_000,
  });

  // ── Derived ────────────────────────────────────────────────────────────────

  const filteredBanks = useMemo(() => {
    const q = bankSearch.trim().toLowerCase();
    if (!q) return VIETNAM_BANKS;
    return VIETNAM_BANKS.filter(
      (b) =>
        b.shortName.toLowerCase().includes(q) ||
        b.code.toLowerCase().includes(q) ||
        b.name.toLowerCase().includes(q) ||
        b.bin.includes(q),
    );
  }, [bankSearch]);

  const selectedVnBank = useMemo(
    () => (form.bankBin ? VIETNAM_BANKS.find((b) => b.bin === form.bankBin) : null),
    [form.bankBin],
  );

  // ── Mutations ──────────────────────────────────────────────────────────────

  const addMutation = useMutation({
    mutationFn: () =>
      shopConfigApi.addBank({
        bankCode: form.bankCode,
        bankName: form.bankName,
        accountNumber: form.accountNumber,
        accountName: form.accountName,
        bankBin: form.bankBin || null,
        bankShortName: form.bankShortName || null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['banks'] });
      showToast(t('settings.bankAccounts.saveSuccess'));
      setModalVisible(false);
    },
    onError: showErrorAlert,
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      shopConfigApi.updateBank(editing!.id, {
        bankCode: form.bankCode,
        bankName: form.bankName,
        accountNumber: form.accountNumber,
        accountName: form.accountName,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['banks'] });
      showToast(t('settings.bankAccounts.saveSuccess'));
      setModalVisible(false);
    },
    onError: showErrorAlert,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => shopConfigApi.deleteBank(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['banks'] });
      showToast(t('settings.bankAccounts.deleteSuccess'));
    },
    onError: showErrorAlert,
  });

  const setDefaultMutation = useMutation({
    mutationFn: (id: number) => shopConfigApi.setDefaultBank(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['banks'] }),
    onError: showErrorAlert,
  });

  // ── Handlers ───────────────────────────────────────────────────────────────

  const openAdd = useCallback(() => {
    setEditing(null);
    setForm({
      ...EMPTY_FORM,
      accountName: profile?.fullName ?? '',
      accountNumber: shopInfo?.phone ?? '',
    });
    setBankSearch('');
    setAcctNumKb('numeric');
    setModalVisible(true);
    // Auto-focus bank search so user can start typing immediately
    setTimeout(() => searchRef.current?.focus(), 350);
  }, [profile, shopInfo]);

  const openEdit = useCallback((bank: BankAccount) => {
    setEditing(bank);
    const vnBank = VIETNAM_BANKS.find((b) => b.bin === bank.bankBin || b.code === bank.bankCode);
    setForm({
      bankBin: bank.bankBin ?? vnBank?.bin ?? '',
      bankCode: bank.bankCode,
      bankName: bank.bankName,
      bankShortName: bank.bankShortName ?? vnBank?.shortName ?? '',
      accountNumber: bank.accountNumber,
      accountName: bank.accountName,
    });
    setBankSearch('');
    setAcctNumKb('numeric');
    setModalVisible(true);
  }, []);

  const handleDelete = useCallback(
    (bank: BankAccount) => {
      showAlert(t('settings.bankAccounts.deleteTitle'), t('settings.bankAccounts.deleteMsg'), [
        { label: t('common.cancel'), style: 'cancel' },
        {
          label: t('settings.bankAccounts.deleteConfirm'),
          style: 'destructive',
          onPress: () => deleteMutation.mutate(bank.id),
        },
      ]);
    },
    [showAlert, t, deleteMutation],
  );

  const handleSave = useCallback(() => {
    if (!form.bankCode || !form.accountNumber || !form.accountName) return;
    if (editing) updateMutation.mutate();
    else addMutation.mutate();
  }, [form, editing, addMutation, updateMutation]);

  const selectBank = useCallback((bank: VietnamBank) => {
    setForm((prev) => ({
      ...prev,
      bankBin: bank.bin,
      bankCode: bank.code,
      bankName: bank.name,
      bankShortName: bank.shortName,
    }));
    setBankSearch('');
  }, []);

  const clearBank = useCallback(() => {
    setForm((prev) => ({ ...prev, bankBin: '', bankCode: '', bankName: '', bankShortName: '' }));
    setBankSearch('');
    setTimeout(() => searchRef.current?.focus(), 100);
  }, []);

  const isPending = addMutation.isPending || updateMutation.isPending;
  const canSave = !!form.bankCode && !!form.accountNumber && !!form.accountName;

  // ── Bank list card ─────────────────────────────────────────────────────────
  const renderBank = ({ item: bank }: { item: BankAccount }) => {
    // Resolve logoUrl from the directory — try bankBin first, then bankCode
    const effectiveLogoUrl =
      VIETNAM_BANKS.find((b) => bank.bankBin && b.bin === bank.bankBin)?.logoUrl ??
      VIETNAM_BANKS.find((b) => b.code.toUpperCase() === bank.bankCode.toUpperCase())?.logoUrl ??
      null;

    return (
    <View key={bank.id} className="bg-white dark:bg-gray-800 rounded-2xl p-4 mb-3 mx-4">
      <View className="flex-row items-start justify-between">
        <View className="flex-row items-center gap-3 flex-1">
          {/* Logo */}
          <View
            className="w-11 h-11 rounded-xl bg-white dark:bg-gray-700 items-center justify-center"
            style={{ borderWidth: 1, borderColor: '#e5e7eb' }}
          >
            {effectiveLogoUrl ? (
              <Image
                source={{ uri: effectiveLogoUrl }}
                style={{ width: 34, height: 34, borderRadius: 8 }}
                resizeMode="contain"
              />
            ) : (
              <MaterialCommunityIcons name="bank-outline" size={22} color="#9ca3af" />
            )}
          </View>
          <View className="flex-1">
            <View className="flex-row items-center gap-2 mb-0.5">
              <Text className={`${typo.labelBold} text-gray-900 dark:text-white`}>
                {bank.bankShortName ?? bank.bankCode}
              </Text>
              {bank.isDefault && (
                <View className="bg-indigo-100 dark:bg-indigo-900/30 px-2 py-0.5 rounded-full">
                  <Text className={`${typo.captionBold} text-indigo-700 dark:text-indigo-400`}>
                    {t('settings.bankAccounts.defaultBadge')}
                  </Text>
                </View>
              )}
            </View>
            {bank.bankName ? (
              <Text className={`${typo.caption} text-gray-400 dark:text-gray-500 mb-1`} numberOfLines={1}>
                {bank.bankName}
              </Text>
            ) : null}
            <Text className={`${typo.label} text-gray-800 dark:text-gray-100 font-medium tracking-wider`}>
              {bank.accountNumber}
            </Text>
            <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 mt-0.5`}>{bank.accountName}</Text>
          </View>
        </View>
        <View className="flex-row gap-3 ml-2">
          <TouchableOpacity onPress={() => openEdit(bank)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialCommunityIcons name="pencil-outline" size={20} color="#6b7280" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDelete(bank)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialCommunityIcons name="trash-can-outline" size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>
      {!bank.isDefault && (
        <TouchableOpacity
          onPress={() => setDefaultMutation.mutate(bank.id)}
          className="mt-3 border border-gray-200 dark:border-gray-600 rounded-xl py-2 items-center"
        >
          <Text className={`${typo.label} font-medium text-indigo-600`}>{t('settings.bankAccounts.setDefault')}</Text>
        </TouchableOpacity>
      )}
    </View>
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <View
        className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4"
        style={{ paddingTop: insets.top + 12, paddingBottom: 12 }}
      >
        <View className="flex-row items-center mb-0.5">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            className="mr-3"
          >
            <MaterialCommunityIcons name="chevron-left" size={26} color="#4f46e5" />
          </TouchableOpacity>
          <Text className={`${typo.heading} text-gray-900 dark:text-white flex-1`}>
            {t('settings.bankAccounts.title')}
          </Text>
          <TouchableOpacity onPress={openAdd} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialCommunityIcons name="plus" size={24} color="#4f46e5" />
          </TouchableOpacity>
        </View>
        <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 mt-0.5`}>
          {t('settings.bankAccounts.hint')}
        </Text>
      </View>

      {/* List */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#4f46e5" />
        </View>
      ) : banks.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <MaterialCommunityIcons name="bank-outline" size={56} color="#d1d5db" />
          <Text className={`${typo.body} text-gray-400 mt-4 text-center`}>
            {t('settings.bankAccounts.empty')}
          </Text>
          <Text className={`${typo.caption} text-gray-400 mt-1 text-center`}>
            {t('settings.bankAccounts.emptyHint')}
          </Text>
          <TouchableOpacity onPress={openAdd} className="mt-6 bg-indigo-600 px-6 py-3 rounded-2xl">
            <Text className={`${typo.label} text-white`}>{t('settings.bankAccounts.addBtn')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={banks}
          keyExtractor={(b) => String(b.id)}
          renderItem={renderBank}
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 32 }}
        />
      )}

      {/* ── Add / Edit Modal ──────────────────────────────────────────────── */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          className="flex-1 justify-end"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View
            className="bg-white dark:bg-gray-800 rounded-t-3xl"
            style={{ paddingBottom: insets.bottom + 16 }}
          >
            {/* Modal header */}
            <View className="flex-row items-center px-6 pt-6 pb-4">
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                className="mr-3"
              >
                <MaterialCommunityIcons name="close" size={22} color="#6b7280" />
              </TouchableOpacity>
              <Text className={`${typo.section} text-gray-900 dark:text-white flex-1`}>
                {t('settings.bankAccounts.formTitle')}
              </Text>
              <TouchableOpacity
                onPress={handleSave}
                disabled={isPending || !canSave}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                {isPending ? (
                  <ActivityIndicator size="small" color="#4f46e5" />
                ) : (
                  <Text
                    className={`${typo.labelBold} ${
                      canSave ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-300 dark:text-gray-600'
                    }`}
                  >
                    {t('common.save')}
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 16 }}
            >
              {/* ── 1. Bank picker ─────────────────────────────────────────── */}
              <Text className={`${typo.label} text-gray-700 dark:text-gray-300 mb-2`}>
                {t('settings.bankAccounts.bankCodeLabel')}
                <Text className="text-red-500"> *</Text>
              </Text>

              {selectedVnBank ? (
                <SelectedBankRow bank={selectedVnBank} onClear={clearBank} typo={typo} />
              ) : (
                <View>
                  {/* Search input */}
                  <View className="flex-row items-center border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 px-4 mb-3">
                    <MaterialCommunityIcons name="magnify" size={18} color="#9ca3af" className="mr-2" />
                    <TextInput
                      ref={searchRef}
                      value={bankSearch}
                      onChangeText={setBankSearch}
                      placeholder="Tìm ngân hàng (VCB, Techcombank...)"
                      placeholderTextColor="#9ca3af"
                      className={`flex-1 py-3 ml-2 ${typo.inputSize} text-gray-900 dark:text-white`}
                      autoCapitalize="none"
                    />
                    {bankSearch.length > 0 && (
                      <TouchableOpacity
                        onPress={() => setBankSearch('')}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <MaterialCommunityIcons name="close-circle" size={18} color="#9ca3af" />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Bank chip row — single horizontal scrollable line */}
                  {filteredBanks.length === 0 ? (
                    <Text className={`${typo.caption} text-gray-400 py-2`}>
                      Không tìm thấy ngân hàng phù hợp
                    </Text>
                  ) : (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      keyboardShouldPersistTaps="handled"
                      nestedScrollEnabled
                      contentContainerStyle={{ paddingBottom: 4 }}
                    >
                      {filteredBanks.map((bank) => (
                        <BankChip
                          key={bank.bin}
                          bank={bank}
                          selected={form.bankBin === bank.bin}
                          onPress={() => selectBank(bank)}
                        />
                      ))}
                    </ScrollView>
                  )}
                </View>
              )}

              {/* ── 2. Account number ─────────────────────────────────────── */}
              <View className="mt-5 mb-4">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className={`${typo.label} text-gray-700 dark:text-gray-300`}>
                    {t('settings.bankAccounts.accountNoLabel')}
                    <Text className="text-red-500"> *</Text>
                  </Text>
                  {/* Keyboard mode toggle */}
                  <TouchableOpacity
                    onPress={() => setAcctNumKb((k) => (k === 'numeric' ? 'default' : 'numeric'))}
                    className="flex-row items-center gap-1"
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <MaterialCommunityIcons
                      name={acctNumKb === 'numeric' ? 'keyboard-outline' : 'numeric'}
                      size={16}
                      color="#6366f1"
                    />
                    <Text className={`${typo.caption} text-indigo-500`}>
                      {acctNumKb === 'numeric' ? 'Chữ' : 'Số'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <ClearableInput
                  value={form.accountNumber}
                  onChangeText={(v) => setForm((f) => ({ ...f, accountNumber: v }))}
                  placeholder={t('settings.bankAccounts.accountNoPlaceholder')}
                  keyboardType={acctNumKb}
                  typoClass={typo.inputSize}
                />
              </View>

              {/* ── 3. Account name ───────────────────────────────────────── */}
              <View className="mb-5">
                <Text className={`${typo.label} text-gray-700 dark:text-gray-300 mb-2`}>
                  {t('settings.bankAccounts.accountNameLabel')}
                  <Text className="text-red-500"> *</Text>
                </Text>
                <ClearableInput
                  value={form.accountName}
                  onChangeText={(v) => setForm((f) => ({ ...f, accountName: v }))}
                  placeholder={t('settings.bankAccounts.accountNamePlaceholder')}
                  autoCapitalize="words"
                  typoClass={typo.inputSize}
                />
                <Text className={`${typo.caption} text-gray-400 mt-1`}>
                  Nhập CHỮ IN HOA đúng với tên tài khoản ngân hàng
                </Text>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
