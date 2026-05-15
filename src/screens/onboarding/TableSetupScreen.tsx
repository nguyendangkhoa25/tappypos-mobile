import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useOnboardingStore, type TableSetup } from '../../store/onboardingStore';
import { OnboardingHeader } from './OnboardingHeader';
import type { OnboardingScreenProps } from '../../types/navigation';

export function TableSetupScreen({ navigation }: OnboardingScreenProps<'TableSetup'>) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { tables, setTables, addTable, removeTable, shopTypeCode } = useOnboardingStore();

  const [autoCount, setAutoCount] = useState('');
  const [manualNumber, setManualNumber] = useState('');
  const [manualCapacity, setManualCapacity] = useState('4');
  const [manualLocation, setManualLocation] = useState('');

  // F&B shops with TABLE_SERVICE = 5-step onboarding
  const isFnb = true;
  const totalSteps = isFnb ? 5 : 4;

  const handleAutoGenerate = () => {
    const count = parseInt(autoCount, 10);
    if (!count || count <= 0 || count > 50) return;
    const generated: TableSetup[] = Array.from({ length: count }, (_, i) => ({
      tableNumber: `Bàn ${i + 1}`,
      capacity: 4,
    }));
    setTables(generated);
    setAutoCount('');
  };

  const handleAddManual = () => {
    const num = manualNumber.trim();
    if (!num) return;
    addTable({
      tableNumber: num,
      capacity: parseInt(manualCapacity, 10) || 4,
      location: manualLocation.trim() || undefined,
    });
    setManualNumber('');
    setManualCapacity('4');
    setManualLocation('');
  };

  const handleContinue = () => {
    navigation.navigate('Step3');
  };

  const handleSkip = () => {
    setTables([]);
    navigation.navigate('Step3');
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white dark:bg-gray-900"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View className="px-6" style={{ paddingTop: insets.top + 8 }}>
        <OnboardingHeader step={2} total={totalSteps} onBack={() => navigation.goBack()} />
        <Text className="text-2xl font-bold text-gray-900 dark:text-white mt-4 mb-1">
          {t('onboarding.tableSetup.title')}
        </Text>
        <View className="mb-4 gap-1.5 mt-1">
          {(
            [
              { icon: 'table-chair', key: 'onboarding.tableSetup.hint1' },
              { icon: 'pencil-outline', key: 'onboarding.tableSetup.hint2' },
              { icon: 'skip-next-outline', key: 'onboarding.tableSetup.hint3' },
            ] as const
          ).map(({ icon, key }) => (
            <View key={key} className="flex-row items-center gap-2">
              <MaterialCommunityIcons name={icon} size={13} color="#9ca3af" />
              <Text className="text-xs text-gray-400 dark:text-gray-500 flex-1 leading-4">
                {t(key)}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <ScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="px-6 pb-6 gap-5">
          {/* Auto-generate section */}
          <View className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4">
            <Text className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
              {t('onboarding.tableSetup.autoGenLabel')}
            </Text>
            <View className="flex-row gap-2 items-center">
              <View className="flex-1">
                <TextInput
                  value={autoCount}
                  onChangeText={setAutoCount}
                  placeholder={t('onboarding.tableSetup.autoGenCount')}
                  keyboardType="numeric"
                  className="border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-3 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholderTextColor="#9ca3af"
                />
              </View>
              <TouchableOpacity
                onPress={handleAutoGenerate}
                disabled={!autoCount.trim()}
                className={`rounded-xl px-4 py-3 ${autoCount.trim() ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'}`}
              >
                <Text className={`font-semibold text-sm ${autoCount.trim() ? 'text-white' : 'text-gray-400'}`}>
                  {t('onboarding.tableSetup.generateBtn')}
                </Text>
              </TouchableOpacity>
            </View>
            <Text className="text-xs text-gray-400 dark:text-gray-500 mt-2">
              {t('onboarding.tableSetup.autoGenHint')}
            </Text>
          </View>

          {/* Current table list */}
          {tables.length > 0 && (
            <View>
              <Text className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">
                {t('onboarding.tableSetup.tableCount', { count: tables.length })}
              </Text>
              <View className="bg-gray-50 dark:bg-gray-800 rounded-2xl overflow-hidden">
                {tables.map((table, index) => (
                  <View
                    key={index}
                    className={`flex-row items-center px-4 py-3 ${
                      index < tables.length - 1 ? 'border-b border-gray-100 dark:border-gray-700' : ''
                    }`}
                  >
                    <MaterialCommunityIcons name="table-chair" size={16} color="#6b7280" />
                    <Text className="flex-1 text-sm font-medium text-gray-700 dark:text-gray-200 ml-2">
                      {table.tableNumber}
                    </Text>
                    <Text className="text-xs text-gray-400 dark:text-gray-500 mr-3">
                      {t('onboarding.tableSetup.capacityHint', { count: table.capacity })}
                    </Text>
                    {table.location ? (
                      <Text className="text-xs text-gray-400 dark:text-gray-500 mr-2">{table.location}</Text>
                    ) : null}
                    <TouchableOpacity
                      onPress={() => removeTable(index)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <MaterialCommunityIcons name="close" size={16} color="#9ca3af" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Manual add section */}
          <View>
            <Text className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">
              {t('onboarding.tableSetup.manualLabel')}
            </Text>
            <View className="gap-3">
              <TextInput
                value={manualNumber}
                onChangeText={setManualNumber}
                placeholder={t('onboarding.tableSetup.tableNumberPlaceholder')}
                className="border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-3 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholderTextColor="#9ca3af"
                autoCapitalize="words"
              />
              <View className="flex-row gap-2">
                <View className="flex-1">
                  <Text className="text-xs text-gray-400 dark:text-gray-500 mb-1">
                    {t('onboarding.tableSetup.capacityLabel')}
                  </Text>
                  <TextInput
                    value={manualCapacity}
                    onChangeText={setManualCapacity}
                    keyboardType="numeric"
                    className="border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-3 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholderTextColor="#9ca3af"
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-xs text-gray-400 dark:text-gray-500 mb-1">
                    {t('onboarding.tableSetup.locationLabel')}
                  </Text>
                  <TextInput
                    value={manualLocation}
                    onChangeText={setManualLocation}
                    placeholder={t('onboarding.tableSetup.locationPlaceholder')}
                    className="border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-3 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholderTextColor="#9ca3af"
                  />
                </View>
              </View>
              <TouchableOpacity
                onPress={handleAddManual}
                disabled={!manualNumber.trim()}
                className={`rounded-xl py-3 items-center ${manualNumber.trim() ? 'bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700' : 'bg-gray-100 dark:bg-gray-800'}`}
              >
                <Text className={`text-sm font-semibold ${manualNumber.trim() ? 'text-primary' : 'text-gray-400'}`}>
                  + {t('onboarding.tableSetup.addTableBtn')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      <View
        className="bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-700 px-6 pt-3"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        <View className="flex-row gap-3 items-center">
          <TouchableOpacity
            onPress={handleSkip}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            className="px-2 py-3.5"
          >
            <Text className="font-semibold text-sm text-gray-400 dark:text-gray-500">
              {t('onboarding.common.skip')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 bg-primary active:opacity-80 rounded-2xl py-3.5 flex-row items-center justify-center gap-2"
            onPress={handleContinue}
          >
            <Text className="text-white font-bold text-base">
              {t('onboarding.common.continue')}
            </Text>
            {tables.length > 0 && (
              <View className="bg-white/25 rounded-full px-2 py-0.5">
                <Text className="text-white text-xs font-bold">{tables.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
