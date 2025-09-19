'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';

interface SeasonalContent {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  cta_text: string;
  cta_link: string;
  badge_text: string;
  badge_emoji: string;
  gradient_from: string;
  gradient_to: string;
  highlight_products?: string[];
  season_type: 'winter' | 'spring' | 'summer' | 'fall' | 'holiday' | 'special';
  is_active: boolean;
  valid_from?: string;
  valid_until?: string;
  created_at: string;
  updated_at: string;
}

interface SeasonalShowcaseProps {
  tenantSlug: string;
  tenantId: string;
}

export function SeasonalShowcase({ tenantSlug, tenantId }: SeasonalShowcaseProps) {
  const [seasonalContent, setSeasonalContent] = useState<SeasonalContent[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const fetchSeasonalContent = async () => {
      const now = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('seasonal_showcases')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .or(`valid_from.is.null,valid_from.lte.${now}`)
        .or(`valid_until.is.null,valid_until.gte.${now}`)
        .order('created_at', { ascending: false })
        .limit(2);

      if (!error && data) {
        setSeasonalContent(data);
      }
      setLoading(false);
    };

    fetchSeasonalContent();
  }, [tenantId]);

  // Only render if we have content from database
  if (loading) {
    return null; // Don't show anything while loading
  }

  if (seasonalContent.length === 0) {
    return null; // Don't render section if no seasonal content in database
  }

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">
            Seasonal Intelligence
          </p>
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            AI-Powered Seasonal Recommendations
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Our seasonal agent continuously analyzes trends, weather patterns, and shopping behaviors 
            to bring you the most relevant wearable tech for the current season
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {seasonalContent.slice(0, 2).map((content, index) => (
            <div 
              key={content.id}
              className={`relative overflow-hidden rounded-2xl bg-gradient-to-r ${content.gradient_from} ${content.gradient_to} shadow-xl transform transition-all duration-300 hover:scale-105`}
            >
              <div className="absolute inset-0 bg-black/10"></div>
              
              {/* Decorative elements */}
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/10 rounded-full"></div>
              <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-white/5 rounded-full"></div>
              
              <div className="relative p-8 lg:p-12 text-white">
                <div className="inline-block bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-bold mb-4">
                  {content.badge_emoji} {content.badge_text}
                </div>
                
                <h3 className="text-3xl lg:text-4xl font-bold mb-2">
                  {content.title}
                </h3>
                
                <p className="text-xl font-semibold text-white/90 mb-4">
                  {content.subtitle}
                </p>
                
                <p className="text-lg text-white/80 mb-6">
                  {content.description}
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link
                    href={content.cta_link}
                    className="inline-flex items-center justify-center bg-white text-gray-900 font-semibold px-6 py-3 rounded-full hover:bg-gray-100 transition-colors"
                  >
                    {content.cta_text}
                    <svg className="ml-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </Link>
                  
                  {index === 0 && (
                    <button className="inline-flex items-center justify-center bg-white/20 backdrop-blur-sm text-white font-medium px-6 py-3 rounded-full hover:bg-white/30 transition-colors">
                      <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Learn More
                    </button>
                  )}
                </div>

                {/* Seasonal indicator */}
                <div className="mt-6 pt-6 border-t border-white/20">
                  <div className="flex items-center text-sm text-white/70">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Updated by Seasonal Agent • {new Date().toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Additional seasonal insights */}
        <div className="mt-12 bg-gray-50 rounded-2xl p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Market Trends</h4>
              <p className="text-sm text-gray-600">
                Real-time analysis of seasonal buying patterns and emerging tech trends
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Smart Timing</h4>
              <p className="text-sm text-gray-600">
                AI predicts optimal purchase timing based on price history and availability
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Personalized Picks</h4>
              <p className="text-sm text-gray-600">
                Recommendations tailored to your activity level and seasonal goals
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}