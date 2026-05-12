import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { FloatingLabelInput } from '../../components/FloatingLabelInput';

describe('FloatingLabelInput', () => {
  it('renders the label text', () => {
    render(<FloatingLabelInput label="Tên sản phẩm" value="" onChangeText={jest.fn()} />);
    expect(screen.getByText('Tên sản phẩm')).toBeTruthy();
  });

  it('renders the current value', () => {
    const { getByDisplayValue } = render(
      <FloatingLabelInput label="Label" value="hello" onChangeText={jest.fn()} />,
    );
    expect(getByDisplayValue('hello')).toBeTruthy();
  });

  it('does not show clear button when value is empty', () => {
    render(<FloatingLabelInput label="Label" value="" onChangeText={jest.fn()} />);
    expect(screen.queryByTestId('close-circle')).toBeNull();
  });

  it('shows clear button when value is non-empty', () => {
    render(<FloatingLabelInput label="Label" value="abc" onChangeText={jest.fn()} />);
    expect(screen.getByTestId('close-circle')).toBeTruthy();
  });

  it('calls onClear when clear button is pressed', () => {
    const onClear = jest.fn();
    render(
      <FloatingLabelInput label="Label" value="abc" onChangeText={jest.fn()} onClear={onClear} />,
    );
    fireEvent.press(screen.getByTestId('close-circle'));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('does not throw when onClear is not provided and clear is pressed', () => {
    render(<FloatingLabelInput label="Label" value="abc" onChangeText={jest.fn()} />);
    expect(() => fireEvent.press(screen.getByTestId('close-circle'))).not.toThrow();
  });

  it('triggers onFocus callback', () => {
    const onFocus = jest.fn();
    const { getByDisplayValue } = render(
      <FloatingLabelInput label="Label" value="" onChangeText={jest.fn()} onFocus={onFocus} />,
    );
    fireEvent(getByDisplayValue(''), 'focus');
    expect(onFocus).toHaveBeenCalledTimes(1);
  });

  it('triggers onBlur callback', () => {
    const onBlur = jest.fn();
    const { getByDisplayValue } = render(
      <FloatingLabelInput label="Label" value="" onChangeText={jest.fn()} onBlur={onBlur} />,
    );
    fireEvent(getByDisplayValue(''), 'blur');
    expect(onBlur).toHaveBeenCalledTimes(1);
  });
});
