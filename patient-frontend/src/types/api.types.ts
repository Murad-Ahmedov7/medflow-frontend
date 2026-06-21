export interface ApiResult<T> {
  isSuccess: boolean;
  errors: string[] | null;
  data: T | null;
}

// Backend ListResult<T> — used by doctor/department list endpoints
export interface ApiListResult<T> {
  isSuccess: boolean;
  errors: string[] | null;
  data: T[];
  totalCount: number;
  pagedTotalCount: number;
}

export interface ApiError {
  code: number;
  message: string;
}

export type UserRole = 'Admin' | 'Patient' | 'Doctor';
