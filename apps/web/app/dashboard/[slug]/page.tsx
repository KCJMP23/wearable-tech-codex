import { notFound } from 'next/navigation';
import { Sparkles, TrendingUp, Users, ShoppingBag, Settings, Eye, Edit, BarChart3, DollarSign } from 'lucide-react';

interface DashboardPageProps {
  params: {
    slug: string;
  };
}

export default function UserDashboard({ params }: DashboardPageProps) {
  const { slug } = params;
  
  // In a real implementation, this would fetch user data based on slug
  // For now, we'll show a mock dashboard
  
  const mockData = {
    storeName: slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    stats: {
      revenue: '$2,847',
      visitors: '1,234',
      orders: 23,
      conversion: '2.4%'
    },
    recentProducts: [
      { name: 'Wireless Earbuds Pro', status: 'Published', sales: 12 },
      { name: 'Smart Fitness Tracker', status: 'Draft', sales: 0 },
      { name: 'Portable Charger', status: 'Published', sales: 8 }
    ]
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Sparkles className="w-8 h-8 text-purple-600 mr-3" />
              <h1 className="text-xl font-semibold text-gray-900">{mockData.storeName}</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button className="flex items-center px-3 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                <Eye className="w-4 h-4 mr-1" />
                View Store
              </button>
              <button className="p-2 text-gray-400 hover:text-gray-500">
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">🎉 Welcome to Your Store Dashboard!</h2>
              <p className="text-purple-100">
                Your AI-powered affiliate store is live and ready to generate revenue. Let's get you started!
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-purple-200">Store Status</div>
              <div className="text-lg font-semibold text-green-300">✅ Active</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Revenue</p>
                <p className="text-2xl font-semibold text-gray-900">{mockData.stats.revenue}</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Visitors</p>
                <p className="text-2xl font-semibold text-gray-900">{mockData.stats.visitors}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Orders</p>
                <p className="text-2xl font-semibold text-gray-900">{mockData.stats.orders}</p>
              </div>
              <ShoppingBag className="w-8 h-8 text-purple-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Conversion</p>
                <p className="text-2xl font-semibold text-gray-900">{mockData.stats.conversion}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-orange-500" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Setup Checklist */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Setup Checklist</h3>
              <p className="text-sm text-gray-600">Complete these steps to optimize your store</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center mr-3">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-gray-900">Store created and configured</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center mr-3">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-gray-900">AI agents configured</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center mr-3">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  </div>
                  <span className="text-gray-900">Initial products generated</span>
                </div>
                <span className="text-sm text-yellow-600">In Progress</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-5 h-5 bg-gray-300 rounded-full mr-3"></div>
                  <span className="text-gray-600">Connect custom domain</span>
                </div>
                <button className="text-sm text-purple-600 hover:text-purple-700">Setup</button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-5 h-5 bg-gray-300 rounded-full mr-3"></div>
                  <span className="text-gray-600">Configure payment methods</span>
                </div>
                <button className="text-sm text-purple-600 hover:text-purple-700">Setup</button>
              </div>
            </div>
          </div>

          {/* Recent Products */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Recent Products</h3>
                <button className="text-sm text-purple-600 hover:text-purple-700">View All</button>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {mockData.recentProducts.map((product, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gray-200 rounded-lg mr-3"></div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{product.name}</p>
                        <p className="text-xs text-gray-500">{product.status}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">{product.sales} sales</p>
                      <button className="text-xs text-purple-600 hover:text-purple-700">
                        <Edit className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button className="p-4 text-center border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors">
              <ShoppingBag className="w-6 h-6 text-purple-600 mx-auto mb-2" />
              <span className="text-sm font-medium text-gray-900">Add Products</span>
            </button>

            <button className="p-4 text-center border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors">
              <Edit className="w-6 h-6 text-purple-600 mx-auto mb-2" />
              <span className="text-sm font-medium text-gray-900">Edit Content</span>
            </button>

            <button className="p-4 text-center border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors">
              <BarChart3 className="w-6 h-6 text-purple-600 mx-auto mb-2" />
              <span className="text-sm font-medium text-gray-900">View Analytics</span>
            </button>

            <button className="p-4 text-center border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors">
              <Settings className="w-6 h-6 text-purple-600 mx-auto mb-2" />
              <span className="text-sm font-medium text-gray-900">Store Settings</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}