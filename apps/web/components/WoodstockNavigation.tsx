'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Bars3Icon, XMarkIcon, ChevronDownIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

interface NavigationProps {
  tenantSlug: string;
  tenantName: string;
}

const navigationItems = [
  {
    name: 'Shop',
    href: '/products',
    hasDropdown: true,
    hasMegaMenu: true,
    dropdownItems: [
      { 
        name: 'All Products', 
        href: '/products',
        description: 'Browse our complete collection',
        image: 'https://images.unsplash.com/photo-1544717297-fa95b6ee9643?w=200&h=150&fit=crop'
      },
      { 
        name: 'Smartwatches', 
        href: '/products?category=smartwatches',
        description: 'Feature-rich wearables',
        image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&h=150&fit=crop'
      },
      { 
        name: 'Fitness Trackers', 
        href: '/products?category=fitness-trackers',
        description: 'Track your workouts',
        image: 'https://images.unsplash.com/photo-1576243345690-4e4b79b63288?w=200&h=150&fit=crop'
      },
      { 
        name: 'Health Monitors', 
        href: '/products?category=health-monitors',
        description: 'Monitor vital signs',
        image: 'https://images.unsplash.com/photo-1559757175-0eb30cd8c063?w=200&h=150&fit=crop'
      },
      { 
        name: 'Smart Rings', 
        href: '/products?category=smart-rings',
        description: 'Discreet health tracking',
        image: 'https://images.unsplash.com/photo-1608481337062-4093bf3ed404?w=200&h=150&fit=crop'
      },
      { 
        name: 'Accessories', 
        href: '/products?category=accessories',
        description: 'Bands, chargers & more',
        image: 'https://images.unsplash.com/photo-1434494878577-86c23bcb06b9?w=200&h=150&fit=crop'
      },
    ]
  },
  {
    name: 'Collections',
    href: '/collections',
    hasDropdown: true,
    dropdownItems: [
      { name: 'Best Sellers', href: '/collections/best-sellers' },
      { name: 'New Arrivals', href: '/collections/new-arrivals' },
      { name: 'Under $100', href: '/collections/under-100' },
      { name: 'Premium Tech', href: '/collections/premium' },
    ]
  },
  {
    name: 'Guides',
    href: '/blog',
    hasDropdown: true,
    dropdownItems: [
      { name: 'Buying Guides', href: '/blog?category=guides' },
      { name: 'Reviews', href: '/blog?category=reviews' },
      { name: 'Comparisons', href: '/blog?category=comparisons' },
      { name: 'Health Tips', href: '/blog?category=health' },
    ]
  },
  {
    name: 'About',
    href: '/about',
  }
];

// Sample search suggestions (in a real app, this would come from an API)
const searchSuggestions = [
  { id: '1', name: 'Apple Watch Series 9', category: 'Smartwatches', url: '/products/apple-watch-series-9' },
  { id: '2', name: 'Fitbit Charge 6', category: 'Fitness Trackers', url: '/products/fitbit-charge-6' },
  { id: '3', name: 'Oura Ring Gen3', category: 'Smart Rings', url: '/products/oura-ring-gen3' },
  { id: '4', name: 'Garmin Forerunner 965', category: 'GPS Watches', url: '/products/garmin-forerunner-965' },
  { id: '5', name: 'Samsung Galaxy Watch 6', category: 'Smartwatches', url: '/products/samsung-galaxy-watch-6' },
  { id: '6', name: 'Whoop 4.0', category: 'Health Monitors', url: '/products/whoop-4' },
];

