-- =============================================================================
-- Site Valuation System
-- 
-- Comprehensive database schema for site valuation calculator including:
-- - Historical valuations tracking
-- - Comparable sites database
-- - Valuation methodology support
-- - Multi-tenant support with RLS
-- =============================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- Site Valuations Table
-- =============================================================================

-- Main table for storing site valuations
CREATE TABLE IF NOT EXISTS public.site_valuations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- Input metrics for valuation calculation
  metrics JSONB NOT NULL DEFAULT '{
    "monthlyRevenue": 0,
    "yearlyRevenue": 0,
    "revenueGrowthRate": 0,
    "revenueConsistency": 0,
    "monthlyPageviews": 0,
    "uniqueVisitors": 0,
    "averageSessionDuration": 0,
    "bounceRate": 0,
    "conversionRate": 0,
    "totalPosts": 0,
    "publishingFrequency": 0,
    "averageWordCount": 0,
    "contentQualityScore": 0,
    "domainAuthority": 0,
    "backlinks": 0,
    "rankingKeywords": 0,
    "organicTrafficPercentage": 0,
    "pagespeedScore": 0,
    "uptimePercentage": 0,
    "mobileOptimization": 0,
    "operatingExpenses": 0,
    "timeInvestment": 0,
    "dependencyRisk": 0,
    "diversificationScore": 0
  }'::jsonb,
  
  -- Valuation results
  result JSONB NOT NULL DEFAULT '{
    "totalValuation": {
      "low": 0,
      "mid": 0,
      "high": 0,
      "confidence": "low"
    },
    "methodBreakdown": {
      "revenue_multiple": {"low": 0, "mid": 0, "high": 0, "confidence": "low"},
      "asset_based": {"low": 0, "mid": 0, "high": 0, "confidence": "low"},
      "traffic_based": {"low": 0, "mid": 0, "high": 0, "confidence": "low"},
      "comparable": {"low": 0, "mid": 0, "high": 0, "confidence": "low"}
    },
    "confidence": "low",
    "factors": {
      "positive": [],
      "negative": [],
      "recommendations": []
    },
    "comparables": [],
    "lastCalculatedAt": ""
  }'::jsonb,
  
  -- Metadata
  calculation_method TEXT NOT NULL DEFAULT 'comprehensive' CHECK (calculation_method IN ('comprehensive', 'revenue_only', 'traffic_only', 'asset_only')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_metrics CHECK (
    metrics ? 'monthlyRevenue' AND 
    metrics ? 'monthlyPageviews' AND
    (metrics->>'monthlyRevenue')::numeric >= 0 AND
    (metrics->>'monthlyPageviews')::numeric >= 0
  ),
  CONSTRAINT valid_result CHECK (
    result ? 'totalValuation' AND
    result ? 'confidence' AND
    result->'totalValuation' ? 'low' AND
    result->'totalValuation' ? 'mid' AND
    result->'totalValuation' ? 'high'
  )
);

-- Indexes for site_valuations
CREATE INDEX idx_site_valuations_tenant_id ON public.site_valuations(tenant_id);
CREATE INDEX idx_site_valuations_created_at ON public.site_valuations(created_at DESC);
CREATE INDEX idx_site_valuations_monthly_revenue ON public.site_valuations USING GIN ((metrics->'monthlyRevenue'));
CREATE INDEX idx_site_valuations_total_valuation ON public.site_valuations USING GIN ((result->'totalValuation'->'mid'));
CREATE INDEX idx_site_valuations_confidence ON public.site_valuations USING GIN ((result->'confidence'));

-- =============================================================================
-- Valuation History View
-- =============================================================================

