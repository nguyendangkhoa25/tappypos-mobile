import { forwardRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, type TextInputProps } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTypography } from '../hooks/useTypography';

type Rule = { labelKey: string; test: (v: string) => boolean };

const RULES: Rule[] = [
  { labelKey: 'auth.password.rules.minLength', test: (v) => v.length >= 8 },
  { labelKey: 'auth.password.rules.uppercase',  test: (v) => /[A-Z]/.test(v) },
  { labelKey: 'auth.password.rules.lowercase',  test: (v) => /[a-z]/.test(v) },
  { labelKey: 'auth.password.rules.digit',      test: (v) => /\d/.test(v) },
  { labelKey: 'auth.password.rules.special',    test: (v) => /[^A-Za-z0-9]/.test(v) },
];

const STRENGTH_COLORS = ['', '#ef4444', '#f59e0b', '#3b82f6', '#059669'];

function getStrength(v: string): 0 | 1 | 2 | 3 | 4 {
  const passed = RULES.filter((r) => r.test(v)).length;
  if (passed <= 1) return 1;
  if (passed === 2) return 2;
  if (passed === 3) return 3;
  return 4;
}

type Props = Omit<TextInputProps, 'value' | 'secureTextEntry'> & {
  value: string;
  showRules?: boolean;
  showStrength?: boolean;
};

export const PasswordInput = forwardRef<TextInput, Props>(
  ({ value, showRules = false, showStrength = true, ...rest }, ref) => {
    const [show, setShow] = useState(false);
    const { t } = useTranslation();
    const typo = useTypography();
    const strength = value.length > 0 ? getStrength(value) : 0;

    const STRENGTH_LABEL_KEYS = [
      '',
      'auth.password.strength.weak',
      'auth.password.strength.fair',
      'auth.password.strength.good',
      'auth.password.strength.strong',
    ] as const;

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
          <TouchableOpacity testID="password-toggle" onPress={() => setShow((v) => !v)} className="p-1">
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
              {strength > 0 ? t(STRENGTH_LABEL_KEYS[strength]) : ''}
            </Text>
          </View>
        )}

        {showRules && (
          <View className="mt-3 gap-1">
            {RULES.map((rule) => {
              const passed = rule.test(value);
              return (
                <View key={rule.labelKey} className="flex-row items-center gap-2">
                  <MaterialCommunityIcons
                    name={passed ? 'check-circle' : 'circle-outline'}
                    size={14}
                    color={passed ? '#059669' : '#9ca3af'}
                  />
                  <Text className={`${typo.caption} ${passed ? 'text-primary' : 'text-gray-400'}`}>
                    {t(rule.labelKey)}
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
