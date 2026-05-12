import { renderHook, act } from '@testing-library/react-native';
import { useTourGuide } from '../../hooks/useTourGuide';

jest.useFakeTimers();

const secureStore = require('expo-secure-store');

beforeEach(() => secureStore.__reset());
afterEach(() => jest.clearAllTimers());

describe('useTourGuide', () => {
  it('starts with visible=false', () => {
    const { result } = renderHook(() => useTourGuide('home'));
    expect(result.current.visible).toBe(false);
  });

  it('shows tooltip after 700ms when screen not seen before', async () => {
    const { result } = renderHook(() => useTourGuide('home'));
    // Flush the SecureStore.getItemAsync promise (returns null)
    await act(async () => {});
    // Advance past the 700ms timeout
    act(() => jest.advanceTimersByTime(700));
    expect(result.current.visible).toBe(true);
  });

  it('does not show tooltip when screen has already been seen', async () => {
    secureStore.__set('tour_done_home', '1');
    const { result } = renderHook(() => useTourGuide('home'));
    await act(async () => {});
    act(() => jest.advanceTimersByTime(700));
    expect(result.current.visible).toBe(false);
  });

  it('done() hides the tooltip and persists the seen flag', async () => {
    const { result } = renderHook(() => useTourGuide('pos'));
    await act(async () => {});
    act(() => jest.advanceTimersByTime(700));
    expect(result.current.visible).toBe(true);

    act(() => result.current.done());
    expect(result.current.visible).toBe(false);
    expect(secureStore.setItemAsync).toHaveBeenCalledWith('tour_done_pos', '1');
  });
});
