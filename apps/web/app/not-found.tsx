'use client';

import Link from 'next/link';
import { Home, Search, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-gray-200">404</h1>
          <div className="mt-4">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Page Not Found
            </h2>
            <p className="text-gray-600">
              The page you're looking for doesn't exist or has been moved.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <Link
            href="/"
            className="flex items-center justify-center space-x-2 w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Home className="w-5 h-5" />
            <span>Go to Homepage</span>
          </Link>

          <Link
            href="/products"
            className="flex items-center justify-center space-x-2 w-full px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            <Search className="w-5 h-5" />
            <span>Browse Products</span>
          </Link>

          <button
            onClick={() => window.history.back()}
            className="flex items-center justify-center space-x-2 w-full px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Go Back</span>
          </button>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            If you believe this is a mistake, please{' '}
            <Link href="/contact" className="text-blue-600 hover:text-blue-700 underline">
              contact us
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}