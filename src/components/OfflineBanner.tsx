import { Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffect } from 'react';
import { useNetworkStore } from '../store/networkStore';

const CONTENT_H = 42; // paddingBottom(8) + text(~20) + gap(14)

export function OfflineBanner() {
  const insets = useSafeAreaInsets();
  const { isMaintenance } = useNetworkStore();

  // Full banner height = notch padding + content. Must hide by this much.
  const bannerH = insets.top + CONTENT_H;
  const translateY = useSharedValue(-bannerH);

  useEffect(() => {
    translateY.value = withTiming(isMaintenance ? 0 : -bannerH, {
      duration: 280,
      easing: Easing.out(Easing.cubic),
    });
  }, [isMaintenance, bannerH]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 999,
          backgroundColor: '#f59e0b',
          paddingTop: insets.top + 6,
          paddingBottom: 8,
          alignItems: 'center',
        },
        animStyle,
      ]}
      pointerEvents="none"
    >
      <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>
        ⚙️ Hệ thống đang bảo trì. Thử lại sau.
      </Text>
    </Animated.View>
  );
}