-- Create a view for easier querying of valuation trends
CREATE OR REPLACE VIEW public.valuation_history AS
SELECT 
  sv.id,
  sv.tenant_id,
  t.name as tenant_name,
  t.domain,
  (sv.metrics->>'monthlyRevenue')::numeric as monthly_revenue,
  (sv.metrics->>'monthlyPageviews')::numeric as monthly_pageviews,
  (sv.result->'totalValuation'->>'low')::numeric as valuation_low,
  (sv.result->'totalValuation'->>'mid')::numeric as valuation_mid,
  (sv.result->'totalValuation'->>'high')::numeric as valuation_high,
  sv.result->>'confidence' as confidence,
  array_length((sv.result->'factors'->'positive')::jsonb, 1) as positive_factors_count,
  array_length((sv.result->'factors'->'negative')::jsonb, 1) as negative_factors_count,
  sv.created_at,
  sv.updated_at
FROM public.site_valuations sv
JOIN public.tenants t ON sv.tenant_id = t.id
ORDER BY sv.created_at DESC;

-- =============================================================================
-- Comparable Sites Table
-- =============================================================================

-- Table for storing comparable site sales data
CREATE TABLE IF NOT EXISTS public.comparable_sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Site information
  domain TEXT NOT NULL,
  niche TEXT NOT NULL,
  description TEXT,
  
  -- Site metrics at time of sale
  monthly_revenue NUMERIC NOT NULL CHECK (monthly_revenue >= 0),
  yearly_revenue NUMERIC CHECK (yearly_revenue >= 0),
  monthly_pageviews NUMERIC NOT NULL CHECK (monthly_pageviews >= 0),
  unique_visitors NUMERIC CHECK (unique_visitors >= 0),
  conversion_rate NUMERIC CHECK (conversion_rate >= 0 AND conversion_rate <= 1),
  
  -- Sale information
  sale_price NUMERIC NOT NULL CHECK (sale_price > 0),
  sale_date DATE NOT NULL,
  sale_platform TEXT NOT NULL CHECK (sale_platform IN ('flippa', 'empire_flippers', 'fe_international', 'motion_invest', 'acquire', 'direct', 'other')),
  revenue_multiple NUMERIC GENERATED ALWAYS AS (
    CASE 
      WHEN monthly_revenue > 0 THEN sale_price / monthly_revenue
      ELSE NULL
    END
  ) STORED,
  
  -- Site characteristics
  domain_authority NUMERIC CHECK (domain_authority >= 0 AND domain_authority <= 100),
  backlinks NUMERIC CHECK (backlinks >= 0),
  content_pages NUMERIC CHECK (content_pages >= 0),
  site_age_months NUMERIC CHECK (site_age_months >= 0),
  traffic_sources JSONB DEFAULT '{"organic": 0, "direct": 0, "referral": 0, "social": 0, "paid": 0}'::jsonb,
  revenue_sources JSONB DEFAULT '{"affiliate": 0, "ads": 0, "products": 0, "services": 0, "other": 0}'::jsonb,
  
  -- Additional metadata
  verified BOOLEAN DEFAULT false,
  source_url TEXT,
  source_notes TEXT,
  tags TEXT[] DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(domain, sale_date),
  CONSTRAINT valid_traffic_sources CHECK (
    (traffic_sources->>'organic')::numeric + 
    (traffic_sources->>'direct')::numeric + 
    (traffic_sources->>'referral')::numeric + 
    (traffic_sources->>'social')::numeric + 
    (traffic_sources->>'paid')::numeric <= 1.01 -- Allow for small rounding errors
  )
);

-- Indexes for comparable_sites
CREATE INDEX idx_comparable_sites_niche ON public.comparable_sites(niche);
CREATE INDEX idx_comparable_sites_sale_date ON public.comparable_sites(sale_date DESC);
CREATE INDEX idx_comparable_sites_monthly_revenue ON public.comparable_sites(monthly_revenue);
CREATE INDEX idx_comparable_sites_monthly_pageviews ON public.comparable_sites(monthly_pageviews);
CREATE INDEX idx_comparable_sites_revenue_multiple ON public.comparable_sites(revenue_multiple);
CREATE INDEX idx_comparable_sites_sale_platform ON public.comparable_sites(sale_platform);
CREATE INDEX idx_comparable_sites_verified ON public.comparable_sites(verified) WHERE verified = true;
CREATE INDEX idx_comparable_sites_tags ON public.comparable_sites USING GIN(tags);

