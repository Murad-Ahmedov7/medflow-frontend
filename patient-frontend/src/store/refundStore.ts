import { create } from 'zustand';

interface RefundEvent {
  amount: number;
  newBalance: number;
}

interface RefundState {
  pendingRefund: RefundEvent | null;
  setPendingRefund: (refund: RefundEvent) => void;
  clearPendingRefund: () => void;
}

// Bridges the single global SignalR connection (usePatientHub, mounted once in
// App.tsx) to wherever the patient happens to be — the refund-success modal renders
// from App.tsx itself so it appears on any page, without a second hub connection.
export const useRefundStore = create<RefundState>((set) => ({
  pendingRefund: null,
  setPendingRefund: (pendingRefund) => set({ pendingRefund }),
  clearPendingRefund: () => set({ pendingRefund: null }),
}));
