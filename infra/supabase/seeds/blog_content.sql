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
  'Apple Watch Series 9',
  'apple-watch-series-9',
  'The most advanced Apple Watch yet with revolutionary health features and all-day battery life.',
  399.99,
  4.8,
  'https://images.unsplash.com/photo-1544117519-31a4b719223d?w=800',
  'https://amzn.to/apple-watch-9',
  'smartwatches',
  'Apple',
  ARRAY['Always-On Retina display', 'Blood oxygen monitoring', 'ECG app', 'Water resistant to 50m', 'Fall detection']::TEXT[],
  true
FROM tenant
UNION ALL
SELECT 
  tenant.id,
  'B0BRVCY3XX',
  'Garmin Forerunner 965',
  'garmin-forerunner-965',
  'Premium GPS running and triathlon smartwatch with AMOLED display and advanced training metrics.',
  599.99,
  4.9,
  'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=800',
  'https://amzn.to/garmin-965',
  'fitness-trackers',
  'Garmin',
  ARRAY['AMOLED touchscreen', 'Multi-band GPS', 'Training readiness', 'Race predictor', '23-day battery life']::TEXT[],
  true
FROM tenant
UNION ALL
SELECT 
  tenant.id,
  'B09HB6HT6K',
  'Oura Ring Gen 3',
  'oura-ring-gen-3',
  'Smart ring that tracks sleep, activity, and readiness with precision sensors.',
  299.00,
  4.6,
  'https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=800',
  'https://ouraring.com',
  'smart-rings',
  'Oura',
  ARRAY['Sleep tracking', 'HRV monitoring', 'Temperature trends', '7-day battery', 'Water resistant']::TEXT[],
  true
FROM tenant
UNION ALL
SELECT 
  tenant.id,
  'B0CC63XXNB',
  'Fitbit Charge 6',
  'fitbit-charge-6',
  'Advanced fitness tracker with built-in GPS, heart rate monitoring, and 7-day battery life.',
  159.95,
  4.5,
  'https://images.unsplash.com/photo-1576243345690-4e4b79b63288?w=800',
  'https://amzn.to/fitbit-charge-6',
  'fitness-trackers',
  'Fitbit',
  ARRAY['Built-in GPS', 'ECG app', 'SpO2 monitoring', 'Stress management', 'YouTube Music controls']::TEXT[],
  true
FROM tenant
UNION ALL
SELECT 
  tenant.id,
  'B0C78ZLZXZ',
  'Samsung Galaxy Watch 6',
  'samsung-galaxy-watch-6',
  'Android''s best smartwatch with comprehensive health tracking and seamless smartphone integration.',
  329.99,
  4.7,
  'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=800',
  'https://amzn.to/galaxy-watch-6',
  'smartwatches',
  'Samsung',
  ARRAY['Body composition analysis', 'Advanced sleep coaching', 'Blood pressure monitoring', 'Wear OS', 'IP68 water resistance']::TEXT[],
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
  'Fitness & Training',
  'fitness-training',
  'category',
  'Articles about fitness tracking, training metrics, and workout optimization'
FROM tenant
UNION ALL
SELECT 
  tenant.id,
  'Health & Wellness',
  'health-wellness',
  'category',
  'Content focused on health monitoring, wellness features, and medical applications'
FROM tenant
UNION ALL
SELECT 
  tenant.id,
  'Product Reviews',
  'product-reviews',
  'category',
  'In-depth reviews and comparisons of wearable technology'
