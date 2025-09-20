import { QueryClient } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { showMessage } from 'react-native-flash-message';

// Create async storage persister
const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'REACT_QUERY_OFFLINE_CACHE',
  serialize: JSON.stringify,
  deserialize: JSON.parse,
});

// Create query client with offline-first configuration
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache for 24 hours
      staleTime: 24 * 60 * 60 * 1000,
      // Keep cache for 7 days
      cacheTime: 7 * 24 * 60 * 60 * 1000,
      // Retry failed requests
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors except 408, 429
        if (error?.status >= 400 && error?.status < 500 && ![408, 429].includes(error?.status)) {
          return false;
        }
        // Retry up to 3 times with exponential backoff
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Enable background refetch when app becomes active
      refetchOnWindowFocus: true,
      // Enable refetch when reconnecting
      refetchOnReconnect: true,
      // Don't refetch on mount if data is fresh
      refetchOnMount: 'always',
      // Use network-first strategy when online, cache-first when offline
      networkMode: 'offlineFirst',
    },
    mutations: {
      // Retry mutations on network errors
      retry: (failureCount, error: any) => {
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        return failureCount < 2;
      },
      networkMode: 'offlineFirst',
    },
  },
});

// Initialize persistence
export const initializeQueryPersistence = async () => {
  try {
    await persistQueryClient({
      queryClient,
      persister: asyncStoragePersister,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      buster: '1.0.0', // Change this when you want to invalidate all cached data
    });
    console.log('Query persistence initialized');
  } catch (error) {
    console.error('Failed to initialize query persistence:', error);
  }
};

// Network status monitoring
let isOnline = true;
let unsubscribeNetInfo: (() => void) | null = null;

export const initializeNetworkMonitoring = () => {
  // Subscribe to network state changes
  unsubscribeNetInfo = NetInfo.addEventListener(state => {
    const wasOnline = isOnline;
    isOnline = state.isConnected ?? false;

    if (!wasOnline && isOnline) {
      // Came back online - refetch all queries
      queryClient.resumePausedMutations();
      queryClient.invalidateQueries();
      
      showMessage({
        message: 'Back online! Syncing data...',
        type: 'success',
        duration: 2000,
      });
    } else if (wasOnline && !isOnline) {
      // Went offline
      showMessage({
        message: 'You\'re offline. Using cached data.',
        type: 'warning',
        duration: 3000,
      });
    }
  });
};

export const cleanup = () => {
  if (unsubscribeNetInfo) {
    unsubscribeNetInfo();
    unsubscribeNetInfo = null;
  }
};

// Utility functions for offline handling
export const getNetworkStatus = () => isOnline;

export const invalidateQueriesWhenOnline = (queryKeys: string[]) => {
  if (isOnline) {
    queryKeys.forEach(key => {
      queryClient.invalidateQueries({ queryKey: [key] });
    });
  }
};

// Cache management utilities
export const clearQueryCache = async () => {
  try {
    await queryClient.clear();
    await AsyncStorage.removeItem('REACT_QUERY_OFFLINE_CACHE');
    showMessage({
      message: 'Cache cleared successfully',
      type: 'success',
    });
  } catch (error) {
    console.error('Failed to clear cache:', error);
    showMessage({
      message: 'Failed to clear cache',
      type: 'danger',
    });
  }
};

export const getCacheSize = async (): Promise<number> => {
  try {
    const cacheData = await AsyncStorage.getItem('REACT_QUERY_OFFLINE_CACHE');
    if (cacheData) {
      return new Blob([cacheData]).size;
    }
    return 0;
  } catch (error) {
    console.error('Failed to get cache size:', error);
    return 0;
  }
};

// Query key factories for consistent caching
export const queryKeys = {
  // User-related queries
  user: (userId: string) => ['user', userId],
  userProfile: (userId: string) => ['user', userId, 'profile'],
  
  // Sites-related queries
  sites: (userId: string) => ['sites', userId],
  site: (siteId: string) => ['site', siteId],
  siteAnalytics: (siteId: string, period: string) => ['site', siteId, 'analytics', period],
  
  // Products-related queries
  products: (page: number, search?: string) => ['products', page, search].filter(Boolean),
  product: (productId: string) => ['product', productId],
  
  // Analytics-related queries
  analytics: (userId: string, timeRange: string) => ['analytics', userId, timeRange],
  dashboard: (period: string) => ['dashboard', period],
  
  // Notifications-related queries
  notifications: (userId: string, filter: string) => ['notifications', userId, filter],
  notificationsUnreadCount: () => ['notifications', 'unread-count'],
};

// Prefetch commonly used data
export const prefetchEssentialData = async (userId: string) => {
  if (!isOnline) return;

  try {
    await Promise.all([
      // Prefetch user sites
      queryClient.prefetchQuery({
        queryKey: queryKeys.sites(userId),
        staleTime: 10 * 60 * 1000, // 10 minutes
      }),
      
      // Prefetch recent analytics
      queryClient.prefetchQuery({
        queryKey: queryKeys.analytics(userId, '7d'),
        staleTime: 5 * 60 * 1000, // 5 minutes
      }),
      
      // Prefetch unread notifications count
      queryClient.prefetchQuery({
        queryKey: queryKeys.notificationsUnreadCount(),
        staleTime: 2 * 60 * 1000, // 2 minutes
      }),
    ]);
    
    console.log('Essential data prefetched');
  } catch (error) {
    console.error('Failed to prefetch essential data:', error);
  }
};

// Background sync for mutations
export const enableBackgroundSync = () => {
  // Resume paused mutations when coming online
  const originalSetOnline = queryClient.getQueryCache().config.onOnline;
  
  queryClient.getQueryCache().config.onOnline = () => {
    originalSetOnline?.();
    queryClient.resumePausedMutations();
  };
};

// Optimistic updates helper
export const createOptimisticUpdate = <T>(
  queryKey: string[],
  updater: (oldData: T | undefined) => T
) => {
  return {
    onMutate: async () => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey });
      
      // Snapshot the previous value
      const previousData = queryClient.getQueryData<T>(queryKey);
      
      // Optimistically update to the new value
      queryClient.setQueryData<T>(queryKey, updater);
      
      // Return context with the snapshotted value
      return { previousData };
    },
    onError: (err: any, variables: any, context: any) => {
      // Rollback to previous data on error
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey });
    },
  };
};