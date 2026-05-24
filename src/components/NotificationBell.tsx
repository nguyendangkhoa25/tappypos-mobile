import { View, Text, TouchableOpacity, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNotificationBadge } from '../hooks/useNotificationBadge';
import { useTypography } from '../hooks/useTypography';

type Props = {
  onPress: () => void;
  color?: string;
};

export function NotificationBell({ onPress, color }: Props) {
  const scheme = useColorScheme();
  const typo = useTypography();
  const resolvedColor = color ?? (scheme === 'dark' ? '#e5e7eb' : '#374151');
  const unreadCount = useNotificationBadge();
  // Badge font scales proportionally with the font-size preference (displaySize / 4 ≈ 9 at normal)
  const badgeFontSize = Math.round(typo.displaySize / 4);
  const badgeLineHeight = Math.round(typo.displaySize / 3);

  return (
    <TouchableOpacity onPress={onPress} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
      <Ionicons name="notifications-outline" size={22} color={resolvedColor} />
      {unreadCount > 0 && (
        <View
          className="absolute -top-1 -right-1 bg-red-500 rounded-full items-center justify-center"
          style={{ minWidth: 16, height: 16, paddingHorizontal: 3 }}
        >
          <Text className="text-white font-bold" style={{ fontSize: badgeFontSize, lineHeight: badgeLineHeight }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}