FROM tenant
UNION ALL
SELECT 
  tenant.id,
  'Buying Guides',
  'buying-guides',
  'category',
  'Comprehensive guides to help you choose the right wearable tech'
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
  'Best Fitness Trackers for Fall 2025: Complete Buying Guide',
  'best-fitness-trackers-fall-2025',
  E'# Best Fitness Trackers for Fall 2025\n\nAs we enter fall 2025, the fitness tracker market has never been more exciting. With new features like advanced sleep analysis, stress monitoring, and AI-powered coaching, today''s fitness trackers are more like personal wellness companions.\n\n## Top Picks for Fall 2025\n\n### 1. Garmin Forerunner 965\nThe Garmin Forerunner 965 stands out as our top pick for serious athletes. With its stunning AMOLED display and comprehensive training metrics, it''s perfect for fall marathon training.\n\n**Key Features:**\n- Multi-band GPS for accurate tracking\n- Training readiness score\n- Race predictor\n- 23-day battery life\n\n### 2. Apple Watch Series 9\nFor iPhone users, the Apple Watch Series 9 offers unmatched integration with the Apple ecosystem. The new double-tap gesture and improved brightness make it perfect for outdoor fall activities.\n\n**Key Features:**\n- Always-On Retina display\n- Comprehensive health monitoring\n- Seamless iPhone integration\n- Advanced workout metrics\n\n### 3. Fitbit Charge 6\nThe Fitbit Charge 6 offers incredible value with built-in GPS and Google integration. It''s perfect for those new to fitness tracking or looking for a reliable, affordable option.\n\n**Key Features:**\n- Built-in GPS\n- 7-day battery life\n- YouTube Music controls\n- Comprehensive sleep tracking\n\n## What to Look for in Fall 2025\n\nWhen choosing a fitness tracker this fall, consider these key factors:\n\n1. **Battery Life**: Longer battery life means less charging during your busy fall schedule\n2. **Water Resistance**: Essential for rainy fall weather\n3. **GPS Accuracy**: Critical for outdoor running and hiking\n4. **Heart Rate Monitoring**: Look for 24/7 monitoring with HRV analysis\n5. **App Ecosystem**: Ensure compatibility with your favorite fitness apps\n\n## Fall Fitness Features to Prioritize\n\n### Cold Weather Performance\nAs temperatures drop, you need a tracker that performs well in cold conditions. Look for models with good battery performance in low temperatures and screens that remain responsive with gloves.\n\n### Indoor Workout Tracking\nWith shorter days, you''ll likely do more indoor workouts. Features like automatic exercise recognition and gym equipment connectivity become crucial.\n\n### Recovery Metrics\nFall is prime training season for spring races. Advanced recovery metrics help you train smarter and avoid overtraining.\n\n## Conclusion\n\nThe fall 2025 fitness tracker landscape offers something for everyone, from casual walkers to serious athletes. Whether you prioritize battery life, advanced metrics, or smartphone integration, there''s a perfect tracker waiting for you.\n\nRemember, the best fitness tracker is the one you''ll actually wear every day. Consider your lifestyle, fitness goals, and budget when making your decision.',
  'Discover the best fitness trackers for fall 2025 with our comprehensive buying guide featuring top picks, key features, and expert recommendations.',
  'https://images.unsplash.com/photo-1576243345690-4e4b79b63288?w=1200',
  'Best Fitness Trackers Fall 2025 - Complete Buying Guide',
  'Find the perfect fitness tracker for fall 2025. Compare top models from Garmin, Apple, Fitbit and more with expert reviews and recommendations.',
  'published',
  245,
  NOW() - INTERVAL '2 days'
FROM tenant
UNION ALL
SELECT 
  tenant.id,
  'Apple Watch Series 9 Review: The Ultimate Smartwatch for iPhone Users',
  'apple-watch-series-9-review',
  E'# Apple Watch Series 9 Review: 6 Months Later\n\nAfter six months of daily use, the Apple Watch Series 9 has proven itself as the most refined smartwatch Apple has ever created. But is it worth the upgrade? Let''s dive deep.\n\n## Design & Display\n\nThe Series 9 maintains Apple''s iconic design language while introducing subtle refinements. The new pink aluminum finish is stunning, and the display brightness of 2000 nits makes outdoor visibility exceptional, even in bright fall sunlight.\n\nThe double-tap gesture is genuinely useful, allowing you to interact with your watch without touching the screen - perfect when your hands are full or during workouts.\n\n## Health & Fitness Tracking\n\n### Precision Finding for iPhone\nThe new S9 chip enables Precision Finding for iPhone 15 models, making it nearly impossible to lose your phone. The haptic and audio feedback guides you directly to your device.\n\n### Temperature Sensing\nThe temperature sensor, introduced in Series 8, continues to provide valuable insights for cycle tracking and overall wellness monitoring. After months of use, the baseline temperature data has become increasingly accurate.\n\n### Workout Metrics\nThe workout app now includes custom workout creation and more detailed cycling metrics. Fall cyclists will appreciate the new power zones and functional threshold power measurements.\n\n## Battery Life & Performance\n\n18 hours of battery life remains unchanged, which is disappointing but manageable with daily charging routines. The faster on-device Siri processing is noticeably quicker, making voice commands more practical.\n\n## watchOS 10 Features\n\nThe new Smart Stack is brilliant, surfacing relevant widgets throughout your day. During my morning runs, it automatically shows workout metrics, weather, and music controls.\n\n## Who Should Buy?\n\n**Upgrade from Series 7 or earlier:** Absolutely worth it\n**Upgrade from Series 8:** Only if you need the brighter display or double-tap gesture\n**First-time buyers:** The best smartwatch you can buy for iPhone\n\n## Verdict\n\nThe Apple Watch Series 9 isn''t revolutionary, but it''s the culmination of years of refinement. For iPhone users seeking comprehensive health tracking and seamless ecosystem integration, it remains unmatched.\n\n**Score: 9/10**',
  'Our comprehensive 6-month review of the Apple Watch Series 9 covering design, health features, battery life, and whether it''s worth upgrading.',
  'https://images.unsplash.com/photo-1544117519-31a4b719223d?w=1200',
  'Apple Watch Series 9 Review - 6 Months Later',
  'In-depth Apple Watch Series 9 review after 6 months of testing. Discover if it''s worth upgrading with our comprehensive analysis.',
  'published',
  523,
  NOW() - INTERVAL '5 days'
