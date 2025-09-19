import React, { createContext, useContext, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppDispatch, useAppSelector } from '../store';
import { 
  setOnlineStatus, 
  startSync, 
  syncSuccess, 
  syncFailure,
  setCachedSites,
  setCachedAnalytics,
  setCachedNotifications
} from '../store/slices/offlineSlice';
import { STORAGE_KEYS } from '../constants';
import { apiService } from '../services/api';

interface OfflineContextType {
  isOnline: boolean;
  isSyncing: boolean;
  syncPendingActions: () => Promise<void>;
  cacheData: (key: string, data: any) => Promise<void>;
  getCachedData: (key: string) => Promise<any>;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const { isOnline, isSyncing, pendingActions } = useAppSelector(state => state.offline);
  const { user } = useAppSelector(state => state.auth);

  useEffect(() => {
    // Monitor network connectivity
    const unsubscribe = NetInfo.addEventListener(state => {
      const online = state.isConnected && state.isInternetReachable;
      dispatch(setOnlineStatus(online || false));
    });

    // Load cached data on app start
    loadCachedData();

    return unsubscribe;
  }, []);

  useEffect(() => {
    // Auto-sync when coming back online
    if (isOnline && pendingActions.length > 0 && !isSyncing) {
      syncPendingActions();
    }
  }, [isOnline, pendingActions.length]);

  const loadCachedData = async () => {
    try {
      const cachedSites = await AsyncStorage.getItem(`${STORAGE_KEYS.OFFLINE_DATA}:sites`);
      const cachedAnalytics = await AsyncStorage.getItem(`${STORAGE_KEYS.OFFLINE_DATA}:analytics`);
      const cachedNotifications = await AsyncStorage.getItem(`${STORAGE_KEYS.OFFLINE_DATA}:notifications`);

      if (cachedSites) {
        dispatch(setCachedSites(JSON.parse(cachedSites)));
      }
      if (cachedAnalytics) {
        dispatch(setCachedAnalytics(JSON.parse(cachedAnalytics)));
      }
      if (cachedNotifications) {
        dispatch(setCachedNotifications(JSON.parse(cachedNotifications)));
      }
    } catch (error) {
      console.error('Error loading cached data:', error);
    }
  };

  const cacheData = async (key: string, data: any) => {
    try {
      await AsyncStorage.setItem(`${STORAGE_KEYS.OFFLINE_DATA}:${key}`, JSON.stringify(data));
      
      // Update Redux store
      switch (key) {
        case 'sites':
          dispatch(setCachedSites(data));
          break;
        case 'analytics':
          dispatch(setCachedAnalytics(data));
          break;
        case 'notifications':
          dispatch(setCachedNotifications(data));
          break;
      }
    } catch (error) {
      console.error('Error caching data:', error);
    }
  };

  const getCachedData = async (key: string) => {
    try {
      const data = await AsyncStorage.getItem(`${STORAGE_KEYS.OFFLINE_DATA}:${key}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting cached data:', error);
      return null;
    }
  };

  const syncPendingActions = async () => {
    if (!isOnline || !user) return;

    dispatch(startSync());

    try {
      // Process pending actions
      for (const action of pendingActions) {
        await processPendingAction(action);
      }

      // Refresh data from server
      await refreshDataFromServer();

      dispatch(syncSuccess());
    } catch (error) {
      console.error('Sync failed:', error);
      dispatch(syncFailure(error instanceof Error ? error.message : 'Sync failed'));
    }
  };

  const processPendingAction = async (action: any) => {
    try {
      switch (action.type) {
        case 'CREATE_SITE':
          await apiService.createSite(action.data);
          break;
        case 'UPDATE_SITE':
          await apiService.updateSite(action.data.id, action.data);
          break;
        case 'DELETE_SITE':
          await apiService.deleteSite(action.data.id);
          break;
        default:
          console.warn('Unknown pending action type:', action.type);
      }
    } catch (error) {
      console.error('Error processing pending action:', error);
      
      // Increment retry count or remove if max retries reached
      if (action.retryCount >= 3) {
        console.log('Max retries reached for action:', action.id);
        // Remove from pending actions
      }
      
      throw error;
    }
  };

  const refreshDataFromServer = async () => {
    if (!user) return;

    try {
      // Refresh sites
      const sitesResponse = await apiService.getSites(user.id);
      await cacheData('sites', sitesResponse.sites);

      // Refresh notifications
      const notificationsResponse = await apiService.getNotifications(user.id);
      await cacheData('notifications', notificationsResponse.notifications || []);

    } catch (error) {
      console.error('Error refreshing data from server:', error);
    }
  };

  const contextValue: OfflineContextType = {
    isOnline,
    isSyncing,
    syncPendingActions,
    cacheData,
    getCachedData,
  };

  return (
    <OfflineContext.Provider value={contextValue}>
      {children}
    </OfflineContext.Provider>
  );
}

export function useOffline() {
  const context = useContext(OfflineContext);
  if (context === undefined) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
}