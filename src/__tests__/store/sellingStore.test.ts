import { useSellingStore } from '../../store/sellingStore';

beforeEach(() => {
  useSellingStore.setState({ activeView: 'POS' });
});

describe('sellingStore', () => {
  it('defaults to POS view', () => {
    expect(useSellingStore.getState().activeView).toBe('POS');
  });

  it('switches to ORDERS view', () => {
    useSellingStore.getState().setActiveView('ORDERS');
    expect(useSellingStore.getState().activeView).toBe('ORDERS');
  });

  it('switches back to POS view', () => {
    useSellingStore.getState().setActiveView('ORDERS');
    useSellingStore.getState().setActiveView('POS');
    expect(useSellingStore.getState().activeView).toBe('POS');
  });
});
