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
  chat: {
    base: '/api/chat',
    messages: (chatId: string) => `/api/chat/${chatId}/messages`,
    read: (chatId: string) => `/api/chat/${chatId}/read`,
    getOrCreate: '/api/chat/get-or-create',
    support: '/api/chat/support',
    internal: '/api/chat/internal',
  },
  examinations: {
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
    toggleAvailability: (id: string) => `/api/medicine/${id}/availability`,
    updateSellingPrice: (id: string) => `/api/medicine/${id}/selling-price`,
  },
  suppliers: {
    base: '/api/suppliers',
    byId: (id: string) => `/api/suppliers/${id}`,
    catalogue: (supplierId: string) => `/api/suppliers/${supplierId}/catalogue`,
    catalogueItem: (supplierId: string, medicineId: string) => `/api/suppliers/${supplierId}/catalogue/${medicineId}`,
    purchase: (supplierId: string) => `/api/suppliers/${supplierId}/purchase`,
  },
  stock: {
    base: '/api/stock',
    publish: (medicineId: string) => `/api/stock/${medicineId}/publish`,
  },
  balance: {
    base: '/api/balance',
    transactions: '/api/balance/transactions',
    checkout: '/api/balance/checkout',
    session: (sessionId: string) => `/api/balance/session/${sessionId}`,
    fulfillSession: (sessionId: string) => `/api/balance/fulfill-session/${sessionId}`,
  },
  feedback: {
    base: '/api/feedback',
    byId: (id: string) => `/api/feedback/${id}`,
    status: (id: string) => `/api/feedback/${id}/status`,
  },
  // Endpoint key renamed to medicineOrders for UI consistency; the URL path itself
  // stays /api/pharmacy-orders — it's the backend's wire contract, shared with
  // patient-frontend, and out of scope for this UI-only terminology rename.
  medicineOrders: {
    base: '/api/pharmacy-orders',
    status: (id: string) => `/api/pharmacy-orders/${id}/status`,
  },
  signalR: {
    chat: '/hubs/chat',
    stock: '/hubs/stock',
    feedback: '/hubs/feedback',
  },
} as const;
