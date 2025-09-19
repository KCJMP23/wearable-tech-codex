import { notFound } from 'next/navigation';
import { getTenantBySlug } from '@/lib/tenant';
import { ProductCard } from '@/components/ProductCard';
import { SearchInterface } from '@/components/SearchInterface';
import { Suspense } from 'react';

interface SearchPageProps {
  params: Promise<{
    tenantSlug: string;
  }>;
  searchParams: Promise<{
    q?: string;
    category?: string;
    price_min?: string;
    price_max?: string;
  }>;
}

// Mock search function - replace with actual search implementation
async function searchProducts(query: string, filters: any) {
  const mockResults = [
    {
      id: '1',
      title: 'Apple Watch Series 9',
      description: 'Advanced health tracking and fitness features',
      priceSnapshot: 399,
      originalPrice: 429,
      images: ['https://images.unsplash.com/photo-1544117519-31a4b719223d?w=500'],
      category: 'Smartwatches',
      rating: 4.5,
      reviewCount: 234,
      affiliateUrl: 'https://amazon.com/dp/B0CHX7R6WJ?tag=jmpkc01-20',
      features: ['Heart Rate Monitor', 'ECG', 'Blood Oxygen', 'GPS']
    },
    {
      id: '2',
      title: 'Fitbit Charge 6',
      description: 'All-day activity tracking with built-in GPS',
      priceSnapshot: 159.95,
      originalPrice: 179.95,
      images: ['https://images.unsplash.com/photo-1576243345690-4e4b79b63288?w=500'],
      category: 'Fitness Trackers',
      rating: 4.3,
      reviewCount: 189,
      affiliateUrl: 'https://amazon.com/dp/B0CC6L6SJ6?tag=jmpkc01-20',
      features: ['Built-in GPS', '7-day battery', 'Water resistant']
    },
    {
      id: '3',
      title: 'Garmin Forerunner 965',
      description: 'Premium GPS running watch with AMOLED display',
      priceSnapshot: 599.99,
      originalPrice: 649.99,
      images: ['https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=500'],
      category: 'Sports Watches',
      rating: 4.7,
      reviewCount: 412,
      affiliateUrl: 'https://amazon.com/dp/B0BYW26SGS?tag=jmpkc01-20',
      features: ['AMOLED Display', 'Multi-band GPS', '23-day battery']
    }
  ];

  // Simple filtering logic
  let results = mockResults;
  
  if (query) {
    results = results.filter(product => 
      product.title.toLowerCase().includes(query.toLowerCase()) ||
      product.description.toLowerCase().includes(query.toLowerCase()) ||
      product.category.toLowerCase().includes(query.toLowerCase())
    );
  }

  if (filters.category) {
    results = results.filter(product => 
      product.category.toLowerCase().includes(filters.category.toLowerCase())
    );
  }

  if (filters.price_min) {
    results = results.filter(product => product.priceSnapshot >= parseFloat(filters.price_min));
  }

  if (filters.price_max) {
    results = results.filter(product => product.priceSnapshot <= parseFloat(filters.price_max));
  }

  return results;
}

export default async function SearchPage({ params, searchParams }: SearchPageProps) {
  const { tenantSlug } = await params;
  const filters = await searchParams;
  const tenant = await getTenantBySlug(tenantSlug);
  
  if (!tenant) notFound();

  const query = filters.q || '';
  const results = await searchProducts(query, filters);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Search Results</h1>
          {query && (
            <p className="text-gray-600">
              Showing {results.length} results for "{query}"
            </p>
          )}
        </div>

        {/* Search Interface */}
        <div className="mb-8">
          <SearchInterface 
            initialQuery={query}
            initialFilters={filters}
            tenantSlug={tenantSlug}
          />
        </div>

        {/* Results */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Filters</h3>
              
              {/* Category Filter */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Category</h4>
                <div className="space-y-2">
                  {['Smartwatches', 'Fitness Trackers', 'Sports Watches', 'Smart Rings'].map((category) => (
                    <label key={category} className="flex items-center">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        defaultChecked={filters.category === category.toLowerCase().replace(' ', '-')}
                      />
                      <span className="ml-2 text-sm text-gray-600">{category}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Price Range */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Price Range</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Min Price</label>
                    <input
                      type="number"
                      placeholder="$0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      defaultValue={filters.price_min}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Max Price</label>
                    <input
                      type="number"
                      placeholder="$1000"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      defaultValue={filters.price_max}
                    />
                  </div>
                </div>
              </div>

              {/* Clear Filters */}
              <button className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-200 transition-colors">
                Clear All Filters
              </button>
            </div>
          </div>

          {/* Results Grid */}
          <div className="lg:col-span-3">
            <div className="flex justify-between items-center mb-6">
              <p className="text-gray-600">
                {results.length} product{results.length !== 1 ? 's' : ''} found
              </p>
              <select className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                <option value="relevance">Sort by Relevance</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="rating">Highest Rated</option>
                <option value="newest">Newest First</option>
              </select>
            </div>

            {results.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {results.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    tenantSlug={tenantSlug}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-24 h-24 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
                <p className="text-gray-600 mb-4">
                  {query 
                    ? `No products found for "${query}". Try adjusting your search terms or filters.`
                    : 'Try entering a search term to find products.'
                  }
                </p>
                <div className="space-y-2">
                  <p className="text-sm text-gray-500">Suggestions:</p>
                  <ul className="text-sm text-gray-500 space-y-1">
                    <li>• Check your spelling</li>
                    <li>• Try more general keywords</li>
                    <li>• Remove some filters</li>
                    <li>• Browse our collections instead</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Popular Searches */}
        {!query && (
          <div className="mt-16">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Popular Searches</h2>
            <div className="flex flex-wrap gap-3">
              {['Apple Watch', 'Fitness Tracker', 'Heart Rate Monitor', 'GPS Watch', 'Smart Ring', 'Running Watch'].map((term) => (
                <a
                  key={term}
                  href={`/${tenantSlug}/search?q=${encodeURIComponent(term)}`}
                  className="bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium hover:bg-blue-200 transition-colors"
                >
                  {term}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}