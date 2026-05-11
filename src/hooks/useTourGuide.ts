import { useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';

const PREFIX = 'tour_done_';

/**
 * Shows a first-time onboarding tooltip for a screen.
 * Persists "seen" state in SecureStore — auto-hides after first view.
 *
 * Usage:
 *   const { visible, done } = useTourGuide('pos_screen');
 *   if (visible) <TourTooltip onDismiss={done} />
 */
export function useTourGuide(screenKey: string) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    SecureStore.getItemAsync(PREFIX + screenKey).then((val) => {
      if (!cancelled && !val) {
        const t = setTimeout(() => setVisible(true), 700);
        return () => clearTimeout(t);
      }
    });
    return () => { cancelled = true; };
  }, [screenKey]);

  const done = () => {
    SecureStore.setItemAsync(PREFIX + screenKey, '1');
    setVisible(false);
  };

  return { visible, done };
}
