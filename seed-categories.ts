#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function seedCategories() {
  const tenantId = '00000000-0000-0000-0000-000000000001';
  
  const categories = [
    {
      tenant_id: tenantId,
      name: 'Smartwatches',
      slug: 'smartwatches',
      description: 'Advanced wearables for health and fitness tracking',
      image_url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&h=600&fit=crop',
      level: 0
    },
    {
      tenant_id: tenantId,
      name: 'Fitness Trackers',
      slug: 'fitness-trackers',
      description: 'Dedicated devices for activity and health monitoring',
      image_url: 'https://images.unsplash.com/photo-1576243345690-4e4b79b63288?w=800&h=600&fit=crop',
      level: 0
    },
    {
      tenant_id: tenantId,
      name: 'Smart Rings',
      slug: 'smart-rings',
      description: 'Discreet wearables for 24/7 health tracking',
      image_url: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&h=600&fit=crop',
      level: 0
    },
    {
      tenant_id: tenantId,
      name: 'VR Headsets',
      slug: 'vr-headsets',
      description: 'Immersive virtual reality experiences',
      image_url: 'https://images.unsplash.com/photo-1622979135225-d2ba269cf1ac?w=800&h=600&fit=crop',
      level: 0
    },
    {
      tenant_id: tenantId,
      name: 'Smart Glasses',
      slug: 'smart-glasses',
      description: 'AR-enabled eyewear for enhanced reality',
      image_url: 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=800&h=600&fit=crop',
      level: 0
    },
    {
      tenant_id: tenantId,
      name: 'Health Monitors',
      slug: 'health-monitors',
      description: 'Medical-grade monitoring devices',
      image_url: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800&h=600&fit=crop',
      level: 0
    }
  ];

  console.log('Seeding categories...');
  for (const category of categories) {
    const { error } = await supabase
      .from('taxonomy')
      .upsert(category, { onConflict: 'tenant_id,slug' });
    
    if (error) {
      console.error(`Error seeding category ${category.name}:`, error);
    } else {
      console.log(`✅ Seeded category: ${category.name}`);
    }
  }
  
  console.log('✨ Categories seeded!');
  process.exit(0);
}

seedCategories().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});