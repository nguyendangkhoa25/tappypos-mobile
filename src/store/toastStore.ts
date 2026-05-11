import { create } from 'zustand';

type ToastState = {
  visible: boolean;
  message: string;
  onUndo?: () => void;
  show: (message: string, onUndo?: () => void) => void;
  hide: () => void;
};

export const useToastStore = create<ToastState>((set) => ({
  visible: false,
  message: '',
  onUndo: undefined,

  show: (message, onUndo) => set({ visible: true, message, onUndo }),
  hide: () => set({ visible: false, onUndo: undefined }),
}));
