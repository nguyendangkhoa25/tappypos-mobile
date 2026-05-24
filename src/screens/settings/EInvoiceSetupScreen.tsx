import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, TextInput, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { shopInfoApi, type EInvoiceVendor } from '../../services/api';
import { useTypography } from '../../hooks/useTypography';
import { useToastStore } from '../../store/toastStore';
import { useAlertStore } from '../../store/alertStore';
import type { MoreScreenProps } from '../../types/navigation';

type Props = MoreScreenProps<'EInvoiceSetup'>;

// ── Provider definitions ──────────────────────────────────────────────────────

type ProviderDef = {
  vendor: EInvoiceVendor;
  label: string;
  color: string;
  bgClass: string;
  hintKey: string;
  hasSecretKey: boolean;
  hasPassword: boolean;
};

const PROVIDERS: ProviderDef[] = [
  {
    vendor: 'SINVOICE',
    label: 'S-Invoice (Viettel)',
    color: '#ef4444',
    bgClass: 'bg-red-50 dark:bg-red-900/20',
    hintKey: 'eInvoice.sInvoiceHint',
    hasSecretKey: false,
    hasPassword: true,
  },
  {
    vendor: 'BKAV',
    label: 'Bkav eHoadon',
    color: '#2563eb',
    bgClass: 'bg-blue-50 dark:bg-blue-900/20',
    hintKey: 'eInvoice.bkavHint',
    hasSecretKey: true,
    hasPassword: true,
  },
  {
    vendor: 'MISA',
    label: 'Misa',
    color: '#059669',
    bgClass: 'bg-emerald-50 dark:bg-emerald-900/20',
    hintKey: 'eInvoice.misaHint',
    hasSecretKey: true,
    hasPassword: false,
  },
];

// ── Form state ────────────────────────────────────────────────────────────────

type FormState = {
  vendor: EInvoiceVendor | null;
  username: string;
  password: string;
  secretKey: string;
  templateCode: string;
  invoiceSeries: string;
};

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  const typo = useTypography();
  return (
    <Text className={`${typo.captionBold} text-gray-400 dark:text-gray-500 uppercase tracking-wide px-1 mb-2 mt-5`}>
      {label}
    </Text>
  );
}

function FieldInput({
  label,
  value,
  onChange,
  placeholder,
  keyboardType = 'default',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'url';
}) {
  const typo = useTypography();
  return (
    <View className="mb-3">
      <Text className={`${typo.caption} text-gray-600 dark:text-gray-400 mb-1.5`}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#9ca3af"
        autoCorrect={false}
        autoCapitalize="none"
        keyboardType={keyboardType}
        className={`${typo.inputSize} bg-gray-50 dark:bg-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600`}
      />
    </View>
  );
}

