'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { 
  ClockIcon, // Using ClockIcon instead of WatchIcon
  HeartIcon, 
  ChartBarIcon, // Using ChartBarIcon instead of ActivityIcon
  SparklesIcon,
  SunIcon,
  MoonIcon,
  ShieldCheckIcon,
  BoltIcon // Using BoltIcon instead of BatteryIcon
} from '@heroicons/react/24/outline';

interface Category {
  name: string;
  description: string;
  slug: string;
  icon: React.ReactNode;
  image: string;
  color: string;
  gradient: string;
  productCount?: number;
}

interface DynamicCategoriesProps {
  tenantSlug: string;
  limit?: number;
  showProductCount?: boolean;
}

export function DynamicCategories({ 
  tenantSlug, 
  limit = 8, 
  showProductCount = true 
}: DynamicCategoriesProps) {
  const [isPinned, setIsPinned] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const categoriesRef = useRef<HTMLDivElement>(null);

  // Wearable tech specific categories
  const categories: Category[] = [
    {
      name: 'Smartwatches',
      description: 'Advanced health tracking and connectivity',
      slug: 'smartwatches',
      icon: <ClockIcon className="h-6 w-6" />,
      image: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=800',
      color: 'blue',
      gradient: 'from-blue-500 to-cyan-500',
      productCount: 124
    },
    {
      name: 'Fitness Trackers',
      description: 'Monitor your activity and workouts',
      slug: 'fitness-trackers',
      icon: <ChartBarIcon className="h-6 w-6" />,
      image: 'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=800',
      color: 'green',
      gradient: 'from-green-500 to-emerald-500',
      productCount: 89
    },
    {
      name: 'Health Monitors',
      description: 'Medical-grade health monitoring',
      slug: 'health-monitors',
      icon: <HeartIcon className="h-6 w-6" />,
      image: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800',
      color: 'red',
      gradient: 'from-red-500 to-pink-500',
      productCount: 67
    },
    {
      name: 'Smart Rings',
      description: 'Discreet health and fitness tracking',
      slug: 'smart-rings',
      icon: <SparklesIcon className="h-6 w-6" />,
      image: 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=800',
      color: 'purple',
      gradient: 'from-purple-500 to-violet-500',
      productCount: 34
    },
    {
      name: 'Sleep Trackers',
      description: 'Optimize your sleep quality',
      slug: 'sleep-trackers',
      icon: <MoonIcon className="h-6 w-6" />,
      image: 'https://images.unsplash.com/photo-1510074377623-8cf13fb86c08?w=800',
      color: 'indigo',
      gradient: 'from-indigo-500 to-blue-500',
      productCount: 45
    },
    {
      name: 'Posture Devices',
      description: 'Improve posture and reduce pain',
      slug: 'posture-devices',
      icon: <ShieldCheckIcon className="h-6 w-6" />,
      image: 'https://images.unsplash.com/photo-1588286840104-8957b019727f?w=800',
      color: 'teal',
      gradient: 'from-teal-500 to-cyan-500',
      productCount: 28
    },
    {
      name: 'Smart Glasses',
      description: 'AR-enabled smart eyewear',
      slug: 'smart-glasses',
      icon: <SunIcon className="h-6 w-6" />,
      image: 'https://images.unsplash.com/photo-1572883454114-1cf0031ede2a?w=800',
      color: 'amber',
      gradient: 'from-amber-500 to-orange-500',
      productCount: 19
    },
    {
      name: 'Recovery Tech',
      description: 'Advanced recovery and therapy devices',
      slug: 'recovery-tech',
      icon: <BoltIcon className="h-6 w-6" />,
      image: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800',
      color: 'lime',
      gradient: 'from-lime-500 to-green-500',
      productCount: 52
    }
  ].slice(0, limit);

  useEffect(() => {
    const handleScroll = () => {
      if (categoriesRef.current) {
        const rect = categoriesRef.current.getBoundingClientRect();
        const shouldPin = rect.top <= 0 && rect.bottom >= 100;
        setIsPinned(shouldPin);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="relative">
      {/* Section Header */}
      <div className="text-center mb-12">
        <h2 className="text-4xl font-bold text-gray-900 mb-4">Shop by Category</h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Explore our curated collection of wearable technology designed to enhance your health, fitness, and daily life
        </p>
      </div>

      {/* Sticky Category Bar (visible when pinned) */}
      <div 
        className={`fixed top-0 left-0 right-0 bg-white border-b border-gray-200 shadow-sm z-40 transition-transform duration-300 ${
          isPinned ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              {categories.map((category) => (
                <Link
                  key={category.slug}
                  href={`/${tenantSlug}/categories/${category.slug}`}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                    activeCategory === category.slug
                      ? 'bg-gradient-to-r text-white ' + category.gradient
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  onMouseEnter={() => setActiveCategory(category.slug)}
                  onMouseLeave={() => setActiveCategory(null)}
                >
                  {category.icon}
                  <span>{category.name}</span>
                  {showProductCount && (
                    <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                      {category.productCount}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Categories Grid */}
      <div ref={categoriesRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {categories.map((category, index) => (
          <Link
            key={category.slug}
            href={`/${tenantSlug}/categories/${category.slug}`}
            className="group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            {/* Background Image */}
            <div className="aspect-[4/3] relative overflow-hidden">
              <img
                src={category.image}
                alt={category.name}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
              
              {/* Gradient Overlay */}
              <div className={`absolute inset-0 bg-gradient-to-br ${category.gradient} opacity-60 group-hover:opacity-70 transition-opacity`} />
              
              {/* Content */}
              <div className="absolute inset-0 p-6 flex flex-col justify-between text-white">
                <div className="flex items-start justify-between">
                  <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
                    {category.icon}
                  </div>
                  {showProductCount && (
                    <span className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-medium">
                      {category.productCount} products
                    </span>
                  )}
                </div>
                
                <div>
                  <h3 className="text-2xl font-bold mb-2">{category.name}</h3>
                  <p className="text-white/90 text-sm line-clamp-2">{category.description}</p>
                  
                  <div className="mt-4 flex items-center gap-2 text-sm font-medium">
                    <span>Shop Now</span>
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* View All Categories Link */}
      <div className="text-center mt-12">
        <Link
          href={`/${tenantSlug}/categories`}
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
        >
          View All Categories
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </Link>
      </div>
    </div>
  );
}