'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ReactNode, useState } from 'react';
import { cacheConfig } from '../config/performance';

/**
 * Optimized React Query Provider with performance configurations
 * Implements stale-while-revalidate caching strategy
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Stale time: data considered fresh for this duration
            staleTime: cacheConfig.staleTime.default,
            
            // Cache time: data kept in cache for this duration
            gcTime: cacheConfig.cacheTime.default,
            
            // Retry configuration
            retry: (failureCount, error: any) => {
              // Don't retry on 4xx errors
              if (error?.status >= 400 && error?.status < 500) return false;
              // Retry up to 2 times for other errors
              return failureCount < 2;
            },
            
            // Retry delay with exponential backoff
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
            
            // Refetch on window focus (good for fresh data)
            refetchOnWindowFocus: false,
            
            // Keep previous data while fetching new data
            keepPreviousData: true,
            
            // Network mode
            networkMode: 'offlineFirst',
          },
          mutations: {
            // Retry configuration for mutations
            retry: 1,
            retryDelay: 1000,
            
            // Network mode for mutations
            networkMode: 'online',
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} position="bottom-right" />
      )}
    </QueryClientProvider>
  );
}