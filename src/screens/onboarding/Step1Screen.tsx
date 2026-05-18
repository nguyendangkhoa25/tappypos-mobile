import { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ClearableInput } from '../../components/ClearableInput';
import { useOnboardingStore } from '../../store/onboardingStore';
import { OnboardingHeader } from './OnboardingHeader';
import { useOnboardingFlow } from '../../hooks/useOnboardingFlow';
import { useTypography } from '../../hooks/useTypography';
import type { OnboardingScreenProps } from '../../types/navigation';

export function Step1Screen({ navigation }: OnboardingScreenProps<'Step1'>) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const typo = useTypography();
  const { step1, setStep1, completeStep } = useOnboardingStore();
  const { totalSteps, getStepIndex, getNextScreen } = useOnboardingFlow();

  const [nickname, setNickname] = useState(step1.nickname);
  const [fullName, setFullName] = useState(step1.fullName);
  const [shopName, setShopName] = useState(step1.shopName);
  const [address, setAddress] = useState(step1.address);
  const [errors, setErrors] = useState<{ nickname?: string; shopName?: string }>({});

  const fullNameRef = useRef<TextInput>(null);
  const shopNameRef = useRef<TextInput>(null);
  const addressRef = useRef<TextInput>(null);

  const validate = () => {
    const e: typeof errors = {};
    if (!nickname.trim()) e.nickname = t('onboarding.step1.nicknameRequired');
    if (!shopName.trim()) e.shopName = t('onboarding.step1.shopNameRequired');
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleContinue = () => {
    if (!validate()) return;
    setStep1({ nickname: nickname.trim(), fullName: fullName.trim(), shopName: shopName.trim(), address: address.trim() });
    completeStep(1);
    navigation.navigate(getNextScreen('SHOP_INFO') as any);
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white dark:bg-gray-900"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top, paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="px-6 pt-8">
          <OnboardingHeader step={getStepIndex('SHOP_INFO')} total={totalSteps} onBack={() => navigation.goBack()} />

          <Text className={`${typo.heading} text-gray-900 dark:text-white mt-6 mb-1`}>
            {t('onboarding.step1.title')}
          </Text>
          <View className="mb-6 gap-1.5 mt-1">
            {(
              [
                { icon: 'account-outline',    key: 'onboarding.step1.hint1' },
                { icon: 'store-outline',      key: 'onboarding.step1.hint2' },
                { icon: 'map-marker-outline', key: 'onboarding.step1.hint3' },
              ] as const
            ).map(({ icon, key }) => (
              <View key={key} className="flex-row items-center gap-2">
                <MaterialCommunityIcons name={icon} size={13} color="#9ca3af" />
                <Text className={`${typo.caption} text-gray-400 dark:text-gray-500 flex-1 leading-4`}>
                  {t(key)}
                </Text>
              </View>
            ))}
          </View>

          <View className="mb-4">
            <Text className={`${typo.label} text-gray-700 dark:text-gray-300 mb-2`}>
              {t('onboarding.step1.nicknameLabel')}
            </Text>
            <ClearableInput
              value={nickname}
              onChangeText={(v) => { setNickname(v); setErrors((e) => ({ ...e, nickname: undefined })); }}
              onClear={() => setNickname('')}
              placeholder={t('onboarding.step1.nicknamePlaceholder')}
              autoCapitalize="words"
              returnKeyType="next"
              maxLength={20}
              onSubmitEditing={() => fullNameRef.current?.focus()}
            />
            {errors.nickname && (
              <Text className={`${typo.caption} text-red-500 mt-1`}>{errors.nickname}</Text>
            )}
            <Text className={`${typo.caption} text-gray-400 dark:text-gray-500 mt-1`}>
              {t('onboarding.step1.nicknameHint', { name: nickname || 'Bạn' })}
            </Text>
          </View>

          <View className="mb-4">
            <Text className={`${typo.label} text-gray-700 dark:text-gray-300 mb-2`}>
              {t('onboarding.step1.fullNameLabel')}
            </Text>
            <ClearableInput
              ref={fullNameRef}
              value={fullName}
              onChangeText={setFullName}
              onClear={() => setFullName('')}
              placeholder={t('onboarding.step1.fullNamePlaceholder')}
              autoCapitalize="words"
              returnKeyType="next"
              onSubmitEditing={() => shopNameRef.current?.focus()}
            />
          </View>

          <View className="mb-4">
            <Text className={`${typo.label} text-gray-700 dark:text-gray-300 mb-2`}>
              {t('onboarding.step1.shopNameLabel')}
            </Text>
            <ClearableInput
              ref={shopNameRef}
              value={shopName}
              onChangeText={(v) => { setShopName(v); setErrors((e) => ({ ...e, shopName: undefined })); }}
              onClear={() => setShopName('')}
              placeholder={t('onboarding.step1.shopNamePlaceholder')}
              autoCapitalize="words"
              returnKeyType="next"
              onSubmitEditing={() => addressRef.current?.focus()}
            />
            {errors.shopName && (
              <Text className={`${typo.caption} text-red-500 mt-1`}>{errors.shopName}</Text>
            )}
          </View>

          <View className="mb-4">
            <Text className={`${typo.label} text-gray-700 dark:text-gray-300 mb-2`}>
              {t('onboarding.step1.addressLabel')}
            </Text>
            <ClearableInput
              ref={addressRef}
              value={address}
              onChangeText={setAddress}
              onClear={() => setAddress('')}
              placeholder={t('onboarding.step1.addressPlaceholder')}
              autoCapitalize="sentences"
              returnKeyType="done"
              onSubmitEditing={handleContinue}
            />
          </View>
        </View>
      </ScrollView>

      <View
        className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-900 px-6 pt-4 border-t border-gray-100 dark:border-gray-700"
        style={{ paddingBottom: insets.bottom + 16 }}
      >
        <TouchableOpacity
          className={`rounded-2xl py-4 items-center justify-center ${
            nickname.trim() && shopName.trim() ? 'bg-primary active:opacity-80' : 'bg-gray-200 dark:bg-gray-700'
          }`}
          onPress={handleContinue}
          disabled={!nickname.trim() || !shopName.trim()}
        >
          <Text
            className={`${typo.labelBold} ${nickname.trim() && shopName.trim() ? 'text-white' : 'text-gray-400 dark:text-gray-500'}`}
          >
            {t('onboarding.common.continue')}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
