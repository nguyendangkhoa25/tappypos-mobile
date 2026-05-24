import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, Image, TouchableOpacity, Modal, ActivityIndicator, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { buildVietQrUrl } from '../utils/vietqr';
import { formatVnd } from '../utils/format';
import { useTypography } from '../hooks/useTypography';
import type { BankAccount } from '../services/api';

/** How long (ms) the full-screen view stays open before auto-closing. */
const AUTO_CLOSE_MS = 60_000;

type Props = {
  bank: BankAccount;
  amount: number;
  description?: string;
  size?: number;
};

export function VietQrCard({ bank, amount, description = 'Thanh toan', size = 200 }: Props) {
  const { t } = useTranslation();
  const typo = useTypography();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const qrUrl = buildVietQrUrl(
    bank.bankBin ?? bank.bankCode,
    bank.accountNumber,
    bank.accountName,
    amount,
    description,
  );

  // ── Full-screen modal ──────────────────────────────────────────────────────
  const [fullscreen, setFullscreen] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(AUTO_CLOSE_MS / 1000);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const openFullscreen = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSecondsLeft(AUTO_CLOSE_MS / 1000);
    setFullscreen(true);
  }, []);

  const closeFullscreen = useCallback(() => {
    setFullscreen(false);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    if (!fullscreen) return;
    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          closeFullscreen();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [fullscreen, closeFullscreen]);

  // ── Double-tap detection ───────────────────────────────────────────────────
  const lastTapRef = useRef(0);
  const handleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 350) {
      openFullscreen();
    }
    lastTapRef.current = now;
  }, [openFullscreen]);

  // ── Image loading states ───────────────────────────────────────────────────
  const [inlineLoading, setInlineLoading] = useState(true);
  const [fsLoading, setFsLoading] = useState(true);

  // Reset loading when url changes (amount/bank changed)
  useEffect(() => { setInlineLoading(true); }, [qrUrl]);
  useEffect(() => { if (fullscreen) setFsLoading(true); }, [fullscreen, qrUrl]);

  // ── Fullscreen QR size (square, leaving room for text below) ──────────────
  const fsQrSize = Math.min(width - 64, 320);

  return (
    <>
      {/* ── Inline card ──────────────────────────────────────────────────── */}
      <TouchableOpacity activeOpacity={0.85} onPress={handleTap}>
        <View className="items-center">
          <View style={{ width: size, height: size, borderRadius: 8, overflow: 'hidden' }}>
            <Image
              source={{ uri: qrUrl }}
              style={{ width: size, height: size }}
              resizeMode="contain"
              onLoadStart={() => setInlineLoading(true)}
              onLoadEnd={() => setInlineLoading(false)}
            />
            {inlineLoading && (
              <View style={{ position: 'absolute', inset: 0, backgroundColor: '#f3f4f6', borderRadius: 8, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator size="large" color="#4f46e5" />
              </View>
            )}
          </View>
          {/* Double-tap hint */}
          <View className="flex-row items-center gap-x-1 mt-1.5 mb-1">
            <MaterialCommunityIcons name="gesture-double-tap" size={13} color="#a5b4fc" />
            <Text className={`${typo.caption} text-indigo-300 dark:text-indigo-500`}>
              {t('common.doubleTapFullscreen')}
            </Text>
          </View>
          <Text className={`${typo.heading} text-indigo-600 mt-1`}>
            {formatVnd(amount)}
          </Text>
          <Text className={`${typo.label} font-bold text-gray-700 dark:text-gray-200 mt-2`}>
            {bank.bankShortName ?? bank.bankName}
          </Text>
          <TouchableOpacity
            className="flex-row items-center gap-x-1 mt-1"
            onPress={() => {
              Clipboard.setStringAsync(bank.accountNumber);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text
              className={`${typo.label} font-bold text-gray-900 dark:text-white tracking-wider`}
              style={{ fontVariant: ['tabular-nums'] }}
            >
              {bank.accountNumber}
            </Text>
            <MaterialCommunityIcons name="content-copy" size={14} color="#9ca3af" />
          </TouchableOpacity>
          <Text className={`${typo.caption} text-gray-500 dark:text-gray-400 mt-0.5`}>
            {bank.accountName}
          </Text>
          <Text className={`${typo.caption} text-gray-400 dark:text-gray-500 mt-2`}>
            {t('common.scanQr')}
          </Text>
        </View>
      </TouchableOpacity>

      {/* ── Full-screen modal ─────────────────────────────────────────────── */}
      <Modal
        visible={fullscreen}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={closeFullscreen}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center' }}
          activeOpacity={1}
          onPress={closeFullscreen}
        >
          {/* Sheet — stop propagation so inner taps don't close */}
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => {/* stop propagation */}}
            style={{ alignItems: 'center', paddingHorizontal: 32, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }}
          >
            {/* Amount — very prominent */}
            <Text style={{ fontSize: 36, fontWeight: '800', color: '#a5b4fc', marginBottom: 6, letterSpacing: -0.5 }}>
              {formatVnd(amount)}
            </Text>

            {/* Bank name */}
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#e0e7ff', marginBottom: 20 }}>
              {bank.bankShortName ?? bank.bankName}
            </Text>

            {/* Large QR */}
            <View style={{ borderRadius: 16, overflow: 'hidden', backgroundColor: '#fff', padding: 12 }}>
              <Image
                source={{ uri: qrUrl }}
                style={{ width: fsQrSize, height: fsQrSize }}
                resizeMode="contain"
                onLoadStart={() => setFsLoading(true)}
                onLoadEnd={() => setFsLoading(false)}
              />
              {fsLoading && (
                <View style={{ position: 'absolute', top: 12, left: 12, width: fsQrSize, height: fsQrSize, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb' }}>
                  <ActivityIndicator size="large" color="#4f46e5" />
                </View>
              )}
            </View>

            {/* Account number + copy */}
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 20 }}
              onPress={() => {
                Clipboard.setStringAsync(bank.accountNumber);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={{ fontSize: 22, fontWeight: '700', color: '#fff', letterSpacing: 2, fontVariant: ['tabular-nums'] } as object}>
                {bank.accountNumber}
              </Text>
              <MaterialCommunityIcons name="content-copy" size={18} color="#a5b4fc" />
            </TouchableOpacity>

            <Text style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>
              {bank.accountName}
            </Text>

            {/* Auto-close countdown */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 28 }}>
              <MaterialCommunityIcons name="timer-outline" size={15} color="#64748b" />
              <Text style={{ fontSize: 13, color: '#64748b' }}>
                {t('common.autoClose', { seconds: secondsLeft })}
              </Text>
            </View>

            {/* Explicit close button */}
            <TouchableOpacity
              style={{ marginTop: 16, paddingHorizontal: 32, paddingVertical: 12, borderRadius: 100, borderWidth: 1, borderColor: '#334155' }}
              onPress={closeFullscreen}
            >
              <Text style={{ color: '#94a3b8', fontSize: 14, fontWeight: '600' }}>
                {t('common.close')}
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}