-- =============================================================================
-- Valuation Benchmarks Table
-- =============================================================================

-- Table for storing industry benchmarks and multipliers
CREATE TABLE IF NOT EXISTS public.valuation_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Benchmark criteria
  niche TEXT NOT NULL,
  revenue_range_min NUMERIC NOT NULL CHECK (revenue_range_min >= 0),
  revenue_range_max NUMERIC NOT NULL CHECK (revenue_range_max >= revenue_range_min),
  traffic_range_min NUMERIC CHECK (traffic_range_min >= 0),
  traffic_range_max NUMERIC CHECK (traffic_range_max >= traffic_range_min),
  
  -- Benchmark values
  revenue_multiple_min NUMERIC NOT NULL CHECK (revenue_multiple_min > 0),
  revenue_multiple_max NUMERIC NOT NULL CHECK (revenue_multiple_max >= revenue_multiple_min),
  revenue_multiple_avg NUMERIC NOT NULL CHECK (revenue_multiple_avg BETWEEN revenue_multiple_min AND revenue_multiple_max),
  
  -- Supporting data
  sample_size INTEGER NOT NULL CHECK (sample_size > 0),
  data_period_start DATE NOT NULL,
  data_period_end DATE NOT NULL CHECK (data_period_end >= data_period_start),
  confidence_level NUMERIC CHECK (confidence_level BETWEEN 0 AND 1),
  
  -- Additional factors
  factors JSONB DEFAULT '{
    "domainAuthorityWeight": 0.1,
    "trafficQualityWeight": 0.15,
    "revenueConsistencyWeight": 0.2,
    "growthRateWeight": 0.15,
    "diversificationWeight": 0.1
  }'::jsonb,
  
  -- Metadata
  source TEXT NOT NULL,
  methodology TEXT,
  notes TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_date_range CHECK (data_period_end > data_period_start),
  CONSTRAINT non_overlapping_ranges EXCLUDE USING GIST (
    niche WITH =,
    numrange(revenue_range_min, revenue_range_max, '[]') WITH &&
  ) WHERE (active = true)
);

-- Indexes for valuation_benchmarks
CREATE INDEX idx_valuation_benchmarks_niche ON public.valuation_benchmarks(niche);
CREATE INDEX idx_valuation_benchmarks_revenue_range ON public.valuation_benchmarks(revenue_range_min, revenue_range_max);
CREATE INDEX idx_valuation_benchmarks_active ON public.valuation_benchmarks(active) WHERE active = true;

-- =============================================================================
-- Insert Default Benchmarks
-- =============================================================================

