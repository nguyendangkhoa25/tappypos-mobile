import { forwardRef, type Ref } from 'react';
import { View, Text, TextInput, InputAccessoryView, Platform, type TextInputProps } from 'react-native';
import { useTranslation } from 'react-i18next';
import { formatMoneyDisplay, numberToWords } from '../utils/format';
import { useTypography } from '../hooks/useTypography';

const ACCESSORY_ID = 'money-input-accessory';

type Props = Omit<TextInputProps, 'value' | 'onChangeText' | 'keyboardType'> & {
  rawValue: string;
  onChangeRaw: (digits: string) => void;
};

function MoneyInputInner({ rawValue, onChangeRaw, ...rest }: Props, ref: Ref<TextInput>) {
  const { i18n } = useTranslation();
  const typo = useTypography();
  const displayValue = formatMoneyDisplay(rawValue);
  const words = rawValue ? numberToWords(parseInt(rawValue, 10), i18n.language) : '';

  const handleChange = (text: string) => {
    const digits = text.replace(/[^0-9]/g, '');
    onChangeRaw(digits);
  };

  return (
    <View>
      <View className="flex-row items-center border border-gray-300 rounded-xl overflow-hidden bg-white dark:bg-gray-800">
        <TextInput
          ref={ref}
          {...rest}
          value={displayValue}
          onChangeText={handleChange}
          keyboardType="number-pad"
          inputAccessoryViewID={Platform.OS === 'ios' ? ACCESSORY_ID : undefined}
          className={`flex-1 px-3 py-3 ${typo.inputSize} text-gray-900 dark:text-gray-100`}
          placeholderTextColor="#9ca3af"
        />
        <View className="px-2.5 py-3 bg-gray-50 border-l border-gray-200">
          <Text className={`text-gray-500 ${typo.label}`}>đ</Text>
        </View>
      </View>
      {words ? (
        <Text className={`${typo.caption} text-indigo-600 mt-1 ml-1 italic`}>{words}</Text>
      ) : null}
      {Platform.OS === 'ios' && (
        <InputAccessoryView nativeID={ACCESSORY_ID}>
          <View />
        </InputAccessoryView>
      )}
    </View>
  );
}

export const MoneyInput = forwardRef(MoneyInputInner);
