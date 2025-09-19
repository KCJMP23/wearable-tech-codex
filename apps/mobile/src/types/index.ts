export interface User {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  domain: string;
  theme: string;
  isActive: boolean;
  settings: {
    primaryColor: string;
    logo?: string;
    description?: string;
  };
  createdAt: string;
}

export interface Site {
  id: string;
  name: string;
  domain: string;
  tenantId: string;
  isActive: boolean;
  settings: Record<string, any>;
  analytics: {
    visitors: number;
    revenue: number;
    clicks: number;
    conversions: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Analytics {
  period: string;
  revenue: number;
  clicks: number;
  conversions: number;
  visitors: number;
  conversionRate: number;
  revenueChange: number;
  clicksChange: number;
  trends: {
    date: string;
    revenue: number;
    clicks: number;
    visitors: number;
  }[];
}

export interface Product {
  id: string;
  asin: string;
  title: string;
  description: string;
  price: number;
  image: string;
  category: string;
  affiliateUrl: string;
  rating: number;
  reviewCount: number;
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  type: 'revenue' | 'alert' | 'info' | 'warning';
  isRead: boolean;
  data?: Record<string, any>;
  createdAt: string;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface AppState {
  theme: 'light' | 'dark' | 'system';
  notifications: {
    enabled: boolean;
    revenue: boolean;
    analytics: boolean;
    system: boolean;
  };
  offline: {
    isOffline: boolean;
    syncPending: boolean;
    lastSync?: string;
  };
}

export type RootStackParamList = {
  // Auth
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  
  // Main App
  Home: undefined;
  Analytics: undefined;
  Sites: undefined;
  SiteDetail: { siteId: string };
  Products: undefined;
  ProductDetail: { productId: string };
  Notifications: undefined;
  Settings: undefined;
  Profile: undefined;
  
  // Modals
  CreateSite: undefined;
  EditSite: { siteId: string };
};

export type TabParamList = {
  Dashboard: undefined;
  Sites: undefined;
  Analytics: undefined;
  Notifications: undefined;
  Settings: undefined;
};