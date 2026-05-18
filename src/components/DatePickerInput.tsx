import { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { DatePickerModal } from './DatePickerModal';
import { useTypography } from '../hooks/useTypography';

type Props = {
  value: string; // 'YYYY-MM-DD' or ''
  onChange: (date: string) => void;
  placeholder?: string;
  minimumDate?: Date;
  maximumDate?: Date;
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

export function DatePickerInput({ value, onChange, placeholder, minimumDate, maximumDate }: Props) {
  const { t, i18n } = useTranslation();
  const typo = useTypography();
  const [show, setShow] = useState(false);

  const selected = toDate(value);
  const modalValue = selected ?? minimumDate ?? new Date();

  const locale = i18n.language === 'vi' ? 'vi-VN' : 'en-US';
  const displayText = selected
    ? selected.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

  return (
    <View>
      <TouchableOpacity
        onPress={() => setShow(true)}
        className="flex-row items-center justify-between"
        activeOpacity={0.7}
      >
        {displayText
          ? <Text className={`${typo.body} text-gray-900 dark:text-gray-100`}>{displayText}</Text>
          : <Text className={`${typo.body} text-gray-400 dark:text-gray-500`}>{placeholder ?? t('common.selectDate')}</Text>
        }
        <Text className={`${typo.body}`}>📅</Text>
      </TouchableOpacity>

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
