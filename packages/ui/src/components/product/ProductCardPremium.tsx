'use client';
import * as React from 'react';
import { useState } from 'react';
import { twMerge } from 'tailwind-merge';
import { Card } from '../base/Card';
import { Button } from '../base/Button';
import { Badge } from '../base/Badge';
import { VStack, HStack } from '../layout/Stack';
import { StarIcon, HeartIcon, ShoppingCartIcon, EyeIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarFilledIcon, HeartIcon as HeartFilledIcon } from '@heroicons/react/24/solid';

export interface ProductCardPremiumProps {
  product: {
    id: string;
    name: string;
    description?: string;
    price: number;
    originalPrice?: number;
    currency?: string;
    rating?: number;
    reviewCount?: number;
    images: string[];
    category?: string;
    tags?: string[];
    inStock?: boolean;
    stockCount?: number;
    badges?: Array<{
      text: string;
      variant?: 'default' | 'accent' | 'success' | 'warning' | 'error';
    }>;
    features?: string[];
    affiliate?: {
      url: string;
      provider: string;
    };
  };
  variant?: 'default' | 'compact' | 'featured';
  showQuickActions?: boolean;
  showFeatures?: boolean;
  onAddToCart?: (productId: string) => void;
  onQuickView?: (productId: string) => void;
  onWishlistToggle?: (productId: string, inWishlist: boolean) => void;
  isInWishlist?: boolean;
  className?: string;
}

