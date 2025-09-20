import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { showMessage } from 'react-native-flash-message';
import api from './api';

interface QueuedRequest {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  data?: any;
  headers?: Record<string, string>;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  priority: 'low' | 'normal' | 'high';
  metadata?: {
    description?: string;
    successMessage?: string;
    errorMessage?: string;
  };
}

interface QueueConfig {
  maxQueueSize: number;
  maxRetries: number;
  retryDelay: number;
  batchSize: number;
}

/**
 * Offline queue service for managing API requests when offline
 */
export class OfflineQueueService {
  private queue: QueuedRequest[] = [];
  private isProcessing = false;
  private config: QueueConfig;
  private storageKey = '@offline_queue';
  private isOnline = true;
  private processTimer: NodeJS.Timeout | null = null;

  constructor(config?: Partial<QueueConfig>) {
    this.config = {
      maxQueueSize: 100,
      maxRetries: 3,
      retryDelay: 5000,
      batchSize: 5,
      ...config,
    };

    this.initialize();
  }

  /**
   * Initialize the offline queue service
   */
  private async initialize(): Promise<void> {
    try {
      // Load queued requests from storage
      await this.loadQueue();

      // Monitor network status
      NetInfo.addEventListener(state => {
        const wasOnline = this.isOnline;
        this.isOnline = state.isConnected ?? false;

        if (!wasOnline && this.isOnline) {
          // Came back online - process queue
          console.log('Network restored - processing offline queue');
          this.processQueue();
        }
      });

      // Start periodic queue processing
      this.startPeriodicProcessing();

      console.log('Offline queue service initialized');
    } catch (error) {
      console.error('Failed to initialize offline queue:', error);
    }
  }

  /**
   * Add a request to the offline queue
   */
  async addToQueue(
    method: QueuedRequest['method'],
    url: string,
    data?: any,
    options?: {
      headers?: Record<string, string>;
      priority?: QueuedRequest['priority'];
      maxRetries?: number;
      metadata?: QueuedRequest['metadata'];
    }
  ): Promise<string> {
    const request: QueuedRequest = {
      id: this.generateId(),
      method,
      url,
      data,
      headers: options?.headers,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: options?.maxRetries ?? this.config.maxRetries,
      priority: options?.priority ?? 'normal',
      metadata: options?.metadata,
    };

    // Add to queue
    this.queue.push(request);

    // Sort by priority and timestamp
    this.sortQueue();

    // Trim queue if it exceeds max size
    if (this.queue.length > this.config.maxQueueSize) {
      this.queue = this.queue.slice(0, this.config.maxQueueSize);
    }

    // Save to storage
    await this.saveQueue();

    console.log(`Added request to offline queue: ${method} ${url}`);

    // Try to process immediately if online
    if (this.isOnline) {
      this.processQueue();
    } else {
      showMessage({
        message: 'Request queued for when online',
        description: request.metadata?.description || 'Will sync when connection is restored',
        type: 'info',
        duration: 3000,
      });
    }

    return request.id;
  }

