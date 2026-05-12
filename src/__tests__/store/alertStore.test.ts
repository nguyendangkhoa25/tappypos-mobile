import { useAlertStore } from '../../store/alertStore';

beforeEach(() => {
  useAlertStore.setState({ visible: false, title: '', message: '', buttons: [] });
});

describe('alertStore — show', () => {
  it('sets visible to true', () => {
    useAlertStore.getState().show('Title', 'Message');
    expect(useAlertStore.getState().visible).toBe(true);
  });

  it('sets title and message', () => {
    useAlertStore.getState().show('My Title', 'My Message');
    const state = useAlertStore.getState();
    expect(state.title).toBe('My Title');
    expect(state.message).toBe('My Message');
  });

  it('defaults to a single OK button when no buttons provided', () => {
    useAlertStore.getState().show('T', 'M');
    const { buttons } = useAlertStore.getState();
    expect(buttons).toHaveLength(1);
    expect(buttons[0].label).toBe('OK');
  });

  it('accepts custom buttons', () => {
    const buttons = [
      { label: 'Cancel', style: 'cancel' as const },
      { label: 'Delete', style: 'destructive' as const, onPress: jest.fn() },
    ];
    useAlertStore.getState().show('Confirm', 'Are you sure?', buttons);
    expect(useAlertStore.getState().buttons).toHaveLength(2);
    expect(useAlertStore.getState().buttons[1].label).toBe('Delete');
  });
});

describe('alertStore — hide', () => {
  it('sets visible to false', () => {
    useAlertStore.setState({ visible: true, title: 'T', message: 'M', buttons: [] });
    useAlertStore.getState().hide();
    expect(useAlertStore.getState().visible).toBe(false);
  });

  it('does not clear title/message on hide', () => {
    useAlertStore.setState({ visible: true, title: 'Keep', message: 'Me', buttons: [] });
    useAlertStore.getState().hide();
    expect(useAlertStore.getState().title).toBe('Keep');
  });
});

describe('alertStore — button styles', () => {
  it('supports all button style variants', () => {
    const buttons = [
      { label: 'A', style: 'default' as const },
      { label: 'B', style: 'destructive' as const },
      { label: 'C', style: 'cancel' as const },
    ];
    useAlertStore.getState().show('T', 'M', buttons);
    const stored = useAlertStore.getState().buttons;
    expect(stored[0].style).toBe('default');
    expect(stored[1].style).toBe('destructive');
    expect(stored[2].style).toBe('cancel');
  });
});
