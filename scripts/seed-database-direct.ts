#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js';

// Use local Supabase with correct keys from supabase status
const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

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
    const { data: tenant, error: tenantError } = await supabase
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
        active: true
      })
      .select()
      .single();

    if (tenantError) {
      console.error('Error creating tenant:', tenantError);
      return;
    }
    console.log('✅ Tenant created:', tenant);
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
        { url: 'https://images.unsplash.com/photo-1639037687665-a5130d0c5fd3?w=800', alt: 'Apple Watch Ultra 2' }
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
        { url: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800', alt: 'Oura Ring' }
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
        { url: 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800', alt: 'Garmin Venu 3' }
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
    }
  ];

  for (const product of products) {
    const { data, error } = await supabase
      .from('products')
      .upsert(product, { onConflict: 'tenant_id,asin' })
      .select();
    
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
      body_mdx: `# Apple Watch Ultra 2 Review

The Apple Watch Ultra 2 represents the pinnacle of smartwatch technology.

## Key Features

### Advanced Health Monitoring
- ECG monitoring for heart rhythm analysis
- Blood oxygen sensing
- Temperature tracking
- Sleep stage tracking

### Exceptional Battery Life
With up to 36 hours of normal use.`,
      images: [
        { url: 'https://images.unsplash.com/photo-1639037687665-a5130d0c5fd3?w=1200', alt: 'Apple Watch Ultra 2' }
      ],
      status: 'published',
      published_at: new Date().toISOString(),
      seo: {
        title: 'Apple Watch Ultra 2 Review 2025',
        description: 'Comprehensive review of the Apple Watch Ultra 2.',
        focusKeyword: 'Apple Watch Ultra 2 review'
      }
    }
  ];

  for (const post of posts) {
    const { data, error } = await supabase
      .from('posts')
      .upsert(post, { onConflict: 'tenant_id,slug' })
      .select();
    
    if (error) {
      console.error(`Error seeding post ${post.title}:`, error);
    } else {
      console.log(`✅ Seeded blog post: ${post.title}`);
    }
  }

  console.log('\n✨ Database seeding complete!');
  process.exit(0);
}

seedDatabase().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});