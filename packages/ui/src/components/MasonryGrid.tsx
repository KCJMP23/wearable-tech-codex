'use client';

import type { ReactNode } from 'react';

interface MasonryGridProps {
  columns?: number;
  gap?: string;
  children: ReactNode;
}

export function MasonryGrid({ columns = 3, gap = '1.5rem', children }: MasonryGridProps) {
  return (
    <div
      className="masonry-grid"
      style={{
        columnCount: columns,
        columnGap: gap
      }}
    >
      {children}
      <style jsx>{`
        .masonry-grid > * {
          break-inside: avoid;
          margin-bottom: ${gap};
        }
        @media (max-width: 1024px) {
          .masonry-grid {
            column-count: ${Math.max(1, columns - 1)};
          }
        }
        @media (max-width: 640px) {
          .masonry-grid {
            column-count: 1;
          }
        }
      `}</style>
    </div>
  );
}
