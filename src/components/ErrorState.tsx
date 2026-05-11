import { View, Text, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';

type Props = {
  onRetry?: () => void;
  message?: string;
};

export function ErrorState({ onRetry, message }: Props) {
  const { t } = useTranslation();
  return (
    <View className="flex-1 items-center justify-center px-8 py-16">
      <Text className="text-4xl mb-4">😕</Text>
      <Text className="text-base font-semibold text-gray-800 mb-1 text-center">
        {t('common.errorStateTitle')}
      </Text>
      <Text className="text-sm text-gray-500 text-center mb-6">
        {message ?? t('common.errorStateMsg')}
      </Text>
      {onRetry && (
        <TouchableOpacity
          onPress={onRetry}
          className="bg-primary rounded-xl px-8 py-3 active:opacity-80"
        >
          <Text className="text-white font-semibold text-base">{t('common.retry')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
