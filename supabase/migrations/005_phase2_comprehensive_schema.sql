-- ============================================================================
-- Phase 2: Comprehensive Schema Enhancement Migration
-- Adds missing mobile ecosystem and enhanced API economy tables
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- Mobile Ecosystem Tables
-- ============================================================================

-- Create mobile_devices table for push notifications and device management
CREATE TABLE IF NOT EXISTS mobile_devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_identifier VARCHAR(255) NOT NULL,
    device_type VARCHAR(20) NOT NULL CHECK (device_type IN ('ios', 'android', 'web', 'desktop')),
    device_token VARCHAR(500) NOT NULL, -- FCM/APNS token
    app_version VARCHAR(50),
    os_version VARCHAR(50),
    timezone VARCHAR(50),
    language VARCHAR(10),
    active BOOLEAN DEFAULT true,
    last_seen_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, user_identifier, device_token)
);

-- Create notification_campaigns table for marketing campaigns
CREATE TABLE IF NOT EXISTS notification_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('push', 'email', 'sms', 'in_app')),
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    image_url TEXT,
    deep_link TEXT,
    target_audience JSONB DEFAULT '{}', -- Segment criteria
    scheduled_at TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'sent', 'delivered', 'opened', 'failed')),
    delivery_stats JSONB DEFAULT '{
        "sent": 0,
        "delivered": 0,
        "opened": 0,
        "clicked": 0,
        "failed": 0
    }',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notification_logs table for delivery tracking
CREATE TABLE IF NOT EXISTS notification_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES notification_campaigns(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    device_id UUID REFERENCES mobile_devices(id) ON DELETE SET NULL,
    user_identifier VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('push', 'email', 'sms', 'in_app')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('scheduled', 'sent', 'delivered', 'opened', 'failed')),
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    delivered_at TIMESTAMP WITH TIME ZONE,
    opened_at TIMESTAMP WITH TIME ZONE,
    clicked_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create mobile_analytics table for app usage tracking
CREATE TABLE IF NOT EXISTS mobile_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    device_id UUID REFERENCES mobile_devices(id) ON DELETE SET NULL,
    user_identifier VARCHAR(255),
    event_type VARCHAR(100) NOT NULL, -- app_open, page_view, product_click, etc.
    event_data JSONB DEFAULT '{}',
    session_id VARCHAR(100),
    app_version VARCHAR(50),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- Enhanced API Economy Tables
-- ============================================================================

-- Create webhook_deliveries table for tracking webhook delivery attempts
CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    attempt INTEGER NOT NULL DEFAULT 1,
    status_code INTEGER,
    response_body TEXT,
    response_headers JSONB,
    delivered_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    next_retry_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create api_rate_limits table for API throttling
CREATE TABLE IF NOT EXISTS api_rate_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    app_id UUID NOT NULL REFERENCES developer_apps(id) ON DELETE CASCADE,
    endpoint_pattern VARCHAR(255) NOT NULL, -- e.g., "/api/v1/products/*"
    requests_per_minute INTEGER NOT NULL DEFAULT 60,
    requests_per_hour INTEGER NOT NULL DEFAULT 1000,
    requests_per_day INTEGER NOT NULL DEFAULT 10000,
    burst_limit INTEGER NOT NULL DEFAULT 10,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(app_id, endpoint_pattern)
);

-- Create api_keys table for managing multiple API keys per app
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    app_id UUID NOT NULL REFERENCES developer_apps(id) ON DELETE CASCADE,
    key_name VARCHAR(255) NOT NULL,
    key_hash VARCHAR(64) NOT NULL UNIQUE,
    key_prefix VARCHAR(20) NOT NULL, -- First 8 chars for display
    permissions JSONB DEFAULT '[]', -- Subset of app permissions
    environment VARCHAR(20) DEFAULT 'production' CHECK (environment IN ('development', 'staging', 'production')),
    expires_at TIMESTAMP WITH TIME ZONE,
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_by UUID, -- Developer user ID
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create app_reviews table for developer app marketplace reviews
CREATE TABLE IF NOT EXISTS app_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    app_id UUID NOT NULL REFERENCES developer_apps(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(255),
    comment TEXT,
    helpful_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(app_id, tenant_id) -- One review per tenant per app
);

