import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ClearableInput } from '../../components/ClearableInput';

describe('ClearableInput', () => {
  it('renders the text input', () => {
    render(<ClearableInput value="" onChangeText={jest.fn()} />);
    expect(screen.getByDisplayValue('')).toBeTruthy();
  });

  it('shows the current value', () => {
    render(<ClearableInput value="hello" onChangeText={jest.fn()} />);
    expect(screen.getByDisplayValue('hello')).toBeTruthy();
  });

  it('does not show clear button when value is empty', () => {
    render(<ClearableInput value="" onChangeText={jest.fn()} />);
    expect(screen.queryByTestId('close-circle')).toBeNull();
  });

  it('shows clear button when value is non-empty', () => {
    render(<ClearableInput value="text" onChangeText={jest.fn()} />);
    expect(screen.getByTestId('close-circle')).toBeTruthy();
  });

  it('calls onClear when clear button is pressed', () => {
    const onClear = jest.fn();
    render(<ClearableInput value="text" onClear={onClear} onChangeText={jest.fn()} />);
    fireEvent.press(screen.getByTestId('close-circle'));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('calls onChangeText with new text', () => {
    const onChange = jest.fn();
    render(<ClearableInput value="" onChangeText={onChange} />);
    fireEvent.changeText(screen.getByDisplayValue(''), 'new text');
    expect(onChange).toHaveBeenCalledWith('new text');
  });

  it('passes placeholder to the input', () => {
    render(<ClearableInput value="" onChangeText={jest.fn()} placeholder="Type here" />);
    expect(screen.getByPlaceholderText('Type here')).toBeTruthy();
  });
});
