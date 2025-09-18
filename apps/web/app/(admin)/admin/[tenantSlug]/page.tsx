import { getTenantBySlug } from '@/lib/tenant';
import { notFound } from 'next/navigation';
import { 
  Package, 
  FileText, 
  Users, 
  TrendingUp, 
  DollarSign,
  Eye,
  ShoppingCart,
  BarChart3
} from 'lucide-react';

export default async function AdminDashboard({ params }: { params: { tenantSlug: string } }) {
  const { tenantSlug } = await params;
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) notFound();

  const stats = [
    { label: 'Total Revenue', value: '$12,345', icon: DollarSign, change: '+12%' },
    { label: 'Products', value: '148', icon: Package, change: '+8%' },
    { label: 'Posts', value: '67', icon: FileText, change: '+23%' },
    { label: 'Page Views', value: '45.2k', icon: Eye, change: '+18%' },
    { label: 'Conversions', value: '3.2%', icon: TrendingUp, change: '+0.5%' },
    { label: 'Orders', value: '234', icon: ShoppingCart, change: '+15%' }
  ];

  const quickActions = [
    { label: 'Add Product', href: `/admin/${tenantSlug}/products/new`, icon: Package },
    { label: 'Create Post', href: `/admin/${tenantSlug}/posts/new`, icon: FileText },
    { label: 'View Analytics', href: `/admin/${tenantSlug}/analytics`, icon: BarChart3 },
    { label: 'Manage Users', href: `/admin/${tenantSlug}/users`, icon: Users }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-sm text-gray-600">
          Welcome back! Here's what's happening with {tenant.name}.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white overflow-hidden rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
          >
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <stat.icon className="h-6 w-6 text-gray-400" aria-hidden="true" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">{stat.label}</dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900">{stat.value}</div>
                      <div className="ml-2 flex items-baseline text-sm font-semibold text-green-600">
                        {stat.change}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {quickActions.map((action) => (
            <a
              key={action.label}
              href={action.href}
              className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
            >
              <div className="flex-shrink-0">
                <action.icon className="h-5 w-5 text-gray-400" aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="absolute inset-0" aria-hidden="true" />
                <p className="text-sm font-medium text-gray-900">{action.label}</p>
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Recent Activity</h3>
          <div className="mt-5">
            <div className="flow-root">
              <ul className="-mb-8">
                {[
                  { id: 1, content: 'New product "Smart Watch Pro" added', time: '2 hours ago' },
                  { id: 2, content: 'Blog post "Top 10 Fitness Trackers" published', time: '4 hours ago' },
                  { id: 3, content: 'Order #1234 processed successfully', time: '6 hours ago' },
                  { id: 4, content: 'Newsletter sent to 2,345 subscribers', time: '1 day ago' }
                ].map((event, eventIdx) => (
                  <li key={event.id}>
                    <div className="relative pb-8">
                      {eventIdx !== 3 ? (
                        <span
                          className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                          aria-hidden="true"
                        />
                      ) : null}
                      <div className="relative flex space-x-3">
                        <div>
                          <span className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center ring-8 ring-white">
                            <div className="h-2 w-2 bg-gray-400 rounded-full" />
                          </span>
                        </div>
                        <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                          <div>
                            <p className="text-sm text-gray-600">{event.content}</p>
                          </div>
                          <div className="whitespace-nowrap text-right text-sm text-gray-500">
                            <time>{event.time}</time>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
