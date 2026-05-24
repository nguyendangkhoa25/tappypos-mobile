import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
  Alert,
  Linking,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTypography } from '../hooks/useTypography';

type Props = {
  visible: boolean;
  hasImage: boolean;
  onClose: () => void;
  /** Called with the local file URI after the user picks/shoots a photo */
  onImageSelected: (uri: string) => void;
  /** Called when the user taps "Delete image" */
  onDelete?: () => void;
  /** Override the sheet title (defaults to products.image.sheetTitle) */
  title?: string;
};

/**
 * Bottom-sheet modal for product image selection.
 * Shows: Take photo / Choose from library / Delete image (when hasImage=true) / Cancel
 */
export function ImagePickerSheet({ visible, hasImage, onClose, onImageSelected, onDelete, title }: Props) {
  const { t } = useTranslation();
  const typo = useTypography();

  const showPermissionDeniedAlert = (type: 'camera' | 'library') => {
    const title = type === 'camera'
      ? t('products.image.permissionCameraTitle')
      : t('products.image.permissionLibraryTitle');
    Alert.alert(title, t('products.image.permissionMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('products.image.openSettings'),
        onPress: () => Linking.openSettings(),
      },
    ]);
  };

  const requestAndLaunch = async (mode: 'camera' | 'library') => {
    onClose(); // dismiss the sheet first to avoid stacking permissions UI on top

    if (mode === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        showPermissionDeniedAlert('camera');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.85,
        allowsEditing: true,
        aspect: [1, 1],
      });
      if (!result.canceled && result.assets[0]) {
        onImageSelected(result.assets[0].uri);
      }
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showPermissionDeniedAlert('library');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.85,
        allowsEditing: true,
        aspect: [1, 1],
      });
      if (!result.canceled && result.assets[0]) {
        onImageSelected(result.assets[0].uri);
      }
    }
  };

  const handleDelete = () => {
    onClose();
    onDelete?.();
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/40 justify-end" onPress={onClose}>
        <Pressable onPress={() => {}}>
          <View className="bg-white dark:bg-gray-800 rounded-t-3xl pb-8 pt-3 px-4">
            {/* Handle */}
            <View className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full self-center mb-5" />

            <Text className={`${typo.section} text-gray-900 dark:text-white text-center mb-4`}>
              {title ?? t('products.image.sheetTitle')}
            </Text>

            {/* Take photo */}
            <TouchableOpacity
              className="flex-row items-center bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl px-4 py-4 mb-3"
              onPress={() => requestAndLaunch('camera')}
              activeOpacity={0.7}
            >
              <View className="w-10 h-10 bg-indigo-100 dark:bg-indigo-800 rounded-full items-center justify-center mr-3">
                <MaterialCommunityIcons name="camera-outline" size={22} color="#4f46e5" />
              </View>
              <Text className={`${typo.label} text-gray-800 dark:text-gray-100 flex-1`}>
                {t('products.image.takePhoto')}
              </Text>
            </TouchableOpacity>

            {/* Choose from library */}
            <TouchableOpacity
              className="flex-row items-center bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl px-4 py-4 mb-3"
              onPress={() => requestAndLaunch('library')}
              activeOpacity={0.7}
            >
              <View className="w-10 h-10 bg-indigo-100 dark:bg-indigo-800 rounded-full items-center justify-center mr-3">
                <MaterialCommunityIcons name="image-outline" size={22} color="#4f46e5" />
              </View>
              <Text className={`${typo.label} text-gray-800 dark:text-gray-100 flex-1`}>
                {t('products.image.chooseFromLibrary')}
              </Text>
            </TouchableOpacity>

            {/* Delete image (only when one already exists) */}
            {hasImage && onDelete && (
              <TouchableOpacity
                className="flex-row items-center bg-red-50 dark:bg-red-900/20 rounded-2xl px-4 py-4 mb-3"
                onPress={handleDelete}
                activeOpacity={0.7}
              >
                <View className="w-10 h-10 bg-red-100 dark:bg-red-900/40 rounded-full items-center justify-center mr-3">
                  <MaterialCommunityIcons name="trash-can-outline" size={22} color="#ef4444" />
                </View>
                <Text className={`${typo.label} text-red-600 flex-1`}>
                  {t('products.image.delete')}
                </Text>
              </TouchableOpacity>
            )}

            {/* Cancel */}
            <TouchableOpacity
              className="rounded-2xl px-4 py-4 items-center border border-gray-200 dark:border-gray-700 mt-1"
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text className={`${typo.label} text-gray-500 dark:text-gray-400`}>
                {t('common.cancel')}
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