  /**
   * Process the offline queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || !this.isOnline || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;
    console.log(`Processing offline queue: ${this.queue.length} requests`);

    try {
      // Process requests in batches
      const batch = this.queue
        .filter(req => req.retryCount <= req.maxRetries)
        .slice(0, this.config.batchSize);

      const results = await Promise.allSettled(
        batch.map(request => this.processRequest(request))
      );

      // Handle results
      const successfulIds: string[] = [];
      const failedRequests: QueuedRequest[] = [];

      results.forEach((result, index) => {
        const request = batch[index];
        
        if (result.status === 'fulfilled' && result.value) {
          successfulIds.push(request.id);
          
          // Show success message if provided
          if (request.metadata?.successMessage) {
            showMessage({
              message: request.metadata.successMessage,
              type: 'success',
              duration: 2000,
            });
          }
        } else {
          request.retryCount++;
          
          if (request.retryCount <= request.maxRetries) {
            failedRequests.push(request);
          } else {
            // Max retries exceeded
            console.warn(`Request failed after ${request.maxRetries} retries:`, request);
            
            if (request.metadata?.errorMessage) {
              showMessage({
                message: request.metadata.errorMessage,
                description: 'Please try again manually',
                type: 'danger',
                duration: 4000,
              });
            }
          }
        }
      });

      // Remove successful requests from queue
      this.queue = this.queue.filter(req => !successfulIds.includes(req.id));

      // Update failed requests in queue
      failedRequests.forEach(failedReq => {
        const index = this.queue.findIndex(req => req.id === failedReq.id);
        if (index !== -1) {
          this.queue[index] = failedReq;
        }
      });

      // Save updated queue
      await this.saveQueue();

      // Show sync status
      if (successfulIds.length > 0) {
        showMessage({
          message: `Synced ${successfulIds.length} pending changes`,
          type: 'success',
          duration: 2000,
        });
      }

      // Continue processing if there are more requests
      if (this.queue.length > 0 && this.isOnline) {
        setTimeout(() => {
          this.processQueue();
        }, this.config.retryDelay);
      }
    } catch (error) {
      console.error('Error processing offline queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single request
   */
  private async processRequest(request: QueuedRequest): Promise<boolean> {
    try {
      console.log(`Processing request: ${request.method} ${request.url}`);

      const response = await api.request({
        method: request.method,
        url: request.url,
        data: request.data,
        headers: request.headers,
      });

      console.log(`Request successful: ${request.method} ${request.url}`);
      return true;
    } catch (error: any) {
      console.error(`Request failed: ${request.method} ${request.url}`, error);
      
      // Don't retry on client errors (4xx)
      if (error.response?.status >= 400 && error.response?.status < 500) {
        return false;
      }
      
      throw error;
    }
  }

  /**
   * Start periodic queue processing
   */
  private startPeriodicProcessing(): void {
    this.processTimer = setInterval(() => {
      if (this.isOnline && this.queue.length > 0) {
        this.processQueue();
      }
    }, 30000); // Process every 30 seconds
  }

  /**
   * Stop periodic processing
   */
  private stopPeriodicProcessing(): void {
    if (this.processTimer) {
      clearInterval(this.processTimer);
      this.processTimer = null;
    }
  }

  /**
   * Sort queue by priority and timestamp
   */
  private sortQueue(): void {
    const priorityOrder = { high: 3, normal: 2, low: 1 };
    
    this.queue.sort((a, b) => {
      // First sort by priority
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      // Then by timestamp (older first)
      return a.timestamp - b.timestamp;
    });
  }

  /**
   * Generate unique ID for requests
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Load queue from storage
   */
  private async loadQueue(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.storageKey);
      if (stored) {
        this.queue = JSON.parse(stored);
        console.log(`Loaded ${this.queue.length} requests from offline queue`);
      }
    } catch (error) {
      console.error('Failed to load offline queue:', error);
      this.queue = [];
    }
  }

  /**
   * Save queue to storage
   */
  private async saveQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.storageKey, JSON.stringify(this.queue));
    } catch (error) {
      console.error('Failed to save offline queue:', error);
    }
  }

  /**
   * Get queue status
   */
  getQueueStatus(): {
    total: number;
    pending: number;
    failed: number;
    isProcessing: boolean;
    isOnline: boolean;
  } {
    const failed = this.queue.filter(req => req.retryCount > req.maxRetries).length;
    
    return {
      total: this.queue.length,
      pending: this.queue.length - failed,
      failed,
      isProcessing: this.isProcessing,
      isOnline: this.isOnline,
    };
  }

  /**
   * Clear all queued requests
   */
  async clearQueue(): Promise<void> {
    this.queue = [];
    await AsyncStorage.removeItem(this.storageKey);
    console.log('Offline queue cleared');
  }

  /**
   * Remove specific request from queue
   */
  async removeFromQueue(requestId: string): Promise<boolean> {
    const index = this.queue.findIndex(req => req.id === requestId);
    if (index !== -1) {
      this.queue.splice(index, 1);
      await this.saveQueue();
      return true;
    }
    return false;
  }

  /**
   * Retry failed requests
   */
  async retryFailedRequests(): Promise<void> {
    this.queue.forEach(req => {
      if (req.retryCount > req.maxRetries) {
        req.retryCount = 0;
      }
    });
    
    await this.saveQueue();
    
    if (this.isOnline) {
      this.processQueue();
    }
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.stopPeriodicProcessing();
  }
}

