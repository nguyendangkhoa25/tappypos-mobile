import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type OnboardingProduct = {
  templateId: string;
  name: string;
  price: number;
  unit: string;
  dynamicPrice: boolean;
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
  step3: { expenses: OnboardingExpense[] };

  setShopType: (code: string) => void;
  setStep1: (data: OnboardingState['step1']) => void;
  setStep2: (data: OnboardingState['step2']) => void;
  addProduct: (product: OnboardingProduct) => void;
  removeProduct: (templateId: string) => void;
  updateProduct: (templateId: string, patch: Partial<Omit<OnboardingProduct, 'templateId'>>) => void;
  setStep3: (data: OnboardingState['step3']) => void;
  addExpense: (expense: OnboardingExpense) => void;
  removeExpense: (name: string) => void;
  updateExpense: (name: string, patch: Partial<Omit<OnboardingExpense, 'name'>>) => void;
  completeStep: (n: 0 | 1 | 2 | 3) => void;
  reset: () => void;
};

const initialState = {
  lastCompletedStep: -1 as const,
  shopTypeCode: null,
  step1: { nickname: '', fullName: '', shopName: '', address: '' },
  step2: { products: [] },
  step3: { expenses: [] },
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
      setStep3: (data) => set({ step3: data }),
      addExpense: (expense) =>
        set((s) => ({ step3: { expenses: [...s.step3.expenses, expense] } })),
      removeExpense: (name) =>
        set((s) => ({ step3: { expenses: s.step3.expenses.filter((e) => e.name !== name) } })),
      updateExpense: (name, patch) =>
        set((s) => ({
          step3: {
            expenses: s.step3.expenses.map((e) => (e.name === name ? { ...e, ...patch } : e)),
          },
        })),
      completeStep: (n) => set({ lastCompletedStep: n }),
      reset: () => set(initialState),
    }),
    {
      name: 'onboarding-draft',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
