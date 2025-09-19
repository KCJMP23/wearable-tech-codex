-- Seed sample blog posts and products for Fall 2025

-- Get tenant ID
WITH tenant AS (
  SELECT id FROM public.tenants WHERE slug = 'nectarheat' LIMIT 1
)

-- Insert sample products first
INSERT INTO public.products (
  tenant_id, asin, title, slug, description, price, rating, image_url, 
  affiliate_url, category, brand, features, is_active
)
SELECT 
  tenant.id,
  'B0CHX3RQPX',
  'Premium Tech Device 1',
  'premium-tech-device-1',
  'The most advanced device in its category with revolutionary features and all-day performance.',
  399.99,
  4.8,
  'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=800',
  'https://example.com/affiliate-link-1',
  'electronics',
  'TechBrand A',
  ARRAY['Premium display', 'Advanced monitoring', 'Smart features', 'Water resistant', 'Safety features']::TEXT[],
  true
FROM tenant
UNION ALL
SELECT 
  tenant.id,
  'B0BRVCY3XX',
  'Professional Device Pro',
  'professional-device-pro',
  'Premium professional device with advanced display and comprehensive performance metrics.',
  599.99,
  4.9,
  'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=800',
  'https://example.com/affiliate-link-2',
  'professional',
  'ProBrand B',
  ARRAY['Advanced touchscreen', 'Professional GPS', 'Performance readiness', 'Predictive analytics', '23-day battery life']::TEXT[],
  true
FROM tenant
UNION ALL
SELECT 
  tenant.id,
  'B09HB6HT6K',
  'Smart Ring Gen 3',
  'smart-ring-gen-3',
  'Smart ring that tracks activity and wellness with precision sensors.',
  299.00,
  4.6,
  'https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=800',
  'https://example.com/affiliate-link-3',
  'smart-accessories',
  'RingBrand C',
  ARRAY['Activity tracking', 'Wellness monitoring', 'Temperature trends', '7-day battery', 'Water resistant']::TEXT[],
  true
FROM tenant
UNION ALL
SELECT 
  tenant.id,
  'B0CC63XXNB',
  'Activity Tracker 6',
  'activity-tracker-6',
  'Advanced activity tracker with built-in GPS, monitoring features, and 7-day battery life.',
  159.95,
  4.5,
  'https://images.unsplash.com/photo-1556656793-08538906a9f8?w=800',
  'https://example.com/affiliate-link-4',
  'activity-trackers',
  'TrackerBrand D',
  ARRAY['Built-in GPS', 'Health app', 'Monitoring features', 'Wellness management', 'Music controls']::TEXT[],
  true
FROM tenant
UNION ALL
SELECT 
  tenant.id,
  'B0C78ZLZXZ',
  'Smart Device 6',
  'smart-device-6',
  'Comprehensive smart device with advanced monitoring and seamless smartphone integration.',
  329.99,
  4.7,
  'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800',
  'https://example.com/affiliate-link-5',
  'smart-devices',
  'SmartBrand E',
  ARRAY['Comprehensive analysis', 'Advanced coaching', 'Wellness monitoring', 'Smart OS', 'Water resistance']::TEXT[],
  true
FROM tenant
ON CONFLICT (tenant_id, slug) DO UPDATE
SET 
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  updated_at = NOW();

-- Insert taxonomy categories
WITH tenant AS (
  SELECT id FROM public.tenants WHERE slug = 'nectarheat' LIMIT 1
)
INSERT INTO public.taxonomy (tenant_id, name, slug, type, description)
SELECT 
  tenant.id,
  'Performance & Training',
  'performance-training',
  'category',
  'Articles about performance tracking, training metrics, and optimization'
FROM tenant
UNION ALL
SELECT 
  tenant.id,
  'Wellness & Lifestyle',
  'wellness-lifestyle',
  'category',
  'Content focused on wellness monitoring, lifestyle features, and daily applications'
FROM tenant
UNION ALL
SELECT 
  tenant.id,
  'Product Reviews',
  'product-reviews',
  'category',
  'In-depth reviews and comparisons of technology products'