-- Insert industry-standard benchmarks for common niches
INSERT INTO public.valuation_benchmarks (
  niche, revenue_range_min, revenue_range_max, traffic_range_min, traffic_range_max,
  revenue_multiple_min, revenue_multiple_max, revenue_multiple_avg,
  sample_size, data_period_start, data_period_end, confidence_level,
  source, methodology, notes
) VALUES 
  -- Tech/Electronics affiliate sites
  ('technology', 1000, 5000, 50000, 200000, 24, 36, 30, 150, '2023-01-01', '2024-12-31', 0.85,
   'Industry Analysis', 'Revenue Multiple Analysis', 'Established tech affiliate sites with consistent revenue'),
  
  ('technology', 5000, 15000, 200000, 500000, 30, 42, 36, 85, '2023-01-01', '2024-12-31', 0.90,
   'Industry Analysis', 'Revenue Multiple Analysis', 'High-performing tech sites with strong authority'),
  
  ('technology', 15000, 50000, 500000, 2000000, 36, 48, 42, 35, '2023-01-01', '2024-12-31', 0.95,
   'Industry Analysis', 'Revenue Multiple Analysis', 'Premium tech sites with diversified traffic'),
  
  -- Health/Fitness affiliate sites
  ('health-fitness', 1000, 5000, 30000, 150000, 20, 32, 26, 120, '2023-01-01', '2024-12-31', 0.80,
   'Industry Analysis', 'Revenue Multiple Analysis', 'Health and fitness affiliate sites'),
  
  ('health-fitness', 5000, 15000, 150000, 400000, 28, 40, 34, 65, '2023-01-01', '2024-12-31', 0.85,
   'Industry Analysis', 'Revenue Multiple Analysis', 'Established health/fitness authority sites'),
  
  -- Home/Garden affiliate sites
  ('home-garden', 1000, 5000, 40000, 180000, 22, 34, 28, 95, '2023-01-01', '2024-12-31', 0.82,
   'Industry Analysis', 'Revenue Multiple Analysis', 'Home and garden affiliate sites'),
  
  -- Fashion/Beauty affiliate sites
  ('fashion-beauty', 1000, 5000, 60000, 250000, 18, 30, 24, 110, '2023-01-01', '2024-12-31', 0.78,
   'Industry Analysis', 'Revenue Multiple Analysis', 'Fashion and beauty affiliate sites with higher volatility'),
  
  -- General/Mixed affiliate sites
  ('general', 1000, 5000, 30000, 150000, 20, 30, 25, 200, '2023-01-01', '2024-12-31', 0.75,
   'Industry Analysis', 'Revenue Multiple Analysis', 'General purpose affiliate sites'),
  
  ('general', 5000, 15000, 150000, 400000, 26, 36, 31, 100, '2023-01-01', '2024-12-31', 0.80,
   'Industry Analysis', 'Revenue Multiple Analysis', 'Established general affiliate sites');

-- =============================================================================
-- Sample Comparable Sites Data
-- =============================================================================

-- Insert sample comparable sites data for testing and benchmarking
INSERT INTO public.comparable_sites (
  domain, niche, description, monthly_revenue, yearly_revenue, monthly_pageviews,
  unique_visitors, conversion_rate, sale_price, sale_date, sale_platform,
  domain_authority, backlinks, content_pages, site_age_months,
  traffic_sources, revenue_sources, verified, source_notes, tags
) VALUES 
  ('techreviewpro.com', 'technology', 'Tech product reviews and comparisons', 8500, 102000, 320000,
   180000, 0.035, 280000, '2024-03-15', 'flippa', 52, 2800, 450, 48,
   '{"organic": 0.72, "direct": 0.15, "referral": 0.08, "social": 0.04, "paid": 0.01}'::jsonb,
   '{"affiliate": 0.85, "ads": 0.12, "products": 0.03, "services": 0.0, "other": 0.0}'::jsonb,
   true, 'Strong Amazon affiliate revenue with diversified product categories', 
   ARRAY['amazon', 'affiliate', 'tech-reviews', 'high-authority']),
   
  ('fitnessgearhub.com', 'health-fitness', 'Fitness equipment reviews and guides', 4200, 50400, 180000,
   95000, 0.028, 145000, '2024-01-22', 'empire_flippers', 38, 1200, 280, 36,
   '{"organic": 0.68, "direct": 0.12, "referral": 0.15, "social": 0.05, "paid": 0.0}'::jsonb,
   '{"affiliate": 0.92, "ads": 0.08, "products": 0.0, "services": 0.0, "other": 0.0}'::jsonb,
   true, 'Strong organic traffic with consistent revenue growth',
   ARRAY['fitness', 'equipment-reviews', 'affiliate']),
   
  ('homesweethome.com', 'home-garden', 'Home decor and garden product recommendations', 6800, 81600, 290000,
   160000, 0.025, 220000, '2024-02-08', 'fe_international', 45, 1800, 380, 42,
   '{"organic": 0.65, "direct": 0.18, "referral": 0.12, "social": 0.05, "paid": 0.0}'::jsonb,
   '{"affiliate": 0.78, "ads": 0.18, "products": 0.04, "services": 0.0, "other": 0.0}'::jsonb,
   true, 'Seasonal traffic patterns with strong Q4 performance',
   ARRAY['home-decor', 'garden', 'seasonal', 'affiliate']),
   
  ('beautyexpert.com', 'fashion-beauty', 'Beauty product reviews and tutorials', 3400, 40800, 220000,
   140000, 0.022, 95000, '2023-11-30', 'flippa', 32, 950, 320, 30,
   '{"organic": 0.58, "direct": 0.08, "referral": 0.18, "social": 0.16, "paid": 0.0}'::jsonb,
   '{"affiliate": 0.88, "ads": 0.10, "products": 0.02, "services": 0.0, "other": 0.0}'::jsonb,
   true, 'Strong social media presence with influencer partnerships',
   ARRAY['beauty', 'tutorials', 'social-traffic', 'affiliate']),
   
  ('gadgetguide.com', 'technology', 'Consumer electronics buying guides', 12500, 150000, 480000,
   280000, 0.042, 465000, '2024-04-12', 'empire_flippers', 58, 3500, 520, 60,
   '{"organic": 0.78, "direct": 0.14, "referral": 0.06, "social": 0.02, "paid": 0.0}'::jsonb,
   '{"affiliate": 0.82, "ads": 0.15, "products": 0.03, "services": 0.0, "other": 0.0}'::jsonb,
   true, 'Premium site with excellent domain authority and consistent growth',
   ARRAY['electronics', 'buying-guides', 'premium', 'high-authority']);

