export type AppointmentStatus = 'Waiting' | 'InProgress' | 'Completed' | 'Cancelled';
export type AppointmentType = 'FirstVisit' | 'FollowUpVisit';

export const APPOINTMENT_STATUS_VALUES: Record<AppointmentStatus, number> = {
  Waiting:    1,
  InProgress: 2,
  Completed:  3,
  Cancelled:  4,
};

// Returned by GET /api/appoinment/today (strings, auto-filtered to this doctor)
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

// Returned by GET /api/appoinment/doctor (all appointments for this doctor)
export interface DoctorAppointmentResponse {
  id: string;
  patientId: string;
  patientFullName: string;
  patientImageUrl?: string | null;
  patientPhone?: string | null;
  patientEmail?: string | null;
  patientGender?: string | null;
  patientBirthDate?: string | null;
  appointmentDate: string;  // "YYYY-MM-DD"
  startTime: string;        // "HH:mm:ss"
  endTime: string;
  appointmentType: AppointmentType;
  status: AppointmentStatus;
  cancellationReason?: string | null;
  chatId?: string | null;
  examinationId?: string | null;
}

export type AppointmentTab = 'today' | 'upcoming' | 'completed' | 'cancelled';
