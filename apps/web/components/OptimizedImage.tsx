'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { cn } from '@affiliate-factory/ui/src/lib/utils';
import { imageConfig } from '../config/performance';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  fill?: boolean;
  sizes?: string;
  quality?: number;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  onLoadingComplete?: () => void;
  variant?: 'thumbnail' | 'card' | 'hero' | 'product';
  lazy?: boolean;
  loading?: 'lazy' | 'eager';
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
  fill = false,
  sizes,
  quality,
  placeholder = 'empty',
  blurDataURL,
  onLoadingComplete,
  variant = 'card',
  lazy = true,
  loading,
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isInView, setIsInView] = useState(!lazy || priority);
  const imageRef = useRef<HTMLDivElement>(null);

  // Get optimized quality based on variant
  const imageQuality = quality || imageConfig.quality[variant] || imageConfig.quality.default;
  
  // Get optimized sizes based on variant
  const imageSizes = sizes || imageConfig.sizes[variant] || imageConfig.sizes.card;

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!lazy || priority || isInView) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: imageConfig.lazyLoading.rootMargin,
        threshold: imageConfig.lazyLoading.threshold,
      }
    );

    if (imageRef.current) {
      observer.observe(imageRef.current);
    }

    return () => observer.disconnect();
  }, [lazy, priority, isInView]);

  const handleLoad = () => {
    setIsLoading(false);
    onLoadingComplete?.();
  };

  const handleError = () => {
    setError(true);
    setIsLoading(false);
  };

  // Fallback image
  const fallbackSrc = '/images/placeholder.webp';

  if (error) {
    return (
      <div className={cn('bg-gray-200 flex items-center justify-center', className)}>
        <span className="text-gray-500 text-sm">Image not available</span>
      </div>
    );
  }

  if (!isInView) {
    return (
      <div 
        ref={imageRef}
        className={cn('bg-gray-200 animate-pulse', className)}
        style={{ width: width || '100%', height: height || 'auto' }}
      />
    );
  }

  if (fill) {
    return (
      <div ref={imageRef} className={cn('relative', className)}>
        {isLoading && (
          <div className="absolute inset-0 bg-gray-200 animate-pulse" />
        )}
        <Image
          src={error ? fallbackSrc : src}
          alt={alt}
          fill
          sizes={imageSizes}
          quality={imageQuality}
          priority={priority}
          placeholder={placeholder}
          blurDataURL={blurDataURL}
          loading={loading || (priority ? 'eager' : 'lazy')}
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            'object-cover transition-opacity duration-300',
            isLoading ? 'opacity-0' : 'opacity-100'
          )}
        />
      </div>
    );
  }

  return (
    <div ref={imageRef} className={cn('relative', className)}>
      {isLoading && (
        <div 
          className="absolute inset-0 bg-gray-200 animate-pulse"
          style={{ width, height }}
        />
      )}
      <Image
        src={error ? fallbackSrc : src}
        alt={alt}
        width={width || 500}
        height={height || 500}
        quality={imageQuality}
        priority={priority}
        placeholder={placeholder}
        blurDataURL={blurDataURL}
        sizes={imageSizes}
        loading={loading || (priority ? 'eager' : 'lazy')}
        onLoad={handleLoad}
        onError={handleError}
        className={cn(
          'transition-opacity duration-300',
          isLoading ? 'opacity-0' : 'opacity-100'
        )}
      />
    </div>
  );
}

// Lazy load wrapper for non-critical images
export function LazyImage(props: OptimizedImageProps) {
  return <OptimizedImage {...props} priority={false} />;
}

// Product image with zoom functionality
export function ProductImage({
  src,
  alt,
  ...props
}: OptimizedImageProps & { enableZoom?: boolean }) {
  const [isZoomed, setIsZoomed] = useState(false);

  return (
    <div className="relative group cursor-zoom-in">
      <OptimizedImage
        src={src}
        alt={alt}
        {...props}
        className={cn(
          props.className,
          'transition-transform duration-300',
          isZoomed && 'scale-150'
        )}
      />
      <button
        onClick={() => setIsZoomed(!isZoomed)}
        className="absolute top-2 right-2 bg-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label={isZoomed ? 'Zoom out' : 'Zoom in'}
      >
        {isZoomed ? '−' : '+'}
      </button>
    </div>
  );
}