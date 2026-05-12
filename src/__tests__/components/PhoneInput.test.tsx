import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { PhoneInput, stripPhone } from '../../components/PhoneInput';

describe('stripPhone', () => {
  it('removes non-digit characters', () => {
    expect(stripPhone('0123 456 789')).toBe('0123456789');
  });

  it('truncates to 10 digits', () => {
    expect(stripPhone('012345678999')).toBe('0123456789');
  });

  it('returns empty for empty string', () => {
    expect(stripPhone('')).toBe('');
  });

  it('strips dashes and parentheses', () => {
    expect(stripPhone('(012)-345.6789')).toBe('0123456789');
  });
});

describe('PhoneInput formatting', () => {
  it('renders short number (≤4 digits) without spaces', () => {
    const { getByDisplayValue } = render(
      <PhoneInput value="012" onChangeRaw={jest.fn()} />,
    );
    expect(getByDisplayValue('012')).toBeTruthy();
  });

  it('renders 5–7 digit number with one space', () => {
    const { getByDisplayValue } = render(
      <PhoneInput value="012345" onChangeRaw={jest.fn()} />,
    );
    expect(getByDisplayValue('0123 45')).toBeTruthy();
  });

  it('renders 10-digit number with two spaces', () => {
    const { getByDisplayValue } = render(
      <PhoneInput value="0123456789" onChangeRaw={jest.fn()} />,
    );
    expect(getByDisplayValue('0123 456 789')).toBeTruthy();
  });

  it('calls onChangeRaw with stripped digits on text change', () => {
    const onChangeRaw = jest.fn();
    const { getByDisplayValue } = render(
      <PhoneInput value="0123456789" onChangeRaw={onChangeRaw} />,
    );
    fireEvent.changeText(getByDisplayValue('0123 456 789'), '0987654321');
    expect(onChangeRaw).toHaveBeenCalledWith('0987654321');
  });

  it('calls onChangeRaw with empty string on clear', () => {
    const onChangeRaw = jest.fn();
    const onClear = jest.fn();
    const { getByTestId } = render(
      <PhoneInput value="0123456789" onChangeRaw={onChangeRaw} onClear={onClear} />,
    );
    // The MaterialCommunityIcons mock renders <Text testID={name} />
    fireEvent.press(getByTestId('close-circle'));
    expect(onChangeRaw).toHaveBeenCalledWith('');
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});
