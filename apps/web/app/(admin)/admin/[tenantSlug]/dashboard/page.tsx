import { notFound } from 'next/navigation';
import { getTenantBySlug } from '@/lib/tenant';
import { getTenantInsights, getFeaturedProducts, getRecentPosts } from '@/lib/content';
import {
  CurrencyDollarIcon,
  EyeIcon,
  CubeIcon,
  DocumentTextIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from '@heroicons/react/24/outline';

interface DashboardPageProps {
  params: { tenantSlug: string };
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const tenant = await getTenantBySlug(params.tenantSlug);
  if (!tenant) notFound();

  const [insights, products, posts] = await Promise.all([
    getTenantInsights(tenant.id),
    getFeaturedProducts(tenant.id),
    getRecentPosts(tenant.id),
  ]);

  // Mock data for demonstration
  const stats = [
    {
      name: 'Total Revenue',
      value: '$12,345',
      change: '+4.75%',
      changeType: 'increase' as const,
      icon: CurrencyDollarIcon,
    },
    {
      name: 'Page Views',
      value: '45,231',
      change: '+12.5%',
      changeType: 'increase' as const,
      icon: EyeIcon,
    },
    {
      name: 'Products',
      value: products.length.toString(),
      change: '+2',
      changeType: 'increase' as const,
      icon: CubeIcon,
    },
    {
      name: 'Posts',
      value: posts.length.toString(),
      change: '+3',
      changeType: 'increase' as const,
      icon: DocumentTextIcon,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-gray-600">Welcome back! Here's what's happening with your store.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
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
                <span className="ml-1 text-sm text-gray-500">from last month</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Products */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Recent Products</h3>
            <p className="text-sm text-gray-600">Latest products added to your catalog</p>
          </div>
          <div className="p-6">
            {products.length > 0 ? (
              <div className="space-y-4">
                {products.slice(0, 5).map((product) => (
                  <div key={product.id} className="flex items-center space-x-4">
                    <div className="h-12 w-12 bg-gray-100 rounded-lg flex items-center justify-center">
                      {product.images?.[0] ? (
                        <img
                          src={product.images[0].url}
                          alt={product.title}
                          className="h-12 w-12 rounded-lg object-cover"
                        />
                      ) : (
                        <CubeIcon className="h-6 w-6 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {product.title}
                      </p>
                      <p className="text-sm text-gray-500">{product.brand}</p>
                    </div>
                    <div className="text-sm text-gray-500">
                      {product.rating ? `${product.rating}★` : 'No rating'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No products yet</p>
            )}
          </div>
        </div>

        {/* Recent Posts */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Recent Posts</h3>
            <p className="text-sm text-gray-600">Latest content published on your site</p>
          </div>
          <div className="p-6">
            {posts.length > 0 ? (
              <div className="space-y-4">
                {posts.slice(0, 5).map((post) => (
                  <div key={post.id} className="flex items-center space-x-4">
                    <div className="h-12 w-12 bg-gray-100 rounded-lg flex items-center justify-center">
                      <DocumentTextIcon className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {post.title}
                      </p>
                      <p className="text-sm text-gray-500">{post.status}</p>
                    </div>
                    <div className="text-sm text-gray-500">
                      {post.publishedAt
                        ? new Date(post.publishedAt).toLocaleDateString()
                        : 'Draft'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No posts yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Insights */}
      {insights.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Insights</h3>
            <p className="text-sm text-gray-600">AI-generated insights about your business</p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {insights.map((insight) => (
                <div key={insight.id} className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900">{insight.headline}</h4>
                  <p className="text-sm text-gray-600 mt-1">{insight.body}</p>
                  <div className="mt-2 text-xs text-gray-500">
                    {insight.kpi}: {insight.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}