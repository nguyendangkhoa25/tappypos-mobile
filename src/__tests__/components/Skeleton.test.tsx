import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: { View },
    useSharedValue: jest.fn((val: unknown) => ({ value: val })),
    useAnimatedStyle: jest.fn((fn: () => object) => fn()),
    withRepeat: jest.fn((a: unknown) => a),
    withTiming: jest.fn((val: unknown) => val),
    cancelAnimation: jest.fn(),
    Easing: {
      inOut: jest.fn(() => (t: number) => t),
      sin: (t: number) => t,
    },
  };
});

import { Skeleton } from '../../components/Skeleton';

describe('Skeleton', () => {
  it('renders without crashing', () => {
    expect(() => render(<Skeleton height={20} />)).not.toThrow();
  });

  it('renders with custom width', () => {
    expect(() => render(<Skeleton height={20} width={100} />)).not.toThrow();
  });

  it('renders with light variant', () => {
    expect(() => render(<Skeleton height={20} variant="light" />)).not.toThrow();
  });

  it('renders with default variant', () => {
    expect(() => render(<Skeleton height={20} variant="default" />)).not.toThrow();
  });

  it('renders with custom borderRadius', () => {
    expect(() => render(<Skeleton height={20} borderRadius={4} />)).not.toThrow();
  });
});
