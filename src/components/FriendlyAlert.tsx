import { View, Text, TouchableOpacity, Pressable, StyleSheet } from 'react-native';
import { useAlertStore } from '../store/alertStore';
import { useTypography } from '../hooks/useTypography';

export function FriendlyAlert() {
  const { visible, title, message, buttons, hide } = useAlertStore();
  const typo = useTypography();

  if (!visible) return null;

  // Absolute overlay instead of Modal so Maestro's accessibility traversal can reach buttons.
  // zIndex: 9999 ensures it renders above the navigation stack from the root navigator.
  return (
    <Pressable
      style={[StyleSheet.absoluteFill, { zIndex: 9999 }]}
      className="bg-black/40 items-center justify-center px-8"
      onPress={hide}
    >
      <Pressable
        testID="alert-dialog"
        className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm overflow-hidden"
        onPress={(e) => e.stopPropagation()}
      >
        <View className="px-6 pt-6 pb-4">
          <Text className={`${typo.section} text-gray-900 dark:text-gray-100 text-center mb-2`}>
            {title}
          </Text>
          <Text className={`${typo.caption} text-gray-600 dark:text-gray-300 text-center leading-5`}>
            {message}
          </Text>
        </View>

        <View className="border-t border-gray-100 dark:border-gray-700 flex-row">
          {buttons.map((btn, i) => (
            <TouchableOpacity
              key={i}
              testID={btn.style === 'cancel' ? 'alert-btn-cancel' : `alert-btn-${i}`}
              className={`flex-1 py-4 items-center ${
                i > 0 ? 'border-l border-gray-100 dark:border-gray-700' : ''
              }`}
              onPress={() => {
                hide();
                btn.onPress?.();
              }}
            >
              <Text
                className={`${typo.body} ${
                  btn.style === 'destructive'
                    ? 'text-red-500'
                    : btn.style === 'cancel'
                      ? 'text-gray-500'
                      : 'text-primary'
                }`}
              >
                {btn.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Pressable>
    </Pressable>
  );
}
