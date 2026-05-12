import { useCartStore } from '../../store/cartStore';

const item1 = { productId: 'p1', name: 'Coffee', price: 30000, quantity: 1, unit: 'ly' };
const item2 = { productId: 'p2', name: 'Cake', price: 50000, quantity: 1, unit: 'cái' };

beforeEach(() => {
  useCartStore.setState({ items: [], promoCode: null, discount: 0 });
});

describe('cartStore — addItem', () => {
  it('adds a new item to an empty cart', () => {
    useCartStore.getState().addItem(item1);
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().items[0].productId).toBe('p1');
  });

  it('increments quantity when adding an existing item', () => {
    useCartStore.getState().addItem(item1);
    useCartStore.getState().addItem(item1);
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().items[0].quantity).toBe(2);
  });

  it('adds multiple distinct items', () => {
    useCartStore.getState().addItem(item1);
    useCartStore.getState().addItem(item2);
    expect(useCartStore.getState().items).toHaveLength(2);
  });
});

describe('cartStore — updateQty', () => {
  beforeEach(() => {
    useCartStore.getState().addItem(item1);
  });

  it('updates quantity of an existing item', () => {
    useCartStore.getState().updateQty('p1', 5);
    expect(useCartStore.getState().items[0].quantity).toBe(5);
  });

  it('removes the item when qty is 0', () => {
    useCartStore.getState().updateQty('p1', 0);
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it('removes the item when qty is negative', () => {
    useCartStore.getState().updateQty('p1', -1);
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it('does nothing for a non-existent productId', () => {
    useCartStore.getState().updateQty('unknown', 3);
    expect(useCartStore.getState().items).toHaveLength(1);
  });
});

describe('cartStore — removeItem', () => {
  it('removes the item by productId', () => {
    useCartStore.getState().addItem(item1);
    useCartStore.getState().addItem(item2);
    useCartStore.getState().removeItem('p1');
    const items = useCartStore.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0].productId).toBe('p2');
  });

  it('is a no-op for a non-existent productId', () => {
    useCartStore.getState().addItem(item1);
    useCartStore.getState().removeItem('unknown');
    expect(useCartStore.getState().items).toHaveLength(1);
  });
});

describe('cartStore — setCartItemId', () => {
  it('sets cartItemId on the matching item', () => {
    useCartStore.getState().addItem(item1);
    useCartStore.getState().setCartItemId('p1', 'cart-item-uuid');
    expect(useCartStore.getState().items[0].cartItemId).toBe('cart-item-uuid');
  });
});

describe('cartStore — setPromo', () => {
  it('stores promo code and discount', () => {
    useCartStore.getState().setPromo('SAVE10', 10000);
    const s = useCartStore.getState();
    expect(s.promoCode).toBe('SAVE10');
    expect(s.discount).toBe(10000);
  });

  it('can clear promo', () => {
    useCartStore.getState().setPromo('X', 5000);
    useCartStore.getState().setPromo(null, 0);
    expect(useCartStore.getState().promoCode).toBeNull();
    expect(useCartStore.getState().discount).toBe(0);
  });
});

describe('cartStore — clearCart', () => {
  it('empties all items and resets promo', () => {
    useCartStore.getState().addItem(item1);
    useCartStore.getState().setPromo('CODE', 5000);
    useCartStore.getState().clearCart();
    const s = useCartStore.getState();
    expect(s.items).toHaveLength(0);
    expect(s.promoCode).toBeNull();
    expect(s.discount).toBe(0);
  });
});

describe('cartStore — getTotal', () => {
  it('returns 0 for empty cart', () => {
    expect(useCartStore.getState().getTotal()).toBe(0);
  });

  it('sums item totals correctly', () => {
    useCartStore.getState().addItem({ ...item1, quantity: 2 });
    useCartStore.getState().addItem({ ...item2, quantity: 1 });
    expect(useCartStore.getState().getTotal()).toBe(30000 * 2 + 50000);
  });

  it('subtracts discount from total', () => {
    useCartStore.getState().addItem({ ...item1, quantity: 1 });
    useCartStore.getState().setPromo('10K', 10000);
    expect(useCartStore.getState().getTotal()).toBe(30000 - 10000);
  });

  it('never returns a negative total', () => {
    useCartStore.getState().addItem({ ...item1, quantity: 1 });
    useCartStore.getState().setPromo('HUGE', 999999);
    expect(useCartStore.getState().getTotal()).toBe(0);
  });
});
