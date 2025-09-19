-- =============================================================================
-- AffiliateOS Multi-Tenant SaaS Platform Transformation
-- Migration: 007_affiliateos_transformation.sql
-- 
-- This migration transforms the platform from a single wearable-tech site 
-- to a comprehensive multi-tenant affiliate marketing SaaS platform supporting
-- unlimited niches with advanced user management and analytics.
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "ltree";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- =============================================================================
-- PLATFORM USERS & AUTHENTICATION
-- =============================================================================

-- Platform users table for user accounts across all tenants
CREATE TABLE IF NOT EXISTS platform_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    email_verified BOOLEAN DEFAULT false,
    name VARCHAR(255),
    avatar_url TEXT,
    subscription_tier VARCHAR(50) DEFAULT 'free' CHECK (subscription_tier IN ('free', 'starter', 'pro', 'enterprise', 'white_label')),
    subscription_status VARCHAR(20) DEFAULT 'active' CHECK (subscription_status IN ('active', 'trialing', 'past_due', 'canceled', 'unpaid')),
    subscription_expires_at TIMESTAMPTZ,
    stripe_customer_id VARCHAR(255),
    trial_ends_at TIMESTAMPTZ,
    onboarding_completed BOOLEAN DEFAULT false,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User-site relationships (many-to-many)
CREATE TABLE IF NOT EXISTS user_sites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES platform_users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'admin' CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
    permissions JSONB DEFAULT '{}',
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    last_accessed_at TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'removed')),
    UNIQUE(user_id, tenant_id)
);

-- =============================================================================
-- ENHANCED TENANTS TABLE
-- =============================================================================

-- Add new columns to existing tenants table for multi-niche support
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS niche VARCHAR(100),
ADD COLUMN IF NOT EXISTS niche_keywords TEXT[],
ADD COLUMN IF NOT EXISTS target_audience JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS affiliate_networks JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS branding JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(50) DEFAULT 'free',
ADD COLUMN IF NOT EXISTS monthly_page_views INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES platform_users(id),
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted', 'pending_setup'));

-- Create index on new columns for performance
CREATE INDEX IF NOT EXISTS idx_tenants_niche ON tenants USING GIN(niche_keywords);
CREATE INDEX IF NOT EXISTS idx_tenants_owner ON tenants(owner_id);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);
CREATE INDEX IF NOT EXISTS idx_tenants_subscription ON tenants(subscription_tier);

-- =============================================================================
-- DYNAMIC CATEGORIES SYSTEM
-- =============================================================================

-- Tenant-specific categories for unlimited niche support
CREATE TABLE IF NOT EXISTS tenant_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES tenant_categories(id),
    path LTREE, -- Hierarchical path using ltree
    display_order INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT false,
    seo_title VARCHAR(255),
    seo_description TEXT,
    image_url TEXT,
    product_count INTEGER DEFAULT 0,
    post_count INTEGER DEFAULT 0,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, slug)
);

-- =============================================================================
-- ENHANCED ANALYTICS & INSIGHTS
-- =============================================================================

-- Create materialized view for performance analytics
CREATE MATERIALIZED VIEW IF NOT EXISTS insights_analytics AS
SELECT 
    i.tenant_id,
    DATE_TRUNC('day', i.created_at) as date,
    i.type,
    i.source,
    COUNT(*) as insight_count,
    COUNT(DISTINCT CASE WHEN i.type = 'performance' THEN i.id END) as performance_insights,
    COUNT(DISTINCT CASE WHEN i.type = 'conversion' THEN i.id END) as conversion_insights,
    COUNT(DISTINCT CASE WHEN i.type = 'content' THEN i.id END) as content_insights,
    AVG(CASE WHEN i.kpi = 'revenue' THEN (i.value::DECIMAL) END) as avg_revenue,
    AVG(CASE WHEN i.kpi = 'conversion_rate' THEN (i.value::DECIMAL) END) as avg_conversion_rate,
    SUM(CASE WHEN i.kpi = 'clicks' THEN (i.value::INTEGER) END) as total_clicks
FROM insights i
WHERE i.created_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY i.tenant_id, DATE_TRUNC('day', i.created_at), i.type, i.source;

