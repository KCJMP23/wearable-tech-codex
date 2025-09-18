import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getTenantBySlug } from '@/lib/tenant';

interface CollectionsPageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function CollectionsPage({ params }: CollectionsPageProps) {
  const { tenantSlug } = await params;
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) notFound();

  // Mock featured collections data - in real app this would come from database
  const featuredCollections = [
    {
      id: 1,
      name: "Winter Tech",
      description: "Essential wearables for cold weather activities",
      productCount: 12,
      image: "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=400&h=300&fit=crop",
      active: true,
      order: 1,
      createdAt: "2024-01-15T10:00:00Z"
    },
    {
      id: 2,
      name: "Fitness Trackers",
      description: "Advanced fitness monitoring devices",
      productCount: 8,
      image: "https://images.unsplash.com/photo-1434494878577-86c23bcb06b9?w=400&h=300&fit=crop",
      active: true,
      order: 2,
      createdAt: "2024-01-10T14:30:00Z"
    },
    {
      id: 3,
      name: "Smart Watches",
      description: "Premium smartwatches with advanced features",
      productCount: 15,
      image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=300&fit=crop",
      active: false,
      order: 3,
      createdAt: "2024-01-08T09:15:00Z"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Featured Collections</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage collections displayed on your homepage. Collections are groups of related products that help customers discover items.
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            type="button"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Add Collection
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">3</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Collections</dt>
                  <dd className="text-lg font-medium text-gray-900">3</dd>
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
                  <span className="text-white font-semibold text-sm">2</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Active Collections</dt>
                  <dd className="text-lg font-medium text-gray-900">2</dd>
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
                  <span className="text-white font-semibold text-sm">35</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Products</dt>
                  <dd className="text-lg font-medium text-gray-900">35</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Collections Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Collections
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Drag to reorder collections as they appear on the homepage.
          </p>
        </div>
        <ul role="list" className="divide-y divide-gray-200">
          {featuredCollections.map((collection) => (
            <li key={collection.id}>
              <div className="px-4 py-4 flex items-center justify-between">
                <div className="flex items-center">
                  {/* Drag handle */}
                  <div className="mr-4 cursor-move">
                    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8h16M4 16h16" />
                    </svg>
                  </div>
                  
                  {/* Collection image */}
                  <div className="flex-shrink-0 h-16 w-16">
                    <img className="h-16 w-16 rounded-lg object-cover" src={collection.image} alt={collection.name} />
                  </div>
                  
                  {/* Collection info */}
                  <div className="ml-4">
                    <div className="flex items-center">
                      <p className="text-sm font-medium text-gray-900">
                        {collection.name}
                      </p>
                      {collection.active ? (
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Active
                        </span>
                      ) : (
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          Inactive
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{collection.description}</p>
                    <p className="text-xs text-gray-400">
                      {collection.productCount} products • Created {new Date(collection.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex items-center space-x-2">
                  <button className="text-blue-600 hover:text-blue-900 text-sm font-medium">
                    Edit
                  </button>
                  <button className="text-gray-600 hover:text-gray-900 text-sm font-medium">
                    View
                  </button>
                  <button className="text-red-600 hover:text-red-900 text-sm font-medium">
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* AI Integration Panel */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">AI Collection Optimization</h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>
                AI agents can automatically create and optimize collections based on:
              </p>
              <ul className="mt-2 list-disc list-inside">
                <li>Product performance and sales data</li>
                <li>Seasonal trends and customer behavior</li>
                <li>Similar products and cross-selling opportunities</li>
                <li>Inventory levels and promotional campaigns</li>
              </ul>
            </div>
            <div className="mt-4">
              <button
                type="button"
                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
              >
                Run AI Collection Optimizer
              </button>
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