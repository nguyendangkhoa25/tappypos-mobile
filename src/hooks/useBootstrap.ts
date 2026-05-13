import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { userApi, shopConfigApi } from '../services/api';
import { useUserStore } from '../store/userStore';
import i18n from '../i18n';

/**
 * Fires once when the authenticated app mounts.
 * Fetches fresh profile + shop config from the API and syncs them into
 * the user store so the rest of the app always has up-to-date data.
 * Both queries are cached for 5 minutes so navigation between screens
 * never triggers duplicate network calls.
 */
export function useBootstrap() {
  const { setAll } = useUserStore();

  const { data: profile } = useQuery({
    queryKey: ['profile-me'],
    queryFn: () => userApi.getMe().then((r) => r.data.data),
    staleTime: 5 * 60 * 1000,
  });

  const { data: shopConfig } = useQuery({
    queryKey: ['shop-config'],
    queryFn: () => shopConfigApi.getInfo().then((r) => r.data.data),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!profile && !shopConfig) return;
    setAll({
      nickname: profile?.nickname ?? undefined,
      fullName: profile?.fullName ?? undefined,
      shopName: shopConfig?.shopName ?? profile?.shopName ?? undefined,
    });
  }, [profile, shopConfig]);

  useEffect(() => {
    if (!profile) return;
    if (profile.lang !== i18n.language) {
      userApi.updateLang(profile.username, i18n.language).catch(() => {});
    }
  }, [profile]);
}
