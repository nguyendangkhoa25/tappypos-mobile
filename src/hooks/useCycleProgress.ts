import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Calculates progress metrics for a date-range period (e.g. a reporting cycle).
 *
 * Returns:
 *   todayLabel  — e.g. "CN, 11 thg 5"
 *   cycleLabel  — e.g. "1 thg 5 – 31 thg 5"
 *   daysLeft    — days until endDate; -1 if period has passed or no dates
 *   progress    — 0–1 fraction elapsed; null if no dates provided
 */
export function useCycleProgress(startDate?: string, endDate?: string) {
  const { i18n } = useTranslation();
  const locale = i18n.language === 'vi' ? 'vi-VN' : 'en-US';

  return useMemo(() => {
    const today = new Date();

    const todayLabel = today.toLocaleDateString(locale, {
      weekday: 'short', day: 'numeric', month: 'short',
    });

    if (!startDate || !endDate) {
      return { todayLabel, cycleLabel: null, daysLeft: -1, progress: null };
    }

    const start = new Date(startDate + 'T00:00:00');
    const end   = new Date(endDate + 'T00:00:00');

    const fmtShort = (d: Date) =>
      d.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
    const cycleLabel = `${fmtShort(start)} – ${fmtShort(end)}`;

    const totalMs   = end.getTime() - start.getTime();
    const elapsedMs = today.getTime() - start.getTime();
    const progress  = totalMs > 0 ? Math.min(Math.max(elapsedMs / totalMs, 0), 1) : null;

    const msLeft  = end.getTime() - today.getTime();
    const daysLeft = msLeft >= 0 ? Math.ceil(msLeft / (1000 * 60 * 60 * 24)) : -1;

    return { todayLabel, cycleLabel, daysLeft, progress };
  }, [startDate, endDate, locale]);
}
