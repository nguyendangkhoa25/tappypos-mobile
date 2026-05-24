import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTypography } from '../hooks/useTypography';
import { DatePickerInput } from './DatePickerInput';

// ─── Types ────────────────────────────────────────────────────────────────────

export type IdCardData = {
  idCardNumber: string;
  idCardFullName: string;
  idCardSex: string;           // 'MALE' | 'FEMALE' | ''
  idCardNationality: string;
  idCardPlaceOfOrigin: string;
  idCardPlaceOfResidence: string;
  idCardDateOfBirth: string;   // 'YYYY-MM-DD' or ''
  idCardIssuedDate: string;    // 'YYYY-MM-DD' or ''
  idCardIssuedPlace: string;
};

export const EMPTY_ID_CARD_DATA: IdCardData = {
  idCardNumber: '',
  idCardFullName: '',
  idCardSex: '',
  idCardNationality: '',
  idCardPlaceOfOrigin: '',
  idCardPlaceOfResidence: '',
  idCardDateOfBirth: '',
  idCardIssuedDate: '',
  idCardIssuedPlace: '',
};

type Props = {
  value: IdCardData;
  onChange: <K extends keyof IdCardData>(key: K, val: IdCardData[K]) => void;
};

// ─── Chip lists ───────────────────────────────────────────────────────────────

const NATIONALITY_CHIPS = ['Việt Nam'];

const ISSUING_PLACE_CHIPS = [
  'Cục quản lý hành chính về trật tự xã hội',
];

const TODAY = new Date();
const MAX_DOB = new Date(TODAY.getFullYear() - 18, TODAY.getMonth(), TODAY.getDate());

// ─── Internal sub-components ──────────────────────────────────────────────────

function FieldLabel({ label }: { label: string }) {
  const typo = useTypography();
  return (
    <Text className={`${typo.caption} font-medium text-gray-700 dark:text-gray-300 mb-1.5`}>
      {label}
    </Text>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="mb-4">
      <FieldLabel label={label} />
      {children}
    </View>
  );
}

function Input({
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'decimal-pad';
  multiline?: boolean;
}) {
  const typo = useTypography();
  return (
    <TextInput
      className={`border border-gray-200 dark:border-gray-600 rounded-xl px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white py-3 ${typo.inputSize}`}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#9ca3af"
      keyboardType={keyboardType ?? 'default'}
      multiline={multiline}
      style={multiline ? { height: 72, textAlignVertical: 'top' } : undefined}
    />
  );
}

