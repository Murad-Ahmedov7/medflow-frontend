import axiosInstance from '../api/axiosInstance';
import { API_ENDPOINTS } from '../api/config';
import type { ApiListResult, ApiResult } from '../types/api.types';
import type { DepartmentResponse, CreateDepartmentRequest, UpdateDepartmentRequest } from '../types/department.types';

export const departmentService = {
  getAll: async () => {
    const response = await axiosInstance.get<ApiListResult<DepartmentResponse>>(
      API_ENDPOINTS.departments.base,
    );
    return response.data;
  },

  create: async (data: CreateDepartmentRequest) => {
    const response = await axiosInstance.post<ApiResult<DepartmentResponse>>(
      API_ENDPOINTS.departments.base,
      data,
    );
    return response.data;
  },

  update: async (id: string, data: UpdateDepartmentRequest) => {
    const response = await axiosInstance.put<ApiResult<DepartmentResponse>>(
      API_ENDPOINTS.departments.byId(id),
      data,
    );
    return response.data;
  },

  delete: async (id: string) => {
    const response = await axiosInstance.delete<ApiResult<null>>(
      API_ENDPOINTS.departments.byId(id),
    );
    return response.data;
  },
};
