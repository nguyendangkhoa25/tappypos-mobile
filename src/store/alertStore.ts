import { create } from 'zustand';

export type AlertButton = {
  label: string;
  onPress?: () => void;
  style?: 'default' | 'destructive' | 'cancel';
};

type AlertState = {
  visible: boolean;
  title: string;
  message: string;
  buttons: AlertButton[];
  show: (title: string, message: string, buttons?: AlertButton[]) => void;
  hide: () => void;
};

export const useAlertStore = create<AlertState>((set) => ({
  visible: false,
  title: '',
  message: '',
  buttons: [],

  show: (title, message, buttons = [{ label: 'OK' }]) =>
    set({ visible: true, title, message, buttons }),

  hide: () => set({ visible: false }),
}));
