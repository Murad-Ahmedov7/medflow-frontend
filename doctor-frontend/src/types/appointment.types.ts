export type AppointmentStatus = 'Waiting' | 'InProgress' | 'Completed';
export type AppointmentType = 'FirstVisit' | 'FollowUpVisit';

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
  queueNumber: number;
}