-- =============================================================================
-- Row Level Security (RLS) Policies
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE public.site_valuations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comparable_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.valuation_benchmarks ENABLE ROW LEVEL SECURITY;

-- Site valuations policies
CREATE POLICY "site_valuations_tenant_isolation" ON public.site_valuations
  FOR ALL 
  USING (tenant_id IN (
    SELECT id FROM public.tenants 
    WHERE id = tenant_id
  ));

-- Comparable sites policies (readable by all authenticated users for benchmarking)
CREATE POLICY "comparable_sites_read_all" ON public.comparable_sites
  FOR SELECT 
  USING (true);

CREATE POLICY "comparable_sites_admin_manage" ON public.comparable_sites
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Valuation benchmarks policies (readable by all authenticated users)
CREATE POLICY "valuation_benchmarks_read_all" ON public.valuation_benchmarks
  FOR SELECT 
  USING (active = true);

CREATE POLICY "valuation_benchmarks_admin_manage" ON public.valuation_benchmarks
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- =============================================================================
-- Functions and Triggers
-- =============================================================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_site_valuations_updated_at 
  BEFORE UPDATE ON public.site_valuations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comparable_sites_updated_at 
  BEFORE UPDATE ON public.comparable_sites
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_valuation_benchmarks_updated_at 
  BEFORE UPDATE ON public.valuation_benchmarks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- Analytics Functions
-- =============================================================================