FROM tenant
UNION ALL
SELECT 
  tenant.id,
  'Buying Guides',
  'buying-guides',
  'category',
  'Comprehensive guides to help you choose the right technology'
FROM tenant
ON CONFLICT (tenant_id, slug, type) DO NOTHING;

-- Insert blog posts
WITH tenant AS (
  SELECT id FROM public.tenants WHERE slug = 'nectarheat' LIMIT 1
)
INSERT INTO public.posts (
  tenant_id, title, slug, content, excerpt, featured_image, 
  meta_title, meta_description, status, view_count, published_at
)
SELECT 
  tenant.id,
  'Best Tech Products for Fall 2025: Complete Buying Guide',
  'best-tech-products-fall-2025',
  E'# Best Tech Products for Fall 2025\n\nAs we enter fall 2025, the technology market has never been more exciting. With new features like advanced analytics, monitoring capabilities, and AI-powered assistance, today''s tech products are more like personal digital companions.\n\n## Top Picks for Fall 2025\n\n### 1. Professional Device Pro\nThe Professional Device Pro stands out as our top pick for serious users. With its stunning display and comprehensive performance metrics, it''s perfect for fall productivity and optimization.\n\n**Key Features:**\n- Advanced GPS for accurate tracking\n- Performance readiness score\n- Predictive analytics\n- 23-day battery life\n\n### 2. Premium Tech Device 1\nFor mobile users, the Premium Tech Device 1 offers unmatched integration with your digital ecosystem. The new gesture controls and improved brightness make it perfect for outdoor fall activities.\n\n**Key Features:**\n- Premium display technology\n- Comprehensive monitoring\n- Seamless mobile integration\n- Advanced performance metrics\n\n### 3. Activity Tracker 6\nThe Activity Tracker 6 offers incredible value with built-in GPS and smart integration. It''s perfect for those new to activity tracking or looking for a reliable, affordable option.\n\n**Key Features:**\n- Built-in GPS\n- 7-day battery life\n- Music controls\n- Comprehensive monitoring\n\n## What to Look for in Fall 2025\n\nWhen choosing a tech product this fall, consider these key factors:\n\n1. **Battery Life**: Longer battery life means less charging during your busy fall schedule\n2. **Water Resistance**: Essential for outdoor use in fall weather\n3. **GPS Accuracy**: Critical for outdoor activities and navigation\n4. **Monitoring Features**: Look for 24/7 monitoring with advanced analysis\n5. **App Ecosystem**: Ensure compatibility with your favorite applications\n\n## Fall Features to Prioritize\n\n### Weather Performance\nAs temperatures drop, you need a device that performs well in various conditions. Look for models with good battery performance and responsive interfaces.\n\n### Indoor Activity Tracking\nWith shorter days, you''ll likely spend more time indoors. Features like automatic recognition and connectivity become crucial.\n\n### Performance Metrics\nFall is prime season for goal setting. Advanced performance metrics help you optimize and achieve better results.\n\n## Conclusion\n\nThe fall 2025 technology landscape offers something for everyone, from casual users to professionals. Whether you prioritize battery life, advanced metrics, or smartphone integration, there''s a perfect device waiting for you.\n\nRemember, the best tech product is the one you''ll actually use every day. Consider your lifestyle, goals, and budget when making your decision.',
  'Discover the best tech products for fall 2025 with our comprehensive buying guide featuring top picks, key features, and expert recommendations.',
  'https://images.unsplash.com/photo-1576243345690-4e4b79b63288?w=1200',
  'Best Tech Products Fall 2025 - Complete Buying Guide',
  'Find the perfect tech product for fall 2025. Compare top models with expert reviews and recommendations.',
  'published',
  245,
  NOW() - INTERVAL '2 days'
