import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import i18n from '../i18n';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Request notification permissions. Returns true if granted.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/**
 * Obtain the Expo push token for this device and pass it to a registration
 * callback (e.g. your API call to store the token server-side).
 * No-ops on simulator or when no EAS projectId is configured.
 */
export async function registerPushToken(
  onToken: (token: string, platform: 'ios' | 'android') => void,
): Promise<void> {
  if (!Constants.expoConfig?.extra?.eas?.projectId) return;
  const granted = await requestNotificationPermission();
  if (!granted) return;

  const tokenData = await Notifications.getExpoPushTokenAsync().catch(() => null);
  if (!tokenData) return;

  const platform = Platform.OS === 'ios' ? 'ios' : 'android';
  onToken(tokenData.data, platform);
}

export type OrderReminderData = {
  orderId: string;
  orderNumber: string;
  dueInMinutes: number;
};

/**
 * Schedule a local notification reminding staff to complete a pending order.
 */
export async function scheduleOrderReminder(order: OrderReminderData): Promise<void> {
  const granted = await requestNotificationPermission();
  if (!granted) return;

  const lang = i18n.language;
  const title = lang === 'vi'
    ? `⏰ Đơn hàng #${order.orderNumber} chờ xử lý`
    : `⏰ Order #${order.orderNumber} pending`;
  const body = lang === 'vi'
    ? `Đơn hàng đã chờ ${order.dueInMinutes} phút. Vui lòng xử lý sớm.`
    : `Order has been pending for ${order.dueInMinutes} minutes.`;

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: { type: 'order_reminder', orderId: order.orderId },
    },
    trigger: null,
  });
}

/**
 * Cancel all scheduled notifications (call on logout or session clear).
 */
export async function cancelAllScheduledNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
