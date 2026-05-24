import { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  ScrollView,
  Modal,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  RefreshControl,
  ActionSheetIOS,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { tableApi, type ShopTable } from '../../services/api';
import { useCartStore } from '../../store/cartStore';
import { useErrorAlert } from '../../hooks/useErrorAlert';
import { useTypography } from '../../hooks/useTypography';
import { formatVnd } from '../../utils/format';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { SellingStackParamList } from '../../types/navigation';

type Nav = NativeStackNavigationProp<SellingStackParamList>;

const STATUS_STYLES: Record<ShopTable['status'], {
  card: string; badge: string; badgeText: string; icon: string; iconColor: string;
}> = {
  AVAILABLE: {
    card: 'bg-white dark:bg-gray-800 border-2 border-green-400 dark:border-green-500',
    badge: 'bg-green-100 dark:bg-green-900/40',
    badgeText: 'text-green-700 dark:text-green-400',
    icon: 'table-chair',
    iconColor: '#16a34a',
  },
  OCCUPIED: {
    card: 'bg-red-50 dark:bg-red-900/20 border-2 border-red-400 dark:border-red-500',
    badge: 'bg-red-100 dark:bg-red-900/40',
    badgeText: 'text-red-700 dark:text-red-400',
    icon: 'account-multiple',
    iconColor: '#dc2626',
  },
  RESERVED: {
    card: 'bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-400 dark:border-amber-500',
    badge: 'bg-amber-100 dark:bg-amber-900/40',
    badgeText: 'text-amber-700 dark:text-amber-400',
    icon: 'clock-outline',
    iconColor: '#d97706',
  },
  CLEANING: {
    card: 'bg-gray-50 dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600',
    badge: 'bg-gray-100 dark:bg-gray-700',
    badgeText: 'text-gray-500 dark:text-gray-400',
    icon: 'broom',
    iconColor: '#9ca3af',
  },
};

function formatElapsed(minutes: number): string {
  if (minutes < 60) return `${minutes}p`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}g${m}p` : `${h}g`;
}

/** Parse "HH:MM" from a Date and return "HH:MM" string. */
function formatTimeHHMM(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function TableGridScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const typo = useTypography();
  const navigation = useNavigation<Nav>();
  const qc = useQueryClient();
  const { setTable, setActiveOrderId, setTakeaway } = useCartStore((s) => ({
    setTable: s.setTable,
    setActiveOrderId: s.setActiveOrderId,
    setTakeaway: s.setTakeaway,
  }));
  const showErrorAlert = useErrorAlert();

  // ── Create table modal ─────────────────────────────────────────────────────
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [fabVisible, setFabVisible] = useState(false);
  const [newNumber, setNewNumber] = useState('');
  const [newCapacity, setNewCapacity] = useState('4');
  const [newLocation, setNewLocation] = useState('');

  // ── Takeaway modal ─────────────────────────────────────────────────────────
  const [takeawayModalVisible, setTakeawayModalVisible] = useState(false);
  const [takeawayPickupTime, setTakeawayPickupTime] = useState('');
  const [takeawayNote, setTakeawayNote] = useState('');

  // ── Reserve table modal ────────────────────────────────────────────────────
  const [reserveModalVisible, setReserveModalVisible] = useState(false);
  const [reserveTable, setReserveTable] = useState<ShopTable | null>(null);
  const [reserveName, setReserveName] = useState('');
  const [reserveTime, setReserveTime] = useState('');

  const { data: tables = [], isLoading, refetch } = useQuery({
    queryKey: ['tables'],
    queryFn: () => tableApi.list().then((r) => r.data.data),
    staleTime: 30_000,
  });

  // Refresh table statuses whenever this screen comes into focus
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const createMutation = useMutation({
    mutationFn: () =>
      tableApi.create({
        tableNumber: newNumber.trim(),
        capacity: parseInt(newCapacity, 10) || 4,
        location: newLocation.trim() || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tables'] });
      setFabVisible(false);
      setNewNumber('');
      setNewCapacity('4');
      setNewLocation('');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: showErrorAlert,
  });

  const setStatusMutation = useMutation({
    mutationFn: (payload: { id: number; status: ShopTable['status']; reservedFor?: string; reservedTime?: string }) =>
      tableApi.setStatus(payload.id, {
        status: payload.status,
        reservedFor: payload.reservedFor,
        reservedTime: payload.reservedTime,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tables'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: showErrorAlert,
  });

  const locations = useMemo(() => {
    const locs = [...new Set(tables.map((t) => t.location).filter(Boolean))] as string[];
    return locs;
  }, [tables]);

  const filtered = useMemo(
    () => (!selectedLocation ? tables : tables.filter((t) => t.location === selectedLocation)),
    [tables, selectedLocation],
  );

  // Status counts for the summary bar
  const counts = useMemo(() => ({
    available: tables.filter((t) => t.status === 'AVAILABLE').length,
    occupied: tables.filter((t) => t.status === 'OCCUPIED').length,
    other: tables.filter((t) => t.status === 'RESERVED' || t.status === 'CLEANING').length,
  }), [tables]);

  const handleTablePress = (table: ShopTable) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (table.status === 'OCCUPIED' && table.currentOrderId) {
      // Open FnBServiceScreen in "add more" mode — staff can add items to the pending order
      setActiveOrderId(String(table.currentOrderId));
      setTable(table.id, table.tableNumber);
      return;
    }
    if (table.status === 'AVAILABLE') {
      setActiveOrderId(null);
      setTable(table.id, table.tableNumber);
    }
  };

  const handleTableLongPress = (table: ShopTable) => {
    if (table.status === 'OCCUPIED') return; // Can't change status while occupied

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const options: string[] = [];
    const actions: (() => void)[] = [];

    if (table.status !== 'RESERVED') {
      options.push(t('tableGrid.markReserved'));
      actions.push(() => {
        setReserveTable(table);
        setReserveName('');
        setReserveTime('');
        setReserveModalVisible(true);
      });
    }
    if (table.status !== 'CLEANING') {
      options.push(t('tableGrid.markCleaning'));
      actions.push(() => setStatusMutation.mutate({ id: table.id, status: 'CLEANING' }));
    }
    if (table.status !== 'AVAILABLE') {
      options.push(t('tableGrid.markAvailable'));
      actions.push(() => setStatusMutation.mutate({ id: table.id, status: 'AVAILABLE' }));
    }
    options.push(t('common.cancel'));

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: `${t('tableGrid.tableActions')}: ${table.tableNumber}`,
          options,
          cancelButtonIndex: options.length - 1,
          destructiveButtonIndex: undefined,
        },
        (idx) => {
          if (idx < actions.length) actions[idx]();
        },
      );
    } else {
      // Android: use a simple Alert with buttons
      Alert.alert(
        `${table.tableNumber}`,
        t('tableGrid.tableActions'),
        [
          ...actions.map((action, i) => ({ text: options[i], onPress: action })),
          { text: t('common.cancel'), style: 'cancel' as const },
        ],
      );
    }
  };

  // ── Takeaway FAB handler ───────────────────────────────────────────────────
  const handleOpenTakeaway = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTakeawayPickupTime('');
    setTakeawayNote('');
    setTakeawayModalVisible(true);
  };

  const handleStartTakeaway = () => {
    // Build ISO string from HH:MM input if provided
    let pickupIso: string | null = null;
    if (takeawayPickupTime.trim()) {
      const [hh, mm] = takeawayPickupTime.split(':').map(Number);
      if (!isNaN(hh) && !isNaN(mm)) {
        const d = new Date();
        d.setHours(hh, mm, 0, 0);
        // If the time has already passed today, assume tomorrow
        if (d <= new Date()) d.setDate(d.getDate() + 1);
        pickupIso = d.toISOString();
      }
    }
    setTakeaway(pickupIso);
    setTakeawayModalVisible(false);
    // POSMainScreen re-renders FnBServiceScreen automatically when isTakeaway becomes true
  };

  // ── Reserve table confirm ──────────────────────────────────────────────────
  const handleConfirmReserve = () => {
    if (!reserveTable) return;
    setStatusMutation.mutate({
      id: reserveTable.id,
      status: 'RESERVED',
      reservedFor: reserveName.trim(),
      reservedTime: reserveTime.trim() || undefined,
    });
    setReserveModalVisible(false);
  };

  const renderTable = ({ item: table }: { item: ShopTable }) => {
    const styles = STATUS_STYLES[table.status];
    const tappable =
      table.status === 'AVAILABLE' ||
      (table.status === 'OCCUPIED' && !!table.currentOrderId);

    return (
      <TouchableOpacity
        onPress={() => handleTablePress(table)}
        onLongPress={() => handleTableLongPress(table)}
        disabled={!tappable && table.status !== 'RESERVED' && table.status !== 'CLEANING'}
        activeOpacity={tappable ? 0.75 : 0.9}
        className={`rounded-2xl p-3 m-1 flex-1 ${styles.card}`}
        style={{ minHeight: 108, opacity: tappable ? 1 : 0.7 }}
      >
        {/* Table icon + name */}
        <View className="flex-row items-center gap-1.5 mb-1">
          <MaterialCommunityIcons name={styles.icon as never} size={14} color={styles.iconColor} />
          <Text className={`${typo.label} text-gray-900 dark:text-white flex-1`} numberOfLines={1}>
            {table.tableNumber}
          </Text>
        </View>

        <Text className={`${typo.caption} text-gray-400 dark:text-gray-500`}>
          {t('tableGrid.capacity', { count: table.capacity })}
        </Text>

        {/* Status + order/reservation info */}
        <View className="mt-auto pt-2 gap-1">
          <View className={`rounded-full px-2 py-0.5 self-start ${styles.badge}`}>
            <Text className={`${typo.captionBold} ${styles.badgeText}`}>
              {t(`tableGrid.status.${table.status.toLowerCase()}`)}
            </Text>
          </View>

          {table.status === 'OCCUPIED' && (
            <>
              {table.currentOrderNumber && (
                <Text className={`${typo.captionBold} text-red-600 dark:text-red-400`} numberOfLines={1}>
                  #{table.currentOrderNumber}
                </Text>
              )}
              {table.currentOrderTotal != null && table.currentOrderTotal > 0 && (
                <Text className={`${typo.captionBold} text-indigo-600 dark:text-indigo-400`} numberOfLines={1}>
                  {formatVnd(table.currentOrderTotal)}
                </Text>
              )}
              {table.elapsedMinutes != null && table.elapsedMinutes > 0 && (
                <Text className={`${typo.caption} text-gray-400 dark:text-gray-500`}>
                  ⏱ {formatElapsed(table.elapsedMinutes)}
                </Text>
              )}
            </>
          )}

          {table.status === 'RESERVED' && (
            <>
              {table.reservedFor && (
                <Text className={`${typo.captionBold} text-amber-700 dark:text-amber-400`} numberOfLines={1}>
                  👤 {table.reservedFor}
                </Text>
              )}
              {table.reservedTime && (
                <Text className={`${typo.caption} text-amber-600 dark:text-amber-500`}>
                  🕐 {table.reservedTime}
                </Text>
              )}
            </>
          )}
        </View>

        {/* Long-press hint for non-occupied tables */}
        {table.status !== 'OCCUPIED' && (
          <Text className={`${typo.caption} text-gray-300 dark:text-gray-600 text-right text-xs mt-1`}>
            ···
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
        <Text className={`${typo.heading} text-gray-900 dark:text-white flex-1`}>
          {t('tableGrid.title')}
        </Text>
        {/* Status summary chips */}
        {tables.length > 0 && (
          <View className="flex-row gap-2 mr-2">
            <View className="flex-row items-center gap-1">
              <View className="w-2 h-2 rounded-full bg-green-400" />
              <Text className={`${typo.captionBold} text-gray-600 dark:text-gray-300`}>{counts.available}</Text>
            </View>
            <View className="flex-row items-center gap-1">
              <View className="w-2 h-2 rounded-full bg-red-400" />
              <Text className={`${typo.captionBold} text-gray-600 dark:text-gray-300`}>{counts.occupied}</Text>
            </View>
            {counts.other > 0 && (
              <View className="flex-row items-center gap-1">
                <View className="w-2 h-2 rounded-full bg-gray-400" />
                <Text className={`${typo.captionBold} text-gray-600 dark:text-gray-300`}>{counts.other}</Text>
              </View>
            )}
          </View>
        )}
        <TouchableOpacity
          onPress={() => navigation.navigate('KitchenDisplay')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          className="p-1 mr-1"
          accessibilityLabel={t('tableGrid.kitchenDisplay')}
        >
          <MaterialCommunityIcons name="chef-hat" size={22} color="#4f46e5" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onRefresh}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          className="p-1"
        >
          <MaterialCommunityIcons name="refresh" size={20} color="#6b7280" />
        </TouchableOpacity>
      </View>

      {/* Location filter tabs */}
      {locations.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700"
          contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8, gap: 8 }}
        >
          <TouchableOpacity
            onPress={() => setSelectedLocation(null)}
            className={`rounded-full px-3 py-1.5 border ${
              !selectedLocation
                ? 'bg-primary border-primary'
                : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600'
            }`}
          >
            <Text className={`${typo.captionBold} ${!selectedLocation ? 'text-white' : 'text-gray-600 dark:text-gray-300'}`}>
              {t('tableGrid.allAreas')}
            </Text>
          </TouchableOpacity>
          {locations.map((loc) => (
            <TouchableOpacity
              key={loc}
              onPress={() => setSelectedLocation(loc === selectedLocation ? null : loc)}
              className={`rounded-full px-3 py-1.5 border ${
                selectedLocation === loc
                  ? 'bg-primary border-primary'
                  : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600'
              }`}
            >
              <Text className={`${typo.captionBold} ${selectedLocation === loc ? 'text-white' : 'text-gray-600 dark:text-gray-300'}`}>
                {loc}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Table grid */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#4f46e5" />
        </View>
      ) : filtered.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <MaterialCommunityIcons name="table-chair" size={56} color="#d1d5db" />
          <Text className={`${typo.body} text-gray-400 dark:text-gray-500 text-center mt-3`}>
            {t('tableGrid.noTables')}
          </Text>
          <TouchableOpacity
            onPress={() => setFabVisible(true)}
            className="mt-4 bg-primary rounded-2xl px-6 py-3"
          >
            <Text className={`${typo.labelBold} text-white`}>{t('tableGrid.addFirstTable')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderTable}
          keyExtractor={(item) => String(item.id)}
          numColumns={3}
          contentContainerStyle={{ padding: 8, paddingBottom: insets.bottom + 100 }}
          showsVerticalScrollIndicator={false}
          columnWrapperStyle={{ alignItems: 'stretch' }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#059669" />
          }
        />
      )}

      {/* FABs — takeaway (🛵) + add table (+) */}
      <View
        className="absolute right-5 gap-3 items-center"
        style={{ bottom: insets.bottom + 16 }}
      >
        {/* Takeaway FAB */}
        <TouchableOpacity
          onPress={handleOpenTakeaway}
          className="bg-amber-500 rounded-full w-12 h-12 items-center justify-center shadow-lg"
          accessibilityLabel={t('tableGrid.takeaway')}
        >
          <MaterialCommunityIcons name="moped" size={22} color="#fff" />
        </TouchableOpacity>

        {/* Add table FAB */}
        <TouchableOpacity
          onPress={() => setFabVisible(true)}
          className="bg-primary rounded-full w-14 h-14 items-center justify-center shadow-lg"
        >
          <MaterialCommunityIcons name="plus" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* ── Quick-create table modal ─────────────────────────────────────── */}
      <Modal
        visible={fabVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFabVisible(false)}
      >
        <TouchableOpacity
          className="flex-1 bg-black/40"
          activeOpacity={1}
          onPress={() => setFabVisible(false)}
        />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View
            className="bg-white dark:bg-gray-800 rounded-t-3xl px-6 pt-5"
            style={{ paddingBottom: insets.bottom + 24 }}
          >
            <View className="w-10 h-1 bg-gray-200 dark:bg-gray-600 rounded-full self-center mb-4" />
            <Text className={`${typo.section} text-gray-900 dark:text-white mb-4`}>
              {t('tableGrid.addTable')}
            </Text>

            <Text className={`${typo.captionBold} text-gray-500 dark:text-gray-400 mb-1.5`}>
              {t('tableGrid.tableNumber')}
            </Text>
            <TextInput
              value={newNumber}
              onChangeText={setNewNumber}
              placeholder={t('tableGrid.tableNumberPlaceholder')}
              placeholderTextColor="#9ca3af"
              className={`border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 ${typo.inputSize} text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 mb-3`}
              autoCapitalize="words"
              autoFocus
            />

            <View className="flex-row gap-3 mb-4">
              <View className="flex-1">
                <Text className={`${typo.captionBold} text-gray-500 dark:text-gray-400 mb-1.5`}>
                  {t('tableGrid.capacityLabel')}
                </Text>
                <TextInput
                  value={newCapacity}
                  onChangeText={setNewCapacity}
                  keyboardType="numeric"
                  placeholderTextColor="#9ca3af"
                  className={`border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 ${typo.inputSize} text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700`}
                />
              </View>
              <View className="flex-1">
                <Text className={`${typo.captionBold} text-gray-500 dark:text-gray-400 mb-1.5`}>
                  {t('tableGrid.area')}
                </Text>
                <TextInput
                  value={newLocation}
                  onChangeText={setNewLocation}
                  placeholder={t('tableGrid.areaPlaceholder')}
                  placeholderTextColor="#9ca3af"
                  className={`border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 ${typo.inputSize} text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700`}
                />
              </View>
            </View>

            <TouchableOpacity
              onPress={() => createMutation.mutate()}
              disabled={!newNumber.trim() || createMutation.isPending}
              className={`rounded-2xl py-4 items-center ${
                newNumber.trim() && !createMutation.isPending
                  ? 'bg-primary active:opacity-80'
                  : 'bg-gray-200 dark:bg-gray-700'
              }`}
            >
              {createMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className={`${typo.labelBold} ${newNumber.trim() ? 'text-white' : 'text-gray-400'}`}>
                  {t('tableGrid.addTable')}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Takeaway order modal ─────────────────────────────────────────── */}
      <Modal
        visible={takeawayModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setTakeawayModalVisible(false)}
      >
        <TouchableOpacity
          className="flex-1 bg-black/40"
          activeOpacity={1}
          onPress={() => setTakeawayModalVisible(false)}
        />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View
            className="bg-white dark:bg-gray-800 rounded-t-3xl px-6 pt-5"
            style={{ paddingBottom: insets.bottom + 24 }}
          >
            <View className="w-10 h-1 bg-gray-200 dark:bg-gray-600 rounded-full self-center mb-4" />

            {/* Title row */}
            <View className="flex-row items-center gap-2 mb-4">
              <View className="w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-900/40 items-center justify-center">
                <MaterialCommunityIcons name="moped" size={20} color="#d97706" />
              </View>
              <Text className={`${typo.section} text-gray-900 dark:text-white`}>
                {t('tableGrid.takeaway')}
              </Text>
            </View>

            {/* Pickup time */}
            <Text className={`${typo.captionBold} text-gray-500 dark:text-gray-400 mb-1.5`}>
              {t('tableGrid.pickupTime')} <Text className={`${typo.caption} text-gray-400`}>({t('common.optional')})</Text>
            </Text>
            <TextInput
              value={takeawayPickupTime}
              onChangeText={setTakeawayPickupTime}
              placeholder="14:30"
              placeholderTextColor="#9ca3af"
              keyboardType="numbers-and-punctuation"
              className={`border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 ${typo.inputSize} text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 mb-3`}
            />

            {/* Note */}
            <Text className={`${typo.captionBold} text-gray-500 dark:text-gray-400 mb-1.5`}>
              {t('common.note')} <Text className={`${typo.caption} text-gray-400`}>({t('common.optional')})</Text>
            </Text>
            <TextInput
              value={takeawayNote}
              onChangeText={setTakeawayNote}
              placeholder={t('tableGrid.takeawayNotePlaceholder')}
              placeholderTextColor="#9ca3af"
              className={`border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 ${typo.inputSize} text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 mb-4`}
            />

            <TouchableOpacity
              onPress={handleStartTakeaway}
              className="bg-amber-500 active:opacity-80 rounded-2xl py-4 items-center"
            >
              <Text className={`${typo.labelBold} text-white`}>
                {t('tableGrid.startTakeawayOrder')}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Reserve table modal ──────────────────────────────────────────── */}
      <Modal
        visible={reserveModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setReserveModalVisible(false)}
      >
        <TouchableOpacity
          className="flex-1 bg-black/40"
          activeOpacity={1}
          onPress={() => setReserveModalVisible(false)}
        />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View
            className="bg-white dark:bg-gray-800 rounded-t-3xl px-6 pt-5"
            style={{ paddingBottom: insets.bottom + 24 }}
          >
            <View className="w-10 h-1 bg-gray-200 dark:bg-gray-600 rounded-full self-center mb-4" />
            <Text className={`${typo.section} text-gray-900 dark:text-white mb-1`}>
              {t('tableGrid.reserveTable')}
            </Text>
            {reserveTable && (
              <Text className={`${typo.caption} text-gray-400 dark:text-gray-500 mb-4`}>
                {reserveTable.tableNumber}
              </Text>
            )}

            <Text className={`${typo.captionBold} text-gray-500 dark:text-gray-400 mb-1.5`}>
              {t('tableGrid.reservedForLabel')}
            </Text>
            <TextInput
              value={reserveName}
              onChangeText={setReserveName}
              placeholder={t('tableGrid.reservedForPlaceholder')}
              placeholderTextColor="#9ca3af"
              className={`border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 ${typo.inputSize} text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 mb-3`}
              autoFocus
            />

            <Text className={`${typo.captionBold} text-gray-500 dark:text-gray-400 mb-1.5`}>
              {t('tableGrid.reservedTimeLabel')} <Text className={`${typo.caption} text-gray-400`}>({t('common.optional')})</Text>
            </Text>
            <TextInput
              value={reserveTime}
              onChangeText={setReserveTime}
              placeholder="19:00"
              placeholderTextColor="#9ca3af"
              keyboardType="numbers-and-punctuation"
              className={`border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 ${typo.inputSize} text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 mb-4`}
            />

            <TouchableOpacity
              onPress={handleConfirmReserve}
              disabled={!reserveName.trim() || setStatusMutation.isPending}
              className={`rounded-2xl py-4 items-center ${
                reserveName.trim() && !setStatusMutation.isPending
                  ? 'bg-amber-500 active:opacity-80'
                  : 'bg-gray-200 dark:bg-gray-700'
              }`}
            >
              {setStatusMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className={`${typo.labelBold} ${reserveName.trim() ? 'text-white' : 'text-gray-400'}`}>
                  {t('tableGrid.confirmReserve')}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
