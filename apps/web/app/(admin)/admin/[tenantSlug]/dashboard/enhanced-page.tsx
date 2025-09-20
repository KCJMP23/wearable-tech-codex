import { notFound } from 'next/navigation';
import { getTenantBySlug } from '@/lib/tenant';
import { getTenantInsights, getFeaturedProducts, getRecentPosts } from '@/lib/content';
import Link from 'next/link';
import {
  CurrencyDollarIcon,
  EyeIcon,
  CubeIcon,
  DocumentTextIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ShoppingCartIcon,
  UserGroupIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  BellIcon,
  PlusIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';
import { StarIcon } from '@heroicons/react/24/solid';

interface DashboardPageProps {
  params: Promise<{ tenantSlug: string }>;
}

// Shopify-like color scheme
const colors = {
  primary: '#008060',
  success: '#008060',
  warning: '#FFC453',
  danger: '#D72C0D',
  info: '#1A73E8',
  muted: '#6D7175',
};

export default async function EnhancedDashboardPage({ params }: DashboardPageProps) {
  const { tenantSlug } = await params;
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) notFound();

  const [insights, products, posts] = await Promise.all([
    getTenantInsights(tenant.id),
    getFeaturedProducts(tenant.id),
    getRecentPosts(tenant.id),
  ]);

  // Enhanced stats with Shopify-like metrics
  const stats = [
    {
      name: 'Total Sales',
      value: '$45,231',
      change: '+12.5%',
      changeType: 'increase' as const,
      icon: CurrencyDollarIcon,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      sparkline: [10, 12, 15, 18, 22, 25, 30, 35, 40, 45],
    },
    {
      name: 'Total Orders',
      value: '1,234',
      change: '+8.2%',
      changeType: 'increase' as const,
      icon: ShoppingCartIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      sparkline: [30, 35, 32, 38, 42, 45, 48, 52, 55, 58],
    },
    {
      name: 'Visitors',
      value: '23,451',
      change: '-2.4%',
      changeType: 'decrease' as const,
      icon: UserGroupIcon,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      sparkline: [60, 58, 55, 52, 48, 45, 42, 40, 38, 35],
    },
    {
      name: 'Conversion Rate',
      value: '3.2%',
      change: '+0.5%',
      changeType: 'increase' as const,
      icon: ArrowTrendingUpIcon,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      sparkline: [2.8, 2.9, 3.0, 3.0, 3.1, 3.1, 3.2, 3.2, 3.2, 3.2],
    },
  ];

  // Mock activity feed
  const activities = [
    { id: 1, type: 'order', message: 'New order #1234 received', time: '5 min ago', icon: ShoppingCartIcon, color: 'text-green-600' },
    { id: 2, type: 'product', message: 'Product "Smartwatch Pro" is low on stock', time: '1 hour ago', icon: ExclamationTriangleIcon, color: 'text-yellow-600' },
    { id: 3, type: 'content', message: 'Blog post "Top 10 Gadgets" published', time: '2 hours ago', icon: DocumentTextIcon, color: 'text-blue-600' },
    { id: 4, type: 'user', message: '15 new subscribers today', time: '3 hours ago', icon: UserGroupIcon, color: 'text-purple-600' },
  ];

  // Mock top products
  const topProducts = [
    { id: 1, name: 'Wireless Earbuds Pro', sales: 234, revenue: '$12,345', trend: 'up' },
    { id: 2, name: 'Smart Home Hub', sales: 189, revenue: '$9,456', trend: 'up' },
    { id: 3, name: 'Fitness Tracker Elite', sales: 156, revenue: '$7,890', trend: 'down' },
    { id: 4, name: 'Portable Charger Max', sales: 134, revenue: '$5,234', trend: 'up' },
    { id: 5, name: 'Bluetooth Speaker Mini', sales: 98, revenue: '$3,456', trend: 'stable' },
  ];

  return (
    <div className="space-y-6">
      {/* Enhanced Page Header with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-gray-600">
            Overview of your store's performance and activities
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex gap-3">
          <button className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            <ClockIcon className="h-4 w-4 mr-2" />
            Last 30 days
          </button>
          <Link
            href={`/admin/${tenantSlug}/products/new`}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Product
          </Link>
        </div>
      </div>

      {/* Enhanced Stats Cards with Sparklines */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">{stat.value}</p>
                  <div className="mt-2 flex items-center">
                    {stat.changeType === 'increase' ? (
                      <ArrowUpIcon className="h-4 w-4 text-green-500" />
                    ) : (
                      <ArrowDownIcon className="h-4 w-4 text-red-500" />
                    )}
                    <span
                      className={`ml-1 text-sm font-medium ${
                        stat.changeType === 'increase' ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {stat.change}
                    </span>
                    <span className="ml-1 text-sm text-gray-500">vs last period</span>
                  </div>
                </div>
                <div className={`p-3 ${stat.bgColor} rounded-lg`}>
                  <Icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
              
              {/* Mini Sparkline */}
              <div className="mt-4 h-8 flex items-end gap-1">
                {stat.sparkline.map((value, index) => (
                  <div
                    key={index}
                    className={`flex-1 ${stat.bgColor} rounded-t`}
                    style={{ height: `${(value / Math.max(...stat.sparkline)) * 100}%` }}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - 2/3 width */}
        <div className="lg:col-span-2 space-y-6">
          {/* Sales Chart */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Sales Overview</h2>
                <div className="flex gap-2">
                  <button className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                    Day
                  </button>
                  <button className="px-3 py-1 text-sm bg-green-600 text-white rounded-lg">
                    Week
                  </button>
                  <button className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                    Month
                  </button>
                </div>
              </div>
            </div>
            <div className="p-6">
              {/* Placeholder for chart */}
              <div className="h-64 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg flex items-center justify-center">
                <ChartBarIcon className="h-12 w-12 text-gray-400" />
              </div>
            </div>
          </div>

          {/* Top Products Table */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Top Products</h2>
                <Link
                  href={`/admin/${tenantSlug}/products`}
                  className="text-sm text-green-600 hover:text-green-700 font-medium"
                >
                  View all →
                </Link>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sales
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Revenue
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Trend
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {topProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 bg-gray-100 rounded-lg flex items-center justify-center">
                            <CubeIcon className="h-5 w-5 text-gray-400" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{product.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {product.sales}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                        {product.revenue}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {product.trend === 'up' && (
                          <span className="inline-flex items-center text-sm text-green-600">
                            <ArrowUpIcon className="h-4 w-4 mr-1" />
                            Up
                          </span>
                        )}
                        {product.trend === 'down' && (
                          <span className="inline-flex items-center text-sm text-red-600">
                            <ArrowDownIcon className="h-4 w-4 mr-1" />
                            Down
                          </span>
                        )}
                        {product.trend === 'stable' && (
                          <span className="inline-flex items-center text-sm text-gray-600">
                            Stable
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column - 1/3 width */}
        <div className="space-y-6">
          {/* Activity Feed */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
                <BellIcon className="h-5 w-5 text-gray-400" />
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {activities.map((activity) => {
                  const Icon = activity.icon;
                  return (
                    <div key={activity.id} className="flex items-start space-x-3">
                      <div className={`p-2 bg-gray-50 rounded-lg ${activity.color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900">{activity.message}</p>
                        <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <Link
                href={`/admin/${tenantSlug}/activity`}
                className="mt-4 block text-center text-sm text-green-600 hover:text-green-700 font-medium"
              >
                View all activity
              </Link>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
            </div>
            <div className="p-6 space-y-3">
              <Link
                href={`/admin/${tenantSlug}/products/new`}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center">
                  <CubeIcon className="h-5 w-5 text-gray-600 mr-3" />
                  <span className="text-sm font-medium text-gray-900">Add Product</span>
                </div>
                <ArrowRightIcon className="h-4 w-4 text-gray-400" />
              </Link>
              <Link
                href={`/admin/${tenantSlug}/posts/new`}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center">
                  <DocumentTextIcon className="h-5 w-5 text-gray-600 mr-3" />
                  <span className="text-sm font-medium text-gray-900">Create Post</span>
                </div>
                <ArrowRightIcon className="h-4 w-4 text-gray-400" />
              </Link>
              <Link
                href={`/admin/${tenantSlug}/analytics`}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center">
                  <ChartBarIcon className="h-5 w-5 text-gray-600 mr-3" />
                  <span className="text-sm font-medium text-gray-900">View Analytics</span>
                </div>
                <ArrowRightIcon className="h-4 w-4 text-gray-400" />
              </Link>
              <Link
                href={`/admin/${tenantSlug}/settings`}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center">
                  <CubeIcon className="h-5 w-5 text-gray-600 mr-3" />
                  <span className="text-sm font-medium text-gray-900">Settings</span>
                </div>
                <ArrowRightIcon className="h-4 w-4 text-gray-400" />
              </Link>
            </div>
          </div>

          {/* AI Insights */}
          {insights.length > 0 && (
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200">
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <StarIcon className="h-5 w-5 text-purple-600 mr-2" />
                  <h2 className="text-lg font-semibold text-gray-900">AI Insights</h2>
                </div>
                <div className="space-y-3">
                  {insights.slice(0, 3).map((insight) => (
                    <div key={insight.id} className="p-3 bg-white rounded-lg">
                      <p className="text-sm font-medium text-gray-900">{insight.headline}</p>
                      <p className="text-xs text-gray-600 mt-1">{insight.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}