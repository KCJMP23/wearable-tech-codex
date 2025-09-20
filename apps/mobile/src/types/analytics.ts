export interface AnalyticsData {
  userId: string;
  timeRange: '7d' | '30d' | '90d' | '1y';
  totalRevenue: string;
  revenueChange: string;
  totalVisits: string;
  visitsChange: string;
  conversionRate: string;
  conversionChange: string;
  avgOrderValue: string;
  aovChange: string;
  revenueChart: {
    labels: string[];
    data: number[];
  };
  trafficChart: {
    labels: string[];
    data: number[];
  };
  topSites: Array<{
    id: string;
    name: string;
    revenue: number;
    visits: number;
    conversionRate: number;
  }>;
  topProducts: Array<{
    id: string;
    name: string;
    revenue: number;
    conversions: number;
    clickThroughRate: number;
  }>;
  revenueByCategory: Array<{
    category: string;
    revenue: number;
    percentage: number;
  }>;
}

export interface AnalyticsMetrics {
  revenue: {
    total: number;
    change: number;
    trend: 'up' | 'down' | 'stable';
  };
  traffic: {
    total: number;
    change: number;
    trend: 'up' | 'down' | 'stable';
  };
  conversions: {
    rate: number;
    change: number;
    trend: 'up' | 'down' | 'stable';
  };
  averageOrderValue: {
    amount: number;
    change: number;
    trend: 'up' | 'down' | 'stable';
  };
}

export interface ChartData {
  labels: string[];
  datasets: Array<{
    data: number[];
    color?: (opacity?: number) => string;
    strokeWidth?: number;
  }>;
}

export interface PieChartData {
  name: string;
  population: number;
  color: string;
  legendFontColor: string;
  legendFontSize: number;
}