FROM tenant
UNION ALL
SELECT 
  tenant.id,
  'Premium Tech Device Review: The Ultimate Smart Device for Users',
  'premium-tech-device-review',
  E'# Premium Tech Device Review: 6 Months Later\n\nAfter six months of daily use, the Premium Tech Device has proven itself as the most refined smart device in its category. But is it worth the upgrade? Let''s dive deep.\n\n## Design & Display\n\nThe device maintains premium design language while introducing subtle refinements. The new finish options are stunning, and the display brightness makes outdoor visibility exceptional, even in bright fall sunlight.\n\nThe gesture controls are genuinely useful, allowing you to interact with your device without touching the screen - perfect when your hands are full or during activities.\n\n## Features & Tracking\n\n### Precision Finding\nThe new processor enables precision finding for connected devices, making it nearly impossible to lose your paired equipment. The haptic and audio feedback guides you directly to your device.\n\n### Advanced Sensing\nThe advanced sensors continue to provide valuable insights for monitoring and wellness tracking. After months of use, the baseline data has become increasingly accurate.\n\n### Performance Metrics\nThe app now includes custom configuration and more detailed performance metrics. Users will appreciate the new performance zones and threshold measurements.\n\n## Battery Life & Performance\n\n18+ hours of battery life remains strong, which is excellent and manageable with daily charging routines. The faster on-device processing is noticeably quicker, making voice commands more practical.\n\n## Smart Features\n\nThe new Smart Stack is brilliant, surfacing relevant information throughout your day. During activities, it automatically shows performance metrics, weather, and controls.\n\n## Who Should Buy?\n\n**Upgrade from older models:** Absolutely worth it\n**Upgrade from recent models:** Only if you need the enhanced features\n**First-time buyers:** The best smart device you can buy in this category\n\n## Verdict\n\nThe Premium Tech Device isn''t revolutionary, but it''s the culmination of years of refinement. For users seeking comprehensive monitoring and seamless ecosystem integration, it remains unmatched.\n\n**Score: 9/10**',
  'Our comprehensive 6-month review of the Premium Tech Device covering design, smart features, battery life, and whether it''s worth upgrading.',
  'https://images.unsplash.com/photo-1544117519-31a4b719223d?w=1200',
  'Premium Tech Device Review - 6 Months Later',
  'In-depth Premium Tech Device review after 6 months of testing. Discover if it''s worth upgrading with our comprehensive analysis.',
  'published',
  523,
  NOW() - INTERVAL '5 days'
FROM tenant
UNION ALL
SELECT 
  tenant.id,
  'Wellness Tracking Showdown: Premium Device Comparison',
  'wellness-tracking-comparison-2025',
  E'# Wellness Tracking Showdown: Which Device Tracks Wellness Best?\n\nWellness tracking has become one of the most important features of modern smart devices. We spent three months testing the top contenders to find out which device provides the most accurate and actionable wellness insights.\n\n## The Contenders\n\n- **Smart Ring Gen 3** - The wellness tracking specialist\n- **Premium Tech Device 1** - The ecosystem champion\n- **Activity Tracker 6** - The affordable option\n\n## Testing Methodology\n\nWe used all three devices simultaneously for 90 days, comparing their data against professional monitoring equipment for accuracy validation.\n\n## Wellness Detection\n\n### Smart Ring Gen 3\nThe ring''s wellness detection proved most accurate, correctly identifying various wellness stages 89% of the time. The ring form factor provides consistent monitoring data without movement artifacts.\n\n### Premium Tech Device 1\nThe premium device''s wellness tracking has improved significantly with recent updates. It accurately detected wellness patterns 82% of the time, with particularly good monitoring capabilities.\n\n### Activity Tracker 6\nThe tracker''s long history in wellness monitoring shows, achieving 85% accuracy. The Wellness Profile feature provides excellent long-term trends.\n\n## Wellness Metrics Compared\n\n| Metric | Smart Ring | Premium Device | Activity Tracker |\n|--------|------------|----------------|------------------|\n| Wellness Stages | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |\n| Variability Tracking | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |\n| Temperature | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ❌ |\n| Readiness Score | ⭐⭐⭐⭐⭐ | ❌ | ⭐⭐⭐ |\n| Battery Life | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ |\n\n## Comfort & Wearability\n\nThe Smart Ring wins hands-down for comfort. Many users forget they''re wearing it, while larger devices can be less comfortable for extended wear.\n\n## Actionable Insights\n\n### Smart Ring\nProvides the most comprehensive insights with its Readiness Score, suggesting optimal schedules and identifying factors affecting wellness.\n\n### Premium Device\nIntegrates beautifully with mobile health apps, providing consistency tracking and wellness reminders.\n\n### Activity Tracker\nExcels at long-term trend analysis with its premium features, offering personalized wellness insights and guided programs.\n\n## The Verdict\n\n**Best Overall:** Smart Ring Gen 3\n**Best for Mobile Users:** Premium Tech Device 1\n**Best Value:** Activity Tracker 6\n\nYour choice depends on priorities: comfort and accuracy (Smart Ring), ecosystem integration (Premium Device), or affordability (Activity Tracker).',
  'Comprehensive comparison of wellness tracking capabilities across premium smart devices based on 90 days of testing.',
  'https://images.unsplash.com/photo-1558427400-bc691467a8a9?w=1200',
  'Wellness Tracking Comparison: Smart Device Showdown',
  'Find the best wellness tracking device with our detailed comparison of premium smart devices based on 90 days of testing.',
  'published',
  892,
  NOW() - INTERVAL '1 week'
