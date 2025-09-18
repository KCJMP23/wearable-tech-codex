import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getTenantBySlug } from '@/lib/tenant';

interface BannersPageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function BannersPage({ params }: BannersPageProps) {
  const { tenantSlug } = await params;
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) notFound();

  // Mock promotional banners data - in real app this would come from database
  const banners = [
    {
      id: 1,
      title: "Winter Sale - Up to 40% Off",
      subtitle: "Premium wearables at unbeatable prices",
      ctaText: "Shop Now",
      ctaLink: "/categories/winter-sale",
      image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&h=400&fit=crop",
      type: "hero",
      active: true,
      position: 1,
      startDate: "2024-01-01T00:00:00Z",
      endDate: "2024-03-31T23:59:59Z",
      clicks: 1245,
      impressions: 15680,
      conversions: 89
    },
    {
      id: 2,
      title: "New Arrivals",
      subtitle: "Latest smartwatches from top brands",
      ctaText: "Explore",
      ctaLink: "/categories/new-arrivals",
      image: "https://images.unsplash.com/photo-1434494878577-86c23bcb06b9?w=600&h=300&fit=crop",
      type: "secondary",
      active: true,
      position: 2,
      startDate: "2024-01-15T00:00:00Z",
      endDate: "2024-12-31T23:59:59Z",
      clicks: 567,
      impressions: 8920,
      conversions: 34
    },
    {
      id: 3,
      title: "Free Shipping",
      subtitle: "On orders over $200",
      ctaText: "Learn More",
      ctaLink: "/shipping",
      image: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&h=300&fit=crop",
      type: "promotional",
      active: false,
      position: 3,
      startDate: "2024-01-01T00:00:00Z",
      endDate: "2024-12-31T23:59:59Z",
      clicks: 234,
      impressions: 4560,
      conversions: 12
    }
  ];

  const activeBanners = banners.filter(banner => banner.active);
  const totalClicks = banners.reduce((sum, banner) => sum + banner.clicks, 0);
  const totalImpressions = banners.reduce((sum, banner) => sum + banner.impressions, 0);
  const totalConversions = banners.reduce((sum, banner) => sum + banner.conversions, 0);
  const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions * 100).toFixed(2) : "0";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Promotional Banners</h1>
          <p className="mt-1 text-sm text-gray-500">
            Create and manage promotional banners that appear on your homepage. Drive traffic to special offers and featured categories.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <button
            type="button"
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
          >
            Banner Templates
          </button>
          <button
            type="button"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
          >
            Create Banner
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">{activeBanners.length}</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Active Banners</dt>
                  <dd className="text-lg font-medium text-gray-900">{activeBanners.length}</dd>
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
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Impressions</dt>
                  <dd className="text-lg font-medium text-gray-900">{totalImpressions.toLocaleString()}</dd>
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
                <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                  <span className="text-white font-semibold text-xs">{avgCTR}%</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Average CTR</dt>
                  <dd className="text-lg font-medium text-gray-900">{avgCTR}%</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Banner List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Promotional Banners
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Drag to reorder banners as they appear on the homepage. Use scheduling to automate banner campaigns.
          </p>
        </div>
        <ul role="list" className="divide-y divide-gray-200">
          {banners.map((banner) => (
            <li key={banner.id}>
              <div className="px-4 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {/* Drag handle */}
                    <div className="mr-4 cursor-move">
                      <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8h16M4 16h16" />
                      </svg>
                    </div>
                    
                    {/* Banner preview */}
                    <div className="flex-shrink-0 h-20 w-32">
                      <img className="h-20 w-32 rounded-lg object-cover" src={banner.image} alt={banner.title} />
                    </div>
                    
                    {/* Banner info */}
                    <div className="ml-4">
                      <div className="flex items-center">
                        <p className="text-sm font-medium text-gray-900">
                          {banner.title}
                        </p>
                        <div className="ml-2 flex items-center space-x-2">
                          {banner.active ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              Inactive
                            </span>
                          )}
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            banner.type === 'hero' ? 'bg-blue-100 text-blue-800' :
                            banner.type === 'secondary' ? 'bg-purple-100 text-purple-800' :
                            'bg-orange-100 text-orange-800'
                          }`}>
                            {banner.type}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-500">{banner.subtitle}</p>
                      <div className="mt-1 flex items-center space-x-4 text-xs text-gray-400">
                        <span>{banner.clicks} clicks</span>
                        <span>•</span>
                        <span>{banner.impressions} views</span>
                        <span>•</span>
                        <span>{banner.conversions} conversions</span>
                        <span>•</span>
                        <span>{banner.impressions > 0 ? (banner.clicks / banner.impressions * 100).toFixed(1) : 0}% CTR</span>
                      </div>
                      <div className="mt-1 text-xs text-gray-400">
                        {new Date(banner.startDate).toLocaleDateString()} - {new Date(banner.endDate).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    <button className="text-blue-600 hover:text-blue-900 text-sm font-medium">
                      Edit
                    </button>
                    <button className="text-green-600 hover:text-green-900 text-sm font-medium">
                      Duplicate
                    </button>
                    <button className="text-gray-600 hover:text-gray-900 text-sm font-medium">
                      Preview
                    </button>
                    <button className="text-red-600 hover:text-red-900 text-sm font-medium">
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* AI Optimization */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">AI Banner Optimization</h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>
                AI can help optimize your promotional banners for better performance:
              </p>
              <ul className="mt-2 list-disc list-inside">
                <li>Generate compelling headlines and copy variations</li>
                <li>A/B test different banner designs and messaging</li>
                <li>Optimize banner scheduling based on visitor behavior</li>
                <li>Suggest seasonal campaigns and promotional strategies</li>
              </ul>
            </div>
            <div className="mt-4 flex space-x-3">
              <button
                type="button"
                className="bg-yellow-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-yellow-700"
              >
                Generate Banner Ideas
              </button>
              <button
                type="button"
                className="bg-white text-yellow-600 border border-yellow-600 px-4 py-2 rounded-md text-sm font-medium hover:bg-yellow-50"
              >
                Performance Analytics
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Banner Templates */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Quick Start Templates</h3>
          <p className="text-sm text-gray-500">Pre-designed banner templates to get you started quickly</p>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 cursor-pointer">
              <div className="aspect-w-3 aspect-h-1 mb-3">
                <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded text-white p-3 text-center">
                  <div className="text-sm font-bold">Sale Template</div>
                  <div className="text-xs">Up to X% Off</div>
                </div>
              </div>
              <h4 className="text-sm font-medium text-gray-900">Sale/Discount Banner</h4>
              <p className="text-xs text-gray-500">Perfect for promotional campaigns</p>
            </div>
            
            <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 cursor-pointer">
              <div className="aspect-w-3 aspect-h-1 mb-3">
                <div className="bg-gradient-to-r from-green-500 to-teal-600 rounded text-white p-3 text-center">
                  <div className="text-sm font-bold">New Arrivals</div>
                  <div className="text-xs">Latest Products</div>
                </div>
              </div>
              <h4 className="text-sm font-medium text-gray-900">New Arrivals Banner</h4>
              <p className="text-xs text-gray-500">Showcase latest products</p>
            </div>
            
            <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 cursor-pointer">
              <div className="aspect-w-3 aspect-h-1 mb-3">
                <div className="bg-gradient-to-r from-orange-500 to-red-600 rounded text-white p-3 text-center">
                  <div className="text-sm font-bold">Free Shipping</div>
                  <div className="text-xs">On Orders $X+</div>
                </div>
              </div>
              <h4 className="text-sm font-medium text-gray-900">Shipping Promo</h4>
              <p className="text-xs text-gray-500">Highlight shipping offers</p>
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