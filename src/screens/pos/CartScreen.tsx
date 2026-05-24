import { useState, useCallback } from 'react';
import {
  View,
  Text,
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
import { useCartStore } from '../../store/cartStore';
import { cartApi } from '../../services/api';
import { useAlertStore } from '../../store/alertStore';
import { useErrorAlert } from '../../hooks/useErrorAlert';
import { useFeatureCheck } from '../../hooks/useFeature';
import { formatVnd } from '../../utils/format';
import { useTypography } from '../../hooks/useTypography';
import { MoneyInput } from '../../components/MoneyInput';
import { EmptyState } from '../../components/EmptyState';
import { CustomerPickerSheet } from '../../components/CustomerPickerSheet';
import type { POSScreenProps } from '../../types/navigation';

export function CartScreen({ navigation }: POSScreenProps<'Cart'>) {
  const { t } = useTranslation();
  const typo = useTypography();
  const insets = useSafeAreaInsets();
  const has = useFeatureCheck();
  const { items, updateQty, updatePrice, removeItem, discount, getTotal, clearCart, selectedCustomer, setCustomer, tableId, tableLabel } = useCartStore();
  const { show: showAlert } = useAlertStore();
  const showErrorAlert = useErrorAlert();
  const [saving, setSaving] = useState(false);
  const total = getTotal();
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);

  const [customerSheet, setCustomerSheet] = useState(false);

  // Price edit sheet
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState('');

  const handleSaveOrder = async () => {
    setSaving(true);
    try {
      const initRes = await cartApi.init();
      const cartId = initRes.data.data.cartId;
      for (const item of items) {
        await cartApi.addItem(cartId, item.productId, item.quantity);
      }
      await cartApi.sendToKitchen(cartId, tableId ?? undefined, tableLabel ?? undefined);
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
    <View className="flex-1 bg-white dark:bg-gray-900" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 border-b border-gray-100 dark:border-gray-700">
        <TouchableOpacity className="mr-3" onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialCommunityIcons name="chevron-left" size={26} color="#4f46e5" />
        </TouchableOpacity>
        <Text className={`${typo.heading} text-gray-900 dark:text-white flex-1`}>{t('pos.cart')}</Text>
        <Text className={`${typo.caption} text-gray-500 dark:text-gray-400`}>{t('pos.itemCount', { count: items.length })}</Text>
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
              className="mx-4 mt-4 rounded-2xl border-2 border-primary bg-primary-light dark:bg-indigo-900/30 px-4 py-4 flex-row items-center active:opacity-80"
              onPress={() => setCustomerSheet(true)}
            >
              <View className="w-10 h-10 rounded-full bg-primary items-center justify-center mr-3">
                <MaterialCommunityIcons name="account" size={20} color="white" />
              </View>
              <View className="flex-1">
                <Text className={`${typo.captionBold} text-primary uppercase tracking-wide mb-0.5`}>
                  {t('pos.customer')}
                </Text>
                <Text className={`${typo.labelBold} text-gray-900 dark:text-white`}>
                  {selectedCustomer ? selectedCustomer.name : t('pos.walkIn')}
                </Text>
                {selectedCustomer?.type === 'managed' && !!selectedCustomer.phone && (
                  <Text className={`${typo.caption} text-gray-500 dark:text-gray-400`}>{selectedCustomer.phone}</Text>
                )}
                {selectedCustomer?.type === 'guest' && (
                  <Text className={`${typo.caption} text-gray-400 dark:text-gray-500 italic`}>{t('pos.guestCustomer')}</Text>
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
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <View className="flex-row items-center px-4 py-4 border-b border-gray-50 dark:border-gray-700/50">
                <View className="flex-1">
                  <Text className={`${typo.label} text-gray-800 dark:text-gray-100`} numberOfLines={2}>
                    {item.name}
                  </Text>
                  {/* Tap price to edit */}
                  <TouchableOpacity
                    onPress={() => openPriceEdit(item.productId, item.price)}
                    className="self-start mt-0.5"
                  >
                    <View className="flex-row items-center gap-1">
                      <Text className={`${typo.label} font-bold text-primary`}>
                        {formatVnd(item.price)}
                      </Text>
                      <MaterialCommunityIcons name="pencil-outline" size={12} color="#4f46e5" />
                    </View>
                  </TouchableOpacity>
                </View>

                {/* Qty controls */}
                <View className="flex-row items-center gap-1 mx-3">
                  <TouchableOpacity
                    className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 items-center justify-center active:opacity-70"
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

                  <Text className={`w-8 text-center ${typo.labelBold} text-gray-800 dark:text-gray-100`}>
                    {item.quantity}
                  </Text>

                  <TouchableOpacity
                    testID={`qty-plus-${item.productId}`}
                    className="w-8 h-8 rounded-full bg-primary-light dark:bg-indigo-900/30 items-center justify-center active:opacity-70"
                    onPress={() => updateQty(item.productId, item.quantity + 1)}
                  >
                    <MaterialCommunityIcons name="plus" size={16} color="#4f46e5" />
                  </TouchableOpacity>
                </View>

                {/* Line total */}
                <Text className={`w-24 text-right ${typo.label} text-gray-800 dark:text-gray-100`}>
                  {formatVnd(item.price * item.quantity)}
                </Text>
              </View>
            )}
          />

          {/* Summary + checkout */}
          <View
            className="bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-700 px-4 pt-4"
            style={{ paddingBottom: insets.bottom + 16 }}
          >
            {discount > 0 && (
              <>
                <View className="flex-row justify-between mb-1">
                  <Text className={`${typo.caption} text-gray-500 dark:text-gray-400`}>{t('orders.subtotal')}</Text>
                  <Text className={`${typo.caption} text-gray-700 dark:text-gray-300`}>{formatVnd(subtotal)}</Text>
                </View>
                <View className="flex-row justify-between mb-2">
                  <Text className={`${typo.caption} text-gray-500 dark:text-gray-400`}>{t('pos.discount')}</Text>
                  <Text className="text-warning font-semibold">-{formatVnd(discount)}</Text>
                </View>
              </>
            )}

            <View className="flex-row justify-between items-center mb-4">
              <Text className={`${typo.section} text-gray-900 dark:text-white`}>{t('pos.total')}</Text>
              <Text className={`${typo.heading} text-primary`}>{formatVnd(total)}</Text>
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
                  <Text className={`${typo.labelBold} text-primary`}>{t('pos.saveOrder')}</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              testID="cart-checkout-btn"
              className="bg-primary rounded-2xl py-4 items-center active:opacity-80"
              onPress={() => navigation.navigate('Checkout')}
            >
              <Text className={`${typo.labelBold} text-white`}>{t('pos.checkout')}</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Customer picker sheet */}
      <CustomerPickerSheet
        visible={customerSheet}
        onClose={() => setCustomerSheet(false)}
        value={selectedCustomer}
        onChange={setCustomer}
      />

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
          <View className="bg-white dark:bg-gray-800 rounded-t-3xl px-6 pt-5" style={{ paddingBottom: insets.bottom + 24 }}>
            <View className="w-10 h-1 bg-gray-200 dark:bg-gray-600 rounded-full self-center mb-4" />
            <Text className={`${typo.labelBold} text-gray-900 dark:text-white mb-3`}>{t('pos.editPrice')}</Text>
            <View className="mb-4">
              <MoneyInput rawValue={editPrice} onChangeRaw={setEditPrice} />
            </View>
            <TouchableOpacity
              className="bg-primary rounded-2xl py-4 items-center active:opacity-80"
              onPress={confirmPriceEdit}
            >
              <Text className={`${typo.labelBold} text-white`}>{t('common.save')}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </View>
  );
}
