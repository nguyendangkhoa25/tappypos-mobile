import { forwardRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, type TextInputProps } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTypography } from '../hooks/useTypography';

type Rule = { label: string; test: (v: string) => boolean };

const RULES: Rule[] = [
  { label: 'Ít nhất 8 ký tự', test: (v) => v.length >= 8 },
  { label: 'Chữ hoa (A–Z)', test: (v) => /[A-Z]/.test(v) },
  { label: 'Chữ thường (a–z)', test: (v) => /[a-z]/.test(v) },
  { label: 'Chữ số (0–9)', test: (v) => /\d/.test(v) },
  { label: 'Ký tự đặc biệt (!@#…)', test: (v) => /[^A-Za-z0-9]/.test(v) },
];

function getStrength(v: string): 0 | 1 | 2 | 3 | 4 {
  const passed = RULES.filter((r) => r.test(v)).length;
  if (passed <= 1) return 1;
  if (passed === 2) return 2;
  if (passed === 3) return 3;
  return 4;
}

const STRENGTH_LABELS = ['', 'Yếu', 'Trung bình', 'Khá', 'Mạnh'];
const STRENGTH_COLORS = ['', '#ef4444', '#f59e0b', '#3b82f6', '#059669'];

type Props = Omit<TextInputProps, 'value' | 'secureTextEntry'> & {
  value: string;
  showRules?: boolean;
  showStrength?: boolean;
};

export const PasswordInput = forwardRef<TextInput, Props>(
  ({ value, showRules = false, showStrength = true, ...rest }, ref) => {
    const [show, setShow] = useState(false);
    const typo = useTypography();
    const strength = value.length > 0 ? getStrength(value) : 0;

    return (
      <View>
        <View className="flex-row items-center bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4">
          <TextInput
            ref={ref}
            value={value}
            secureTextEntry={!show}
            className={`flex-1 py-4 ${typo.inputSize} text-gray-900 dark:text-gray-100`}
            placeholderTextColor="#9ca3af"
            {...rest}
          />
          <TouchableOpacity onPress={() => setShow((v) => !v)} className="p-1">
            <MaterialCommunityIcons
              name={show ? 'eye-off-outline' : 'eye-outline'}
              size={22}
              color="#9ca3af"
            />
          </TouchableOpacity>
        </View>

        {showStrength && value.length > 0 && (
          <View className="mt-2">
            <View className="flex-row gap-1 mb-1">
              {[1, 2, 3, 4].map((n) => (
                <View
                  key={n}
                  className="flex-1 h-1 rounded-full"
                  style={{ backgroundColor: n <= strength ? STRENGTH_COLORS[strength] : '#e5e7eb' }}
                />
              ))}
            </View>
            <Text className={typo.caption} style={{ color: STRENGTH_COLORS[strength] }}>
              {STRENGTH_LABELS[strength]}
            </Text>
          </View>
        )}

        {showRules && (
          <View className="mt-3 gap-1">
            {RULES.map((rule) => {
              const passed = rule.test(value);
              return (
                <View key={rule.label} className="flex-row items-center gap-2">
                  <MaterialCommunityIcons
                    name={passed ? 'check-circle' : 'circle-outline'}
                    size={14}
                    color={passed ? '#059669' : '#9ca3af'}
                  />
                  <Text className={`${typo.caption} ${passed ? 'text-primary' : 'text-gray-400'}`}>
                    {rule.label}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </View>
    );
  },
);

PasswordInput.displayName = 'PasswordInput';
