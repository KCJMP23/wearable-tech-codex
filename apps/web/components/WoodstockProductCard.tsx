'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  StarIcon as StarFilledIcon,
  HeartIcon,
  EyeIcon,
  ShoppingBagIcon
} from '@heroicons/react/24/solid';
import { StarIcon, HeartIcon as HeartOutlineIcon } from '@heroicons/react/24/outline';
import type { Product } from '@affiliate-factory/sdk';

interface WoodstockProductCardProps {
  product: Product;
  tenantSlug?: string;
}

export function WoodstockProductCard({ product, tenantSlug = 'nectarheat' }: WoodstockProductCardProps) {
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const imageUrl = typeof product.images?.[0] === 'string' 
    ? product.images[0] 
    : product.images?.[0]?.url || 'https://images.unsplash.com/photo-1434494878577-86c23bcb06b9?w=400&h=400&fit=crop';

  const originalPrice = product.originalPrice;
  const currentPrice = product.priceSnapshot || 0;
  const discount = originalPrice && originalPrice > currentPrice 
    ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
    : null;

  const renderRating = () => {
    if (!product.rating) return null;

    return (
      <div className="flex items-center gap-1 mb-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <StarFilledIcon
            key={star}
            className={`h-4 w-4 ${
              star <= (product.rating || 0) ? 'text-yellow-400' : 'text-gray-200'
            }`}
          />
        ))}
        <span className="text-sm text-gray-600 ml-1">
          ({product.reviewCount || 0})
        </span>
      </div>
    );
  };

  return (
    <div className="group relative bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
      {/* Product Image */}
      <div className="relative aspect-square bg-gray-100 overflow-hidden">
        {/* Sale Badge */}
        {discount && (
          <div className="absolute top-3 left-3 z-10">
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-md">
              -{discount}%
            </span>
          </div>
        )}

        {/* Wishlist & Quick View Buttons */}
        <div className="absolute top-3 right-3 z-10 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button
            onClick={() => setIsWishlisted(!isWishlisted)}
            className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md hover:bg-gray-50 transition-colors"
          >
            {isWishlisted ? (
              <HeartIcon className="h-4 w-4 text-red-500" />
            ) : (
              <HeartOutlineIcon className="h-4 w-4 text-gray-600" />
            )}
          </button>
          <button className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md hover:bg-gray-50 transition-colors">
            <EyeIcon className="h-4 w-4 text-gray-600" />
          </button>
        </div>

        {/* Main Product Image */}
        <Link href={`/${tenantSlug}/products/${product.id}`}>
          <img
            src={imageUrl}
            alt={product.title}
            className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={() => setImageLoaded(true)}
          />
        </Link>

        {/* Overlay on Hover */}
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-300" />

        {/* Quick Add to Cart Button */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 translate-y-4 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300">
          {product.affiliateUrl ? (
            <a
              href={product.affiliateUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <ShoppingBagIcon className="h-4 w-4" />
              Buy Now
            </a>
          ) : (
            <button className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2">
              <ShoppingBagIcon className="h-4 w-4" />
              View Details
            </button>
          )}
        </div>
      </div>

      {/* Product Info */}
      <div className="p-4">
        {/* Category */}
        {product.category && (
          <div className="text-xs text-blue-600 font-medium uppercase tracking-wide mb-2">
            {product.category}
          </div>
        )}

        {/* Rating */}
        {renderRating()}

        {/* Product Title */}
        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
          <Link href={`/${tenantSlug}/products/${product.id}`}>
            {product.title}
          </Link>
        </h3>

        {/* Features */}
        {product.features && product.features.length > 0 && (
          <div className="text-sm text-gray-600 mb-3 line-clamp-2">
            {product.features.slice(0, 2).join(' • ')}
          </div>
        )}

        {/* Price */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-gray-900">
              ${currentPrice.toFixed(2)}
            </span>
            {originalPrice && originalPrice > currentPrice && (
              <span className="text-sm text-gray-500 line-through">
                ${originalPrice.toFixed(2)}
              </span>
            )}
          </div>

          {/* Health Metrics Badge */}
          {product.healthMetrics && product.healthMetrics.length > 0 && (
            <div className="flex items-center">
              <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full">
                {product.healthMetrics[0]}
              </span>
            </div>
          )}
        </div>

        {/* Additional Badges */}
        <div className="flex items-center gap-2 mt-3">
          {product.waterResistance && (
            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
              {product.waterResistance}
            </span>
          )}
          {product.batteryLifeHours && (
            <span className="bg-purple-100 text-purple-800 text-xs font-medium px-2 py-1 rounded-full">
              {product.batteryLifeHours}h battery
            </span>
          )}
        </div>
      </div>
    </div>
  );
}