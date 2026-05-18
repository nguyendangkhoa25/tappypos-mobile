import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type OnboardingProduct = {
  templateId: string;
  name: string;
  price: number;
  unit: string;
  dynamicPrice: boolean;
  categoryName?: string | null;
  durationMinutes?: number;
};

export type TableSetup = {
  tableNumber: string;
  capacity: number;
  location?: string;
};

export type OnboardingExpense = {
  name: string;
  monthlyAmount: number;
  category?: string;
  expenseType?: 'FIXED' | 'VARIABLE';
  paymentDate?: number;
  note?: string;
};

type OnboardingState = {
  lastCompletedStep: -1 | 0 | 1 | 2 | 3;
  shopTypeCode: string | null;
  step1: { nickname: string; fullName: string; shopName: string; address: string };
  step2: { products: OnboardingProduct[] };
  pawnTypes: string[];
  hasPawnFeature: boolean | null;
  pawnInterestRate: string;
  pawnCalcMode: string;
  pawnDueDate: string;
  tables: TableSetup[];
  step3: { expenses: OnboardingExpense[]; initialized: boolean };

  setShopType: (code: string) => void;
  setStep1: (data: OnboardingState['step1']) => void;
  setStep2: (data: OnboardingState['step2']) => void;
  addProduct: (product: OnboardingProduct) => void;
  removeProduct: (templateId: string) => void;
  updateProduct: (templateId: string, patch: Partial<Omit<OnboardingProduct, 'templateId'>>) => void;
  setPawnTypes: (types: string[]) => void;
  setHasPawnFeature: (value: boolean) => void;
  setPawnInterest: (rate: string, calcMode: string, dueDate: string) => void;
  setTables: (tables: TableSetup[]) => void;
  addTable: (table: TableSetup) => void;
  removeTable: (index: number) => void;
  setStep3: (data: Partial<OnboardingState['step3']>) => void;
  addExpense: (expense: OnboardingExpense) => void;
  removeExpense: (name: string) => void;
  updateExpense: (name: string, patch: Partial<Omit<OnboardingExpense, 'name'>>) => void;
  initProducts: (templates: import('../services/api').ProductTemplate[]) => void;
  initExpenses: (suggestions: { name: string; emoji: string; category?: string }[]) => void;
  completeStep: (n: 0 | 1 | 2 | 3) => void;
  reset: () => void;
};

const initialState = {
  lastCompletedStep: -1 as const,
  shopTypeCode: null,
  step1: { nickname: '', fullName: '', shopName: '', address: '' },
  step2: { products: [] },
  pawnTypes: [] as string[],
  hasPawnFeature: null as boolean | null,
  pawnInterestRate: '',
  pawnCalcMode: 'DAILY_30',
  pawnDueDate: '30',
  tables: [] as TableSetup[],
  step3: { expenses: [], initialized: false },
};

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      ...initialState,
      setShopType: (code) => set({ shopTypeCode: code }),
      setStep1: (data) => set({ step1: data }),
      setStep2: (data) => set({ step2: data }),
      addProduct: (product) =>
        set((s) => ({ step2: { products: [...s.step2.products, product] } })),
      removeProduct: (templateId) =>
        set((s) => ({ step2: { products: s.step2.products.filter((p) => p.templateId !== templateId) } })),
      updateProduct: (templateId, patch) =>
        set((s) => ({
          step2: {
            products: s.step2.products.map((p) =>
              p.templateId === templateId ? { ...p, ...patch } : p,
            ),
          },
        })),
      setPawnTypes: (types) => set({ pawnTypes: types }),
      setHasPawnFeature: (value) => set({ hasPawnFeature: value }),
      setPawnInterest: (rate, calcMode, dueDate) => set({ pawnInterestRate: rate, pawnCalcMode: calcMode, pawnDueDate: dueDate }),
      setTables: (tables) => set({ tables }),
      addTable: (table) => set((s) => ({ tables: [...s.tables, table] })),
      removeTable: (index) => set((s) => ({ tables: s.tables.filter((_, i) => i !== index) })),
      setStep3: (data) => set((s) => ({ step3: { ...s.step3, ...data } })),
      addExpense: (expense) =>
        set((s) => ({ step3: { ...s.step3, expenses: [...s.step3.expenses, expense] } })),
      removeExpense: (name) =>
        set((s) => ({ step3: { ...s.step3, expenses: s.step3.expenses.filter((e) => e.name !== name) } })),
      updateExpense: (name, patch) =>
        set((s) => ({
          step3: {
            ...s.step3,
            expenses: s.step3.expenses.map((e) => (e.name === name ? { ...e, ...patch } : e)),
          },
        })),
      initProducts: (templates) =>
        set((s) => {
          if (s.step2.products.length > 0) return s;
          return {
            step2: {
              products: templates.map((t) => ({
                templateId: t.id,
                name: t.name,
                price: t.price,
                unit: t.unit,
                dynamicPrice: t.dynamicPrice,
                categoryName: t.categoryName,
                durationMinutes: t.durationMinutes,
              })),
            },
          };
        }),
      initExpenses: (_suggestions) =>
        set((s) => {
          if (s.step3.initialized) return s;
          return {
            step3: {
              initialized: true,
              expenses: [],
            },
          };
        }),
      completeStep: (n) => set({ lastCompletedStep: n }),
      reset: () => set(initialState),
    }),
    {
      name: 'onboarding-draft',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
