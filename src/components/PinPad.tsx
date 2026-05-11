import { useRef } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type Props = {
  value: string;
  onChange: (v: string) => void;
  maxLength?: number;
  loading?: boolean;
  onBiometric?: () => void;
  shake?: boolean;
};

const ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['bio', '0', 'del'],
];

export function PinPad({ value, onChange, maxLength = 6, loading = false, onBiometric }: Props) {
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handleKey = (key: string) => {
    if (loading) return;
    if (key === 'del') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onChange(value.slice(0, -1));
    } else if (key === 'bio') {
      onBiometric?.();
    } else if (value.length < maxLength) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onChange(value + key);
    }
  };

  // Expose shake for parent via callback prop pattern — parent calls via ref
  (PinPad as { shake?: () => void }).shake = triggerShake;

  return (
    <View className="items-center w-full">
      <Animated.View
        style={{ transform: [{ translateX: shakeAnim }] }}
        className="flex-row mb-10"
      >
        {Array.from({ length: maxLength }).map((_, i) => (
          <View
            key={i}
            className={`w-5 h-5 rounded-full mx-3 ${
              i < value.length ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
            }`}
          />
        ))}
      </Animated.View>

      {loading ? (
        <ActivityIndicator size="large" color="#4f46e5" />
      ) : (
        <View className="w-72">
          {ROWS.map((row, rowIdx) => (
            <View key={rowIdx} className="flex-row justify-between mb-3">
              {row.map((key) => {
                if (key === 'bio' && !onBiometric) {
                  return <View key={key} className="w-20 h-16" />;
                }
                const isAction = key === 'del' || key === 'bio';
                return (
                  <TouchableOpacity
                    key={key}
                    className={`w-20 h-16 rounded-2xl items-center justify-center ${
                      isAction ? '' : 'bg-gray-100 dark:bg-gray-700 active:opacity-70'
                    }`}
                    onPress={() => handleKey(key)}
                    activeOpacity={0.7}
                  >
                    {key === 'del' ? (
                      <MaterialCommunityIcons name="backspace-outline" size={28} color="#6b7280" />
                    ) : key === 'bio' ? (
                      <MaterialCommunityIcons name="fingerprint" size={28} color="#6b7280" />
                    ) : (
                      <Text className="text-3xl font-medium text-gray-800 dark:text-gray-100">
                        {key}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
