'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ClientOnboarding() {
  const router = useRouter();
  const [niche, setNiche] = useState('');
  const [siteName, setSiteName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!niche.trim()) {
      setError('Please enter a niche to continue');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          brandName: siteName || `${niche.charAt(0).toUpperCase() + niche.slice(1)} Hub`,
          domain: siteName ? siteName.toLowerCase().replace(/[^a-z0-9]/g, '-') : niche.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          theme: 'modern',
          primaryColor: '#7c3aed',
          tagline: `Your trusted source for ${niche} recommendations`,
          primaryNiche: niche,
          targetAudience: 'General consumers',
          priceRange: 'all',
          contentTypes: ['reviews', 'comparisons', 'guides'],
          publishingFrequency: 'weekly',
          productImportMethod: 'ai-generate',
          initialProductCount: '25'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create site');
      }

      const result = await response.json();
      
      // Ensure loading state is cleared before navigation
      setIsLoading(false);
      
      // Use window.location for immediate navigation
      console.log('Redirecting to platform-dashboard...');
      window.location.href = '/platform-dashboard';
    } catch (err) {
      setError('Failed to create your site. Please try again.');
      console.error('Onboarding error:', err);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Create Your Affiliate Site
          </h1>
          <p className="text-xl text-gray-600">
            Launch a fully autonomous affiliate business in minutes
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-semibold mb-6">Choose Your Niche</h2>
          
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                What niche would you like to build?
              </label>
              <input
                type="text"
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                placeholder="e.g., Pet supplies, Home decor, Golf equipment..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Site Name (Optional)
              </label>
              <input
                type="text"
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                placeholder="We'll suggest one based on your niche"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <button 
              onClick={handleSubmit}
              disabled={isLoading || !niche.trim()}
              className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Creating Your Site...' : 'Continue to Setup'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link href="/" className="text-purple-600 hover:text-purple-700">
            ← Back to Platform
          </Link>
        </div>
      </div>
    </div>
  );
}