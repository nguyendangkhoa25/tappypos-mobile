import { useOnboardingStore } from '../../store/onboardingStore';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
  mergeItem: jest.fn().mockResolvedValue(undefined),
  clear: jest.fn().mockResolvedValue(undefined),
  getAllKeys: jest.fn().mockResolvedValue([]),
  multiGet: jest.fn().mockResolvedValue([]),
  multiSet: jest.fn().mockResolvedValue(undefined),
}));

const product1 = { templateId: 't1', name: 'Cà phê', price: 30000, unit: 'ly', dynamicPrice: false };
const product2 = { templateId: 't2', name: 'Trà', price: 20000, unit: 'ly', dynamicPrice: false };
const expense1 = { name: 'Thuê nhà', monthlyAmount: 5000000 };

beforeEach(() => {
  useOnboardingStore.setState({
    lastCompletedStep: -1,
    shopTypeCode: null,
    step1: { nickname: '', fullName: '', shopName: '', address: '' },
    step2: { products: [] },
    step3: { expenses: [] },
  });
});

describe('onboardingStore — shop type', () => {
  it('sets shop type code', () => {
    useOnboardingStore.getState().setShopType('CAFE');
    expect(useOnboardingStore.getState().shopTypeCode).toBe('CAFE');
  });
});

describe('onboardingStore — step1', () => {
  it('sets step1 data', () => {
    const data = { nickname: 'K', fullName: 'Khoa', shopName: 'My Cafe', address: 'HN' };
    useOnboardingStore.getState().setStep1(data);
    expect(useOnboardingStore.getState().step1).toEqual(data);
  });
});

describe('onboardingStore — products', () => {
  it('adds a product', () => {
    useOnboardingStore.getState().addProduct(product1);
    expect(useOnboardingStore.getState().step2.products).toHaveLength(1);
  });

  it('adds multiple distinct products', () => {
    useOnboardingStore.getState().addProduct(product1);
    useOnboardingStore.getState().addProduct(product2);
    expect(useOnboardingStore.getState().step2.products).toHaveLength(2);
  });

  it('removes a product by templateId', () => {
    useOnboardingStore.getState().addProduct(product1);
    useOnboardingStore.getState().addProduct(product2);
    useOnboardingStore.getState().removeProduct('t1');
    const products = useOnboardingStore.getState().step2.products;
    expect(products).toHaveLength(1);
    expect(products[0].templateId).toBe('t2');
  });

  it('updates a product field', () => {
    useOnboardingStore.getState().addProduct(product1);
    useOnboardingStore.getState().updateProduct('t1', { price: 35000 });
    expect(useOnboardingStore.getState().step2.products[0].price).toBe(35000);
  });
});

describe('onboardingStore — expenses', () => {
  it('adds an expense', () => {
    useOnboardingStore.getState().addExpense(expense1);
    expect(useOnboardingStore.getState().step3.expenses).toHaveLength(1);
  });

  it('removes an expense by name', () => {
    useOnboardingStore.getState().addExpense(expense1);
    useOnboardingStore.getState().removeExpense('Thuê nhà');
    expect(useOnboardingStore.getState().step3.expenses).toHaveLength(0);
  });

  it('updates an expense field', () => {
    useOnboardingStore.getState().addExpense(expense1);
    useOnboardingStore.getState().updateExpense('Thuê nhà', { monthlyAmount: 6000000 });
    expect(useOnboardingStore.getState().step3.expenses[0].monthlyAmount).toBe(6000000);
  });
});

describe('onboardingStore — completeStep and reset', () => {
  it('records the last completed step', () => {
    useOnboardingStore.getState().completeStep(2);
    expect(useOnboardingStore.getState().lastCompletedStep).toBe(2);
  });

  it('reset clears all state', () => {
    useOnboardingStore.getState().setShopType('CAFE');
    useOnboardingStore.getState().addProduct(product1);
    useOnboardingStore.getState().completeStep(1);
    useOnboardingStore.getState().reset();
    const s = useOnboardingStore.getState();
    expect(s.shopTypeCode).toBeNull();
    expect(s.step2.products).toHaveLength(0);
    expect(s.lastCompletedStep).toBe(-1);
  });
});
