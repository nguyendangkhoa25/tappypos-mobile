import { Modal, View, Text, TouchableOpacity, Pressable } from 'react-native';
import { useAlertStore } from '../store/alertStore';

export function FriendlyAlert() {
  const { visible, title, message, buttons, hide } = useAlertStore();

  if (!visible) return null;

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={hide}>
      <Pressable
        className="flex-1 bg-black/40 items-center justify-center px-8"
        onPress={hide}
      >
        <Pressable
          className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm overflow-hidden"
          onPress={(e) => e.stopPropagation()}
        >
          <View className="px-6 pt-6 pb-4">
            <Text className="text-lg font-bold text-gray-900 dark:text-gray-100 text-center mb-2">
              {title}
            </Text>
            <Text className="text-sm text-gray-600 dark:text-gray-300 text-center leading-5">
              {message}
            </Text>
          </View>

          <View className="border-t border-gray-100 dark:border-gray-700 flex-row">
            {buttons.map((btn, i) => (
              <TouchableOpacity
                key={i}
                className={`flex-1 py-4 items-center ${
                  i > 0 ? 'border-l border-gray-100 dark:border-gray-700' : ''
                }`}
                onPress={() => {
                  hide();
                  btn.onPress?.();
                }}
              >
                <Text
                  className={`text-base font-semibold ${
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
    </Modal>
  );
}
