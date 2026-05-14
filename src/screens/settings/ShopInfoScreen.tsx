import { useState, useEffect } from 'react';
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
import * as Clipboard from 'expo-clipboard';
import * as SecureStore from 'expo-secure-store';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToastStore } from '../../store/toastStore';
import { useErrorAlert } from '../../hooks/useErrorAlert';
import { useUserStore } from '../../store/userStore';
import { shopConfigApi } from '../../services/api';
import type { SettingsScreenProps } from '../../types/navigation';

export function ShopInfoScreen({ navigation }: SettingsScreenProps<'ShopInfo'>) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { show: showToast } = useToastStore();
  const { setShopName } = useUserStore();

  const [tenantId, setTenantId] = useState('');

  useEffect(() => {
    SecureStore.getItemAsync('tenant_id').then((v) => { if (v) setTenantId(v); });
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ['shopInfo'],
    queryFn: () => shopConfigApi.getInfo().then((r) => r.data.data),
    staleTime: 5 * 60_000,
  });

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    if (data) {
      setName(data.shopName ?? '');
      setAddress(data.address ?? '');
      setPhone(data.phone ?? '');
    }
  }, [data]);

  const showErrorAlert = useErrorAlert();

  const mutation = useMutation({
    mutationFn: () => shopConfigApi.updateInfo({ shopName: name, address, phone }),
    onSuccess: async () => {
      qc.invalidateQueries({ queryKey: ['shopInfo'] });
      if (name) await setShopName(name);
      showToast(t('settings.shopInfo.saveSuccess'));
      navigation.goBack();
    },
    onError: showErrorAlert,
  });

  const handleCopyId = async () => {
    await Clipboard.setStringAsync(tenantId);
    showToast(t('settings.shopInfo.shopIdCopied'));
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-gray-50 dark:bg-gray-900"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View
        className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4"
        style={{ paddingTop: insets.top + 12, paddingBottom: 12 }}
      >
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} className="mr-3">
            <MaterialCommunityIcons name="chevron-left" size={26} color="#4f46e5" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-gray-900 dark:text-white flex-1">
            {t('settings.shopInfo.title')}
          </Text>
          <TouchableOpacity
            onPress={() => mutation.mutate()}
            disabled={mutation.isPending || isLoading}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {mutation.isPending ? (
              <ActivityIndicator size="small" color="#4f46e5" />
            ) : (
              <Text className="font-semibold text-base text-indigo-600">{t('common.save')}</Text>
            )}
          </TouchableOpacity>
        </View>
        <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-9">{t('settings.shopInfo.hint')}</Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#4f46e5" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }} keyboardShouldPersistTaps="handled">
          {/* Shop ID */}
          <View className="bg-white dark:bg-gray-800 rounded-2xl p-4">
            <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">
              {t('settings.shopInfo.shopIdLabel')}
            </Text>
            <TouchableOpacity onPress={handleCopyId} className="flex-row items-center gap-2">
              <Text className="text-base font-mono text-gray-700 dark:text-gray-300 flex-1">{tenantId}</Text>
              <MaterialCommunityIcons name="content-copy" size={18} color="#4f46e5" />
            </TouchableOpacity>
          </View>

          {/* Fields */}
          <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 gap-4">
            {[
              { label: t('settings.shopInfo.nameLabel'), placeholder: t('settings.shopInfo.namePlaceholder'), value: name, onChange: setName },
              { label: t('settings.shopInfo.addressLabel'), placeholder: t('settings.shopInfo.addressPlaceholder'), value: address, onChange: setAddress },
              { label: t('settings.shopInfo.phoneLabel'), placeholder: t('settings.shopInfo.phonePlaceholder'), value: phone, onChange: setPhone, keyboard: 'phone-pad' as const },
            ].map((field) => (
              <View key={field.label}>
                <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{field.label}</Text>
                <TextInput
                  value={field.value}
                  onChangeText={field.onChange}
                  placeholder={field.placeholder}
                  placeholderTextColor="#9ca3af"
                  keyboardType={field.keyboard}
                  className="border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 text-base text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700"
                />
              </View>
            ))}

          </View>
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}
