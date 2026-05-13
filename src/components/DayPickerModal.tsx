import { View, Text, TouchableOpacity, Modal } from 'react-native';

const PICKER_DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

type Props = {
  visible: boolean;
  selected: string;
  onSelect: (day: string) => void;
  onClose: () => void;
  title: string;
  subtitle?: string;
  clearLabel?: string;
};

export function DayPickerModal({ visible, selected, onSelect, onClose, title, subtitle, clearLabel }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end">
        <TouchableOpacity className="flex-1" activeOpacity={1} onPress={onClose} />
        <View className="bg-white dark:bg-gray-900 rounded-t-3xl px-5 pt-5 pb-10">
          <Text className="text-base font-bold text-gray-900 dark:text-gray-100 mb-1">{title}</Text>
          {subtitle ? (
            <Text className="text-sm text-gray-500 dark:text-gray-400 mb-4">{subtitle}</Text>
          ) : (
            <View className="mb-4" />
          )}
          <View className="flex-row flex-wrap" style={{ gap: 8 }}>
            {PICKER_DAYS.map((day) => {
              const isSelected = selected === String(day);
              return (
                <TouchableOpacity
                  key={day}
                  onPress={() => { onSelect(String(day)); onClose(); }}
                  className={`w-11 h-11 rounded-xl items-center justify-center ${
                    isSelected ? 'bg-indigo-600' : 'bg-gray-100 dark:bg-gray-700'
                  }`}
                >
                  <Text className={`text-sm font-semibold ${isSelected ? 'text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                    {day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {clearLabel && !!selected && (
            <TouchableOpacity
              onPress={() => { onSelect(''); onClose(); }}
              className="mt-4 items-center py-2"
            >
              <Text className="text-red-500 text-sm font-medium">{clearLabel}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}
