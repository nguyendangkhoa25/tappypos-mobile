import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNotificationBadge } from '../hooks/useNotificationBadge';

type Props = {
  onPress: () => void;
  color?: string;
};

export function NotificationBell({ onPress, color = '#374151' }: Props) {
  const unreadCount = useNotificationBadge();

  return (
    <TouchableOpacity onPress={onPress} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
      <Ionicons name="notifications-outline" size={22} color={color} />
      {unreadCount > 0 && (
        <View
          className="absolute -top-1 -right-1 bg-red-500 rounded-full items-center justify-center"
          style={{ minWidth: 16, height: 16, paddingHorizontal: 3 }}
        >
          <Text className="text-white font-bold" style={{ fontSize: 9, lineHeight: 12 }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}
