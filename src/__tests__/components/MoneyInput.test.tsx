import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { MoneyInput } from '../../components/MoneyInput';

describe('MoneyInput', () => {
  it('renders with empty rawValue', () => {
    render(<MoneyInput rawValue="" onChangeRaw={jest.fn()} />);
    // No words rendered for empty value
    expect(screen.queryByText(/một/i)).toBeNull();
  });

  it('shows formatted display value', () => {
    const { getByDisplayValue } = render(
      <MoneyInput rawValue="1500000" onChangeRaw={jest.fn()} />,
    );
    expect(getByDisplayValue('1.500.000')).toBeTruthy();
  });

  it('shows number-to-words for non-zero value', () => {
    render(<MoneyInput rawValue="1000000" onChangeRaw={jest.fn()} />);
    // numberToWords(1000000, 'vi') contains 'triệu'
    expect(screen.getByText(/triệu/i)).toBeTruthy();
  });

  it('renders the đ symbol', () => {
    render(<MoneyInput rawValue="" onChangeRaw={jest.fn()} />);
    expect(screen.getByText('đ')).toBeTruthy();
  });

  it('strips non-digits and calls onChangeRaw', () => {
    const onChangeRaw = jest.fn();
    const { getByDisplayValue } = render(
      <MoneyInput rawValue="100" onChangeRaw={onChangeRaw} />,
    );
    fireEvent.changeText(getByDisplayValue('100'), '200abc');
    expect(onChangeRaw).toHaveBeenCalledWith('200');
  });

  it('passes placeholder to the TextInput', () => {
    const { getByPlaceholderText } = render(
      <MoneyInput rawValue="" onChangeRaw={jest.fn()} placeholder="Nhập số tiền" />,
    );
    expect(getByPlaceholderText('Nhập số tiền')).toBeTruthy();
  });
});
