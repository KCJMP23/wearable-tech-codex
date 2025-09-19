import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Tenant } from '../../types';

interface SitesState {
  sites: Tenant[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: string | null;
  isCreating: boolean;
  createError: string | null;
}

const initialState: SitesState = {
  sites: [],
  isLoading: false,
  error: null,
  lastUpdated: null,
  isCreating: false,
  createError: null,
};

const sitesSlice = createSlice({
  name: 'sites',
  initialState,
  reducers: {
    fetchSitesStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    fetchSitesSuccess: (state, action: PayloadAction<Tenant[]>) => {
      state.sites = action.payload;
      state.isLoading = false;
      state.error = null;
      state.lastUpdated = new Date().toISOString();
    },
    fetchSitesFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.error = action.payload;
    },
    createSiteStart: (state) => {
      state.isCreating = true;
      state.createError = null;
    },
    createSiteSuccess: (state, action: PayloadAction<Tenant>) => {
      state.sites.unshift(action.payload);
      state.isCreating = false;
      state.createError = null;
    },
    createSiteFailure: (state, action: PayloadAction<string>) => {
      state.isCreating = false;
      state.createError = action.payload;
    },
    updateSite: (state, action: PayloadAction<Tenant>) => {
      const index = state.sites.findIndex(site => site.id === action.payload.id);
      if (index !== -1) {
        state.sites[index] = action.payload;
      }
    },
    deleteSite: (state, action: PayloadAction<string>) => {
      state.sites = state.sites.filter(site => site.id !== action.payload);
    },
    clearSitesError: (state) => {
      state.error = null;
      state.createError = null;
    },
    refreshSites: (state) => {
      state.lastUpdated = null;
    },
  },
});

export const {
  fetchSitesStart,
  fetchSitesSuccess,
  fetchSitesFailure,
  createSiteStart,
  createSiteSuccess,
  createSiteFailure,
  updateSite,
  deleteSite,
  clearSitesError,
  refreshSites,
} = sitesSlice.actions;

export default sitesSlice.reducer;