// GET /api/examination/{id}
export interface ExaminationResponse {
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
