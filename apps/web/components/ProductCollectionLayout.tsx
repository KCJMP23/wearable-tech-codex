'use client';

import { useState } from 'react';
import { ProductCard } from './ProductCard';
import { ChevronDownIcon, FunnelIcon, Squares2X2Icon, ListBulletIcon } from '@heroicons/react/24/outline';
import type { Product } from '@affiliate-factory/sdk';

interface ProductCollectionLayoutProps {
  products: Product[];
  tenantName: string;
  category?: string;
  sortBy?: string;
  filters?: string;
}

const sortOptions = [
  { value: 'featured', label: 'Featured' },
  { value: 'price-low-high', label: 'Price: Low to High' },
  { value: 'price-high-low', label: 'Price: High to Low' },
  { value: 'newest', label: 'Newest' },
  { value: 'best-selling', label: 'Best Selling' },
  { value: 'rating', label: 'Customer Rating' },
];

const categories = [
  'All Products',
  'Smartwatches',
  'Fitness Trackers',
  'Health Monitors',
  'Smart Rings',
  'Sleep Trackers',
  'Posture Devices',
  'Smart Glasses',
  'Accessories',
];

const priceRanges = [
  'Under $50',
  '$50 - $100',
  '$100 - $200',
  '$200 - $500',
  'Over $500',
];

const brands = [
  'Apple',
  'Samsung',
  'Fitbit',
  'Garmin',
  'Oura',
  'Whoop',
  'Polar',
  'Suunto',
];

const features = [
  'Heart Rate Monitor',
  'GPS Tracking',
  'Sleep Tracking',
  'Water Resistant',
  'Long Battery Life',
  'Blood Oxygen',
  'ECG',
  'NFC Payments',
];

export function ProductCollectionLayout({ 
  products, 
  tenantName, 
  category, 
  sortBy, 
  filters 
}: ProductCollectionLayoutProps) {
  const [selectedSort, setSelectedSort] = useState(sortBy || 'featured');
  const [selectedCategory, setSelectedCategory] = useState(category || 'All Products');
  const [selectedPriceRanges, setSelectedPriceRanges] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [isGridView, setIsGridView] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const handlePriceRangeChange = (range: string) => {
    setSelectedPriceRanges(prev => 
      prev.includes(range) 
        ? prev.filter(r => r !== range)
        : [...prev, range]
    );
  };

  const handleBrandChange = (brand: string) => {
    setSelectedBrands(prev => 
      prev.includes(brand) 
        ? prev.filter(b => b !== brand)
        : [...prev, brand]
    );
  };

  const handleFeatureChange = (feature: string) => {
    setSelectedFeatures(prev => 
      prev.includes(feature) 
        ? prev.filter(f => f !== feature)
        : [...prev, feature]
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <nav className="text-sm text-gray-500 mb-4">
          <span>Home</span> <span className="mx-2">›</span> <span className="text-gray-900">All Products</span>
        </nav>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">All Products</h1>
            <p className="text-gray-600 mt-2">{products.length} products</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Filters */}
        <div className={`lg:w-64 ${showFilters ? 'block' : 'hidden lg:block'}`}>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Filter & Sort</h3>
            
            {/* Categories */}
            <div className="mb-6">
              <h4 className="font-medium text-gray-900 mb-3">Category</h4>
              {categories.map((cat) => (
                <label key={cat} className="flex items-center mb-2">
                  <input
                    type="radio"
                    name="category"
                    checked={selectedCategory === cat}
                    onChange={() => setSelectedCategory(cat)}
                    className="mr-3 text-blue-600"
                  />
                  <span className="text-sm text-gray-700">{cat}</span>
                </label>
              ))}
            </div>

            {/* Price Range */}
            <div className="mb-6">
              <h4 className="font-medium text-gray-900 mb-3">Price Range</h4>
              {priceRanges.map((range) => (
                <label key={range} className="flex items-center mb-2">
                  <input
                    type="checkbox"
                    checked={selectedPriceRanges.includes(range)}
                    onChange={() => handlePriceRangeChange(range)}
                    className="mr-3 text-blue-600"
                  />
                  <span className="text-sm text-gray-700">{range}</span>
                </label>
              ))}
            </div>

            {/* Brands */}
            <div className="mb-6">
              <h4 className="font-medium text-gray-900 mb-3">Brand</h4>
              {brands.map((brand) => (
                <label key={brand} className="flex items-center mb-2">
                  <input
                    type="checkbox"
                    checked={selectedBrands.includes(brand)}
                    onChange={() => handleBrandChange(brand)}
                    className="mr-3 text-blue-600"
                  />
                  <span className="text-sm text-gray-700">{brand}</span>
                </label>
              ))}
            </div>

            {/* Features */}
            <div className="mb-6">
              <h4 className="font-medium text-gray-900 mb-3">Features</h4>
              {features.map((feature) => (
                <label key={feature} className="flex items-center mb-2">
                  <input
                    type="checkbox"
                    checked={selectedFeatures.includes(feature)}
                    onChange={() => handleFeatureChange(feature)}
                    className="mr-3 text-blue-600"
                  />
                  <span className="text-sm text-gray-700">{feature}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center gap-4 mb-4 sm:mb-0">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="lg:hidden flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <FunnelIcon className="h-4 w-4" />
                Filters
              </button>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsGridView(true)}
                  className={`p-2 rounded-md ${isGridView ? 'bg-gray-900 text-white' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  <Squares2X2Icon className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setIsGridView(false)}
                  className={`p-2 rounded-md ${!isGridView ? 'bg-gray-900 text-white' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  <ListBulletIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="relative">
              <select
                value={selectedSort}
                onChange={(e) => setSelectedSort(e.target.value)}
                className="appearance-none bg-white border border-gray-300 rounded-md px-4 py-2 pr-8 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDownIcon className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Products Grid */}
          <div className={`grid gap-6 ${
            isGridView 
              ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
              : 'grid-cols-1'
          }`}>
            {products.map((product) => (
              <ProductCard 
                key={product.id} 
                product={product}
              />
            ))}
          </div>

          {/* Pagination */}
          <div className="mt-12 flex items-center justify-center">
            <nav className="flex items-center gap-2">
              <button className="px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700">
                Previous
              </button>
              {[1, 2, 3, 4, 5].map((page) => (
                <button
                  key={page}
                  className={`px-3 py-2 text-sm font-medium rounded-md ${
                    page === 1
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button className="px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700">
                Next
              </button>
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
}