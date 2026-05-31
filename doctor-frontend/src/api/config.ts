export const API_BASE_URL = 'https://localhost:5000';

export const API_ENDPOINTS = {
  auth: {
    signIn: '/api/auth/sign-in',
    refreshToken: '/api/auth/refresh-token',
    changePassword: '/api/auth/change-password',
  },
  doctors: {
    me: '/api/doctors/me',
  },
  appointments: {
    base: '/api/appoinment',
    byId: (id: string) => `/api/appoinment/${id}`,
    today: '/api/appoinment/today',
    status: (id: string) => `/api/appoinment/${id}/status`,
  },
  examinations: {
    base: '/api/examination',
    byId: (id: string) => `/api/examination/${id}`,
  },
  prescriptions: {
    base: '/api/prescription',
    byId: (id: string) => `/api/prescription/${id}`,
    items: (id: string) => `/api/prescription/${id}/items`,
  },
  medicines: {
    base: '/api/medicine',
    byId: (id: string) => `/api/medicine/${id}`,
  },
} as const;
