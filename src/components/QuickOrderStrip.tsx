import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { cartApi, orderApi, productApi, type ProductData } from '../services/api';
import { useToastStore } from '../store/toastStore';
import { formatVnd } from '../utils/format';
import { useTypography } from '../hooks/useTypography';

const STORAGE_KEY = 'quick_order_products';
const LAST_PAYMENT_KEY = 'last_payment_method';
const MAX_PINNED = 5;

type PinnedProduct = { id: string; name: string; price: number };
type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'CARD';

const PAYMENT_OPTS: { key: PaymentMethod; icon: string; label: string }[] = [
  { key: 'CASH', icon: 'cash', label: 'Tiền mặt' },
  { key: 'BANK_TRANSFER', icon: 'bank-transfer', label: 'Chuyển khoản' },
  { key: 'CARD', icon: 'credit-card-outline', label: 'Thẻ' },
];

async function loadPinned(): Promise<PinnedProduct[] | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function savePinned(products: PinnedProduct[]) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(products));
}

async function clearPinned() {
  await AsyncStorage.removeItem(STORAGE_KEY);
}

// ── Quick Checkout Sheet ─────────────────────────────────────────────────────

type CheckoutSheetProps = {
  product: PinnedProduct;
  onClose: () => void;
  onSuccess: () => void;
};