-- Create app_categories table for better organization
CREATE TABLE IF NOT EXISTS app_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon_url TEXT,
    sort_order INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default app categories
INSERT INTO app_categories (name, slug, description, sort_order) VALUES
    ('Analytics & Reporting', 'analytics', 'Track performance and generate insights', 1),
    ('Content Management', 'content', 'Create and manage content efficiently', 2),
    ('E-commerce Integration', 'ecommerce', 'Connect with shopping platforms and marketplaces', 3),
    ('Marketing Automation', 'marketing', 'Automate campaigns and customer engagement', 4),
    ('Social Media', 'social', 'Manage social media presence and posting', 5),
    ('SEO & Optimization', 'seo', 'Improve search rankings and site performance', 6),
    ('Design & Theme', 'design', 'Customize appearance and user experience', 7),
    ('Utilities & Tools', 'utilities', 'General purpose tools and utilities', 8)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- Enhanced Tracking and Analytics Tables
-- ============================================================================

-- Create conversion_events table for detailed attribution tracking
CREATE TABLE IF NOT EXISTS conversion_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_identifier VARCHAR(255),
    session_id VARCHAR(100),
    event_type VARCHAR(50) NOT NULL, -- click, view, add_to_cart, purchase
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,
    affiliate_url TEXT,
    referrer TEXT,
    user_agent TEXT,
    ip_address INET,
    country VARCHAR(2),
    device_type VARCHAR(20),
    conversion_value DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'USD',
    commission_earned DECIMAL(10,2),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create ab_test_experiments table for A/B testing framework
CREATE TABLE IF NOT EXISTS ab_test_experiments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    experiment_type VARCHAR(50) NOT NULL, -- content, layout, cta, pricing
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed')),
    traffic_allocation DECIMAL(3,2) DEFAULT 1.0, -- Percentage of traffic to include
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    variants JSONB NOT NULL, -- Array of variant configurations
    success_metrics JSONB DEFAULT '{}', -- Conversion goals
    results JSONB DEFAULT '{}', -- Statistical results
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create ab_test_participations table for tracking user assignments
CREATE TABLE IF NOT EXISTS ab_test_participations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    experiment_id UUID NOT NULL REFERENCES ab_test_experiments(id) ON DELETE CASCADE,
    user_identifier VARCHAR(255) NOT NULL,
    variant_id VARCHAR(50) NOT NULL,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    converted BOOLEAN DEFAULT false,
    conversion_value DECIMAL(10,2),
    metadata JSONB DEFAULT '{}',
    UNIQUE(experiment_id, user_identifier)
);

-- ============================================================================
-- Multi-Network Affiliate Integration Tables
-- ============================================================================

-- Create affiliate_networks table for managing multiple networks
CREATE TABLE IF NOT EXISTS affiliate_networks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    api_endpoint TEXT,
    auth_type VARCHAR(50), -- api_key, oauth, basic_auth
    auth_config JSONB DEFAULT '{}', -- Encrypted credentials
    commission_structure JSONB DEFAULT '{}', -- Default commission rates
    tracking_domain VARCHAR(255),
    deep_linking_supported BOOLEAN DEFAULT false,
    real_time_reporting BOOLEAN DEFAULT false,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert popular affiliate networks
INSERT INTO affiliate_networks (name, slug, deep_linking_supported, real_time_reporting) VALUES
    ('Amazon Associates', 'amazon', true, false),
    ('ShareASale', 'shareasale', true, true),
    ('Commission Junction (CJ)', 'cj', true, true),
    ('Rakuten Advertising', 'rakuten', true, true),
    ('Impact', 'impact', true, true),
    ('ClickBank', 'clickbank', false, true),
    ('PartnerStack', 'partnerstack', true, true),
    ('FlexOffers', 'flexoffers', true, false)
