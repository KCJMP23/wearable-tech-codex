'use client';

import { useState } from 'react';
import Image from 'next/image';
import { cn } from '@affiliate-factory/ui/src/lib/utils';

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
  quality = 75,
  placeholder = 'empty',
  blurDataURL,
  onLoadingComplete,
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  const handleLoad = () => {
    setIsLoading(false);
    onLoadingComplete?.();
  };

  const handleError = () => {
    setError(true);
    setIsLoading(false);
  };

  // Fallback image
  const fallbackSrc = '/images/placeholder.png';

  if (error) {
    return (
      <div className={cn('bg-gray-200 flex items-center justify-center', className)}>
        <span className="text-gray-500 text-sm">Image not available</span>
      </div>
    );
  }

  if (fill) {
    return (
      <div className={cn('relative', className)}>
        {isLoading && (
          <div className="absolute inset-0 bg-gray-200 animate-pulse" />
        )}
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes || '100vw'}
          quality={quality}
          priority={priority}
          placeholder={placeholder}
          blurDataURL={blurDataURL}
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
    <div className={cn('relative', className)}>
      {isLoading && (
        <div 
          className="absolute inset-0 bg-gray-200 animate-pulse"
          style={{ width, height }}
        />
      )}
      <Image
        src={src}
        alt={alt}
        width={width || 500}
        height={height || 500}
        quality={quality}
        priority={priority}
        placeholder={placeholder}
        blurDataURL={blurDataURL}
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