function QuickCheckoutSheet({ product, onClose, onSuccess }: CheckoutSheetProps) {
  const { t } = useTranslation();
  const typo = useTypography();
  const { show: showToast } = useToastStore();
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState('');
  const [showNote, setShowNote] = useState(false);
  const [payment, setPayment] = useState<PaymentMethod>('CASH');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    AsyncStorage.getItem(LAST_PAYMENT_KEY).then((saved) => {
      if (saved === 'CASH' || saved === 'BANK_TRANSFER') setPayment(saved);
    });
  }, []);

  const handleConfirm = async () => {
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      const { data: initData } = await cartApi.init();
      const cartId = initData.data.cartId;
      await cartApi.addItem(cartId, product.id, qty);
      const { data: checkoutData } = await cartApi.checkout(cartId, {
        paymentMethod: payment,
        notes: note || undefined,
      });
      await AsyncStorage.setItem(LAST_PAYMENT_KEY, payment);
      const orderId = checkoutData.data.orderId;
      const orderNumber = checkoutData.data.orderNumber;
      onClose();
      onSuccess();
      showToast(
        t('quickOrder.created', { number: orderNumber }),
        () => orderApi.delete(orderId).catch(() => {}),
      );
    } catch {
      setError(t('quickOrder.errorMsg'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 justify-end">
      <TouchableOpacity className="flex-1" activeOpacity={1} onPress={onClose} />
      <View className="bg-white dark:bg-gray-900 rounded-t-3xl px-5 pt-5 pb-8">
        {/* Product */}
        <View className="flex-row items-start justify-between mb-4">
          <View className="flex-1 mr-3">
            <Text className={`${typo.body} text-gray-900 dark:text-gray-100`} numberOfLines={2}>
              {product.name}
            </Text>
            <Text className={`text-indigo-600 ${typo.label} mt-0.5`}>{formatVnd(product.price)}</Text>
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialCommunityIcons name="close" size={22} color="#9ca3af" />
          </TouchableOpacity>
        </View>

        {/* Qty stepper */}
        <View className="flex-row items-center justify-center gap-6 mb-4">
          <TouchableOpacity
            onPress={() => setQty((q) => Math.max(1, q - 1))}
            className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 items-center justify-center"
          >
            <MaterialCommunityIcons name="minus" size={20} color="#374151" />
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100 w-10 text-center">{qty}</Text>
          <TouchableOpacity
            onPress={() => setQty((q) => q + 1)}
            className="w-10 h-10 rounded-full bg-indigo-600 items-center justify-center"
          >
            <MaterialCommunityIcons name="plus" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Note */}
        {showNote ? (
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder={t('quickOrder.addNote')}
            placeholderTextColor="#9ca3af"
            className={`border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 ${typo.inputSize} text-gray-900 dark:text-gray-100 mb-3`}
            multiline
          />
        ) : (
          <TouchableOpacity onPress={() => setShowNote(true)} className="mb-3">
            <Text className={`${typo.caption} text-gray-400`}>{t('quickOrder.addNote')} ↓</Text>
          </TouchableOpacity>
        )}

        {/* Payment method */}
        <View className="flex-row gap-2 mb-4">
          {PAYMENT_OPTS.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              onPress={() => setPayment(opt.key)}
              className={`flex-1 py-3 rounded-xl items-center border ${
                payment === opt.key
                  ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950'
                  : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              <MaterialCommunityIcons
                name={opt.icon as never}
                size={18}
                color={payment === opt.key ? '#4f46e5' : '#9ca3af'}
              />
              <Text className={`${typo.label} mt-0.5 ${payment === opt.key ? 'text-indigo-600' : 'text-gray-500'}`}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Error */}
        {error ? (
          <View className="bg-amber-50 dark:bg-amber-900/20 rounded-xl px-4 py-3 mb-3 flex-row items-center gap-2">
            <MaterialCommunityIcons name="alert-outline" size={18} color="#f59e0b" />
            <Text className={`flex-1 ${typo.caption} text-amber-700 dark:text-amber-400`}>{error}</Text>
            <TouchableOpacity onPress={handleConfirm}>
              <Text className={`${typo.label} text-amber-700 dark:text-amber-400`}>{t('quickOrder.errorRetry')}</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Confirm */}
        <TouchableOpacity
          onPress={handleConfirm}
          disabled={loading}
          className={`rounded-2xl py-4 items-center ${loading ? 'bg-gray-200 dark:bg-gray-700' : 'bg-indigo-600 active:opacity-80'}`}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text className={`text-white ${typo.body}`}>{t('quickOrder.confirm')}</Text>
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ── Config Sheet ─────────────────────────────────────────────────────────────

type ConfigSheetProps = {
  pinned: PinnedProduct[];
  onSave: (products: PinnedProduct[]) => void;
  onClose: () => void;
};

function ConfigSheet({ pinned, onSave, onClose }: ConfigSheetProps) {
  const { t } = useTranslation();
  const typo = useTypography();
  const [draft, setDraft] = useState<PinnedProduct[]>(pinned);
  const [search, setSearch] = useState('');

  const { data: searchResults = [], isFetching } = useQuery({
    queryKey: ['products-quick-search', search],
    queryFn: () =>
      productApi.list({ search: search || undefined, size: 20 })
        .then((r) => r.data.data.content),
    staleTime: 30_000,
  });

  const addProduct = (p: ProductData) => {
    if (draft.length >= MAX_PINNED) return;
    if (draft.some((d) => d.id === p.id)) return;
    setDraft((prev) => [...prev, { id: p.id, name: p.name, price: p.price }]);
  };

  const removeProduct = (id: string) => {
    setDraft((prev) => prev.filter((p) => p.id !== id));
  };

  const handleSave = () => {
    onSave(draft);
    onClose();
  };

  const handleReset = () => {
    onSave([]);
    onClose();
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 justify-end">
      <TouchableOpacity className="flex-1" activeOpacity={1} onPress={onClose} />
      <View className="bg-white dark:bg-gray-900 rounded-t-3xl px-5 pt-5 pb-8" style={{ maxHeight: '80%' }}>
        {/* Header */}
        <View className="flex-row items-center justify-between mb-2">
          <Text className={`${typo.section} text-gray-900 dark:text-gray-100`}>{t('quickOrder.configTitle')}</Text>
          <TouchableOpacity onPress={onClose}>
            <MaterialCommunityIcons name="close" size={22} color="#9ca3af" />
          </TouchableOpacity>
        </View>
        <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 mb-4`}>{t('quickOrder.configHint')}</Text>

        {/* Pinned list */}
        {draft.length > 0 && (
          <View className="mb-3">
            <Text className={`${typo.captionBold} text-gray-400 uppercase mb-2`}>{t('quickOrder.pinned')} ({draft.length}/{MAX_PINNED})</Text>
            {draft.map((p) => (
              <View key={p.id} className="flex-row items-center py-2 border-b border-gray-100 dark:border-gray-800">
                <Text className={`flex-1 ${typo.caption} text-gray-900 dark:text-gray-100`} numberOfLines={1}>{p.name}</Text>
                <Text className={`${typo.caption} text-gray-500 mr-3`}>{formatVnd(p.price)}</Text>
                <TouchableOpacity onPress={() => removeProduct(p.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <MaterialCommunityIcons name="close-circle-outline" size={20} color="#ef4444" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Search */}
        {draft.length < MAX_PINNED && (
          <>
            <View className="flex-row items-center bg-gray-100 dark:bg-gray-800 rounded-xl px-3 py-2.5 mb-2">
              <MaterialCommunityIcons name="magnify" size={18} color="#9ca3af" />
              <TextInput
                className={`flex-1 ml-2 ${typo.inputSize} text-gray-800 dark:text-gray-200`}
                placeholder={t('quickOrder.searchPlaceholder')}
                placeholderTextColor="#9ca3af"
                value={search}
                onChangeText={setSearch}
              />
              {isFetching && <ActivityIndicator size="small" color="#4f46e5" />}
            </View>

            <ScrollView style={{ maxHeight: 200 }} keyboardShouldPersistTaps="handled">
              {searchResults.map((p) => {
                const already = draft.some((d) => d.id === p.id);
                return (
                  <TouchableOpacity
                    key={p.id}
                    onPress={() => addProduct(p)}
                    disabled={already}
                    className={`flex-row items-center py-2.5 border-b border-gray-100 dark:border-gray-800 ${already ? 'opacity-40' : ''}`}
                  >
                    <Text className={`flex-1 ${typo.caption} text-gray-900 dark:text-gray-100`} numberOfLines={1}>{p.name}</Text>
                    <Text className={`${typo.caption} text-indigo-600 mr-3`}>{formatVnd(p.price)}</Text>
                    {already
                      ? <MaterialCommunityIcons name="check" size={18} color="#4f46e5" />
                      : <MaterialCommunityIcons name="plus-circle-outline" size={20} color="#4f46e5" />
                    }
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </>
        )}

        {draft.length >= MAX_PINNED && (
          <Text className={`${typo.caption} text-amber-500 mb-2`}>{t('quickOrder.maxReached')}</Text>
        )}

        {/* Actions */}
        <View className="flex-row gap-3 mt-4">
          <TouchableOpacity
            onPress={handleReset}
            className="flex-1 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 items-center"
          >
            <Text className={`${typo.label} text-gray-600 dark:text-gray-400`}>{t('quickOrder.resetToTopSellers')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSave}
            className="flex-1 py-3 rounded-2xl bg-indigo-600 items-center"
          >
            <Text className={`${typo.label} text-white`}>{t('common.save')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

// ── Quick Order Strip ─────────────────────────────────────────────────────────

type Props = {
  onOrderCreated: () => void;
};

export function QuickOrderStrip({ onOrderCreated }: Props) {
  const { t } = useTranslation();
  const typo = useTypography();
  const qc = useQueryClient();
  const [pinned, setPinned] = useState<PinnedProduct[] | null>(null); // null = not loaded yet
  const [checkoutProduct, setCheckoutProduct] = useState<PinnedProduct | null>(null);
  const [configOpen, setConfigOpen] = useState(false);

  // Load pinned config from AsyncStorage
  useEffect(() => {
    loadPinned().then(setPinned);
  }, []);

  // Fall back to top sellers when no pinned config
  const useTopSellers = pinned !== null && pinned.length === 0;
  const { data: topSellers = [] } = useQuery({
    queryKey: ['orders', 'top-products'],
    queryFn: () =>
      orderApi.topProducts({ limit: MAX_PINNED, days: 30 }).then((r) => r.data.data),
    staleTime: 5 * 60_000,
    enabled: useTopSellers,
  });

  const handleSaveConfig = useCallback(async (products: PinnedProduct[]) => {
    if (products.length === 0) {
      await clearPinned();
      setPinned([]);
      qc.invalidateQueries({ queryKey: ['orders', 'top-products'] });
    } else {
      await savePinned(products);
      setPinned(products);
    }
  }, [qc]);

  // Resolve the displayed products
  const displayProducts: PinnedProduct[] = pinned && pinned.length > 0
    ? pinned
    : topSellers
        .filter((p): p is typeof p & { productId: string } => !!p.productId)
        .map((p) => ({ id: p.productId, name: p.name, price: 0 }));

  if (pinned === null || displayProducts.length === 0) return null;

  return (
    <>
      <View className="bg-white dark:bg-gray-800 px-4 pt-3 pb-2 border-b border-gray-100 dark:border-gray-700">
        <View className="flex-row items-center justify-between mb-2">
          <Text className={`${typo.captionBold} text-gray-500 dark:text-gray-400 uppercase`}>
            {t('quickOrder.strip')}
          </Text>
          <TouchableOpacity onPress={() => setConfigOpen(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialCommunityIcons name="cog-outline" size={18} color="#9ca3af" />
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {displayProducts.map((p) => (
            <TouchableOpacity
              key={p.id}
              onPress={() => setCheckoutProduct(p)}
              className="bg-gray-50 dark:bg-gray-700 rounded-2xl px-3 py-2.5 items-start"
              style={{ minWidth: 110, maxWidth: 140 }}
            >
              <Text className={`${typo.label} text-gray-900 dark:text-gray-100 mb-1`} numberOfLines={2}>
                {p.name}
              </Text>
              <Text className={`${typo.caption} text-indigo-600`}>
                {p.price > 0 ? formatVnd(p.price) : t('pos.goldPrice')}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Quick Checkout Sheet */}
      <Modal
        visible={!!checkoutProduct}
        transparent
        animationType="slide"
        onRequestClose={() => setCheckoutProduct(null)}
      >
        {checkoutProduct && (
          <QuickCheckoutSheet
            product={checkoutProduct}
            onClose={() => setCheckoutProduct(null)}
            onSuccess={onOrderCreated}
          />
        )}
      </Modal>

      {/* Config Sheet */}
      <Modal
        visible={configOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setConfigOpen(false)}
      >
        <ConfigSheet
          pinned={pinned ?? []}
          onSave={handleSaveConfig}
          onClose={() => setConfigOpen(false)}
        />
      </Modal>
    </>
  );
}
