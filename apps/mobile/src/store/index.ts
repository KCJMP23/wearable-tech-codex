import { configureStore } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';

import authSlice from './slices/authSlice';
import appSlice from './slices/appSlice';
import sitesSlice from './slices/sitesSlice';
import analyticsSlice from './slices/analyticsSlice';
import notificationsSlice from './slices/notificationsSlice';
import offlineSlice from './slices/offlineSlice';

export const store = configureStore({
  reducer: {
    auth: authSlice,
    app: appSlice,
    sites: sitesSlice,
    analytics: analyticsSlice,
    notifications: notificationsSlice,
    offline: offlineSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;