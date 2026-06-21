// GET /api/examination/{id} — patient view
export interface ExaminationViewResponse {
  id: string;
  appointmentId: string;
  prescriptionId?: string | null;
  complaint: string;
  diagnosis: string;
  notes?: string | null;
  temperature: number;
  bloodPressureSystolic: number;
  bloodPressureDiastolic: number;
  pulse?: number | null;
  weight?: number | null;
  height?: number | null;
}

// GET /api/prescription/{id}/items — patient view
export interface PrescriptionItemView {
  id: string;
  medicineId: string;
  medicineName: string;
  dose: number;
  frequency: number;
  durationInDays: number;
  usageInstruction?: string | null;
  quantity: number;
  unitPrice: number | null;
  totalPrice: number | null;
  isAvailable: boolean;
}

// GET /api/prescription/{id}
export interface PrescriptionView {
  id: string;
  examinationId: string;
  title: string;
  prescriptionItems: PrescriptionItemView[];
  /** True once a non-cancelled pharmacy order already exists for this prescription */
  hasPharmacyOrder: boolean;
}

// POST /api/pharmacy-orders, GET /api/pharmacy-orders/my
export type PharmacyOrderStatus = 'Pending' | 'Preparing' | 'Ready' | 'Delivered' | 'Cancelled';

export interface PharmacyOrderItemResponse {
  medicineName: string;
  quantity: number;
  unitPrice: number;
}

export interface PharmacyOrderResponse {
  id: string;
  patientFullName: string;
  items: PharmacyOrderItemResponse[];
  medicineCount: number;
  totalPrice: number;
  status: PharmacyOrderStatus;
  createdAt: string;
  /** Appointment context the order's prescription was written from */
  doctorName: string | null;
  appointmentDate: string | null;
  appointmentType: 'FirstVisit' | 'FollowUpVisit' | null;
}

export interface PharmacyOrderListResponse {
  items: PharmacyOrderResponse[];
  totalCount: number;
}
