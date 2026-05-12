import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ErrorState } from '../../components/ErrorState';

describe('ErrorState', () => {
  it('renders the emoji', () => {
    render(<ErrorState />);
    expect(screen.getByText('😕')).toBeTruthy();
  });

  it('renders the error title key', () => {
    render(<ErrorState />);
    expect(screen.getByText('common.errorStateTitle')).toBeTruthy();
  });

  it('renders default message key when no message provided', () => {
    render(<ErrorState />);
    expect(screen.getByText('common.errorStateMsg')).toBeTruthy();
  });

  it('renders custom message when provided', () => {
    render(<ErrorState message="Network error" />);
    expect(screen.getByText('Network error')).toBeTruthy();
  });

  it('does not render retry button when onRetry is absent', () => {
    render(<ErrorState />);
    expect(screen.queryByText('common.retry')).toBeNull();
  });

  it('renders retry button when onRetry is provided', () => {
    render(<ErrorState onRetry={jest.fn()} />);
    expect(screen.getByText('common.retry')).toBeTruthy();
  });

  it('calls onRetry when retry button is pressed', () => {
    const onRetry = jest.fn();
    render(<ErrorState onRetry={onRetry} />);
    fireEvent.press(screen.getByText('common.retry'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
