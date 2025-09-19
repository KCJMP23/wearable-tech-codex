import { EnhancedEditorialAgent } from '../apps/worker/src/agents/enhancedEditorialAgent';
import { createClient } from '@supabase/supabase-js';
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
    id: 'premium-device-pro-46mm',
    name: 'Premium Device Pro GPS 46mm',
    asin: 'B0DGHQ2QH6',
    price: 429,
    currency: 'USD',
    category: 'smart-device',
    brand: 'TechBrand',
    features: [
      'Advanced Monitoring',
      'Always-On Display', 
      'Water Resistant to 50m',
      'Built-in GPS',
      'Performance tracking',
      'Activity monitoring',
      'Wellness features'
    ],
    amazonUrl: 'https://example.com/affiliate-link',
    description: 'The most advanced smart device yet with larger display and faster charging'
  },
  {
    id: 'activity-tracker-6',
    name: 'Activity Tracker 6 Performance Monitor',
    asin: 'B0CC644KMJ',
    price: 159,
    currency: 'USD',
    category: 'activity-tracker',
    brand: 'TrackerBrand',
    features: [
      'Built-in GPS',
      '6+ day battery life',
      '40+ activity modes',
      'Performance tracking',
      'Wellness analysis',
      'Smart apps integration',
      'Premium features included'
    ],
    amazonUrl: 'https://www.amazon.com/dp/B0CC644KMJ',
    description: 'Advanced fitness tracker with Google apps and heart rate on exercise equipment'
  },
  {
    id: 'garmin-vivoactive-5',
    name: 'Garmin Vivoactive 5 GPS Smartwatch',
    asin: 'B0CCQQ7Q4T',
    price: 299,
    currency: 'USD',
    category: 'smartwatch',
    brand: 'Garmin',
    features: [
      'Built-in GPS',
      '11-day battery life',
      '30+ sports apps',
      'Health snapshot feature',
      'Sleep coaching',
      'Body battery energy monitoring',
      'Smart notifications'
    ],
    amazonUrl: 'https://www.amazon.com/dp/B0CCQQ7Q4T',
    description: 'GPS smartwatch with 11-day battery life and comprehensive health monitoring'
  },
  {
    id: 'samsung-galaxy-watch-7',
    name: 'Samsung Galaxy Watch 7 Bluetooth Smartwatch',
    asin: 'B0D8VHT1S9',
    price: 329,
    currency: 'USD',
    category: 'smartwatch',
    brand: 'Samsung',
    features: [
      'AI health insights',
      'Sleep tracking',
      'Heart rate monitoring',
      'GPS tracking',
      'Water resistant',
      'Google Wear OS',
      'Fast wireless charging'
    ],
    amazonUrl: 'https://www.amazon.com/dp/B0D8VHT1S9',
    description: 'AI-powered smartwatch with advanced health insights and Wear OS integration'
  },
  {
    id: 'amazfit-band-7',
    name: 'Amazfit Band 7 Fitness Tracker',
    asin: 'B0B86ZPBVS',
    price: 49,
    currency: 'USD',
    category: 'fitness-tracker',
    brand: 'Amazfit',
    features: [
      '1.47" HD AMOLED display',
      '18-day battery life',
      '120+ sports modes',
      'Blood oxygen monitoring',
      'Heart rate tracking',
      '5 ATM water resistance',
      'Amazon Alexa built-in'
    ],
    amazonUrl: 'https://www.amazon.com/dp/B0B86ZPBVS',
    description: 'Budget-friendly fitness tracker with 18-day battery and comprehensive health monitoring'
  }
];

