'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ProductCard } from './ProductCard';
import { ArrowTrendingUpIcon, FireIcon, SparklesIcon } from '@heroicons/react/24/outline';
import type { Product } from '@affiliate-factory/sdk';

interface TrendingProductsProps {
  tenantSlug: string;
  tenantNiche?: string;
}

export function TrendingProducts({ tenantSlug, tenantNiche = 'Products' }: TrendingProductsProps) {
  const [activeTab, setActiveTab] = useState('trending');

  // Mock trending products - in production, fetch from Supabase
  const trendingProducts: Product[] = [
    {
      id: 'tw-1',
      title: 'Apple Watch Ultra 2',
      description: 'The most rugged and capable Apple Watch',
      priceSnapshot: 799,
      originalPrice: 849,
      images: ['https://images.unsplash.com/photo-1639037687665-a5130d0c5fd3?w=800'],
      category: 'Smartwatches',
      rating: 4.8,
      reviewCount: 1250,
      affiliateUrl: 'https://amazon.com/dp/B0CHX9NB3Y?tag=jmpkc01-20',
      features: ['49mm titanium case', 'Action button', '3000 nits display', '36h battery'],
      healthMetrics: ['ECG', 'Blood Oxygen', 'Temperature'],
      waterResistance: 'WR100',
      batteryLifeHours: 36
    },
    {
      id: 'tw-2',
      title: 'Oura Ring Gen3 Heritage',
      description: 'Advanced sleep and recovery tracking in a sleek ring',
      priceSnapshot: 299,
      originalPrice: 349,
      images: ['https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800'],
      category: 'Smart Rings',
      rating: 4.6,
      reviewCount: 890,
      affiliateUrl: 'https://amazon.com/dp/B09LHDMTP4?tag=jmpkc01-20',
      features: ['Sleep tracking', 'HRV monitoring', '7-day battery', 'Temperature sensing'],
      healthMetrics: ['HRV', 'Sleep', 'Temperature'],
      batteryLifeHours: 168
    },
    {
      id: 'tw-3',
      title: 'Whoop 4.0',
      description: 'Performance optimization for athletes',
      priceSnapshot: 239,
      originalPrice: 239,
      images: ['https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=800'],
      category: 'Fitness Trackers',
      rating: 4.5,
      reviewCount: 567,
      affiliateUrl: 'https://amazon.com/dp/B09HH2KZ67?tag=jmpkc01-20',
      features: ['Strain coach', 'Recovery insights', 'Sleep coach', 'Continuous HRV'],
      healthMetrics: ['HRV', 'Recovery', 'Strain'],
      waterResistance: 'IP68',
      batteryLifeHours: 120
    },
    {
      id: 'tw-4',
      title: 'Garmin Venu 3',
      description: 'GPS smartwatch with advanced health monitoring',
      priceSnapshot: 449,
      originalPrice: 499,
      images: ['https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800'],
      category: 'Smartwatches',
      rating: 4.7,
      reviewCount: 423,
      affiliateUrl: 'https://amazon.com/dp/B0C8PQK24P?tag=jmpkc01-20',
      features: ['Sleep coach', 'Body Battery', 'Wheelchair mode', 'Voice features'],
      healthMetrics: ['Sleep', 'Stress', 'Body Battery'],
      waterResistance: '5 ATM',
      batteryLifeHours: 336
    }
  ];

  const tabs = [
    { id: 'trending', label: 'Trending Now', icon: <ArrowTrendingUpIcon className="h-5 w-5" /> },
    { id: 'hot', label: 'Hot Deals', icon: <FireIcon className="h-5 w-5" /> },
    { id: 'new', label: 'New Arrivals', icon: <SparklesIcon className="h-5 w-5" /> }
  ];

  return (
    <section className="py-16 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-full text-sm font-semibold mb-4">
            <ArrowTrendingUpIcon className="h-4 w-4" />
            <span>Trending This Week</span>
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Most Popular {tenantNiche}
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Discover what everyone&apos;s buying - our AI analyzes real-time data to bring you the hottest {tenantNiche.toLowerCase()}
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex bg-gray-100 rounded-lg p-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {trendingProducts.map((product, index) => (
            <div
              key={product.id}
              className="animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <ProductCard product={product} />
            </div>
          ))}
        </div>

        {/* View All Link */}
        <div className="text-center mt-12">
          <Link
            href={`/${tenantSlug}/collections/trending`}
            className="inline-flex items-center gap-2 text-blue-600 font-semibold hover:text-blue-700 transition-colors"
          >
            View All Trending {tenantNiche}
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}