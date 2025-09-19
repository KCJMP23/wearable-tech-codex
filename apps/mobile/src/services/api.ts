import axios, { AxiosResponse, AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Config } from '../constants';
import { ApiResponse, PaginatedResponse } from '../types';

// Create axios instance
const api = axios.create({
  baseURL: Config.API_URL,
  timeout: Config.API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token expired, clear storage and redirect to login
      await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user']);
      // You can emit an event here to notify the app about logout
    }
    return Promise.reject(error);
  }
);

// Authentication endpoints
export const authApi = {
  login: async (email: string, password: string): Promise<ApiResponse<any>> => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },
  
  register: async (email: string, password: string, firstName: string, lastName: string): Promise<ApiResponse<any>> => {
    const response = await api.post('/auth/register', { 
      email, 
      password, 
      firstName, 
      lastName 
    });
    return response.data;
  },
  
  forgotPassword: async (email: string): Promise<ApiResponse<any>> => {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },
  
  resetPassword: async (token: string, password: string): Promise<ApiResponse<any>> => {
    const response = await api.post('/auth/reset-password', { token, password });
    return response.data;
  },
  
  refreshToken: async (refreshToken: string): Promise<ApiResponse<any>> => {
    const response = await api.post('/auth/refresh', { refreshToken });
    return response.data;
  },
  
  logout: async (): Promise<ApiResponse<any>> => {
    const response = await api.post('/auth/logout');
    return response.data;
  },
};

// User endpoints
export const userApi = {
  getProfile: async (): Promise<ApiResponse<any>> => {
    const response = await api.get('/mobile/user/profile');
    return response.data;
  },
  
  updateProfile: async (data: any): Promise<ApiResponse<any>> => {
    const response = await api.put('/mobile/user/profile', data);
    return response.data;
  },
  
  uploadAvatar: async (formData: FormData): Promise<ApiResponse<any>> => {
    const response = await api.post('/mobile/user/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

// Sites endpoints
export const sitesApi = {
  getSites: async (page = 1, limit = 10): Promise<PaginatedResponse<any>> => {
    const response = await api.get(`/mobile/sites?page=${page}&limit=${limit}`);
    return response.data;
  },
  
  getSite: async (siteId: string): Promise<ApiResponse<any>> => {
    const response = await api.get(`/mobile/sites/${siteId}`);
    return response.data;
  },
  
  createSite: async (data: any): Promise<ApiResponse<any>> => {
    const response = await api.post('/mobile/sites', data);
    return response.data;
  },
  
  updateSite: async (siteId: string, data: any): Promise<ApiResponse<any>> => {
    const response = await api.put(`/mobile/sites/${siteId}`, data);
    return response.data;
  },
  
  deleteSite: async (siteId: string): Promise<ApiResponse<any>> => {
    const response = await api.delete(`/mobile/sites/${siteId}`);
    return response.data;
  },
};

// Analytics endpoints
export const analyticsApi = {
  getDashboard: async (period = '7d'): Promise<ApiResponse<any>> => {
    const response = await api.get(`/mobile/analytics/dashboard?period=${period}`);
    return response.data;
  },
  
  getSiteAnalytics: async (siteId: string, period = '7d'): Promise<ApiResponse<any>> => {
    const response = await api.get(`/mobile/analytics/sites/${siteId}?period=${period}`);
    return response.data;
  },
  
  getRevenueTrends: async (period = '30d'): Promise<ApiResponse<any>> => {
    const response = await api.get(`/mobile/analytics/revenue?period=${period}`);
    return response.data;
  },
};

// Products endpoints
export const productsApi = {
  getProducts: async (page = 1, limit = 20, search?: string): Promise<PaginatedResponse<any>> => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(search && { search }),
    });
    const response = await api.get(`/mobile/products?${params}`);
    return response.data;
  },
  
  getProduct: async (productId: string): Promise<ApiResponse<any>> => {
    const response = await api.get(`/mobile/products/${productId}`);
    return response.data;
  },
  
  importProducts: async (asins: string[]): Promise<ApiResponse<any>> => {
    const response = await api.post('/mobile/products/import', { asins });
    return response.data;
  },
};

// Notifications endpoints
export const notificationsApi = {
  getNotifications: async (page = 1, limit = 20): Promise<PaginatedResponse<any>> => {
    const response = await api.get(`/mobile/notifications?page=${page}&limit=${limit}`);
    return response.data;
  },
  
  markAsRead: async (notificationId: string): Promise<ApiResponse<any>> => {
    const response = await api.put(`/mobile/notifications/${notificationId}/read`);
    return response.data;
  },
  
  markAllAsRead: async (): Promise<ApiResponse<any>> => {
    const response = await api.put('/mobile/notifications/read-all');
    return response.data;
  },
  
  getUnreadCount: async (): Promise<ApiResponse<any>> => {
    const response = await api.get('/mobile/notifications/unread-count');
    return response.data;
  },
  
  updatePushToken: async (token: string): Promise<ApiResponse<any>> => {
    const response = await api.post('/mobile/notifications/push-token', { token });
    return response.data;
  },
};

export default api;