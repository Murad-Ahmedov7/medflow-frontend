// GET /api/examination/{id} and GET /api/examination/appointment/{appointmentId}
export interface ExaminationResponse {
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

// PUT /api/examination/{id}
export interface UpdateExaminationRequest {
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

// POST /api/examination
export interface CreateExaminationRequest {
  appointmentId: string;
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
