import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type OnboardingProduct = {
  templateId?: string;
  name: string;
  price: number;
  unit: string;
  dynamicPrice: boolean;
};

export type OnboardingExpense = {
  name: string;
  monthlyAmount: number;
  paymentDate?: number;
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
  setStep3: (data: OnboardingState['step3']) => void;
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
      setStep3: (data) => set({ step3: data }),
      completeStep: (n) => set({ lastCompletedStep: n }),
      reset: () => set(initialState),
    }),
    {
      name: 'onboarding-draft',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