-- Create unique index for materialized view refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_insights_analytics_unique 
ON insights_analytics(tenant_id, date, type, source);

-- =============================================================================
-- NICHE TEMPLATES & PRESETS
-- =============================================================================

-- Niche templates for quick site setup
CREATE TABLE IF NOT EXISTS niche_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    niche VARCHAR(100) NOT NULL,
    target_audience JSONB NOT NULL,
    categories JSONB NOT NULL, -- Array of category structures
    sample_products JSONB DEFAULT '[]',
    content_templates JSONB DEFAULT '{}',
    recommended_networks JSONB DEFAULT '[]',
    color_scheme JSONB DEFAULT '{}',
    seo_config JSONB DEFAULT '{}',
    is_premium BOOLEAN DEFAULT false,
    popularity_score INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- CONTENT MANAGEMENT ENHANCEMENTS
-- =============================================================================

-- Enhanced posts table with category relationships
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES tenant_categories(id),
ADD COLUMN IF NOT EXISTS tags TEXT[],
ADD COLUMN IF NOT EXISTS reading_time INTEGER,
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS engagement_score DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS content_quality_score DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS monetization_score DECIMAL(3,2);

-- Enhanced products table with category relationships
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES tenant_categories(id),
ADD COLUMN IF NOT EXISTS tags TEXT[],
ADD COLUMN IF NOT EXISTS performance_score DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS click_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS conversion_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS revenue_generated DECIMAL(10,2) DEFAULT 0;

-- =============================================================================
-- SUBSCRIPTION & BILLING
-- =============================================================================

-- Subscription plans and limits
CREATE TABLE IF NOT EXISTS subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    price_monthly DECIMAL(10,2),
    price_yearly DECIMAL(10,2),
    features JSONB NOT NULL,
    limits JSONB NOT NULL, -- {sites: 5, products: 1000, posts: 100, etc.}
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Usage tracking for billing and limits
CREATE TABLE IF NOT EXISTS tenant_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    products_count INTEGER DEFAULT 0,
    posts_count INTEGER DEFAULT 0,
    page_views INTEGER DEFAULT 0,
    api_calls INTEGER DEFAULT 0,
    storage_used_mb DECIMAL(10,2) DEFAULT 0,
    bandwidth_used_gb DECIMAL(10,2) DEFAULT 0,
    ai_credits_used INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, period_start)
);

-- =============================================================================
-- PERFORMANCE OPTIMIZED INDEXES
-- =============================================================================

-- Platform users indexes
CREATE INDEX IF NOT EXISTS idx_platform_users_email ON platform_users(email);
CREATE INDEX IF NOT EXISTS idx_platform_users_subscription ON platform_users(subscription_tier, subscription_status);
CREATE INDEX IF NOT EXISTS idx_platform_users_trial ON platform_users(trial_ends_at) WHERE trial_ends_at IS NOT NULL;

-- User sites indexes
CREATE INDEX IF NOT EXISTS idx_user_sites_user ON user_sites(user_id, status);
CREATE INDEX IF NOT EXISTS idx_user_sites_tenant ON user_sites(tenant_id, role);
CREATE INDEX IF NOT EXISTS idx_user_sites_last_accessed ON user_sites(last_accessed_at DESC);

-- Tenant categories indexes
CREATE INDEX IF NOT EXISTS idx_tenant_categories_tenant ON tenant_categories(tenant_id, display_order);
CREATE INDEX IF NOT EXISTS idx_tenant_categories_path ON tenant_categories USING GIST(path);
CREATE INDEX IF NOT EXISTS idx_tenant_categories_parent ON tenant_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_tenant_categories_featured ON tenant_categories(tenant_id, is_featured) WHERE is_featured = true;

-- Niche templates indexes
CREATE INDEX IF NOT EXISTS idx_niche_templates_niche ON niche_templates(niche);
CREATE INDEX IF NOT EXISTS idx_niche_templates_popularity ON niche_templates(popularity_score DESC);
CREATE INDEX IF NOT EXISTS idx_niche_templates_premium ON niche_templates(is_premium);

