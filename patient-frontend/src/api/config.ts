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
    byId: (id: string) => `/api/doctors/${id}`,
    schedules: (id: string) => `/api/doctors/${id}/schedules`,
  },
  departments: {
    base: '/api/departments',
  },
  services: {
    base: '/api/service',
  },
  patients: {
    me: '/api/patients/me',
    mePhoto: '/api/patients/me/photo',
  },
  signalR: {
    hub: '/hubs/appointments',
    chat: '/hubs/chat',
    feedback: '/hubs/feedback',
  },
  chat: {
    base: '/api/chat',
    messages: (chatId: string) => `/api/chat/${chatId}/messages`,
    read: (chatId: string) => `/api/chat/${chatId}/read`,
    getOrCreate: '/api/chat/get-or-create',
    support: '/api/chat/support',
  },
  appointments: {
    // Note: intentional typo "appoinment" in backend route — preserved
    base: '/api/appoinment',
    my: '/api/appoinment/my',
    availableSlots: '/api/appoinment/available-slots',
    cancel: (id: string) => `/api/appoinment/${id}`,
    reschedule: (id: string) => `/api/appoinment/${id}/reschedule`,
  },
  feedback: {
    base: '/api/feedback',
    my: '/api/feedback/my',
  },
  favorites: {
    toggle: (doctorId: string) => `/api/favorites/${doctorId}`,
    my: '/api/favorites',
    ids: '/api/favorites/ids',
  },
  wallet: {
    balance: '/api/wallet/balance',
    transactions: '/api/wallet/transactions',
    checkout: '/api/wallet/checkout',
    session: (sessionId: string) => `/api/wallet/session/${sessionId}`,
    fulfillSession: (sessionId: string) => `/api/wallet/fulfill-session/${sessionId}`,
  },
  examinations: {
    byId: (id: string) => `/api/examination/${id}`,
  },
  prescriptions: {
    byId: (id: string) => `/api/prescription/${id}`,
    items: (id: string) => `/api/prescription/${id}/items`,
  },
  pharmacyOrders: {
    create: '/api/pharmacy-orders',
    my: '/api/pharmacy-orders/my',
  },
} as const;
