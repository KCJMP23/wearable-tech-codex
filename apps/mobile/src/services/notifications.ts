import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { notificationsApi } from './api';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

interface NotificationPermissionStatus {
  granted: boolean;
  canAskAgain: boolean;
  status: Notifications.PermissionStatus;
}

interface PushNotificationToken {
  token: string;
  type: 'expo' | 'fcm' | 'apns';
}

class NotificationService {
  private pushToken: string | null = null;
  private notificationListener: Notifications.Subscription | null = null;
  private responseListener: Notifications.Subscription | null = null;

  async initialize(): Promise<void> {
    try {
      await this.requestPermissions();
      await this.registerForPushNotifications();
      this.setupNotificationListeners();
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
    }
  }

  async requestPermissions(): Promise<NotificationPermissionStatus> {
    try {
      if (!Device.isDevice) {
        console.warn('Push notifications require a physical device');
        return {
          granted: false,
          canAskAgain: false,
          status: Notifications.PermissionStatus.DENIED,
        };
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== Notifications.PermissionStatus.GRANTED) {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== Notifications.PermissionStatus.GRANTED) {
        console.warn('Push notification permission not granted');
        return {
          granted: false,
          canAskAgain: finalStatus === Notifications.PermissionStatus.UNDETERMINED,
          status: finalStatus,
        };
      }

      // For Android, set up notification channel
      if (Platform.OS === 'android') {
        await this.setupAndroidChannel();
      }

      return {
        granted: true,
        canAskAgain: true,
        status: finalStatus,
      };
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return {
        granted: false,
        canAskAgain: false,
        status: Notifications.PermissionStatus.DENIED,
      };
    }
  }

  async registerForPushNotifications(): Promise<PushNotificationToken | null> {
    try {
      if (!Device.isDevice) {
        console.warn('Push notifications require a physical device');
        return null;
      }

      const { granted } = await this.requestPermissions();
      if (!granted) {
        console.warn('Push notification permissions not granted');
        return null;
      }

      // Get the push token
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
      });

      this.pushToken = tokenData.data;

      // Store token locally
      await AsyncStorage.setItem('@push_token', this.pushToken);

      // Send token to backend
      try {
        await notificationsApi.updatePushToken(this.pushToken);
        console.log('Push token registered with backend');
      } catch (error) {
        console.error('Failed to register push token with backend:', error);
      }

