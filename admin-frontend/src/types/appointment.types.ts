// Status and type come back as strings from GetTodayAppointments (via .ToString() in AutoMapper)
// and as numeric bytes from GetAllAppointments / GetById.
// We normalise both to string unions throughout the frontend.
export type AppointmentStatus = 'Waiting' | 'InProgress' | 'Completed' | 'Cancelled';
export type AppointmentType = 'FirstVisit' | 'FollowUpVisit';

// Numeric byte values sent TO the backend
export const APPOINTMENT_TYPE_VALUES: Record<AppointmentType, number> = {
  FirstVisit: 1,
  FollowUpVisit: 2,
};
export const APPOINTMENT_STATUS_VALUES: Record<AppointmentStatus, number> = {
  Waiting: 1,
  InProgress: 2,
  Completed: 3,
  Cancelled: 4,
};
export const APPOINTMENT_STATUS_FROM_BYTE: Record<number, AppointmentStatus> = {
  1: 'Waiting',
  2: 'InProgress',
  3: 'Completed',
  4: 'Cancelled',
};
export const APPOINTMENT_TYPE_FROM_BYTE: Record<number, AppointmentType> = {
  1: 'FirstVisit',
  2: 'FollowUpVisit',
};

// Shape returned by GET /api/appoinment (all) and GET /api/appoinment/{id}
// Status/Type are byte values (1/2/3) serialised as numbers by System.Text.Json.
export interface AppointmentResponse {
  id: string;
  doctorId: string;
  doctorName: string;
  patientId: string;
  patientFullName: string;
  patientEmail?: string | null;
  patientPhone?: string | null;
  patientBirthDate?: string | null;  // ISO datetime string
  appointmentDate: string;           // "YYYY-MM-DD"
  startTime: string;                 // "HH:mm:ss"
  endTime: string;
  appointmentType: number;           // byte 1 or 2
  status: number;                    // byte 1, 2, or 3
  cancellationReason?: string | null;
  examinationId?: string | null;
}

// Shape returned by GET /api/appoinment/today (strings, has Id and patientFullName)
export interface TodayAppointmentResponse {
  id: string;
  doctorId: string;
  patientId: string;
  patientFullName: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  appointmentType: AppointmentType;
  status: AppointmentStatus;
}

// What we send to PATCH /api/appoinment/{id}/status
export interface UpdateAppointmentStatusRequest {
  status: number;           // byte
}