FROM tenant
ON CONFLICT (tenant_id, slug) DO UPDATE
SET 
  content = EXCLUDED.content,
  excerpt = EXCLUDED.excerpt,
  updated_at = NOW();

-- Link posts to products
WITH 
  tenant AS (SELECT id FROM public.tenants WHERE slug = 'nectarheat' LIMIT 1),
  post1 AS (SELECT id FROM public.posts WHERE slug = 'best-fitness-trackers-fall-2025' LIMIT 1),
  post2 AS (SELECT id FROM public.posts WHERE slug = 'apple-watch-series-9-review' LIMIT 1),
  post3 AS (SELECT id FROM public.posts WHERE slug = 'sleep-tracking-comparison-2025' LIMIT 1)
INSERT INTO public.post_products (post_id, product_id, display_order)
SELECT 
  post1.id,
  p.id,
  ROW_NUMBER() OVER (ORDER BY p.name)
FROM post1, public.products p
WHERE p.slug IN ('professional-device-pro', 'premium-tech-device-1', 'activity-tracker-6')
UNION ALL
SELECT 
  post2.id,
  p.id,
  1
FROM post2, public.products p
WHERE p.slug = 'premium-tech-device-1'
UNION ALL
SELECT 
  post3.id,
  p.id,
  ROW_NUMBER() OVER (ORDER BY p.name)
FROM post3, public.products p
WHERE p.slug IN ('smart-ring-gen-3', 'premium-tech-device-1', 'activity-tracker-6')
ON CONFLICT (post_id, product_id) DO NOTHING;

-- Link posts to categories
WITH 
  tenant AS (SELECT id FROM public.tenants WHERE slug = 'nectarheat' LIMIT 1),
  post1 AS (SELECT id FROM public.posts WHERE slug = 'best-tech-products-fall-2025' LIMIT 1),
  post2 AS (SELECT id FROM public.posts WHERE slug = 'premium-tech-device-review' LIMIT 1),
  post3 AS (SELECT id FROM public.posts WHERE slug = 'wellness-tracking-comparison-2025' LIMIT 1),
  cat1 AS (SELECT id FROM public.taxonomy WHERE slug = 'buying-guides' AND type = 'category' LIMIT 1),
  cat2 AS (SELECT id FROM public.taxonomy WHERE slug = 'product-reviews' AND type = 'category' LIMIT 1),
  cat3 AS (SELECT id FROM public.taxonomy WHERE slug = 'health-wellness' AND type = 'category' LIMIT 1)
INSERT INTO public.post_taxonomy (post_id, taxonomy_id)
SELECT post1.id, cat1.id FROM post1, cat1
UNION ALL
SELECT post2.id, cat2.id FROM post2, cat2
UNION ALL
SELECT post3.id, cat2.id FROM post3, cat2
UNION ALL
SELECT post3.id, cat3.id FROM post3, cat3
ON CONFLICT (post_id, taxonomy_id) DO NOTHING;