export const API_BASE_URL = 'https://localhost:5000';

export const API_ENDPOINTS = {
  auth: {
    signIn: '/api/auth/sign-in',
    refreshToken: '/api/auth/refresh-token',
    changePassword: '/api/auth/change-password',
  },
  users: {
    createDoctor: '/api/users',
  },
  patients: {
    base: '/api/patients',
    byId: (id: string) => `/api/patients/${id}`,
    byFin: (fin: string) => `/api/patients/by-fin/${fin}`,
    byPhone: '/api/patients/by-phone',
    byName: '/api/patients/by-name',
  },
  doctors: {
    base: '/api/doctors',
    byId: (id: string) => `/api/doctors/${id}`,
    stats: '/api/doctors/stats',
    export: '/api/doctors/export',
    me: '/api/doctors/me',
    toggleStatus: (id: string) => `/api/doctors/${id}/toggle-status`,
    uploadPhoto: (id: string) => `/api/doctors/${id}/photo`,
  },
  departments: {
    base: '/api/departments',
    byId: (id: string) => `/api/departments/${id}`,
  },
  appointments: {
    // Note: backend route has intentional typo "appoinment"
    base: '/api/appoinment',
    byId: (id: string) => `/api/appoinment/${id}`,
    today: '/api/appoinment/today',
    status: (id: string) => `/api/appoinment/${id}/status`,
  },
  services: {
    base: '/api/service',
    byId: (id: string) => `/api/service/${id}`,
  },
  invoices: {
    base: '/api/invoice',
    byId: (id: string) => `/api/invoice/${id}`,
  },
  payments: {
    base: '/api/payment',
  },
} as const;
