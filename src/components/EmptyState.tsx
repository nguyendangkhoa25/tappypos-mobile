import { View, Text, TouchableOpacity } from 'react-native';
import { useTypography } from '../hooks/useTypography';

type Props = {
  icon?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ icon = '📭', title, description, actionLabel, onAction }: Props) {
  const typo = useTypography();
  return (
    <View className="flex-1 items-center justify-center px-8 py-16">
      <Text className="text-5xl mb-4">{icon}</Text>
      <Text className={`${typo.body} text-gray-700 text-center mb-2`}>{title}</Text>
      {description && (
        <Text className={`${typo.caption} text-gray-400 text-center mb-6`}>{description}</Text>
      )}
      {actionLabel && onAction && (
        <TouchableOpacity
          onPress={onAction}
          className="bg-primary rounded-xl px-8 py-3 active:opacity-80"
        >
          <Text className={`text-white ${typo.body}`}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
