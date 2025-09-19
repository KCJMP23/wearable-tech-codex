'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, 
  TrendingUp, 
  DollarSign, 
  Users, 
  Eye, 
  Edit, 
  BarChart3,
  Trash2,
  Settings,
  Store,
  Package,
  ShoppingBag,
  Activity
} from 'lucide-react';

interface Site {
  id: string;
  name: string;
  niche: string;
  domain: string;
  status: 'active' | 'paused' | 'draft';
  revenue: string;
  visitors: number;
  products: number;
  lastUpdated: string;
}

export default function PlatformDashboard() {
  const router = useRouter();
  
  // Mock data for demo
  const [sites] = useState<Site[]>([
    {
      id: '1',
      name: 'Golf Pro Shop',
      niche: 'Golf Equipment',
      domain: 'golfproshop.affiliateos.com',
      status: 'active',
      revenue: '$4,235',
      visitors: 12453,
      products: 234,
      lastUpdated: '2 hours ago'
    },
    {
      id: '2',
      name: 'Pet Paradise',
      niche: 'Pet Supplies',
      domain: 'petparadise.affiliateos.com',
      status: 'active',
      revenue: '$2,891',
      visitors: 8932,
      products: 189,
      lastUpdated: '5 hours ago'
    },
    {
      id: '3',
      name: 'Kitchen Masters',
      niche: 'Kitchen Gadgets',
      domain: 'kitchenmasters.affiliateos.com',
      status: 'paused',
      revenue: '$1,567',
      visitors: 4521,
      products: 145,
      lastUpdated: '1 day ago'
    }
  ]);

  const totalRevenue = '$8,693';
  const totalVisitors = '25,906';
  const totalProducts = '568';
  const conversionRate = '3.4%';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-sm text-gray-500">Manage all your affiliate sites in one place</p>
            </div>
            <button
              onClick={() => router.push('/onboarding')}
              className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create New Site
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold">{totalRevenue}</p>
                <p className="text-sm text-green-600">↑ 12% from last month</p>
              </div>
              <DollarSign className="w-10 h-10 text-green-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Visitors</p>
                <p className="text-2xl font-bold">{totalVisitors}</p>
                <p className="text-sm text-green-600">↑ 8% from last week</p>
              </div>
              <Users className="w-10 h-10 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Products</p>
                <p className="text-2xl font-bold">{totalProducts}</p>
                <p className="text-sm text-gray-500">Across all sites</p>
              </div>
              <Package className="w-10 h-10 text-purple-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Conversion Rate</p>
                <p className="text-2xl font-bold">{conversionRate}</p>
                <p className="text-sm text-green-600">↑ 0.5% from last month</p>
              </div>
              <TrendingUp className="w-10 h-10 text-orange-500" />
            </div>
          </div>
        </div>

        {/* Sites Grid */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Your Sites</h2>
            <select className="px-3 py-2 border rounded-lg text-sm">
              <option>All Sites</option>
              <option>Active</option>
              <option>Paused</option>
              <option>Draft</option>
            </select>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sites.map(site => (
              <div key={site.id} className="bg-white rounded-lg shadow hover:shadow-lg transition">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-semibold text-lg">{site.name}</h3>
                      <p className="text-sm text-gray-500">{site.niche}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      site.status === 'active' 
                        ? 'bg-green-100 text-green-700'
                        : site.status === 'paused'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {site.status}
                    </span>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Revenue</span>
                      <span className="font-medium">{site.revenue}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Visitors</span>
                      <span className="font-medium">{site.visitors.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Products</span>
                      <span className="font-medium">{site.products}</span>
                    </div>
                  </div>
                  
                  <div className="text-xs text-gray-500 mb-4">
                    Last updated {site.lastUpdated}
                  </div>
                  
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => window.open(`https://${site.domain}`, '_blank')}
                      className="flex-1 flex items-center justify-center px-3 py-2 border rounded-lg hover:bg-gray-50 transition"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </button>
                    <button 
                      onClick={() => router.push(`/admin/${site.id}`)}
                      className="flex-1 flex items-center justify-center px-3 py-2 border rounded-lg hover:bg-gray-50 transition"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </button>
                    <button 
                      onClick={() => router.push(`/admin/${site.id}/analytics`)}
                      className="flex-1 flex items-center justify-center px-3 py-2 border rounded-lg hover:bg-gray-50 transition"
                    >
                      <BarChart3 className="w-4 h-4 mr-1" />
                      Stats
                    </button>
                  </div>
                </div>
              </div>
            ))}
            
            {/* Add New Site Card */}
            <div 
              onClick={() => router.push('/onboarding')}
              className="bg-white rounded-lg shadow border-2 border-dashed border-gray-300 hover:border-purple-400 transition cursor-pointer"
            >
              <div className="p-6 flex flex-col items-center justify-center h-full min-h-[280px]">
                <Plus className="w-12 h-12 text-gray-400 mb-3" />
                <h3 className="font-semibold text-gray-700">Create New Site</h3>
                <p className="text-sm text-gray-500 text-center mt-2">
                  Launch a new affiliate site in minutes
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section - Performance Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Products */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold mb-4 flex items-center">
              <ShoppingBag className="w-5 h-5 mr-2 text-purple-600" />
              Top Performing Products
            </h3>
            <div className="space-y-3">
              {[
                { name: 'TaylorMade SIM2 Driver', clicks: 234, revenue: '$892' },
                { name: 'Automatic Pet Feeder Pro', clicks: 189, revenue: '$567' },
                { name: 'Smart Air Fryer XL', clicks: 156, revenue: '$432' },
                { name: 'Callaway Chrome Soft Golf Balls', clicks: 134, revenue: '$389' },
              ].map((product, idx) => (
                <div key={idx} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">{product.name}</p>
                    <p className="text-xs text-gray-500">{product.clicks} clicks</p>
                  </div>
                  <span className="font-medium text-green-600">{product.revenue}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Network Intelligence */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold mb-4 flex items-center">
              <Activity className="w-5 h-5 mr-2 text-blue-600" />
              Network Intelligence
            </h3>
            <div className="space-y-3">
              {[
                { network: 'Amazon Associates', performance: 'excellent', revenue: '$4,123' },
                { network: 'ShareASale', performance: 'good', revenue: '$2,345' },
                { network: 'CJ Affiliate', performance: 'good', revenue: '$1,567' },
                { network: 'Impact Radius', performance: 'average', revenue: '$658' },
              ].map((network, idx) => (
                <div key={idx} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center">
                    <div className={`w-2 h-2 rounded-full mr-2 ${
                      network.performance === 'excellent' ? 'bg-green-500' :
                      network.performance === 'good' ? 'bg-blue-500' : 'bg-yellow-500'
                    }`} />
                    <div>
                      <p className="text-sm font-medium">{network.network}</p>
                      <p className="text-xs text-gray-500 capitalize">{network.performance} performance</p>
                    </div>
                  </div>
                  <span className="font-medium">{network.revenue}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}