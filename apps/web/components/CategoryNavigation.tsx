'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

interface Category {
  id: string;
  name: string;
  pinned?: boolean;
}

interface CategoryNavigationProps {
  categories: Category[];
  onCategoryChange?: (categoryId: string) => void;
}

export function CategoryNavigation({ categories, onCategoryChange }: CategoryNavigationProps) {
  const [selectedCategory, setSelectedCategory] = useState('featured');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const navigationRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);
  const [isSticky, setIsSticky] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  const handleScroll = useCallback(() => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      const maxScroll = scrollWidth - clientWidth;
      
      setShowLeftArrow(scrollLeft > 10);
      setShowRightArrow(scrollLeft < maxScroll - 10);
      
      // Calculate scroll progress for visual feedback
      const progress = maxScroll > 0 ? (scrollLeft / maxScroll) * 100 : 0;
      setScrollProgress(progress);
    }
  }, []);

  // Handle page scroll for sticky behavior
  const handlePageScroll = useCallback(() => {
    if (navigationRef.current) {
      const rect = navigationRef.current.getBoundingClientRect();
      const isCurrentlySticky = rect.top <= 0;
      setIsSticky(isCurrentlySticky);
    }
  }, []);

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      const scrollAmount = Math.min(200, scrollContainerRef.current.clientWidth * 0.8);
      scrollContainerRef.current.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      const scrollAmount = Math.min(200, scrollContainerRef.current.clientWidth * 0.8);
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const scrollToCategory = (categoryId: string) => {
    if (scrollContainerRef.current) {
      const categoryElement = scrollContainerRef.current.querySelector(`[data-category="${categoryId}"]`);
      if (categoryElement) {
        categoryElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center'
        });
      }
    }
  };

  const handleCategoryClick = (categoryId: string) => {
    setSelectedCategory(categoryId);
    onCategoryChange?.(categoryId);
    
    // Auto-scroll to category if it's not pinned
    const category = categories.find(c => c.id === categoryId);
    if (category && !category.pinned) {
      scrollToCategory(categoryId);
    }
  };

  useEffect(() => {
    handleScroll();
    
    // Add scroll listeners
    window.addEventListener('scroll', handlePageScroll, { passive: true });
    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    }
    
    return () => {
      window.removeEventListener('scroll', handlePageScroll);
      if (scrollContainer) {
        scrollContainer.removeEventListener('scroll', handleScroll);
      }
    };
  }, [handleScroll, handlePageScroll]);

  const pinnedCategories = categories.filter(c => c.pinned);
  const scrollableCategories = categories.filter(c => !c.pinned);

  return (
    <div 
      ref={navigationRef}
      className={`sticky top-0 z-40 transition-all duration-300 border-b border-gray-200 ${
        isSticky 
          ? 'bg-white/98 backdrop-blur-md shadow-lg' 
          : 'bg-white/95 backdrop-blur-sm shadow-sm'
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative flex items-center">
          {/* Scroll Progress Indicator */}
          <div className="absolute bottom-0 left-0 h-0.5 bg-blue-600 transition-all duration-300" 
               style={{ width: `${scrollProgress}%` }} />
          {/* Pinned Categories - Always Visible */}
          {pinnedCategories.length > 0 && (
            <div className="flex items-center border-r border-gray-200 pr-4 mr-2">
              {pinnedCategories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => handleCategoryClick(category.id)}
                  className={`relative px-4 py-4 font-medium text-sm whitespace-nowrap transition-all duration-200 group ${
                    selectedCategory === category.id
                      ? 'text-blue-600'
                      : 'text-gray-700 hover:text-gray-900'
                  }`}
                >
                  <span className="relative z-10">{category.name}</span>
                  {selectedCategory === category.id && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
                  )}
                  <div className="absolute inset-0 bg-blue-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                </button>
              ))}
            </div>
          )}

          {/* Horizontally Scrollable Categories */}
          <div className="relative flex-1 overflow-hidden">
            {/* Left Fade Gradient */}
            {showLeftArrow && (
              <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white to-transparent z-20 pointer-events-none" />
            )}
            
            {/* Left Scroll Button */}
            {showLeftArrow && (
              <button
                onClick={scrollLeft}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-30 bg-white/95 backdrop-blur-sm p-2 rounded-full shadow-lg hover:bg-white hover:shadow-xl border border-gray-200 transition-all duration-200 group"
                aria-label="Scroll left"
              >
                <ChevronLeftIcon className="h-4 w-4 text-gray-600 group-hover:text-gray-900" />
              </button>
            )}
            
            {/* Scrollable Container */}
            <div
              ref={scrollContainerRef}
              className="flex overflow-x-auto scrollbar-hide scroll-smooth px-2"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {scrollableCategories.map((category) => (
                <button
                  key={category.id}
                  data-category={category.id}
                  onClick={() => handleCategoryClick(category.id)}
                  className={`relative flex-shrink-0 px-4 py-4 font-medium text-sm whitespace-nowrap transition-all duration-200 group ${
                    selectedCategory === category.id
                      ? 'text-blue-600'
                      : 'text-gray-700 hover:text-gray-900'
                  }`}
                >
                  <span className="relative z-10">{category.name}</span>
                  {selectedCategory === category.id && (
                    <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-blue-600 rounded-full" />
                  )}
                  <div className="absolute inset-x-2 inset-y-1 bg-blue-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                </button>
              ))}
            </div>

            {/* Right Fade Gradient */}
            {showRightArrow && (
              <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent z-20 pointer-events-none" />
            )}
            
            {/* Right Scroll Button */}
            {showRightArrow && (
              <button
                onClick={scrollRight}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-30 bg-white/95 backdrop-blur-sm p-2 rounded-full shadow-lg hover:bg-white hover:shadow-xl border border-gray-200 transition-all duration-200 group"
                aria-label="Scroll right"
              >
                <ChevronRightIcon className="h-4 w-4 text-gray-600 group-hover:text-gray-900" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}