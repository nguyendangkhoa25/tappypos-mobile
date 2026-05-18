import { useState, useCallback, memo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useAlertStore } from '../../store/alertStore';
import { useToastStore } from '../../store/toastStore';
import { useErrorAlert } from '../../hooks/useErrorAlert';
import { comboApi, type ComboData } from '../../services/api';
import { useTypography } from '../../hooks/useTypography';
import { ErrorState } from '../../components/ErrorState';
import { ScreenSkeleton } from '../../components/ScreenSkeleton';
import { formatVnd } from '../../utils/format';
import type { ComboScreenProps } from '../../types/navigation';

export function ComboListScreen({ navigation }: ComboScreenProps<'ComboList'>) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const typo = useTypography();
  const qc = useQueryClient();
  const { show: showAlert } = useAlertStore();
  const { show: showToast } = useToastStore();
  const showErrorAlert = useErrorAlert();
  const [showActive, setShowActive] = useState<boolean | undefined>(true);
  const [search, setSearch] = useState('');

  const [isManualRefreshing, setIsManualRefreshing] = useState(false);

  const { data: combos = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['combos', showActive],
    queryFn: () => comboApi.list(showActive).then((r) => r.data.data),
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
  });

  const onRefresh = useCallback(async () => {
    setIsManualRefreshing(true);
    await refetch();
    setIsManualRefreshing(false);
  }, [refetch]);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => comboApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['combos'] });
      showToast(t('combos.deleteSuccess'));
    },
    onError: showErrorAlert,
  });

  const toggleMutation = useMutation({
    mutationFn: (combo: ComboData) => comboApi.update(combo.id, { active: !combo.active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['combos'] }),
    onError: showErrorAlert,
  });

  const handleDelete = (combo: ComboData) => {
    showAlert(t('combos.deleteTitle'), t('combos.deleteMsg'), [
      { label: t('common.cancel'), style: 'cancel' },
      { label: t('combos.deleteConfirm'), style: 'destructive', onPress: () => deleteMutation.mutate(combo.id) },
    ]);
  };

  const filters: { active: boolean | undefined; labelKey: string }[] = [
    { active: undefined, labelKey: 'filterAll' },
    { active: true, labelKey: 'filterActive' },
    { active: false, labelKey: 'filterHidden' },
  ];

  const displayedCombos = search.trim()
    ? combos.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.description ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : combos;

  const savings = (combo: ComboData) => combo.totalIndividualPrice - combo.price;

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <View
        className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4"
        style={{ paddingTop: insets.top + 12, paddingBottom: 0 }}
      >
        <View className="flex-row items-center justify-between mb-0.5">
          <View className="flex-row items-center flex-1">
            <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} className="mr-3">
              <MaterialCommunityIcons name="chevron-left" size={26} color="#4f46e5" />
            </TouchableOpacity>
            <Text className={`${typo.heading} text-gray-900 dark:text-white flex-1`}>{t('combos.title')}</Text>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate('ComboEdit', {})}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons name="plus" size={24} color="#4f46e5" />
          </TouchableOpacity>
        </View>
        <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 mb-3`}>{t('combos.hint')}</Text>
        {/* Search */}
        <View className="flex-row items-center bg-gray-100 dark:bg-gray-700 rounded-xl px-3 py-2.5 mb-3">
          <MaterialCommunityIcons name="magnify" size={20} color="#9ca3af" />
          <TextInput
            className={`flex-1 ml-2 ${typo.inputSize} text-gray-800 dark:text-gray-100`}
            placeholder={t('combos.searchPlaceholder')}
            placeholderTextColor="#9ca3af"
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialCommunityIcons name="close-circle" size={18} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>
        <View className="flex-row gap-2 pb-3">
          {filters.map((f) => {
            const active = showActive === f.active;
            return (
              <TouchableOpacity
                key={String(f.active)}
                onPress={() => setShowActive(f.active)}
                className={`px-4 py-1.5 rounded-full border ${active ? 'bg-indigo-600 border-indigo-600' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600'}`}
              >
                <Text className={`${typo.caption} font-medium ${active ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                  {t(`combos.${f.labelKey}`)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {isError ? (
        <ErrorState onRetry={refetch} />
      ) : isLoading ? (
        <ScreenSkeleton count={4} cardHeight={110} />
      ) : displayedCombos.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text style={{ fontSize: 56 }}>🍱</Text>
          <Text className={`${typo.body} text-gray-400 mt-4 text-center`}>
            {search.trim() ? t('combos.noResults') : t('combos.empty')}
          </Text>
          {!search.trim() && (
            <>
              <Text className={`${typo.caption} text-gray-400 mt-1 text-center`}>{t('combos.emptyHint')}</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('ComboEdit', {})}
                className="mt-6 bg-indigo-600 px-6 py-3 rounded-2xl"
              >
                <Text className={`${typo.label} text-white`}>{t('combos.addBtn')}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      ) : (
        <FlatList
          showsVerticalScrollIndicator={false}
          data={displayedCombos}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          refreshing={isManualRefreshing}
          onRefresh={onRefresh}
          renderItem={({ item }) => {
            const saving = savings(item);
            return (
              <View className={`bg-white dark:bg-gray-800 rounded-2xl p-4 ${!item.active ? 'opacity-60' : ''}`}>
                <View className="flex-row items-start justify-between mb-2">
                  <View className="flex-1 mr-2">
                    <Text className={`${typo.labelBold} text-gray-900 dark:text-white`}>{item.name}</Text>
                    {item.description ? (
                      <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 mt-0.5`}>{item.description}</Text>
                    ) : null}
                  </View>
                  <View className="flex-row gap-2 items-center">
                    <TouchableOpacity
                      onPress={() => navigation.navigate('ComboEdit', { comboId: item.id })}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <MaterialCommunityIcons name="pencil-outline" size={20} color="#6b7280" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDelete(item)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <MaterialCommunityIcons name="trash-can-outline" size={20} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>
                <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 mb-2`} numberOfLines={1}>
                  {item.items.map((i) => i.productName).join(' · ')}
                </Text>
                <View className="flex-row items-center justify-between">
                  <Text className={`${typo.labelBold} text-indigo-600`}>{formatVnd(item.price)}</Text>
                  {saving > 0 && (
                    <View className="bg-indigo-50 dark:bg-indigo-900/20 px-2.5 py-1 rounded-full">
                      <Text className={`${typo.captionBold} text-indigo-700 dark:text-indigo-400`}>
                        {t('combos.savings', { amount: formatVnd(saving) })}
                      </Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity
                  onPress={() => toggleMutation.mutate(item)}
                  className="mt-3 border border-gray-200 dark:border-gray-600 rounded-xl py-2 items-center"
                >
                  <Text className={`${typo.caption} text-gray-600 dark:text-gray-400`}>
                    {item.active ? t('combos.filterHidden') : t('combos.filterActive')}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}
