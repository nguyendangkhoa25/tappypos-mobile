import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { PasswordInput } from '../../components/PasswordInput';

describe('PasswordInput', () => {
  it('renders a secure text input by default', () => {
    render(<PasswordInput value="secret" onChangeText={jest.fn()} />);
    const input = screen.getByDisplayValue('secret');
    expect(input.props.secureTextEntry).toBe(true);
  });

  it('toggles visibility when eye icon is pressed', () => {
    render(<PasswordInput value="secret" onChangeText={jest.fn()} />);
    const toggle = screen.getByTestId('eye-outline');
    fireEvent.press(toggle);
    expect(screen.getByDisplayValue('secret').props.secureTextEntry).toBe(false);
  });

  it('toggles back to hidden on second press', () => {
    render(<PasswordInput value="secret" onChangeText={jest.fn()} />);
    fireEvent.press(screen.getByTestId('eye-outline'));
    // After first press it shows as eye-off-outline
    fireEvent.press(screen.getByTestId('eye-off-outline'));
    expect(screen.getByDisplayValue('secret').props.secureTextEntry).toBe(true);
  });

  it('calls onChangeText with new value', () => {
    const onChange = jest.fn();
    render(<PasswordInput value="" onChangeText={onChange} />);
    fireEvent.changeText(screen.getByDisplayValue(''), 'NewPass1!');
    expect(onChange).toHaveBeenCalledWith('NewPass1!');
  });

  it('does not show strength meter for empty value', () => {
    render(<PasswordInput value="" onChangeText={jest.fn()} showStrength />);
    expect(screen.queryByText(/Yếu|Trung bình|Khá|Mạnh/)).toBeNull();
  });

  it('shows "Yếu" for a weak password', () => {
    render(<PasswordInput value="a" onChangeText={jest.fn()} showStrength />);
    expect(screen.getByText('Yếu')).toBeTruthy();
  });

  it('shows "Mạnh" for a strong password', () => {
    render(<PasswordInput value="StrongPass1!" onChangeText={jest.fn()} showStrength />);
    expect(screen.getByText('Mạnh')).toBeTruthy();
  });

  it('shows rules checklist when showRules is true', () => {
    render(<PasswordInput value="test" onChangeText={jest.fn()} showRules />);
    expect(screen.getByText('Ít nhất 8 ký tự')).toBeTruthy();
    expect(screen.getByText('Chữ hoa (A–Z)')).toBeTruthy();
  });

  it('does not show rules by default', () => {
    render(<PasswordInput value="test" onChangeText={jest.fn()} />);
    expect(screen.queryByText('Ít nhất 8 ký tự')).toBeNull();
  });
});