-- Enhanced content indexes
CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category_id, status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_tags ON posts USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_posts_engagement ON posts(tenant_id, engagement_score DESC);
CREATE INDEX IF NOT EXISTS idx_posts_ai_generated ON posts(tenant_id, ai_generated);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id, in_stock);
CREATE INDEX IF NOT EXISTS idx_products_tags ON products USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_products_performance ON products(tenant_id, performance_score DESC);
CREATE INDEX IF NOT EXISTS idx_products_revenue ON products(tenant_id, revenue_generated DESC);

-- Usage tracking indexes
CREATE INDEX IF NOT EXISTS idx_tenant_usage_period ON tenant_usage(tenant_id, period_start DESC);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_active ON subscription_plans(is_active, price_monthly);

-- Full-text search indexes
CREATE INDEX IF NOT EXISTS idx_tenants_search ON tenants USING GIN(
    to_tsvector('english', name || ' ' || COALESCE(niche, '') || ' ' || array_to_string(COALESCE(niche_keywords, '{}'), ' '))
);

CREATE INDEX IF NOT EXISTS idx_posts_search ON posts USING GIN(
    to_tsvector('english', title || ' ' || COALESCE(excerpt, '') || ' ' || array_to_string(COALESCE(tags, '{}'), ' '))
);

CREATE INDEX IF NOT EXISTS idx_products_search ON products USING GIN(
    to_tsvector('english', title || ' ' || COALESCE(description, '') || ' ' || COALESCE(brand, '') || ' ' || array_to_string(COALESCE(tags, '{}'), ' '))
);

-- =============================================================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================================================

-- Enable RLS on all new tables
ALTER TABLE platform_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE niche_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_usage ENABLE ROW LEVEL SECURITY;

-- Platform users can only see their own data
CREATE POLICY "Users can view own profile" ON platform_users
    FOR SELECT USING (auth.uid()::TEXT = id::TEXT);

CREATE POLICY "Users can update own profile" ON platform_users
    FOR UPDATE USING (auth.uid()::TEXT = id::TEXT);

-- User sites policies - users can only see sites they have access to
CREATE POLICY "Users can view their site access" ON user_sites
    FOR SELECT USING (user_id IN (
        SELECT id FROM platform_users WHERE auth.uid()::TEXT = id::TEXT
    ));

-- Tenant categories - isolated by tenant
CREATE POLICY "Tenant isolation for categories" ON tenant_categories
    FOR ALL USING (tenant_id IN (
        SELECT us.tenant_id FROM user_sites us 
        JOIN platform_users pu ON us.user_id = pu.id 
        WHERE pu.id::TEXT = auth.uid()::TEXT AND us.status = 'active'
    ));

-- Niche templates - public read access
CREATE POLICY "Public read for niche templates" ON niche_templates
    FOR SELECT USING (true);

-- Subscription plans - public read access
CREATE POLICY "Public read for subscription plans" ON subscription_plans
    FOR SELECT USING (is_active = true);

-- Tenant usage - restricted to site owners/admins
CREATE POLICY "Tenant usage access" ON tenant_usage
    FOR SELECT USING (tenant_id IN (
        SELECT us.tenant_id FROM user_sites us 
        JOIN platform_users pu ON us.user_id = pu.id 
        WHERE pu.id::TEXT = auth.uid()::TEXT 
        AND us.role IN ('owner', 'admin')
        AND us.status = 'active'
    ));

-- =============================================================================
-- STORED FUNCTIONS FOR PERFORMANCE
-- =============================================================================

-- Function to update category product/post counts
CREATE OR REPLACE FUNCTION update_category_counts()
RETURNS TRIGGER AS $$
BEGIN
    -- Update product count for old category
    IF TG_OP = 'UPDATE' AND OLD.category_id IS NOT NULL THEN
        UPDATE tenant_categories 
        SET product_count = (
            SELECT COUNT(*) FROM products 
            WHERE category_id = OLD.category_id AND in_stock = true
        )
        WHERE id = OLD.category_id;
    END IF;
    
    -- Update product count for new category
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') AND NEW.category_id IS NOT NULL THEN
        UPDATE tenant_categories 
        SET product_count = (
            SELECT COUNT(*) FROM products 
            WHERE category_id = NEW.category_id AND in_stock = true
        )
        WHERE id = NEW.category_id;
    END IF;
    
    -- Update post count for old category
    IF TG_OP = 'UPDATE' AND OLD.category_id IS NOT NULL AND TG_TABLE_NAME = 'posts' THEN
        UPDATE tenant_categories 
        SET post_count = (
            SELECT COUNT(*) FROM posts 
            WHERE category_id = OLD.category_id AND status = 'published'
        )
        WHERE id = OLD.category_id;
    END IF;
    
    -- Update post count for new category
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') AND NEW.category_id IS NOT NULL AND TG_TABLE_NAME = 'posts' THEN
        UPDATE tenant_categories 
        SET post_count = (
            SELECT COUNT(*) FROM posts 
            WHERE category_id = NEW.category_id AND status = 'published'
        )
        WHERE id = NEW.category_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Function to calculate tenant analytics
