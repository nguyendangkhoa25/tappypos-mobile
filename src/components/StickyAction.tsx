import { View, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type Props = {
  label: string;
  onPress: () => void;
  icon?: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  disabled?: boolean;
  loading?: boolean;
};

export function StickyAction({ label, onPress, icon, disabled = false, loading = false }: Props) {
  const { bottom } = useSafeAreaInsets();

  return (
    <View
      className="px-4 pt-3 bg-white border-t border-gray-100"
      style={{ paddingBottom: bottom + 12 }}
    >
      <TouchableOpacity
        className={`rounded-2xl py-3.5 flex-row items-center justify-center ${
          disabled || loading ? 'bg-gray-300' : 'bg-primary active:opacity-80'
        }`}
        style={{ gap: 8 }}
        onPress={onPress}
        disabled={disabled || loading}
      >
        {icon && !loading && (
          <MaterialCommunityIcons name={icon} size={20} color="#fff" />
        )}
        <Text className="text-white font-bold text-base">
          {loading ? '...' : label}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
