-- Migration for Platform Enhancement Features
-- Multi-Network Affiliates, MCP Servers, A/B Testing, Analytics

-- ============================================
-- AFFILIATE NETWORKS
-- ============================================

CREATE TABLE IF NOT EXISTS affiliate_networks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  network_id VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  status VARCHAR(20) DEFAULT 'disconnected' CHECK (status IN ('connected', 'pending', 'disconnected', 'error')),
  api_key TEXT,
  api_secret TEXT,
  merchant_id TEXT,
  tracking_id TEXT,
  commission_rate DECIMAL(5,2),
  cookie_duration_days INTEGER,
  payment_terms VARCHAR(50),
  config JSONB DEFAULT '{}',
  last_sync TIMESTAMPTZ,
  sync_status VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, network_id)
);

CREATE TABLE IF NOT EXISTS affiliate_earnings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  network_id VARCHAR(50) NOT NULL,
  date DATE NOT NULL,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  revenue DECIMAL(10,2) DEFAULT 0,
  commission DECIMAL(10,2) DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'USD',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, network_id, date)
);

CREATE TABLE IF NOT EXISTS affiliate_products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  network_id VARCHAR(50) NOT NULL,
  external_id VARCHAR(100) NOT NULL,
  name TEXT NOT NULL,
  url TEXT,
  affiliate_url TEXT,
  price DECIMAL(10,2),
  commission_rate DECIMAL(5,2),
  category VARCHAR(100),
  image_url TEXT,
  in_stock BOOLEAN DEFAULT true,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, network_id, external_id)
);

-- ============================================
-- MCP SERVERS
-- ============================================

CREATE TABLE IF NOT EXISTS mcp_servers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  server_id VARCHAR(100) NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'error', 'installing')),
  version VARCHAR(20),
  author VARCHAR(100),
  category VARCHAR(50),
  installed BOOLEAN DEFAULT false,
  config JSONB DEFAULT '{}',
  tools TEXT[],
  resources TEXT[],
  stats JSONB DEFAULT '{"calls": 0, "errors": 0, "latency": 0}',
  last_heartbeat TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, server_id)
);

CREATE TABLE IF NOT EXISTS mcp_server_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  server_id VARCHAR(100) NOT NULL,
  level VARCHAR(20) CHECK (level IN ('debug', 'info', 'warning', 'error', 'critical')),
  message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- A/B TESTING
-- ============================================

CREATE TABLE IF NOT EXISTS experiments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'paused', 'completed', 'archived')),
  type VARCHAR(50) CHECK (type IN ('visual', 'content', 'layout', 'pricing', 'feature')),
  metric VARCHAR(100) NOT NULL,
  traffic_allocation DECIMAL(5,2) DEFAULT 50.00,
  minimum_sample_size INTEGER DEFAULT 1000,
  confidence_threshold DECIMAL(5,2) DEFAULT 95.00,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS experiment_variants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  experiment_id UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_control BOOLEAN DEFAULT false,
  traffic_percentage DECIMAL(5,2) NOT NULL,
  config JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS experiment_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  experiment_id UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
  variant_id UUID NOT NULL REFERENCES experiment_variants(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  visitors INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  revenue DECIMAL(10,2) DEFAULT 0,
  bounce_rate DECIMAL(5,2),
  avg_time_on_page INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(experiment_id, variant_id, date)
);

CREATE TABLE IF NOT EXISTS experiment_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  experiment_id UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
  variant_id UUID NOT NULL REFERENCES experiment_variants(id) ON DELETE CASCADE,
  visitor_id VARCHAR(100) NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  converted BOOLEAN DEFAULT false,
  conversion_value DECIMAL(10,2),
  UNIQUE(experiment_id, visitor_id)
);

-- ============================================
-- ANALYTICS & CONVERSION INTELLIGENCE
-- ============================================

CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  visitor_id VARCHAR(100) NOT NULL,
  session_id VARCHAR(100) NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  event_name VARCHAR(100),
  page_url TEXT,
  referrer TEXT,
  utm_source VARCHAR(100),
  utm_medium VARCHAR(100),
  utm_campaign VARCHAR(100),
  device_type VARCHAR(20),
  browser VARCHAR(50),
  os VARCHAR(50),
  country VARCHAR(2),
  properties JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversion_funnels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  steps JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS heatmap_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  page_url TEXT NOT NULL,
  element_selector TEXT,
  x_position INTEGER,
  y_position INTEGER,
  click_count INTEGER DEFAULT 1,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_predictions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  prediction_type VARCHAR(50) NOT NULL,
  metric VARCHAR(100) NOT NULL,
  predicted_value DECIMAL(10,2),
  confidence DECIMAL(5,2),
  time_horizon VARCHAR(20),
  factors JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS api_marketplace (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  api_id VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  category VARCHAR(50),
  provider VARCHAR(100),
  pricing_model VARCHAR(50),
  base_price DECIMAL(10,2),
  rating DECIMAL(3,2),
  total_installs INTEGER DEFAULT 0,
  documentation_url TEXT,
  webhook_url TEXT,
  config_schema JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS api_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  api_id VARCHAR(100) NOT NULL REFERENCES api_marketplace(api_id),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled', 'expired')),
  api_key TEXT,
  usage_limit INTEGER,
  usage_count INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, api_id)
);

-- ============================================
-- INDEXES
-- ============================================

-- Affiliate Networks
CREATE INDEX idx_affiliate_networks_tenant ON affiliate_networks(tenant_id);
CREATE INDEX idx_affiliate_networks_status ON affiliate_networks(tenant_id, status);
CREATE INDEX idx_affiliate_earnings_date ON affiliate_earnings(tenant_id, date DESC);
CREATE INDEX idx_affiliate_products_network ON affiliate_products(tenant_id, network_id);

-- MCP Servers
CREATE INDEX idx_mcp_servers_tenant ON mcp_servers(tenant_id);
CREATE INDEX idx_mcp_servers_status ON mcp_servers(tenant_id, status);
CREATE INDEX idx_mcp_server_logs_server ON mcp_server_logs(tenant_id, server_id, created_at DESC);

-- A/B Testing
CREATE INDEX idx_experiments_tenant ON experiments(tenant_id, status);
CREATE INDEX idx_experiment_results_date ON experiment_results(experiment_id, date DESC);
CREATE INDEX idx_experiment_assignments_visitor ON experiment_assignments(visitor_id);

-- Analytics
CREATE INDEX idx_analytics_events_visitor ON analytics_events(tenant_id, visitor_id, created_at DESC);
CREATE INDEX idx_analytics_events_session ON analytics_events(tenant_id, session_id);
CREATE INDEX idx_analytics_events_date ON analytics_events(tenant_id, created_at DESC);
CREATE INDEX idx_heatmap_data_page ON heatmap_data(tenant_id, page_url, date DESC);
CREATE INDEX idx_ai_predictions_type ON ai_predictions(tenant_id, prediction_type, created_at DESC);

-- API Marketplace
CREATE INDEX idx_api_marketplace_category ON api_marketplace(category);
CREATE INDEX idx_api_subscriptions_tenant ON api_subscriptions(tenant_id, status);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on all tables
ALTER TABLE affiliate_networks ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_servers ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_server_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiment_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiment_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiment_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversion_funnels ENABLE ROW LEVEL SECURITY;
ALTER TABLE heatmap_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_marketplace ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for tenant isolation
CREATE POLICY "Tenant isolation for affiliate_networks"
  ON affiliate_networks
  FOR ALL
  USING (tenant_id IN (
    SELECT id FROM tenants WHERE admin_user_id = auth.uid()
  ));

