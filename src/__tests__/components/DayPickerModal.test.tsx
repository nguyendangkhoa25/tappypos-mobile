import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { DayPickerModal } from '../../components/DayPickerModal';

const defaultProps = {
  visible: true,
  selected: '',
  onSelect: jest.fn(),
  onClose: jest.fn(),
  title: 'Chọn ngày',
};

beforeEach(() => jest.clearAllMocks());

describe('DayPickerModal', () => {
  it('renders the title', () => {
    render(<DayPickerModal {...defaultProps} />);
    expect(screen.getByText('Chọn ngày')).toBeTruthy();
  });

  it('renders subtitle when provided', () => {
    render(<DayPickerModal {...defaultProps} subtitle="Ngày thanh toán" />);
    expect(screen.getByText('Ngày thanh toán')).toBeTruthy();
  });

  it('renders 31 day buttons', () => {
    render(<DayPickerModal {...defaultProps} />);
    expect(screen.getByText('1')).toBeTruthy();
    expect(screen.getByText('31')).toBeTruthy();
  });

  it('calls onSelect and onClose when a day is pressed', () => {
    render(<DayPickerModal {...defaultProps} />);
    fireEvent.press(screen.getByText('15'));
    expect(defaultProps.onSelect).toHaveBeenCalledWith('15');
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('does not show clear button when no clearLabel', () => {
    render(<DayPickerModal {...defaultProps} selected="10" />);
    expect(screen.queryByText('Xoá')).toBeNull();
  });

  it('shows clear button when clearLabel and selected provided', () => {
    render(<DayPickerModal {...defaultProps} selected="15" clearLabel="Xoá ngày" />);
    expect(screen.getByText('Xoá ngày')).toBeTruthy();
  });

  it('does not show clear button when selected is empty even with clearLabel', () => {
    render(<DayPickerModal {...defaultProps} selected="" clearLabel="Xoá ngày" />);
    expect(screen.queryByText('Xoá ngày')).toBeNull();
  });

  it('calls onSelect with empty string when clear is pressed', () => {
    render(<DayPickerModal {...defaultProps} selected="15" clearLabel="Xoá ngày" />);
    fireEvent.press(screen.getByText('Xoá ngày'));
    expect(defaultProps.onSelect).toHaveBeenCalledWith('');
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('backdrop press calls onClose', () => {
    render(<DayPickerModal {...defaultProps} />);
    // The first TouchableOpacity (flex-1 backdrop) calls onClose
    const touchables = screen.UNSAFE_getAllByType(require('react-native').TouchableOpacity);
    fireEvent.press(touchables[0]);
    expect(defaultProps.onClose).toHaveBeenCalled();
  });
});