FROM tenant
UNION ALL
SELECT 
  tenant.id,
  'Sleep Tracking Showdown: Oura Ring vs Apple Watch vs Fitbit',
  'sleep-tracking-comparison-2025',
  E'# Sleep Tracking Showdown: Which Wearable Tracks Sleep Best?\n\nSleep tracking has become one of the most important features of modern wearables. We spent three months testing the top contenders to find out which device provides the most accurate and actionable sleep insights.\n\n## The Contenders\n\n- **Oura Ring Gen 3** - The sleep tracking specialist\n- **Apple Watch Series 9** - The ecosystem champion\n- **Fitbit Charge 6** - The affordable option\n\n## Testing Methodology\n\nWe wore all three devices simultaneously for 90 nights, comparing their data against a sleep lab polysomnography test for accuracy validation.\n\n## Sleep Stage Detection\n\n### Oura Ring Gen 3\nOura''s sleep stage detection proved most accurate, correctly identifying REM, deep, and light sleep stages 89% of the time. The ring form factor provides consistent heart rate data without movement artifacts.\n\n### Apple Watch Series 9\nApple''s sleep tracking has improved significantly with watchOS 10. It accurately detected sleep stages 82% of the time, with particularly good REM detection.\n\n### Fitbit Charge 6\nFitbit''s long history in sleep tracking shows, achieving 85% accuracy. The Sleep Profile feature provides excellent long-term trends.\n\n## Sleep Metrics Compared\n\n| Metric | Oura Ring | Apple Watch | Fitbit |\n|--------|-----------|-------------|--------|\n| Sleep Stages | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |\n| HRV Tracking | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |\n| Temperature | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ❌ |\n| Readiness Score | ⭐⭐⭐⭐⭐ | ❌ | ⭐⭐⭐ |\n| Battery Life | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ |\n\n## Comfort & Wearability\n\nThe Oura Ring wins hands-down for sleep comfort. Many users forget they''re wearing it, while watches can be uncomfortable for side sleepers.\n\n## Actionable Insights\n\n### Oura Ring\nProvides the most comprehensive insights with its Readiness Score, suggesting optimal bedtimes and identifying factors affecting sleep quality.\n\n### Apple Watch\nIntegrates beautifully with iPhone''s Health app, providing sleep consistency tracking and bedtime reminders.\n\n### Fitbit\nExcels at long-term trend analysis with its Premium subscription, offering personalized sleep insights and guided programs.\n\n## The Verdict\n\n**Best Overall:** Oura Ring Gen 3\n**Best for iPhone Users:** Apple Watch Series 9\n**Best Value:** Fitbit Charge 6\n\nYour choice depends on priorities: comfort and accuracy (Oura), ecosystem integration (Apple), or affordability (Fitbit).',
  'Comprehensive comparison of sleep tracking capabilities across Oura Ring, Apple Watch, and Fitbit devices based on 90 days of testing.',
  'https://images.unsplash.com/photo-1558427400-bc691467a8a9?w=1200',
  'Sleep Tracking Comparison: Oura vs Apple Watch vs Fitbit',
  'Find the best sleep tracking wearable with our detailed comparison of Oura Ring, Apple Watch, and Fitbit based on 90 nights of testing.',
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
WHERE p.slug IN ('garmin-forerunner-965', 'apple-watch-series-9', 'fitbit-charge-6')
UNION ALL
SELECT 
  post2.id,
  p.id,
  1
FROM post2, public.products p
WHERE p.slug = 'apple-watch-series-9'
UNION ALL
SELECT 
  post3.id,
  p.id,
  ROW_NUMBER() OVER (ORDER BY p.name)
FROM post3, public.products p
WHERE p.slug IN ('oura-ring-gen-3', 'apple-watch-series-9', 'fitbit-charge-6')
ON CONFLICT (post_id, product_id) DO NOTHING;

-- Link posts to categories
WITH 
  tenant AS (SELECT id FROM public.tenants WHERE slug = 'nectarheat' LIMIT 1),
  post1 AS (SELECT id FROM public.posts WHERE slug = 'best-fitness-trackers-fall-2025' LIMIT 1),
  post2 AS (SELECT id FROM public.posts WHERE slug = 'apple-watch-series-9-review' LIMIT 1),
  post3 AS (SELECT id FROM public.posts WHERE slug = 'sleep-tracking-comparison-2025' LIMIT 1),
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