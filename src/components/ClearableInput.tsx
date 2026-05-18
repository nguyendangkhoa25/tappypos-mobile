import { forwardRef } from 'react';
import { View, TextInput, TouchableOpacity, type TextInputProps } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTypography } from '../hooks/useTypography';

type Props = Omit<TextInputProps, 'value'> & {
  value: string;
  onClear?: () => void;
};

export const ClearableInput = forwardRef<TextInput, Props>(
  ({ value, onClear, style, ...rest }, ref) => {
    const typo = useTypography();
    return (
      <View className="flex-row items-center bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4">
        <TextInput
          ref={ref}
          value={value}
          className={`flex-1 py-4 ${typo.inputSize} text-gray-900 dark:text-gray-100`}
          placeholderTextColor="#9ca3af"
          {...rest}
        />
        {value.length > 0 && (
          <TouchableOpacity
            onPress={onClear ?? (() => {})}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialCommunityIcons name="close-circle" size={18} color="#9ca3af" />
          </TouchableOpacity>
        )}
      </View>
    );
  },
);

ClearableInput.displayName = 'ClearableInput';
