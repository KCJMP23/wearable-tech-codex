'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function OnboardingPage() {
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
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                What niche would you like to build?
              </label>
              <input
                type="text"
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
                placeholder="We'll suggest one based on your niche"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <button className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2">
              Continue to Setup
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