export function ProductCardPremium({
  product,
  variant = 'default',
  showQuickActions = true,
  showFeatures = true,
  onAddToCart,
  onQuickView,
  onWishlistToggle,
  isInWishlist = false,
  className,
}: ProductCardPremiumProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const {
    id,
    name,
    description,
    price,
    originalPrice,
    currency = '$',
    rating,
    reviewCount,
    images,
    category,
    tags,
    inStock = true,
    stockCount,
    badges,
    features,
    affiliate,
  } = product;

  const hasDiscount = originalPrice && originalPrice > price;
  const discountPercentage = hasDiscount ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency === '$' ? 'USD' : 'USD',
    }).format(amount);
  };

  const renderRating = () => {
    if (!rating) return null;

    return (
      <HStack spacing="xs" align="center">
        <div className="flex items-center">
          {[1, 2, 3, 4, 5].map((star) => (
            <StarFilledIcon
              key={star}
              className={twMerge(
                'h-4 w-4',
                star <= rating ? 'text-yellow-400' : 'text-gray-200'
              )}
            />
          ))}
        </div>
        <span className="text-sm text-primary-600">
          {rating} {reviewCount && `(${reviewCount})`}
        </span>
      </HStack>
    );
  };

  const renderPrice = () => (
    <HStack spacing="sm" align="baseline">
      <span className="text-xl font-bold text-primary-900">
        {formatPrice(price)}
      </span>
      {hasDiscount && (
        <>
          <span className="text-sm text-primary-500 line-through">
            {formatPrice(originalPrice)}
          </span>
          <Badge variant="success" size="sm">
            -{discountPercentage}%
          </Badge>
        </>
      )}
    </HStack>
  );

  const renderQuickActions = () => {
    if (!showQuickActions) return null;

    return (
      <div className={twMerge(
        'absolute top-3 right-3 flex flex-col gap-2 transition-all duration-300',
        variant === 'compact' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
      )}>
        {onWishlistToggle && (
          <button
            type="button"
            className="p-2 rounded-2xl bg-white/90 backdrop-blur-sm shadow-soft hover:bg-white hover:scale-110 transition-all"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onWishlistToggle(id, !isInWishlist);
            }}
            aria-label={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            {isInWishlist ? (
              <HeartFilledIcon className="h-5 w-5 text-red-500" />
            ) : (
              <HeartIcon className="h-5 w-5 text-primary-600" />
            )}
          </button>
        )}
        {onQuickView && (
          <button
            type="button"
            className="p-2 rounded-2xl bg-white/90 backdrop-blur-sm shadow-soft hover:bg-white hover:scale-110 transition-all"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onQuickView(id);
            }}
            aria-label="Quick view"
          >
            <EyeIcon className="h-5 w-5 text-primary-600" />
          </button>
        )}
      </div>
    );
  };

  const renderImageGallery = () => (
    <div 
      className="relative overflow-hidden bg-primary-50 group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={twMerge(
        'relative w-full transition-all duration-300',
        variant === 'compact' ? 'aspect-square' : 'aspect-[4/3]'
      )}>
        {images.map((image, index) => (
          <img
            key={index}
            src={image}
            alt={`${name} - Image ${index + 1}`}
            className={twMerge(
              'absolute inset-0 w-full h-full object-cover transition-all duration-500',
              index === currentImageIndex ? 'opacity-100' : 'opacity-0',
              isHovered && 'scale-105'
            )}
            onLoad={() => setImageLoaded(true)}
          />
        ))}
        
        {!imageLoaded && (
          <div className="absolute inset-0 bg-primary-100 animate-pulse flex items-center justify-center">
            <div className="w-12 h-12 rounded-xl bg-primary-200" />
          </div>
        )}

        {/* Image dots */}
        {images.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
            {images.map((_, index) => (
              <button
                key={index}
                type="button"
                className={twMerge(
                  'w-2 h-2 rounded-full transition-all duration-200',
                  index === currentImageIndex 
                    ? 'bg-white shadow-soft' 
                    : 'bg-white/50 hover:bg-white/75'
                )}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setCurrentImageIndex(index);
                }}
                aria-label={`View image ${index + 1}`}
              />
            ))}
          </div>
        )}

        {/* Badges overlay */}
        {badges && badges.length > 0 && (
          <div className="absolute top-3 left-3 flex flex-col gap-2">
            {badges.map((badge, index) => (
              <Badge 
                key={index} 
                variant={badge.variant || 'accent'} 
                size="sm"
              >
                {badge.text}
              </Badge>
            ))}
          </div>
        )}

        {renderQuickActions()}
      </div>
    </div>
  );

  const renderContent = () => (
    <VStack spacing="sm" className="p-4">
      {/* Category and tags */}
      {(category || (tags && tags.length > 0)) && (
        <HStack spacing="sm" align="center">
          {category && (
            <Badge variant="outline" size="sm">
              {category}
            </Badge>
          )}
          {tags && tags.slice(0, 2).map((tag, index) => (
            <Badge key={index} variant="neutral" size="sm">
              {tag}
            </Badge>
          ))}
        </HStack>
      )}

      {/* Name and description */}
      <VStack spacing="xs">
        <h3 className="font-semibold text-primary-900 line-clamp-2">
          {name}
        </h3>
        {description && variant !== 'compact' && (
          <p className="text-sm text-primary-600 line-clamp-2">
            {description}
          </p>
        )}
      </VStack>

      {/* Features */}
      {showFeatures && features && features.length > 0 && variant !== 'compact' && (
        <ul className="text-xs text-primary-600 space-y-1">
          {features.slice(0, 3).map((feature, index) => (
            <li key={index} className="flex items-center gap-2">
              <div className="w-1 h-1 rounded-full bg-accent-400 flex-shrink-0" />
              {feature}
            </li>
          ))}
        </ul>
      )}

      {/* Rating */}
      {renderRating()}

      {/* Price */}
      {renderPrice()}

      {/* Stock status */}
      {!inStock && (
        <Badge variant="error" size="sm">
          Out of Stock
        </Badge>
      )}
      {inStock && stockCount && stockCount <= 5 && (
        <Badge variant="warning" size="sm">
          Only {stockCount} left
        </Badge>
      )}
    </VStack>
  );

  const renderActions = () => (
    <div className="p-4 pt-0 space-y-3">
      <Button
        variant="primary"
        size="sm"
        width="full"
        leftIcon={<ShoppingCartIcon className="h-4 w-4" />}
        disabled={!inStock}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onAddToCart?.(id);
        }}
      >
        {inStock ? 'Add to Cart' : 'Out of Stock'}
      </Button>

      {affiliate && (
        <a
          href={affiliate.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-center"
          onClick={(e) => e.stopPropagation()}
        >
          <Button variant="outline" size="sm" width="full">
            View on {affiliate.provider}
          </Button>
        </a>
      )}
    </div>
  );

  const cardClasses = twMerge(
    'group overflow-hidden transition-all duration-300',
    variant === 'featured' && 'ring-2 ring-accent-200',
    className
  );

  if (variant === 'compact') {
    return (
      <Card
        className={cardClasses}
        hover="lift"
        size="sm"
      >
        {renderImageGallery()}
        <VStack spacing="sm" className="p-3">
          <h3 className="font-medium text-sm text-primary-900 line-clamp-2">
            {name}
          </h3>
          {renderPrice()}
        </VStack>
      </Card>
    );
  }

  return (
    <Card
      className={cardClasses}
      hover="lift"
      size="sm"
    >
      {renderImageGallery()}
      {renderContent()}
      {renderActions()}
    </Card>
  );
}

// Usage example:
/*
const sampleProduct = {
  id: '1',
  name: 'Apple Watch Series 9',
  description: 'The most advanced Apple Watch yet with innovative health features.',
  price: 399,
  originalPrice: 499,
  rating: 4.5,
  reviewCount: 1250,
  images: [
    '/apple-watch-1.jpg',
    '/apple-watch-2.jpg',
    '/apple-watch-3.jpg'
  ],
  category: 'Smartwatch',
  tags: ['Health', 'Fitness', 'GPS'],
  inStock: true,
  stockCount: 3,
  badges: [
    { text: 'New', variant: 'accent' },
    { text: 'Best Seller', variant: 'success' }
  ],
  features: [
    'Advanced health monitoring',
    'Built-in GPS',
    'Water resistant to 50m',
    'All-day battery life'
  ],
  affiliate: {
    url: 'https://amazon.com/...',
    provider: 'Amazon'
  }
};

<ProductCardPremium
  product={sampleProduct}
  variant="default"
  onAddToCart={(id) => console.log('Add to cart:', id)}
  onQuickView={(id) => console.log('Quick view:', id)}
  onWishlistToggle={(id, inWishlist) => console.log('Wishlist:', id, inWishlist)}
/>
*/
