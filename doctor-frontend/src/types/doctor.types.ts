export interface DoctorProfileResponse {
  id: string;
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
  departmentName: string;
}
