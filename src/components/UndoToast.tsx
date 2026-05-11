import { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToastStore } from '../store/toastStore';

const DURATION = 5000;

export function UndoToast() {
  const { visible, message, onUndo, hide } = useToastStore();
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      timer.current = setTimeout(hide, DURATION);
    } else {
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start();
      if (timer.current) clearTimeout(timer.current);
    }
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View
      style={{ opacity, bottom: insets.bottom + 80 }}
      className="absolute left-4 right-4 bg-gray-900 dark:bg-gray-100 rounded-2xl px-4 py-3 flex-row items-center justify-between shadow-lg"
    >
      <Text className="text-white dark:text-gray-900 text-sm font-medium flex-1 mr-3">
        {message}
      </Text>
      {onUndo && (
        <TouchableOpacity
          onPress={() => {
            hide();
            onUndo();
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text className="text-primary font-bold text-sm">Hoàn tác</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}
