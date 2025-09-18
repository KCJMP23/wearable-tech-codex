import { notFound } from 'next/navigation';
import { getTenantBySlug } from '@/lib/tenant';
import { getTenantInsights } from '@/lib/content';
import {
  ChartBarIcon,
  UsersIcon,
  EyeIcon,
  CurrencyDollarIcon,
  TrendingUpIcon,
  TrendingDownIcon,
} from '@heroicons/react/24/outline';

interface AnalyticsPageProps {
  params: { tenantSlug: string };
}

export default async function AnalyticsPage({ params }: AnalyticsPageProps) {
  const tenant = await getTenantBySlug(params.tenantSlug);
  if (!tenant) notFound();

  const insights = await getTenantInsights(tenant.id);

  // Mock analytics data
  const analyticsData = {
    overview: [
      {
        name: 'Total Revenue',
        value: '$45,231.89',
        change: '+20.1%',
        changeType: 'increase' as const,
        icon: CurrencyDollarIcon,
      },
      {
        name: 'Unique Visitors',
        value: '12,234',
        change: '+12.5%',
        changeType: 'increase' as const,
        icon: UsersIcon,
      },
      {
        name: 'Page Views',
        value: '89,432',
        change: '+8.2%',
        changeType: 'increase' as const,
        icon: EyeIcon,
      },
      {
        name: 'Conversion Rate',
        value: '3.24%',
        change: '-2.1%',
        changeType: 'decrease' as const,
        icon: ChartBarIcon,
      },
    ],
    topPages: [
      { path: '/products/apple-watch-series-9', views: 2543, conversions: 87 },
      { path: '/reviews/fitbit-charge-6', views: 1923, conversions: 62 },
      { path: '/guides/best-fitness-trackers-2024', views: 1678, conversions: 45 },
      { path: '/products/garmin-fenix-7', views: 1432, conversions: 56 },
      { path: '/reviews/samsung-galaxy-watch-6', views: 1234, conversions: 34 },
    ],
    topProducts: [
      { name: 'Apple Watch Series 9', clicks: 543, conversions: 87, revenue: '$12,543' },
      { name: 'Fitbit Charge 6', clicks: 423, conversions: 62, revenue: '$8,234' },
      { name: 'Garmin Fenix 7', clicks: 356, conversions: 56, revenue: '$15,678' },
      { name: 'Samsung Galaxy Watch 6', clicks: 298, conversions: 34, revenue: '$6,789' },
      { name: 'WHOOP 4.0', clicks: 267, conversions: 23, revenue: '$4,567' },
    ],
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Analytics</h2>
        <p className="text-gray-600">Track your performance and optimize your affiliate strategy</p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {analyticsData.overview.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                  <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <Icon className="h-6 w-6 text-gray-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                {stat.changeType === 'increase' ? (
                  <TrendingUpIcon className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDownIcon className="h-4 w-4 text-red-500" />
                )}
                <span
                  className={`ml-1 text-sm font-medium ${
                    stat.changeType === 'increase' ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {stat.change}
                </span>
                <span className="ml-1 text-sm text-gray-500">from last month</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart Placeholder */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Over Time</h3>
          <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Chart visualization would go here</p>
            </div>
          </div>
        </div>

        {/* Traffic Chart Placeholder */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Traffic Sources</h3>
          <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Chart visualization would go here</p>
            </div>
          </div>
        </div>
      </div>

      {/* Top Pages */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Top Performing Pages</h3>
          <p className="text-sm text-gray-600">Pages with the highest traffic and conversions</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Page
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Views
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Conversions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Conversion Rate
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {analyticsData.topPages.map((page, index) => (
                <tr key={page.path} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{page.path}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {page.views.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {page.conversions}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {((page.conversions / page.views) * 100).toFixed(2)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Products */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Top Performing Products</h3>
          <p className="text-sm text-gray-600">Products generating the most revenue</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Clicks
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Conversions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Revenue
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {analyticsData.topProducts.map((product) => (
                <tr key={product.name} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{product.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {product.clicks}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {product.conversions}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {product.revenue}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* AI Insights */}
      {insights.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">AI Insights</h3>
            <p className="text-sm text-gray-600">Automated insights from your data</p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {insights.map((insight) => (
                <div key={insight.id} className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-blue-900">{insight.headline}</h4>
                  <p className="text-sm text-blue-700 mt-1">{insight.body}</p>
                  <div className="mt-2 text-xs text-blue-600">
                    {insight.kpi}: {insight.value}
                  </div>
                  {insight.actionLabel && (
                    <button className="mt-2 text-xs text-blue-600 hover:text-blue-800 font-medium">
                      {insight.actionLabel} →
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}