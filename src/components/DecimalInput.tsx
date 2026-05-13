import { forwardRef, type Ref } from 'react';
import { View, Text, TextInput, type TextInputProps } from 'react-native';

type Props = Omit<TextInputProps, 'value' | 'onChangeText' | 'keyboardType'> & {
  value: string;
  onChangeText: (v: string) => void;
  suffix?: string;
  decimalPlaces?: number; // digits to pad on blur, default 2
};

function DecimalInputInner(
  { value, onChangeText, suffix, decimalPlaces = 2, onBlur, ...rest }: Props,
  ref: Ref<TextInput>,
) {
  const handleChange = (text: string) => {
    // Allow digits and at most one decimal point
    const cleaned = text.replace(/[^0-9.]/g, '').replace(/^(\d*\.?\d*).*$/, '$1');
    onChangeText(cleaned);
  };

  const handleBlur = (e: Parameters<NonNullable<TextInputProps['onBlur']>>[0]) => {
    const num = parseFloat(value);
    if (!isNaN(num)) {
      onChangeText(num.toFixed(decimalPlaces));
    }
    onBlur?.(e);
  };

  return (
    <View className="flex-row items-center border border-gray-300 rounded-xl overflow-hidden bg-white">
      <TextInput
        ref={ref}
        {...rest}
        value={value}
        onChangeText={handleChange}
        onBlur={handleBlur}
        keyboardType="decimal-pad"
        className="flex-1 px-3 py-3 text-base text-gray-900"
        placeholderTextColor="#9ca3af"
      />
      {suffix ? (
        <View className="px-2.5 py-3 bg-gray-50 border-l border-gray-200">
          <Text className="text-gray-500 text-sm font-semibold">{suffix}</Text>
        </View>
      ) : null}
    </View>
  );
}

export const DecimalInput = forwardRef(DecimalInputInner);
