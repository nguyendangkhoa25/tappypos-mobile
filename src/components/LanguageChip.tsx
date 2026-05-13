import { useRef, useState, useEffect, useMemo } from 'react';
import { TouchableOpacity, Text, View, Animated } from 'react-native';
import { useLanguage } from '../hooks/useLanguage';

const FLAG: Record<string, string> = { vi: '🇻🇳', en: '🇺🇸' };
const LANGS = ['vi', 'en'] as const;

export function LanguageChip() {
  const { language, changeLanguage } = useLanguage();
  const slideAnim = useRef(new Animated.Value(language === 'vi' ? 0 : 1)).current;
  const [segW, setSegW] = useState(0);

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: language === 'vi' ? 0 : 1,
      useNativeDriver: true,
      tension: 280,
      friction: 20,
    }).start();
  }, [language]);

  // re-derived when the measured segment width changes
  const pillX = useMemo(
    () => slideAnim.interpolate({ inputRange: [0, 1], outputRange: [0, segW] }),
    [segW], // eslint-disable-line react-hooks/exhaustive-deps
  );

  return (
    <View className="flex-row bg-gray-100 dark:bg-gray-700 rounded-full p-0.5">
      {/* Sliding pill — hidden until layout gives us real dimensions */}
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

      {LANGS.map((lang, i) => {
        const active = language === lang;
        return (
          <TouchableOpacity
            key={lang}
            onPress={() => { if (!active) changeLanguage(lang); }}
            activeOpacity={active ? 1 : 0.7}
            onLayout={i === 0 ? (e) => setSegW(e.nativeEvent.layout.width) : undefined}
            className="flex-row items-center justify-center gap-1 px-2.5 py-1"
          >
            <Text style={{ fontSize: 13, lineHeight: 16 }}>{FLAG[lang]}</Text>
            <Text
              className={`text-xs font-bold tracking-wide ${
                active ? 'text-gray-800 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'
              }`}
            >
              {lang.toUpperCase()}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
