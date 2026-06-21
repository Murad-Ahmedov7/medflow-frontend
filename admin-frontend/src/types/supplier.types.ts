export interface SupplierResponse {
  id: string;
  name: string;
  contactEmail?: string | null;
  phone?: string | null;
  createdAt: string;
}

export interface SupplierSummaryResponse {
  id: string;
  name: string;
}

export interface CatalogueItemResponse {
  supplierId: string;
  medicineId: string;
  medicineName: string;
  medicineForm: string;
  medicineStrength?: string | null;
  medicineSellingPrice: number;
  unitPrice: number;
  availableQuantity: number;
}

export interface UpsertCatalogueItemRequest {
  unitPrice?: number;
  availableQuantity: number;
}

export interface StockItemResponse {
  medicineId: string;
  medicineName: string;
  medicineForm: string;
  medicineStrength?: string | null;
  quantityOnHand: number;
  costPrice: number;
  sellingPrice: number;
  lastSupplierName?: string | null;
}

export interface PurchaseOrderLineRequest {
  medicineId: string;
  quantity: number;
  unitPrice: number;
}

export interface CreatePurchaseOrderRequest {
  lines: PurchaseOrderLineRequest[];
}

export interface PurchaseOrderItemResponse {
  medicineId: string;
  medicineName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface PurchaseOrderResponse {
  id: string;
  supplierId: string;
  supplierName: string;
  purchasedAt: string;
  totalCost: number;
  items: PurchaseOrderItemResponse[];
}
