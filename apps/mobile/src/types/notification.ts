export interface Notification {
  id: string;
  userId: string;
  type: 'revenue' | 'performance' | 'alert' | 'update' | 'milestone' | 'system';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  updatedAt: string;
  metadata?: {
    siteId?: string;
    siteName?: string;
    amount?: number;
    url?: string;
    actionRequired?: boolean;
  };
}

export interface CreateNotificationRequest {
  userId: string;
  type: Notification['type'];
  title: string;
  message: string;
  metadata?: Notification['metadata'];
}

export interface NotificationSettings {
  userId: string;
  pushEnabled: boolean;
  emailEnabled: boolean;
  types: {
    revenue: boolean;
    performance: boolean;
    alert: boolean;
    update: boolean;
    milestone: boolean;
    system: boolean;
  };
  schedule: {
    dailyDigest: boolean;
    weeklyReport: boolean;
    monthlyReport: boolean;
  };
}