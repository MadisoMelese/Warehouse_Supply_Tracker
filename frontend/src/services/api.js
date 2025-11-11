import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle 401 responses (unauthorized)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (email, password) => api.post('/auth/register', { email, password }),
  logout: () => api.post('/auth/logout'),
  getAllUsers: () => api.get('/auth/users'),
  createUser: (data) => api.post('/auth/users', data),
  getUser: (id) => api.get(`/auth/users/${id}`),
  updateUser: (id, data) => api.put(`/auth/users/${id}`, data),
  deleteUser: (id) => api.delete(`/auth/users/${id}`),
};

// Categories API
export const categoriesAPI = {
  getAll: () => api.get('/api/categories'),
  getById: (id) => api.get(`/api/categories/${id}`),
  create: (data) => api.post('/api/categories', data),
  update: (id, data) => api.put(`/api/categories/${id}`, data),
  delete: (id) => api.delete(`/api/categories/${id}`),
};

// Items API
export const itemsAPI = {
  getAll: (params) => api.get('/api/items', { params }),
  getById: (id) => api.get(`/api/items/${id}`),
  create: (data) => api.post('/api/items', data),
  update: (id, data) => api.put(`/api/items/${id}`, data),
  delete: (id) => api.delete(`/api/items/${id}`),
};

// Movements API
export const movementsAPI = {
  getAll: (params) => api.get('/api/movements', { params }),
  getById: (id) => api.get(`/api/movements/${id}`),
  create: (data) => api.post('/api/movements', data),
  approve: (id) => api.post(`/api/movements/${id}/approve`),
  reject: (id, reason) => api.post(`/api/movements/${id}/reject`, { reason }),
  returnItem: (id) => api.post(`/api/movements/${id}/return`),
};

// Tracking API (Admin only)
export const trackingAPI = {
  getAssignments: (params) => api.get('/api/tracking/assignments', { params }),
  getUserActivity: () => api.get('/api/tracking/user-activity'),
  getPendingRequests: () => api.get('/api/tracking/pending-requests'),
};

// Analytics API
export const analyticsAPI = {
  getStockPerItem: () => api.get('/api/analytics/stock-per-item'),
  getMovementsTrend: () => api.get('/api/analytics/movements-trend'),
};

export default api;