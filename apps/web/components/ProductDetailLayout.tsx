'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ProductCard } from './ProductCard';
import { 
  StarIcon as StarFilledIcon,
  HeartIcon, 
  ShareIcon,
  CheckIcon,
  ClipboardDocumentIcon,
  ShoppingBagIcon,
  TruckIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/solid';
import { StarIcon, HeartIcon as HeartOutlineIcon } from '@heroicons/react/24/outline';
import type { Product } from '@affiliate-factory/sdk';

interface ProductDetailLayoutProps {
  product: Product;
  tenantSlug: string;
  relatedProducts: Product[];
}

// Mock coupon codes for demonstration
const coupons = [
  { code: 'SAVE20', discount: '20% off', description: 'Get 20% off your first purchase' },
  { code: 'FREESHIP', discount: 'Free shipping', description: 'Free shipping on orders over $50' },
  { code: 'TECH15', discount: '15% off', description: 'Extra 15% off wearable tech' },
];

export function ProductDetailLayout({ product, tenantSlug, relatedProducts }: ProductDetailLayoutProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [copiedCoupon, setCopiedCoupon] = useState<string | null>(null);
  const [isWishlisted, setIsWishlisted] = useState(false);

  const images = product.images?.map(img => 
    typeof img === 'string' ? img : img.url
  ).filter(Boolean) || [];

  const handleCopyCoupon = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCoupon(code);
      setTimeout(() => setCopiedCoupon(null), 2000);
    } catch (err) {
      console.error('Failed to copy coupon:', err);
    }
  };

  const renderRating = () => {
    if (!product.rating) return null;

    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center">
          {[1, 2, 3, 4, 5].map((star) => (
            <StarFilledIcon
              key={star}
              className={`h-5 w-5 ${
                star <= (product.rating || 0) ? 'text-yellow-400' : 'text-gray-200'
              }`}
            />
          ))}
        </div>
        <span className="text-sm text-gray-600">
          {product.rating} ({product.reviewCount || 0} reviews)
        </span>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 mb-8">
        <Link href={`/${tenantSlug}`} className="hover:text-gray-700">Home</Link>
        <span className="mx-2">›</span>
        <Link href={`/${tenantSlug}/products`} className="hover:text-gray-700">Products</Link>
        <span className="mx-2">›</span>
        <span className="text-gray-900">{product.title}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
        {/* Product Images */}
        <div>
          {/* Main Image */}
          <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden mb-4">
            <img
              src={images[selectedImageIndex] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&h=600&fit=crop'}
              alt={product.title}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Thumbnail Images */}
          {images.length > 1 && (
            <div className="grid grid-cols-4 gap-4">
              {images.slice(0, 4).map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImageIndex(index)}
                  className={`aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 ${
                    selectedImageIndex === index ? 'border-blue-600' : 'border-transparent'
                  }`}
                >
                  <img
                    src={image}
                    alt={`${product.title} ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{product.title}</h1>
          
          {renderRating()}

          <div className="mt-6">
            <div className="flex items-baseline gap-4">
              <span className="text-3xl font-bold text-gray-900">
                ${product.priceSnapshot?.toFixed(2) || '0.00'}
              </span>
              {product.originalPrice && product.originalPrice > (product.priceSnapshot || 0) && (
                <span className="text-xl text-gray-500 line-through">
                  ${product.originalPrice.toFixed(2)}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600 mt-1">Free shipping on orders over $50</p>
          </div>

          {/* Features */}
          {product.features && product.features.length > 0 && (
            <div className="mt-6">
              <h3 className="font-semibold text-gray-900 mb-3">Key Features</h3>
              <ul className="space-y-2">
                {product.features.slice(0, 5).map((feature, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <CheckIcon className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-8 space-y-4">
            {product.affiliateUrl && (
              <a
                href={product.affiliateUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold text-center hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <ShoppingBagIcon className="h-5 w-5" />
                Buy on Amazon
              </a>
            )}

            <div className="flex gap-4">
              <button
                onClick={() => setIsWishlisted(!isWishlisted)}
                className="flex-1 border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              >
                {isWishlisted ? (
                  <HeartIcon className="h-5 w-5 text-red-500" />
                ) : (
                  <HeartOutlineIcon className="h-5 w-5" />
                )}
                {isWishlisted ? 'Saved' : 'Save'}
              </button>
              
              <button className="flex-1 border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
                <ShareIcon className="h-5 w-5" />
                Share
              </button>
            </div>
          </div>

          {/* Coupons */}
          <div className="mt-8 bg-blue-50 rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Available Coupons</h3>
            <div className="space-y-3">
              {coupons.map((coupon) => (
                <div key={coupon.code} className="flex items-center justify-between bg-white p-3 rounded-lg border border-blue-200">
                  <div>
                    <div className="font-medium text-gray-900">{coupon.discount}</div>
                    <div className="text-sm text-gray-600">{coupon.description}</div>
                  </div>
                  <button
                    onClick={() => handleCopyCoupon(coupon.code)}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                  >
                    {copiedCoupon === coupon.code ? (
                      <>
                        <CheckIcon className="h-4 w-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <ClipboardDocumentIcon className="h-4 w-4" />
                        {coupon.code}
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Trust Badges */}
          <div className="mt-8 grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
              <TruckIcon className="h-6 w-6 text-blue-600" />
              <div>
                <div className="font-medium text-gray-900">Fast Shipping</div>
                <div className="text-sm text-gray-600">2-day delivery</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
              <ShieldCheckIcon className="h-6 w-6 text-green-600" />
              <div>
                <div className="font-medium text-gray-900">Verified Product</div>
                <div className="text-sm text-gray-600">Amazon verified</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Product Description */}
      <div className="border-t border-gray-200 pt-16 mb-16">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">About This Product</h2>
        <div className="prose max-w-none">
          <p className="text-gray-700 leading-relaxed">
            {product.description || 
              `Discover the innovative features and cutting-edge technology of the ${product.title}. 
              This premium wearable device combines style, functionality, and advanced health monitoring 
              capabilities to help you achieve your wellness goals.`
            }
          </p>
        </div>
      </div>

      {/* Related Products */}
      <div className="border-t border-gray-200 pt-16">
        <h2 className="text-2xl font-bold text-gray-900 mb-8">You Might Also Like</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {relatedProducts.map((relatedProduct) => (
            <ProductCard key={relatedProduct.id} product={relatedProduct} />
          ))}
        </div>
      </div>
    </div>
  );
}