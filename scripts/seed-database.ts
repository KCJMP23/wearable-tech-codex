#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

// Use local Supabase
const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfc3JvbGUiLCJleHAiOjE5ODM4MTI5OTZ9.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seedDatabase() {
  console.log('🌱 Starting database seeding...\n');

  // 1. Create or get tenant
  const tenantId = '00000000-0000-0000-0000-000000000001';
  const tenantSlug = 'nectarheat';
  
  console.log('Creating tenant...');
  const { data: existingTenant } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', tenantId)
    .single();

  if (!existingTenant) {
    const { error: tenantError } = await supabase
      .from('tenants')
      .insert({
        id: tenantId,
        name: 'Nectar & Heat',
        slug: tenantSlug,
        domain: 'nectarheat.com',
        config: {
          theme: 'wearable-tech',
          colors: {
            primary: '#3B82F6',
            secondary: '#8B5CF6'
          }
        },
        amazon_tag: 'jmpkc01-20',
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (tenantError) {
      console.error('Error creating tenant:', tenantError);
      return;
    }
    console.log('✅ Tenant created');
  } else {
    console.log('✅ Tenant already exists');
  }

  // 2. Seed Products
  console.log('\nSeeding products...');
  const products = [
    {
      tenant_id: tenantId,
      asin: 'B0CHX9NB3Y',
      title: 'Apple Watch Ultra 2',
      description: 'The most rugged and capable Apple Watch with advanced health monitoring, GPS tracking, and 36-hour battery life.',
      price: 79900,
      original_price: 84900,
      currency: 'USD',
      rating: 4.8,
      review_count: 1250,
      category: 'Smartwatches',
      brand: 'Apple',
      images: [
        'https://images.unsplash.com/photo-1639037687665-a5130d0c5fd3?w=800',
        'https://images.unsplash.com/photo-1639037687943-f03bf49d8663?w=800',
        'https://images.unsplash.com/photo-1639037687514-55e6b7c67dcd?w=800'
      ],
      features: [
        '49mm titanium case',
        'Action button',
        '3000 nits display',
        'Depth gauge',
        'Temperature sensing'
      ],
      affiliate_url: 'https://amazon.com/dp/B0CHX9NB3Y?tag=jmpkc01-20',
      in_stock: true,
      is_prime: true
    },
    {
      tenant_id: tenantId,
      asin: 'B09LHDMTP4',
      title: 'Oura Ring Gen3 Heritage',
      description: 'Advanced sleep and recovery tracking in a sleek ring form factor with 7-day battery life.',
      price: 29900,
      original_price: 34900,
      currency: 'USD',
      rating: 4.6,
      review_count: 890,
      category: 'Smart Rings',
      brand: 'Oura',
      images: [
        'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800',
        'https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=800'
      ],
      features: [
        'Sleep tracking',
        'HRV monitoring',
        '7-day battery',
        'Temperature sensing',
        'Activity tracking'
      ],
      affiliate_url: 'https://amazon.com/dp/B09LHDMTP4?tag=jmpkc01-20',
      in_stock: true,
      is_prime: true
    },
    {
      tenant_id: tenantId,
      asin: 'B0C8PQK24P',
      title: 'Garmin Venu 3',
      description: 'GPS smartwatch with advanced health monitoring and up to 14 days battery life.',
      price: 44900,
      original_price: 49900,
      currency: 'USD',
      rating: 4.7,
      review_count: 423,
      category: 'Smartwatches',
      brand: 'Garmin',
      images: [
        'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800',
        'https://images.unsplash.com/photo-1523475496153-3d6cc0f0bf19?w=800'
      ],
      features: [
        'Sleep coach',
        'Body Battery',
        'Wheelchair mode',
        'Voice features',
        '14-day battery'
      ],
      affiliate_url: 'https://amazon.com/dp/B0C8PQK24P?tag=jmpkc01-20',
      in_stock: true,
      is_prime: true
    },
    {
      tenant_id: tenantId,
      asin: 'B09HH2KZ67',
      title: 'Whoop 4.0',
      description: 'Performance optimization band for athletes with continuous HRV monitoring.',
      price: 23900,
      original_price: 23900,
      currency: 'USD',
      rating: 4.5,
      review_count: 567,
      category: 'Fitness Trackers',
      brand: 'Whoop',
      images: [
        'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=800'
      ],
      features: [
        'Strain coach',
        'Recovery insights',
        'Sleep coach',
        'Continuous HRV',
        '5-day battery'
      ],
      affiliate_url: 'https://amazon.com/dp/B09HH2KZ67?tag=jmpkc01-20',
      in_stock: true,
      is_prime: false
    },
    {
      tenant_id: tenantId,
      asin: 'B0B77N275F',
      title: 'Fitbit Charge 6',
      description: 'Advanced fitness tracker with built-in GPS, heart rate monitoring, and 7-day battery.',
      price: 15995,
      original_price: 15995,
      currency: 'USD',
      rating: 4.3,
      review_count: 2340,
      category: 'Fitness Trackers',
      brand: 'Fitbit',
      images: [
        'https://images.unsplash.com/photo-1557438159-51eec7a6c9e8?w=800'
      ],
      features: [
        'Built-in GPS',
        'ECG app',
        'SpO2 monitoring',
        '7-day battery',
        'Google apps'
      ],
      affiliate_url: 'https://amazon.com/dp/B0B77N275F?tag=jmpkc01-20',
      in_stock: true,
      is_prime: true
    }
  ];

  for (const product of products) {
    const { error } = await supabase
      .from('products')
      .upsert(product, { onConflict: 'tenant_id,asin' });
    
    if (error) {
      console.error(`Error seeding product ${product.title}:`, error);
    } else {
      console.log(`✅ Seeded product: ${product.title}`);
    }
  }

  // 3. Seed Blog Posts
  console.log('\nSeeding blog posts...');
  const posts = [
    {
      tenant_id: tenantId,
      type: 'review',
      title: 'Apple Watch Ultra 2 Review: The Ultimate Health Companion',
      slug: 'apple-watch-ultra-2-review',
      excerpt: 'An in-depth review of the Apple Watch Ultra 2, exploring its advanced health features and rugged design.',
      body_mdx: `# Apple Watch Ultra 2 Review: The Ultimate Health Companion

The Apple Watch Ultra 2 represents the pinnacle of smartwatch technology, combining rugged durability with sophisticated health monitoring capabilities.

## Key Features

### Advanced Health Monitoring
The Ultra 2 includes comprehensive health tracking:
- **ECG monitoring** for heart rhythm analysis
- **Blood oxygen sensing** for respiratory health
- **Temperature tracking** for cycle insights
- **Sleep stage tracking** with REM detection

### Exceptional Battery Life
With up to 36 hours of normal use and 72 hours in low power mode, the Ultra 2 outlasts the competition.

### Rugged Design
- **Titanium case** for maximum durability
- **100m water resistance** with EN13319 certification
- **MIL-STD 810H** tested for extreme conditions

## Performance in Real-World Use

During our three-week testing period, the Apple Watch Ultra 2 consistently impressed with its accuracy and reliability.

![Apple Watch Ultra 2 on wrist](https://images.unsplash.com/photo-1639037687665-a5130d0c5fd3?w=1200)

### Fitness Tracking Excellence
The dual-frequency GPS provides exceptional accuracy for outdoor workouts, while the comprehensive sensor array captures every metric serious athletes need.

### Health Insights That Matter
The temperature sensor adds a new dimension to health tracking, particularly useful for women's health and early illness detection.

## Who Should Buy the Ultra 2?

- **Serious athletes** who demand precision tracking
- **Outdoor enthusiasts** who need durability
- **Health-conscious individuals** wanting comprehensive monitoring
- **Apple ecosystem users** seeking the best integration

## Verdict

The Apple Watch Ultra 2 justifies its premium price with unmatched features, exceptional build quality, and seamless ecosystem integration. It's not just a smartwatch—it's a comprehensive health and fitness companion.

**Rating: 9.5/10**`,
      images: [
        { url: 'https://images.unsplash.com/photo-1639037687665-a5130d0c5fd3?w=1200', alt: 'Apple Watch Ultra 2 hero shot' },
        { url: 'https://images.unsplash.com/photo-1639037687943-f03bf49d8663?w=800', alt: 'Apple Watch Ultra 2 side view' },
        { url: 'https://images.unsplash.com/photo-1639037687514-55e6b7c67dcd?w=800', alt: 'Apple Watch Ultra 2 sports band' },
        { url: 'https://images.unsplash.com/photo-1434493789847-2f02dc6ca35d?w=800', alt: 'Fitness tracking in action' },
        { url: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800', alt: 'Health app interface' }
      ],
      status: 'published',
      published_at: new Date().toISOString(),
      seo: {
        title: 'Apple Watch Ultra 2 Review 2025 | Complete Guide',
        description: 'Comprehensive review of the Apple Watch Ultra 2 featuring health monitoring, battery life, and real-world performance tests.',
        focusKeyword: 'Apple Watch Ultra 2 review'
      }
    },
    {
      tenant_id: tenantId,
      type: 'listicle',
      title: 'Best Fitness Trackers for 2025: Complete Buying Guide',
      slug: 'best-fitness-trackers-2025',
      excerpt: 'Discover the top fitness trackers of 2025, from budget-friendly options to premium devices with advanced health monitoring.',
      body_mdx: `# Best Fitness Trackers for 2025: Complete Buying Guide

Finding the perfect fitness tracker can transform your health journey. Here are the top picks for 2025.

## Top 5 Fitness Trackers

### 1. Whoop 4.0 - Best for Athletes
![Whoop 4.0](https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=1200)

The Whoop 4.0 focuses on recovery and strain, perfect for serious athletes.

**Key Features:**
- Continuous HRV monitoring
- Strain coach
- Recovery insights
- No screen design

### 2. Fitbit Charge 6 - Best Value
![Fitbit Charge 6](https://images.unsplash.com/photo-1557438159-51eec7a6c9e8?w=800)

Excellent balance of features and affordability.

**Key Features:**
- Built-in GPS
- 7-day battery
- ECG app
- Google integration

### 3. Garmin Venu 3 - Best Battery Life
![Garmin Venu 3](https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800)

Up to 14 days of battery life with comprehensive tracking.

**Key Features:**
- Sleep coach
- Body Battery energy
- Voice features
- Wheelchair mode

### 4. Apple Watch Series 9 - Best Ecosystem
![Apple Watch Series 9](https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=800)

Perfect for iPhone users wanting health and smart features.

**Key Features:**
- Double tap gesture
- On-device Siri
- Precision finding
- Carbon neutral options

### 5. Oura Ring Gen3 - Most Discreet
![Oura Ring](https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800)

Sleek ring form factor with powerful health insights.

**Key Features:**
- 7-day battery
- Sleep tracking
- Temperature sensing
- HRV monitoring

## How to Choose

Consider these factors:
- **Budget**: $100-$500 range
- **Battery life**: 2-14 days
- **Features needed**: GPS, heart rate, sleep
- **Ecosystem**: iOS vs Android compatibility
- **Form factor**: Watch vs band vs ring`,
      images: [
        { url: 'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=1200', alt: 'Whoop 4.0 fitness tracker' },
        { url: 'https://images.unsplash.com/photo-1557438159-51eec7a6c9e8?w=800', alt: 'Fitbit Charge 6' },
        { url: 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800', alt: 'Garmin Venu 3' },
        { url: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=800', alt: 'Apple Watch Series 9' },
        { url: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800', alt: 'Oura Ring Gen3' },
        { url: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800', alt: 'Fitness tracking comparison' }
      ],
      status: 'published',
      published_at: new Date().toISOString(),
      seo: {
        title: 'Best Fitness Trackers 2025 | Top 5 Picks & Buying Guide',
        description: 'Compare the best fitness trackers of 2025 including Whoop, Fitbit, Garmin, Apple Watch, and Oura Ring.',
        focusKeyword: 'best fitness trackers 2025'
      }
    }
  ];

  for (const post of posts) {
    const { error } = await supabase
      .from('posts')
      .upsert(post, { onConflict: 'tenant_id,slug' });
    
    if (error) {
      console.error(`Error seeding post ${post.title}:`, error);
    } else {
      console.log(`✅ Seeded blog post: ${post.title}`);
    }
  }

  console.log('\n✨ Database seeding complete!');
}

seedDatabase().catch(console.error);