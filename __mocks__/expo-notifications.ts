export const setNotificationHandler = jest.fn();
export const getPermissionsAsync = jest.fn().mockResolvedValue({ status: 'undetermined' });
export const requestPermissionsAsync = jest.fn().mockResolvedValue({ status: 'granted' });
export const getExpoPushTokenAsync = jest.fn().mockResolvedValue({ data: 'ExponentPushToken[test]' });
export const scheduleNotificationAsync = jest.fn().mockResolvedValue('notification-id');
export const cancelAllScheduledNotificationsAsync = jest.fn().mockResolvedValue(undefined);
