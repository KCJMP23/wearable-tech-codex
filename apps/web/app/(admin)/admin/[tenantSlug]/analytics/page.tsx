import { notFound } from 'next/navigation';
import { getTenantBySlug } from '@/lib/tenant';
import { getTenantInsights } from '@/lib/content';
import { ConversionIntelligenceView } from './ConversionIntelligenceView';

interface AnalyticsPageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function AnalyticsPage({ params }: AnalyticsPageProps) {
  const { tenantSlug } = await params;
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) notFound();

  // Safely get insights with fallback
  let insights = [];
  try {
    insights = await getTenantInsights(tenant.id);
  } catch (error) {
    console.error('Failed to fetch insights:', error);
    // Continue with empty insights array
  }

  // Enhanced analytics data for Conversion Intelligence Dashboard
  const analyticsData = {
    overview: {
      visitors: 45234,
      pageViews: 189432,
      conversionRate: 3.24,
      revenue: 45231.89,
      cartAbandonment: 71.5,
      avgSessionDuration: 245, // seconds
      bounceRate: 42.3
    },
    topProducts: [
      { id: '1', name: 'Apple Watch Series 10', views: 5432, revenue: 28543, conversionRate: 4.2 },
      { id: '2', name: 'Fitbit Charge 6', views: 4234, revenue: 15234, conversionRate: 3.8 },
      { id: '3', name: 'Garmin Fenix 7 Pro', views: 3678, revenue: 45678, conversionRate: 5.1 },
      { id: '4', name: 'Samsung Galaxy Watch 6', views: 2987, revenue: 18789, conversionRate: 3.2 },
      { id: '5', name: 'WHOOP 4.0', views: 2567, revenue: 14567, conversionRate: 4.5 },
      { id: '6', name: 'Oura Ring Gen 3', views: 2234, revenue: 22134, conversionRate: 6.2 },
      { id: '7', name: 'Apple Watch Ultra 2', views: 2123, revenue: 32456, conversionRate: 4.8 },
      { id: '8', name: 'Amazfit GTR 4', views: 1987, revenue: 8765, conversionRate: 2.9 }
    ],
    trafficSources: [
      { source: 'Organic Search', sessions: 28456, conversionRate: 3.8 },
      { source: 'Direct', sessions: 15234, conversionRate: 4.2 },
      { source: 'Social Media', sessions: 12345, conversionRate: 2.1 },
      { source: 'Email', sessions: 8765, conversionRate: 5.8 },
      { source: 'Referral', sessions: 5432, conversionRate: 3.2 },
      { source: 'Paid Search', sessions: 4321, conversionRate: 6.1 }
    ],
    devices: [
      { type: 'Mobile', sessions: 28456, revenue: 22134, conversionRate: 2.8 },
      { type: 'Desktop', sessions: 18765, revenue: 18567, conversionRate: 4.2 },
      { type: 'Tablet', sessions: 8234, revenue: 4530, conversionRate: 3.1 }
    ],
    funnel: [
      { stage: 'Homepage Visit', visitors: 45234, dropoff: 0 },
      { stage: 'Product View', visitors: 28456, dropoff: 37.1 },
      { stage: 'Add to Cart', visitors: 8234, dropoff: 71.5 },
      { stage: 'Checkout Started', visitors: 3456, dropoff: 58.1 },
      { stage: 'Purchase Complete', visitors: 1465, dropoff: 57.6 }
    ],
    heatmaps: {
      clicks: [
        { x: 640, y: 120, count: 4532 },
        { x: 320, y: 400, count: 3421 },
        { x: 960, y: 350, count: 2890 },
        { x: 480, y: 600, count: 2345 },
        { x: 800, y: 250, count: 1987 },
        { x: 160, y: 180, count: 1654 },
        { x: 1120, y: 450, count: 1432 }
      ],
      scrollDepth: [
        { depth: 0, percentage: 100 },
        { depth: 25, percentage: 85 },
        { depth: 50, percentage: 62 },
        { depth: 75, percentage: 38 },
        { depth: 100, percentage: 15 }
      ]
    },
    predictions: {
      nextWeekRevenue: 52345,
      nextWeekOrders: 1823,
      churnRisk: 12.3,
      seasonalTrend: 'upward',
      growthRate: 18.5
    }
  };

  return <ConversionIntelligenceView tenantSlug={tenantSlug} tenantId={tenant.id} analytics={analyticsData} />;
}