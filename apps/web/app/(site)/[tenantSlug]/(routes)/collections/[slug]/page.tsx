import { notFound } from 'next/navigation';
import { getTenantBySlug } from '@/lib/tenant';
import { ProductCard } from '@/components/ProductCard';
import { ProductGridSkeleton } from '@/components/LoadingStates';
import { Suspense } from 'react';

interface CollectionPageProps {
  params: Promise<{
    tenantSlug: string;
    slug: string;
  }>;
}

const collections = {
  'best-sellers': {
    title: 'Best Sellers',
    description: 'Our most popular wearable tech products',
    filter: { featured: true }
  },
  'new-arrivals': {
    title: 'New Arrivals',
    description: 'Latest additions to our collection',
    filter: { isNew: true }
  },
  'under-100': {
    title: 'Under $100',
    description: 'Affordable wearable technology',
    filter: { maxPrice: 100 }
  },
  'premium': {
    title: 'Premium Tech',
    description: 'High-end wearables for the discerning user',
    filter: { minPrice: 500 }
  }
};

async function getCollectionProducts(tenantId: string, collectionSlug: string) {
  // Mock data - replace with actual database query
  const mockProducts = [
    {
      id: '1',
      name: 'Apple Watch Series 9',
      description: 'Advanced health tracking and fitness features',
      price: 399,
      image: 'https://images.unsplash.com/photo-1544117519-31a4b719223d?w=500',
      category: 'Smartwatches',
      rating: 4.5,
      reviewCount: 234,
      prime: true
    },
    {
      id: '2',
      name: 'Fitbit Charge 6',
      description: 'All-day activity tracking with built-in GPS',
      price: 159.95,
      image: 'https://images.unsplash.com/photo-1576243345690-4e4b79b63288?w=500',
      category: 'Fitness Trackers',
      rating: 4.3,
      reviewCount: 189,
      prime: true
    },
    {
      id: '3',
      name: 'Oura Ring Gen3',
      description: 'Smart ring for sleep and recovery tracking',
      price: 299,
      image: 'https://images.unsplash.com/photo-1608481337062-4093bf3ed404?w=500',
      category: 'Smart Rings',
      rating: 4.2,
      reviewCount: 156,
      prime: false
    },
    {
      id: '4',
      name: 'Garmin Forerunner 965',
      description: 'Premium GPS running watch with AMOLED display',
      price: 599.99,
      image: 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=500',
      category: 'Sports Watches',
      rating: 4.7,
      reviewCount: 412,
      prime: true
    }
  ];
  
  // Apply filters based on collection
  const collection = collections[collectionSlug as keyof typeof collections];
  if (!collection) return [];
  
  let filtered = [...mockProducts];
  
  if ('maxPrice' in collection.filter) {
    filtered = filtered.filter(p => p.price <= collection.filter.maxPrice!);
  }
  if ('minPrice' in collection.filter) {
    filtered = filtered.filter(p => p.price >= collection.filter.minPrice!);
  }
  
  return filtered;
}

export default async function CollectionPage({ params }: CollectionPageProps) {
  const { tenantSlug, slug } = await params;
  const tenant = await getTenantBySlug(tenantSlug);
  
  if (!tenant) notFound();
  
  const collection = collections[slug as keyof typeof collections];
  if (!collection) notFound();
  
  const products = await getCollectionProducts(tenant.id, slug);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold mb-4">{collection.title}</h1>
          <p className="text-xl opacity-90">{collection.description}</p>
        </div>
      </div>

      {/* Products Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex justify-between items-center mb-8">
          <p className="text-gray-600">
            Showing {products.length} products
          </p>
          <select className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
            <option value="featured">Featured</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
            <option value="rating">Highest Rated</option>
            <option value="newest">Newest First</option>
          </select>
        </div>

        <Suspense fallback={<ProductGridSkeleton />}>
          {products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  tenantSlug={tenantSlug}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-600 text-lg">No products found in this collection</p>
            </div>
          )}
        </Suspense>
      </div>
    </div>
  );
}