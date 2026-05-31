export interface CreateDoctorRequest {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  departmentId: string;
  specialty: string;
  imageUrl?: string;
  about?: string;
  licenseNumber?: string;
  yearsOfExperience: number;
  consultationFee: number;
}

export interface UpdateDoctorRequest {
  departmentId: string;
  specialty: string;
  imageUrl?: string;
  about?: string;
  licenseNumber?: string;
  yearsOfExperience: number;
  consultationFee: number;
  isActive: boolean;
  fullName: string;
  phone: string;
}

export interface CreateDoctorResponse {
  id: string;
}

export interface DoctorResponse {
  id: string;
  departmentId: string;
  departmentName: string;
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  specialty: string;
  imageUrl?: string;
  about?: string;
  licenseNumber?: string;
  yearsOfExperience: number;
  consultationFee: number;
  isActive: boolean;
  createdAt: string;
}

export interface DoctorStatsResponse {
  totalDoctors: number;
  activeDoctors: number;
  departmentCount: number;
  todayAvailableDoctors: number;
}

export interface DoctorsQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  departmentId?: string;
  isActive?: boolean;
  specialty?: string;
  sortBy?: string;
  sortDesc?: boolean;
}

export interface ExportDoctorsParams {
  search?: string;
  departmentId?: string;
  isActive?: boolean;
  sortBy?: string;
  sortDesc?: boolean;
  // Localised column headers
  colFullName: string;
  colEmail: string;
  colPhone: string;
  colDepartment: string;
  colSpecialty: string;
  colLicense: string;
  colExperience: string;
  colFee: string;
  colStatus: string;
  colActive: string;
  colInactive: string;
  colJoined: string;
  sheetName: string;
}
