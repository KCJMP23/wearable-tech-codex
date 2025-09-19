import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Sample tech products with current pricing
const techProducts = [
  {
    id: 'apple-watch-series-10-46mm',
    asin: 'B0DGHQ2QH6',
    title: 'Apple Watch Series 10 GPS 46mm',
    brand: 'Apple',
    price_snapshot: 429,
    currency: 'USD',
    category: 'smartwatch',
    features: [
      'ECG App',
      'Always-On Retina Display', 
      'Water Resistant to 50m',
      'Built-in GPS',
      'Health and Fitness tracking',
      'Sleep tracking',
      'Blood oxygen monitoring'
    ],
    affiliate_url: 'https://www.amazon.com/dp/B0DGHQ2QH6?tag=jmpkc01-20',
    rating: 4.5,
    review_count: 1247,
    images: ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop'],
    water_resistance: '50M',
    health_metrics: ['Heart Rate', 'ECG', 'Blood Oxygen']
  },
  {
    id: 'fitbit-charge-6',
    asin: 'B0CC644KMJ',
    title: 'Fitbit Charge 6 Fitness Tracker',
    brand: 'Fitbit',
    price_snapshot: 159,
    currency: 'USD',
    category: 'fitness-tracker',
    features: [
      'Built-in GPS',
      '6+ day battery life',
      '40+ exercise modes',
      'Heart rate tracking',
      'Sleep score analysis',
      'Google apps integration'
    ],
    affiliate_url: 'https://www.amazon.com/dp/B0CC644KMJ?tag=jmpkc01-20',
    rating: 4.2,
    review_count: 892,
    images: ['https://images.unsplash.com/photo-1576243345690-4e4b79b63288?w=400&h=400&fit=crop'],
    battery_life_hours: 144,
    water_resistance: '5ATM',
    health_metrics: ['Heart Rate', 'Sleep Score', 'Stress']
  },
  {
    id: 'garmin-vivoactive-5',
    asin: 'B0CCQQ7Q4T',
    title: 'Garmin Vivoactive 5 GPS Smartwatch',
    brand: 'Garmin',
    price_snapshot: 299,
    currency: 'USD',
    category: 'smartwatch',
    features: [
      'Built-in GPS',
      '11-day battery life',
      '30+ sports apps',
      'Health snapshot feature',
      'Sleep coaching',
      'Body battery energy monitoring'
    ],
    affiliate_url: 'https://www.amazon.com/dp/B0CCQQ7Q4T?tag=jmpkc01-20',
    rating: 4.4,
    review_count: 567,
    images: ['https://images.unsplash.com/photo-1544717297-fa95b6ee9643?w=400&h=400&fit=crop'],
    battery_life_hours: 264,
    water_resistance: '5ATM',
    health_metrics: ['Body Battery', 'Health Snapshot', 'Sleep Score']
  }
];

const samplePosts = [
  {
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
    seo_description: 'After wearing both devices daily, here\'s what you actually need to know before spending your money.',
    products: ['apple-watch-series-10-46mm', 'fitbit-charge-6']
  },
  {
    title: 'Fitbit Charge 6 Review: 6 Months Later, Here\'s What Nobody Tells You',
    slug: 'fitbit-charge-6-long-term-review-6-months',
    excerpt: 'The honest truth about living with Fitbit\'s latest tracker after the honeymoon period ended.',
    type: 'review',
    body_mdx: `# Fitbit Charge 6 Review: 6 Months Later

Six months ago, I switched from an Apple Watch to the Fitbit Charge 6. Everyone said I was crazy. Today, I'm writing this review on my laptop while the Fitbit tracks my typing as "active minutes." 

Make of that what you will.

## What Still Works Great

**The battery life is stupid good.** I charge it every Sunday while I meal prep. That's it. The freedom from daily charging is real.

**Sleep tracking just works.** It knows when I fall asleep watching Netflix on the couch (embarrassing but accurate). The sleep score actually helps me connect how I feel to how I slept.

## What Started Bothering Me

**The GPS takes forever to connect.** Sometimes I'm already three blocks into my run before it finds satellites. In a city with tall buildings? Good luck.

**The heart rate sensor gets confused easily.** During weight lifting, it thinks I'm either dead (60 BPM) or having a heart attack (180 BPM). There's no middle ground.

## Six Month Verdict

Would I buy it again? Yes.
Would I recommend it? Depends on what you want.
Will I upgrade when the Charge 7 comes out? Probably not, unless the GPS improves significantly.

The Fitbit Charge 6 does fitness tracking really well. It's not trying to be everything to everyone. For what it is, it's solid.`,
    status: 'published',
    published_at: new Date().toISOString(),
    seo_title: 'Fitbit Charge 6 Review: 6 Months Later, Here\'s What Nobody',
    seo_description: 'The honest truth about living with Fitbit\'s latest tracker after the honeymoon period ended.',
    products: ['fitbit-charge-6']
  },
  {
    title: 'Garmin vs Apple Watch for Runners: Which Actually Tracks Better?',
    slug: 'garmin-vs-apple-watch-runners-gps-accuracy',
    excerpt: 'I tested both watches on 50+ runs to see which gives more accurate data where it matters most.',
    type: 'review',
    body_mdx: `# Garmin vs Apple Watch for Runners: Which Actually Tracks Better?

I've been running with both a Garmin Vivoactive 5 and Apple Watch Series 10 for four months. Same routes, same weather, same tired legs. Here's what the data actually shows.

## GPS Accuracy: The Real Test

**The short answer**: They're both pretty good, but different.

**Apple Watch Series 10**: Faster satellite lock (usually under 10 seconds), but occasionally drifts on tree-covered trails.

**Garmin Vivoactive 5**: Takes 15-30 seconds to lock on, but once it does, it's rock solid. Even under heavy tree cover, it rarely loses me.

## Heart Rate: Where Things Get Interesting

This is where the Garmin really shines. During interval training:

**Apple Watch**: Jumps around a lot during high-intensity intervals. Goes from 150 to 180 to 140 in the span of 30 seconds.

**Garmin**: Much more stable readings. Still not chest-strap accurate, but consistent enough to trust for zone training.

## The Honest Bottom Line

Neither is perfect. The Apple Watch is a great smartwatch that does running well. The Garmin is a great running watch that does smart features adequately.

For most recreational runners, the Apple Watch is probably the right choice. For anyone training for marathons or taking running seriously, the Garmin is worth the switch.`,
    status: 'published',
    published_at: new Date().toISOString(),
    seo_title: 'Garmin vs Apple Watch for Runners: Which Actually Tracks',
    seo_description: 'I tested both watches on 50+ runs to see which gives more accurate data where it matters most.',
    products: ['garmin-vivoactive-5', 'apple-watch-series-10-46mm']
  }
];

