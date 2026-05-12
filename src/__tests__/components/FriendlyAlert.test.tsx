import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { FriendlyAlert } from '../../components/FriendlyAlert';
import { useAlertStore } from '../../store/alertStore';

beforeEach(() => {
  useAlertStore.setState({ visible: false, title: '', message: '', buttons: [] });
});

describe('FriendlyAlert', () => {
  it('renders nothing when not visible', () => {
    render(<FriendlyAlert />);
    expect(screen.queryByText('Test Title')).toBeNull();
  });

  it('renders title and message when visible', () => {
    useAlertStore.getState().show('Test Title', 'Test message');
    render(<FriendlyAlert />);
    expect(screen.getByText('Test Title')).toBeTruthy();
    expect(screen.getByText('Test message')).toBeTruthy();
  });

  it('renders all button labels', () => {
    useAlertStore.getState().show('Confirm', 'Sure?', [
      { label: 'Cancel', style: 'cancel' },
      { label: 'Delete', style: 'destructive' },
    ]);
    render(<FriendlyAlert />);
    expect(screen.getByText('Cancel')).toBeTruthy();
    expect(screen.getByText('Delete')).toBeTruthy();
  });

  it('calls hide and button onPress when a button is pressed', () => {
    const onPress = jest.fn();
    useAlertStore.getState().show('T', 'M', [{ label: 'OK', onPress }]);
    render(<FriendlyAlert />);
    fireEvent.press(screen.getByText('OK'));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(useAlertStore.getState().visible).toBe(false);
  });

  it('hides without error when button has no onPress', () => {
    useAlertStore.getState().show('T', 'M', [{ label: 'Close' }]);
    render(<FriendlyAlert />);
    fireEvent.press(screen.getByText('Close'));
    expect(useAlertStore.getState().visible).toBe(false);
  });

  it('renders default OK button when no buttons provided', () => {
    useAlertStore.getState().show('Hi', 'World');
    render(<FriendlyAlert />);
    expect(screen.getByText('OK')).toBeTruthy();
  });
});