export function WoodstockNavigation({ tenantSlug, tenantName }: NavigationProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Filter search suggestions based on query
  const filteredSuggestions = searchQuery.length > 1 
    ? searchSuggestions.filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 5)
    : [];

  const handleSearchFocus = () => {
    setShowSearchResults(true);
  };

  const handleSearchBlur = () => {
    // Delay hiding to allow click on suggestions
    setTimeout(() => setShowSearchResults(false), 200);
  };

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link href={`/${tenantSlug}`} className="text-2xl font-bold text-gray-900">
              {tenantName}
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-8">
              {navigationItems.map((item) => (
                <div
                  key={item.name}
                  className="relative"
                  onMouseEnter={() => item.hasDropdown && setActiveDropdown(item.name)}
                  onMouseLeave={() => setActiveDropdown(null)}
                >
                  <Link
                    href={`/${tenantSlug}${item.href}`}
                    className="text-gray-900 hover:text-gray-600 px-3 py-2 text-sm font-medium flex items-center transition-colors duration-200"
                  >
                    {item.name}
                    {item.hasDropdown && (
                      <ChevronDownIcon className="ml-1 h-4 w-4" />
                    )}
                  </Link>

                  {/* Dropdown Menu */}
                  {item.hasDropdown && activeDropdown === item.name && (
                    <div className={`absolute top-full left-0 mt-1 bg-white rounded-lg shadow-xl ring-1 ring-black ring-opacity-5 z-50 ${
                      item.hasMegaMenu ? 'w-[600px] -left-32' : 'w-56'
                    }`}>
                      {item.hasMegaMenu ? (
                        <div className="p-6">
                          <div className="grid grid-cols-2 gap-4">
                            {item.dropdownItems?.map((dropdownItem) => (
                              <Link
                                key={dropdownItem.name}
                                href={`/${tenantSlug}${dropdownItem.href}`}
                                className="group flex items-start space-x-4 p-3 rounded-lg hover:bg-gray-50 transition-all duration-200"
                              >
                                <div className="flex-shrink-0">
                                  <img
                                    src={dropdownItem.image}
                                    alt={dropdownItem.name}
                                    className="w-16 h-12 object-cover rounded-md group-hover:scale-105 transition-transform duration-200"
                                  />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium text-gray-900 group-hover:text-blue-600">
                                    {dropdownItem.name}
                                  </div>
                                  <div className="text-xs text-gray-500 mt-1">
                                    {dropdownItem.description}
                                  </div>
                                </div>
                              </Link>
                            ))}
                          </div>
                          
                          {/* Featured Section */}
                          <div className="mt-6 pt-6 border-t border-gray-200">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="text-sm font-semibold text-gray-900">Popular This Week</h4>
                                <p className="text-xs text-gray-500">Most viewed products</p>
                              </div>
                              <Link
                                href={`/${tenantSlug}/collections/trending`}
                                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                              >
                                View All →
                              </Link>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="py-1">
                          {item.dropdownItems?.map((dropdownItem) => (
                            <Link
                              key={dropdownItem.name}
                              href={`/${tenantSlug}${dropdownItem.href}`}
                              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-200"
                            >
                              {dropdownItem.name}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Search and CTA */}
          <div className="hidden md:flex items-center space-x-4">
            {/* Search Box */}
            <div className="relative">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={handleSearchFocus}
                  onBlur={handleSearchBlur}
                  className="w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>

              {/* Search Results Dropdown */}
              {showSearchResults && (searchQuery.length > 1 || searchQuery.length === 0) && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-80 overflow-y-auto">
                  {filteredSuggestions.length > 0 ? (
                    <div className="py-2">
                      {filteredSuggestions.map((suggestion) => (
                        <Link
                          key={suggestion.id}
                          href={`/${tenantSlug}${suggestion.url}`}
                          className="block px-4 py-3 hover:bg-gray-50 transition-colors duration-150"
                          onClick={() => setShowSearchResults(false)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {suggestion.name}
                              </div>
                              <div className="text-xs text-gray-500">
                                {suggestion.category}
                              </div>
                            </div>
                            <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
                          </div>
                        </Link>
                      ))}
                      <div className="border-t border-gray-100 pt-2 pb-1">
                        <Link
                          href={`/${tenantSlug}/products?q=${encodeURIComponent(searchQuery)}`}
                          className="block px-4 py-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                          onClick={() => setShowSearchResults(false)}
                        >
                          View all results for "{searchQuery}" →
                        </Link>
                      </div>
                    </div>
                  ) : searchQuery.length > 1 ? (
                    <div className="py-4 px-4 text-sm text-gray-500 text-center">
                      No products found for "{searchQuery}"
                    </div>
                  ) : (
                    <div className="py-2">
                      <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Popular Searches
                      </div>
                      {searchSuggestions.slice(0, 3).map((suggestion) => (
                        <Link
                          key={suggestion.id}
                          href={`/${tenantSlug}${suggestion.url}`}
                          className="block px-4 py-3 hover:bg-gray-50 transition-colors duration-150"
                          onClick={() => setShowSearchResults(false)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {suggestion.name}
                              </div>
                              <div className="text-xs text-gray-500">
                                {suggestion.category}
                              </div>
                            </div>
                            <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <Link
              href={`/${tenantSlug}/quiz`}
              className="bg-gray-900 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-gray-800 transition-colors duration-200"
            >
              Find My Device
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-gray-900 hover:text-gray-600 p-2 transition-colors"
              aria-label="Toggle mobile menu"
              aria-expanded={mobileMenuOpen}
              data-testid="mobile-menu"
            >
              {mobileMenuOpen ? (
                <XMarkIcon className="h-6 w-6" aria-hidden="true" />
              ) : (
                <Bars3Icon className="h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-200">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {navigationItems.map((item) => (
              <div key={item.name}>
                <Link
                  href={`/${tenantSlug}${item.href}`}
                  className="block px-3 py-2 text-base font-medium text-gray-900 hover:text-gray-600 hover:bg-gray-50 rounded-md transition-colors duration-200"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
                {item.hasDropdown && item.dropdownItems && (
                  <div className="ml-4 mt-1 space-y-1">
                    {item.dropdownItems.map((dropdownItem) => (
                      <Link
                        key={dropdownItem.name}
                        href={`/${tenantSlug}${dropdownItem.href}`}
                        className="block px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors duration-200"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        {dropdownItem.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div className="pt-4 border-t border-gray-200 mt-4">
              <Link
                href={`/${tenantSlug}/quiz`}
                className="block w-full text-center bg-gray-900 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-gray-800 transition-colors duration-200"
                onClick={() => setMobileMenuOpen(false)}
              >
                Find My Device
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}