import Constants from 'expo-constants';

export const Config = {
  API_URL: process.env.EXPO_PUBLIC_API_URL || 'https://api.wearabletech.ai',
  SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
  
  // App Configuration
  APP_NAME: 'Wearable Tech Codex',
  APP_VERSION: Constants.expoConfig?.version || '1.0.0',
  BUILD_NUMBER: Constants.expoConfig?.ios?.buildNumber || '1',
  
  // API Configuration
  API_TIMEOUT: 30000,
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
  
  // Cache Configuration
  CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
  OFFLINE_CACHE_DURATION: 24 * 60 * 60 * 1000, // 24 hours
  
  // Notification Configuration
  NOTIFICATION_CHANNEL_ID: 'wearable-tech-codex',
  NOTIFICATION_CHANNEL_NAME: 'Wearable Tech Codex Notifications',
  
  // Feature Flags
  FEATURES: {
    PUSH_NOTIFICATIONS: true,
    BIOMETRIC_AUTH: true,
    OFFLINE_MODE: true,
    ANALYTICS_TRACKING: true,
    DARK_MODE: true,
    HAPTIC_FEEDBACK: true,
  },
  
  // URLs
  TERMS_URL: 'https://wearabletech.ai/terms',
  PRIVACY_URL: 'https://wearabletech.ai/privacy',
  SUPPORT_URL: 'https://wearabletech.ai/support',
  
  // Development
  __DEV__: __DEV__,
  IS_STAGING: process.env.EXPO_PUBLIC_ENVIRONMENT === 'staging',
  IS_PRODUCTION: process.env.EXPO_PUBLIC_ENVIRONMENT === 'production',
};

export default Config;