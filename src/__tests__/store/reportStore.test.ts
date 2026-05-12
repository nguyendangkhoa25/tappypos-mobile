import { useReportStore } from '../../store/reportStore';

beforeEach(() => {
  useReportStore.setState({
    period: 'day',
    activeTab: 'revenue',
    revenueFilters: {},
    expenseFilters: {},
  } as any);
});

describe('reportStore — setPeriod', () => {
  it('sets period to day and computes today range', () => {
    useReportStore.getState().setPeriod('day');
    const { period, from, to } = useReportStore.getState();
    expect(period).toBe('day');
    expect(from.getDate()).toBe(new Date().getDate());
    expect(to.getHours()).toBe(23);
  });

  it('sets period to week and from is Monday', () => {
    useReportStore.getState().setPeriod('week');
    const { from } = useReportStore.getState();
    const dayOfWeek = from.getDay();
    expect(dayOfWeek).toBe(1);
  });

  it('sets period to month and from is first of month', () => {
    useReportStore.getState().setPeriod('month');
    expect(useReportStore.getState().from.getDate()).toBe(1);
  });

  it('sets period to year and from is Jan 1', () => {
    useReportStore.getState().setPeriod('year');
    const { from } = useReportStore.getState();
    expect(from.getMonth()).toBe(0);
    expect(from.getDate()).toBe(1);
  });

  it('sets custom range when period is custom with explicit dates', () => {
    const customFrom = new Date(2024, 0, 10);
    const customTo = new Date(2024, 0, 20);
    useReportStore.getState().setPeriod('custom', customFrom, customTo);
    const { from, to } = useReportStore.getState();
    expect(from.getDate()).toBe(10);
    expect(to.getDate()).toBe(20);
  });
});

describe('reportStore — setActiveTab', () => {
  it('switches to expenses tab', () => {
    useReportStore.getState().setActiveTab('expenses');
    expect(useReportStore.getState().activeTab).toBe('expenses');
  });

  it('switches back to revenue tab', () => {
    useReportStore.getState().setActiveTab('expenses');
    useReportStore.getState().setActiveTab('revenue');
    expect(useReportStore.getState().activeTab).toBe('revenue');
  });
});

describe('reportStore — filters', () => {
  it('sets revenue filters', () => {
    useReportStore.getState().setRevenueFilters({ paymentMethod: 'CASH', status: 'COMPLETED' });
    expect(useReportStore.getState().revenueFilters.paymentMethod).toBe('CASH');
  });

  it('sets expense filters', () => {
    useReportStore.getState().setExpenseFilters({ type: 'FIXED' });
    expect(useReportStore.getState().expenseFilters.type).toBe('FIXED');
  });

  it('clears filters with empty objects', () => {
    useReportStore.getState().setRevenueFilters({ paymentMethod: 'CASH' });
    useReportStore.getState().setRevenueFilters({});
    expect(useReportStore.getState().revenueFilters.paymentMethod).toBeUndefined();
  });
});
