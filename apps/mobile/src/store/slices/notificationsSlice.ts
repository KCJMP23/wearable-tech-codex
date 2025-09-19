import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { NotificationSettings } from '../../types';

interface Notification {
  id: string;
  title: string;
  body: string;
  type: 'revenue' | 'traffic' | 'system' | 'content';
  data?: Record<string, any>;
  read: boolean;
  created_at: string;
}

interface NotificationsState {
  notifications: Notification[];
  settings: NotificationSettings;
  isLoading: boolean;
  error: string | null;
  unreadCount: number;
  expoPushToken: string | null;
}

const initialState: NotificationsState = {
  notifications: [],
  settings: {
    push_enabled: true,
    email_enabled: true,
    revenue_alerts: true,
    traffic_alerts: true,
    system_alerts: true,
  },
  isLoading: false,
  error: null,
  unreadCount: 0,
  expoPushToken: null,
};

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    fetchNotificationsStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    fetchNotificationsSuccess: (state, action: PayloadAction<Notification[]>) => {
      state.notifications = action.payload;
      state.isLoading = false;
      state.error = null;
      state.unreadCount = action.payload.filter(n => !n.read).length;
    },
    fetchNotificationsFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.error = action.payload;
    },
    addNotification: (state, action: PayloadAction<Notification>) => {
      state.notifications.unshift(action.payload);
      if (!action.payload.read) {
        state.unreadCount += 1;
      }
    },
    markAsRead: (state, action: PayloadAction<string>) => {
      const notification = state.notifications.find(n => n.id === action.payload);
      if (notification && !notification.read) {
        notification.read = true;
        state.unreadCount -= 1;
      }
    },
    markAllAsRead: (state) => {
      state.notifications.forEach(notification => {
        notification.read = true;
      });
      state.unreadCount = 0;
    },
    deleteNotification: (state, action: PayloadAction<string>) => {
      const notification = state.notifications.find(n => n.id === action.payload);
      if (notification && !notification.read) {
        state.unreadCount -= 1;
      }
      state.notifications = state.notifications.filter(n => n.id !== action.payload);
    },
    updateSettings: (state, action: PayloadAction<Partial<NotificationSettings>>) => {
      state.settings = { ...state.settings, ...action.payload };
    },
    setExpoPushToken: (state, action: PayloadAction<string>) => {
      state.expoPushToken = action.payload;
    },
    clearNotificationsError: (state) => {
      state.error = null;
    },
  },
});

export const {
  fetchNotificationsStart,
  fetchNotificationsSuccess,
  fetchNotificationsFailure,
  addNotification,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  updateSettings,
  setExpoPushToken,
  clearNotificationsError,
} = notificationsSlice.actions;

export default notificationsSlice.reducer;