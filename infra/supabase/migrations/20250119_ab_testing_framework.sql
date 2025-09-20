-- A/B Testing Framework Schema

-- Experiments table
CREATE TABLE IF NOT EXISTS ab_experiments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  hypothesis TEXT,
  status TEXT NOT NULL CHECK (status IN ('draft', 'running', 'paused', 'completed', 'archived')),
  variants JSONB NOT NULL DEFAULT '[]',
  metrics JSONB NOT NULL DEFAULT '[]',
  segments JSONB DEFAULT '[]',
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  minimum_sample_size INTEGER,
  confidence_level NUMERIC(3,2) DEFAULT 0.95,
  statistical_test TEXT,
  allocation JSONB NOT NULL DEFAULT '{"type": "fixed"}',
  winner_selection_criteria JSONB,
  winner_variant_id TEXT,
  feature_flags TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Exposures table (tracks when users see variants)
CREATE TABLE IF NOT EXISTS ab_exposures (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  experiment_id TEXT NOT NULL REFERENCES ab_experiments(id) ON DELETE CASCADE,
  variant_id TEXT NOT NULL,
  user_id TEXT,
  session_id TEXT NOT NULL,
  context JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Conversions table (tracks conversion events)
CREATE TABLE IF NOT EXISTS ab_conversions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  experiment_id TEXT NOT NULL REFERENCES ab_experiments(id) ON DELETE CASCADE,
  variant_id TEXT NOT NULL,
  metric_id TEXT NOT NULL,
  user_id TEXT,
  session_id TEXT NOT NULL,
  value NUMERIC,
  revenue NUMERIC,
  context JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Feature flags table
CREATE TABLE IF NOT EXISTS feature_flags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  enabled BOOLEAN DEFAULT TRUE,
  rollout_percentage NUMERIC(5,2),
  experiments TEXT[] DEFAULT '{}',
  conditions JSONB DEFAULT '[]',
  variations JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Feature flag exposures (for analytics)
CREATE TABLE IF NOT EXISTS feature_flag_exposures (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  flag_id TEXT NOT NULL REFERENCES feature_flags(id) ON DELETE CASCADE,
  user_id TEXT,
  session_id TEXT NOT NULL,
  value JSONB,
  context JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Segments table
CREATE TABLE IF NOT EXISTS segments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  conditions JSONB NOT NULL DEFAULT '[]',
  operator TEXT DEFAULT 'AND' CHECK (operator IN ('AND', 'OR')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Segment results (cached segment analysis)
CREATE TABLE IF NOT EXISTS ab_segment_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  experiment_id TEXT NOT NULL REFERENCES ab_experiments(id) ON DELETE CASCADE,
  segment_id TEXT NOT NULL,
  segment_name TEXT,
  exposures INTEGER DEFAULT 0,
  variants JSONB DEFAULT '[]',
  calculated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance metrics table
CREATE TABLE IF NOT EXISTS ab_performance_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  experiment_id TEXT NOT NULL REFERENCES ab_experiments(id) ON DELETE CASCADE,
  variant_id TEXT NOT NULL,
  metrics JSONB NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Allocation history (for tracking dynamic allocation changes)
CREATE TABLE IF NOT EXISTS ab_allocation_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  experiment_id TEXT NOT NULL REFERENCES ab_experiments(id) ON DELETE CASCADE,
  allocation JSONB NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Winner decisions table
CREATE TABLE IF NOT EXISTS ab_winner_decisions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  experiment_id TEXT NOT NULL REFERENCES ab_experiments(id) ON DELETE CASCADE,
  has_winner BOOLEAN NOT NULL,
  winner_variant_id TEXT,
  confidence NUMERIC(5,4),
  reason TEXT,
  recommendation TEXT,
  metrics JSONB,
  auto_implement BOOLEAN DEFAULT FALSE,
  implemented BOOLEAN DEFAULT FALSE,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Reports table
CREATE TABLE IF NOT EXISTS ab_reports (
  id TEXT PRIMARY KEY,
  experiment_id TEXT NOT NULL REFERENCES ab_experiments(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('summary', 'detailed', 'segment', 'funnel', 'timeseries')),
  data JSONB NOT NULL,
  insights JSONB DEFAULT '[]',
  recommendations JSONB DEFAULT '[]',
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Events table (generic event tracking)
CREATE TABLE IF NOT EXISTS ab_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  experiment_id TEXT NOT NULL REFERENCES ab_experiments(id) ON DELETE CASCADE,
  variant_id TEXT NOT NULL,
  user_id TEXT,
  session_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  properties JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ab_exposures_experiment ON ab_exposures(experiment_id);
CREATE INDEX IF NOT EXISTS idx_ab_exposures_variant ON ab_exposures(variant_id);
CREATE INDEX IF NOT EXISTS idx_ab_exposures_session ON ab_exposures(session_id);
CREATE INDEX IF NOT EXISTS idx_ab_exposures_user ON ab_exposures(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ab_exposures_timestamp ON ab_exposures(timestamp);

CREATE INDEX IF NOT EXISTS idx_ab_conversions_experiment ON ab_conversions(experiment_id);
CREATE INDEX IF NOT EXISTS idx_ab_conversions_variant ON ab_conversions(variant_id);
CREATE INDEX IF NOT EXISTS idx_ab_conversions_metric ON ab_conversions(metric_id);
CREATE INDEX IF NOT EXISTS idx_ab_conversions_session ON ab_conversions(session_id);
CREATE INDEX IF NOT EXISTS idx_ab_conversions_user ON ab_conversions(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ab_conversions_timestamp ON ab_conversions(timestamp);

CREATE INDEX IF NOT EXISTS idx_feature_flag_exposures_flag ON feature_flag_exposures(flag_id);
CREATE INDEX IF NOT EXISTS idx_feature_flag_exposures_session ON feature_flag_exposures(session_id);
CREATE INDEX IF NOT EXISTS idx_feature_flag_exposures_timestamp ON feature_flag_exposures(timestamp);

CREATE INDEX IF NOT EXISTS idx_ab_performance_experiment ON ab_performance_metrics(experiment_id, variant_id);
CREATE INDEX IF NOT EXISTS idx_ab_performance_timestamp ON ab_performance_metrics(timestamp);

CREATE INDEX IF NOT EXISTS idx_ab_events_experiment ON ab_events(experiment_id);
CREATE INDEX IF NOT EXISTS idx_ab_events_type ON ab_events(event_type);
CREATE INDEX IF NOT EXISTS idx_ab_events_timestamp ON ab_events(timestamp);

-- Row Level Security
ALTER TABLE ab_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_exposures ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flag_exposures ENABLE ROW LEVEL SECURITY;
ALTER TABLE segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_reports ENABLE ROW LEVEL SECURITY;

-- Policies (adjust based on your auth requirements)
CREATE POLICY "Experiments are viewable by authenticated users" 
  ON ab_experiments FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Experiments are editable by admins" 
  ON ab_experiments FOR ALL 
  TO authenticated 
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Exposures are insertable by service role" 
  ON ab_exposures FOR INSERT 
  TO service_role 
  WITH CHECK (true);

CREATE POLICY "Conversions are insertable by service role" 
  ON ab_conversions FOR INSERT 
  TO service_role 
  WITH CHECK (true);

-- Functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_ab_experiments_updated_at
  BEFORE UPDATE ON ab_experiments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_feature_flags_updated_at
  BEFORE UPDATE ON feature_flags
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_segments_updated_at
  BEFORE UPDATE ON segments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Function to calculate experiment statistics
CREATE OR REPLACE FUNCTION calculate_experiment_stats(experiment_id_param TEXT)
RETURNS TABLE (
  variant_id TEXT,
  exposures BIGINT,
  conversions BIGINT,
  conversion_rate NUMERIC,
  revenue NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.variant_id,
    COUNT(DISTINCT e.session_id) as exposures,
    COUNT(DISTINCT c.session_id) as conversions,
    CASE 
      WHEN COUNT(DISTINCT e.session_id) > 0 
      THEN COUNT(DISTINCT c.session_id)::NUMERIC / COUNT(DISTINCT e.session_id)
      ELSE 0
    END as conversion_rate,
    COALESCE(SUM(c.revenue), 0) as revenue
  FROM ab_exposures e
  LEFT JOIN ab_conversions c ON 
    e.experiment_id = c.experiment_id AND 
    e.variant_id = c.variant_id AND 
    e.session_id = c.session_id
  WHERE e.experiment_id = experiment_id_param
  GROUP BY e.variant_id;
END;
$$ LANGUAGE plpgsql;

-- Function to check experiment readiness
CREATE OR REPLACE FUNCTION check_experiment_ready(experiment_id_param TEXT)
RETURNS TABLE (
  is_ready BOOLEAN,
  reason TEXT,
  current_exposures BIGINT,
  required_exposures INTEGER,
  duration_hours NUMERIC
) AS $$
DECLARE
  exp_record RECORD;
  total_exposures BIGINT;
  hours_running NUMERIC;
BEGIN
  -- Get experiment details
  SELECT * INTO exp_record 
  FROM ab_experiments 
  WHERE id = experiment_id_param;

  -- Calculate total exposures
  SELECT COUNT(*) INTO total_exposures
  FROM ab_exposures
  WHERE experiment_id = experiment_id_param;

  -- Calculate duration
  IF exp_record.start_date IS NOT NULL THEN
    hours_running := EXTRACT(EPOCH FROM (NOW() - exp_record.start_date)) / 3600;
  ELSE
    hours_running := 0;
  END IF;

  RETURN QUERY
  SELECT
    CASE 
      WHEN total_exposures >= COALESCE(exp_record.minimum_sample_size, 100) * 2 
        AND hours_running >= 24
      THEN TRUE
      ELSE FALSE
    END as is_ready,
    CASE 
      WHEN total_exposures < COALESCE(exp_record.minimum_sample_size, 100) * 2
      THEN 'Insufficient sample size'
      WHEN hours_running < 24
      THEN 'Experiment needs more time'
      ELSE 'Ready for analysis'
    END as reason,
    total_exposures as current_exposures,
    COALESCE(exp_record.minimum_sample_size, 100) * 2 as required_exposures,
    hours_running as duration_hours;
END;
$$ LANGUAGE plpgsql;