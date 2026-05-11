import { create } from 'zustand';

export type ReportPeriod = 'day' | 'week' | 'month' | 'year' | 'custom';
export type ReportTab = 'revenue' | 'expenses';

type ReportState = {
  period: ReportPeriod;
  from: Date;
  to: Date;
  activeTab: ReportTab;
  revenueFilters: { paymentMethod?: string; status?: string };
  expenseFilters: { type?: 'FIXED' | 'VARIABLE'; category?: string };
  setPeriod: (p: ReportPeriod, from?: Date, to?: Date) => void;
  setActiveTab: (t: ReportTab) => void;
  setRevenueFilters: (f: ReportState['revenueFilters']) => void;
  setExpenseFilters: (f: ReportState['expenseFilters']) => void;
};

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function defaultRange(period: ReportPeriod): { from: Date; to: Date } {
  const now = new Date();
  const today = startOfDay(now);
  switch (period) {
    case 'day': {
      const end = new Date(today); end.setHours(23, 59, 59, 999);
      return { from: today, to: end };
    }
    case 'week': {
      const mon = new Date(today); mon.setDate(today.getDate() - today.getDay() + 1);
      const sun = new Date(mon); sun.setDate(mon.getDate() + 6); sun.setHours(23, 59, 59, 999);
      return { from: mon, to: sun };
    }
    case 'month': {
      const first = new Date(today.getFullYear(), today.getMonth(), 1);
      const last = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
      return { from: first, to: last };
    }
    case 'year': {
      const first = new Date(today.getFullYear(), 0, 1);
      const last = new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999);
      return { from: first, to: last };
    }
    default:
      return { from: today, to: now };
  }
}

export const useReportStore = create<ReportState>((set) => ({
  period: 'day',
  ...defaultRange('day'),
  activeTab: 'revenue',
  revenueFilters: {},
  expenseFilters: {},

  setPeriod: (p, from, to) => {
    const range = p === 'custom' && from && to ? { from, to } : defaultRange(p);
    set({ period: p, ...range });
  },

  setActiveTab: (t) => set({ activeTab: t }),
  setRevenueFilters: (f) => set({ revenueFilters: f }),
  setExpenseFilters: (f) => set({ expenseFilters: f }),
}));
