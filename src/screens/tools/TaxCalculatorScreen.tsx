import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MoneyInput } from '../../components/MoneyInput';
import { formatVnd } from '../../utils/format';
import type { ToolsScreenProps } from '../../types/navigation';

type Props = ToolsScreenProps<'TaxCalculator'>;

const DEFAULT_PERSONAL_DEDUCTION  = 15_500_000;
const DEFAULT_DEPENDENT_DEDUCTION = 6_200_000;

const BHXH_BHYT_CAP = 46_800_000;
const BHXH_RATE = 0.08;
const BHYT_RATE = 0.015;
const BHTN_RATE = 0.01;

type Region = 'I' | 'II' | 'III' | 'IV';

const REGION_BHTN_CAP: Record<Region, number> = {
  I:   99_200_000,
  II:  88_200_000,
  III: 77_200_000,
  IV:  69_000_000,
};

const BRACKETS = [
  { max: 10_000_000,  rate: 0.05 },
  { max: 20_000_000,  rate: 0.10 },
  { max: 40_000_000,  rate: 0.15 },
  { max: 70_000_000,  rate: 0.20 },
  { max: 110_000_000, rate: 0.25 },
  { max: 180_000_000, rate: 0.30 },
  { max: Infinity,    rate: 0.35 },
];

interface BracketSlice { rate: number; slice: number; tax: number }

function calcTaxDetailed(taxable: number): BracketSlice[] {
  if (taxable <= 0) return [];
  const slices: BracketSlice[] = [];
  let prev = 0;
  for (const b of BRACKETS) {
    if (taxable <= prev) break;
    const slice = Math.min(taxable, b.max) - prev;
    if (slice > 0) slices.push({ rate: b.rate, slice, tax: slice * b.rate });
    prev = b.max;
  }
  return slices;
}

const MIN_DEPENDENTS = 0;
const MAX_DEPENDENTS = 10;

