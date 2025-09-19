import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const sampleData = {
  tenant: {
    id: '01234567-89ab-cdef-0123-456789abcdef',
    name: 'Wearable Tech Codex',
    slug: 'wearable-tech-codex',
    domain: 'localhost:3001',
    config: { theme: 'woodstock' },
    active: true
  },
  products: [
    {
      id: 'apple-watch-series-10-46mm',
      title: 'Apple Watch Series 10 GPS 46mm',
      brand: 'Apple',
      price_snapshot: 429,
      currency: 'USD',
      category: 'smartwatch',
      features: ['ECG App', 'Always-On Retina Display', 'Water Resistant to 50m'],
      rating: 4.5,
      review_count: 1247,
      images: ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop'],
      water_resistance: '50M',
      health_metrics: ['Heart Rate', 'ECG', 'Blood Oxygen'],
      affiliate_url: 'https://www.amazon.com/dp/B0DGHQ2QH6?tag=example-20'
    },
    {
      id: 'fitbit-charge-6',
      title: 'Fitbit Charge 6 Fitness Tracker',
      brand: 'Fitbit',
      price_snapshot: 159,
      currency: 'USD',
      category: 'fitness-tracker',
      features: ['Built-in GPS', '6+ day battery life', '40+ exercise modes'],
      rating: 4.2,
      review_count: 892,
      images: ['https://images.unsplash.com/photo-1576243345690-4e4b79b63288?w=400&h=400&fit=crop'],
      battery_life_hours: 144,
      water_resistance: '5ATM',
      health_metrics: ['Heart Rate', 'Sleep Score', 'Stress'],
      affiliate_url: 'https://www.amazon.com/dp/B0CC644KMJ?tag=example-20'
    }
  ],
  posts: [
    {
      id: '01234567-89ab-cdef-0123-456789abcde1',
      title: 'Apple Watch vs Fitbit 2025: I Tested Both for 3 Months (Honest Review)',
      slug: 'apple-watch-vs-fitbit-2025-real-comparison',
      excerpt: 'After wearing both devices daily, here\'s what you actually need to know before spending your money.',
      type: 'review',
      body_mdx: `# Apple Watch vs Fitbit 2025: I Tested Both for 3 Months

Look, I'm not here to write another generic tech comparison. I bought both the new Apple Watch Series 10 and Fitbit Charge 6 with my own money and wore them for three months. One on each wrist, like some kind of wearable tech maniac.

Here's what actually matters.

## The Real-World Battery Life Story

Apple claims "all-day battery life" for the Watch Series 10. That's technically true if your day is exactly 18 hours and you don't use it much. In practice:

- **Morning workout**: Lost about 15% battery from a 45-minute run with GPS
- **Regular day use**: Checking messages, weather, timer - down to 60% by lunch
- **Sleep tracking**: Forget it. You'll need to charge overnight

The Fitbit Charge 6? I charged it twice in three months. Seriously. It just keeps going.

## Heart Rate: The Accuracy Test

I tested both against a chest strap during workouts. Here's what I found:

**During steady cardio** (like jogging): Both were within 2-3 BPM of the chest strap. Good enough.

**During strength training**: The Apple Watch jumped around like crazy. The Fitbit stayed more consistent but still got confused during push-ups.

**Resting heart rate**: Both tracked this well over time.

## The Bottom Line

After three months, I kept wearing both. The Apple Watch on weekdays for the convenience, the Fitbit on weekends and for sleep tracking.

If I had to choose just one? The Fitbit Charge 6. It does the most important stuff really well without constantly needing attention.`,
      status: 'published',
      published_at: new Date().toISOString(),
      seo_title: 'Apple Watch vs Fitbit 2025: I Tested Both for 3 Months',
      seo_description: 'After wearing both devices daily, here\'s what you actually need to know before spending your money.'
    }
  ]
};

async function simpleSeed() {
  console.log('Simple seeding...');
  
  try {
    // Insert tenant
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .upsert(sampleData.tenant)
      .select()
      .single();
    
    if (tenantError) {
      console.error('Tenant error:', tenantError);
      return;
    }
    
    console.log('✅ Tenant created:', tenant.name);
    
    // Insert products
    for (const product of sampleData.products) {
      const { error } = await supabase
        .from('products')
        .upsert({
          ...product,
          tenant_id: tenant.id
        });
      
      if (error) {
        console.error('Product error:', error);
      } else {
        console.log('✅ Product:', product.title);
      }
    }
    
    // Insert posts
    for (const post of sampleData.posts) {
      const { error } = await supabase
        .from('posts')
        .upsert({
          ...post,
          tenant_id: tenant.id
        });
      
      if (error) {
        console.error('Post error:', error);
      } else {
        console.log('✅ Post:', post.title);
      }
    }
    
    console.log('\n🎉 Simple seeding complete!');
    console.log('Test URL: http://localhost:3001/wearable-tech-codex/blog/apple-watch-vs-fitbit-2025-real-comparison');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
  }
}

simpleSeed();