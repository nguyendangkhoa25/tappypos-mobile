import { useToastStore } from '../../store/toastStore';

beforeEach(() => {
  useToastStore.setState({ visible: false, message: '', onUndo: undefined });
});

describe('toastStore — show', () => {
  it('sets visible and message', () => {
    useToastStore.getState().show('Saved!');
    const state = useToastStore.getState();
    expect(state.visible).toBe(true);
    expect(state.message).toBe('Saved!');
  });

  it('onUndo is undefined when not provided', () => {
    useToastStore.getState().show('Done');
    expect(useToastStore.getState().onUndo).toBeUndefined();
  });

  it('stores onUndo callback when provided', () => {
    const undo = jest.fn();
    useToastStore.getState().show('Item deleted', undo);
    expect(useToastStore.getState().onUndo).toBe(undo);
  });

  it('replaces previous message on second show', () => {
    useToastStore.getState().show('First');
    useToastStore.getState().show('Second');
    expect(useToastStore.getState().message).toBe('Second');
  });
});

describe('toastStore — hide', () => {
  it('sets visible to false', () => {
    useToastStore.setState({ visible: true, message: 'Hi', onUndo: undefined });
    useToastStore.getState().hide();
    expect(useToastStore.getState().visible).toBe(false);
  });

  it('clears onUndo on hide', () => {
    const undo = jest.fn();
    useToastStore.setState({ visible: true, message: 'Hi', onUndo: undo });
    useToastStore.getState().hide();
    expect(useToastStore.getState().onUndo).toBeUndefined();
  });
});
