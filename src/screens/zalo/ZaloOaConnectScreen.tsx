import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { zaloOaApi, type ZaloOaStatus } from '../../services/api';
import { useAlertStore } from '../../store/alertStore';
import { useToastStore } from '../../store/toastStore';
import { useErrorAlert } from '../../hooks/useErrorAlert';
import { useTypography } from '../../hooks/useTypography';
import { formatDate } from '../../utils/format';
import type { MoreScreenProps } from '../../types/navigation';

// Registered in both SettingsStack and MoreStack; MoreStack is the primary path.
// The screen only calls navigation.goBack(), so the prop type is safe for both.
type Props = MoreScreenProps<'ZaloOaConnect'>;

type ConnectMode = 'app_secret' | 'access_token';

export function ZaloOaConnectScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const typo = useTypography();
  const qc = useQueryClient();
  const { show: showAlert } = useAlertStore();
  const { show: showToast } = useToastStore();
  const showErrorAlert = useErrorAlert();

  // ── Form state ───────────────────────────────────────────────────────────────
  const [connectMode, setConnectMode] = useState<ConnectMode>('app_secret');
  const [oaName, setOaName] = useState('');
  const [oaId, setOaId] = useState('');
  const [appId, setAppId] = useState('');
  const [appSecret, setAppSecret] = useState('');
  const [secretVisible, setSecretVisible] = useState(false);
  const [accessToken, setAccessToken] = useState('');
  const [tokenVisible, setTokenVisible] = useState(false);

  // ── Queries ──────────────────────────────────────────────────────────────────
  const { data: status, isLoading } = useQuery({
    queryKey: ['zaloOaStatus'],
    queryFn: () => zaloOaApi.getStatus().then((r) => r.data.data as ZaloOaStatus),
    staleTime: 60_000,
  });

  // ── Mutations ────────────────────────────────────────────────────────────────
  const connectMutation = useMutation({
    mutationFn: () =>
      connectMode === 'app_secret'
        ? zaloOaApi.connect({ appId: appId.trim(), appSecret: appSecret.trim(), oaName: oaName.trim(), oaId: oaId.trim() || undefined })
        : zaloOaApi.connect({ accessToken: accessToken.trim(), oaName: oaName.trim(), oaId: oaId.trim() || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['zaloOaStatus'] });
      setOaName('');
      setOaId('');
      setAppId('');
      setAppSecret('');
      setAccessToken('');
      showToast(t('zalo.oa.connectSuccess'));
    },
    onError: showErrorAlert,
  });

  const disconnectMutation = useMutation({
    mutationFn: () => zaloOaApi.disconnect(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['zaloOaStatus'] });
      showToast(t('zalo.oa.disconnectSuccess'));
    },
    onError: showErrorAlert,
  });

  // ── Derived ──────────────────────────────────────────────────────────────────
  const hasOaInfo = oaName.trim().length > 0;
  const canConnect = hasOaInfo && (
    connectMode === 'app_secret'
      ? appId.trim().length > 0 && appSecret.trim().length > 0
      : accessToken.trim().length > 0
  );

  // If there's no appId on the status, it was connected via access token only
  const connectedViaToken = status?.connected && !status.appId;

  function handleDisconnect() {
    showAlert(t('zalo.oa.disconnectTitle'), t('zalo.oa.disconnectMsg'), [
      { label: t('common.cancel'), style: 'cancel' },
      {
        label: t('zalo.oa.disconnectConfirm'),
        style: 'destructive',
        onPress: () => disconnectMutation.mutate(),
      },
    ]);
  }

  const MODES: { key: ConnectMode; label: string }[] = [
    { key: 'app_secret',    label: t('zalo.oa.modeAppSecret') },
    { key: 'access_token',  label: t('zalo.oa.modeToken') },
  ];

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-gray-50 dark:bg-gray-900"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* ── Header ── */}
      <View
        className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4"
        style={{ paddingTop: insets.top + 12, paddingBottom: 12 }}
      >
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            className="mr-3"
          >
            <MaterialCommunityIcons name="chevron-left" size={26} color="#4f46e5" />
          </TouchableOpacity>
          <Text className={`${typo.heading} text-gray-900 dark:text-white flex-1`}>
            {t('zalo.oa.title')}
          </Text>
        </View>
        <Text className={`${typo.caption} text-gray-400 dark:text-gray-500 mt-1`}>
          {t('zalo.oa.subtitle')}
        </Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#4f46e5" />
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 4, paddingBottom: insets.bottom + 40 }}
        >
          {/* ── Status card ── */}
          <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 mb-4">
            <View className="flex-row items-center" style={{ gap: 12 }}>
              <View className={`w-11 h-11 rounded-2xl items-center justify-center flex-shrink-0 ${status?.connected ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-gray-100 dark:bg-gray-700'}`}>
                <MaterialCommunityIcons
                  name={status?.connected ? 'chat-processing-outline' : 'link-variant-off'}
                  size={22}
                  color={status?.connected ? '#0068ff' : '#9ca3af'}
                />
              </View>
              <View className="flex-1">
                {status?.connected ? (
                  <>
                    {status.oaName ? (
                      <Text className={`${typo.labelBold} text-gray-900 dark:text-white`} numberOfLines={1}>
                        {status.oaName}
                      </Text>
                    ) : (
                      <Text className={`${typo.labelBold} text-gray-900 dark:text-white`}>
                        {connectedViaToken ? t('zalo.oa.statusConnectedViaToken') : t('zalo.oa.statusConnected')}
                      </Text>
                    )}
                    <View className="flex-row flex-wrap mt-0.5" style={{ gap: 6 }}>
                      {status.oaId && (
                        <Text className={`${typo.caption} text-gray-400 dark:text-gray-500`}>
                          {t('zalo.oa.oaIdLabel')}: {status.oaId}
                        </Text>
                      )}
                      {status.appId && status.oaId && (
                        <Text className={`${typo.caption} text-gray-300 dark:text-gray-600`}>·</Text>
                      )}
                      {status.appId && (
                        <Text className={`${typo.caption} text-gray-400 dark:text-gray-500`}>
                          App: {status.appId}
                        </Text>
                      )}
                      {!status.appId && (
                        <Text className={`${typo.caption} text-amber-500 dark:text-amber-400`}>
                          {t('zalo.oa.modeToken')}
                        </Text>
                      )}
                    </View>
                  </>
                ) : (
                  <>
                    <Text className={`${typo.labelBold} text-gray-900 dark:text-white`}>
                      {t('zalo.oa.statusNotConnected')}
                    </Text>
                    <Text className={`${typo.caption} text-gray-400 dark:text-gray-500 mt-0.5`}>
                      {t('zalo.oa.statusNotConnectedHint')}
                    </Text>
                  </>
                )}
              </View>
              {status?.connected && (
                <View className="bg-green-100 dark:bg-green-900/30 px-2.5 py-1 rounded-full flex-shrink-0">
                  <Text className={`${typo.captionBold} text-green-700 dark:text-green-300`}>
                    {t('zalo.oa.activeBadge')}
                  </Text>
                </View>
              )}
            </View>

            {status?.connected && status.tokenExpiry && (
              <View className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex-row items-center" style={{ gap: 6 }}>
                <MaterialCommunityIcons name="clock-outline" size={14} color="#9ca3af" />
                <Text className={`${typo.caption} text-gray-400 dark:text-gray-500`}>
                  {t('zalo.oa.tokenExpiryLabel')}: {formatDate(status.tokenExpiry)}
                </Text>
              </View>
            )}
          </View>

          {status?.connected ? (
            /* ── Connected state ── */
            <>
              <View className={`flex-row items-start rounded-2xl p-4 border mb-4 ${connectedViaToken ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800' : 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800'}`} style={{ gap: 10 }}>
                <MaterialCommunityIcons
                  name={connectedViaToken ? 'alert-circle-outline' : 'information-outline'}
                  size={16}
                  color={connectedViaToken ? '#d97706' : '#3b82f6'}
                  style={{ marginTop: 1 }}
                />
                <Text className={`${typo.caption} flex-1 leading-5 ${connectedViaToken ? 'text-amber-700 dark:text-amber-300' : 'text-blue-700 dark:text-blue-300'}`}>
                  {connectedViaToken ? t('zalo.oa.connectedTokenInfo') : t('zalo.oa.connectedInfo')}
                </Text>
              </View>

              <TouchableOpacity
                onPress={handleDisconnect}
                disabled={disconnectMutation.isPending}
                activeOpacity={0.7}
                className="bg-white dark:bg-gray-800 rounded-2xl py-4 items-center border border-red-100 dark:border-red-900/40"
              >
                {disconnectMutation.isPending ? (
                  <ActivityIndicator size="small" color="#ef4444" />
                ) : (
                  <Text className={`${typo.labelBold} text-red-500 dark:text-red-400`}>
                    {t('zalo.oa.disconnectBtn')}
                  </Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            /* ── Not connected — show form ── */
            <>
              {/* Mode selector */}
              <View className="flex-row bg-gray-100 dark:bg-gray-700 rounded-2xl p-1 mb-4">
                {MODES.map((m) => {
                  const active = connectMode === m.key;
                  return (
                    <TouchableOpacity
                      key={m.key}
                      onPress={() => setConnectMode(m.key)}
                      activeOpacity={0.7}
                      className={`flex-1 py-2.5 rounded-xl items-center ${active ? 'bg-white dark:bg-gray-600' : ''}`}
                      style={active ? { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 2 } : undefined}
                    >
                      <Text className={`${typo.captionBold} ${active ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                        {m.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Mode hint */}
              <View className="flex-row items-start mb-4" style={{ gap: 6 }}>
                <MaterialCommunityIcons
                  name={connectMode === 'app_secret' ? 'shield-check-outline' : 'alert-circle-outline'}
                  size={14}
                  color={connectMode === 'app_secret' ? '#059669' : '#d97706'}
                  style={{ marginTop: 1 }}
                />
                <Text className={`${typo.caption} leading-5 flex-1 ${connectMode === 'app_secret' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                  {connectMode === 'app_secret' ? t('zalo.oa.modeAppSecretHint') : t('zalo.oa.modeTokenHint')}
                </Text>
              </View>

              {/* OA identity — shared across both modes */}
              <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 mb-4">
                <Text className={`${typo.label} text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3`}>
                  {t('zalo.oa.sectionOaInfo')}
                </Text>
                {/* OA Name */}
                <View className="mb-4">
                  <Text className={`${typo.caption} font-medium text-gray-700 dark:text-gray-300 mb-1.5`}>
                    {t('zalo.oa.oaNameLabel')} *
                  </Text>
                  <TextInput
                    className={`border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-3 ${typo.inputSize} text-gray-900 dark:text-white bg-white dark:bg-gray-700`}
                    placeholder={t('zalo.oa.oaNamePlaceholder')}
                    placeholderTextColor="#9ca3af"
                    value={oaName}
                    onChangeText={setOaName}
                    autoCorrect={false}
                    returnKeyType="next"
                  />
                </View>
                {/* OA ID */}
                <View>
                  <Text className={`${typo.caption} font-medium text-gray-700 dark:text-gray-300 mb-1.5`}>
                    {t('zalo.oa.oaIdLabel')}
                    <Text className={`${typo.caption} text-gray-400`}> ({t('common.optional')})</Text>
                  </Text>
                  <TextInput
                    className={`border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-3 ${typo.inputSize} text-gray-900 dark:text-white bg-white dark:bg-gray-700`}
                    placeholder={t('zalo.oa.oaIdPlaceholder')}
                    placeholderTextColor="#9ca3af"
                    value={oaId}
                    onChangeText={setOaId}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="numeric"
                    returnKeyType="next"
                  />
                </View>
              </View>

              {/* Credentials — mode-specific */}
              <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 mb-4">
                {connectMode === 'app_secret' ? (
                  <>
                    {/* App ID */}
                    <View className="mb-4">
                      <Text className={`${typo.caption} font-medium text-gray-700 dark:text-gray-300 mb-1.5`}>
                        {t('zalo.oa.appIdLabel')} *
                      </Text>
                      <TextInput
                        className={`border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-3 ${typo.inputSize} text-gray-900 dark:text-white bg-white dark:bg-gray-700`}
                        placeholder={t('zalo.oa.appIdPlaceholder')}
                        placeholderTextColor="#9ca3af"
                        value={appId}
                        onChangeText={setAppId}
                        autoCapitalize="none"
                        autoCorrect={false}
                        returnKeyType="next"
                      />
                    </View>

                    {/* App Secret */}
                    <View>
                      <Text className={`${typo.caption} font-medium text-gray-700 dark:text-gray-300 mb-1.5`}>
                        {t('zalo.oa.appSecretLabel')} *
                      </Text>
                      <View className="flex-row items-center border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700">
                        <TextInput
                          className={`flex-1 px-3 py-3 ${typo.inputSize} text-gray-900 dark:text-white`}
                          placeholder={t('zalo.oa.appSecretPlaceholder')}
                          placeholderTextColor="#9ca3af"
                          value={appSecret}
                          onChangeText={setAppSecret}
                          secureTextEntry={!secretVisible}
                          autoCapitalize="none"
                          autoCorrect={false}
                          returnKeyType="done"
                          onSubmitEditing={() => canConnect && connectMutation.mutate()}
                        />
                        <TouchableOpacity
                          onPress={() => setSecretVisible((v) => !v)}
                          hitSlop={8}
                          className="px-3"
                        >
                          <MaterialCommunityIcons
                            name={secretVisible ? 'eye-off-outline' : 'eye-outline'}
                            size={18}
                            color="#9ca3af"
                          />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </>
                ) : (
                  /* Access Token field */
                  <View>
                    <Text className={`${typo.caption} font-medium text-gray-700 dark:text-gray-300 mb-1.5`}>
                      {t('zalo.oa.accessTokenLabel')} *
                    </Text>
                    <View className="flex-row items-center border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700">
                      <TextInput
                        className={`flex-1 px-3 py-3 ${typo.inputSize} text-gray-900 dark:text-white`}
                        placeholder={t('zalo.oa.accessTokenPlaceholder')}
                        placeholderTextColor="#9ca3af"
                        value={accessToken}
                        onChangeText={setAccessToken}
                        secureTextEntry={!tokenVisible}
                        autoCapitalize="none"
                        autoCorrect={false}
                        returnKeyType="done"
                        onSubmitEditing={() => canConnect && connectMutation.mutate()}
                      />
                      <TouchableOpacity
                        onPress={() => setTokenVisible((v) => !v)}
                        hitSlop={8}
                        className="px-3"
                      >
                        <MaterialCommunityIcons
                          name={tokenVisible ? 'eye-off-outline' : 'eye-outline'}
                          size={18}
                          color="#9ca3af"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>

              {/* Help box */}
              <View className="flex-row items-start bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-4 border border-blue-100 dark:border-blue-800 mb-4" style={{ gap: 10 }}>
                <MaterialCommunityIcons name="information-outline" size={16} color="#3b82f6" style={{ marginTop: 1 }} />
                <Text className={`${typo.caption} text-blue-700 dark:text-blue-300 flex-1 leading-5`}>
                  {t('zalo.oa.helpText')}
                </Text>
              </View>

              {/* Connect button */}
              <TouchableOpacity
                onPress={() => connectMutation.mutate()}
                disabled={!canConnect || connectMutation.isPending}
                activeOpacity={0.7}
                className={`rounded-2xl py-4 items-center ${canConnect ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'}`}
              >
                {connectMutation.isPending ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text className={`${typo.labelBold} ${canConnect ? 'text-white' : 'text-gray-400 dark:text-gray-500'}`}>
                    {t('zalo.oa.connectBtn')}
                  </Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}