ON CONFLICT (slug) DO NOTHING;

-- Create tenant_network_connections table for tenant-specific network configs
CREATE TABLE IF NOT EXISTS tenant_network_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    network_id UUID NOT NULL REFERENCES affiliate_networks(id) ON DELETE CASCADE,
    account_id VARCHAR(255), -- Network-specific account ID
    tracking_id VARCHAR(255), -- Network-specific tracking ID
    api_credentials JSONB DEFAULT '{}', -- Encrypted credentials
    commission_override JSONB DEFAULT '{}', -- Custom commission rates
    active BOOLEAN DEFAULT true,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    sync_status VARCHAR(20) DEFAULT 'pending',
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, network_id)
);

-- ============================================================================
-- Advanced Product Management Tables
-- ============================================================================

-- Create product_variants table for managing product variations
CREATE TABLE IF NOT EXISTS product_variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    network_id UUID REFERENCES affiliate_networks(id) ON DELETE SET NULL,
    network_product_id VARCHAR(255), -- Network-specific product ID
    variant_type VARCHAR(50), -- size, color, model, etc.
    variant_value VARCHAR(255),
    price_override INTEGER,
    commission_rate DECIMAL(5,2),
    affiliate_url TEXT,
    in_stock BOOLEAN DEFAULT true,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create product_price_history table for tracking price changes
CREATE TABLE IF NOT EXISTS product_price_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    network_id UUID REFERENCES affiliate_networks(id) ON DELETE SET NULL,
    price INTEGER NOT NULL,
    original_price INTEGER,
    currency VARCHAR(3) DEFAULT 'USD',
    in_stock BOOLEAN,
    discount_percentage DECIMAL(5,2),
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- Comprehensive Indexes for Performance
-- ============================================================================

