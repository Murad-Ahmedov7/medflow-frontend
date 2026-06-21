// Item shape inside a prescription
export interface PrescriptionItemResponse {
  id: string;
  medicineId: string;
  medicineName: string;
  dose: number;
  frequency: number;
  durationInDays: number;
  usageInstruction?: string | null;
}

// GET /api/prescription (admin list — includes patient/doctor/date context)
export interface PrescriptionListItem {
  id: string;
  title: string;
  patientFullName: string;
  doctorFullName: string;
  appointmentDate?: string | null;  // "YYYY-MM-DD"
  prescriptionItems: PrescriptionItemResponse[];
}

// GET /api/prescription/{id}
export interface PrescriptionResponse {
  id: string;
  examinationId: string;
  title: string;
  prescriptionItems: PrescriptionItemResponse[];
}
