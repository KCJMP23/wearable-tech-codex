import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface OfflineAction {
  id: string;
  type: 'CREATE_SITE' | 'UPDATE_SITE' | 'DELETE_SITE' | 'SYNC_ANALYTICS';
  data: any;
  timestamp: string;
  retryCount: number;
}

interface OfflineState {
  isOnline: boolean;
  pendingActions: OfflineAction[];
  isSyncing: boolean;
  lastSyncAttempt: string | null;
  syncError: string | null;
  cachedData: {
    sites: any[];
    analytics: any;
    notifications: any[];
  };
}

const initialState: OfflineState = {
  isOnline: true,
  pendingActions: [],
  isSyncing: false,
  lastSyncAttempt: null,
  syncError: null,
  cachedData: {
    sites: [],
    analytics: null,
    notifications: [],
  },
};

const offlineSlice = createSlice({
  name: 'offline',
  initialState,
  reducers: {
    setOnlineStatus: (state, action: PayloadAction<boolean>) => {
      state.isOnline = action.payload;
      if (action.payload && state.pendingActions.length > 0) {
        // Trigger sync when coming back online
        state.isSyncing = true;
      }
    },
    addPendingAction: (state, action: PayloadAction<Omit<OfflineAction, 'id' | 'timestamp' | 'retryCount'>>) => {
      const newAction: OfflineAction = {
        ...action.payload,
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        retryCount: 0,
      };
      state.pendingActions.push(newAction);
    },
    removePendingAction: (state, action: PayloadAction<string>) => {
      state.pendingActions = state.pendingActions.filter(action => action.id !== action.payload);
    },
    incrementRetryCount: (state, action: PayloadAction<string>) => {
      const actionItem = state.pendingActions.find(a => a.id === action.payload);
      if (actionItem) {
        actionItem.retryCount += 1;
      }
    },
    startSync: (state) => {
      state.isSyncing = true;
      state.syncError = null;
      state.lastSyncAttempt = new Date().toISOString();
    },
    syncSuccess: (state) => {
      state.isSyncing = false;
      state.syncError = null;
      state.pendingActions = [];
    },
    syncFailure: (state, action: PayloadAction<string>) => {
      state.isSyncing = false;
      state.syncError = action.payload;
    },
    setCachedSites: (state, action: PayloadAction<any[]>) => {
      state.cachedData.sites = action.payload;
    },
    setCachedAnalytics: (state, action: PayloadAction<any>) => {
      state.cachedData.analytics = action.payload;
    },
    setCachedNotifications: (state, action: PayloadAction<any[]>) => {
      state.cachedData.notifications = action.payload;
    },
    clearOfflineData: (state) => {
      state.pendingActions = [];
      state.cachedData = {
        sites: [],
        analytics: null,
        notifications: [],
      };
      state.syncError = null;
    },
  },
});

export const {
  setOnlineStatus,
  addPendingAction,
  removePendingAction,
  incrementRetryCount,
  startSync,
  syncSuccess,
  syncFailure,
  setCachedSites,
  setCachedAnalytics,
  setCachedNotifications,
  clearOfflineData,
} = offlineSlice.actions;

export default offlineSlice.reducer;