-- Mobile ecosystem indexes
CREATE INDEX IF NOT EXISTS idx_mobile_devices_tenant_user ON mobile_devices(tenant_id, user_identifier);
CREATE INDEX IF NOT EXISTS idx_mobile_devices_token ON mobile_devices(device_token);
CREATE INDEX IF NOT EXISTS idx_mobile_devices_active ON mobile_devices(active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_notification_campaigns_tenant ON notification_campaigns(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notification_campaigns_status ON notification_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_notification_campaigns_scheduled ON notification_campaigns(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_notification_logs_campaign ON notification_logs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_user ON notification_logs(user_identifier);
CREATE INDEX IF NOT EXISTS idx_notification_logs_status ON notification_logs(status);
CREATE INDEX IF NOT EXISTS idx_mobile_analytics_tenant ON mobile_analytics(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mobile_analytics_event ON mobile_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_mobile_analytics_timestamp ON mobile_analytics(timestamp);

-- API economy indexes
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status ON webhook_deliveries(status_code);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_retry ON webhook_deliveries(next_retry_at) WHERE next_retry_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_api_rate_limits_app ON api_rate_limits(app_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_app ON api_keys(app_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_app_reviews_app ON app_reviews(app_id);
CREATE INDEX IF NOT EXISTS idx_app_reviews_rating ON app_reviews(rating);

-- Analytics and tracking indexes
CREATE INDEX IF NOT EXISTS idx_conversion_events_tenant ON conversion_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_conversion_events_user ON conversion_events(user_identifier);
CREATE INDEX IF NOT EXISTS idx_conversion_events_type ON conversion_events(event_type);
CREATE INDEX IF NOT EXISTS idx_conversion_events_created ON conversion_events(created_at);
CREATE INDEX IF NOT EXISTS idx_conversion_events_product ON conversion_events(product_id);
CREATE INDEX IF NOT EXISTS idx_ab_test_experiments_tenant ON ab_test_experiments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ab_test_experiments_status ON ab_test_experiments(status);
CREATE INDEX IF NOT EXISTS idx_ab_test_participations_experiment ON ab_test_participations(experiment_id);
CREATE INDEX IF NOT EXISTS idx_ab_test_participations_user ON ab_test_participations(user_identifier);

-- Multi-network affiliate indexes
CREATE INDEX IF NOT EXISTS idx_affiliate_networks_slug ON affiliate_networks(slug);
CREATE INDEX IF NOT EXISTS idx_affiliate_networks_status ON affiliate_networks(status);
CREATE INDEX IF NOT EXISTS idx_tenant_network_connections_tenant ON tenant_network_connections(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_network_connections_network ON tenant_network_connections(network_id);
CREATE INDEX IF NOT EXISTS idx_tenant_network_connections_active ON tenant_network_connections(active) WHERE active = true;

-- Product management indexes
CREATE INDEX IF NOT EXISTS idx_product_variants_product ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_network ON product_variants(network_id);
CREATE INDEX IF NOT EXISTS idx_product_price_history_product ON product_price_history(product_id);
CREATE INDEX IF NOT EXISTS idx_product_price_history_recorded ON product_price_history(recorded_at);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_conversion_events_tenant_type_created ON conversion_events(tenant_id, event_type, created_at);
CREATE INDEX IF NOT EXISTS idx_mobile_analytics_tenant_event_timestamp ON mobile_analytics(tenant_id, event_type, timestamp);
CREATE INDEX IF NOT EXISTS idx_notification_logs_tenant_status_created ON notification_logs(tenant_id, status, created_at);

-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS on all new tables
ALTER TABLE mobile_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE mobile_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversion_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_test_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_test_participations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_network_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_price_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for tenant isolation
-- Note: These policies assume the existence of auth.jwt() function and proper authentication
-- In a real deployment, you would customize these based on your auth implementation

-- Mobile devices policies
CREATE POLICY "Tenants can manage their mobile devices" ON mobile_devices
    FOR ALL USING (tenant_id IN (
        SELECT id FROM tenants WHERE slug = COALESCE(current_setting('app.current_tenant', true), '')
    ));

-- Notification campaigns policies
CREATE POLICY "Tenants can manage their notification campaigns" ON notification_campaigns
    FOR ALL USING (tenant_id IN (
        SELECT id FROM tenants WHERE slug = COALESCE(current_setting('app.current_tenant', true), '')
    ));

-- Notification logs policies
CREATE POLICY "Tenants can view their notification logs" ON notification_logs
    FOR SELECT USING (tenant_id IN (
        SELECT id FROM tenants WHERE slug = COALESCE(current_setting('app.current_tenant', true), '')
    ));

-- Mobile analytics policies
CREATE POLICY "Tenants can view their mobile analytics" ON mobile_analytics
    FOR ALL USING (tenant_id IN (
        SELECT id FROM tenants WHERE slug = COALESCE(current_setting('app.current_tenant', true), '')
    ));

-- Conversion events policies
CREATE POLICY "Tenants can view their conversion events" ON conversion_events
    FOR ALL USING (tenant_id IN (
        SELECT id FROM tenants WHERE slug = COALESCE(current_setting('app.current_tenant', true), '')
    ));

-- A/B test experiments policies
CREATE POLICY "Tenants can manage their experiments" ON ab_test_experiments
    FOR ALL USING (tenant_id IN (
        SELECT id FROM tenants WHERE slug = COALESCE(current_setting('app.current_tenant', true), '')
    ));

-- Network connections policies
CREATE POLICY "Tenants can manage their network connections" ON tenant_network_connections
    FOR ALL USING (tenant_id IN (
        SELECT id FROM tenants WHERE slug = COALESCE(current_setting('app.current_tenant', true), '')
    ));

-- ============================================================================
-- Trigger Functions for Automated Updates
-- ============================================================================

-- Function to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers to relevant tables
CREATE TRIGGER update_mobile_devices_updated_at BEFORE UPDATE ON mobile_devices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_campaigns_updated_at BEFORE UPDATE ON notification_campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_api_rate_limits_updated_at BEFORE UPDATE ON api_rate_limits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_api_keys_updated_at BEFORE UPDATE ON api_keys
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_app_reviews_updated_at BEFORE UPDATE ON app_reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ab_test_experiments_updated_at BEFORE UPDATE ON ab_test_experiments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_affiliate_networks_updated_at BEFORE UPDATE ON affiliate_networks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tenant_network_connections_updated_at BEFORE UPDATE ON tenant_network_connections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Materialized Views for Performance
-- ============================================================================

-- Materialized view for app installation statistics
CREATE MATERIALIZED VIEW IF NOT EXISTS app_installation_stats AS
SELECT 
    da.id as app_id,
    da.name,
    da.category,
    COUNT(ai.id) as total_installs,
    COUNT(CASE WHEN ai.status = 'active' THEN 1 END) as active_installs,
    AVG(ar.rating) as average_rating,
    COUNT(ar.id) as review_count,
    MAX(ai.installed_at) as last_install_date
FROM developer_apps da
LEFT JOIN app_installations ai ON da.id = ai.app_id
LEFT JOIN app_reviews ar ON da.id = ar.app_id
GROUP BY da.id, da.name, da.category;

-- Create unique index for materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_app_installation_stats_app_id ON app_installation_stats(app_id);

-- Materialized view for tenant revenue analytics
CREATE MATERIALIZED VIEW IF NOT EXISTS tenant_revenue_analytics AS
SELECT 
    t.id as tenant_id,
    t.slug,
    COUNT(DISTINCT ce.id) as total_conversions,
    SUM(ce.conversion_value) as total_revenue,
    SUM(ce.commission_earned) as total_commission,
    COUNT(DISTINCT ce.user_identifier) as unique_customers,
    DATE_TRUNC('month', ce.created_at) as month
FROM tenants t
LEFT JOIN conversion_events ce ON t.id = ce.tenant_id
WHERE ce.event_type = 'purchase'
GROUP BY t.id, t.slug, DATE_TRUNC('month', ce.created_at);

-- Create unique index for materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_revenue_analytics_tenant_month ON tenant_revenue_analytics(tenant_id, month);

-- ============================================================================
-- Comments for Documentation
-- ============================================================================

COMMENT ON TABLE mobile_devices IS 'Stores mobile device information for push notifications and app analytics';
COMMENT ON TABLE notification_campaigns IS 'Marketing campaigns for push notifications, email, and SMS';
COMMENT ON TABLE notification_logs IS 'Detailed logs of notification deliveries and interactions';
COMMENT ON TABLE mobile_analytics IS 'Mobile app usage analytics and event tracking';
COMMENT ON TABLE webhook_deliveries IS 'Tracks webhook delivery attempts and responses';
COMMENT ON TABLE api_rate_limits IS 'API rate limiting configuration per app and endpoint';
COMMENT ON TABLE api_keys IS 'Multiple API keys per app with granular permissions';
COMMENT ON TABLE app_reviews IS 'User reviews and ratings for marketplace apps';
COMMENT ON TABLE app_categories IS 'Categories for organizing marketplace apps';
COMMENT ON TABLE conversion_events IS 'Detailed tracking of user conversion events';
COMMENT ON TABLE ab_test_experiments IS 'A/B testing framework for optimization';
COMMENT ON TABLE ab_test_participations IS 'User assignments to A/B test variants';
COMMENT ON TABLE affiliate_networks IS 'Configuration for multiple affiliate networks';
COMMENT ON TABLE tenant_network_connections IS 'Tenant-specific affiliate network credentials';
COMMENT ON TABLE product_variants IS 'Product variations across different networks';
COMMENT ON TABLE product_price_history IS 'Historical price tracking for products';

-- ============================================================================
-- Grant Necessary Permissions
-- ============================================================================

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Grant table permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;

-- Refresh materialized views (should be done periodically via cron job)
-- REFRESH MATERIALIZED VIEW CONCURRENTLY app_installation_stats;
-- REFRESH MATERIALIZED VIEW CONCURRENTLY tenant_revenue_analytics;