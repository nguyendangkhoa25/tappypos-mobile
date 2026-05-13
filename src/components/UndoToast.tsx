import { useEffect, useRef } from 'react';
import { Text, TouchableOpacity, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useToastStore, type ToastType } from '../store/toastStore';

const DURATION = 3000;

const TYPE_CONFIG: Record<ToastType, { bg: string; icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'] }> = {
  success: { bg: '#4f46e5', icon: 'check-circle'   },
  error:   { bg: '#ef4444', icon: 'alert-circle'   },
  warning: { bg: '#f59e0b', icon: 'alert'           },
  info:    { bg: '#3b82f6', icon: 'information'     },
};

export function UndoToast() {
  const { visible, message, type, onUndo, hide } = useToastStore();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const opacity    = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(24)).current;
  const timer      = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);

    if (visible) {
      Animated.parallel([
        Animated.timing(opacity,    { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, tension: 70, friction: 11, useNativeDriver: true }),
      ]).start();
      timer.current = setTimeout(hide, DURATION);
    } else {
      Animated.parallel([
        Animated.timing(opacity,    { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 24, duration: 200, useNativeDriver: true }),
      ]).start();
    }

    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [visible]);

  const config = TYPE_CONFIG[type] ?? TYPE_CONFIG.success;

  return (
    <Animated.View
      pointerEvents={visible ? 'auto' : 'none'}
      style={{
        position: 'absolute',
        left: 16,
        right: 16,
        bottom: insets.bottom + 80,
        opacity,
        transform: [{ translateY }],
        backgroundColor: config.bg,
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 13,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 10,
        elevation: 8,
      }}
    >
      <MaterialCommunityIcons
        name={config.icon}
        size={20}
        color="#fff"
        style={{ marginRight: 10, flexShrink: 0 }}
      />
      <Text
        style={{ color: '#fff', fontSize: 14, fontWeight: '500', flex: 1, lineHeight: 20 }}
        numberOfLines={2}
      >
        {message}
      </Text>
      {onUndo && (
        <TouchableOpacity
          onPress={() => { hide(); onUndo(); }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={{ marginLeft: 12 }}
        >
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14, opacity: 0.85 }}>
            {t('common.undo')}
          </Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}
