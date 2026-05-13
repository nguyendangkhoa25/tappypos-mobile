import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useQuery } from '@tanstack/react-query';
import { useCartStore } from '../../store/cartStore';
import { cartApi, customerApi, type CustomerData } from '../../services/api';
import { useAlertStore } from '../../store/alertStore';
import { useErrorAlert } from '../../hooks/useErrorAlert';
import { useFeatureCheck } from '../../hooks/useFeature';
import { formatVnd } from '../../utils/format';
import { MoneyInput } from '../../components/MoneyInput';
import { EmptyState } from '../../components/EmptyState';
import type { POSScreenProps } from '../../types/navigation';

export function CartScreen({ navigation }: POSScreenProps<'Cart'>) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const has = useFeatureCheck();
  const { items, updateQty, updatePrice, removeItem, discount, getTotal, clearCart, selectedCustomer, setCustomer } = useCartStore();
  const { show: showAlert } = useAlertStore();
  const showErrorAlert = useErrorAlert();
  const [saving, setSaving] = useState(false);
  const total = getTotal();
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);

  // Customer picker sheet
  const [customerSheet, setCustomerSheet] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');

  // Price edit sheet
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState('');

  const { data: recentCustomers = [] } = useQuery({
    queryKey: ['customers', 'recent'],
    queryFn: () => customerApi.recent(5).then((r) => r.data.data),
    staleTime: 60_000,
    enabled: has('CUSTOMER') && customerSheet,
  });

  const { data: searchResults = [] } = useQuery({
    queryKey: ['customers', 'search', customerSearch],
    queryFn: () =>
      customerApi.list({ search: customerSearch, size: 10 }).then((r) => r.data.data.content),
    staleTime: 30_000,
    enabled: has('CUSTOMER') && customerSearch.length >= 2,
  });

  const displayCustomers = customerSearch.length >= 2 ? searchResults : recentCustomers;

  const handleSaveOrder = async () => {
    setSaving(true);
    try {
      const initRes = await cartApi.init();
      const cartId = initRes.data.data.cartId;
      for (const item of items) {
        await cartApi.addItem(cartId, item.productId, item.quantity);
      }
      await cartApi.sendToKitchen(cartId);
      clearCart();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    } catch (err) {
      showErrorAlert(err);
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = useCallback((productId: string, name: string) => {
    showAlert(
      t('pos.removeItem'),
      name,
      [
        { label: t('common.cancel'), style: 'cancel' },
        {
          label: t('common.confirm'),
          style: 'destructive',
          onPress: () => {
            removeItem(productId);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          },
        },
      ],
    );
  }, [t, removeItem, showAlert]);

  const openPriceEdit = (productId: string, currentPrice: number) => {
    setEditingItem(productId);
    setEditPrice(String(currentPrice));
  };

  const confirmPriceEdit = () => {
    if (!editingItem) return;
    const price = parseInt(editPrice, 10) || 0;
    updatePrice(editingItem, price);
    setEditingItem(null);
  };

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 border-b border-gray-100">
        <TouchableOpacity className="mr-3 p-1" onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#374151" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900 flex-1">{t('pos.cart')}</Text>
        <Text className="text-sm text-gray-500">{t('pos.itemCount', { count: items.length })}</Text>
      </View>

      {items.length === 0 ? (
        <EmptyState
          icon="🛒"
          title={t('pos.emptyCart')}
          description={t('pos.emptyCartHint')}
          actionLabel={t('pos.title')}
          onAction={() => navigation.goBack()}
        />
      ) : (
        <>
          {/* Customer picker — prominent, full-width */}
          {has('CUSTOMER') && (
            <TouchableOpacity
              className="mx-4 mt-4 rounded-2xl border-2 border-primary bg-primary-light px-4 py-4 flex-row items-center active:opacity-80"
              onPress={() => setCustomerSheet(true)}
            >
              <View className="w-10 h-10 rounded-full bg-primary items-center justify-center mr-3">
                <MaterialCommunityIcons name="account" size={20} color="white" />
              </View>
              <View className="flex-1">
                <Text className="text-xs font-semibold text-primary uppercase tracking-wide mb-0.5">
                  {t('pos.customer')}
                </Text>
                <Text className="text-base font-bold text-gray-900">
                  {selectedCustomer ? selectedCustomer.name : t('pos.walkIn')}
                </Text>
                {selectedCustomer && (
                  <Text className="text-xs text-gray-500">{selectedCustomer.phone}</Text>
                )}
              </View>
              <MaterialCommunityIcons
                name={selectedCustomer ? 'pencil-outline' : 'chevron-right'}
                size={20}
                color="#4f46e5"
              />
            </TouchableOpacity>
          )}

          <FlatList
            data={items}
            keyExtractor={(item) => item.productId}
            className="flex-1 mt-2"
            renderItem={({ item }) => (
              <View className="flex-row items-center px-4 py-4 border-b border-gray-50">
                <View className="flex-1">
                  <Text className="font-semibold text-gray-800" numberOfLines={2}>
                    {item.name}
                  </Text>
                  {/* Tap price to edit */}
                  <TouchableOpacity
                    onPress={() => openPriceEdit(item.productId, item.price)}
                    className="self-start mt-0.5"
                  >
                    <View className="flex-row items-center gap-1">
                      <Text className="text-sm text-primary font-bold">
                        {formatVnd(item.price)}
                      </Text>
                      <MaterialCommunityIcons name="pencil-outline" size={12} color="#4f46e5" />
                    </View>
                  </TouchableOpacity>
                </View>

                {/* Qty controls */}
                <View className="flex-row items-center gap-1 mx-3">
                  <TouchableOpacity
                    className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center active:opacity-70"
                    onPress={() => {
                      if (item.quantity === 1) {
                        handleRemove(item.productId, item.name);
                      } else {
                        updateQty(item.productId, item.quantity - 1);
                      }
                    }}
                  >
                    <MaterialCommunityIcons
                      name={item.quantity === 1 ? 'trash-can-outline' : 'minus'}
                      size={16}
                      color={item.quantity === 1 ? '#ef4444' : '#374151'}
                    />
                  </TouchableOpacity>

                  <Text className="w-8 text-center font-bold text-gray-800 text-base">
                    {item.quantity}
                  </Text>

                  <TouchableOpacity
                    testID={`qty-plus-${item.productId}`}
                    className="w-8 h-8 rounded-full bg-primary-light items-center justify-center active:opacity-70"
                    onPress={() => updateQty(item.productId, item.quantity + 1)}
                  >
                    <MaterialCommunityIcons name="plus" size={16} color="#4f46e5" />
                  </TouchableOpacity>
                </View>

                {/* Line total */}
                <Text className="w-24 text-right font-semibold text-gray-800">
                  {formatVnd(item.price * item.quantity)}
                </Text>
              </View>
            )}
          />

          {/* Summary + checkout */}
          <View
            className="bg-white border-t border-gray-100 px-4 pt-4"
            style={{ paddingBottom: insets.bottom + 16 }}
          >
            {discount > 0 && (
              <>
                <View className="flex-row justify-between mb-1">
                  <Text className="text-gray-500">{t('orders.subtotal')}</Text>
                  <Text className="text-gray-700">{formatVnd(subtotal)}</Text>
                </View>
                <View className="flex-row justify-between mb-2">
                  <Text className="text-gray-500">{t('pos.discount')}</Text>
                  <Text className="text-warning font-semibold">-{formatVnd(discount)}</Text>
                </View>
              </>
            )}

            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-lg font-bold text-gray-900">{t('pos.total')}</Text>
              <Text className="text-2xl font-bold text-primary">{formatVnd(total)}</Text>
            </View>

            <TouchableOpacity
              testID="cart-save-order-btn"
              className="rounded-2xl py-3.5 items-center active:opacity-80 border border-primary mb-3 flex-row justify-center"
              onPress={handleSaveOrder}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#4f46e5" />
              ) : (
                <>
                  <MaterialCommunityIcons name="content-save-outline" size={18} color="#4f46e5" style={{ marginRight: 6 }} />
                  <Text className="text-primary font-bold text-base">{t('pos.saveOrder')}</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-primary rounded-2xl py-4 items-center active:opacity-80"
              onPress={() => navigation.navigate('Checkout')}
            >
              <Text className="text-white font-bold text-lg">{t('pos.checkout')}</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Customer picker sheet */}
      <Modal
        visible={customerSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setCustomerSheet(false)}
      >
        <TouchableOpacity
          className="flex-1 bg-black/40"
          activeOpacity={1}
          onPress={() => setCustomerSheet(false)}
        />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View
            className="bg-white rounded-t-3xl px-5 pt-5"
            style={{ paddingBottom: insets.bottom + 24, maxHeight: '80%' }}
          >
            <View className="w-10 h-1 bg-gray-200 rounded-full self-center mb-4" />
            <Text className="text-lg font-bold text-gray-900 mb-4">{t('pos.selectCustomer')}</Text>

            {/* Walk-in — always first, prominent */}
            <TouchableOpacity
              className={`flex-row items-center p-4 rounded-2xl border-2 mb-3 ${
                !selectedCustomer ? 'border-primary bg-primary-light' : 'border-gray-200 bg-gray-50'
              }`}
              onPress={() => { setCustomer(null); setCustomerSheet(false); }}
            >
              <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${!selectedCustomer ? 'bg-primary' : 'bg-gray-300'}`}>
                <MaterialCommunityIcons name="account-outline" size={20} color="white" />
              </View>
              <View className="flex-1">
                <Text className={`font-bold text-base ${!selectedCustomer ? 'text-primary' : 'text-gray-700'}`}>
                  {t('pos.walkIn')}
                </Text>
                <Text className="text-xs text-gray-400">{t('pos.walkInHint')}</Text>
              </View>
              {!selectedCustomer && (
                <MaterialCommunityIcons name="check-circle" size={22} color="#4f46e5" />
              )}
            </TouchableOpacity>

            {/* Search */}
            <View className="flex-row items-center bg-gray-100 rounded-xl px-3 py-2.5 mb-3">
              <MaterialCommunityIcons name="magnify" size={18} color="#9ca3af" />
              <TextInput
                className="flex-1 ml-2 text-base text-gray-800"
                placeholder={t('pos.searchCustomer')}
                placeholderTextColor="#9ca3af"
                value={customerSearch}
                onChangeText={setCustomerSearch}
              />
            </View>

            {/* Customer list */}
            <FlatList
              data={displayCustomers}
              keyExtractor={(c) => c.id}
              style={{ maxHeight: 300 }}
              renderItem={({ item: c }) => {
                const active = selectedCustomer?.id === c.id;
                return (
                  <TouchableOpacity
                    className={`flex-row items-center p-3.5 rounded-xl mb-2 border ${
                      active ? 'border-primary bg-primary-light' : 'border-gray-100 bg-white'
                    }`}
                    onPress={() => {
                      setCustomer({ id: c.id, name: c.name, phone: c.phone });
                      setCustomerSheet(false);
                      setCustomerSearch('');
                    }}
                  >
                    <View className={`w-9 h-9 rounded-full items-center justify-center mr-3 ${active ? 'bg-primary' : 'bg-gray-200'}`}>
                      <Text className={`text-sm font-bold ${active ? 'text-white' : 'text-gray-600'}`}>
                        {c.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View className="flex-1">
                      <Text className={`font-semibold ${active ? 'text-primary' : 'text-gray-800'}`}>{c.name}</Text>
                      <Text className="text-xs text-gray-400">{c.phone}</Text>
                    </View>
                    {active && <MaterialCommunityIcons name="check-circle" size={20} color="#4f46e5" />}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                customerSearch.length >= 2 ? (
                  <Text className="text-center text-gray-400 py-4">{t('pos.noCustomerFound')}</Text>
                ) : null
              }
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Price edit sheet */}
      <Modal
        visible={!!editingItem}
        transparent
        animationType="slide"
        onRequestClose={() => setEditingItem(null)}
      >
        <TouchableOpacity
          className="flex-1 bg-black/40"
          activeOpacity={1}
          onPress={() => setEditingItem(null)}
        />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View className="bg-white rounded-t-3xl px-6 pt-5" style={{ paddingBottom: insets.bottom + 24 }}>
            <View className="w-10 h-1 bg-gray-200 rounded-full self-center mb-4" />
            <Text className="text-base font-bold text-gray-900 mb-3">{t('pos.editPrice')}</Text>
            <MoneyInput
              rawValue={editPrice}
              onChangeRaw={setEditPrice}
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-2xl font-bold text-gray-900 mb-4"
            />
            <TouchableOpacity
              className="bg-primary rounded-2xl py-4 items-center active:opacity-80"
              onPress={confirmPriceEdit}
            >
              <Text className="text-white font-bold text-base">{t('common.save')}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
