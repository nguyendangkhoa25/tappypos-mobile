import { useEffect, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useQueryClient } from '@tanstack/react-query';
import { cartApi, expenseApi } from '../services/api';
import { useNetworkStore } from '../store/networkStore';
import { useOfflineQueueStore } from '../store/offlineQueueStore';
import { useToastStore } from '../store/toastStore';

export function useOfflineSync() {
  const { setOffline } = useNetworkStore();
  const { pendingOrders, pendingExpenses, updateOrderStatus, updateExpenseStatus, removeOrder, removeExpense } =
    useOfflineQueueStore();
  const { show: showToast } = useToastStore();
  const qc = useQueryClient();
  const isSyncing = useRef(false);

  const syncQueue = async () => {
    if (isSyncing.current) return;
    const orders = useOfflineQueueStore.getState().pendingOrders.filter((o) => o.status === 'pending');
    const expenses = useOfflineQueueStore.getState().pendingExpenses.filter((e) => e.status === 'pending');
    if (orders.length === 0 && expenses.length === 0) return;

    isSyncing.current = true;
    let synced = 0;
    const total = orders.length + expenses.length;

    // Expenses first (simpler, no conflict risk)
    for (const expense of expenses) {
      updateExpenseStatus(expense.id, 'syncing');
      try {
        await expenseApi.create({
          description: expense.description,
          amount: expense.amount,
          category: expense.category,
          expenseDate: expense.expenseDate,
        });
        removeExpense(expense.id);
        synced++;
      } catch (err: any) {
        updateExpenseStatus(expense.id, 'error', err?.message ?? 'Sync failed');
      }
    }

    // Orders
    for (const order of orders) {
      updateOrderStatus(order.id, 'syncing');
      try {
        const initRes = await cartApi.init();
        const cartId = initRes.data.data.cartId;
        for (const item of order.items) {
          await cartApi.addItem(cartId, item.productId, item.quantity, item.price);
        }
        await cartApi.checkout(cartId, {
          paymentMethod: order.paymentMethod as any,
          amountPaid: order.total,
          tableId: order.tableId ?? undefined,
          tableLabel: order.tableLabel ?? undefined,
        });
        removeOrder(order.id);
        synced++;
      } catch (err: any) {
        updateOrderStatus(order.id, 'error', err?.message ?? 'Sync failed');
      }
    }

    isSyncing.current = false;
    if (synced > 0) {
      showToast(`✅ Đã đồng bộ ${synced}/${total} mục`);
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['expensesSummary'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    }
  };

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const offline = !(state.isConnected && state.isInternetReachable !== false);
      setOffline(offline);
      if (!offline) {
        syncQueue();
      }
    });
    return unsubscribe;
  }, []);
}
