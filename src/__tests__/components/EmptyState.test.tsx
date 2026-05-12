import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { EmptyState } from '../../components/EmptyState';

describe('EmptyState', () => {
  it('renders the title', () => {
    render(<EmptyState title="No items found" />);
    expect(screen.getByText('No items found')).toBeTruthy();
  });

  it('renders the default icon emoji', () => {
    render(<EmptyState title="Empty" />);
    expect(screen.getByText('📭')).toBeTruthy();
  });

  it('renders a custom icon emoji', () => {
    render(<EmptyState title="Empty" icon="🍜" />);
    expect(screen.getByText('🍜')).toBeTruthy();
  });

  it('renders description when provided', () => {
    render(<EmptyState title="Empty" description="Try adding something" />);
    expect(screen.getByText('Try adding something')).toBeTruthy();
  });

  it('does not render description when omitted', () => {
    render(<EmptyState title="Empty" />);
    expect(screen.queryByText('Try adding something')).toBeNull();
  });

  it('renders action button when both actionLabel and onAction are provided', () => {
    render(<EmptyState title="Empty" actionLabel="Add item" onAction={jest.fn()} />);
    expect(screen.getByText('Add item')).toBeTruthy();
  });

  it('calls onAction when action button is pressed', () => {
    const onAction = jest.fn();
    render(<EmptyState title="Empty" actionLabel="Add" onAction={onAction} />);
    fireEvent.press(screen.getByText('Add'));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('does not render action button when onAction is missing', () => {
    render(<EmptyState title="Empty" actionLabel="Add" />);
    expect(screen.queryByText('Add')).toBeNull();
  });
});