// Convenience functions for common operations
export const offlineQueue = new OfflineQueueService();

/**
 * Queue a request for offline processing
 */
export const queueRequest = async (
  method: QueuedRequest['method'],
  url: string,
  data?: any,
  options?: {
    priority?: QueuedRequest['priority'];
    description?: string;
    successMessage?: string;
    errorMessage?: string;
  }
): Promise<string> => {
  return offlineQueue.addToQueue(method, url, data, {
    priority: options?.priority,
    metadata: {
      description: options?.description,
      successMessage: options?.successMessage,
      errorMessage: options?.errorMessage,
    },
  });
};

/**
 * Common queue operations
 */
export const queueOperations = {
  // User profile updates
  updateProfile: (data: any) => queueRequest(
    'PUT',
    '/mobile/user/profile',
    data,
    {
      priority: 'normal',
      description: 'Profile update',
      successMessage: 'Profile updated successfully',
      errorMessage: 'Failed to update profile',
    }
  ),

  // Site operations
  createSite: (data: any) => queueRequest(
    'POST',
    '/mobile/sites',
    data,
    {
      priority: 'high',
      description: 'Creating new site',
      successMessage: 'Site created successfully',
      errorMessage: 'Failed to create site',
    }
  ),

  updateSite: (siteId: string, data: any) => queueRequest(
    'PUT',
    `/mobile/sites/${siteId}`,
    data,
    {
      priority: 'normal',
      description: 'Site update',
      successMessage: 'Site updated successfully',
      errorMessage: 'Failed to update site',
    }
  ),

  deleteSite: (siteId: string) => queueRequest(
    'DELETE',
    `/mobile/sites/${siteId}`,
    undefined,
    {
      priority: 'normal',
      description: 'Deleting site',
      successMessage: 'Site deleted successfully',
      errorMessage: 'Failed to delete site',
    }
  ),

  // Notification operations
  markNotificationAsRead: (notificationId: string) => queueRequest(
    'PUT',
    `/mobile/notifications/${notificationId}/read`,
    undefined,
    {
      priority: 'low',
      description: 'Marking notification as read',
    }
  ),

  markAllNotificationsAsRead: (userId: string) => queueRequest(
    'PUT',
    `/mobile/users/${userId}/notifications/read-all`,
    undefined,
    {
      priority: 'low',
      description: 'Marking all notifications as read',
    }
  ),

  // Product operations
  updateProduct: (productId: string, data: any) => queueRequest(
    'PUT',
    `/mobile/products/${productId}`,
    data,
    {
      priority: 'normal',
      description: 'Product update',
      successMessage: 'Product updated successfully',
      errorMessage: 'Failed to update product',
    }
  ),

  deleteProduct: (productId: string) => queueRequest(
    'DELETE',
    `/mobile/products/${productId}`,
    undefined,
    {
      priority: 'normal',
      description: 'Deleting product',
      successMessage: 'Product deleted successfully',
      errorMessage: 'Failed to delete product',
    }
  ),
};

/**
 * Hook for accessing offline queue in components
 */
export const useOfflineQueue = () => {
  return {
    offlineQueue,
    queueRequest,
    queueOperations,
    getQueueStatus: () => offlineQueue.getQueueStatus(),
    clearQueue: () => offlineQueue.clearQueue(),
    retryFailedRequests: () => offlineQueue.retryFailedRequests(),
  };
};

export default offlineQueue;