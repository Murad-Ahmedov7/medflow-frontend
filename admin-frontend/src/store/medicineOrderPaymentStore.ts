import { create } from 'zustand';

interface MedicineOrderPaymentEvent {
  amount: number;
  newBalance: number;
}

interface MedicineOrderPaymentState {
  pendingPayment: MedicineOrderPaymentEvent | null;
  setPendingPayment: (payment: MedicineOrderPaymentEvent) => void;
  clearPendingPayment: () => void;
}

// Bridges the single global SignalR connection (useBalanceHub, mounted once in
// DashboardLayout) to FinancePage — FinancePage shows the success modal only while
// it's mounted and reading this store, without opening a second hub connection.
export const useMedicineOrderPaymentStore = create<MedicineOrderPaymentState>((set) => ({
  pendingPayment: null,
  setPendingPayment: (pendingPayment) => set({ pendingPayment }),
  clearPendingPayment: () => set({ pendingPayment: null }),
}));
