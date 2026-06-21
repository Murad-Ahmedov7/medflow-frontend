// GET /api/patients  →  ApiListResult<PatientResponse>
// GET /api/patients/{id}  →  ApiResult<PatientResponse>
// Note: email is not in PatientResponse — derive from appointment cross-reference if needed
export interface PatientResponse {
  id: string;
  firstName: string;
  lastName: string;
  fin: string;
  phone: string;
  address?: string | null;
  birthDate: string;          // ISO datetime string
  gender: string;             // "Male" | "Female" (serialized as string)
  bloodGroup: string;         // "OPlus" | "OMinus" | "APlus" | etc. (serialized as string)
  allergies?: string | null;
  createdAt: string;          // ISO datetime string
}

// Enriched patient with computed fields derived from appointments/prescriptions
export interface PatientEnriched extends PatientResponse {
  email?: string | null;         // derived from appointments cross-reference
  appointmentCount: number;      // computed from all appointments by patientId
  prescriptionCount: number;     // computed from all prescriptions by patientFullName match
}

export type PatientGender = 'Male' | 'Female';

export const BLOOD_GROUP_LABELS: Record<string, string> = {
  Unknown: 'Unknown',
  OPlus: 'O+',
  OMinus: 'O-',
  APlus: 'A+',
  AMinus: 'A-',
  BPlus: 'B+',
  BMinus: 'B-',
  ABPlus: 'AB+',
  ABMinus: 'AB-',
};
