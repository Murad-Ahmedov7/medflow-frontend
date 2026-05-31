export const API_BASE_URL = 'https://localhost:5000';

export const API_ENDPOINTS = {
  auth: {
    signIn: '/api/auth/sign-in',
    signUp: '/api/auth/sign-up',
    refreshToken: '/api/auth/refresh-token',
    changePassword: '/api/auth/change-password',
    forgotPassword: '/api/auth/forgot-password',
    resetPassword: '/api/auth/reset-password',
  },
  doctors: {
    base: '/api/doctors',
  },
  departments: {
    base: '/api/department',
  },
  services: {
    base: '/api/service',
  },
  patients: {
    me: '/api/patients/me',
    mePhoto: '/api/patients/me/photo',
  },
} as const;
