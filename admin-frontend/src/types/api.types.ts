// Mirrors backend Domain.ResponseModel
export interface ApiResult<T> {
  isSuccess: boolean;
  errors: string[] | null;
  data: T | null;
}

export interface ApiListResult<T> {
  isSuccess: boolean;
  errors: string[] | null;
  data: T[];
  totalCount: number;
  pagedTotalCount: number;
}

// Backend HttpErrorResponse shape
export interface ApiError {
  code: number;
  message: string;
}

// Backend UserRole enum (serialized as string by JsonStringEnumConverter)
export type UserRole = 'Admin' | 'Patient' | 'Doctor';
