export interface Site {
  id: string;
  name: string;
  domain: string;
  status: 'active' | 'inactive' | 'suspended';
  theme: string;
  userId: string;
  monthlyRevenue?: number;
  totalRevenue?: number;
  totalProducts?: number;
  totalPosts?: number;
  totalVisitors?: number;
  conversionRate?: number;
  lastUpdated: string;
  createdAt: string;
  updatedAt: string;
  settings?: {
    allowComments: boolean;
    enableAnalytics: boolean;
    seoTitle?: string;
    seoDescription?: string;
    socialLinks?: {
      facebook?: string;
      twitter?: string;
      instagram?: string;
      youtube?: string;
    };
  };
}

export interface SiteAnalytics {
  siteId: string;
  timeRange: '7d' | '30d' | '90d' | '1y';
  revenue: {
    total: number;
    change: number;
    data: Array<{ date: string; amount: number }>;
  };
  traffic: {
    total: number;
    change: number;
    data: Array<{ date: string; visitors: number }>;
  };
  conversions: {
    rate: number;
    change: number;
    total: number;
  };
  topProducts: Array<{
    id: string;
    name: string;
    revenue: number;
    conversions: number;
  }>;
}

export interface CreateSiteRequest {
  name: string;
  domain: string;
  theme: string;
  description?: string;
  settings?: Site['settings'];
}

export interface UpdateSiteRequest extends Partial<CreateSiteRequest> {
  id: string;
}