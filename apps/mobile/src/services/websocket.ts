import { showMessage } from 'react-native-flash-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { queryClient } from './queryClient';
import { notificationService } from './notifications';
import { haptics } from '../utils/haptics';

interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: string;
  userId?: string;
}

interface WebSocketConfig {
  url: string;
  reconnectInterval: number;
  maxReconnectAttempts: number;
  pingInterval: number;
}

/**
 * WebSocket service for real-time updates
 */
export class WebSocketService {
  private ws: WebSocket | null = null;
  private config: WebSocketConfig;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private pingTimer: NodeJS.Timeout | null = null;
  private isConnected = false;
  private isConnecting = false;
  private userId: string | null = null;
  private eventListeners: Map<string, Set<(data: any) => void>> = new Map();

  constructor(config?: Partial<WebSocketConfig>) {
    this.config = {
      url: process.env.EXPO_PUBLIC_WS_URL || 'wss://api.affiliateos.com/ws',
      reconnectInterval: 5000,
      maxReconnectAttempts: 10,
      pingInterval: 30000,
      ...config,
    };
  }

  /**
   * Initialize WebSocket connection
   */
  async initialize(userId: string): Promise<void> {
    this.userId = userId;
    
    if (this.isConnected || this.isConnecting) {
      console.log('WebSocket already connected or connecting');
      return;
    }

    try {
      await this.connect();
    } catch (error) {
      console.error('Failed to initialize WebSocket:', error);
    }
  }

  /**
   * Connect to WebSocket server
   */
  private async connect(): Promise<void> {
    if (this.isConnecting) return;

    this.isConnecting = true;

    try {
      const token = await AsyncStorage.getItem('access_token');
      const wsUrl = `${this.config.url}?token=${token}&userId=${this.userId}`;

      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
      this.ws.onerror = this.handleError.bind(this);

      console.log('WebSocket connecting...');
    } catch (error) {
      this.isConnecting = false;
      console.error('WebSocket connection error:', error);
      this.scheduleReconnect();
    }
  }

  /**
   * Handle WebSocket open event
   */
  private handleOpen(): void {
    console.log('WebSocket connected');
    this.isConnected = true;
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    
    // Clear any existing reconnect timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Start ping/pong mechanism
    this.startPing();

    // Subscribe to user-specific events
    this.subscribe('user_updates');
    this.subscribe('revenue_updates');
    this.subscribe('notifications');
    this.subscribe('analytics_updates');

    // Notify about connection
    showMessage({
      message: 'Connected to real-time updates',
      type: 'success',
      duration: 2000,
    });
  }

  /**
   * Handle WebSocket message
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);
      console.log('WebSocket message received:', message.type);

      // Handle different message types
      switch (message.type) {
        case 'pong':
          // Keep-alive response
          break;
        
        case 'revenue_update':
          this.handleRevenueUpdate(message.data);
          break;
        
        case 'new_conversion':
          this.handleNewConversion(message.data);
          break;
        
        case 'notification':
          this.handleNotification(message.data);
          break;
        
        case 'analytics_update':
          this.handleAnalyticsUpdate(message.data);
          break;
        
        case 'site_update':
          this.handleSiteUpdate(message.data);
          break;
        
        case 'product_update':
          this.handleProductUpdate(message.data);
          break;
        
        default:
          console.log('Unknown message type:', message.type);
      }

      // Notify event listeners
      this.notifyListeners(message.type, message.data);
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }

  /**
   * Handle WebSocket close event
   */
  private handleClose(event: CloseEvent): void {
    console.log('WebSocket closed:', event.code, event.reason);
    this.isConnected = false;
    this.isConnecting = false;
    
    this.stopPing();
    
    // Don't reconnect if it was a manual close
    if (event.code !== 1000) {
      this.scheduleReconnect();
    }
  }

  /**
   * Handle WebSocket error
   */
  private handleError(event: Event): void {
    console.error('WebSocket error:', event);
    this.isConnecting = false;
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.log('Max reconnection attempts reached');
      showMessage({
        message: 'Real-time connection lost',
        description: 'Pull to refresh to get latest data',
        type: 'warning',
        duration: 5000,
      });
      return;
    }

