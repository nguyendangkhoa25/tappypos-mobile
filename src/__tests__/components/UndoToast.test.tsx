import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { UndoToast } from '../../components/UndoToast';
import { useToastStore } from '../../store/toastStore';

jest.useFakeTimers();

function renderToast() {
  return render(
    <SafeAreaProvider initialMetrics={{ insets: { top: 0, left: 0, right: 0, bottom: 0 }, frame: { x: 0, y: 0, width: 390, height: 844 } }}>
      <UndoToast />
    </SafeAreaProvider>,
  );
}

beforeEach(() => {
  useToastStore.setState({ visible: false, message: '', onUndo: undefined });
});

afterEach(() => {
  jest.clearAllTimers();
});

describe('UndoToast', () => {
  it('renders nothing when not visible', () => {
    renderToast();
    expect(screen.queryByText('Item deleted')).toBeNull();
  });

  it('shows the message when visible', () => {
    useToastStore.getState().show('Item deleted');
    renderToast();
    expect(screen.getByText('Item deleted')).toBeTruthy();
  });

  it('does not show undo button when no onUndo callback', () => {
    useToastStore.getState().show('Done');
    renderToast();
    expect(screen.queryByText('Hoàn tác')).toBeNull();
  });

  it('shows undo button when onUndo is provided', () => {
    useToastStore.getState().show('Deleted', jest.fn());
    renderToast();
    expect(screen.getByText('Hoàn tác')).toBeTruthy();
  });

  it('calls onUndo and hides toast when undo is pressed', () => {
    const onUndo = jest.fn();
    useToastStore.getState().show('Deleted', onUndo);
    renderToast();
    fireEvent.press(screen.getByText('Hoàn tác'));
    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(useToastStore.getState().visible).toBe(false);
  });
});
