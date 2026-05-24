import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { isAxiosError } from 'axios';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { tenantApi } from '../../services/api';
import { OnboardingHeader } from './OnboardingHeader';
import { useOnboardingStore } from '../../store/onboardingStore';
import { useAuthStore } from '../../store/authStore';
import { useUserStore } from '../../store/userStore';
import { useAlertStore } from '../../store/alertStore';
import { formatVnd } from '../../utils/format';
import { CATEGORY_EMOJI } from './Step3Screen';
import { SPECIFIC_SHOP_TYPES } from '../../utils/shopTypes';
import { useOnboardingFlow } from '../../hooks/useOnboardingFlow';
import { useTypography } from '../../hooks/useTypography';
import type { OnboardingScreenProps } from '../../types/navigation';

export function Step4Screen({ navigation }: OnboardingScreenProps<'Step4'>) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const typo = useTypography();
  const { shopTypeCode, step1, step2, pawnTypes, hasPawnFeature, pawnInterestRate, pawnCalcMode, pawnDueDate, tables, step3, removeExpense, removeProduct, reset } = useOnboardingStore();
  const { totalSteps, getStepIndex, steps, backendCode } = useOnboardingFlow();
  const isFnb = steps.includes('TABLE_SETUP');
  // isPawn: step list has pawn types AND (jewelry explicitly confirmed, OR pawn shop which has no gate)
  const isPawn = steps.includes('PAWN_TYPES') && hasPawnFeature !== false;
  const { setAuthenticated } = useAuthStore();
  const { show: showAlert } = useAlertStore();
  const [loading, setLoading] = useState(false);
  const [productsExpanded, setProductsExpanded] = useState(true);
  const [expensesExpanded, setExpensesExpanded] = useState(true);

  const handleStart = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await tenantApi.selfProvision({
        shopTypeCode: backendCode,
        shopName: step1.shopName,
        address: step1.address,
        nickname: step1.nickname,
        fullName: step1.fullName,
        refreshInBody: true,
        products: step2.products.map((p) => ({
          templateId: p.templateId,
          name: p.name,
          price: p.price,
          unit: p.unit,
          dynamicPrice: p.dynamicPrice,
        })),
        expenses: step3.expenses.map((e) => ({
          name: e.name,
          monthlyAmount: e.monthlyAmount,
          category: e.category,
          expenseType: e.expenseType,
          paymentDate: e.paymentDate,
          note: e.note,
        })),
        tables: tables.length > 0 ? tables.map((tb) => ({
          tableNumber: tb.tableNumber,
          capacity: tb.capacity,
          location: tb.location,
        })) : undefined,
        hasPawnFeature: steps.includes('PAWN_FEATURE') ? hasPawnFeature ?? false : undefined,
        pawnTypes: isPawn && pawnTypes.length > 0 ? pawnTypes : undefined,
        pawnInterestRate: isPawn && pawnInterestRate ? pawnInterestRate : undefined,
        pawnCalcMode: isPawn ? pawnCalcMode : undefined,
        pawnDueDate: isPawn && pawnDueDate ? pawnDueDate : undefined,
      });

      const { accessToken, refreshToken, setupComplete } = res.data.data;
      await setAuthenticated({ accessToken, refreshToken, setupComplete });
      await useUserStore.getState().setAll({
        nickname: step1.nickname || undefined,
        fullName: step1.fullName || undefined,
        shopName: step1.shopName || undefined,
      });
      reset();
    } catch (err) {
      const message = isAxiosError(err)
        ? (err.response?.data?.message ?? t('onboarding.step4.networkError'))
        : t('onboarding.step4.unexpectedError');
      showAlert(t('onboarding.step4.createError'), message, [
        { label: t('onboarding.step4.retry'), style: 'default' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white dark:bg-gray-900"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ paddingTop: insets.top }}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View className="px-6 pt-8">
          <OnboardingHeader step={getStepIndex('REVIEW')} total={totalSteps} onBack={() => navigation.goBack()} />

          <Text className={`${typo.heading} text-gray-900 dark:text-white mt-6 mb-1`}>
            {t('onboarding.step4.title')}
          </Text>
          <View className="mb-6 gap-1.5 mt-1">
            {(
              [
                { icon: 'eye-outline',           key: 'onboarding.step4.hint1' },
                { icon: 'pencil-outline',        key: 'onboarding.step4.hint2' },
                { icon: 'check-circle-outline',  key: 'onboarding.step4.hint3' },
              ] as const
            ).map(({ icon, key }) => (
              <View key={key} className="flex-row items-center gap-2">
                <MaterialCommunityIcons name={icon} size={13} color="#9ca3af" />
                <Text className={`${typo.caption} text-gray-400 dark:text-gray-500 flex-1 leading-4`}>
                  {t(key)}
                </Text>
              </View>
            ))}
          </View>

          {/* Shop type */}
          <ReviewSection
            label={t('onboarding.step4.sectionShopType')}
            onEdit={() => navigation.navigate('ShopType')}
          >
            {(() => {
              const specific = SPECIFIC_SHOP_TYPES.find((s) => s.id === shopTypeCode);
              const name = specific
                ? t(`onboarding.shopType.specific.${shopTypeCode}.name`)
                : t(`onboarding.shopType.types.${shopTypeCode}.name`, { defaultValue: shopTypeCode ?? '' });
              return (
                <Text className={`${typo.caption} font-medium text-gray-800 dark:text-white`}>
                  {specific ? `${specific.emoji}  ` : ''}{name}
                </Text>
              );
            })()}
          </ReviewSection>

          {/* Shop info */}
          <ReviewSection
            label={t('onboarding.step4.sectionShopInfo')}
            onEdit={() => navigation.navigate('Step1')}
          >
            <InfoRow icon="store-outline" label={t('onboarding.step4.labelShopName')} value={step1.shopName || '—'} />
            <InfoRow icon="account-outline" label={t('onboarding.step4.labelNickname')} value={step1.nickname || '—'} />
            {step1.fullName ? (
              <InfoRow icon="badge-account-outline" label={t('onboarding.step4.labelFullName')} value={step1.fullName} />
            ) : null}
            {step1.address ? (
              <InfoRow icon="map-marker-outline" label={t('onboarding.step4.labelAddress')} value={step1.address} />
            ) : null}
          </ReviewSection>

          {/* Products — read-only summary (non-pawn shops only) */}
          {!isPawn && (
            <View className="mb-3">
              <TouchableOpacity
                onPress={() => setProductsExpanded((v) => !v)}
                activeOpacity={0.7}
                className="flex-row items-center justify-between mb-2"
              >
                <View className="flex-row items-center gap-1.5">
                  <Text className={`${typo.captionBold} text-gray-400 dark:text-gray-500 uppercase tracking-wide`}>
                    {t('onboarding.step4.sectionProducts', { count: step2.products.length })}
                  </Text>
                  <MaterialCommunityIcons
                    name={productsExpanded ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color="#9ca3af"
                  />
                </View>
                <TouchableOpacity onPress={() => navigation.navigate('Step2')}>
                  <Text className={`${typo.captionBold} text-primary`}>{t('onboarding.step4.editList')}</Text>
                </TouchableOpacity>
              </TouchableOpacity>

              {productsExpanded && (step2.products.length === 0 ? (
                <View className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4">
                  <Text className={`${typo.caption} text-gray-400 dark:text-gray-500`}>
                    {t('onboarding.step4.noProducts')}
                  </Text>
                </View>
              ) : (
                <View className="bg-gray-50 dark:bg-gray-800 rounded-2xl overflow-hidden">
                  {step2.products.map((p, i) => (
                    <View
                      key={p.templateId}
                      className={`flex-row items-center px-4 py-3 ${
                        i < step2.products.length - 1
                          ? 'border-b border-gray-100 dark:border-gray-700'
                          : ''
                      }`}
                    >
                      <Text className={`${typo.caption} flex-1 text-gray-700 dark:text-gray-200 font-medium`} numberOfLines={1}>
                        {p.name || '—'}
                      </Text>
                      <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 mr-1`}>
                        {p.dynamicPrice
                          ? t('onboarding.step2.dynamicPriceHint')
                          : p.price > 0
                          ? formatVnd(p.price)
                          : '—'}
                      </Text>
                      <Text className={`${typo.caption} text-gray-400 dark:text-gray-500 mr-3`}>/{p.unit}</Text>
                      <TouchableOpacity
                        onPress={() => removeProduct(p.templateId)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <MaterialCommunityIcons name="close" size={16} color="#9ca3af" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          )}

          {/* Pawn types — read-only summary (pawn shops only) */}
          {isPawn && (
            <View className="mb-3">
              <View className="flex-row items-center justify-between mb-2">
                <Text className={`${typo.captionBold} text-gray-400 dark:text-gray-500 uppercase tracking-wide`}>
                  {t('onboarding.step4.sectionPawnTypes', { count: pawnTypes.length })}
                </Text>
                <TouchableOpacity onPress={() => navigation.navigate('Step2')}>
                  <Text className={`${typo.captionBold} text-primary`}>{t('onboarding.step4.editList')}</Text>
                </TouchableOpacity>
              </View>

              {pawnTypes.length === 0 ? (
                <View className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4">
                  <Text className={`${typo.caption} text-gray-400 dark:text-gray-500`}>
                    {t('onboarding.step4.noPawnTypes')}
                  </Text>
                </View>
              ) : (
                <View className="bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl p-4 flex-row flex-wrap gap-2">
                  {pawnTypes.map((code) => (
                    <View
                      key={code}
                      className="flex-row items-center gap-1.5 bg-white dark:bg-gray-800 border border-indigo-100 dark:border-indigo-700 rounded-full px-3 py-1.5"
                    >
                      <Text className={`${typo.caption} font-medium text-indigo-700 dark:text-indigo-300`}>
                        {t(`onboarding.step2.pawn.types.${code}`, { defaultValue: code })}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Pawn interest — read-only summary (pawn shops only) */}
          {isPawn && (
            <ReviewSection
              label={t('onboarding.step4.sectionPawnInterest')}
              onEdit={() => navigation.navigate('PawnInterest')}
            >
              <InfoRow
                icon="percent-outline"
                label={t('onboarding.step4.labelInterestRate')}
                value={pawnInterestRate ? `${pawnInterestRate}%` : '—'}
              />
              <InfoRow
                icon="calculator-outline"
                label={t('onboarding.step4.labelCalcMode')}
                value={t(`onboarding.pawnInterest.calcMode.${pawnCalcMode}.label`, { defaultValue: pawnCalcMode })}
              />
              <InfoRow
                icon="clock-outline"
                label={t('onboarding.step4.labelDueDate')}
                value={pawnDueDate ? t('onboarding.step4.dueDateValue', { days: pawnDueDate }) : '—'}
              />
            </ReviewSection>
          )}

          {/* Tables — read-only summary (F&B only) */}
          {isFnb && (
            <View className="mb-3">
              <View className="flex-row items-center justify-between mb-2">
                <Text className={`${typo.captionBold} text-gray-400 dark:text-gray-500 uppercase tracking-wide`}>
                  {t('onboarding.step4.sectionTables', { count: tables.length })}
                </Text>
                <TouchableOpacity onPress={() => navigation.navigate('TableSetup')}>
                  <Text className={`${typo.captionBold} text-primary`}>{t('onboarding.step4.editList')}</Text>
                </TouchableOpacity>
              </View>
              {tables.length === 0 ? (
                <View className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4">
                  <Text className={`${typo.caption} text-gray-400 dark:text-gray-500`}>
                    {t('onboarding.step4.noTables')}
                  </Text>
                </View>
              ) : (
                <View className="bg-gray-50 dark:bg-gray-800 rounded-2xl overflow-hidden">
                  {tables.slice(0, 5).map((tb, i) => (
                    <View
                      key={i}
                      className={`flex-row items-center px-4 py-3 ${
                        i < Math.min(tables.length, 5) - 1 ? 'border-b border-gray-100 dark:border-gray-700' : ''
                      }`}
                    >
                      <MaterialCommunityIcons name="table-chair" size={14} color="#6b7280" />
                      <Text className={`${typo.caption} flex-1 font-medium text-gray-700 dark:text-gray-200 ml-2`}>
                        {tb.tableNumber}
                      </Text>
                      <Text className={`${typo.caption} text-gray-400 dark:text-gray-500`}>
                        {t('onboarding.tableSetup.capacityHint', { count: tb.capacity })}
                      </Text>
                    </View>
                  ))}
                  {tables.length > 5 && (
                    <View className="px-4 py-2">
                      <Text className={`${typo.caption} text-gray-400 dark:text-gray-500`}>
                        +{tables.length - 5} {t('onboarding.step4.moreTables')}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}

          {/* Expenses — read-only summary */}
          <View className="mb-3">
            <TouchableOpacity
              onPress={() => setExpensesExpanded((v) => !v)}
              activeOpacity={0.7}
              className="flex-row items-center justify-between mb-2"
            >
              <View className="flex-row items-center gap-1.5">
                <Text className={`${typo.captionBold} text-gray-400 dark:text-gray-500 uppercase tracking-wide`}>
                  {t('onboarding.step4.sectionExpenses', { count: step3.expenses.length })}
                </Text>
                <MaterialCommunityIcons
                  name={expensesExpanded ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color="#9ca3af"
                />
              </View>
              <TouchableOpacity onPress={() => navigation.navigate('Step3')}>
                <Text className={`${typo.captionBold} text-primary`}>{t('onboarding.step4.editList')}</Text>
              </TouchableOpacity>
            </TouchableOpacity>

            {expensesExpanded && (step3.expenses.length === 0 ? (
              <View className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4">
                <Text className={`${typo.caption} text-gray-400 dark:text-gray-500`}>
                  {t('onboarding.step4.noExpenses')}
                </Text>
              </View>
            ) : (
              <View className="bg-gray-50 dark:bg-gray-800 rounded-2xl overflow-hidden">
                {step3.expenses.map((e, i) => (
                  <View
                    key={e.name}
                    className={`flex-row items-center px-4 py-3 gap-2 ${
                      i < step3.expenses.length - 1
                        ? 'border-b border-gray-100 dark:border-gray-700'
                        : ''
                    }`}
                  >
                    <Text className={`${typo.label}`}>{CATEGORY_EMOJI[e.category ?? ''] ?? '💰'}</Text>
                    <View className="flex-1 min-w-0">
                      <Text
                        className={`${typo.caption} text-gray-700 dark:text-gray-200 font-medium`}
                        numberOfLines={1}
                      >
                        {e.name}
                      </Text>
                      <View className="flex-row items-center gap-2 mt-0.5 flex-wrap">
                        {e.expenseType && (
                          <Text className={`${typo.caption} font-medium ${
                            e.expenseType === 'FIXED'
                              ? 'text-blue-500 dark:text-blue-400'
                              : 'text-orange-500 dark:text-orange-400'
                          }`}>
                            {t(`onboarding.step3.type.${e.expenseType}`)}
                          </Text>
                        )}
                        {e.paymentDate && (
                          <Text className={`${typo.caption} text-gray-400 dark:text-gray-500`}>
                            · {t('onboarding.step3.paymentDateChip', { day: e.paymentDate })}
                          </Text>
                        )}
                      </View>
                    </View>
                    <Text className={`${typo.caption} text-gray-500 dark:text-gray-400`}>
                      {e.monthlyAmount > 0 ? formatVnd(e.monthlyAmount) : '—'}
                    </Text>
                    <TouchableOpacity
                      onPress={() => removeExpense(e.name)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <MaterialCommunityIcons name="close" size={16} color="#9ca3af" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <View
        className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-900 px-6 pt-4 border-t border-gray-100 dark:border-gray-700"
        style={{ paddingBottom: insets.bottom + 16 }}
      >
        <TouchableOpacity
          className={`rounded-2xl py-4 items-center justify-center ${
            loading ? 'bg-gray-200 dark:bg-gray-700' : 'bg-primary active:opacity-80'
          }`}
          onPress={handleStart}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#4f46e5" />
          ) : (
            <Text className={`${typo.labelBold} text-white`}>{t('onboarding.step4.start')}</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

function ReviewSection({
  label,
  onEdit,
  children,
}: {
  label: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  const { t } = useTranslation();
  const typo = useTypography();
  return (
    <View className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4 mb-3">
      <View className="flex-row items-center justify-between mb-2">
        <Text className={`${typo.captionBold} text-gray-400 dark:text-gray-500 uppercase tracking-wide`}>
          {label}
        </Text>
        <TouchableOpacity onPress={onEdit}>
          <Text className={`${typo.captionBold} text-primary`}>{t('onboarding.common.edit')}</Text>
        </TouchableOpacity>
      </View>
      {children}
    </View>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  const typo = useTypography();
  return (
    <View className="flex-row items-center gap-2 py-1.5">
      <MaterialCommunityIcons name={icon as any} size={16} color="#6b7280" />
      <Text className={`${typo.caption} text-gray-400 dark:text-gray-500 w-24`}>{label}</Text>
      <Text className={`${typo.caption} text-gray-700 dark:text-gray-200 flex-1`} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}