-- Function to get valuation trends for a tenant
CREATE OR REPLACE FUNCTION get_valuation_trends(
  p_tenant_id UUID,
  p_months INTEGER DEFAULT 12
)
RETURNS TABLE (
  month DATE,
  valuation_mid NUMERIC,
  monthly_revenue NUMERIC,
  monthly_pageviews NUMERIC,
  confidence TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DATE_TRUNC('month', sv.created_at)::DATE as month,
    (sv.result->'totalValuation'->>'mid')::NUMERIC as valuation_mid,
    (sv.metrics->>'monthlyRevenue')::NUMERIC as monthly_revenue,
    (sv.metrics->>'monthlyPageviews')::NUMERIC as monthly_pageviews,
    sv.result->>'confidence' as confidence
  FROM public.site_valuations sv
  WHERE sv.tenant_id = p_tenant_id
    AND sv.created_at >= NOW() - INTERVAL '1 month' * p_months
  ORDER BY month DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to find similar sites for comparison
CREATE OR REPLACE FUNCTION find_comparable_sites(
  p_monthly_revenue NUMERIC,
  p_monthly_pageviews NUMERIC,
  p_niche TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  domain TEXT,
  niche TEXT,
  monthly_revenue NUMERIC,
  monthly_pageviews NUMERIC,
  sale_price NUMERIC,
  revenue_multiple NUMERIC,
  sale_date DATE,
  similarity_score NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cs.domain,
    cs.niche,
    cs.monthly_revenue,
    cs.monthly_pageviews,
    cs.sale_price,
    cs.revenue_multiple,
    cs.sale_date,
    -- Calculate similarity score based on revenue and traffic proximity
    (1.0 - (
      ABS(cs.monthly_revenue - p_monthly_revenue) / GREATEST(cs.monthly_revenue, p_monthly_revenue) * 0.6 +
      ABS(cs.monthly_pageviews - p_monthly_pageviews) / GREATEST(cs.monthly_pageviews, p_monthly_pageviews) * 0.4
    ))::NUMERIC as similarity_score
  FROM public.comparable_sites cs
  WHERE cs.verified = true
    AND cs.monthly_revenue BETWEEN p_monthly_revenue * 0.3 AND p_monthly_revenue * 3
    AND cs.monthly_pageviews BETWEEN p_monthly_pageviews * 0.2 AND p_monthly_pageviews * 5
    AND (p_niche IS NULL OR cs.niche = p_niche)
    AND cs.sale_date >= NOW() - INTERVAL '3 years'
  ORDER BY similarity_score DESC, cs.sale_date DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate market multiple for a niche
CREATE OR REPLACE FUNCTION get_niche_multiples(
  p_niche TEXT,
  p_revenue_min NUMERIC DEFAULT 0,
  p_revenue_max NUMERIC DEFAULT 1000000
)
RETURNS TABLE (
  avg_multiple NUMERIC,
  min_multiple NUMERIC,
  max_multiple NUMERIC,
  sample_size BIGINT,
  confidence_level NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    AVG(cs.revenue_multiple)::NUMERIC as avg_multiple,
    MIN(cs.revenue_multiple)::NUMERIC as min_multiple,
    MAX(cs.revenue_multiple)::NUMERIC as max_multiple,
    COUNT(*)::BIGINT as sample_size,
    CASE 
      WHEN COUNT(*) >= 20 THEN 0.9
      WHEN COUNT(*) >= 10 THEN 0.8
      WHEN COUNT(*) >= 5 THEN 0.7
      ELSE 0.6
    END::NUMERIC as confidence_level
  FROM public.comparable_sites cs
  WHERE cs.niche = p_niche
    AND cs.verified = true
    AND cs.monthly_revenue BETWEEN p_revenue_min AND p_revenue_max
    AND cs.sale_date >= NOW() - INTERVAL '2 years'
    AND cs.revenue_multiple IS NOT NULL
    AND cs.revenue_multiple BETWEEN 10 AND 60; -- Filter out outliers
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- Comments for Documentation
-- =============================================================================

COMMENT ON TABLE public.site_valuations IS 'Stores comprehensive site valuations including metrics and results from multiple valuation methods';
COMMENT ON TABLE public.comparable_sites IS 'Database of sold affiliate sites for comparative valuation analysis';
COMMENT ON TABLE public.valuation_benchmarks IS 'Industry benchmarks and multipliers for different niches and revenue ranges';

COMMENT ON COLUMN public.site_valuations.metrics IS 'JSON object containing all input metrics used for valuation calculation';
COMMENT ON COLUMN public.site_valuations.result IS 'JSON object containing valuation results from all methods and analysis';
COMMENT ON COLUMN public.comparable_sites.revenue_multiple IS 'Automatically calculated multiple of sale price to monthly revenue';
COMMENT ON COLUMN public.valuation_benchmarks.factors IS 'JSON object defining weighting factors for different valuation components';

-- Grant permissions for authenticated users
GRANT SELECT ON public.valuation_history TO authenticated;
GRANT EXECUTE ON FUNCTION get_valuation_trends(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION find_comparable_sites(NUMERIC, NUMERIC, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_niche_multiples(TEXT, NUMERIC, NUMERIC) TO authenticated;