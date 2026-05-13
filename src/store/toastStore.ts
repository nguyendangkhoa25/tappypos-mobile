import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

type ToastState = {
  visible: boolean;
  message: string;
  type: ToastType;
  onUndo?: () => void;
  show: (message: string, onUndo?: () => void, type?: ToastType) => void;
  hide: () => void;
};

export const useToastStore = create<ToastState>((set) => ({
  visible: false,
  message: '',
  type: 'success',
  onUndo: undefined,

  show: (message, onUndo, type = 'success') => set({ visible: true, message, onUndo, type }),
  hide: () => set({ visible: false, onUndo: undefined }),
}));
