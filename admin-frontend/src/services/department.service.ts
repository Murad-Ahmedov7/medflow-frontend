import axiosInstance from '../api/axiosInstance';
import { API_ENDPOINTS } from '../api/config';
import type { ApiListResult } from '../types/api.types';
import type { DepartmentResponse } from '../types/department.types';

export const departmentService = {
  getAll: async () => {
    const response = await axiosInstance.get<ApiListResult<DepartmentResponse>>(
      API_ENDPOINTS.departments.base,
    );
    return response.data;
  },
};
