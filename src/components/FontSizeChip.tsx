import { useRef, useState, useEffect, useMemo } from 'react';
import { TouchableOpacity, Text, View, Animated } from 'react-native';
import { useFontSizeStore, type FontScale } from '../store/fontSizeStore';

const SIZES: { key: FontScale; label: string }[] = [
  { key: 'small',  label: 'A' },
  { key: 'normal', label: 'A' },
  { key: 'large',  label: 'A' },
];

const LABEL_SIZE: Record<FontScale, number> = { small: 10, normal: 13, large: 17 };

export function FontSizeChip() {
  const { fontScale, setFontScale } = useFontSizeStore();
  const currentIndex = SIZES.findIndex((s) => s.key === fontScale);
  const slideAnim = useRef(new Animated.Value(currentIndex)).current;
  const [segW, setSegW] = useState(0);

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: currentIndex,
      useNativeDriver: true,
      tension: 280,
      friction: 20,
    }).start();
  }, [currentIndex]);

  const pillX = useMemo(
    () => slideAnim.interpolate({ inputRange: [0, 1, 2], outputRange: [0, segW, segW * 2] }),
    [segW], // eslint-disable-line react-hooks/exhaustive-deps
  );

  return (
    <View className="flex-row bg-gray-100 dark:bg-gray-700 rounded-full p-0.5">
      {segW > 0 && (
        <Animated.View
          className="absolute rounded-full bg-white dark:bg-gray-500"
          style={{
            top: 2,
            bottom: 2,
            left: 2,
            width: segW,
            transform: [{ translateX: pillX }],
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            shadowRadius: 2,
            elevation: 2,
          }}
        />
      )}

      {SIZES.map(({ key }, i) => {
        const active = fontScale === key;
        return (
          <TouchableOpacity
            key={key}
            onPress={() => { if (!active) setFontScale(key); }}
            activeOpacity={active ? 1 : 0.7}
            onLayout={i === 0 ? (e) => setSegW(e.nativeEvent.layout.width) : undefined}
            className="items-center justify-center px-2.5 py-1"
          >
            <Text
              style={{ fontSize: LABEL_SIZE[key], lineHeight: 18 }}
              className={`font-bold ${active ? 'text-gray-800 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'}`}
            >
              A
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
