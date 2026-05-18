import { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { FloatingLabelInput } from '../../components/FloatingLabelInput';
import { LanguageChip } from '../../components/LanguageChip';
import { tenantApi } from '../../services/api';
import * as SecureStore from 'expo-secure-store';
import { useTypography } from '../../hooks/useTypography';
import type { AuthScreenProps } from '../../types/navigation';

const LAST_SHOP_ID_KEY = 'last_tenant_id';
const LAST_SHOP_NAME_KEY = 'last_shop_name';

type LastShop = { id: string; name: string };

export function ShopIdScreen({ navigation }: AuthScreenProps<'ShopId'>) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const typo = useTypography();
  const [shopId, setShopId] = useState('');
  const [error, setError] = useState<'' | 'not_found' | 'suspended' | 'network'>('');
  const [loading, setLoading] = useState(false);
  const [lastShop, setLastShop] = useState<LastShop | null>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    AsyncStorage.multiGet([LAST_SHOP_ID_KEY, LAST_SHOP_NAME_KEY]).then(([[, id], [, name]]) => {
      if (id) {
        const shop: LastShop = { id, name: name ?? id };
        setLastShop(shop);
        setShopId(id);
      }
    });
  }, []);

  const handleContinue = async () => {
    const id = shopId.trim().toLowerCase();
    if (!id) return;
    setError('');
    setLoading(true);
    try {
      const res = await tenantApi.checkStatus(id);
      const { status, shopName } = res.data.data;
      if (status === 'ACTIVE') {
        await Promise.all([
          SecureStore.setItemAsync('tenant_id', id),
          SecureStore.setItemAsync('shop_name', shopName),
          AsyncStorage.setItem(LAST_SHOP_ID_KEY, id),
          AsyncStorage.setItem(LAST_SHOP_NAME_KEY, shopName),
        ]);
        navigation.replace('Login');
      } else if (status === 'SUSPENDED') {
        setError('suspended');
      } else {
        setError('not_found');
      }
    } catch {
      setError('network');
    } finally {
      setLoading(false);
    }
  };

  const selectLastShop = () => {
    if (!lastShop) return;
    setShopId(lastShop.id);
    setError('');
  };

  const showLastShopCard = lastShop && shopId.trim().toLowerCase() !== lastShop.id;

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white dark:bg-gray-900"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Language chip — floats top-right like RegisterScreen */}
      <View style={[styles.langFloat, { top: insets.top + 10 }]}>
        <LanguageChip />
      </View>

      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 48, paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-1 px-6">

          {/* Logo */}
          <View className="items-center mb-12">
            <View className="w-20 h-20 rounded-3xl items-center justify-center mb-4" style={{ backgroundColor: '#4f46e5' }}>
              <MaterialCommunityIcons name="store" size={40} color="white" />
            </View>
            <Text className={`${typo.heading} text-gray-900 dark:text-white`}>TappyPOS</Text>
            <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 mt-1`}>
              {t('auth.shopId.subtitle')}
            </Text>
          </View>

          {/* Input */}
          <FloatingLabelInput
            ref={inputRef}
            testID="shop-id-input"
            label={t('auth.shopId.label')}
            value={shopId}
            onChangeText={(v) => {
              setShopId(v.toLowerCase().replace(/\s/g, ''));
              setError('');
            }}
            onClear={() => { setShopId(''); setError(''); }}
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
            returnKeyType="go"
            onSubmitEditing={handleContinue}
          />

          {/* Recently used shop card — shown when input differs from last shop */}
          {showLastShopCard && (
            <TouchableOpacity
              onPress={selectLastShop}
              activeOpacity={0.7}
              className="flex-row items-center gap-3 mt-3 px-4 py-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800"
            >
              <View className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-800 items-center justify-center flex-shrink-0">
                <MaterialCommunityIcons name="history" size={20} color="#4f46e5" />
              </View>
              <View className="flex-1">
                <Text className={`${typo.caption} text-indigo-500 dark:text-indigo-400 mb-0.5`}>
                  {t('auth.shopId.recentlyUsed')}
                </Text>
                <Text className={`${typo.labelBold} text-indigo-800 dark:text-indigo-200`} numberOfLines={1}>
                  {lastShop.name}
                </Text>
                <Text className={`${typo.caption} text-indigo-400 dark:text-indigo-500`}>{lastShop.id}</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color="#6366f1" />
            </TouchableOpacity>
          )}

          {error === 'not_found' && (
            <Text testID="shop-id-error-not-found" className={`${typo.caption} text-red-500 mt-2`}>
              {t('auth.shopId.notFound')}
            </Text>
          )}
          {error === 'suspended' && (
            <View testID="shop-id-error-suspended" className="mt-2 bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3">
              <Text className={`${typo.label} text-amber-700 dark:text-amber-300`}>
                {t('auth.shopId.suspended')}
              </Text>
              <Text className={`${typo.caption} text-amber-600 dark:text-amber-400 mt-1`}>
                {t('auth.shopId.suspendedSupport', { phone: '0901 234 567' })}
              </Text>
            </View>
          )}
          {error === 'network' && (
            <Text testID="shop-id-error-network" className={`${typo.caption} text-red-500 mt-2`}>
              {t('auth.shopId.networkError')}
            </Text>
          )}

          <TouchableOpacity
            testID="shop-id-submit"
            className={`mt-6 rounded-2xl py-4 items-center justify-center ${
              loading || !shopId.trim()
                ? 'bg-gray-200 dark:bg-gray-700'
                : 'bg-primary active:opacity-80'
            }`}
            onPress={handleContinue}
            disabled={loading || !shopId.trim()}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text
                className={`${typo.labelBold} ${
                  !shopId.trim() ? 'text-gray-400 dark:text-gray-500' : 'text-white'
                }`}
              >
                {t('auth.shopId.continue')}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            className="items-center mt-4"
            onPress={() => navigation.navigate('ForgotShopId')}
          >
            <Text className={`${typo.caption} text-primary`}>{t('auth.shopId.forgotShopId')}</Text>
          </TouchableOpacity>

          <View className="flex-row justify-center mt-4">
            <Text className={`${typo.caption} text-gray-500 dark:text-gray-400`}>{t('auth.shopId.noAccount')} </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text className={`${typo.label} text-primary`}>{t('auth.shopId.register')}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            className="items-center mt-3 py-2"
            onPress={() => navigation.navigate('Login', { noTenantRequired: true })}
          >
            <Text className={`${typo.caption} text-gray-400 dark:text-gray-500 text-center`}>
              {t('auth.shopId.pendingOnboarding')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  langFloat: {
    position: 'absolute',
    right: 16,
    zIndex: 10,
  },
});
