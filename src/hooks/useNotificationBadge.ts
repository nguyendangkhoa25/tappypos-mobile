import { useQuery } from '@tanstack/react-query';
import { notificationApi } from '../services/api';
import { useFeature } from './useFeature';

export function useNotificationBadge() {
  const enabled = useFeature('NOTIFICATION');

  const { data } = useQuery({
    queryKey: ['notification-unread-count'],
    queryFn: () => notificationApi.getUnreadCount().then((r) => r.data.data.count ?? 0),
    enabled,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  return enabled ? (data ?? 0) : 0;
}
