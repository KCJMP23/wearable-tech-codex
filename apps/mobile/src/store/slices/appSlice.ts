import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Tenant } from '../../types';

interface AppState {
  selectedTenant: Tenant | null;
  networkStatus: 'online' | 'offline';
  syncStatus: 'idle' | 'syncing' | 'error';
  theme: 'light' | 'dark' | 'auto';
  isFirstLaunch: boolean;
  lastSyncTime: string | null;
  appVersion: string;
}

const initialState: AppState = {
  selectedTenant: null,
  networkStatus: 'online',
  syncStatus: 'idle',
  theme: 'auto',
  isFirstLaunch: true,
  lastSyncTime: null,
  appVersion: '1.0.0',
};

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    setSelectedTenant: (state, action: PayloadAction<Tenant | null>) => {
      state.selectedTenant = action.payload;
    },
    setNetworkStatus: (state, action: PayloadAction<'online' | 'offline'>) => {
      state.networkStatus = action.payload;
    },
    setSyncStatus: (state, action: PayloadAction<'idle' | 'syncing' | 'error'>) => {
      state.syncStatus = action.payload;
    },
    setTheme: (state, action: PayloadAction<'light' | 'dark' | 'auto'>) => {
      state.theme = action.payload;
    },
    setFirstLaunch: (state, action: PayloadAction<boolean>) => {
      state.isFirstLaunch = action.payload;
    },
    updateLastSyncTime: (state, action: PayloadAction<string>) => {
      state.lastSyncTime = action.payload;
    },
    resetApp: (state) => {
      return {
        ...initialState,
        isFirstLaunch: false,
        theme: state.theme,
      };
    },
  },
});

export const {
  setSelectedTenant,
  setNetworkStatus,
  setSyncStatus,
  setTheme,
  setFirstLaunch,
  updateLastSyncTime,
  resetApp,
} = appSlice.actions;

export default appSlice.reducer;