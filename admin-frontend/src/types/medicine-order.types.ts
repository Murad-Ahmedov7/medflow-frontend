export type MedicineOrderStatus = 'Pending' | 'Preparing' | 'Ready' | 'Delivered' | 'Cancelled';

export interface MedicineOrderItemResponse {
  medicineName: string;
  quantity: number;
  unitPrice: number;
}

export interface MedicineOrderResponse {
  id: string;
  patientFullName: string;
  items: MedicineOrderItemResponse[];
  medicineCount: number;
  totalPrice: number;
  status: MedicineOrderStatus;
  createdAt: string;
}

export interface MedicineOrderListResponse {
  items: MedicineOrderResponse[];
  totalCount: number;
}