CREATE POLICY "Tenant isolation for mcp_servers"
  ON mcp_servers
  FOR ALL
  USING (tenant_id IN (
    SELECT id FROM tenants WHERE admin_user_id = auth.uid()
  ));

CREATE POLICY "Tenant isolation for experiments"
  ON experiments
  FOR ALL
  USING (tenant_id IN (
    SELECT id FROM tenants WHERE admin_user_id = auth.uid()
  ));

CREATE POLICY "Tenant isolation for analytics_events"
  ON analytics_events
  FOR ALL
  USING (tenant_id IN (
    SELECT id FROM tenants WHERE admin_user_id = auth.uid()
  ));

CREATE POLICY "Public read for api_marketplace"
  ON api_marketplace
  FOR SELECT
  USING (true);

CREATE POLICY "Tenant isolation for api_subscriptions"
  ON api_subscriptions
  FOR ALL
  USING (tenant_id IN (
    SELECT id FROM tenants WHERE admin_user_id = auth.uid()
  ));

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to calculate experiment statistics
CREATE OR REPLACE FUNCTION calculate_experiment_stats(experiment_uuid UUID)
RETURNS TABLE(
  variant_id UUID,
  conversion_rate DECIMAL,
  confidence DECIMAL,
  is_significant BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  WITH variant_stats AS (
    SELECT 
      er.variant_id,
      SUM(er.visitors) as total_visitors,
      SUM(er.conversions) as total_conversions,
      CASE 
        WHEN SUM(er.visitors) > 0 
        THEN (SUM(er.conversions)::DECIMAL / SUM(er.visitors)::DECIMAL) * 100
        ELSE 0
      END as conv_rate
    FROM experiment_results er
    WHERE er.experiment_id = experiment_uuid
    GROUP BY er.variant_id
  ),
  control_stats AS (
    SELECT vs.conv_rate as control_rate
    FROM variant_stats vs
    JOIN experiment_variants ev ON vs.variant_id = ev.id
    WHERE ev.is_control = true
    LIMIT 1
  )
  SELECT 
    vs.variant_id,
    vs.conv_rate,
    -- Simplified confidence calculation
    CASE 
      WHEN vs.total_visitors > 100 
      THEN LEAST(99.9, 50 + (vs.total_visitors / 100))
      ELSE 0
    END as confidence,
    -- Significance at 95% confidence
    CASE 
      WHEN vs.total_visitors > 100 AND ABS(vs.conv_rate - cs.control_rate) > 0.5
      THEN true
      ELSE false
    END as is_significant
  FROM variant_stats vs
  CROSS JOIN control_stats cs;
END;
$$ LANGUAGE plpgsql;

-- Function to get real-time analytics
CREATE OR REPLACE FUNCTION get_realtime_analytics(tenant_uuid UUID, time_range INTERVAL)
RETURNS TABLE(
  visitors BIGINT,
  page_views BIGINT,
  conversions BIGINT,
  revenue DECIMAL,
  bounce_rate DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT visitor_id) as visitors,
    COUNT(*) as page_views,
    COUNT(CASE WHEN event_type = 'purchase' THEN 1 END) as conversions,
    COALESCE(SUM((properties->>'value')::DECIMAL), 0) as revenue,
    (COUNT(DISTINCT CASE WHEN properties->>'bounced' = 'true' THEN visitor_id END)::DECIMAL / 
     NULLIF(COUNT(DISTINCT visitor_id)::DECIMAL, 0)) * 100 as bounce_rate
  FROM analytics_events
  WHERE tenant_id = tenant_uuid
    AND created_at >= NOW() - time_range;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_affiliate_networks_updated_at
  BEFORE UPDATE ON affiliate_networks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_mcp_servers_updated_at
  BEFORE UPDATE ON mcp_servers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_experiments_updated_at
  BEFORE UPDATE ON experiments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_api_subscriptions_updated_at
  BEFORE UPDATE ON api_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();