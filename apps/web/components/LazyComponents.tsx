/**
 * Lazy-loaded component wrappers for code splitting
 * Reduces initial bundle size by loading components only when needed
 */

import dynamic from 'next/dynamic';
import { Suspense } from 'react';

// Loading skeletons for different component types
const ProductSkeleton = () => (
  <div className="animate-pulse">
    <div className="bg-gray-200 h-64 rounded-lg mb-4" />
    <div className="bg-gray-200 h-4 w-3/4 rounded mb-2" />
    <div className="bg-gray-200 h-4 w-1/2 rounded" />
  </div>
);

const QuizSkeleton = () => (
  <div className="animate-pulse">
    <div className="bg-gray-200 h-12 rounded-lg mb-4" />
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-gray-200 h-10 rounded" />
      ))}
    </div>
  </div>
);

const ReviewSkeleton = () => (
  <div className="animate-pulse space-y-4">
    {[1, 2, 3].map((i) => (
      <div key={i} className="border rounded-lg p-4">
        <div className="bg-gray-200 h-4 w-1/4 rounded mb-2" />
        <div className="bg-gray-200 h-20 rounded" />
      </div>
    ))}
  </div>
);

// Lazy-loaded components with loading states
export const LazyProductReviews = dynamic(
  () => import('./ProductReviews').then((mod) => mod.ProductReviews),
  {
    loading: () => <ReviewSkeleton />,
    ssr: false, // Disable SSR for heavy client components
  }
);

export const LazyProductComparison = dynamic(
  () => import('./ProductComparison').then((mod) => mod.ProductComparison),
  {
    loading: () => <ProductSkeleton />,
    ssr: true, // Keep SSR for SEO-important content
  }
);

export const LazyQuizWidget = dynamic(
  () => import('./QuizWidget').then((mod) => mod.QuizWidget),
  {
    loading: () => <QuizSkeleton />,
    ssr: false,
  }
);

export const LazyNewsletterSignup = dynamic(
  () => import('./NewsletterSignup').then((mod) => mod.NewsletterSignup),
  {
    loading: () => (
      <div className="animate-pulse bg-gray-200 h-32 rounded-lg" />
    ),
    ssr: false,
  }
);

export const LazyShareButtons = dynamic(
  () => import('./ShareButtons').then((mod) => mod.ShareButtons),
  {
    loading: () => (
      <div className="flex space-x-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse bg-gray-200 w-8 h-8 rounded-full" />
        ))}
      </div>
    ),
    ssr: false,
  }
);

export const LazyRelatedProducts = dynamic(
  () => import('./RelatedProducts').then((mod) => mod.RelatedProducts),
  {
    loading: () => (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <ProductSkeleton key={i} />
        ))}
      </div>
    ),
    ssr: true,
  }
);

export const LazyProductGallery = dynamic(
  () => import('./ProductGallery').then((mod) => mod.ProductGallery),
  {
    loading: () => (
      <div className="animate-pulse bg-gray-200 h-96 rounded-lg" />
    ),
    ssr: true,
  }
);

// Advanced lazy loading with prefetch on hover/focus
export const LazyWithPrefetch = ({
  loader,
  children,
  onHover = true,
  onFocus = true,
}: {
  loader: () => Promise<any>;
  children: React.ReactNode;
  onHover?: boolean;
  onFocus?: boolean;
}) => {
  const prefetch = () => {
    loader();
  };

  return (
    <div
      onMouseEnter={onHover ? prefetch : undefined}
      onFocus={onFocus ? prefetch : undefined}
    >
      {children}
    </div>
  );
};

// Suspense boundary wrapper with error handling
export const SuspenseBoundary = ({
  children,
  fallback,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) => {
  return (
    <Suspense
      fallback={
        fallback || (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
          </div>
        )
      }
    >
      {children}
    </Suspense>
  );
};

// Progressive enhancement wrapper
export const ProgressiveEnhancement = ({
  fallback,
  enhanced,
  ssrOnly = false,
}: {
  fallback: React.ReactNode;
  enhanced: React.ReactNode;
  ssrOnly?: boolean;
}) => {
  if (ssrOnly && typeof window !== 'undefined') {
    return <>{fallback}</>;
  }
  
  return (
    <Suspense fallback={<>{fallback}</>}>
      {enhanced}
    </Suspense>
  );
};