      return {
        token: this.pushToken,
        type: 'expo',
      };
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      return null;
    }
  }

  private async setupAndroidChannel(): Promise<void> {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'AffiliateOS Notifications',
      description: 'Notifications for AffiliateOS app',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#3b82f6',
      sound: 'default',
      enableLights: true,
      enableVibrate: true,
      showBadge: true,
    });

    // Create additional channels for different notification types
    await Notifications.setNotificationChannelAsync('revenue', {
      name: 'Revenue Alerts',
      description: 'Important revenue and earnings notifications',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#22c55e',
      sound: 'default',
    });

    await Notifications.setNotificationChannelAsync('marketing', {
      name: 'Marketing Updates',
      description: 'Product updates and marketing tips',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250],
      lightColor: '#3b82f6',
      sound: 'default',
    });
  }

  private setupNotificationListeners(): void {
    // Handle notifications received while app is foregrounded
    this.notificationListener = Notifications.addNotificationReceivedListener(
      this.handleNotificationReceived
    );

    // Handle user tapping on notifications
    this.responseListener = Notifications.addNotificationResponseReceivedListener(
      this.handleNotificationResponse
    );
  }

  private handleNotificationReceived = (notification: Notifications.Notification): void => {
    console.log('Notification received:', notification);
    
    // You can customize behavior based on notification type
    const { type, priority } = notification.request.content.data || {};
    
    // Update badge count
    this.updateBadgeCount();
    
    // Handle high priority notifications differently
    if (priority === 'high') {
      // Could show an in-app alert or modal
      console.log('High priority notification received');
    }
  };

  private handleNotificationResponse = (response: Notifications.NotificationResponse): void => {
    console.log('Notification response:', response);
    
    const { data } = response.notification.request.content;
    
    // Navigate based on notification type
    if (data?.screen) {
      // Navigation logic would go here
      console.log('Navigate to:', data.screen);
    }
    
    // Mark notification as read if it has an ID
    if (data?.notificationId) {
      this.markNotificationAsRead(data.notificationId);
    }
  };

  async scheduleLocalNotification(
    title: string,
    body: string,
    data?: any,
    trigger?: Notifications.NotificationTriggerInput
  ): Promise<string> {
    try {
      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: data || {},
          sound: 'default',
          badge: await this.getBadgeCount() + 1,
        },
        trigger: trigger || null, // null means immediate
      });

      console.log('Local notification scheduled:', identifier);
      return identifier;
    } catch (error) {
      console.error('Error scheduling local notification:', error);
      throw error;
    }
  }

  async cancelNotification(identifier: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(identifier);
      console.log('Notification cancelled:', identifier);
    } catch (error) {
      console.error('Error cancelling notification:', error);
    }
  }

  async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('All notifications cancelled');
    } catch (error) {
      console.error('Error cancelling all notifications:', error);
    }
  }

  async updateBadgeCount(): Promise<void> {
    try {
      // Get unread count from API
      const response = await notificationsApi.getUnreadCount();
      const count = response.data || 0;
      
      await Notifications.setBadgeCountAsync(count);
      
      // Store locally for offline access
      await AsyncStorage.setItem('@badge_count', count.toString());
    } catch (error) {
      console.error('Error updating badge count:', error);
    }
  }

  async getBadgeCount(): Promise<number> {
    try {
      const count = await Notifications.getBadgeCountAsync();
      return count || 0;
    } catch (error) {
      console.error('Error getting badge count:', error);
      return 0;
    }
  }

  async clearBadge(): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(0);
      await AsyncStorage.setItem('@badge_count', '0');
    } catch (error) {
      console.error('Error clearing badge:', error);
    }
  }

  private async markNotificationAsRead(notificationId: string): Promise<void> {
    try {
      await notificationsApi.markAsRead(notificationId);
      await this.updateBadgeCount();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  async getStoredPushToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('@push_token');
    } catch (error) {
      console.error('Error getting stored push token:', error);
      return null;
    }
  }

  getPushToken(): string | null {
    return this.pushToken;
  }

  // Clean up listeners when app is closing
  cleanup(): void {
    if (this.notificationListener) {
      this.notificationListener.remove();
      this.notificationListener = null;
    }
    
    if (this.responseListener) {
      this.responseListener.remove();
      this.responseListener = null;
    }
  }

  // Test notification (for development)
  async sendTestNotification(): Promise<void> {
    await this.scheduleLocalNotification(
      'Test Notification',
      'This is a test notification from AffiliateOS',
      { type: 'test', screen: 'notifications' }
    );
  }

  // Schedule recurring revenue reports
  async scheduleWeeklyReport(): Promise<string> {
    const trigger: Notifications.WeeklyTriggerInput = {
      weekday: 1, // Monday
      hour: 9, // 9 AM
      minute: 0,
      repeats: true,
    };

    return await this.scheduleLocalNotification(
      'Weekly Revenue Report',
      'Your weekly affiliate performance report is ready!',
      { type: 'revenue', screen: 'analytics' },
      trigger
    );
  }

  // Schedule conversion alerts
  async scheduleConversionAlert(productName: string, revenue: string): Promise<string> {
    return await this.scheduleLocalNotification(
      'New Conversion! 🎉',
      `${productName} generated ${revenue} in commission`,
      { type: 'conversion', screen: 'analytics' }
    );
  }
}

export const notificationService = new NotificationService();