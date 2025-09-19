import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Analytics } from '../../types';

interface AnalyticsState {
  analytics: Analytics | null;
  isLoading: boolean;
  error: string | null;
  selectedTimeframe: '24h' | '7d' | '30d';
  lastUpdated: string | null;
}

const initialState: AnalyticsState = {
  analytics: null,
  isLoading: false,
  error: null,
  selectedTimeframe: '7d',
  lastUpdated: null,
};

const analyticsSlice = createSlice({
  name: 'analytics',
  initialState,
  reducers: {
    fetchAnalyticsStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    fetchAnalyticsSuccess: (state, action: PayloadAction<Analytics>) => {
      state.analytics = action.payload;
      state.isLoading = false;
      state.error = null;
      state.lastUpdated = new Date().toISOString();
    },
    fetchAnalyticsFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.error = action.payload;
    },
    setTimeframe: (state, action: PayloadAction<'24h' | '7d' | '30d'>) => {
      state.selectedTimeframe = action.payload;
      // Clear analytics to force refresh
      state.analytics = null;
      state.lastUpdated = null;
    },
    clearAnalyticsError: (state) => {
      state.error = null;
    },
    refreshAnalytics: (state) => {
      state.lastUpdated = null;
    },
  },
});

export const {
  fetchAnalyticsStart,
  fetchAnalyticsSuccess,
  fetchAnalyticsFailure,
  setTimeframe,
  clearAnalyticsError,
  refreshAnalytics,
} = analyticsSlice.actions;

export default analyticsSlice.reducer;