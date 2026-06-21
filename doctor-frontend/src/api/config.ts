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
    doctor: '/api/appoinment/doctor',
    status: (id: string) => `/api/appoinment/${id}/status`,
    doctorCancel: (id: string) => `/api/appoinment/${id}/doctor-cancel`,
  },
  signalR: {
    hub: '/hubs/appointments',
    chat: '/hubs/chat',
  },
  chat: {
    base: '/api/chat',
    messages: (chatId: string) => `/api/chat/${chatId}/messages`,
    read: (chatId: string) => `/api/chat/${chatId}/read`,
    getOrCreate: '/api/chat/get-or-create',
    internal: '/api/chat/internal',
  },
  examinations: {
    base: '/api/examination',
    byId: (id: string) => `/api/examination/${id}`,
    byAppointmentId: (appointmentId: string) => `/api/examination/appointment/${appointmentId}`,
    update: (id: string) => `/api/examination/${id}`,
  },
  prescriptions: {
    base: '/api/prescription',
    byId: (id: string) => `/api/prescription/${id}`,
    items: (id: string) => `/api/prescription/${id}/items`,
    deleteItem: (id: string, itemId: string) => `/api/prescription/${id}/items/${itemId}`,
  },
  medicines: {
    base: '/api/medicine',
    byId: (id: string) => `/api/medicine/${id}`,
  },
} as const;