    this.reconnectAttempts++;
    const delay = this.config.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);
    
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Start ping mechanism
   */
  private startPing(): void {
    this.pingTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.send('ping', {});
      }
    }, this.config.pingInterval);
  }

  /**
   * Stop ping mechanism
   */
  private stopPing(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  /**
   * Send message to server
   */
  private send(type: string, data: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message: WebSocketMessage = {
        type,
        data,
        timestamp: new Date().toISOString(),
        userId: this.userId || undefined,
      };
      
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, cannot send message');
    }
  }

  /**
   * Subscribe to specific event types
   */
  private subscribe(eventType: string): void {
    this.send('subscribe', { eventType });
  }

  /**
   * Handle revenue updates
   */
  private handleRevenueUpdate(data: any): void {
    console.log('Revenue update received:', data);
    
    // Invalidate analytics queries
    queryClient.invalidateQueries({ queryKey: ['analytics'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    
    // Show notification for significant revenue changes
    if (data.revenue && parseFloat(data.revenue.replace(/[^0-9.-]+/g, '')) > 10) {
      haptics.newRevenue();
      showMessage({
        message: `New Revenue: ${data.revenue}`,
        description: `From ${data.source || 'affiliate sales'}`,
        type: 'success',
        duration: 4000,
      });
    }
  }

  /**
   * Handle new conversions
   */
  private handleNewConversion(data: any): void {
    console.log('New conversion received:', data);
    
    // Invalidate relevant queries
    queryClient.invalidateQueries({ queryKey: ['analytics'] });
    queryClient.invalidateQueries({ queryKey: ['products'] });
    
    // Show celebration for new conversion
    haptics.newConversion();
    showMessage({
      message: 'New Conversion! 🎉',
      description: `${data.product || 'Product'} - ${data.commission || 'Commission earned'}`,
      type: 'success',
      duration: 5000,
    });

    // Schedule local notification if app is in background
    notificationService.scheduleConversionAlert(
      data.product || 'Product',
      data.commission || 'Commission'
    );
  }

  /**
   * Handle notifications
   */
  private handleNotification(data: any): void {
    console.log('Notification received:', data);
    
    // Invalidate notifications queries
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
    queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    
    // Update badge count
    notificationService.updateBadgeCount();
    
    // Show in-app notification
    if (data.title && data.message) {
      haptics.tap();
      showMessage({
        message: data.title,
        description: data.message,
        type: data.type === 'error' ? 'danger' : data.type || 'info',
        duration: 4000,
      });
    }
  }

  /**
   * Handle analytics updates
   */
  private handleAnalyticsUpdate(data: any): void {
    console.log('Analytics update received:', data);
    
    // Invalidate analytics queries
    queryClient.invalidateQueries({ queryKey: ['analytics'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    
    // Update specific site analytics if available
    if (data.siteId) {
      queryClient.invalidateQueries({ 
        queryKey: ['site', data.siteId, 'analytics'] 
      });
    }
  }

  /**
   * Handle site updates
   */
  private handleSiteUpdate(data: any): void {
    console.log('Site update received:', data);
    
    // Invalidate sites queries
    queryClient.invalidateQueries({ queryKey: ['sites'] });
    
    if (data.siteId) {
      queryClient.invalidateQueries({ queryKey: ['site', data.siteId] });
    }
  }

  /**
   * Handle product updates
   */
  private handleProductUpdate(data: any): void {
    console.log('Product update received:', data);
    
    // Invalidate products queries
    queryClient.invalidateQueries({ queryKey: ['products'] });
    
    if (data.productId) {
      queryClient.invalidateQueries({ queryKey: ['product', data.productId] });
    }
  }

  /**
   * Add event listener
   */
  addEventListener(eventType: string, callback: (data: any) => void): () => void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set());
    }
    
    this.eventListeners.get(eventType)!.add(callback);
    
    // Return unsubscribe function
    return () => {
      const listeners = this.eventListeners.get(eventType);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) {
          this.eventListeners.delete(eventType);
        }
      }
    };
  }

  /**
   * Notify event listeners
   */
  private notifyListeners(eventType: string, data: any): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in event listener:', error);
        }
      });
    }
  }

  /**
   * Get connection status
   */
  isWebSocketConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Disconnect WebSocket
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close(1000, 'Manual disconnect');
      this.ws = null;
    }
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    this.stopPing();
    this.isConnected = false;
    this.isConnecting = false;
    this.reconnectAttempts = 0;
  }

  /**
   * Cleanup all resources
   */
  cleanup(): void {
    this.disconnect();
    this.eventListeners.clear();
  }
}

// Create singleton instance
export const webSocketService = new WebSocketService();

/**
 * Hook for using WebSocket in components
 */
export const useWebSocket = () => {
  return {
    webSocketService,
    isConnected: webSocketService.isWebSocketConnected(),
    addEventListener: webSocketService.addEventListener.bind(webSocketService),
  };
};

export default webSocketService;