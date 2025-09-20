'use client';

import React, { useState, useEffect } from 'react';
import { Tab } from '@headlessui/react';
import { 
  SparklesIcon, 
  PuzzlePieceIcon, 
  StarIcon,
  ArrowDownTrayIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  CheckBadgeIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';

interface MarketplaceItem {
  id: string;
  name: string;
  description: string;
  category: string;
  author: string;
  rating: number;
  reviews: number;
  downloads: number;
  price: number;
  thumbnail: string;
  screenshots: string[];
  tags: string[];
  isInstalled?: boolean;
  isFeatured?: boolean;
  isVerified?: boolean;
}

export default function MarketplacePage({ params }: { params: { tenantSlug: string } }) {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'popular' | 'rating' | 'newest' | 'price'>('popular');
  const [themes, setThemes] = useState<MarketplaceItem[]>([]);
  const [plugins, setPlugins] = useState<MarketplaceItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMarketplaceItems();
  }, []);

  const loadMarketplaceItems = async () => {
    try {
      // Load themes
      const themesResponse = await fetch('/api/themes');
      const themesData = await themesResponse.json();
      
      // Load plugins
      const pluginsResponse = await fetch('/api/plugins');
      const pluginsData = await pluginsResponse.json();
      
      setThemes(themesData.themes || mockThemes);
      setPlugins(pluginsData.plugins || mockPlugins);
    } catch (error) {
      console.error('Error loading marketplace items:', error);
      setThemes(mockThemes);
      setPlugins(mockPlugins);
    } finally {
      setLoading(false);
    }
  };

  const mockThemes: MarketplaceItem[] = [
    {
      id: 'minimal',
      name: 'Minimal',
      description: 'Clean and minimalist design focused on content clarity',
      category: 'minimal',
      author: 'AffiliateOS',
      rating: 4.8,
      reviews: 234,
      downloads: 5432,
      price: 0,
      thumbnail: 'https://via.placeholder.com/400x300',
      screenshots: [],
      tags: ['minimal', 'clean', 'simple'],
      isFeatured: true,
      isVerified: true,
    },
    {
      id: 'magazine',
      name: 'Magazine',
      description: 'Editorial-style layout perfect for content-rich affiliate sites',
      category: 'magazine',
      author: 'AffiliateOS',
      rating: 4.9,
      reviews: 189,
      downloads: 4321,
      price: 0,
      thumbnail: 'https://via.placeholder.com/400x300',
      screenshots: [],
      tags: ['editorial', 'content', 'blog'],
      isFeatured: true,
      isVerified: true,
    },
    {
      id: 'boutique',
      name: 'Boutique',
      description: 'Elegant and sophisticated design for premium affiliate sites',
      category: 'boutique',
      author: 'AffiliateOS',
      rating: 4.7,
      reviews: 156,
      downloads: 3456,
      price: 0,
      thumbnail: 'https://via.placeholder.com/400x300',
      screenshots: [],
      tags: ['elegant', 'premium', 'luxury'],
      isFeatured: true,
      isVerified: true,
    },
  ];

  const mockPlugins: MarketplaceItem[] = [
    {
      id: 'seo-optimizer',
      name: 'SEO Optimizer Pro',
      description: 'Advanced SEO optimization with meta tags, sitemaps, and schema markup',
      category: 'seo',
      author: 'AffiliateOS',
      rating: 4.9,
      reviews: 567,
      downloads: 12345,
      price: 0,
      thumbnail: 'https://via.placeholder.com/400x300',
      screenshots: [],
      tags: ['seo', 'optimization', 'meta'],
      isFeatured: true,
      isVerified: true,
    },
    {
      id: 'analytics-dashboard',
      name: 'Advanced Analytics Dashboard',
      description: 'Real-time analytics with conversion tracking and visitor insights',
      category: 'analytics',
      author: 'AffiliateOS',
      rating: 4.8,
      reviews: 432,
      downloads: 9876,
      price: 0,
      thumbnail: 'https://via.placeholder.com/400x300',
      screenshots: [],
      tags: ['analytics', 'tracking', 'dashboard'],
      isFeatured: true,
      isVerified: true,
    },
    {
      id: 'email-capture',
      name: 'Email Capture Pro',
      description: 'Advanced email capture with exit intent and smart popups',
      category: 'marketing',
      author: 'ThirdPartyDev',
      rating: 4.6,
      reviews: 234,
      downloads: 6789,
      price: 29,
      thumbnail: 'https://via.placeholder.com/400x300',
      screenshots: [],
      tags: ['email', 'marketing', 'popups'],
      isVerified: true,
    },
  ];

  const handleInstall = async (item: MarketplaceItem, type: 'theme' | 'plugin') => {
    try {
      const endpoint = type === 'theme' ? '/api/themes/install' : '/api/plugins/install';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: params.tenantSlug,
          [`${type}_id`]: item.id,
        }),
      });

      if (response.ok) {
        // Update local state
        if (type === 'theme') {
          setThemes(themes.map(t => 
            t.id === item.id ? { ...t, isInstalled: true } : t
          ));
        } else {
          setPlugins(plugins.map(p => 
            p.id === item.id ? { ...p, isInstalled: true } : p
          ));
        }
      }
    } catch (error) {
      console.error('Installation failed:', error);
    }
  };

  const MarketplaceCard = ({ item, type }: { item: MarketplaceItem; type: 'theme' | 'plugin' }) => (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
      <div className="relative">
        <img 
          src={item.thumbnail} 
          alt={item.name}
          className="w-full h-48 object-cover"
        />
        {item.isFeatured && (
          <span className="absolute top-2 left-2 bg-yellow-500 text-white px-2 py-1 rounded text-xs font-bold">
            Featured
          </span>
        )}
        {item.price > 0 && (
          <span className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded text-xs font-bold">
            ${item.price}
          </span>
        )}
      </div>
      
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-lg font-bold flex items-center gap-1">
            {item.name}
            {item.isVerified && (
              <CheckBadgeIcon className="w-5 h-5 text-blue-500" />
            )}
          </h3>
        </div>
        
        <p className="text-gray-600 text-sm mb-3 line-clamp-2">{item.description}</p>
        
        <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
          <div className="flex items-center gap-1">
            <StarIconSolid className="w-4 h-4 text-yellow-500" />
            <span>{item.rating}</span>
            <span>({item.reviews})</span>
          </div>
          <div className="flex items-center gap-1">
            <ArrowDownTrayIcon className="w-4 h-4" />
            <span>{item.downloads.toLocaleString()}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2 mb-3">
          {item.tags.slice(0, 3).map((tag, i) => (
            <span key={i} className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">
              {tag}
            </span>
          ))}
        </div>
        
        <div className="flex gap-2">
          {item.isInstalled ? (
            <button className="flex-1 bg-gray-100 text-gray-600 px-4 py-2 rounded font-medium">
              Installed
            </button>
          ) : (
            <>
              <button 
                onClick={() => handleInstall(item, type)}
                className="flex-1 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 font-medium"
              >
                {item.price > 0 ? `Buy for $${item.price}` : 'Install'}
              </button>
              <button className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50">
                Preview
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );

  const categories = [
    { id: 'all', name: 'All', icon: SparklesIcon },
    { id: 'minimal', name: 'Minimal', icon: SparklesIcon },
    { id: 'magazine', name: 'Magazine', icon: SparklesIcon },
    { id: 'boutique', name: 'Boutique', icon: SparklesIcon },
    { id: 'professional', name: 'Professional', icon: SparklesIcon },
    { id: 'playful', name: 'Playful', icon: SparklesIcon },
  ];

  const pluginCategories = [
    { id: 'all', name: 'All', icon: PuzzlePieceIcon },
    { id: 'analytics', name: 'Analytics', icon: PuzzlePieceIcon },
    { id: 'marketing', name: 'Marketing', icon: PuzzlePieceIcon },
    { id: 'seo', name: 'SEO', icon: PuzzlePieceIcon },
    { id: 'social', name: 'Social', icon: PuzzlePieceIcon },
    { id: 'commerce', name: 'Commerce', icon: PuzzlePieceIcon },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Marketplace</h1>
          <p className="text-gray-600 mt-2">Discover themes and plugins to enhance your affiliate site</p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow mb-8 p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search themes and plugins..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="popular">Most Popular</option>
              <option value="rating">Highest Rated</option>
              <option value="newest">Newest</option>
              <option value="price">Price</option>
            </select>
          </div>
        </div>

        <Tab.Group>
          <Tab.List className="flex space-x-1 rounded-xl bg-blue-900/20 p-1 mb-8">
            <Tab
              className={({ selected }) =>
                `w-full rounded-lg py-2.5 text-sm font-medium leading-5
                ${selected
                  ? 'bg-white text-blue-700 shadow'
                  : 'text-blue-600 hover:bg-white/[0.12] hover:text-blue-800'
                }`
              }
            >
              <div className="flex items-center justify-center gap-2">
                <SparklesIcon className="w-5 h-5" />
                Themes
              </div>
            </Tab>
            <Tab
              className={({ selected }) =>
                `w-full rounded-lg py-2.5 text-sm font-medium leading-5
                ${selected
                  ? 'bg-white text-blue-700 shadow'
                  : 'text-blue-600 hover:bg-white/[0.12] hover:text-blue-800'
                }`
              }
            >
              <div className="flex items-center justify-center gap-2">
                <PuzzlePieceIcon className="w-5 h-5" />
                Plugins
              </div>
            </Tab>
          </Tab.List>
          
          <Tab.Panels>
            <Tab.Panel>
              {/* Theme Categories */}
              <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-4 py-2 rounded-lg whitespace-nowrap ${
                      selectedCategory === cat.id
                        ? 'bg-blue-500 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
              
              {/* Themes Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {themes
                  .filter(theme => 
                    selectedCategory === 'all' || theme.category === selectedCategory
                  )
                  .filter(theme =>
                    theme.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    theme.description.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((theme) => (
                    <MarketplaceCard key={theme.id} item={theme} type="theme" />
                  ))}
              </div>
            </Tab.Panel>
            
            <Tab.Panel>
              {/* Plugin Categories */}
              <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                {pluginCategories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-4 py-2 rounded-lg whitespace-nowrap ${
                      selectedCategory === cat.id
                        ? 'bg-blue-500 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
              
              {/* Plugins Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {plugins
                  .filter(plugin => 
                    selectedCategory === 'all' || plugin.category === selectedCategory
                  )
                  .filter(plugin =>
                    plugin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    plugin.description.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((plugin) => (
                    <MarketplaceCard key={plugin.id} item={plugin} type="plugin" />
                  ))}
              </div>
            </Tab.Panel>
          </Tab.Panels>
        </Tab.Group>
      </div>
    </div>
  );
}