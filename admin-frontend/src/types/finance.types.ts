export interface AdminBalanceResponse {
  balance: number;
  totalTopUps: number;
  totalSpent: number;
  updatedAt: string;
}

export type BalanceTransactionType = 'TopUp' | 'Purchase' | 'Income';

export interface PurchaseLineSnapshot {
  medicineName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface BalanceTransactionResponse {
  id: string;
  type: BalanceTransactionType;
  amount: number;
  description: string | null;
  createdAt: string;
  purchaseLines: PurchaseLineSnapshot[];
}

export interface BalanceTransactionListResponse {
  items: BalanceTransactionResponse[];
  totalCount: number;
}

export interface CreateCheckoutRequest {
  amount: number;
}
