export interface DepartmentResponse {
  id: string;
  name: string;
  imageUrl?: string;
  createdAt: string;
}

export interface CreateDepartmentRequest {
  name: string;
  imageUrl?: string;
}

export interface UpdateDepartmentRequest {
  name: string;
  imageUrl?: string;
}

export interface DepartmentWithDoctorCount extends DepartmentResponse {
  doctorCount: number;
}
