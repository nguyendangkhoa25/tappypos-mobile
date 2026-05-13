import { forwardRef } from 'react';
import type { TextInput } from 'react-native';
import { ClearableInput } from './ClearableInput';
import type { TextInputProps } from 'react-native';

type Props = Omit<TextInputProps, 'value' | 'keyboardType'> & {
  value: string;
  onChangeRaw: (raw: string) => void;
  onClear?: () => void;
};

function formatPhone(digits: string): string {
  if (digits.length <= 4) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
  return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
}

export function stripPhone(value: string): string {
  return value.replace(/\D/g, '').slice(0, 10);
}

export const PhoneInput = forwardRef<TextInput, Props>(
  ({ value, onChangeRaw, onClear, ...rest }, ref) => {
    const raw = stripPhone(value);

    const handleChange = (text: string) => {
      onChangeRaw(stripPhone(text));
    };

    return (
      <ClearableInput
        ref={ref}
        value={formatPhone(raw)}
        onChangeText={handleChange}
        onClear={() => { onChangeRaw(''); onClear?.(); }}
        keyboardType="phone-pad"
        {...rest}
      />
    );
  },
);

PhoneInput.displayName = 'PhoneInput';
