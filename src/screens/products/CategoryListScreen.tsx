import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAlertStore } from '../../store/alertStore';
import { useToastStore } from '../../store/toastStore';
import { useErrorAlert } from '../../hooks/useErrorAlert';
import { categoryApi, type CategoryData } from '../../services/api';
import { formatVnd } from '../../utils/format';
import { useTypography } from '../../hooks/useTypography';
import { ErrorState } from '../../components/ErrorState';
import { ScreenSkeleton } from '../../components/ScreenSkeleton';
import { useAuthStore } from '../../store/authStore';

// ── Emoji sets keyed by backend shop-type code ────────────────────────────────
// Each set is ordered so the most useful emoji for that shop type comes first
// (the first entry is used as the default for new categories).
const EMOJI_BY_SHOP_TYPE: Record<string, string[]> = {
  // Food & restaurants
  RESTAURANT: [
    // existing
    '🍜', '🍚', '🍕', '🍱', '🥩', '🥗', '🌮', '🍲', '🥢', '🫕', '🥖', '🍣', '🥡', '🧆', '🥤', '🍝', '🍤', '📦',
    // added
    '🍗', '🍔', '🌭', '🥓', '🌯', '🫔', '🥙', '🧇', '🥞', '🥕', '🌽', '🧄', '🧅', '🍄', '🫑', '🥑', '🍋', '🥘',
    '🍛', '🍞', '🥗', '🫙', '🍽️', '🥣', '🫚', '🧈', '🥚', '🧀', '🥦', '🍅', '🥝', '🍇', '🍓', '🍑', '🫐', '🌶️',
  ],
  FOOD_BEVERAGE: [
    // existing
    '🥬', '🥩', '🍞', '🌾', '🧈', '🥚', '🧀', '🥦', '🍎', '🍌', '🥫', '🛒', '🌽', '🍠', '🥔', '🧅', '🫙', '📦',
    // added
    '🥕', '🥑', '🫑', '🍄', '🥝', '🍇', '🍊', '🍋', '🥭', '🍓', '🍅', '🫐', '🥥', '🌶️', '🫒', '🥜', '🌰', '🍃',
    '🧄', '🫘', '🌿', '🌱', '🍐', '🍒', '🍑', '🫛', '🥗', '🌾', '🧆', '🥘', '🍲', '🥣', '🫚', '🌊', '🧂', '🛍️',
  ],
  CONVENIENCE_STORE: [
    // existing
    '🛒', '🥫', '🍚', '🧴', '🧹', '🍼', '🧻', '💊', '🥚', '🧈', '🥬', '🔋', '🎁', '🧽', '🫙', '🌾', '🧯', '📦',
    // added
    '🪥', '🧺', '🪣', '🧸', '💡', '🔦', '🏮', '🎀', '🍬', '🍫', '🍭', '🥤', '🧃', '📰', '🪒', '🧼', '🫧', '🧤',
    '🥛', '🍪', '🍩', '🍿', '🥜', '🌰', '🧆', '🌶️', '🧂', '🫙', '🎊', '🎉', '🛍️', '🧲', '🔒', '📦', '🪑', '🗂️',
  ],
  // Drinks
  COFFEE_SHOP: [
    // existing
    '☕', '🧋', '🥤', '🍵', '🥛', '🧁', '🎂', '🍰', '🍩', '🥐', '🍫', '🧃', '🫖', '🌿', '🍶', '🧊', '🍮', '📦',
    // added
    '🍪', '🥧', '🍦', '🍨', '🫗', '🍸', '🥂', '🎵', '📖', '🌸', '🌺', '🌼', '🌻', '🎶', '🧇', '🥞', '🍞', '🥖',
    '🌹', '🌷', '💐', '🎀', '🕯️', '🌙', '⭐', '✨', '🎁', '🥗', '🍎', '🍌', '🍓', '🫐', '🥝', '🍑', '🌾', '🎋',
  ],
  // Pubs
  PUB: [
    // existing
    '🍺', '🍻', '🥂', '🍷', '🥃', '🍸', '🍹', '🥩', '🍢', '🌶️', '🥜', '🧂', '🥗', '🫕', '📦', '🎵', '🍿', '🌽',
    // added
    '🍾', '🫗', '🎶', '🎤', '🎸', '🎉', '🎊', '🎲', '🃏', '🎱', '🏆', '🥓', '🌯', '🍟', '🧄', '🧅', '🫙', '🥃',
    '🌿', '🍄', '🧀', '🥚', '🍜', '🍲', '🍱', '🥢', '🧆', '🫔', '🥙', '🌮', '🍝', '🌊', '🎭', '🎪', '🪅', '🎇',
  ],
  PUB_SEAFOOD: [
    // existing
    '🦞', '🦑', '🦐', '🦀', '🐙', '🐟', '🍺', '🍻', '🥂', '🍹', '🌶️', '🧂', '🥢', '🥗', '🫕', '📦', '🥤', '🌿',
    // added
    '🐠', '🐡', '🦪', '🎣', '🌊', '🌴', '🥥', '🍋', '🍾', '🫗', '🥃', '🍱', '🍜', '🍲', '🧄', '🧅', '🫙', '🥗',
    '🍶', '🌽', '🥜', '🫑', '🌿', '🍃', '🧆', '🥙', '🫔', '🌮', '🍸', '🎵', '🎶', '🎉', '🏄', '🌅', '⛵', '🐚',
  ],
  PUB_GOAT: [
    // existing
    '🐐', '🥩', '🍺', '🍻', '🥂', '🌶️', '🧂', '🧄', '🫕', '🔥', '🌿', '🥜', '🍢', '🥗', '🧊', '📦', '🥤', '🎵',
    // added
    '🫚', '🧅', '🥕', '🌽', '🍖', '🫙', '🌴', '🥥', '🍾', '🫗', '🥃', '🎉', '🎊', '🏕️', '🌙', '🌾', '🎶', '🎤',
    '🌿', '🍃', '🫑', '🥬', '🧆', '🌮', '🫔', '🥙', '🍜', '🍲', '🍱', '🥢', '🎸', '🎭', '🌅', '🌄', '🏔️', '🌋',
  ],
  PUB_BEEF: [
    // existing
    '🐄', '🥩', '🔥', '🍺', '🍻', '🥂', '🌶️', '🧂', '🫕', '🧄', '🥗', '🌿', '🥜', '🍢', '🧊', '📦', '🥤', '🎵',
    // added
    '🫚', '🧅', '🥕', '🌽', '🍖', '🫙', '🥣', '🍾', '🫗', '🥃', '🎉', '🎊', '🏕️', '🌙', '🌾', '🎶', '🎤', '🎸',
    '🌿', '🍃', '🫑', '🥬', '🧆', '🌮', '🫔', '🥙', '🍜', '🍲', '🍱', '🥢', '🎭', '🌅', '🌄', '🏔️', '⚡', '🔪',
  ],
  // Fashion
  FASHION: [
    // existing
    '👗', '👕', '👔', '👟', '👠', '👜', '👒', '🧣', '🧤', '🧢', '⌚', '🕶️', '🎒', '👙', '🩴', '💍', '🪡', '📦',
    // added
    '👚', '👛', '💼', '🧥', '👘', '🥻', '👑', '🩱', '🩲', '🩳', '🎽', '🎀', '🛍️', '🪞', '🌂', '🧶', '🩰', '👞',
    '🩖', '🧦', '🫀', '💄', '💅', '🌸', '🌺', '✨', '💫', '🌟', '🪩', '🎭', '🌈', '🦋', '💎', '👸', '🤵', '🎩',
  ],
  // Beauty — each sub-type gets its own tailored set
  BARBER_SHOP_MEN: [
    // existing
    '💈', '✂️', '🪒', '🧴', '🪮', '🧼', '🎨', '💇‍♂️', '🧔', '🪑', '🏆', '🌿', '🧤', '💊', '⭐', '🛁', '🎽', '📦',
    // added
    '🪥', '🧖‍♂️', '💪', '🫧', '🌊', '🧪', '🖌️', '🪞', '🌱', '⚡', '🏅', '🥇', '🥈', '🎯', '🎖️', '💆‍♂️', '🌿', '🔥',
    '🧘‍♂️', '🏋️‍♂️', '🤸‍♂️', '🧗‍♂️', '🚴‍♂️', '🏊‍♂️', '🎸', '🎵', '🎶', '🎤', '🕶️', '🧢', '👕', '👔', '🩱', '🩳', '🎽', '🌟',
  ],
  HAIR_SALON: [
    // existing
    '💇', '✂️', '💈', '🪮', '🎨', '💅', '🧴', '🧼', '🌺', '🌸', '💆', '🌿', '🌊', '🌈', '🪄', '✨', '🌹', '📦',
    // added
    '🌻', '💐', '🌷', '🌼', '🦋', '🌟', '💫', '🎀', '🪞', '🧪', '🫧', '🩷', '💜', '💙', '🩵', '🌙', '🔮', '💊',
    '🌱', '🍃', '🌿', '🌴', '🥥', '🫚', '🕯️', '💧', '🌊', '🏖️', '🌅', '🎵', '🎶', '🎉', '🛍️', '👑', '💍', '💎',
  ],
  NAIL_SHOP: [
    // existing
    '💅', '🖌️', '🎨', '✨', '💄', '🌸', '🌺', '💍', '💎', '🪄', '💫', '🌈', '🎀', '💋', '🧴', '🌿', '👸', '📦',
    // added
    '🩷', '💜', '🩵', '💙', '🩶', '🤍', '💐', '🌷', '🌼', '🦋', '🌟', '🎆', '🎇', '🪩', '🩰', '🌙', '🔮', '🌹',
    '🌻', '🌺', '🧪', '🫧', '🪞', '💊', '🌱', '🍃', '🕯️', '⭐', '🌠', '🎊', '🎉', '👑', '🏆', '🥇', '🌟', '💎',
  ],
  SPA_SHOP: [
    // existing
    '🧖', '🌿', '🌸', '💆', '🛁', '🕯️', '💧', '🌊', '🌺', '🫧', '🌙', '⭐', '🍃', '🌹', '🕊️', '🌻', '💊', '📦',
    // added
    '🌴', '🥥', '🫚', '🧴', '🪷', '🌟', '💫', '🎋', '🎍', '🍀', '🌼', '🌷', '🦋', '🌾', '🧘', '🤸', '🏊', '🌅',
    '🌄', '🏔️', '🏝️', '🌊', '🌬️', '❄️', '🔥', '🌈', '🎵', '🎶', '🫖', '☕', '🍵', '🧃', '🥥', '🍋', '🌿', '💎',
  ],
  LASH_PMU_STUDIO: [
    // existing
    '👁️', '💄', '💅', '🎨', '✨', '💋', '👸', '🌸', '🌺', '🎀', '💎', '🪄', '💫', '🔮', '👄', '💆', '👑', '📦',
    // added
    '🩷', '💜', '🩵', '🌹', '💐', '🌷', '🦋', '🌟', '🎆', '🎇', '🪩', '🩰', '🌙', '🌈', '🌼', '🌻', '🧪', '🫧',
    '🪞', '💊', '🌱', '🍃', '🕯️', '🌠', '🎊', '🎉', '🏆', '🥇', '💛', '🤍', '🩶', '💙', '🩵', '🩶', '🌟', '⭐',
  ],
  MASSAGE_SHOP: [
    // existing
    '🤲', '💆', '🌿', '🌸', '🕯️', '💧', '🌊', '🛁', '🌺', '🌙', '⭐', '🍃', '💊', '🧴', '🌹', '🫧', '🌻', '📦',
    // added
    '🌴', '🥥', '🎋', '🌾', '🍀', '🌼', '🌷', '🦋', '💤', '🕊️', '🪷', '🫚', '🌟', '💫', '🎍', '🧪', '🧘', '🤸',
    '🏊', '🌅', '🌄', '🏔️', '🏝️', '🌬️', '❄️', '🔥', '🌈', '🎵', '🫖', '☕', '🍵', '🌿', '💎', '👑', '🌱', '🍃',
  ],
  BEAUTY_CLINIC: [
    // existing
    '🏥', '💊', '💉', '🩺', '🌿', '💧', '✨', '💆', '🩹', '🧴', '🌸', '💄', '🔬', '💎', '🌺', '💆‍♀️', '⭐', '📦',
    // added
    '🩻', '🧬', '🫁', '🌟', '💫', '🧪', '🫙', '🌱', '💅', '🌹', '🌷', '🌻', '🦋', '🩷', '💜', '🩵', '🌙', '🔮',
    '🪄', '🎀', '👑', '💍', '🌈', '🎆', '🎇', '🪩', '🌼', '💐', '🍃', '🌾', '🫧', '🕯️', '🌊', '🏥', '🧘', '💆‍♂️',
  ],
  MAKEUP_STUDIO: [
    // existing
    '💄', '💅', '🎨', '✨', '💋', '👄', '💍', '💎', '🪄', '🌸', '🌺', '🎀', '👑', '🔮', '💆', '👸', '🌈', '📦',
    // added
    '🩷', '💜', '🩵', '💙', '🎭', '🎆', '🎇', '🌟', '💫', '⭐', '🦋', '🌙', '🪩', '🩰', '💐', '🌹', '🌷', '🌼',
    '🌻', '🌺', '🌸', '🧪', '🫧', '🪞', '🌱', '🍃', '🕯️', '🌠', '🎊', '🎉', '🏆', '💛', '🤍', '🩶', '🎵', '🎶',
  ],
  // Health
  PHARMACY: [
    // existing
    '💊', '💉', '🩺', '🌿', '🩹', '🧴', '🌡️', '🏥', '🧬', '🔬', '🌱', '🫙', '🧪', '💧', '🥗', '🍃', '🌾', '📦',
    // added
    '🏃', '🧘', '🍏', '🥝', '🫐', '🥕', '🥦', '🌿', '🌱', '🍃', '🌾', '🫘', '🥜', '🌰', '🌊', '🩻', '🧬', '💆',
    '🌸', '🌺', '🌼', '🌷', '🌻', '🍀', '🌴', '🥥', '🍋', '🍎', '🍊', '🍇', '🍓', '🫐', '🥑', '🧅', '🧄', '⭐',
  ],
  // Gold & Pawn
  JEWELRY: [
    // existing
    '💍', '💎', '⌚', '👑', '🪙', '💰', '🏆', '🥇', '🌟', '✨', '🎖️', '⚜️', '🔐', '🔑', '💛', '🌸', '🏅', '📦',
    // added
    '💱', '📿', '🔮', '🪬', '🧲', '💫', '🌠', '🎊', '💐', '🌹', '🦋', '🕊️', '🌙', '🌈', '🏵️', '🎗️', '🥈', '🥉',
    '🔩', '🔧', '⚙️', '🗝️', '🏰', '🌟', '🌺', '🌷', '💮', '🌸', '🌼', '🌻', '🎆', '🎇', '🪩', '👸', '🤴', '🎁',
  ],
  PAWN_SHOP: [
    // existing
    '🏦', '💰', '💎', '⌚', '📱', '💍', '🔑', '🪙', '💵', '🎸', '🏆', '🖥️', '📸', '🎮', '🥇', '💻', '🧲', '📦',
    // added
    '📷', '🎷', '🎺', '🎻', '📻', '🕹️', '💈', '🔒', '🗝️', '🏅', '🎗️', '💱', '🛍️', '📀', '📼', '🎹', '🎙️', '📡',
    '🚲', '🏍️', '🚗', '💼', '🗂️', '📋', '🖨️', '⌨️', '🖱️', '📺', '📲', '🤖', '⚡', '🔋', '🔌', '💡', '🛠️', '🔩',
  ],
  // Electronics
  ELECTRONICS: [
    // existing
    '📱', '💻', '⌚', '🖥️', '📷', '🎮', '🎧', '💡', '🔋', '🔌', '📺', '🖱️', '⌨️', '📡', '🖨️', '🔭', '🎵', '📦',
    // added
    '💾', '📀', '📼', '🕹️', '🎙️', '📻', '🔊', '🔔', '📲', '🤖', '⚡', '🔧', '🔩', '🛠️', '🪫', '🔌', '📡', '🌐',
    '🖲️', '🗜️', '📟', '📠', '📺', '🎞️', '📽️', '🎬', '🔬', '🔭', '🧲', '💈', '🌟', '⭐', '🚀', '🛸', '🌌', '🌠',
  ],
  // Generic fallback
  OTHER: [
    // existing
    '📦', '🛠️', '🚗', '🧺', '🐾', '🌺', '📚', '🏋️', '✈️', '🎵', '🏠', '🎯', '🎨', '🏷️', '🔧', '💼', '🌟', '⭐',
    // added
    '🎪', '🎭', '🗂️', '📋', '🗃️', '🛍️', '🎁', '🎗️', '🏅', '🎫', '🎟️', '🔖', '📌', '🖊️', '🖋️', '✏️', '📐', '📏',
    '🧩', '🎲', '🎳', '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️', '🌈', '🦋', '🐝', '🌻', '🌷', '🌼', '💫', '🌙', '🔮',
  ],
};

