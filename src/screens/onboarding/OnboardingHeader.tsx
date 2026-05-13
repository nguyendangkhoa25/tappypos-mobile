import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type Props = {
  step: number;
  total: number;
  onBack?: () => void;
};

export function OnboardingHeader({ step, total, onBack }: Props) {
  return (
    <View className="flex-row items-center gap-3">
      {onBack ? (
        <TouchableOpacity
          onPress={onBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          className="p-1"
        >
          <MaterialCommunityIcons name="arrow-left" size={22} color="#6b7280" />
        </TouchableOpacity>
      ) : (
        <View style={{ width: 32 }} />
      )}

      <View className="flex-row gap-1.5 flex-1">
        {Array.from({ length: total }).map((_, i) => (
          <View
            key={i}
            className={`h-1 flex-1 rounded-full ${
              i <= step ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'
            }`}
          />
        ))}
      </View>

      <Text className="text-xs text-gray-400 dark:text-gray-500 font-medium w-8 text-right">
        {step + 1} / {total}
      </Text>
    </View>
  );
}
