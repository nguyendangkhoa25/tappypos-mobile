import { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { TextInput } from 'react-native';
import { ClearableInput } from '../../components/ClearableInput';
import { PhoneInput } from '../../components/PhoneInput';
import { SUPPORT } from '../../utils/constants';
import type { AuthScreenProps } from '../../types/navigation';

export function ForgotShopIdScreen({ navigation }: AuthScreenProps<'ForgotShopId'>) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [shopName, setShopName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const phoneRef = useRef<TextInput>(null);

  const handleSend = async () => {
    if (!shopName.trim()) return;
    setLoading(true);
    // No dedicated API — simulate submission then show support contacts
    await new Promise((r) => setTimeout(r, 800));
    setLoading(false);
    setSent(true);
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white dark:bg-gray-900"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 16, paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-1 px-6">
          <TouchableOpacity
            className="mb-6 self-start"
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color="#374151" />
          </TouchableOpacity>

          <Text className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            {t('auth.forgotShopId.title')}
          </Text>
          <Text className="text-sm text-gray-500 dark:text-gray-400 mb-8 leading-5">
            {t('auth.forgotShopId.subtitle')}
          </Text>

          {!sent ? (
            <>
              <View className="mb-4">
                <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  {t('auth.forgotShopId.shopNameLabel')}
                </Text>
                <ClearableInput
                  value={shopName}
                  onChangeText={setShopName}
                  onClear={() => setShopName('')}
                  placeholder={t('auth.forgotShopId.shopNamePlaceholder')}
                  keyboardType="default"
                  autoCapitalize="words"
                  returnKeyType="next"
                  onSubmitEditing={() => phoneRef.current?.focus()}
                />
              </View>

              <View className="mb-6">
                <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  {t('auth.forgotShopId.phoneLabel')}
                </Text>
                <PhoneInput
                  ref={phoneRef}
                  value={phone}
                  onChangeRaw={setPhone}
                  placeholder="0901 234 567"
                  returnKeyType="send"
                  onSubmitEditing={handleSend}
                />
              </View>

              <TouchableOpacity
                className={`rounded-2xl py-4 items-center justify-center ${
                  loading || !shopName.trim()
                    ? 'bg-gray-200 dark:bg-gray-700'
                    : 'bg-primary active:opacity-80'
                }`}
                onPress={handleSend}
                disabled={loading || !shopName.trim()}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text
                    className={`font-bold text-base ${!shopName.trim() ? 'text-gray-400 dark:text-gray-500' : 'text-white'}`}
                  >
                    {t('auth.forgotShopId.send')}
                  </Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <View className="bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl p-5 items-center mb-6">
              <Text className="text-3xl mb-3">✅</Text>
              <Text className="text-base font-bold text-indigo-700 dark:text-indigo-300 text-center mb-1">
                {t('auth.forgotShopId.sentTitle')}
              </Text>
              <Text className="text-sm text-indigo-600 dark:text-indigo-400 text-center leading-5">
                {t('auth.forgotShopId.sentDesc')}
              </Text>
            </View>
          )}

          <View className="mt-6 bg-gray-50 dark:bg-gray-800 rounded-2xl p-4">
            <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              {t('auth.forgotShopId.supportTitle')}
            </Text>
            <TouchableOpacity
              className="flex-row items-center gap-3 py-2"
              onPress={() => Linking.openURL(`tel:${SUPPORT.phone}`)}
            >
              <MaterialCommunityIcons name="phone-outline" size={18} color="#4f46e5" />
              <Text className="text-primary font-medium text-sm">{SUPPORT.phone}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-row items-center gap-3 py-2"
              onPress={() => Linking.openURL(`mailto:${SUPPORT.email}`)}
            >
              <MaterialCommunityIcons name="email-outline" size={18} color="#4f46e5" />
              <Text className="text-primary font-medium text-sm">{SUPPORT.email}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
