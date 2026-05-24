import { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { DatePickerModal } from './DatePickerModal';
import { useTypography } from '../hooks/useTypography';

type Props = {
  value: string; // 'YYYY-MM-DD' or ''
  onChange: (date: string) => void;
  placeholder?: string;
  minimumDate?: Date;
  maximumDate?: Date;
  clearable?: boolean;
};

function toDate(s: string): Date | undefined {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return undefined;
  const d = new Date(s + 'T00:00:00');
  return isNaN(d.getTime()) ? undefined : d;
}

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function DatePickerInput({ value, onChange, placeholder, minimumDate, maximumDate, clearable = false }: Props) {
  const { t, i18n } = useTranslation();
  const typo = useTypography();
  const [show, setShow] = useState(false);

  const selected = toDate(value);
  const modalValue = selected ?? maximumDate ?? minimumDate ?? new Date();

  const locale = i18n.language === 'vi' ? 'vi-VN' : 'en-US';
  const displayText = selected
    ? selected.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

  return (
    <View>
      <View className="flex-row items-center justify-between">
        <TouchableOpacity
          onPress={() => setShow(true)}
          className="flex-1 flex-row items-center"
          activeOpacity={0.7}
        >
          {displayText
            ? <Text className={`${typo.body} text-gray-900 dark:text-gray-100 flex-1`}>{displayText}</Text>
            : <Text className={`${typo.body} text-gray-400 dark:text-gray-500 flex-1`}>{placeholder ?? t('common.selectDate')}</Text>
          }
        </TouchableOpacity>
        <View className="flex-row items-center ml-2" style={{ gap: 8 }}>
          {clearable && selected && (
            <TouchableOpacity
              onPress={() => onChange('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialCommunityIcons name="close-circle" size={18} color="#9ca3af" />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => setShow(true)} activeOpacity={0.7}>
            <Text className={`${typo.body}`}>📅</Text>
          </TouchableOpacity>
        </View>
      </View>

      <DatePickerModal
        visible={show}
        value={modalValue}
        onChange={(d) => { onChange(toISO(d)); }}
        onClose={() => setShow(false)}
        minimumDate={minimumDate}
        maximumDate={maximumDate}
      />
    </View>
  );
}