function ChipRow({
  chips,
  selected,
  onSelect,
}: {
  chips: string[];
  selected: string;
  onSelect: (chip: string) => void;
}) {
  const typo = useTypography();
  return (
    <View className="flex-row flex-wrap mt-2" style={{ gap: 8 }}>
      {chips.map((chip) => {
        const active = selected === chip;
        return (
          <TouchableOpacity
            key={chip}
            onPress={() => onSelect(active ? '' : chip)}
            activeOpacity={0.75}
            className={`px-3 py-1.5 rounded-full border ${
              active
                ? 'bg-primary border-primary'
                : 'bg-gray-50 dark:bg-gray-700/60 border-gray-200 dark:border-gray-600'
            }`}
          >
            <Text
              className={`${typo.caption} ${
                active ? 'text-white' : 'text-gray-600 dark:text-gray-300'
              }`}
            >
              {chip}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function IdCardSection({ value, onChange }: Props) {
  const { t } = useTranslation();
  const typo = useTypography();

  return (
    <View>

      {/* 1. ID Number */}
      <Field label={t('customers.idCardNumber')}>
        <Input
          value={value.idCardNumber}
          onChangeText={(v) => onChange('idCardNumber', v)}
          placeholder={t('customers.idCardNumberPlaceholder')}
          keyboardType="decimal-pad"
        />
      </Field>

      {/* 2. Full Name */}
      <Field label={t('customers.idCardFullName')}>
        <Input
          value={value.idCardFullName}
          onChangeText={(v) => onChange('idCardFullName', v)}
          placeholder={t('customers.idCardFullNamePlaceholder')}
        />
      </Field>

      {/* 3. Sex — radio chips (Nam / Nữ only, no "Other") */}
      <Field label={t('customers.idCardSex')}>
        <View className="flex-row" style={{ gap: 8 }}>
          {(
            [
              { key: 'MALE', label: t('customers.genderMale') },
              { key: 'FEMALE', label: t('customers.genderFemale') },
            ] as const
          ).map(({ key, label }) => {
            const active = value.idCardSex === key;
            return (
              <TouchableOpacity
                key={key}
                onPress={() => onChange('idCardSex', active ? '' : key)}
                activeOpacity={0.75}
                className={`flex-1 py-2.5 rounded-xl items-center border ${
                  active
                    ? 'bg-primary border-primary'
                    : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                }`}
              >
                <Text
                  className={`${typo.label} ${
                    active ? 'text-white' : 'text-gray-600 dark:text-gray-300'
                  }`}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Field>

      {/* 4. Nationality + chip */}
      <Field label={t('customers.idCardNationality')}>
        <Input
          value={value.idCardNationality}
          onChangeText={(v) => onChange('idCardNationality', v)}
          placeholder={t('customers.idCardNationalityPlaceholder')}
        />
        <ChipRow
          chips={NATIONALITY_CHIPS}
          selected={value.idCardNationality}
          onSelect={(chip) => onChange('idCardNationality', chip)}
        />
      </Field>

      {/* 5. Place of origin (Quê quán) */}
      <Field label={t('customers.idCardPlaceOfOrigin')}>
        <Input
          value={value.idCardPlaceOfOrigin}
          onChangeText={(v) => onChange('idCardPlaceOfOrigin', v)}
          placeholder={t('customers.idCardPlaceOfOriginPlaceholder')}
          multiline
        />
      </Field>

      {/* 6. Place of residence (Nơi thường trú) */}
      <Field label={t('customers.idCardPlaceOfResidence')}>
        <Input
          value={value.idCardPlaceOfResidence}
          onChangeText={(v) => onChange('idCardPlaceOfResidence', v)}
          placeholder={t('customers.idCardPlaceOfResidencePlaceholder')}
          multiline
        />
      </Field>

      {/* 7. Date of birth */}
      <Field label={t('customers.idCardDateOfBirth')}>
        <View className="border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-3 bg-white dark:bg-gray-700">
          <DatePickerInput
            value={value.idCardDateOfBirth}
            onChange={(v) => onChange('idCardDateOfBirth', v)}
            placeholder={t('customers.dateOfBirthPlaceholder')}
            maximumDate={MAX_DOB}
            clearable
          />
        </View>
      </Field>

      {/* 8. Ngày cấp (Issue date) */}
      <Field label={t('customers.idCardIssuedDate')}>
        <View className="border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-3 bg-white dark:bg-gray-700">
          <DatePickerInput
            value={value.idCardIssuedDate}
            onChange={(v) => onChange('idCardIssuedDate', v)}
            placeholder={t('customers.idCardIssuedDatePlaceholder')}
            maximumDate={TODAY}
            clearable
          />
        </View>
      </Field>

      {/* 9. Nơi cấp (Issuing authority) + chip */}
      <Field label={t('customers.idCardIssuedPlace')}>
        <Input
          value={value.idCardIssuedPlace}
          onChangeText={(v) => onChange('idCardIssuedPlace', v)}
          placeholder={t('customers.idCardIssuedPlaceholder')}
        />
        <ChipRow
          chips={ISSUING_PLACE_CHIPS}
          selected={value.idCardIssuedPlace}
          onSelect={(chip) => onChange('idCardIssuedPlace', chip)}
        />
      </Field>

    </View>
  );
}