/** Secure text field with eye-toggle — same visual as PasswordInput, no strength/rules. */
function SecureFieldInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  const typo = useTypography();
  return (
    <View className="mb-3">
      <Text className={`${typo.caption} text-gray-600 dark:text-gray-400 mb-1.5`}>{label}</Text>
      <View className="flex-row items-center bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4">
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor="#9ca3af"
          secureTextEntry={!show}
          autoCorrect={false}
          autoCapitalize="none"
          className={`flex-1 py-3 ${typo.inputSize} text-gray-900 dark:text-white`}
        />
        <TouchableOpacity onPress={() => setShow((v) => !v)} className="p-1">
          <MaterialCommunityIcons
            name={show ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color="#9ca3af"
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export function EInvoiceSetupScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const typo = useTypography();
  const qc = useQueryClient();
  const showToast = useToastStore((s) => s.show);
  const showAlert = useAlertStore((s) => s.show);

  const [form, setForm] = useState<FormState>({
    vendor: null,
    username: '',
    password: '',
    secretKey: '',
    templateCode: '',
    invoiceSeries: '',
  });

  const [passwordAlreadySaved, setPasswordAlreadySaved] = useState(false);
  const [secretKeyAlreadySaved, setSecretKeyAlreadySaved] = useState(false);

  // ── Load current config ───────────────────────────────────────────────────

  const { data, isLoading } = useQuery({
    queryKey: ['shopInfo-einvoice'],
    queryFn: () => shopInfoApi.get().then((r) => r.data.data),
    staleTime: 2 * 60_000,
  });

  useEffect(() => {
    if (!data) return;
    const vendor = (data.invoiceVendor as EInvoiceVendor | null) ?? null;
    setForm({
      vendor,
      username: data.eInvoiceUsername ?? '',
      password: '',
      secretKey: '',
      templateCode: data.templateCode ?? '',
      invoiceSeries: data.invoiceSeries ?? '',
    });
    // Server never returns password/key — presence of username implies they were set together
    setPasswordAlreadySaved(!!data.eInvoiceUsername && vendor !== 'MISA');
    setSecretKeyAlreadySaved(!!data.eInvoiceUsername && (vendor === 'BKAV' || vendor === 'MISA'));
  }, [data]);

  // ── Save mutation ─────────────────────────────────────────────────────────

  const { mutate: save, isPending: saving } = useMutation({
    mutationFn: () => {
      const payload: Parameters<typeof shopInfoApi.saveEInvoiceConfig>[0] = {
        invoiceVendor: form.vendor,
        eInvoiceUsername: form.username,
        templateCode: form.templateCode,
        invoiceSeries: form.invoiceSeries,
      };
      if (form.password) payload.eInvoicePassword = form.password;
      if (form.secretKey) payload.eInvoiceKey = form.secretKey;
      return shopInfoApi.saveEInvoiceConfig(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shopInfo-einvoice'] });
      qc.invalidateQueries({ queryKey: ['shop-info'] });
      showToast(t('eInvoice.saveSuccess'));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    },
    onError: () => {
      showToast(t('eInvoice.saveError'));
    },
  });

  // ── Disconnect ────────────────────────────────────────────────────────────

  const handleDisconnect = () => {
    showAlert(t('eInvoice.disconnectTitle'), t('eInvoice.disconnectMsg'), [
      { label: t('common.cancel'), style: 'cancel' },
      {
        label: t('eInvoice.disconnect'),
        style: 'destructive',
        onPress: () => {
          shopInfoApi
            .saveEInvoiceConfig({
              invoiceVendor: null,
              eInvoiceUsername: '',
              templateCode: '',
              invoiceSeries: '',
            })
            .then(() => {
              qc.invalidateQueries({ queryKey: ['shopInfo-einvoice'] });
              qc.invalidateQueries({ queryKey: ['shop-info'] });
              showToast(t('eInvoice.disconnected'));
              navigation.goBack();
            })
            .catch(() => showToast(t('eInvoice.saveError')));
        },
      },
    ]);
  };

  // ── Derived ───────────────────────────────────────────────────────────────

  const selectedProvider = PROVIDERS.find((p) => p.vendor === form.vendor) ?? null;
  const isConfigured = !!(data?.invoiceVendor && data?.eInvoiceUsername);
  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));
  const canSave = !!form.vendor && !!form.username.trim();

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Header — back arrow + title on same row, subtitle below (no extra indent) */}
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
            {t('eInvoice.title')}
          </Text>
          {isConfigured && (
            <View className="flex-row items-center gap-1 bg-emerald-50 dark:bg-emerald-900/30 rounded-full px-3 py-1">
              <MaterialCommunityIcons name="check-circle" size={13} color="#059669" />
              <Text className={`${typo.captionBold} text-emerald-700 dark:text-emerald-400`}>
                {t('eInvoice.configured')}
              </Text>
            </View>
          )}
        </View>
        <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 mt-0.5`}>
          {t('eInvoice.subtitle')}
        </Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#4f46e5" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 4, paddingBottom: insets.bottom + 32 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Provider selection ── */}
          <SectionLabel label={t('eInvoice.selectProvider')} />
          <View className="flex-row gap-2 flex-wrap">
            {PROVIDERS.map((p) => {
              const active = form.vendor === p.vendor;
              return (
                <TouchableOpacity
                  key={p.vendor}
                  onPress={() => {
                    setField('vendor', p.vendor);
                    Haptics.selectionAsync();
                  }}
                  className={`flex-row items-center rounded-full px-4 py-2 border ${
                    active
                      ? 'border-transparent'
                      : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800'
                  }`}
                  style={active ? { backgroundColor: p.color + '22', borderColor: p.color } : undefined}
                >
                  {active && (
                    <MaterialCommunityIcons
                      name="check-circle"
                      size={14}
                      color={p.color}
                      style={{ marginRight: 5 }}
                    />
                  )}
                  <Text
                    className={typo.captionBold}
                    style={{ color: active ? p.color : '#6b7280' }}
                  >
                    {p.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ── Provider hint ── */}
          {selectedProvider && (
            <View
              className={`rounded-xl px-4 py-3 mt-3 flex-row items-start gap-2 ${selectedProvider.bgClass}`}
            >
              <MaterialCommunityIcons
                name="information-outline"
                size={16}
                color={selectedProvider.color}
                style={{ marginTop: 1 }}
              />
              <Text className={`${typo.caption} flex-1`} style={{ color: selectedProvider.color }}>
                {t(selectedProvider.hintKey)}
              </Text>
            </View>
          )}

          {/* ── Credential + config fields ── */}
          {selectedProvider && (
            <>
              <SectionLabel label={t('eInvoice.sectionCredentials')} />
              <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700">
                <FieldInput
                  label={
                    selectedProvider.vendor === 'MISA'
                      ? t('eInvoice.labelAppId')
                      : t('eInvoice.labelUsername')
                  }
                  value={form.username}
                  onChange={(v) => setField('username', v)}
                  placeholder={selectedProvider.vendor === 'MISA' ? 'app_id_xxx' : 'user@example.com'}
                />

                {selectedProvider.hasPassword && (
                  <SecureFieldInput
                    label={t('eInvoice.labelPassword')}
                    value={form.password}
                    onChange={(v) => setField('password', v)}
                    placeholder={
                      passwordAlreadySaved
                        ? t('eInvoice.passwordPlaceholder')
                        : t('eInvoice.passwordNew')
                    }
                  />
                )}

                {selectedProvider.hasSecretKey && (
                  <SecureFieldInput
                    label={
                      selectedProvider.vendor === 'MISA'
                        ? t('eInvoice.labelApiKey')
                        : t('eInvoice.labelSecretKey')
                    }
                    value={form.secretKey}
                    onChange={(v) => setField('secretKey', v)}
                    placeholder={
                      secretKeyAlreadySaved ? t('eInvoice.passwordPlaceholder') : undefined
                    }
                  />
                )}
              </View>

              <SectionLabel label={t('eInvoice.sectionConfig')} />
              <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700">
                <FieldInput
                  label={t('eInvoice.labelTemplateCode')}
                  value={form.templateCode}
                  onChange={(v) => setField('templateCode', v)}
                  placeholder="01GTKT0/001"
                />
                <FieldInput
                  label={t('eInvoice.labelInvoiceSeries')}
                  value={form.invoiceSeries}
                  onChange={(v) => setField('invoiceSeries', v)}
                  placeholder="AA/24E"
                />
              </View>
            </>
          )}

          {/* ── Save button ── */}
          <TouchableOpacity
            className={`rounded-2xl py-4 items-center mt-6 ${
              canSave && !saving
                ? 'bg-indigo-600 active:opacity-80'
                : 'bg-indigo-200 dark:bg-indigo-900/40'
            }`}
            onPress={() => canSave && !saving && save()}
            disabled={!canSave || saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text
                className={`${typo.labelBold} ${
                  canSave ? 'text-white' : 'text-indigo-300 dark:text-indigo-600'
                }`}
              >
                {t('eInvoice.saveCredentials')}
              </Text>
            )}
          </TouchableOpacity>

          {/* ── Disconnect ── */}
          {isConfigured && (
            <TouchableOpacity
              className="rounded-2xl py-4 items-center mt-3 bg-white dark:bg-gray-800 border border-red-100 dark:border-red-900/40 active:opacity-70"
              onPress={handleDisconnect}
            >
              <Text className={`${typo.labelBold} text-red-500 dark:text-red-400`}>
                {t('eInvoice.disconnectTitle')}
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      )}
    </View>
  );
}
