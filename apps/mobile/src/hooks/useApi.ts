import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppSelector, useAppDispatch } from '../store';
import { useOffline } from '../providers/OfflineProvider';
import { apiService } from '../services/api';
import { QUERY_KEYS } from '../constants';
import { 
  fetchSitesStart, 
  fetchSitesSuccess, 
  fetchSitesFailure,
  createSiteStart,
  createSiteSuccess,
  createSiteFailure
} from '../store/slices/sitesSlice';
import {
  fetchAnalyticsStart,
  fetchAnalyticsSuccess,
  fetchAnalyticsFailure
} from '../store/slices/analyticsSlice';
import { addPendingAction } from '../store/slices/offlineSlice';
import { CreateSiteRequest, Tenant } from '../types';

export function useSites() {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const { user } = useAppSelector(state => state.auth);
  const { isOnline, getCachedData, cacheData } = useOffline();

  const sitesQuery = useQuery({
    queryKey: [QUERY_KEYS.SITES, user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');
      
      dispatch(fetchSitesStart());
      
      try {
        if (!isOnline) {
          // Return cached data when offline
          const cachedSites = await getCachedData('sites');
          if (cachedSites) {
            dispatch(fetchSitesSuccess(cachedSites));
            return { sites: cachedSites };
          }
          throw new Error('No cached data available');
        }

        const response = await apiService.getSites(user.id);
        dispatch(fetchSitesSuccess(response.sites));
        
        // Cache the data
        await cacheData('sites', response.sites);
        
        return response;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch sites';
        dispatch(fetchSitesFailure(errorMessage));
        throw error;
      }
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const createSiteMutation = useMutation({
    mutationFn: async (siteData: CreateSiteRequest) => {
      dispatch(createSiteStart());
      
      if (!isOnline) {
        // Queue for offline sync
        dispatch(addPendingAction({
          type: 'CREATE_SITE',
          data: siteData,
        }));
        
        // Create optimistic update
        const optimisticSite: Tenant = {
          id: `temp-${Date.now()}`,
          name: siteData.name,
          slug: siteData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          domain: `${siteData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.wearabletech.ai`,
          active: true,
          config: {
            niche: siteData.niche,
            automation_level: siteData.automation_level,
            target_audience: siteData.target_audience,
            content_frequency: siteData.content_frequency,
            mobile_created: true,
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        
        dispatch(createSiteSuccess(optimisticSite));
        return { site: optimisticSite };
      }

      try {
        const response = await apiService.createSite(siteData);
        dispatch(createSiteSuccess(response.site));
        
        // Invalidate sites query to refresh
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SITES] });
        
        return response;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to create site';
        dispatch(createSiteFailure(errorMessage));
        throw error;
      }
    },
  });

  return {
    sites: sitesQuery.data?.sites || [],
    isLoading: sitesQuery.isLoading,
    error: sitesQuery.error,
    createSite: createSiteMutation.mutate,
    isCreating: createSiteMutation.isPending,
    createError: createSiteMutation.error,
    refetch: sitesQuery.refetch,
  };
}

export function useAnalytics(tenantId?: string) {
  const dispatch = useAppDispatch();
  const { selectedTenant } = useAppSelector(state => state.app);
  const { selectedTimeframe } = useAppSelector(state => state.analytics);
  const { isOnline, getCachedData, cacheData } = useOffline();
  
  const actualTenantId = tenantId || selectedTenant?.id;

  const analyticsQuery = useQuery({
    queryKey: [QUERY_KEYS.ANALYTICS, actualTenantId, selectedTimeframe],
    queryFn: async () => {
      if (!actualTenantId) throw new Error('No tenant selected');
      
      dispatch(fetchAnalyticsStart());
      
      try {
        if (!isOnline) {
          const cachedAnalytics = await getCachedData('analytics');
          if (cachedAnalytics) {
            dispatch(fetchAnalyticsSuccess(cachedAnalytics));
            return { analytics: cachedAnalytics };
          }
          throw new Error('No cached analytics data available');
        }

        const response = await apiService.getAnalytics(actualTenantId, selectedTimeframe);
        dispatch(fetchAnalyticsSuccess(response.analytics));
        
        // Cache the data
        await cacheData('analytics', response.analytics);
        
        return response;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch analytics';
        dispatch(fetchAnalyticsFailure(errorMessage));
        throw error;
      }
    },
    enabled: !!actualTenantId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  return {
    analytics: analyticsQuery.data?.analytics,
    isLoading: analyticsQuery.isLoading,
    error: analyticsQuery.error,
    refetch: analyticsQuery.refetch,
  };
}

export function useNotificationsApi() {
  const { user } = useAppSelector(state => state.auth);
  const { isOnline, getCachedData, cacheData } = useOffline();

  const notificationsQuery = useQuery({
    queryKey: [QUERY_KEYS.NOTIFICATIONS, user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');
      
      if (!isOnline) {
        const cachedNotifications = await getCachedData('notifications');
        if (cachedNotifications) {
          return { notifications: cachedNotifications };
        }
        throw new Error('No cached notifications available');
      }

      const response = await apiService.getNotifications(user.id);
      
      // Cache the data
      await cacheData('notifications', response.notifications || []);
      
      return response;
    },
    enabled: !!user?.id,
    staleTime: 1 * 60 * 1000, // 1 minute
  });

  const markAsReadMutation = useMutation({
    mutationFn: apiService.markNotificationAsRead,
  });

  return {
    notifications: notificationsQuery.data?.notifications || [],
    isLoading: notificationsQuery.isLoading,
    error: notificationsQuery.error,
    markAsRead: markAsReadMutation.mutate,
    refetch: notificationsQuery.refetch,
  };
}