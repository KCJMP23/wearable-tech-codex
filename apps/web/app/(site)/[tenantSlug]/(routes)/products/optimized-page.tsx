/**
 * Example of optimized products page using performance enhancements
 * This demonstrates the usage of React Query hooks, lazy loading, and optimized images
 */

'use client';

import { Suspense, useEffect } from 'react';
import { useProducts, usePrefetchProducts, useTaxonomy } from '@/hooks/useOptimizedQueries';
import { OptimizedImage } from '@/components/OptimizedImage';
import { LazyProductComparison, LazyRelatedProducts, SuspenseBoundary } from '@/components/LazyComponents';
import Link from 'next/link';

interface OptimizedProductsPageProps {
  tenantId: string;
  tenantSlug: string;
}

// Product card with optimized image loading
function ProductCard({ product, tenantSlug }: any) {
  return (
    <Link 
      href={`/${tenantSlug}/products/${product.id}`}
      className="group block"
      prefetch={false} // Disable automatic prefetch, use hover prefetch instead
      onMouseEnter={() => {
        // Prefetch on hover for faster navigation
        import('next/router').then(({ default: router }) => {
          router.prefetch(`/${tenantSlug}/products/${product.id}`);
        });
      }}
    >
      <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
        <div className="aspect-square relative overflow-hidden rounded-t-lg">
          <OptimizedImage
            src={product.images?.[0]?.url || '/images/placeholder.webp'}
            alt={product.title}
            fill
            variant="card"
            className="group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        </div>
        
        <div className="p-4">
          <h3 className="text-sm font-medium text-gray-900 line-clamp-2">
            {product.title}
          </h3>
          
          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center space-x-1">
              <span className="text-yellow-400">★</span>
              <span className="text-sm text-gray-600">
                {product.rating} ({product.reviewCount})
              </span>
            </div>
            
            {product.priceSnapshot && (
              <p className="text-lg font-semibold text-gray-900">
                ${product.priceSnapshot}
              </p>
            )}
          </div>
          
          <p className="mt-2 text-xs text-gray-500 line-clamp-2">
            {product.brand}
          </p>
        </div>
      </div>
    </Link>
  );
}

// Loading skeleton for products
function ProductsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="bg-gray-200 aspect-square rounded-t-lg" />
          <div className="p-4 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
            <div className="h-6 bg-gray-200 rounded w-1/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Main optimized products component
export default function OptimizedProductsPage({ tenantId, tenantSlug }: OptimizedProductsPageProps) {
  // Use optimized React Query hooks
  const { data: products, isLoading, error } = useProducts(tenantId, { limit: 20 });
  const { data: taxonomy } = useTaxonomy(tenantId);
  
  // Prefetch next page of products
  const prefetchProducts = usePrefetchProducts(tenantId);
  
  // Prefetch on mount for faster subsequent navigation
  useEffect(() => {
    // Prefetch related data
    prefetchProducts();
  }, [prefetchProducts]);

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Error loading products. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero section with optimized background image */}
      <div className="relative h-64 mb-8 rounded-lg overflow-hidden">
        <OptimizedImage
          src="/images/hero-products.webp"
          alt="Products Hero"
          fill
          variant="hero"
          priority // Load hero image immediately
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent flex items-center">
          <div className="px-8">
            <h1 className="text-4xl font-bold text-white mb-2">
              Wearable Tech Products
            </h1>
            <p className="text-lg text-white/90">
              Discover the best wearable technology
            </p>
          </div>
        </div>
      </div>

      {/* Category filters (lazy loaded) */}
      <SuspenseBoundary fallback={<div className="h-12 bg-gray-100 animate-pulse rounded mb-6" />}>
        <div className="flex space-x-4 overflow-x-auto pb-4 mb-6">
          {taxonomy?.vertical.map((cat: any) => (
            <button
              key={cat.id}
              className="px-4 py-2 bg-white border rounded-full hover:bg-gray-50 transition-colors whitespace-nowrap"
            >
              {cat.name}
            </button>
          ))}
        </div>
      </SuspenseBoundary>

      {/* Products grid */}
      {isLoading ? (
        <ProductsSkeleton />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products?.map((product) => (
            <ProductCard 
              key={product.id} 
              product={product} 
              tenantSlug={tenantSlug}
            />
          ))}
        </div>
      )}

      {/* Lazy load comparison tool */}
      {products && products.length > 1 && (
        <Suspense fallback={<div className="mt-12 h-64 bg-gray-100 animate-pulse rounded" />}>
          <div className="mt-12">
            <h2 className="text-2xl font-bold mb-6">Compare Products</h2>
            <LazyProductComparison products={products.slice(0, 3)} />
          </div>
        </Suspense>
      )}

      {/* Lazy load related products */}
      <Suspense fallback={<div className="mt-12 h-64 bg-gray-100 animate-pulse rounded" />}>
        <div className="mt-12">
          <h2 className="text-2xl font-bold mb-6">You Might Also Like</h2>
          <LazyRelatedProducts tenantId={tenantId} />
        </div>
      </Suspense>
    </div>
  );
}