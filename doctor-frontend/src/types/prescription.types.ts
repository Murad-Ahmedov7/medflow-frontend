// Item shape from GET /api/prescription/{id} and GET /api/prescription/{id}/items
export interface PrescriptionItemResponse {
  id: string;
  medicineId: string;
  medicineName: string;
  dose: number;
  frequency: number;
  durationInDays: number;
  usageInstruction?: string | null;
}

// GET /api/prescription/{id}
export interface PrescriptionResponse {
  id: string;
  examinationId: string;
  title: string;
  createdAt?: string;
  prescriptionItems: PrescriptionItemResponse[];
}

// POST /api/prescription
export interface CreatePrescriptionRequest {
  examinationId: string;
  title: string;
}

// POST /api/prescription/{id}/items
export interface AddPrescriptionItemRequest {
  medicineId: string;
  dose: number;
  frequency: number;
  durationInDays: number;
  usageInstruction?: string | null;
}
