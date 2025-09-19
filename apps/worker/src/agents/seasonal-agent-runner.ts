import { createClient } from '@supabase/supabase-js';
import { format } from 'date-fns';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

interface SeasonalShowcase {
  tenant_id: string;
  title: string;
  subtitle: string;
  description: string;
  cta_text: string;
  cta_link: string;
  badge_text: string;
  badge_emoji: string;
  gradient_from: string;
  gradient_to: string;
  season_type: 'fall' | 'winter' | 'spring' | 'summer' | 'holiday' | 'special';
  is_active: boolean;
  valid_from?: string;
  valid_until?: string;
}

// Determine current season based on month
function getCurrentSeason(): 'fall' | 'winter' | 'spring' | 'summer' {
  const month = new Date().getMonth() + 1; // 1-12
  
  if (month >= 9 && month <= 11) return 'fall';
  if (month === 12 || month <= 2) return 'winter';
  if (month >= 3 && month <= 5) return 'spring';
  return 'summer';
}

// Season-specific content templates
const seasonalContent = {
  fall: [
    {
      title: 'Fall Fitness Revolution',
      subtitle: 'Perfect Weather for Outdoor Training',
      description: 'AI-discovered top-rated GPS watches and fitness trackers for fall hiking, running, and outdoor adventures',
      cta_text: 'Shop Fall Collection',
      badge_text: 'FALL 2025',
      badge_emoji: '🍂',
      gradient_from: 'from-orange-500',
      gradient_to: 'to-amber-600',
    },
    {
      title: 'Back to School Tech',
      subtitle: 'Smart Devices for Students',
      description: 'AI-selected smartwatches and fitness bands perfect for campus life, study tracking, and staying healthy',
      cta_text: 'Explore Student Deals',
      badge_text: 'STUDENT SAVINGS',
      badge_emoji: '🎓',
      gradient_from: 'from-purple-500',
      gradient_to: 'to-pink-600',
    },
    {
      title: 'Fall Marathon Training',
      subtitle: 'Gear Up for Race Season',
      description: 'Premium GPS watches with advanced training metrics, heart rate monitoring, and recovery tracking',
      cta_text: 'View Running Tech',
      badge_text: 'MARATHON READY',
      badge_emoji: '🏃',
      gradient_from: 'from-green-500',
      gradient_to: 'to-teal-600',
    },
    {
      title: 'Cozy Indoor Fitness',
      subtitle: 'Home Workout Essentials',
      description: 'Smart fitness trackers optimized for indoor workouts, yoga, and meditation as days get shorter',
      cta_text: 'Shop Indoor Gear',
      badge_text: 'HOME FITNESS',
      badge_emoji: '🏠',
      gradient_from: 'from-indigo-500',
      gradient_to: 'to-purple-600',
    }
  ],
  winter: [
    {
      title: 'Winter Wellness Warriors',
      subtitle: 'Beat the Winter Blues',
      description: 'Health monitors with SAD light therapy tracking, vitamin D reminders, and mood monitoring',
      cta_text: 'Shop Winter Wellness',
      badge_text: 'WINTER 2025',
      badge_emoji: '❄️',
      gradient_from: 'from-blue-500',
      gradient_to: 'to-cyan-600',
    },
    {
      title: 'Cold Weather Performance',
      subtitle: 'Extreme Weather Ready',
      description: 'Rugged smartwatches with extended battery life, waterproofing, and cold-weather optimization',
      cta_text: 'Explore Winter Tech',
      badge_text: 'WEATHERPROOF',
      badge_emoji: '🧊',
      gradient_from: 'from-slate-600',
      gradient_to: 'to-gray-700',
    }
  ],
  spring: [
    {
      title: 'Spring Into Action',
      subtitle: 'Outdoor Adventure Awaits',
      description: 'Lightweight fitness trackers perfect for spring activities, allergy tracking, and UV monitoring',
      cta_text: 'Shop Spring Collection',
      badge_text: 'SPRING 2025',
      badge_emoji: '🌸',
      gradient_from: 'from-pink-400',
      gradient_to: 'to-rose-500',
    },
    {
      title: 'Spring Cleaning Your Health',
      subtitle: 'Fresh Start Fitness',
      description: 'Smart scales, body composition monitors, and health trackers for your spring transformation',
      cta_text: 'Start Fresh',
      badge_text: 'NEW BEGINNINGS',
      badge_emoji: '🌱',
      gradient_from: 'from-green-400',
      gradient_to: 'to-emerald-500',
    }
  ],
  summer: [
    {
      title: 'Summer Beach Ready',
      subtitle: 'Waterproof & Sun-Smart',
      description: 'Swim-proof fitness trackers with UV monitoring, hydration reminders, and beach activity modes',
      cta_text: 'Shop Summer Gear',
      badge_text: 'SUMMER 2025',
      badge_emoji: '☀️',
      gradient_from: 'from-yellow-400',
      gradient_to: 'to-orange-500',
    },
    {
      title: 'Vacation Mode Activated',
      subtitle: 'Travel-Friendly Tech',
      description: 'Compact smartwatches with travel features, timezone sync, and adventure tracking',
      cta_text: 'Explore Travel Tech',
      badge_text: 'WANDERLUST',
      badge_emoji: '🏖️',
      gradient_from: 'from-cyan-400',
      gradient_to: 'to-blue-500',
    }
  ]
};

export async function runSeasonalAgent() {
  console.log('🍂 Starting Seasonal Agent...');
  
  try {
    // Get current season
    const currentSeason = getCurrentSeason();
    console.log(`📅 Current season: ${currentSeason}`);
    
    // Get all tenants
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select('id, slug')
      .eq('is_active', true);
    
    if (tenantsError) throw tenantsError;
    
    for (const tenant of tenants || []) {
      console.log(`🏢 Processing tenant: ${tenant.slug}`);
      
      // Deactivate old seasonal content
      const { error: deactivateError } = await supabase
        .from('seasonal_showcases')
        .update({ is_active: false })
        .eq('tenant_id', tenant.id)
        .neq('season_type', currentSeason);
      
      if (deactivateError) {
        console.error(`❌ Error deactivating old content: ${deactivateError.message}`);
        continue;
      }
      
      // Get current active showcases
      const { data: activeShowcases } = await supabase
        .from('seasonal_showcases')
        .select('id')
        .eq('tenant_id', tenant.id)
        .eq('is_active', true)
        .eq('season_type', currentSeason);
      
      // If less than 2 showcases, add more
      if (!activeShowcases || activeShowcases.length < 2) {
        const contentToAdd = seasonalContent[currentSeason].slice(0, 2);
        
        for (const content of contentToAdd) {
          const showcase: SeasonalShowcase = {
            tenant_id: tenant.id,
            ...content,
            cta_link: `/${tenant.slug}/collections/${currentSeason}`,
            season_type: currentSeason,
            is_active: true,
            valid_from: new Date().toISOString(),
            valid_until: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days
          };
          
          const { error: insertError } = await supabase
            .from('seasonal_showcases')
            .insert(showcase);
          
          if (insertError) {
            console.error(`❌ Error inserting showcase: ${insertError.message}`);
          } else {
            console.log(`✅ Added showcase: ${content.title}`);
          }
        }
      }
    }
    
    // Update agent last run time
    await supabase
      .from('agent_configurations')
      .update({
        last_run_at: new Date().toISOString(),
        next_run_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Next day
      })
      .eq('agent_name', 'seasonal_agent');
    
    console.log('✨ Seasonal Agent completed successfully');
    
  } catch (error) {
    console.error('❌ Seasonal Agent error:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  runSeasonalAgent()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}