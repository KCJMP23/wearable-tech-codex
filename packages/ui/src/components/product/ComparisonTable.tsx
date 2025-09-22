'use client';
import * as React from 'react';
import { useState } from 'react';
import { twMerge } from 'tailwind-merge';
import { Card } from '../base/Card';
import { Button } from '../base/Button';
import { Badge } from '../base/Badge';
import { VStack, HStack } from '../layout/Stack';
import { CheckIcon, XMarkIcon, StarIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarFilledIcon } from '@heroicons/react/24/solid';

export interface ComparisonProduct {
  id: string;
  name: string;
  image: string;
  price: number;
  originalPrice?: number;
  currency?: string;
  rating?: number;
  reviewCount?: number;
  badge?: string;
  affiliate?: {
    url: string;
    provider: string;
  };
  features: Record<string, string | number | boolean | null>;
}

export interface ComparisonFeature {
  key: string;
  label: string;
  category?: string;
  type: 'text' | 'number' | 'boolean' | 'rating' | 'price';
  unit?: string;
  important?: boolean;
  description?: string;
}

export interface ComparisonTableProps {
  products: ComparisonProduct[];
  features: ComparisonFeature[];
  className?: string;
  stickyHeader?: boolean;
  highlightBest?: boolean;
  onRemoveProduct?: (productId: string) => void;
  onAddToCart?: (productId: string) => void;
  maxProducts?: number;
}