CREATE OR REPLACE FUNCTION get_tenant_analytics(tenant_uuid UUID, days INTEGER DEFAULT 30)
RETURNS TABLE(
    total_products BIGINT,
    total_posts BIGINT,
    total_categories BIGINT,
    avg_engagement DECIMAL,
    total_revenue DECIMAL,
    conversion_rate DECIMAL,
    top_category TEXT,
    growth_rate DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    WITH current_period AS (
        SELECT 
            COUNT(DISTINCT p.id) as products,
            COUNT(DISTINCT po.id) as posts,
            COUNT(DISTINCT tc.id) as categories,
            AVG(po.engagement_score) as engagement,
            SUM(pr.revenue_generated) as revenue,
            CASE 
                WHEN SUM(pr.click_count) > 0 
                THEN (SUM(pr.conversion_count)::DECIMAL / SUM(pr.click_count)::DECIMAL) * 100
                ELSE 0
            END as conv_rate
        FROM tenants t
        LEFT JOIN products pr ON t.id = pr.tenant_id
        LEFT JOIN posts po ON t.id = po.tenant_id AND po.status = 'published'
        LEFT JOIN tenant_categories tc ON t.id = tc.tenant_id
        WHERE t.id = tenant_uuid
        AND (pr.created_at >= NOW() - INTERVAL '%s days' OR pr.created_at IS NULL)
        AND (po.created_at >= NOW() - INTERVAL '%s days' OR po.created_at IS NULL)
    ),
    previous_period AS (
        SELECT SUM(pr.revenue_generated) as prev_revenue
        FROM products pr
        WHERE pr.tenant_id = tenant_uuid
        AND pr.created_at >= NOW() - INTERVAL '%s days'
        AND pr.created_at < NOW() - INTERVAL '%s days'
    ),
    top_cat AS (
        SELECT tc.name
        FROM tenant_categories tc
        WHERE tc.tenant_id = tenant_uuid
        ORDER BY tc.product_count DESC
        LIMIT 1
    )
    SELECT 
        cp.products,
        cp.posts,
        cp.categories,
        COALESCE(cp.engagement, 0),
        COALESCE(cp.revenue, 0),
        COALESCE(cp.conv_rate, 0),
        COALESCE(tc.name, 'None'),
        CASE 
            WHEN pp.prev_revenue > 0 
            THEN ((cp.revenue - pp.prev_revenue) / pp.prev_revenue) * 100
            ELSE 0
        END as growth
    FROM current_period cp
    CROSS JOIN previous_period pp
    CROSS JOIN top_cat tc;
END;
$$ LANGUAGE plpgsql;

-- Function to update category paths when hierarchy changes
CREATE OR REPLACE FUNCTION update_category_path()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.parent_id IS NULL THEN
        NEW.path = NEW.id::TEXT::LTREE;
    ELSE
        SELECT path || NEW.id::TEXT::LTREE INTO NEW.path
        FROM tenant_categories 
        WHERE id = NEW.parent_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Update category counts when products/posts change
CREATE TRIGGER update_product_category_counts
    AFTER INSERT OR UPDATE OR DELETE ON products
    FOR EACH ROW EXECUTE FUNCTION update_category_counts();

CREATE TRIGGER update_post_category_counts
    AFTER INSERT OR UPDATE OR DELETE ON posts
    FOR EACH ROW EXECUTE FUNCTION update_category_counts();

-- Update category paths
CREATE TRIGGER update_category_path_trigger
    BEFORE INSERT OR UPDATE ON tenant_categories
    FOR EACH ROW EXECUTE FUNCTION update_category_path();

-- Update timestamps
CREATE TRIGGER update_platform_users_updated_at
    BEFORE UPDATE ON platform_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_tenant_categories_updated_at
    BEFORE UPDATE ON tenant_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_niche_templates_updated_at
    BEFORE UPDATE ON niche_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- INITIAL DATA SEEDING
-- =============================================================================

-- Insert default subscription plans
INSERT INTO subscription_plans (name, slug, description, price_monthly, price_yearly, features, limits) VALUES
('Free', 'free', 'Perfect for getting started', 0, 0, 
 '["Basic analytics", "1 site", "Email support"]',
 '{"sites": 1, "products": 100, "posts": 10, "storage_mb": 500, "page_views": 10000}'),
('Starter', 'starter', 'For small affiliate sites', 29, 290,
 '["Advanced analytics", "5 sites", "Priority support", "Custom domains"]',
 '{"sites": 5, "products": 1000, "posts": 100, "storage_mb": 5000, "page_views": 100000}'),
('Pro', 'pro', 'For professional marketers', 99, 990,
 '["Premium analytics", "25 sites", "API access", "White-label options"]',
 '{"sites": 25, "products": 10000, "posts": 1000, "storage_mb": 25000, "page_views": 1000000}'),
('Enterprise', 'enterprise', 'For agencies and large operations', 299, 2990,
 '["Enterprise analytics", "Unlimited sites", "Dedicated support", "Custom integrations"]',
 '{"sites": -1, "products": -1, "posts": -1, "storage_mb": -1, "page_views": -1}')
ON CONFLICT (slug) DO NOTHING;

-- Insert popular niche templates
INSERT INTO niche_templates (name, slug, niche, target_audience, categories, recommended_networks, is_premium) VALUES
('Tech & Gadgets', 'tech-gadgets', 'Technology', 
 '{"demographics": {"age": "25-45", "interests": ["technology", "gadgets", "innovation"]}}',
 '[{"name": "Smartphones", "slug": "smartphones"}, {"name": "Laptops", "slug": "laptops"}, {"name": "Smart Home", "slug": "smart-home"}]',
 '["amazon", "bestbuy", "newegg"]', false),
('Health & Fitness', 'health-fitness', 'Health & Wellness',
 '{"demographics": {"age": "20-50", "interests": ["fitness", "health", "wellness"]}}',
 '[{"name": "Exercise Equipment", "slug": "exercise-equipment"}, {"name": "Supplements", "slug": "supplements"}, {"name": "Wearables", "slug": "wearables"}]',
 '["amazon", "iherb", "vitacost"]', false),
('Home & Garden', 'home-garden', 'Home Improvement',
 '{"demographics": {"age": "30-60", "interests": ["home improvement", "gardening", "decor"]}}',
 '[{"name": "Tools", "slug": "tools"}, {"name": "Garden", "slug": "garden"}, {"name": "Furniture", "slug": "furniture"}]',
 '["amazon", "homedepot", "lowes"]', false)
ON CONFLICT (slug) DO NOTHING;

-- =============================================================================
-- REFRESH MATERIALIZED VIEW
-- =============================================================================

-- Refresh the insights analytics view
REFRESH MATERIALIZED VIEW insights_analytics;

-- =============================================================================
-- PERFORMANCE MONITORING
-- =============================================================================

-- Create function to monitor query performance
CREATE OR REPLACE FUNCTION log_slow_queries()
RETURNS event_trigger AS $$
BEGIN
    -- This would be implemented with pg_stat_statements in production
    -- For now, it's a placeholder for monitoring setup
    NULL;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- COMPLETION MESSAGE
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE 'AffiliateOS transformation migration completed successfully!';
    RAISE NOTICE 'New features enabled:';
    RAISE NOTICE '- Multi-tenant user management';
    RAISE NOTICE '- Dynamic category system with ltree';
    RAISE NOTICE '- Niche templates for quick setup';
    RAISE NOTICE '- Enhanced analytics and insights';
    RAISE NOTICE '- Subscription management';
    RAISE NOTICE '- Performance-optimized indexes';
    RAISE NOTICE '- Row-level security policies';
    RAISE NOTICE 'Platform is now ready for multi-niche affiliate sites!';
END $$;