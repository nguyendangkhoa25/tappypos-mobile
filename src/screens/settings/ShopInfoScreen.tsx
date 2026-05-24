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
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToastStore } from '../../store/toastStore';
import { useErrorAlert } from '../../hooks/useErrorAlert';
import { useUserStore } from '../../store/userStore';
import { shopConfigApi, userApi } from '../../services/api';
import { useTypography } from '../../hooks/useTypography';
import { PhoneInput } from '../../components/PhoneInput';
import type { MoreStackParamList, SettingsScreenProps } from '../../types/navigation';

export function ShopInfoScreen({ navigation }: SettingsScreenProps<'ShopInfo'>) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const typo = useTypography();
  const qc = useQueryClient();
  const { show: showToast } = useToastStore();
  const { setShopName } = useUserStore();
  // Use MoreStack navigation to reach DeleteShop (which lives in the MoreStack)
  const moreNav = useNavigation<NativeStackNavigationProp<MoreStackParamList>>();

  const [tenantId, setTenantId] = useState('');

  useEffect(() => {
    SecureStore.getItemAsync('tenant_id').then((v) => { if (v) setTenantId(v); });
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ['shopInfo'],
    queryFn: () => shopConfigApi.getInfo().then((r) => r.data.data),
    staleTime: 5 * 60_000,
  });

  const { data: meData } = useQuery({
    queryKey: ['me-role'],
    queryFn: () => userApi.getMe().then((r) => r.data.data),
    staleTime: 5 * 60_000,
  });
  const isShopOwner = meData?.roles?.includes('SHOP_OWNER') ?? false;

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
        <View className="flex-row items-center mb-0.5">
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} className="mr-3">
            <MaterialCommunityIcons name="chevron-left" size={26} color="#4f46e5" />
          </TouchableOpacity>
          <Text className={`${typo.heading} text-gray-900 dark:text-white flex-1`}>
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
              <Text className={`${typo.labelBold} text-indigo-600`}>{t('common.save')}</Text>
            )}
          </TouchableOpacity>
        </View>
        <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 mt-0.5`}>{t('settings.shopInfo.hint')}</Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#4f46e5" />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 4, gap: 16 }} keyboardShouldPersistTaps="handled">
          {/* Shop ID */}
          <View className="bg-white dark:bg-gray-800 rounded-2xl p-4">
            <Text className={`${typo.label} text-gray-500 dark:text-gray-400 mb-2`}>
              {t('settings.shopInfo.shopIdLabel')}
            </Text>
            <TouchableOpacity onPress={handleCopyId} className="flex-row items-center gap-2">
              <Text className={`${typo.caption} font-mono text-gray-700 dark:text-gray-300 flex-1`}>{tenantId}</Text>
              <MaterialCommunityIcons name="content-copy" size={18} color="#4f46e5" />
            </TouchableOpacity>
          </View>

          {/* Fields */}
          <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 gap-4">
            {[
              { label: t('settings.shopInfo.nameLabel'), placeholder: t('settings.shopInfo.namePlaceholder'), value: name, onChange: setName },
              { label: t('settings.shopInfo.addressLabel'), placeholder: t('settings.shopInfo.addressPlaceholder'), value: address, onChange: setAddress },
            ].map((field) => (
              <View key={field.label}>
                <Text className={`${typo.label} text-gray-700 dark:text-gray-300 mb-2`}>{field.label}</Text>
                <TextInput
                  value={field.value}
                  onChangeText={field.onChange}
                  placeholder={field.placeholder}
                  placeholderTextColor="#9ca3af"
                  className={`border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 ${typo.inputSize} text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700`}
                />
              </View>
            ))}
            <View>
              <Text className={`${typo.label} text-gray-700 dark:text-gray-300 mb-2`}>{t('settings.shopInfo.phoneLabel')}</Text>
              <PhoneInput
                value={phone}
                onChangeRaw={setPhone}
                placeholder={t('settings.shopInfo.phonePlaceholder')}
              />
            </View>

          </View>

          {/* Multi-device sync note */}
          <View className="flex-row items-center gap-2 px-1">
            <MaterialCommunityIcons name="clock-outline" size={13} color="#9ca3af" />
            <Text className={`${typo.caption} text-gray-400 dark:text-gray-500 flex-1`}>
              {t('settings.syncHint')}
            </Text>
          </View>

          {/* Delete shop — visible to SHOP_OWNER only */}
          {isShopOwner && (
            <TouchableOpacity
              onPress={() => moreNav.navigate('DeleteShop')}
              className="flex-row items-center gap-3 bg-white dark:bg-gray-800 rounded-2xl p-4 border border-red-100 dark:border-red-900/40"
              activeOpacity={0.7}
            >
              <View className="w-9 h-9 rounded-xl bg-red-100 dark:bg-red-900/30 items-center justify-center flex-shrink-0">
                <MaterialCommunityIcons name="store-remove-outline" size={18} color="#dc2626" />
              </View>
              <View className="flex-1">
                <Text className={`${typo.caption} font-medium text-red-600 dark:text-red-400`}>
                  {t('deleteShop.menuLabel')}
                </Text>
                <Text className={`${typo.caption} text-gray-400 dark:text-gray-500 mt-0.5`} numberOfLines={1}>
                  {t('deleteShop.menuHint')}
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={16} color="#dc2626" />
            </TouchableOpacity>
          )}
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}
