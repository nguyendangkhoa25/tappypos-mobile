import { Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNetworkStore } from '../store/networkStore';
import { useTypography } from '../hooks/useTypography';

const CONTENT_H = 42;

export function OfflineBanner() {
  const { t } = useTranslation();
  const typo = useTypography();
  const insets = useSafeAreaInsets();
  const { isMaintenance, isOffline } = useNetworkStore();
  const visible = isMaintenance || isOffline;

  const bannerH = insets.top + CONTENT_H;
  const translateY = useSharedValue(-bannerH);

  useEffect(() => {
    translateY.value = withTiming(visible ? 0 : -bannerH, {
      duration: 280,
      easing: Easing.out(Easing.cubic),
    });
  }, [visible, bannerH]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const bg = isOffline ? '#6b7280' : '#f59e0b';
  const label = isOffline ? `📴 ${t('common.offline')}` : `⚙️ ${t('common.maintenance')}`;

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 999,
          backgroundColor: bg,
          paddingTop: insets.top + 6,
          paddingBottom: 8,
          alignItems: 'center',
        },
        animStyle,
      ]}
      pointerEvents="none"
    >
      <Text className={`${typo.caption} font-semibold text-white`}>{label}</Text>
    </Animated.View>
  );
}