// Article topics focused on real user needs and search intent
const articleTopics = [
  {
    title: "Apple Watch vs Fitbit 2025: Which Should You Actually Buy?",
    topic: "apple watch vs fitbit comparison real world usage battery life price value",
    products: ['apple-watch-series-10-46mm', 'fitbit-charge-6'],
    category: 'comparison',
    searchIntent: 'commercial'
  },
  {
    title: "Fitbit Charge 6 Review: 6 Months of Daily Use",
    topic: "fitbit charge 6 honest review daily use battery life accuracy pros cons",
    products: ['fitbit-charge-6'],
    category: 'review',
    searchIntent: 'informational'
  },
  {
    title: "Best Budget Fitness Trackers Under $100 That Actually Work",
    topic: "budget fitness trackers under 100 dollars worth buying accurate reliable",
    products: ['amazfit-band-7'],
    category: 'roundup',
    searchIntent: 'commercial'
  },
  {
    title: "Samsung Galaxy Watch 7 vs Apple Watch: Android User's Perspective",
    topic: "samsung galaxy watch 7 vs apple watch android users comparison features",
    products: ['samsung-galaxy-watch-7', 'apple-watch-series-10-46mm'],
    category: 'comparison',
    searchIntent: 'commercial'
  },
  {
    title: "Garmin Vivoactive 5: Why Athletes Choose It Over Apple Watch",
    topic: "garmin vivoactive 5 vs apple watch athletes runners serious fitness tracking",
    products: ['garmin-vivoactive-5', 'apple-watch-series-10-46mm'],
    category: 'comparison',
    searchIntent: 'informational'
  },
  {
    title: "Sleep Tracking Showdown: Which Wearable Actually Helps You Sleep Better?",
    topic: "best sleep tracking wearables accuracy fitbit apple watch garmin comparison",
    products: ['fitbit-charge-6', 'apple-watch-series-10-46mm', 'garmin-vivoactive-5'],
    category: 'comparison',
    searchIntent: 'informational'
  },
  {
    title: "Heart Rate Monitoring: Chest Straps vs Wrist Wearables in 2025",
    topic: "heart rate monitoring accuracy wrist vs chest strap fitness trackers comparison",
    products: ['fitbit-charge-6', 'garmin-vivoactive-5'],
    category: 'guide',
    searchIntent: 'informational'
  },
  {
    title: "Smart Ring vs Fitness Tracker: Which Wins for 24/7 Health Monitoring?",
    topic: "smart rings vs fitness trackers oura ring vs fitbit pros cons comparison",
    products: ['fitbit-charge-6'],
    category: 'comparison',
    searchIntent: 'informational'
  },
  {
    title: "Waterproof Fitness Trackers for Swimming: Pool vs Open Water Testing",
    topic: "waterproof fitness trackers swimming pool open water garmin fitbit apple watch",
    products: ['garmin-vivoactive-5', 'fitbit-charge-6', 'apple-watch-series-10-46mm'],
    category: 'guide',
    searchIntent: 'informational'
  },
  {
    title: "Wearable Battery Life Reality Check: Tested Over 30 Days",
    topic: "wearable device battery life real world testing smartwatch fitness tracker longevity",
    products: ['garmin-vivoactive-5', 'amazfit-band-7', 'apple-watch-series-10-46mm'],
    category: 'analysis',
    searchIntent: 'informational'
  },
  {
    title: "Fitness Tracker Accuracy Test: Steps, Calories, and Heart Rate",
    topic: "fitness tracker accuracy testing steps calories heart rate comparison methodology",
    products: ['fitbit-charge-6', 'garmin-vivoactive-5', 'samsung-galaxy-watch-7'],
    category: 'analysis',
    searchIntent: 'informational'
  },
  {
    title: "Why I Switched from Apple Watch to Garmin (And You Might Too)",
    topic: "switch from apple watch to garmin personal experience battery life fitness features",
    products: ['garmin-vivoactive-5', 'apple-watch-series-10-46mm'],
    category: 'opinion',
    searchIntent: 'informational'
  }
];

async function generateAllArticles() {
  console.log('Starting comprehensive content generation...');
  
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
        theme: 'woodstock',
        status: 'active'
      })
      .select()
      .single();
    
    if (error) throw error;
    tenant = newTenant;
  }

  // Store products in database
  console.log('Storing products...');
  for (const product of techProducts) {
    await supabase
      .from('products')
      .upsert({
        id: product.id,
        tenant_id: tenant.id,
        name: product.name,
        description: product.description,
        price: product.price,
        currency: product.currency,
        category: product.category,
        brand: product.brand,
        asin: product.asin,
        amazon_url: product.amazonUrl,
        features: product.features,
        status: 'active',
        metadata: {
          source: 'amazon',
          last_updated: new Date().toISOString()
        }
      }, {
        onConflict: 'id'
      });
  }

  const agent = new EnhancedEditorialAgent();
  
  // Generate articles
  for (let i = 0; i < articleTopics.length; i++) {
    const articleTopic = articleTopics[i];
    console.log(`\nGenerating article ${i + 1}/${articleTopics.length}: ${articleTopic.title}`);
    
    try {
      // Get products for this article
      const articleProducts = techProducts.filter(p => 
        articleTopic.products.includes(p.id)
      );
      
      const result = await agent.execute({
        tenantId: tenant.id,
        topic: articleTopic.topic,
        products: articleProducts,
        competitorUrls: [
          'https://www.wareable.com',
          'https://www.tomsguide.com',
          'https://www.techradar.com'
        ]
      });
      
      console.log(`✅ Generated: ${result.article.title}`);
      console.log(`   Word count: ${result.metrics.wordCount}`);
      console.log(`   Readability: ${result.metrics.readabilityScore.toFixed(1)}`);
      console.log(`   Products mentioned: ${result.metrics.productsMentioned}`);
      
      // Brief pause between articles
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.error(`❌ Failed to generate article: ${articleTopic.title}`, error);
    }
  }
  
  console.log('\n🎉 Content generation complete!');
  
  // Show summary
  const { data: posts } = await supabase
    .from('posts')
    .select('title, status, created_at')
    .eq('tenant_id', tenant.id)
    .order('created_at', { ascending: false });
  
  console.log(`\nGenerated ${posts?.length || 0} articles:`);
  posts?.forEach((post, i) => {
    console.log(`${i + 1}. ${post.title} (${post.status})`);
  });
}

// Run if called directly
if (require.main === module) {
  generateAllArticles().catch(console.error);
}

export { generateAllArticles, wearableProducts, articleTopics };