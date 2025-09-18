import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getTenantBySlug } from '@/lib/tenant';

interface CarouselPageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function CarouselPage({ params }: CarouselPageProps) {
  const { tenantSlug } = await params;
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) notFound();

  // Mock carousel products data - in real app this would come from database
  const carouselProducts = [
    {
      id: 1,
      name: "Apple Watch Series 9",
      price: 399,
      image: "https://images.unsplash.com/photo-1434494878577-86c23bcb06b9?w=400&h=400&fit=crop",
      featured: true,
      position: 1,
      clicks: 245,
      conversions: 8,
      addedAt: "2024-01-15T10:00:00Z"
    },
    {
      id: 2,
      name: "Garmin Forerunner 955",
      price: 499,
      image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop",
      featured: true,
      position: 2,
      clicks: 189,
      conversions: 12,
      addedAt: "2024-01-12T14:30:00Z"
    },
    {
      id: 3,
      name: "Samsung Galaxy Watch 6",
      price: 329,
      image: "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=400&h=400&fit=crop",
      featured: true,
      position: 3,
      clicks: 156,
      conversions: 5,
      addedAt: "2024-01-10T09:15:00Z"
    },
    {
      id: 4,
      name: "Fitbit Sense 2",
      price: 249,
      image: "https://images.unsplash.com/photo-1579952363873-27d3bfad9c0d?w=400&h=400&fit=crop",
      featured: true,
      position: 4,
      clicks: 134,
      conversions: 7,
      addedAt: "2024-01-08T16:45:00Z"
    },
    {
      id: 5,
      name: "Amazfit GTR 4",
      price: 199,
      image: "https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=400&h=400&fit=crop",
      featured: true,
      position: 5,
      clicks: 98,
      conversions: 3,
      addedAt: "2024-01-05T11:20:00Z"
    }
  ];

  const totalClicks = carouselProducts.reduce((sum, product) => sum + product.clicks, 0);
  const totalConversions = carouselProducts.reduce((sum, product) => sum + product.conversions, 0);
  const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks * 100).toFixed(1) : "0";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Product Carousel</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage the featured products carousel on your homepage. Showcase your best-performing and most popular items.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <button
            type="button"
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
          >
            Auto-Select Products
          </button>
          <button
            type="button"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
          >
            Add Product
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">{carouselProducts.length}</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Featured Products</dt>
                  <dd className="text-lg font-medium text-gray-900">{carouselProducts.length}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                  <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Clicks</dt>
                  <dd className="text-lg font-medium text-gray-900">{totalClicks.toLocaleString()}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                  <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Conversions</dt>
                  <dd className="text-lg font-medium text-gray-900">{totalConversions}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                  <span className="text-white font-semibold text-xs">{conversionRate}%</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Conversion Rate</dt>
                  <dd className="text-lg font-medium text-gray-900">{conversionRate}%</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Carousel Settings */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Carousel Settings</h3>
          <p className="text-sm text-gray-500">Configure how your product carousel behaves</p>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div>
              <label htmlFor="autoplay" className="block text-sm font-medium text-gray-700">
                Auto-play
              </label>
              <select
                id="autoplay"
                name="autoplay"
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
              >
                <option value="true">Enabled</option>
                <option value="false">Disabled</option>
              </select>
            </div>
            <div>
              <label htmlFor="autoplay-speed" className="block text-sm font-medium text-gray-700">
                Auto-play Speed (seconds)
              </label>
              <input
                type="number"
                id="autoplay-speed"
                name="autoplay-speed"
                defaultValue={5}
                min={2}
                max={10}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="show-indicators" className="block text-sm font-medium text-gray-700">
                Show Indicators
              </label>
              <select
                id="show-indicators"
                name="show-indicators"
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
              >
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Products List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Featured Products
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Drag to reorder products as they appear in the carousel. Click on metrics to view detailed analytics.
          </p>
        </div>
        <ul role="list" className="divide-y divide-gray-200">
          {carouselProducts.map((product) => (
            <li key={product.id}>
              <div className="px-4 py-4 flex items-center justify-between">
                <div className="flex items-center">
                  {/* Drag handle */}
                  <div className="mr-4 cursor-move">
                    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8h16M4 16h16" />
                    </svg>
                  </div>
                  
                  {/* Position badge */}
                  <div className="mr-4">
                    <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-purple-100 text-purple-800 text-sm font-medium">
                      {product.position}
                    </span>
                  </div>
                  
                  {/* Product image */}
                  <div className="flex-shrink-0 h-16 w-16">
                    <img className="h-16 w-16 rounded-lg object-cover" src={product.image} alt={product.name} />
                  </div>
                  
                  {/* Product info */}
                  <div className="ml-4">
                    <div className="flex items-center">
                      <p className="text-sm font-medium text-gray-900">
                        {product.name}
                      </p>
                      <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        ${product.price}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                      <span>{product.clicks} clicks</span>
                      <span>•</span>
                      <span>{product.conversions} conversions</span>
                      <span>•</span>
                      <span>{product.clicks > 0 ? (product.conversions / product.clicks * 100).toFixed(1) : 0}% CTR</span>
                    </div>
                    <p className="text-xs text-gray-400">
                      Added {new Date(product.addedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex items-center space-x-2">
                  <button className="text-blue-600 hover:text-blue-900 text-sm font-medium">
                    Analytics
                  </button>
                  <button className="text-gray-600 hover:text-gray-900 text-sm font-medium">
                    Edit
                  </button>
                  <button className="text-red-600 hover:text-red-900 text-sm font-medium">
                    Remove
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* AI Optimization */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-purple-800">AI Carousel Optimization</h3>
            <div className="mt-2 text-sm text-purple-700">
              <p>
                AI can automatically optimize your product carousel for maximum engagement:
              </p>
              <ul className="mt-2 list-disc list-inside">
                <li>Select best-performing products based on sales and engagement data</li>
                <li>Optimize product order for maximum click-through rates</li>
                <li>A/B test different carousel configurations</li>
                <li>Suggest seasonal product rotations and trending items</li>
              </ul>
            </div>
            <div className="mt-4 flex space-x-3">
              <button
                type="button"
                className="bg-purple-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-purple-700"
              >
                Run AI Optimization
              </button>
              <button
                type="button"
                className="bg-white text-purple-600 border border-purple-600 px-4 py-2 rounded-md text-sm font-medium hover:bg-purple-50"
              >
                View Performance Report
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Analytics */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Carousel Performance</h3>
          <p className="text-sm text-gray-500">Analytics for the last 30 days</p>
        </div>
        
        <div className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900">Click-through rate trend</span>
              <span className="text-sm text-green-600">↗ +12% vs last month</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900">Average time on carousel</span>
              <span className="text-sm text-gray-600">2:34 minutes</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900">Most popular position</span>
              <span className="text-sm text-gray-600">Position #2 (32% of clicks)</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900">Best performing product</span>
              <span className="text-sm text-gray-600">Garmin Forerunner 955</span>
            </div>
          </div>
        </div>
      </div>

      {/* Breadcrumb back to homepage */}
      <div className="mt-6">
        <Link
          href={`/admin/${tenantSlug}/homepage`}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Back to Homepage Management
        </Link>
      </div>
    </div>
  );
}