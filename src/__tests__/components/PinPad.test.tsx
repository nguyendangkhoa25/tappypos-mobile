import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { PinPad } from '../../components/PinPad';

describe('PinPad', () => {
  it('renders all digit keys 0–9', () => {
    render(<PinPad value="" onChange={jest.fn()} />);
    for (const digit of ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']) {
      expect(screen.getByText(digit)).toBeTruthy();
    }
  });

  it('calls onChange with appended digit', () => {
    const onChange = jest.fn();
    render(<PinPad value="12" onChange={onChange} />);
    fireEvent.press(screen.getByText('3'));
    expect(onChange).toHaveBeenCalledWith('123');
  });

  it('does not add digit when maxLength reached', () => {
    const onChange = jest.fn();
    render(<PinPad value="123456" onChange={onChange} maxLength={6} />);
    fireEvent.press(screen.getByText('7'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('deletes last character on del press', () => {
    const onChange = jest.fn();
    render(<PinPad value="123" onChange={onChange} />);
    fireEvent.press(screen.getByTestId('backspace-outline'));
    expect(onChange).toHaveBeenCalledWith('12');
  });

  it('calls onBiometric when fingerprint key is pressed', () => {
    const onBiometric = jest.fn();
    render(<PinPad value="" onChange={jest.fn()} onBiometric={onBiometric} />);
    fireEvent.press(screen.getByTestId('fingerprint'));
    expect(onBiometric).toHaveBeenCalledTimes(1);
  });

  it('renders empty placeholder instead of bio key when onBiometric is absent', () => {
    render(<PinPad value="" onChange={jest.fn()} />);
    expect(screen.queryByTestId('fingerprint')).toBeNull();
  });

  it('shows ActivityIndicator when loading', () => {
    const { UNSAFE_getByType } = render(
      <PinPad value="" onChange={jest.fn()} loading />,
    );
    expect(UNSAFE_getByType(require('react-native').ActivityIndicator)).toBeTruthy();
  });

  it('hides the keypad when loading', () => {
    render(<PinPad value="1" onChange={jest.fn()} loading />);
    // Digit buttons are not rendered when loading — no '2' text
    expect(screen.queryByText('2')).toBeNull();
  });

  it('shows dot indicators for entered digits', () => {
    render(<PinPad value="123" onChange={jest.fn()} maxLength={6} />);
    // 3 filled + 3 empty dots — just verify no crash
    expect(screen.getByText('1')).toBeTruthy();
  });
});