export function ComparisonTable({
  products,
  features,
  className,
  stickyHeader = true,
  highlightBest = true,
  onRemoveProduct,
  onAddToCart,
  maxProducts = 4,
}: ComparisonTableProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Group features by category
  const categorizedFeatures = features.reduce((acc, feature) => {
    const category = feature.category || 'General';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(feature);
    return acc;
  }, {} as Record<string, ComparisonFeature[]>);

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const formatPrice = (amount: number, currency = '$') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency === '$' ? 'USD' : 'USD',
    }).format(amount);
  };

  const renderFeatureValue = (
    feature: ComparisonFeature,
    value: string | number | boolean | null,
    productId: string
  ) => {
    if (value === null || value === undefined) {
      return <span className="text-primary-400">—</span>;
    }

    switch (feature.type) {
      case 'boolean':
        return (
          <div className="flex justify-center">
            {value ? (
              <CheckIcon className="h-5 w-5 text-green-600" />
            ) : (
              <XMarkIcon className="h-5 w-5 text-red-500" />
            )}
          </div>
        );

      case 'rating':
        const rating = Number(value);
        return (
          <div className="flex items-center justify-center gap-1">
            <div className="flex">
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
            <span className="text-sm text-primary-600 ml-1">{rating}</span>
          </div>
        );

      case 'price':
        return (
          <span className="font-semibold text-primary-900">
            {formatPrice(Number(value))}
          </span>
        );

      case 'number':
        return (
          <span className="text-center">
            {value}
            {feature.unit && <span className="text-primary-500 ml-1">{feature.unit}</span>}
          </span>
        );

      default:
        return <span className="text-center">{String(value)}</span>;
    }
  };

  const getBestValue = (feature: ComparisonFeature): string | null => {
    if (!highlightBest || feature.type === 'text') return null;

    const values = products
      .map(p => p.features[feature.key])
      .filter(v => v !== null && v !== undefined);

    if (values.length === 0) return null;

    switch (feature.type) {
      case 'boolean':
        return values.some(v => v === true) ? 'true' : null;
      
      case 'number':
      case 'rating':
        const numValues = values.map(Number).filter(n => !isNaN(n));
        if (numValues.length === 0) return null;
        return String(Math.max(...numValues));
      
      case 'price':
        const priceValues = values.map(Number).filter(n => !isNaN(n));
        if (priceValues.length === 0) return null;
        return String(Math.min(...priceValues)); // Best = lowest price
      
      default:
        return null;
    }
  };

  const isBestValue = (feature: ComparisonFeature, value: any): boolean => {
    if (!highlightBest) return false;
    const bestValue = getBestValue(feature);
    return bestValue !== null && String(value) === bestValue;
  };

  const renderProductHeader = (product: ComparisonProduct) => {
    const hasDiscount = typeof product.originalPrice === 'number' && product.originalPrice > product.price;
    const discountPercentage = hasDiscount && product.originalPrice
      ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
      : 0;

    return (
      <div className="p-4 text-center space-y-4">
        {/* Remove button */}
        {onRemoveProduct && (
          <div className="flex justify-end">
            <button
              type="button"
              className="p-1 rounded-lg text-primary-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              onClick={() => onRemoveProduct(product.id)}
              aria-label={`Remove ${product.name}`}
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Product image */}
        <div className="relative">
          <img
            src={product.image}
            alt={product.name}
            className="w-20 h-20 object-cover rounded-2xl mx-auto"
          />
          {product.badge && (
            <Badge 
              variant="accent" 
              size="sm"
              className="absolute -top-2 -right-2"
            >
              {product.badge}
            </Badge>
          )}
        </div>

        {/* Product name */}
        <h3 className="font-semibold text-primary-900 text-sm line-clamp-2">
          {product.name}
        </h3>

        {/* Rating */}
        {product.rating && (
          <div className="flex items-center justify-center gap-1">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((star) => (
                <StarFilledIcon
                  key={star}
                  className={twMerge(
                    'h-3 w-3',
                    star <= product.rating! ? 'text-yellow-400' : 'text-gray-200'
                  )}
                />
              ))}
            </div>
            <span className="text-xs text-primary-600">
              {product.rating}
              {product.reviewCount && ` (${product.reviewCount})`}
            </span>
          </div>
        )}

        {/* Price */}
        <VStack spacing="xs">
          <div className="text-lg font-bold text-primary-900">
            {formatPrice(product.price, product.currency)}
          </div>
          {hasDiscount && (
            <div className="space-y-1">
              <div className="text-sm text-primary-500 line-through">
              {product.originalPrice !== undefined
                ? formatPrice(product.originalPrice, product.currency)
                : null}
              </div>
              <Badge variant="success" size="sm">
                -{discountPercentage}% OFF
              </Badge>
            </div>
          )}
        </VStack>

        {/* Actions */}
        <VStack spacing="sm">
          {onAddToCart && (
            <Button
              variant="primary"
              size="sm"
              width="full"
              onClick={() => onAddToCart(product.id)}
            >
              Add to Cart
            </Button>
          )}
          {product.affiliate && (
            <a
              href={product.affiliate.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <Button variant="outline" size="sm" width="full">
                View on {product.affiliate.provider}
              </Button>
            </a>
          )}
        </VStack>
      </div>
    );
  };

  const renderFeatureRow = (feature: ComparisonFeature) => (
    <tr key={feature.key} className="border-b border-primary-100">
      <td className="p-4 bg-primary-25">
        <div className="flex items-center gap-2">
          <span className={twMerge(
            'text-sm font-medium text-primary-900',
            feature.important && 'text-accent-700'
          )}>
            {feature.label}
            {feature.important && (
              <span className="text-accent-500 ml-1">*</span>
            )}
          </span>
          {feature.description && (
            <span 
              className="text-primary-400 cursor-help"
              title={feature.description}
            >
              ?
            </span>
          )}
        </div>
      </td>
      {products.map((product) => {
        const value = product.features[feature.key];
        const isBest = isBestValue(feature, value);
        
        return (
          <td
            key={product.id}
            className={twMerge(
              'p-4 text-center',
              isBest && 'bg-accent-50 relative'
            )}
          >
            {isBest && (
              <div className="absolute top-1 right-1">
                <Badge variant="success" size="sm">
                  Best
                </Badge>
              </div>
            )}
            {renderFeatureValue(feature, value, product.id)}
          </td>
        );
      })}
    </tr>
  );

  if (products.length === 0) {
    return (
      <Card className={className}>
        <div className="p-8 text-center">
          <p className="text-primary-500">No products to compare</p>
        </div>
      </Card>
    );
  }

  return (
    <div className={twMerge('overflow-hidden', className)}>
      <Card size="sm" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            {/* Product headers */}
            <thead className={twMerge(
              'bg-white border-b-2 border-primary-200',
              stickyHeader && 'sticky top-0 z-10'
            )}>
              <tr>
                <th className="p-4 text-left w-48">
                  <span className="text-sm font-semibold text-primary-900 uppercase tracking-wide">
                    Products
                  </span>
                </th>
                {products.map((product) => (
                  <th key={product.id} className="p-0 w-64">
                    {renderProductHeader(product)}
                  </th>
                ))}
              </tr>
            </thead>

            {/* Feature rows */}
            <tbody>
              {Object.entries(categorizedFeatures).map(([category, categoryFeatures]) => (
                <React.Fragment key={category}>
                  {/* Category header */}
                  <tr>
                    <td 
                      colSpan={products.length + 1}
                      className="p-4 bg-primary-100"
                    >
                      <button
                        type="button"
                        className="flex items-center gap-2 text-sm font-semibold text-primary-900 uppercase tracking-wide hover:text-accent-600 transition-colors"
                        onClick={() => toggleCategory(category)}
                      >
                        <span>{category}</span>
                        <span className={twMerge(
                          'transition-transform duration-200',
                          expandedCategories.has(category) ? 'rotate-90' : 'rotate-0'
                        )}>
                          ▶
                        </span>
                      </button>
                    </td>
                  </tr>

                  {/* Category features */}
                  {expandedCategories.has(category) && 
                    categoryFeatures.map(renderFeatureRow)
                  }
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-4 bg-primary-50 border-t border-primary-200">
          <div className="flex items-center justify-between text-sm text-primary-600">
            <div className="flex items-center gap-4">
              <span>Comparing {products.length} products</span>
              {highlightBest && (
                <span className="flex items-center gap-1">
                  <Badge variant="success" size="sm">Best</Badge>
                  indicates best value
                </span>
              )}
            </div>
            <span className="text-xs">
              * Important features
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}

// Usage example:
/*
const products = [
  {
    id: '1',
    name: 'Apple Watch Series 9',
    image: '/apple-watch.jpg',
    price: 399,
    originalPrice: 499,
    rating: 4.5,
    reviewCount: 1250,
    badge: 'Best Seller',
    affiliate: { url: 'https://amazon.com/...', provider: 'Amazon' },
    features: {
      'display_size': 45,
      'battery_life': 18,
      'water_resistant': true,
      'gps': true,
      'heart_rate': true,
      'operating_system': 'watchOS',
    }
  },
  // ... more products
];

const features = [
  {
    key: 'display_size',
    label: 'Display Size',
    category: 'Display',
    type: 'number' as const,
    unit: 'mm',
    important: true
  },
  {
    key: 'battery_life',
    label: 'Battery Life',
    category: 'Performance',
    type: 'number' as const,
    unit: 'hours',
    important: true
  },
  {
    key: 'water_resistant',
    label: 'Water Resistant',
    category: 'Features',
    type: 'boolean' as const
  },
  // ... more features
];

<ComparisonTable
  products={products}
  features={features}
  highlightBest={true}
  onAddToCart={(id) => console.log('Add to cart:', id)}
  onRemoveProduct={(id) => console.log('Remove product:', id)}
/>
*/