const FALLBACK_EMOJIS = EMOJI_BY_SHOP_TYPE.OTHER;

function getEmojiOptions(shopTypeCode: string | null | undefined): string[] {
  if (!shopTypeCode) return FALLBACK_EMOJIS;
  return EMOJI_BY_SHOP_TYPE[shopTypeCode] ?? FALLBACK_EMOJIS;
}

type FormState = { emoji: string; name: string };

export function CategoryListScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const typo = useTypography();
  const qc = useQueryClient();
  const { show: showAlert } = useAlertStore();
  const { show: showToast } = useToastStore();
  const showErrorAlert = useErrorAlert();

  const { shopTypeCode } = useAuthStore();
  const emojiOptions = getEmojiOptions(shopTypeCode);
  const defaultEmoji = emojiOptions[0] ?? '📦';

  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<CategoryData | null>(null);
  const [form, setForm] = useState<FormState>({ emoji: defaultEmoji, name: '' });

  const { data: categories = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryApi.list().then((r) => r.data.data),
    staleTime: 5 * 60_000,
  });

  const addMutation = useMutation({
    mutationFn: () => categoryApi.create(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] });
      showToast(t('categories.saveSuccess'));
      setModalVisible(false);
    },
    onError: showErrorAlert,
  });

  const updateMutation = useMutation({
    mutationFn: () => categoryApi.update(editing!.id, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] });
      showToast(t('categories.saveSuccess'));
      setModalVisible(false);
    },
    onError: showErrorAlert,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => categoryApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] });
      showToast(t('categories.deleteSuccess'));
    },
    onError: showErrorAlert,
  });

  const openAdd = () => {
    setEditing(null);
    setForm({ emoji: defaultEmoji, name: '' });
    setModalVisible(true);
  };

  const openEdit = (cat: CategoryData) => {
    setEditing(cat);
    setForm({ emoji: cat.emoji, name: cat.name });
    setModalVisible(true);
  };

  const handleDelete = (cat: CategoryData) => {
    const productCount = cat.productCount ?? 0;
    if (productCount > 0) {
      showAlert(t('categories.deleteTitle'), t('categories.deleteHasProducts', { count: productCount }), [
        { label: t('common.close'), style: 'cancel' },
      ]);
      return;
    }
    showAlert(t('categories.deleteTitle'), t('categories.deleteMsg'), [
      { label: t('common.cancel'), style: 'cancel' },
      { label: t('categories.deleteConfirm'), style: 'destructive', onPress: () => deleteMutation.mutate(cat.id) },
    ]);
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    if (editing) updateMutation.mutate();
    else addMutation.mutate();
  };

  const isPending = addMutation.isPending || updateMutation.isPending;

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <View
        className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4"
        style={{ paddingTop: insets.top + 12, paddingBottom: 12 }}
      >
        <View className="flex-row items-center mb-0.5">
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} className="mr-3">
            <MaterialCommunityIcons name="chevron-left" size={26} color="#4f46e5" />
          </TouchableOpacity>
          <Text className={`${typo.heading} text-gray-900 dark:text-white flex-1`}>
            {t('categories.title')}
          </Text>
          <TouchableOpacity onPress={openAdd} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialCommunityIcons name="plus" size={24} color="#4f46e5" />
          </TouchableOpacity>
        </View>
        <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 mt-0.5`}>{t('categories.hint')}</Text>
      </View>

      {isError ? (
        <ErrorState onRetry={refetch} />
      ) : isLoading ? (
        <ScreenSkeleton count={5} cardHeight={62} />
      ) : categories.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <MaterialCommunityIcons name="tag-outline" size={56} color="#d1d5db" />
          <Text className={`${typo.body} text-gray-400 mt-4 text-center`}>{t('categories.empty')}</Text>
          <Text className={`${typo.caption} text-gray-400 mt-1 text-center`}>{t('categories.emptyHint')}</Text>
          <TouchableOpacity onPress={openAdd} className="mt-6 bg-indigo-600 px-6 py-3 rounded-2xl">
            <Text className={`${typo.label} text-white`}>{t('categories.addBtn')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          showsVerticalScrollIndicator={false}
          data={categories}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ padding: 4, gap: 10 }}
          renderItem={({ item }) => (
            <View className="bg-white dark:bg-gray-800 rounded-2xl px-4 py-3 border border-gray-100 dark:border-gray-700">
              {/* Top row: emoji · name · actions */}
              <View className="flex-row items-center">
                <Text className={`${typo.heading} mr-3`}>{item.emoji}</Text>
                <Text className={`${typo.labelBold} text-gray-900 dark:text-white flex-1`} numberOfLines={1}>
                  {item.name}
                </Text>
                <TouchableOpacity onPress={() => openEdit(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} className="mr-3">
                  <MaterialCommunityIcons name="pencil-outline" size={20} color="#6b7280" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <MaterialCommunityIcons name="trash-can-outline" size={20} color="#ef4444" />
                </TouchableOpacity>
              </View>

              {/* Stats chips row */}
              <View className="flex-row flex-wrap gap-1.5 mt-2.5" style={{ gap: 6 }}>
                {/* Product count */}
                <View className="flex-row items-center bg-indigo-50 dark:bg-indigo-900/20 rounded-full px-2.5 py-1 gap-1">
                  <MaterialCommunityIcons name="package-variant-closed" size={12} color="#4f46e5" />
                  <Text className={`${typo.caption} font-semibold`} style={{ color: '#4f46e5' }}>
                    {t('categories.productsCount', { count: item.productCount ?? 0 })}
                  </Text>
                </View>

                {/* Out-of-stock — only show when > 0 */}
                {(item.outOfStockCount ?? 0) > 0 && (
                  <View className="flex-row items-center bg-red-50 dark:bg-red-900/20 rounded-full px-2.5 py-1 gap-1">
                    <MaterialCommunityIcons name="alert-circle-outline" size={12} color="#ef4444" />
                    <Text className={`${typo.caption} font-semibold`} style={{ color: '#ef4444' }}>
                      {t('categories.outOfStock', { count: item.outOfStockCount })}
                    </Text>
                  </View>
                )}

                {/* Revenue this month */}
                <View className="flex-row items-center bg-emerald-50 dark:bg-emerald-900/20 rounded-full px-2.5 py-1 gap-1">
                  <MaterialCommunityIcons name="trending-up" size={12} color="#059669" />
                  <Text className={`${typo.caption} font-semibold`} style={{ color: '#059669' }}>
                    {(item.revenueThisMonth ?? 0) > 0 ? formatVnd(item.revenueThisMonth) : '—'}
                  </Text>
                </View>
              </View>
            </View>
          )}
        />
      )}

      {/* Add/Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView className="flex-1 justify-end" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View className="bg-white dark:bg-gray-800 rounded-t-3xl p-6" style={{ paddingBottom: insets.bottom + 16 }}>
            <View className="flex-row items-center justify-between mb-4">
              <Text className={`${typo.section} text-gray-900 dark:text-white`}>{t('categories.formTitle')}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={22} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {/* Emoji picker */}
            <Text className={`${typo.label} text-gray-700 dark:text-gray-300 mb-2`}>{t('categories.emojiLabel')}</Text>
            <View className="flex-row flex-wrap gap-2 mb-4">
              {emojiOptions.map((e) => (
                <TouchableOpacity
                  key={e}
                  onPress={() => setForm({ ...form, emoji: e })}
                  className={`w-11 h-11 rounded-xl items-center justify-center border-2 ${form.emoji === e ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-100 dark:border-gray-700'}`}
                >
                  <Text className={`${typo.section}`}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Name */}
            <Text className={`${typo.label} text-gray-700 dark:text-gray-300 mb-2`}>{t('categories.nameLabel')}</Text>
            <TextInput
              value={form.name}
              onChangeText={(v) => setForm({ ...form, name: v })}
              placeholder={t('categories.namePlaceholder')}
              placeholderTextColor="#9ca3af"
              returnKeyType="done"
              onSubmitEditing={handleSave}
              className={`border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 ${typo.inputSize} text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 mb-4`}
            />

            <TouchableOpacity
              onPress={handleSave}
              disabled={isPending || !form.name.trim()}
              className={`rounded-2xl py-4 items-center ${isPending || !form.name.trim() ? 'bg-gray-200 dark:bg-gray-700' : 'bg-indigo-600 active:opacity-80'}`}
            >
              {isPending ? <ActivityIndicator color="#fff" /> : (
                <Text className={`${typo.labelBold} ${!form.name.trim() ? 'text-gray-400' : 'text-white'}`}>
                  {t('common.save')}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
