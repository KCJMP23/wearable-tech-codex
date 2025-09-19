'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

interface SearchInterfaceProps {
  initialQuery?: string;
  initialFilters?: any;
  tenantSlug: string;
}

export function SearchInterface({ initialQuery = '', initialFilters = {}, tenantSlug }: SearchInterfaceProps) {
  const [query, setQuery] = useState(initialQuery);
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    
    if (query.trim()) {
      params.set('q', query.trim());
    }
    
    // Preserve existing filters
    Object.entries(initialFilters).forEach(([key, value]) => {
      if (key !== 'q' && value) {
        params.set(key, String(value));
      }
    });

    const searchUrl = `/${tenantSlug}/search${params.toString() ? `?${params.toString()}` : ''}`;
    router.push(searchUrl);
  };

  return (
    <form onSubmit={handleSearch} className="relative">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for wearable tech products..."
          className="w-full pl-4 pr-12 py-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <button
          type="submit"
          className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          <MagnifyingGlassIcon className="w-5 h-5" />
        </button>
      </div>
    </form>
  );
}