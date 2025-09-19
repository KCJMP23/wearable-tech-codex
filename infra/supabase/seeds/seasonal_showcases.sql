-- Seed seasonal showcases for Fall 2025
-- This should be populated by the Seasonal Agent based on current season and trends

-- Get tenant ID (assuming nectarheat tenant exists)
WITH tenant AS (
  SELECT id FROM public.tenants WHERE slug = 'nectarheat' LIMIT 1
)
INSERT INTO public.seasonal_showcases (
  tenant_id,
  title,
  subtitle,
  description,
  cta_text,
  cta_link,
  badge_text,
  badge_emoji,
  gradient_from,
  gradient_to,
  season_type,
  is_active,
  valid_from,
  valid_until
)
SELECT 
  tenant.id,
  'Fall Fitness Revolution',
  'Perfect Weather for Outdoor Training',
  'Our AI discovered the top-rated GPS watches and fitness trackers for fall hiking, running, and outdoor adventures',
  'Shop Fall Collection',
  '/nectarheat/collections/fall-outdoor',
  'FALL 2025',
  '🍂',
  'from-orange-500',
  'to-amber-600',
  'fall',
  true,
  '2025-09-01'::TIMESTAMPTZ,
  '2025-11-30'::TIMESTAMPTZ
FROM tenant
UNION ALL
SELECT 
  tenant.id,
  'Back to School Tech',
  'Smart Devices for Students',
  'AI-selected smartwatches and fitness bands perfect for campus life, study tracking, and staying healthy',
  'Explore Student Deals',
  '/nectarheat/collections/student',
  'STUDENT SAVINGS',
  '🎓',
  'from-purple-500',
  'to-pink-600',
  'fall',
  true,
  '2025-08-15'::TIMESTAMPTZ,
  '2025-10-31'::TIMESTAMPTZ
FROM tenant
ON CONFLICT DO NOTHING;