async function seedContent() {
  console.log('Seeding sample content...');
  
  try {
    // Get or create default tenant
    let { data: tenant } = await supabase
      .from('tenants')
      .select('*')
      .eq('slug', 'wearable-tech-codex')
      .single();

    if (!tenant) {
      console.log('Creating default tenant...');
      const { data: newTenant, error } = await supabase
        .from('tenants')
        .insert({
          name: 'Wearable Tech Codex',
          slug: 'wearable-tech-codex',
          domain: 'wearabletechcodex.com',
          config: { theme: 'woodstock' },
          active: true
        })
        .select()
        .single();
      
      if (error) throw error;
      tenant = newTenant;
    }

    console.log(`✅ Tenant: ${tenant.name} (${tenant.id})`);

    // Store products
    console.log('Storing products...');
    for (const product of techProducts) {
      const { error } = await supabase
        .from('products')
        .upsert({
          id: product.id,
          tenant_id: tenant.id,
          asin: product.asin,
          title: product.title,
          brand: product.brand,
          price_snapshot: product.price_snapshot,
          currency: product.currency,
          category: product.category,
          features: product.features,
          affiliate_url: product.affiliate_url,
          rating: product.rating,
          review_count: product.review_count,
          images: product.images,
          water_resistance: product.water_resistance,
          battery_life_hours: product.battery_life_hours,
          health_metrics: product.health_metrics,
          source: 'manual'
        }, {
          onConflict: 'id'
        });
      
      if (error) {
        console.error(`❌ Failed to insert product ${product.id}:`, error);
      } else {
        console.log(`✅ Product: ${product.title}`);
      }
    }

    // Store posts
    console.log('Storing posts...');
    for (const post of samplePosts) {
      const { data: insertedPost, error } = await supabase
        .from('posts')
        .upsert({
          tenant_id: tenant.id,
          title: post.title,
          slug: post.slug,
          excerpt: post.excerpt,
          type: post.type,
          body_mdx: post.body_mdx,
          status: post.status,
          published_at: post.published_at,
          seo_title: post.seo_title,
          seo_description: post.seo_description
        }, {
          onConflict: 'tenant_id,slug'
        })
        .select()
        .single();
      
      if (error) {
        console.error(`❌ Failed to insert post ${post.slug}:`, error);
        continue;
      }

      console.log(`✅ Post: ${post.title}`);

      // Link products to post
      if (post.products && post.products.length > 0) {
        for (const productId of post.products) {
          const { error: linkError } = await supabase
            .from('post_products')
            .upsert({
              post_id: insertedPost.id,
              product_id: productId
            }, {
              onConflict: 'post_id,product_id'
            });
          
          if (linkError) {
            console.error(`❌ Failed to link product ${productId} to post:`, linkError);
          }
        }
      }
    }

    console.log('\n🎉 Sample content seeded successfully!');
    console.log(`\nView your content at:`);
    console.log(`- Homepage: http://localhost:3001/wearable-tech-codex`);
    console.log(`- First blog post: http://localhost:3001/wearable-tech-codex/blog/apple-watch-vs-fitbit-2025-real-comparison`);

  } catch (error) {
    console.error('❌ Failed to seed content:', error);
  }
}

seedContent();