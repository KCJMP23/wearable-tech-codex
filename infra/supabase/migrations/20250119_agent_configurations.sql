-- Create agent_configurations table for automation
CREATE TABLE IF NOT EXISTS public.agent_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  cycle_schedule TEXT NOT NULL, -- Cron expression
  is_active BOOLEAN DEFAULT true,
  whitelisted_sources JSONB NOT NULL DEFAULT '[]'::jsonb,
  configuration JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_agent_configurations_active ON public.agent_configurations(is_active);
CREATE INDEX idx_agent_configurations_next_run ON public.agent_configurations(next_run_at);

-- Insert agent configurations
INSERT INTO public.agent_configurations (agent_name, description, cycle_schedule, whitelisted_sources, configuration) VALUES
(
  'seasonal_agent',
  'Updates seasonal showcases and collections based on current season, weather, and trends',
  '0 0 * * *', -- Daily at midnight
  '["openweathermap.org", "trends.google.com", "amazon.com", "bestbuy.com", "target.com", "nrf.com", "retaildive.com"]'::jsonb,
  '{
    "max_showcases": 4,
    "auto_archive_days": 90,
    "season_mapping": {
      "fall": {"months": [9, 10, 11], "emoji": "🍂"},
      "winter": {"months": [12, 1, 2], "emoji": "❄️"},
      "spring": {"months": [3, 4, 5], "emoji": "🌸"},
      "summer": {"months": [6, 7, 8], "emoji": "☀️"}
    }
  }'::jsonb
),
(
  'product_discovery_agent',
  'Discovers and imports new wearable tech products',
  '0 */6 * * *', -- Every 6 hours
  '["amazon.com", "bestbuy.com", "walmart.com", "target.com", "garmin.com", "fitbit.com", "apple.com", "samsung.com"]'::jsonb,
  '{
    "categories": ["smartwatches", "fitness-trackers", "smart-rings", "smart-glasses", "health-monitors"],
    "min_rating": 3.5,
    "max_price": 2000,
    "check_duplicates": true
  }'::jsonb
),
(
  'editorial_agent',
  'Generates blog posts, reviews, and comparison content',
  '0 8,20 * * *', -- Twice daily
  '["theverge.com", "wired.com", "techcrunch.com", "engadget.com", "dcrainmaker.com", "wareable.com", "androidauthority.com", "9to5mac.com"]'::jsonb,
  '{
    "content_types": ["review", "comparison", "guide", "news"],
    "min_word_count": 800,
    "max_word_count": 2000,
    "seo_optimization": true
  }'::jsonb
),
(
  'trends_agent',
  'Monitors and analyzes wearable tech trends',
  '0 */4 * * *', -- Every 4 hours
  '["trends.google.com", "twitter.com", "reddit.com", "producthunt.com", "kickstarter.com", "indiegogo.com"]'::jsonb,
  '{
    "trend_threshold": 0.7,
    "lookback_days": 7,
    "min_mentions": 10
  }'::jsonb
),
(
  'newsletter_agent',
  'Creates and schedules email newsletters',
  '0 14 * * 4', -- Weekly Thursday at 2 PM
  '[]'::jsonb, -- Internal data only
  '{
    "max_products": 5,
    "max_posts": 3,
    "personalization": true,
    "ab_testing": true
  }'::jsonb
),
(
  'analytics_agent',
  'Tracks performance and generates insights',
  '0 2 * * *', -- Daily at 2 AM
  '["analytics.google.com", "associates.amazon.com", "cj.com", "shareasale.com", "impactradius.com"]'::jsonb,
  '{
    "metrics": ["conversions", "revenue", "traffic", "engagement"],
    "report_frequency": "daily",
    "alert_threshold": 0.2
  }'::jsonb
),
(
  'orchestrator_agent',
  'Coordinates all other agents and ensures system health',
  '*/15 * * * *', -- Every 15 minutes
  '[]'::jsonb, -- Internal only
  '{
    "health_check_interval": 300,
    "max_retries": 3,
    "alert_on_failure": true
  }'::jsonb
)
ON CONFLICT (agent_name) DO UPDATE SET
  description = EXCLUDED.description,
  cycle_schedule = EXCLUDED.cycle_schedule,
  whitelisted_sources = EXCLUDED.whitelisted_sources,
  configuration = EXCLUDED.configuration,
  updated_at = NOW();

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_agent_configurations_updated_at
  BEFORE UPDATE ON public.agent_configurations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();