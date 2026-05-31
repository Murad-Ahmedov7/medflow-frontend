export interface ApiResult<T> {
  isSuccess: boolean;
  errors: string[] | null;
  data: T | null;
}

export interface ApiListResult<T> {
  isSuccess: boolean;
  errors: string[] | null;
  items: T[];
  totalCount: number;
}

export interface ApiError {
  code: number;
  message: string;
}

export type UserRole = 'Admin' | 'Patient' | 'Doctor';
