import { View, Text, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTypography } from '../hooks/useTypography';

type Props = {
  onRetry?: () => void;
  message?: string;
};

export function ErrorState({ onRetry, message }: Props) {
  const { t } = useTranslation();
  const typo = useTypography();
  return (
    <View className="flex-1 items-center justify-center px-8 py-16">
      <Text className="text-4xl mb-4">😕</Text>
      <Text className={`${typo.body} text-gray-800 mb-1 text-center`}>
        {t('common.errorStateTitle')}
      </Text>
      <Text className={`${typo.caption} text-gray-500 text-center mb-6`}>
        {message ?? t('common.errorStateMsg')}
      </Text>
      {onRetry && (
        <TouchableOpacity
          onPress={onRetry}
          className="bg-primary rounded-xl px-8 py-3 active:opacity-80"
        >
          <Text className={`text-white ${typo.body}`}>{t('common.retry')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
