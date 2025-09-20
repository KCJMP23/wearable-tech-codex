import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { showMessage } from 'react-native-flash-message';

/**
 * Deep linking configuration and URL scheme handling
 */
export class DeepLinkingService {
  private static instance: DeepLinkingService;
  private urlEventListener: any = null;

  private constructor() {}

  static getInstance(): DeepLinkingService {
    if (!DeepLinkingService.instance) {
      DeepLinkingService.instance = new DeepLinkingService();
    }
    return DeepLinkingService.instance;
  }

  /**
   * Initialize deep linking
   */
  async initialize(): Promise<void> {
    try {
      // Handle app launch from deep link
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        await this.handleDeepLink(initialUrl);
      }

      // Listen for incoming links when app is already running
      this.urlEventListener = Linking.addEventListener('url', (event) => {
        this.handleDeepLink(event.url);
      });

      console.log('Deep linking initialized');
    } catch (error) {
      console.error('Failed to initialize deep linking:', error);
    }
  }

  /**
   * Parse and handle deep link URLs
   */
  private async handleDeepLink(url: string): Promise<void> {
    try {
      console.log('Handling deep link:', url);

      const parsedUrl = Linking.parse(url);
      const { hostname, path, queryParams } = parsedUrl;

      // Handle different URL schemes and paths
      switch (hostname) {
        case 'auth':
          await this.handleAuthLink(path, queryParams);
          break;
        case 'site':
          await this.handleSiteLink(path, queryParams);
          break;
        case 'product':
          await this.handleProductLink(path, queryParams);
          break;
        case 'analytics':
          await this.handleAnalyticsLink(path, queryParams);
          break;
        case 'notification':
          await this.handleNotificationLink(path, queryParams);
          break;
        default:
          await this.handleGenericLink(path, queryParams);
      }
    } catch (error) {
      console.error('Error handling deep link:', error);
      showMessage({
        message: 'Invalid link',
        description: 'The link you followed is not valid or has expired.',
        type: 'danger',
      });
    }
  }

  /**
   * Handle authentication-related deep links
   */
  private async handleAuthLink(path: string | null, params: any): Promise<void> {
    switch (path) {
      case '/reset-password':
        router.push({
          pathname: '/(auth)/reset-password',
          params: {
            token: params.token,
            email: params.email,
          },
        });
        break;
      case '/verify-email':
        router.push({
          pathname: '/(auth)/verify-email',
          params: {
            token: params.token,
            email: params.email,
          },
        });
        break;
      case '/login':
        router.push('/(auth)/login');
        break;
      default:
        router.push('/(auth)/welcome');
    }
  }

  /**
   * Handle site-related deep links
   */
  private async handleSiteLink(path: string | null, params: any): Promise<void> {
    if (path && path !== '/') {
      const siteId = path.replace('/', '');
      if (siteId) {
        router.push({
          pathname: '/site/[id]',
          params: { id: siteId, ...params },
        });
        return;
      }
    }
    router.push('/(tabs)/sites');
  }

  /**
   * Handle product-related deep links
   */
  private async handleProductLink(path: string | null, params: any): Promise<void> {
    if (path && path !== '/') {
      const productId = path.replace('/', '');
      if (productId) {
        router.push({
          pathname: '/product/[id]',
          params: { id: productId, ...params },
        });
        return;
      }
    }
    router.push('/products');
  }

  /**
   * Handle analytics-related deep links
   */
  private async handleAnalyticsLink(path: string | null, params: any): Promise<void> {
    router.push({
      pathname: '/(tabs)/analytics',
      params: {
        timeRange: params.timeRange || '30d',
        ...params,
      },
    });
  }

  /**
   * Handle notification-related deep links
   */
  private async handleNotificationLink(path: string | null, params: any): Promise<void> {
    if (params.id) {
      // If notification ID is provided, mark it as read and show details
      router.push({
        pathname: '/(tabs)/notifications',
        params: { notificationId: params.id },
      });
    } else {
      router.push('/(tabs)/notifications');
    }
  }

  /**
   * Handle generic deep links
   */
  private async handleGenericLink(path: string | null, params: any): Promise<void> {
    if (path) {
      router.push(path as any);
    } else {
      router.push('/(tabs)/');
    }
  }

  /**
   * Generate deep links for sharing
   */
  static generateSiteLink(siteId: string, params?: Record<string, string>): string {
    const baseUrl = 'affiliateos://site/' + siteId;
    if (params) {
      const queryString = new URLSearchParams(params).toString();
      return `${baseUrl}?${queryString}`;
    }
    return baseUrl;
  }

  static generateProductLink(productId: string, params?: Record<string, string>): string {
    const baseUrl = 'affiliateos://product/' + productId;
    if (params) {
      const queryString = new URLSearchParams(params).toString();
      return `${baseUrl}?${queryString}`;
    }
    return baseUrl;
  }

  static generateAnalyticsLink(timeRange?: string): string {
    const baseUrl = 'affiliateos://analytics';
    if (timeRange) {
      return `${baseUrl}?timeRange=${timeRange}`;
    }
    return baseUrl;
  }

  static generateShareLink(type: string, id: string, params?: Record<string, string>): string {
    const baseUrl = `affiliateos://${type}/${id}`;
    if (params) {
      const queryString = new URLSearchParams(params).toString();
      return `${baseUrl}?${queryString}`;
    }
    return baseUrl;
  }

  /**
   * Open external URLs safely
   */
  static async openExternalUrl(url: string): Promise<boolean> {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
        return true;
      } else {
        showMessage({
          message: 'Cannot open link',
          description: 'This link cannot be opened on your device.',
          type: 'warning',
        });
        return false;
      }
    } catch (error) {
      console.error('Error opening external URL:', error);
      showMessage({
        message: 'Error opening link',
        description: 'An error occurred while trying to open the link.',
        type: 'danger',
      });
      return false;
    }
  }

  /**
   * Share content using native share API
   */
  static async shareContent(content: {
    title?: string;
    message?: string;
    url?: string;
  }): Promise<boolean> {
    try {
      const { Share } = await import('react-native');
      const result = await Share.share({
        title: content.title,
        message: content.message,
        url: content.url,
      });

      return result.action === Share.sharedAction;
    } catch (error) {
      console.error('Error sharing content:', error);
      showMessage({
        message: 'Error sharing',
        description: 'An error occurred while trying to share the content.',
        type: 'danger',
      });
      return false;
    }
  }

  /**
   * Universal links for web compatibility
   */
  static generateUniversalLink(path: string, params?: Record<string, string>): string {
    const baseUrl = 'https://app.affiliateos.com';
    const fullPath = path.startsWith('/') ? path : `/${path}`;
    
    if (params) {
      const queryString = new URLSearchParams(params).toString();
      return `${baseUrl}${fullPath}?${queryString}`;
    }
    
    return `${baseUrl}${fullPath}`;
  }

  /**
   * Clean up listeners
   */
  cleanup(): void {
    if (this.urlEventListener) {
      this.urlEventListener.remove();
      this.urlEventListener = null;
    }
  }
}

/**
 * URL scheme validation
 */
export const validateDeepLink = (url: string): boolean => {
  try {
    const parsedUrl = Linking.parse(url);
    
    // Valid schemes
    const validSchemes = ['affiliateos', 'https'];
    const scheme = url.split('://')[0];
    
    if (!validSchemes.includes(scheme)) {
      return false;
    }

    // Valid hostnames for affiliateos scheme
    const validHostnames = ['auth', 'site', 'product', 'analytics', 'notification'];
    
    if (scheme === 'affiliateos' && !validHostnames.includes(parsedUrl.hostname || '')) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
};

/**
 * Link preview utilities
 */
export interface LinkPreview {
  title?: string;
  description?: string;
  image?: string;
  url: string;
  domain: string;
}

export const generateLinkPreview = async (url: string): Promise<LinkPreview | null> => {
  try {
    // For now, return basic preview based on URL structure
    // In production, you might want to fetch actual meta tags
    const domain = new URL(url).hostname.replace('www.', '');
    
    return {
      url,
      domain,
      title: `Link from ${domain}`,
      description: 'Tap to open this link',
    };
  } catch {
    return null;
  }
};

// Initialize deep linking service
export const deepLinkingService = DeepLinkingService.getInstance();