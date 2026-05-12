import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';

const mockChangeLanguage = jest.fn();

jest.mock('../../hooks/useLanguage', () => ({
  useLanguage: () => ({ language: 'vi', changeLanguage: mockChangeLanguage }),
}));

import { LanguageChip } from '../../components/LanguageChip';

jest.useFakeTimers();

beforeEach(() => {
  mockChangeLanguage.mockReset();
  jest.clearAllTimers();
});

describe('LanguageChip', () => {
  it('renders the Vietnamese flag and label', () => {
    render(<LanguageChip />);
    expect(screen.getByText('🇻🇳')).toBeTruthy();
    expect(screen.getByText('VI')).toBeTruthy();
  });

  it('calls changeLanguage with next language after animation completes', () => {
    render(<LanguageChip />);
    fireEvent.press(screen.getByText('VI'));
    // Run all animation timers to trigger the .start() callback
    act(() => jest.runAllTimers());
    // 'vi' → next is 'en'
    expect(mockChangeLanguage).toHaveBeenCalledWith('en');
  });

  it('renders without crashing', () => {
    expect(() => render(<LanguageChip />)).not.toThrow();
  });
});
