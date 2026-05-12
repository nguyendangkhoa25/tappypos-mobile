jest.mock('../../i18n', () => ({ language: 'vi' }));

import * as Notifications from 'expo-notifications';
import * as ExpoNotificationsMock from 'expo-notifications';

const notifMock = ExpoNotificationsMock as jest.Mocked<typeof ExpoNotificationsMock>;

import {
  requestNotificationPermission,
  registerPushToken,
  scheduleOrderReminder,
  cancelAllScheduledNotifications,
} from '../../utils/notifications';

beforeEach(() => jest.clearAllMocks());

describe('requestNotificationPermission', () => {
  it('returns true immediately when already granted', async () => {
    notifMock.getPermissionsAsync.mockResolvedValue({ status: 'granted' } as any);
    const result = await requestNotificationPermission();
    expect(result).toBe(true);
    expect(notifMock.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('requests permissions and returns true when granted', async () => {
    notifMock.getPermissionsAsync.mockResolvedValue({ status: 'undetermined' } as any);
    notifMock.requestPermissionsAsync.mockResolvedValue({ status: 'granted' } as any);
    const result = await requestNotificationPermission();
    expect(result).toBe(true);
  });

  it('returns false when permission denied', async () => {
    notifMock.getPermissionsAsync.mockResolvedValue({ status: 'undetermined' } as any);
    notifMock.requestPermissionsAsync.mockResolvedValue({ status: 'denied' } as any);
    const result = await requestNotificationPermission();
    expect(result).toBe(false);
  });
});

describe('registerPushToken', () => {
  it('no-ops when EAS projectId is absent', async () => {
    const Constants = require('expo-constants').default;
    const original = Constants.expoConfig;
    Constants.expoConfig = {};
    const onToken = jest.fn();
    await registerPushToken(onToken);
    expect(onToken).not.toHaveBeenCalled();
    Constants.expoConfig = original;
  });

  it('no-ops when permission not granted', async () => {
    notifMock.getPermissionsAsync.mockResolvedValue({ status: 'undetermined' } as any);
    notifMock.requestPermissionsAsync.mockResolvedValue({ status: 'denied' } as any);
    const onToken = jest.fn();
    await registerPushToken(onToken);
    expect(onToken).not.toHaveBeenCalled();
  });

  it('calls onToken with token and platform when granted', async () => {
    notifMock.getPermissionsAsync.mockResolvedValue({ status: 'granted' } as any);
    notifMock.getExpoPushTokenAsync.mockResolvedValue({ data: 'ExponentPushToken[abc]' } as any);
    const onToken = jest.fn();
    await registerPushToken(onToken);
    expect(onToken).toHaveBeenCalledWith('ExponentPushToken[abc]', expect.stringMatching(/ios|android/));
  });

  it('no-ops when getExpoPushTokenAsync returns null', async () => {
    notifMock.getPermissionsAsync.mockResolvedValue({ status: 'granted' } as any);
    notifMock.getExpoPushTokenAsync.mockRejectedValue(new Error('no token'));
    const onToken = jest.fn();
    await registerPushToken(onToken);
    expect(onToken).not.toHaveBeenCalled();
  });
});

describe('scheduleOrderReminder', () => {
  it('no-ops when permission not granted', async () => {
    notifMock.getPermissionsAsync.mockResolvedValue({ status: 'undetermined' } as any);
    notifMock.requestPermissionsAsync.mockResolvedValue({ status: 'denied' } as any);
    await scheduleOrderReminder({ orderId: '1', orderNumber: 'HD001', dueInMinutes: 5 });
    expect(notifMock.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('schedules notification with Vietnamese text', async () => {
    notifMock.getPermissionsAsync.mockResolvedValue({ status: 'granted' } as any);
    await scheduleOrderReminder({ orderId: '1', orderNumber: 'HD001', dueInMinutes: 10 });
    expect(notifMock.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({
          title: expect.stringContaining('HD001'),
          body: expect.stringContaining('10'),
        }),
      }),
    );
  });
});

describe('cancelAllScheduledNotifications', () => {
  it('delegates to expo-notifications', async () => {
    await cancelAllScheduledNotifications();
    expect(notifMock.cancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1);
  });
});
