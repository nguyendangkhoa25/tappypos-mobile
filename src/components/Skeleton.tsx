import { useEffect } from 'react';
import type { DimensionValue, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';

type Props = {
  width?: DimensionValue;
  height: number;
  borderRadius?: number;
  /** 'light' for skeletons on a coloured (e.g. green header) background */
  variant?: 'default' | 'light';
  style?: ViewStyle;
};

export function Skeleton({ width = '100%', height, borderRadius = 8, variant = 'default', style }: Props) {
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.4, { duration: 750, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    return () => cancelAnimation(opacity);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const bgColor = variant === 'light' ? 'rgba(255,255,255,0.28)' : '#e5e7eb';

  return (
    <Animated.View
      style={[{ width, height, borderRadius, backgroundColor: bgColor }, animatedStyle, style]}
    />
  );
}
