import { useEffect, useRef, useState } from 'react';
import { Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';

type Props = {
  visible: boolean;
  value: Date;
  onChange: (date: Date) => void;
  onClose: () => void;
  maximumDate?: Date;
  minimumDate?: Date;
};

const ITEM_H = 44;

export function DatePickerModal({ visible, value, onChange, onClose, maximumDate, minimumDate }: Props) {
  const { t, i18n } = useTranslation();
  const [viewYear, setViewYear] = useState(value.getFullYear());
  const [viewMonth, setViewMonth] = useState(value.getMonth());
  const [mode, setMode] = useState<'day' | 'yearMonth'>('day');
  const yearScrollRef = useRef<ScrollView>(null);

  const minYear = minimumDate ? minimumDate.getFullYear() : 1970;
  const maxYear = maximumDate ? maximumDate.getFullYear() : value.getFullYear() + 30;
  const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i);

  useEffect(() => {
    if (visible) {
      setViewYear(value.getFullYear());
      setViewMonth(value.getMonth());
      setMode('day');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  useEffect(() => {
    if (mode === 'yearMonth') {
      const idx = years.indexOf(viewYear);
      if (idx >= 0) {
        setTimeout(() => {
          yearScrollRef.current?.scrollTo({ y: Math.max(0, idx - 2) * ITEM_H, animated: false });
        }, 50);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const maxDate = maximumDate;
  const minDate = minimumDate;
  const today = new Date();

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayRaw = new Date(viewYear, viewMonth, 1).getDay();
  const offset = (firstDayRaw + 6) % 7;

  const flat: (number | null)[] = [
    ...Array<null>(offset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (flat.length % 7 !== 0) flat.push(null);

  const rows: (number | null)[][] = [];
  for (let i = 0; i < flat.length; i += 7) rows.push(flat.slice(i, i + 7));

  const locale = i18n.language === 'vi' ? 'vi-VN' : 'en-US';
  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString(locale, {
    month: 'long', year: 'numeric',
  });
  const weekdays = t('datePickerModal.weekdays').split(',');

  const monthNames = Array.from({ length: 12 }, (_, m) =>
    new Date(2000, m, 1).toLocaleDateString(locale, { month: 'short' }),
  );

  const canGoPrev = minDate
    ? new Date(viewYear, viewMonth, 1) > new Date(minDate.getFullYear(), minDate.getMonth(), 1)
    : true;

  const canGoNext = maxDate
    ? new Date(viewYear, viewMonth + 1, 1) <= new Date(maxDate.getFullYear(), maxDate.getMonth(), 1)
    : true;

  const prevMonth = () => {
    if (!canGoPrev) return;
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else setViewMonth((m) => m - 1);
  };

  const nextMonth = () => {
    if (!canGoNext) return;
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else setViewMonth((m) => m + 1);
  };

  const isMonthDisabled = (y: number, m: number) => {
    if (minDate && new Date(y, m + 1, 0) < minDate) return true;
    if (maxDate && new Date(y, m, 1) > maxDate) return true;
    return false;
  };

  const isSelected = (day: number) =>
    value.getFullYear() === viewYear && value.getMonth() === viewMonth && value.getDate() === day;

  const isToday = (day: number) =>
    today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === day;

  const isDisabled = (day: number) => {
    const d = new Date(viewYear, viewMonth, day);
    if (maxDate && d > maxDate) return true;
    if (minDate && d < minDate) return true;
    return false;
  };

  const handleSelect = (day: number) => {
    if (isDisabled(day)) return;
    onChange(new Date(viewYear, viewMonth, day));
    onClose();
  };

  const handlePickYearMonth = (y: number, m: number) => {
    if (isMonthDisabled(y, m)) return;
    setViewYear(y);
    setViewMonth(m);
    setMode('day');
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end">
        <TouchableOpacity className="flex-1" activeOpacity={1} onPress={onClose} />
        <View className="bg-white dark:bg-gray-900 rounded-t-3xl px-5 pt-5 pb-10">

          {mode === 'day' ? (
            <>
              {/* Month / year navigation */}
              <View className="flex-row items-center justify-between mb-4">
                <TouchableOpacity
                  onPress={prevMonth}
                  disabled={!canGoPrev}
                  className="w-10 h-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700"
                >
                  <Text className={`text-lg font-bold ${canGoPrev ? 'text-gray-700 dark:text-gray-200' : 'text-gray-300 dark:text-gray-600'}`}>‹</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setMode('yearMonth')} className="flex-row items-center gap-1 px-3 py-1 rounded-xl bg-gray-100 dark:bg-gray-700">
                  <Text className="text-base font-bold text-gray-900 dark:text-gray-100 capitalize">{monthLabel}</Text>
                  <Text className="text-xs text-indigo-500">▾</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={nextMonth}
                  disabled={!canGoNext}
                  className="w-10 h-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700"
                >
                  <Text className={`text-lg font-bold ${canGoNext ? 'text-gray-700 dark:text-gray-200' : 'text-gray-300 dark:text-gray-600'}`}>›</Text>
                </TouchableOpacity>
              </View>

              {/* Weekday headers */}
              <View className="flex-row mb-1">
                {weekdays.map((d) => (
                  <View key={d} className="flex-1 items-center py-1">
                    <Text className="text-xs font-semibold text-gray-400 dark:text-gray-500">{d}</Text>
                  </View>
                ))}
              </View>

              {/* Calendar grid */}
              {rows.map((row, ri) => (
                <View key={ri} className="flex-row">
                  {row.map((day, di) => (
                    <View key={di} className="flex-1 items-center py-0.5">
                      {day !== null ? (
                        <TouchableOpacity
                          onPress={() => handleSelect(day)}
                          disabled={isDisabled(day)}
                          className={`w-9 h-9 rounded-full items-center justify-center ${
                            isSelected(day) ? 'bg-indigo-600' : isToday(day) ? 'bg-indigo-50 dark:bg-indigo-950' : ''
                          }`}
                        >
                          <Text
                            className={`text-sm ${
                              isSelected(day)
                                ? 'text-white font-bold'
                                : isDisabled(day)
                                ? 'text-gray-200 dark:text-gray-700'
                                : isToday(day)
                                ? 'text-indigo-600 dark:text-indigo-400 font-semibold'
                                : 'text-gray-700 dark:text-gray-200'
                            }`}
                          >
                            {day}
                          </Text>
                        </TouchableOpacity>
                      ) : (
                        <View className="w-9 h-9" />
                      )}
                    </View>
                  ))}
                </View>
              ))}
            </>
          ) : (
            <>
              {/* Year + month picker */}
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-base font-bold text-gray-900 dark:text-gray-100">
                  {t('datePickerModal.selectYearMonth')}
                </Text>
                <TouchableOpacity onPress={() => setMode('day')} className="px-3 py-1 rounded-xl bg-gray-100 dark:bg-gray-700">
                  <Text className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                    {t('common.cancel')}
                  </Text>
                </TouchableOpacity>
              </View>

              <View className="flex-row gap-3" style={{ height: 220 }}>
                {/* Year list */}
                <ScrollView ref={yearScrollRef} className="flex-1 border border-gray-200 dark:border-gray-700 rounded-xl" showsVerticalScrollIndicator={false}>
                  {years.map((y) => (
                    <TouchableOpacity
                      key={y}
                      onPress={() => setViewYear(y)}
                      style={{ height: ITEM_H }}
                      className={`items-center justify-center border-b border-gray-100 dark:border-gray-800 ${y === viewYear ? 'bg-indigo-50 dark:bg-indigo-950' : ''}`}
                    >
                      <Text className={`text-sm font-semibold ${y === viewYear ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-300'}`}>
                        {y}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Month grid */}
                <View className="flex-1">
                  <View className="flex-row flex-wrap gap-2 justify-center">
                    {monthNames.map((name, m) => {
                      const disabled = isMonthDisabled(viewYear, m);
                      const active = m === viewMonth;
                      return (
                        <TouchableOpacity
                          key={m}
                          onPress={() => handlePickYearMonth(viewYear, m)}
                          disabled={disabled}
                          className={`rounded-xl items-center justify-center border ${
                            active
                              ? 'bg-indigo-600 border-indigo-600'
                              : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                          }`}
                          style={{ width: '44%', height: 40 }}
                        >
                          <Text className={`text-sm font-semibold capitalize ${
                            active ? 'text-white' : disabled ? 'text-gray-300 dark:text-gray-600' : 'text-gray-700 dark:text-gray-300'
                          }`}>
                            {name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}
