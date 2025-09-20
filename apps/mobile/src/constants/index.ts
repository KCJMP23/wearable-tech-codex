export const STORAGE_KEYS = {
  AUTH_TOKEN: '@auth_token',
  REFRESH_TOKEN: '@refresh_token',
  USER_DATA: '@user_data',
  SELECTED_TENANT: '@selected_tenant',
  THEME_PREFERENCE: '@theme_preference',
  NOTIFICATION_SETTINGS: '@notification_settings',
  BIOMETRICS_ENABLED: '@biometrics_enabled',
  OFFLINE_DATA: '@offline_data',
  CACHED_ANALYTICS: '@cached_analytics',
  CACHED_SITES: '@cached_sites',
  CACHED_PRODUCTS: '@cached_products',
  LAST_SYNC: '@last_sync',
} as const;

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
  },
  USERS: {
    PROFILE: '/mobile/user/profile',
    AVATAR: '/mobile/user/avatar',
    SITES: (userId: string) => `/mobile/users/${userId}/sites`,
    ANALYTICS: (userId: string) => `/mobile/users/${userId}/analytics`,
    NOTIFICATIONS: (userId: string) => `/mobile/users/${userId}/notifications`,
  },
  SITES: {
    LIST: '/mobile/sites',
    DETAIL: (id: string) => `/mobile/sites/${id}`,
    CREATE: '/mobile/sites',
    UPDATE: (id: string) => `/mobile/sites/${id}`,
    DELETE: (id: string) => `/mobile/sites/${id}`,
  },
  PRODUCTS: {
    LIST: '/mobile/products',
    DETAIL: (id: string) => `/mobile/products/${id}`,
    IMPORT: '/mobile/products/import',
    UPDATE: (id: string) => `/mobile/products/${id}`,
    DELETE: (id: string) => `/mobile/products/${id}`,
  },
  CONTENT: {
    LIST: '/mobile/content',
    DETAIL: (id: string) => `/mobile/content/${id}`,
    CREATE: '/mobile/content',
    UPDATE: (id: string) => `/mobile/content/${id}`,
    DELETE: (id: string) => `/mobile/content/${id}`,
    GENERATE: '/mobile/content/generate',
  },
  ANALYTICS: {
    DASHBOARD: '/mobile/analytics/dashboard',
    SITE: (siteId: string) => `/mobile/analytics/sites/${siteId}`,
    REVENUE: '/mobile/analytics/revenue',
  },
  NOTIFICATIONS: {
    LIST: '/mobile/notifications',
    READ: (id: string) => `/mobile/notifications/${id}/read`,
    READ_ALL: '/mobile/notifications/read-all',
    DELETE: (id: string) => `/mobile/notifications/${id}`,
    UNREAD_COUNT: '/mobile/notifications/unread-count',
    PUSH_TOKEN: '/mobile/notifications/push-token',
  },
} as const;

export const THEME_COLORS = {
  light: {
    primary: '#007AFF',
    secondary: '#5856D6',
    background: '#FFFFFF',
    card: '#F8F9FA',
    border: '#E5E5EA',
    text: '#000000',
    textSecondary: '#6C6C70',
    success: '#34C759',
    warning: '#FF9500',
    error: '#FF3B30',
    info: '#5AC8FA',
    accent: '#AF52DE',
  },
  dark: {
    primary: '#0A84FF',
    secondary: '#5856D6',
    background: '#000000',
    card: '#1C1C1E',
    border: '#38383A',
    text: '#FFFFFF',
    textSecondary: '#8E8E93',
    success: '#30D158',
    warning: '#FF9F0A',
    error: '#FF453A',
    info: '#64D2FF',
    accent: '#BF5AF2',
  },
} as const;

export const NOTIFICATION_TYPES = {
  REVENUE: 'revenue',
  PERFORMANCE: 'performance',
  ALERT: 'alert',
  UPDATE: 'update',
  MILESTONE: 'milestone',
  SYSTEM: 'system',
} as const;

export const PRODUCT_CATEGORIES = [
  'Electronics',
  'Fashion',
  'Home & Garden',
  'Health & Beauty',
  'Sports & Outdoors',
  'Books',
  'Toys & Games',
  'Automotive',
  'Office Products',
  'Tools & Hardware',
  'Music',
  'Movies & TV',
  'Software',
  'Video Games',
  'Grocery',
  'Pet Supplies',
  'Baby Products',
  'Industrial',
] as const;

export const CONTENT_TYPES = {
  POST: 'post',
  PAGE: 'page',
  REVIEW: 'review',
} as const;

export const CONTENT_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
} as const;

export const ANALYTICS_TIME_RANGES = {
  '7d': '7 days',
  '30d': '30 days',
  '90d': '90 days',
  '1y': '1 year',
} as const;

export const AFFILIATE_NETWORKS = [
  'Amazon Associates',
  'ShareASale',
  'ClickBank',
  'Commission Junction',
  'Rakuten Advertising',
  'Impact',
  'PartnerStack',
  'Awin',
  'FlexOffers',
  'MaxBounty',
] as const;

export const APP_CONFIG = {
  APP_NAME: 'AffiliateOS',
  VERSION: '1.0.0',
  BUILD: '1',
  API_TIMEOUT: 30000,
  PAGINATION_LIMIT: 20,
  MAX_UPLOAD_SIZE: 10 * 1024 * 1024, // 10MB
  SUPPORTED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  DEBOUNCE_DELAY: 300,
  CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
} as const;