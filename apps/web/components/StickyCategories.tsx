'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { createBrowserClient } from '@supabase/ssr';

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  image_url: string;
  color_gradient?: string;
  display_order: number;
  is_active: boolean;
}

interface StickyCategoriesProps {
  tenantSlug: string;
  tenantId: string;
}

export function StickyCategories({ tenantSlug, tenantId }: StickyCategoriesProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isSticky, setIsSticky] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const fetchCategories = async () => {
      const { data, error } = await supabase
        .from('category_cards')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (!error && data) {
        setCategories(data);
      }
      setLoading(false);
    };

    fetchCategories();
  }, [tenantId]);

  useEffect(() => {
    const handleScroll = () => {
      if (!sectionRef.current || !containerRef.current) return;

      const section = sectionRef.current;
      const container = containerRef.current;
      const sectionTop = section.offsetTop;
      const sectionHeight = section.offsetHeight;
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;

      // Check if section is in viewport and should be sticky with smoother transitions
      const sectionInView = scrollY >= sectionTop - 100 && scrollY <= sectionTop + sectionHeight - windowHeight;
      setIsSticky(sectionInView);

      if (sectionInView) {
        // Calculate scroll progress within the section with easing
        const scrollWithinSection = scrollY - (sectionTop - 100);
        const maxScroll = sectionHeight - windowHeight + 100;
        let progress = Math.min(Math.max(scrollWithinSection / maxScroll, 0), 1);
        
        // Apply easing function for smoother motion
        progress = progress < 0.5 
          ? 2 * progress * progress 
          : -1 + (4 - 2 * progress) * progress;
        
        setScrollProgress(progress);

        // Calculate horizontal translation
        const containerWidth = container.scrollWidth;
        const viewportWidth = container.offsetWidth;
        const maxTranslate = containerWidth - viewportWidth;
        const translateX = -progress * maxTranslate;

        container.style.transform = `translateX(${translateX}px)`;
      } else {
        container.style.transform = 'translateX(0)';
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial check

    return () => window.removeEventListener('scroll', handleScroll);
  }, [categories.length]);

  if (loading) {
    return (
      <section className="relative bg-gray-50 h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading categories...</div>
      </section>
    );
  }

  if (categories.length === 0) {
    return null; // Don't render section if no categories
  }

  return (
    <section 
      ref={sectionRef}
      className="relative bg-gray-50"
      style={{ height: '200vh' }} // Adjusted height for smoother transition
    >
      <div 
        className={`${isSticky ? 'sticky top-0' : ''} h-screen flex flex-col justify-center overflow-hidden transition-opacity duration-300`}
        style={{ opacity: isSticky ? 1 : 0.95 }}
      >
        {/* Header */}
        <div className="text-center mb-12 px-4">
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">
            Power Your Life
          </p>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold">
            Your Tech Essentials, All in{' '}
            <span className="text-blue-500">One</span>{' '}
            <span className="text-red-500">Place</span>.
          </h2>
        </div>

        {/* Categories Container */}
        <div className="relative overflow-hidden">
          <div 
            ref={containerRef}
            className="flex gap-6 transition-transform duration-300 ease-out pl-[60vw]"
            style={{ willChange: 'transform' }}
          >
            {categories.map((category, index) => (
              <Link
                key={category.slug}
                href={`/${tenantSlug}/categories/${category.slug}`}
                className="flex-shrink-0 group relative"
              >
                <div 
                  className={`relative w-80 h-[70vh] max-h-[600px] rounded-2xl overflow-hidden shadow-lg transform transition-all duration-300 hover:scale-105 hover:shadow-xl`}
                >
                  {/* Full Background Image */}
                  <div className="absolute inset-0">
                    <Image
                      src={category.image_url}
                      alt={category.name}
                      fill
                      className="object-cover transform transition-transform duration-300 group-hover:scale-110"
                      sizes="(max-width: 768px) 320px, 320px"
                    />
                  </div>

                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                  {/* Category Info */}
                  <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
                    <h3 className="text-2xl font-bold mb-2">{category.name}</h3>
                    <p className="text-base opacity-90">{category.description}</p>
                  </div>

                  {/* Arrow Icon */}
                  <div className="absolute top-6 right-6 w-10 h-10 bg-black rounded-full flex items-center justify-center transform transition-transform duration-300 group-hover:scale-110">
                    <svg 
                      className="w-5 h-5 text-white" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M9 5l7 7-7 7" 
                      />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 w-64">
          <div className="h-1 bg-gray-300 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 transition-all duration-100"
              style={{ width: `${scrollProgress * 100}%` }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}