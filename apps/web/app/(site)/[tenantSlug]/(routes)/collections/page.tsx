import { notFound } from 'next/navigation';
import { getTenantBySlug } from '@/lib/tenant';
import Link from 'next/link';
import { ArrowRight, TrendingUp, Clock, DollarSign, Star } from 'lucide-react';

interface CollectionsPageProps {
  params: Promise<{
    tenantSlug: string;
  }>;
}

const collections = [
  {
    slug: 'best-sellers',
    title: 'Best Sellers',
    description: 'Our most popular wearable tech products',
    icon: TrendingUp,
    color: 'from-orange-500 to-red-500',
    image: 'https://images.unsplash.com/photo-1544117519-31a4b719223d?w=800&h=400&fit=crop'
  },
  {
    slug: 'new-arrivals',
    title: 'New Arrivals',
    description: 'Latest additions to our collection',
    icon: Clock,
    color: 'from-blue-500 to-purple-500',
    image: 'https://images.unsplash.com/photo-1576243345690-4e4b79b63288?w=800&h=400&fit=crop'
  },
  {
    slug: 'under-100',
    title: 'Under $100',
    description: 'Affordable wearable technology',
    icon: DollarSign,
    color: 'from-green-500 to-teal-500',
    image: 'https://images.unsplash.com/photo-1608481337062-4093bf3ed404?w=800&h=400&fit=crop'
  },
  {
    slug: 'premium',
    title: 'Premium Tech',
    description: 'High-end wearables for the discerning user',
    icon: Star,
    color: 'from-purple-500 to-pink-500',
    image: 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=800&h=400&fit=crop'
  }
];

export default async function CollectionsPage({ params }: CollectionsPageProps) {
  const { tenantSlug } = await params;
  const tenant = await getTenantBySlug(tenantSlug);
  
  if (!tenant) notFound();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold mb-4">Collections</h1>
          <p className="text-xl opacity-90">
            Curated selections of the best wearable technology
          </p>
        </div>
      </div>

      {/* Collections Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {collections.map((collection) => {
            const Icon = collection.icon;
            return (
              <Link
                key={collection.slug}
                href={`/${tenantSlug}/collections/${collection.slug}`}
                className="group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <div 
                  className="absolute inset-0 bg-cover bg-center opacity-20 group-hover:opacity-30 transition-opacity"
                  style={{ backgroundImage: `url(${collection.image})` }}
                />
                <div className={`relative bg-gradient-to-br ${collection.color} p-8 text-white`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-4">
                        <Icon className="w-8 h-8 mr-3" />
                        <h2 className="text-2xl font-bold">{collection.title}</h2>
                      </div>
                      <p className="text-lg opacity-90 mb-4">
                        {collection.description}
                      </p>
                      <div className="flex items-center text-white font-medium">
                        <span>Browse Collection</span>
                        <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Featured Categories */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Shop by Category</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {['Smartwatches', 'Fitness Trackers', 'Smart Rings', 'Health Monitors', 'GPS Watches', 'Accessories'].map((category) => (
              <Link
                key={category}
                href={`/${tenantSlug}/products?category=${category.toLowerCase().replace(' ', '-')}`}
                className="bg-white p-4 rounded-lg text-center hover:shadow-lg transition-shadow"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-900">{category}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}