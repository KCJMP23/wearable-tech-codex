'use client';
import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { twMerge } from 'tailwind-merge';

export interface MasonryGridProps {
  children: React.ReactNode;
  columns?: number;
  gap?: number;
  className?: string;
  itemClassName?: string;
  responsive?: {
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
}

export function MasonryGrid({
  children,
  columns = 3,
  gap = 16,
  className,
  itemClassName,
  responsive = {
    sm: 1,
    md: 2,
    lg: 3,
    xl: 4,
  },
}: MasonryGridProps) {
  const [currentColumns, setCurrentColumns] = useState(columns);
  const containerRef = useRef<HTMLDivElement>(null);

  // Responsive column calculation
  useEffect(() => {
    const updateColumns = () => {
      if (!containerRef.current) return;

      const width = containerRef.current.offsetWidth;
      
      if (width < 640) {
        setCurrentColumns(responsive.sm || 1);
      } else if (width < 768) {
        setCurrentColumns(responsive.md || 2);
      } else if (width < 1024) {
        setCurrentColumns(responsive.lg || 3);
      } else {
        setCurrentColumns(responsive.xl || columns);
      }
    };

    updateColumns();
    
    const resizeObserver = new ResizeObserver(updateColumns);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, [columns, responsive]);

  // Convert children to array for processing
  const childrenArray = React.Children.toArray(children);

  // Create column arrays
  const columnArrays: React.ReactNode[][] = Array.from(
    { length: currentColumns },
    () => []
  );

  // Distribute children across columns
  childrenArray.forEach((child, index) => {
    const columnIndex = index % currentColumns;
    columnArrays[columnIndex].push(child);
  });

  return (
    <div
      ref={containerRef}
      className={twMerge('flex', className)}
      style={{ gap: `${gap}px` }}
    >
      {columnArrays.map((columnChildren, columnIndex) => (
        <div
          key={columnIndex}
          className="flex-1 flex flex-col"
          style={{ gap: `${gap}px` }}
        >
          {columnChildren.map((child, childIndex) => (
            <div
              key={`${columnIndex}-${childIndex}`}
              className={twMerge('break-inside-avoid', itemClassName)}
            >
              {child}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// CSS-based masonry grid (simpler but less control)
export interface CSSMasonryGridProps {
  children: React.ReactNode;
  columns?: number;
  gap?: number;
  className?: string;
  itemClassName?: string;
}

export function CSSMasonryGrid({
  children,
  columns = 3,
  gap = 16,
  className,
  itemClassName,
}: CSSMasonryGridProps) {
  const columnStyle = {
    columnCount: columns,
    columnGap: `${gap}px`,
  };

  return (
    <div
      className={twMerge('w-full', className)}
      style={columnStyle}
    >
      {React.Children.map(children, (child, index) => (
        <div
          key={index}
          className={twMerge('break-inside-avoid', itemClassName)}
          style={{ marginBottom: `${gap}px` }}
        >
          {child}
        </div>
      ))}
    </div>
  );
}

// Pinterest-style masonry with infinite loading
export interface PinterestMasonryProps extends MasonryGridProps {
  onLoadMore?: () => void;
  hasMore?: boolean;
  loading?: boolean;
  loadingComponent?: React.ReactNode;
}

export function PinterestMasonry({
  children,
  columns = 3,
  gap = 16,
  className,
  itemClassName,
  responsive,
  onLoadMore,
  hasMore = false,
  loading = false,
  loadingComponent,
  ...props
}: PinterestMasonryProps) {
  const observerRef = useRef<HTMLDivElement>(null);

  // Infinite scroll observer
  useEffect(() => {
    if (!hasMore || loading || !onLoadMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMore();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '100px',
      }
    );

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loading, onLoadMore]);

  const defaultLoadingComponent = (
    <div className="flex justify-center items-center py-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-500"></div>
    </div>
  );

  return (
    <div className={className}>
      <MasonryGrid
        columns={columns}
        gap={gap}
        itemClassName={itemClassName}
        responsive={responsive}
        {...props}
      >
        {children}
      </MasonryGrid>

      {/* Loading trigger */}
      {hasMore && (
        <div ref={observerRef} className="w-full">
          {loading && (loadingComponent || defaultLoadingComponent)}
        </div>
      )}
    </div>
  );
}

// Auto-sizing masonry grid
export interface AutoMasonryGridProps {
  children: React.ReactNode;
  minItemWidth: number;
  gap?: number;
  className?: string;
  itemClassName?: string;
}

export function AutoMasonryGrid({
  children,
  minItemWidth,
  gap = 16,
  className,
  itemClassName,
}: AutoMasonryGridProps) {
  const [columns, setColumns] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateColumns = () => {
      if (!containerRef.current) return;

      const containerWidth = containerRef.current.offsetWidth;
      const availableWidth = containerWidth - gap;
      const itemWidthWithGap = minItemWidth + gap;
      const calculatedColumns = Math.max(1, Math.floor(availableWidth / itemWidthWithGap));
      
      setColumns(calculatedColumns);
    };

    updateColumns();

    const resizeObserver = new ResizeObserver(updateColumns);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, [minItemWidth, gap]);

  return (
    <div ref={containerRef} className={className}>
      <MasonryGrid
        columns={columns}
        gap={gap}
        itemClassName={itemClassName}
      >
        {children}
      </MasonryGrid>
    </div>
  );
}

// Usage examples:
/*
// Basic masonry grid
<MasonryGrid columns={3} gap={20}>
  <Card>Item 1</Card>
  <Card>Item 2</Card>
  <Card>Item 3</Card>
</MasonryGrid>

// Responsive masonry grid
<MasonryGrid
  columns={4}
  gap={16}
  responsive={{
    sm: 1,
    md: 2,
    lg: 3,
    xl: 4
  }}
>
  {items.map(item => (
    <ProductCard key={item.id} product={item} />
  ))}
</MasonryGrid>

// Pinterest-style with infinite loading
<PinterestMasonry
  columns={3}
  gap={20}
  onLoadMore={loadMoreItems}
  hasMore={hasMoreItems}
  loading={isLoading}
>
  {posts.map(post => (
    <BlogCard key={post.id} post={post} />
  ))}
</PinterestMasonry>

// Auto-sizing based on item width
<AutoMasonryGrid minItemWidth={250} gap={16}>
  {products.map(product => (
    <ProductCardPremium key={product.id} product={product} />
  ))}
</AutoMasonryGrid>

// CSS-based for simpler layouts
<CSSMasonryGrid columns={3} gap={16}>
  {images.map(image => (
    <img key={image.id} src={image.url} alt={image.alt} />
  ))}
</CSSMasonryGrid>
*/