export function TaxCalculatorScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { top } = useSafeAreaInsets();

  const [gross, setGross] = useState('');
  const [dependents, setDependents] = useState(0);
  const [showCustomize, setShowCustomize] = useState(false);
  const [region, setRegion] = useState<Region>('I');

  const [bhxhOverride, setBhxhOverride] = useState('');
  const [bhytOverride, setBhytOverride] = useState('');
  const [bhtnOverride, setBhtnOverride] = useState('');

  const [personalDeductInput, setPersonalDeductInput]   = useState(String(DEFAULT_PERSONAL_DEDUCTION));
  const [dependentDeductInput, setDependentDeductInput] = useState(String(DEFAULT_DEPENDENT_DEDUCTION));

  const grossNum = parseInt(gross, 10) || 0;
  const bhtnCap  = REGION_BHTN_CAP[region];

  const siBase    = Math.min(grossNum, BHXH_BHYT_CAP);
  const autoBhxh  = Math.round(siBase * BHXH_RATE);
  const autoBhyt  = Math.round(siBase * BHYT_RATE);
  const autoBhtn  = Math.round(Math.min(grossNum, bhtnCap) * BHTN_RATE);

  const bhxhAmt = bhxhOverride !== '' ? (parseInt(bhxhOverride, 10) || 0) : autoBhxh;
  const bhytAmt = bhytOverride !== '' ? (parseInt(bhytOverride, 10) || 0) : autoBhyt;
  const bhtnAmt = bhtnOverride !== '' ? (parseInt(bhtnOverride, 10) || 0) : autoBhtn;
  const siTotal = bhxhAmt + bhytAmt + bhtnAmt;

  const bhxhCapped = grossNum > BHXH_BHYT_CAP && bhxhOverride === '';
  const bhtnCapped = grossNum > bhtnCap && bhtnOverride === '';

  const personalDeduction  = parseInt(personalDeductInput, 10)  || DEFAULT_PERSONAL_DEDUCTION;
  const perDependentDeduct = parseInt(dependentDeductInput, 10) || DEFAULT_DEPENDENT_DEDUCTION;

  const incomeAfterSI        = grossNum - siTotal;
  const dependentTotalDeduct = dependents * perDependentDeduct;
  const taxable              = Math.max(0, incomeAfterSI - personalDeduction - dependentTotalDeduct);

  const bracketSlices = calcTaxDetailed(taxable);
  const tax           = bracketSlices.reduce((s, b) => s + b.tax, 0);
  const net           = grossNum - siTotal - tax;
  const effectiveRate = grossNum > 0 ? (tax / grossNum) * 100 : 0;
  const hasIncome     = grossNum > 0;

  const handleRegionChange = (r: Region) => {
    setRegion(r);
    setBhxhOverride('');
    setBhytOverride('');
    setBhtnOverride('');
  };

  const handleReset = () => {
    setRegion('I');
    setBhxhOverride('');
    setBhytOverride('');
    setBhtnOverride('');
    setPersonalDeductInput(String(DEFAULT_PERSONAL_DEDUCTION));
    setDependentDeductInput(String(DEFAULT_DEPENDENT_DEDUCTION));
  };

  return (
    <KeyboardAvoidingView className="flex-1 bg-gray-50" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View className="bg-amber-600 px-6 pb-5" style={{ paddingTop: top + 16 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} className="mb-3">
          <MaterialCommunityIcons name="arrow-left" size={24} color="white" />
        </TouchableOpacity>
        <Text className="text-2xl font-bold text-white">{t('taxCalc.title')}</Text>
        <Text className="text-amber-200 text-xs mt-1">{t('taxCalc.subtitle2026')}</Text>
      </View>

      <ScrollView className="flex-1 px-4 pt-4" keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 40 }}>
        <View className="flex-row items-start bg-indigo-50 rounded-xl px-3 py-2.5 border border-indigo-100 mb-3">
          <Text className="text-indigo-400 mr-2 mt-0.5">💡</Text>
          <Text className="text-xs text-indigo-600 leading-4 flex-1">{t('taxCalc.hint')}</Text>
        </View>

        <View className="flex-row items-start bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 mb-3">
          <MaterialCommunityIcons name="information-outline" size={16} color="#d97706" style={{ marginTop: 1, marginRight: 6 }} />
          <Text className="flex-1 text-xs text-amber-700 leading-4">{t('taxCalc.disclaimer')}</Text>
        </View>

        <View className="bg-white rounded-2xl p-4 mb-3 border border-gray-100">
          <Text className="text-sm font-semibold text-gray-700 mb-2">{t('taxCalc.grossIncome')}</Text>
          <MoneyInput rawValue={gross} onChangeRaw={setGross} placeholder="0" />
        </View>

        <View className="bg-white rounded-2xl p-4 mb-3 border border-gray-100">
          <Text className="text-sm font-semibold text-gray-700 mb-3">{t('taxCalc.dependents')}</Text>
          <View className="flex-row items-center justify-center" style={{ gap: 24 }}>
            <TouchableOpacity
              onPress={() => setDependents((d) => Math.max(MIN_DEPENDENTS, d - 1))}
              disabled={dependents <= MIN_DEPENDENTS}
              className="w-12 h-12 rounded-full bg-gray-100 items-center justify-center"
            >
              <Text className={`text-2xl font-bold ${dependents <= MIN_DEPENDENTS ? 'text-gray-300' : 'text-gray-700'}`}>−</Text>
            </TouchableOpacity>
            <Text className="text-4xl font-bold text-gray-900 w-16 text-center">{dependents}</Text>
            <TouchableOpacity
              onPress={() => setDependents((d) => Math.min(MAX_DEPENDENTS, d + 1))}
              disabled={dependents >= MAX_DEPENDENTS}
              className="w-12 h-12 rounded-full bg-gray-100 items-center justify-center"
            >
              <Text className={`text-2xl font-bold ${dependents >= MAX_DEPENDENTS ? 'text-gray-300' : 'text-gray-700'}`}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {hasIncome && (
          <View className="bg-white rounded-2xl p-4 mb-3 border border-gray-100">
            <Text className="text-sm font-bold text-gray-700 mb-3">{t('taxCalc.deductionsTitle')}</Text>
            <CalcRow label={t('taxCalc.grossIncome')} value={grossNum} />
            <View className="ml-2 mt-0.5 mb-0.5">
              <SIRow label={`BHXH 8%${bhxhCapped ? ' ⌈' : ''}`} value={bhxhAmt} isOverride={bhxhOverride !== ''} />
              <SIRow label={`BHYT 1.5%${bhxhCapped ? ' ⌈' : ''}`} value={bhytAmt} isOverride={bhytOverride !== ''} />
              <SIRow label={`BHTN 1%${bhtnCapped ? ' ⌈' : ''}`} value={bhtnAmt} isOverride={bhtnOverride !== ''} />
            </View>
            {(bhxhCapped || bhtnCapped) && (
              <Text className="text-xs text-amber-600 mb-1.5 ml-2">
                ⌈ {t('taxCalc.capApplied', { cap: formatVnd(bhxhCapped ? BHXH_BHYT_CAP : bhtnCap) })}
              </Text>
            )}
            <CalcRow label={t('taxCalc.siDeduction')} value={-siTotal} bold />
            <View className="border-t border-dashed border-gray-100 my-2" />
            <CalcRow label={t('taxCalc.incomeAfterSI')} value={incomeAfterSI} subtle />
            <CalcRow label={t('taxCalc.personalDeduction')} value={-personalDeduction} />
            {dependents > 0 && (
              <CalcRow label={`${t('taxCalc.dependentDeduction')} (×${dependents})`} value={-dependentTotalDeduct} />
            )}
            <View className="border-t border-gray-100 mt-2 pt-2">
              <CalcRow label={t('taxCalc.totalDeduction')} value={-(siTotal + personalDeduction + dependentTotalDeduct)} bold />
            </View>
            <View className="bg-amber-50 rounded-xl px-3 py-2.5 mt-2 border border-amber-100">
              <CalcRow label={t('taxCalc.taxableIncome')} value={taxable} bold highlight />
            </View>
          </View>
        )}

        {hasIncome && (
          <View className="bg-amber-50 rounded-2xl p-4 mb-3 border border-amber-100">
            <Text className="text-sm font-bold text-amber-700 mb-3">{t('taxCalc.taxBreakdown')}</Text>
            {bracketSlices.length === 0 ? (
              <Text className="text-sm text-emerald-600 font-semibold">{t('taxCalc.noTax')}</Text>
            ) : (
              <>
                {bracketSlices.map((sl, i) => (
                  <View key={i} className="flex-row justify-between items-center mb-1.5">
                    <Text className="text-xs text-amber-700 flex-1 mr-2">{(sl.rate * 100).toFixed(0)}% × {formatVnd(Math.round(sl.slice))}</Text>
                    <Text className="text-xs font-semibold text-red-600">= {formatVnd(Math.round(sl.tax))}</Text>
                  </View>
                ))}
                <View className="border-t border-amber-200 mt-2 pt-2 mb-1">
                  <View className="flex-row justify-between items-center">
                    <Text className="text-sm font-bold text-gray-700">{t('taxCalc.estimatedTax')}</Text>
                    <Text className="text-sm font-bold text-red-600">{formatVnd(Math.round(tax))}</Text>
                  </View>
                </View>
                <View className="border-t border-amber-200 mt-3 pt-3">
                  <View className="flex-row justify-between items-center mb-1">
                    <Text className="text-sm font-bold text-gray-800">{t('taxCalc.netIncome')}</Text>
                    <Text className="text-sm font-bold text-emerald-600">{formatVnd(Math.round(net))}</Text>
                  </View>
                  <View className="flex-row justify-between items-center">
                    <Text className="text-sm text-gray-600">{t('taxCalc.effectiveRate')}</Text>
                    <Text className="text-sm font-bold text-amber-700">{effectiveRate.toFixed(1)}%</Text>
                  </View>
                </View>
              </>
            )}
          </View>
        )}

        <TouchableOpacity
          onPress={() => setShowCustomize((v) => !v)}
          className="bg-white rounded-2xl px-4 py-3.5 mb-1 flex-row items-center justify-between border border-gray-100"
        >
          <View className="flex-1 mr-3">
            <Text className="text-sm font-semibold text-gray-700">⚙️ {t('taxCalc.customizeTitle')}</Text>
            <Text className="text-xs text-gray-400 mt-0.5">{t('taxCalc.customizeSubtitle')}</Text>
          </View>
          <Text className="text-gray-400 text-sm">{showCustomize ? '▲' : '▼'}</Text>
        </TouchableOpacity>

        {showCustomize && (
          <View className="bg-white rounded-2xl p-4 mb-3 border border-gray-100">
            <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{t('taxCalc.regionLabel')}</Text>
            <View className="flex-row mb-1" style={{ gap: 8 }}>
              {(['I', 'II', 'III', 'IV'] as Region[]).map((r) => (
                <TouchableOpacity
                  key={r}
                  onPress={() => handleRegionChange(r)}
                  className={`flex-1 py-2 rounded-xl items-center border ${region === r ? 'bg-amber-500 border-amber-500' : 'border-gray-200'}`}
                >
                  <Text className={`text-xs font-bold ${region === r ? 'text-white' : 'text-gray-600'}`}>{t('taxCalc.vung')} {r}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text className="text-xs text-gray-400 mb-4">{t('taxCalc.regionNote', { cap: formatVnd(REGION_BHTN_CAP[region]) })}</Text>

            <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">{t('taxCalc.siSection')}</Text>
            <SIOverrideField label="BHXH" formula={`${formatVnd(BHXH_BHYT_CAP)} × 8%`} autoValue={autoBhxh} rawValue={bhxhOverride} onChangeRaw={setBhxhOverride} />
            <SIOverrideField label="BHYT" formula={`${formatVnd(BHXH_BHYT_CAP)} × 1.5%`} autoValue={autoBhyt} rawValue={bhytOverride} onChangeRaw={setBhytOverride} />
            <SIOverrideField
              label="BHTN"
              formula={grossNum > 0 ? `${formatVnd(Math.min(grossNum, REGION_BHTN_CAP[region]))} × 1%` : `${t('taxCalc.vung')} ${region} — ${formatVnd(REGION_BHTN_CAP[region])} × 1%`}
              autoValue={autoBhtn}
              rawValue={bhtnOverride}
              onChangeRaw={setBhtnOverride}
            />

            {(bhxhOverride !== '' || bhytOverride !== '' || bhtnOverride !== '') && (
              <TouchableOpacity onPress={() => { setBhxhOverride(''); setBhytOverride(''); setBhtnOverride(''); }} className="mb-4">
                <Text className="text-xs text-indigo-500 text-right">{t('taxCalc.clearOverrides')}</Text>
              </TouchableOpacity>
            )}

            <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">{t('taxCalc.deductSection')}</Text>
            <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{t('taxCalc.personalDeductLabel')}</Text>
            <View className="mb-3">
              <MoneyInput rawValue={personalDeductInput} onChangeRaw={setPersonalDeductInput} placeholder={String(DEFAULT_PERSONAL_DEDUCTION)} />
            </View>
            <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{t('taxCalc.perDependentLabel')}</Text>
            <View className="mb-4">
              <MoneyInput rawValue={dependentDeductInput} onChangeRaw={setDependentDeductInput} placeholder={String(DEFAULT_DEPENDENT_DEDUCTION)} />
            </View>

            <TouchableOpacity onPress={handleReset} className="border border-gray-200 rounded-xl py-2.5 items-center">
              <Text className="text-sm font-semibold text-gray-600">{t('taxCalc.resetDefaults')}</Text>
            </TouchableOpacity>
          </View>
        )}

        <View className="bg-white rounded-2xl p-4 mt-2 border border-gray-100">
          <Text className="text-sm font-bold text-gray-700 mb-3">{t('taxCalc.brackets')}</Text>
          {BRACKETS.map((b, i) => {
            const prevMax = i > 0 ? BRACKETS[i - 1].max : 0;
            const isActive = taxable > 0 && taxable > prevMax && taxable <= b.max;
            return (
              <View key={i} className={`flex-row justify-between items-center py-1.5 px-2 rounded-lg mb-1 ${isActive ? 'bg-amber-100' : ''}`}>
                <Text className={`text-xs ${isActive ? 'font-bold text-amber-700' : 'text-gray-500'}`}>
                  {i === 0 ? `≤ ${formatVnd(b.max)}` : b.max === Infinity ? `> ${formatVnd(prevMax)}` : `${formatVnd(prevMax)} – ${formatVnd(b.max)}`}
                </Text>
                <Text className={`text-xs font-bold ${isActive ? 'text-amber-700' : 'text-gray-500'}`}>{(b.rate * 100).toFixed(0)}%</Text>
              </View>
            );
          })}
          <Text className="text-xs text-gray-400 mt-2 text-center">{t('taxCalc.bracketsNote')}</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function CalcRow({ label, value, bold, subtle, highlight }: { label: string; value: number; bold?: boolean; subtle?: boolean; highlight?: boolean }) {
  const isNeg = value < 0;
  return (
    <View className="flex-row justify-between items-center mb-1.5">
      <Text className={`text-sm flex-1 mr-2 ${bold ? 'font-bold text-gray-800' : subtle ? 'text-gray-500 italic' : 'text-gray-600'}`}>{label}</Text>
      <Text className={`text-sm ${bold ? 'font-bold' : ''} ${highlight ? 'text-amber-700' : isNeg ? 'text-red-600' : subtle ? 'text-gray-600' : 'text-gray-800'}`}>
        {isNeg ? '−' : ''}{formatVnd(Math.abs(Math.round(value)))}
      </Text>
    </View>
  );
}

function SIRow({ label, value, isOverride }: { label: string; value: number; isOverride: boolean }) {
  return (
    <View className="flex-row justify-between items-center mb-1">
      <Text className="text-xs text-gray-400 flex-1 mr-2">{label}{isOverride ? ' ✎' : ''}</Text>
      <Text className="text-xs text-red-500">−{formatVnd(Math.abs(Math.round(value)))}</Text>
    </View>
  );
}

function SIOverrideField({ label, formula, autoValue, rawValue, onChangeRaw }: { label: string; formula: string; autoValue: number; rawValue: string; onChangeRaw: (v: string) => void }) {
  return (
    <View className="mb-3">
      <View className="flex-row justify-between items-baseline mb-1">
        <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</Text>
        <Text className="text-xs text-gray-400">{formula} = {formatVnd(autoValue)}</Text>
      </View>
      <MoneyInput rawValue={rawValue} onChangeRaw={onChangeRaw} placeholder={String(autoValue)} />
    </View>
  );
}
