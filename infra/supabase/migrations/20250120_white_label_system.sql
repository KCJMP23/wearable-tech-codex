-- =============================================================================
-- White Label System Migration
-- Adds all necessary tables and columns for complete white-label functionality
-- =============================================================================

-- Add white-label columns to existing tenants table
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS favicon_url TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS primary_color VARCHAR(7) DEFAULT '#3b82f6';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS secondary_color VARCHAR(7) DEFAULT '#64748b';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS brand_name VARCHAR(255);

-- Create tenant_domains table for custom domain mapping
CREATE TABLE IF NOT EXISTS tenant_domains (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    domain VARCHAR(255) NOT NULL UNIQUE,
    ssl_enabled BOOLEAN DEFAULT true,
    ssl_provider VARCHAR(50) DEFAULT 'cloudflare', -- cloudflare, letsencrypt, custom
    ssl_status VARCHAR(20) DEFAULT 'pending', -- pending, active, failed, expired
    dns_challenge_record TEXT,
    certificate_expiry TIMESTAMP WITH TIME ZONE,
    redirect_to_www BOOLEAN DEFAULT false,
    enforce_https BOOLEAN DEFAULT true,
    active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tenant_themes table
CREATE TABLE IF NOT EXISTS tenant_themes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    colors JSONB NOT NULL DEFAULT '{}',
    typography JSONB NOT NULL DEFAULT '{}',
    spacing JSONB NOT NULL DEFAULT '{}',
    border_radius JSONB NOT NULL DEFAULT '{}',
    shadows JSONB NOT NULL DEFAULT '{}',
    animations JSONB NOT NULL DEFAULT '{}',
    custom_css TEXT,
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create theme_overrides table
CREATE TABLE IF NOT EXISTS theme_overrides (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    theme_id UUID REFERENCES tenant_themes(id) ON DELETE SET NULL,
    components JSONB DEFAULT '[]',
    global_styles JSONB DEFAULT '{}',
    css_variables JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tenant_branding table
CREATE TABLE IF NOT EXISTS tenant_branding (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    assets JSONB DEFAULT '{}', -- logoUrl, faviconUrl, etc.
    colors JSONB DEFAULT '{}',
    typography JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}', -- company info, social links, etc.
    custom_css TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create email_branding table
CREATE TABLE IF NOT EXISTS email_branding (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    header_logo TEXT,
    header_color VARCHAR(7) DEFAULT '#3b82f6',
    background_color VARCHAR(7) DEFAULT '#ffffff',
    text_color VARCHAR(7) DEFAULT '#1e293b',
    link_color VARCHAR(7) DEFAULT '#3b82f6',
    button_color VARCHAR(7) DEFAULT '#3b82f6',
    button_text_color VARCHAR(7) DEFAULT '#ffffff',
    footer_text TEXT,
    social_links JSONB DEFAULT '{}',
    unsubscribe_text VARCHAR(255) DEFAULT 'Unsubscribe',
    custom_css TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create email_templates table
CREATE TABLE IF NOT EXISTS email_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- welcome, newsletter, product_alert, etc.
    subject TEXT NOT NULL,
    html_content TEXT NOT NULL,
    text_content TEXT,
    variables JSONB DEFAULT '[]',
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create email_logs table
CREATE TABLE IF NOT EXISTS email_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    template_id UUID REFERENCES email_templates(id) ON DELETE SET NULL,
    recipient VARCHAR(255) NOT NULL,
    subject TEXT NOT NULL,
    message_id VARCHAR(255),
    status VARCHAR(20) DEFAULT 'sent', -- sent, delivered, opened, clicked, bounced
    delivered_at TIMESTAMP WITH TIME ZONE,
    opened_at TIMESTAMP WITH TIME ZONE,
    clicked_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create css_injections table
CREATE TABLE IF NOT EXISTS css_injections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    scope VARCHAR(20) NOT NULL, -- global, component, page
    target VARCHAR(255), -- component name or page path
    css TEXT NOT NULL,
    variables JSONB DEFAULT '{}',
    priority INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tenant_analytics_config table
CREATE TABLE IF NOT EXISTS tenant_analytics_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    google_analytics_id VARCHAR(50),
    gtm_id VARCHAR(50),
    facebook_pixel_id VARCHAR(50),
    tiktok_pixel_id VARCHAR(50),
    custom_tracking_code TEXT,
    enable_cookie_consent BOOLEAN DEFAULT true,
    data_retention_days INTEGER DEFAULT 365,
    anonymize_ips BOOLEAN DEFAULT true,
    tracking_domains TEXT[] DEFAULT '{}',
    excluded_paths TEXT[] DEFAULT '{}',
    custom_dimensions JSONB DEFAULT '{}',
    custom_metrics JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create analytics_events table
CREATE TABLE IF NOT EXISTS analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    event_name VARCHAR(255) NOT NULL,
    event_data JSONB DEFAULT '{}',
    user_id VARCHAR(255),
    session_id VARCHAR(255) NOT NULL,
    device_type VARCHAR(20), -- desktop, mobile, tablet
    user_agent TEXT,
    ip_address INET,
    country VARCHAR(2),
    city VARCHAR(255),
    referrer TEXT,
    page VARCHAR(500) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create conversion_events table
CREATE TABLE IF NOT EXISTS conversion_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    conversion_type VARCHAR(50) NOT NULL, -- purchase, signup, lead, custom
    value DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'USD',
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    user_id VARCHAR(255),
    session_id VARCHAR(255) NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tenant_api_config table
CREATE TABLE IF NOT EXISTS tenant_api_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    custom_domain VARCHAR(255),
    api_subdomain VARCHAR(255),
    custom_api_key VARCHAR(255),
    rate_limits JSONB DEFAULT '{}',
    allowed_origins TEXT[] DEFAULT '{}',
    enable_cors BOOLEAN DEFAULT true,
    custom_headers JSONB DEFAULT '{}',
    response_format VARCHAR(20) DEFAULT 'json',
    error_branding JSONB DEFAULT '{}',
    webhook_endpoints TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create api_usage_logs table (extend existing or create new)
CREATE TABLE IF NOT EXISTS api_usage_logs_white_label (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    endpoint VARCHAR(500) NOT NULL,
    method VARCHAR(10) NOT NULL,
    status_code INTEGER NOT NULL,
    response_time_ms INTEGER,
    request_size_bytes INTEGER,
    response_size_bytes INTEGER,
    user_agent TEXT,
    ip_address INET,
    request_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create theme_templates table for pre-built themes
CREATE TABLE IF NOT EXISTS theme_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    preview_image_url TEXT,
    colors JSONB NOT NULL DEFAULT '{}',
    typography JSONB NOT NULL DEFAULT '{}',
    spacing JSONB NOT NULL DEFAULT '{}',
    border_radius JSONB NOT NULL DEFAULT '{}',
    shadows JSONB NOT NULL DEFAULT '{}',
    animations JSONB NOT NULL DEFAULT '{}',
    custom_css TEXT,
    category VARCHAR(100), -- business, creative, minimal, etc.
    is_public BOOLEAN DEFAULT true,
    is_premium BOOLEAN DEFAULT false,
    created_by UUID, -- reference to user/admin
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create brand_assets table for file storage references
CREATE TABLE IF NOT EXISTS brand_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    asset_type VARCHAR(50) NOT NULL, -- logo, favicon, background, etc.
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    dimensions JSONB, -- {width: 100, height: 50}
    alt_text VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tenant_domains_domain ON tenant_domains(domain);
CREATE INDEX IF NOT EXISTS idx_tenant_domains_tenant ON tenant_domains(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_domains_active ON tenant_domains(active);

CREATE INDEX IF NOT EXISTS idx_tenant_themes_tenant ON tenant_themes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_themes_active ON tenant_themes(is_active);

CREATE INDEX IF NOT EXISTS idx_theme_overrides_tenant ON theme_overrides(tenant_id);

CREATE INDEX IF NOT EXISTS idx_tenant_branding_tenant ON tenant_branding(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_branding_active ON tenant_branding(is_active);

CREATE INDEX IF NOT EXISTS idx_email_branding_tenant ON email_branding(tenant_id);

CREATE INDEX IF NOT EXISTS idx_email_templates_tenant ON email_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_email_templates_type ON email_templates(type);
CREATE INDEX IF NOT EXISTS idx_email_templates_active ON email_templates(is_active);

CREATE INDEX IF NOT EXISTS idx_email_logs_tenant ON email_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_created ON email_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);

CREATE INDEX IF NOT EXISTS idx_css_injections_tenant ON css_injections(tenant_id);
CREATE INDEX IF NOT EXISTS idx_css_injections_scope ON css_injections(scope);
CREATE INDEX IF NOT EXISTS idx_css_injections_active ON css_injections(is_active);

CREATE INDEX IF NOT EXISTS idx_analytics_config_tenant ON tenant_analytics_config(tenant_id);

CREATE INDEX IF NOT EXISTS idx_analytics_events_tenant ON analytics_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session ON analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_name ON analytics_events(event_name);

CREATE INDEX IF NOT EXISTS idx_conversion_events_tenant ON conversion_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_conversion_events_created ON conversion_events(created_at);
CREATE INDEX IF NOT EXISTS idx_conversion_events_type ON conversion_events(conversion_type);

CREATE INDEX IF NOT EXISTS idx_api_config_tenant ON tenant_api_config(tenant_id);

CREATE INDEX IF NOT EXISTS idx_api_usage_wl_tenant ON api_usage_logs_white_label(tenant_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_wl_created ON api_usage_logs_white_label(created_at);
CREATE INDEX IF NOT EXISTS idx_api_usage_wl_endpoint ON api_usage_logs_white_label(endpoint);

CREATE INDEX IF NOT EXISTS idx_theme_templates_public ON theme_templates(is_public);
CREATE INDEX IF NOT EXISTS idx_theme_templates_category ON theme_templates(category);

CREATE INDEX IF NOT EXISTS idx_brand_assets_tenant ON brand_assets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_brand_assets_type ON brand_assets(asset_type);
CREATE INDEX IF NOT EXISTS idx_brand_assets_active ON brand_assets(is_active);

-- Add constraints
ALTER TABLE tenant_themes ADD CONSTRAINT unique_tenant_active_theme 
    EXCLUDE (tenant_id WITH =) WHERE (is_active = true);

ALTER TABLE tenant_branding ADD CONSTRAINT unique_tenant_branding 
    EXCLUDE (tenant_id WITH =) WHERE (is_active = true);

-- Add updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tenant_domains_updated_at BEFORE UPDATE ON tenant_domains
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tenant_themes_updated_at BEFORE UPDATE ON tenant_themes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_theme_overrides_updated_at BEFORE UPDATE ON theme_overrides
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tenant_branding_updated_at BEFORE UPDATE ON tenant_branding
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_css_injections_updated_at BEFORE UPDATE ON css_injections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_analytics_config_updated_at BEFORE UPDATE ON tenant_analytics_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_api_config_updated_at BEFORE UPDATE ON tenant_api_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_theme_templates_updated_at BEFORE UPDATE ON theme_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_brand_assets_updated_at BEFORE UPDATE ON brand_assets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default theme templates
INSERT INTO theme_templates (name, description, colors, typography, spacing, border_radius, shadows, animations, category) VALUES
('Modern Business', 'Clean and professional theme for business websites', 
 '{"primary": "#2563eb", "secondary": "#64748b", "accent": "#f59e0b", "background": "#ffffff", "surface": "#f8fafc", "text": "#1e293b", "textSecondary": "#64748b", "border": "#e2e8f0", "success": "#10b981", "warning": "#f59e0b", "error": "#ef4444", "info": "#3b82f6"}',
 '{"fontFamily": "Inter, system-ui, sans-serif", "headingFont": "Inter, system-ui, sans-serif"}',
 '{"xs": "0.25rem", "sm": "0.5rem", "md": "1rem", "lg": "1.5rem", "xl": "2rem", "2xl": "3rem", "3xl": "4rem"}',
 '{"none": "0", "sm": "0.125rem", "md": "0.375rem", "lg": "0.5rem", "xl": "0.75rem", "full": "9999px"}',
 '{"sm": "0 1px 2px 0 rgba(0, 0, 0, 0.05)", "md": "0 4px 6px -1px rgba(0, 0, 0, 0.1)", "lg": "0 10px 15px -3px rgba(0, 0, 0, 0.1)", "xl": "0 20px 25px -5px rgba(0, 0, 0, 0.1)"}',
 '{"fade-in": "fadeIn 0.3s ease-in-out", "slide-up": "slideUp 0.3s ease-out", "scale": "scale 0.2s ease-in-out"}',
 'business'),

('Creative Studio', 'Bold and creative theme for agencies and portfolios',
 '{"primary": "#7c3aed", "secondary": "#f59e0b", "accent": "#ec4899", "background": "#ffffff", "surface": "#fafafa", "text": "#111827", "textSecondary": "#6b7280", "border": "#e5e7eb", "success": "#059669", "warning": "#d97706", "error": "#dc2626", "info": "#7c3aed"}',
 '{"fontFamily": "Poppins, system-ui, sans-serif", "headingFont": "Playfair Display, serif"}',
 '{"xs": "0.25rem", "sm": "0.5rem", "md": "1rem", "lg": "1.5rem", "xl": "2rem", "2xl": "3rem", "3xl": "4rem"}',
 '{"none": "0", "sm": "0.25rem", "md": "0.5rem", "lg": "1rem", "xl": "1.5rem", "full": "9999px"}',
 '{"sm": "0 1px 3px 0 rgba(0, 0, 0, 0.1)", "md": "0 4px 6px -1px rgba(0, 0, 0, 0.1)", "lg": "0 10px 15px -3px rgba(0, 0, 0, 0.1)", "xl": "0 25px 50px -12px rgba(0, 0, 0, 0.25)"}',
 '{"fade-in": "fadeIn 0.5s ease-in-out", "bounce": "bounce 0.6s ease-in-out", "pulse": "pulse 2s infinite"}',
 'creative'),

('Minimal Clean', 'Minimalist theme with focus on content',
 '{"primary": "#000000", "secondary": "#737373", "accent": "#404040", "background": "#ffffff", "surface": "#f9fafb", "text": "#111827", "textSecondary": "#6b7280", "border": "#d1d5db", "success": "#065f46", "warning": "#92400e", "error": "#991b1b", "info": "#1e40af"}',
 '{"fontFamily": "system-ui, -apple-system, sans-serif", "headingFont": "system-ui, -apple-system, sans-serif"}',
 '{"xs": "0.125rem", "sm": "0.25rem", "md": "0.75rem", "lg": "1.25rem", "xl": "1.75rem", "2xl": "2.5rem", "3xl": "3.5rem"}',
 '{"none": "0", "sm": "0.125rem", "md": "0.25rem", "lg": "0.375rem", "xl": "0.5rem", "full": "9999px"}',
 '{"sm": "0 1px 2px 0 rgba(0, 0, 0, 0.05)", "md": "0 1px 3px 0 rgba(0, 0, 0, 0.1)", "lg": "0 4px 6px -1px rgba(0, 0, 0, 0.1)", "xl": "0 10px 15px -3px rgba(0, 0, 0, 0.1)"}',
 '{"fade-in": "fadeIn 0.2s ease-out", "slide": "slideIn 0.3s ease-out"}',
 'minimal');

-- Create storage bucket for brand assets (if using Supabase Storage)
-- This would be executed via Supabase dashboard or API
-- INSERT INTO storage.buckets (id, name, public) VALUES ('brand-assets', 'brand-assets', true);

-- Set up RLS policies
ALTER TABLE tenant_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE theme_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_branding ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_branding ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE css_injections ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_analytics_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversion_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_api_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage_logs_white_label ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_assets ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (adjust based on your auth system)
CREATE POLICY "Tenants can manage their own domains" ON tenant_domains
    FOR ALL USING (tenant_id IN (SELECT id FROM tenants WHERE id = tenant_id));

CREATE POLICY "Tenants can manage their own themes" ON tenant_themes
    FOR ALL USING (tenant_id IN (SELECT id FROM tenants WHERE id = tenant_id));

CREATE POLICY "Tenants can manage their own theme overrides" ON theme_overrides
    FOR ALL USING (tenant_id IN (SELECT id FROM tenants WHERE id = tenant_id));

CREATE POLICY "Tenants can manage their own branding" ON tenant_branding
    FOR ALL USING (tenant_id IN (SELECT id FROM tenants WHERE id = tenant_id));

CREATE POLICY "Tenants can manage their own email branding" ON email_branding
    FOR ALL USING (tenant_id IN (SELECT id FROM tenants WHERE id = tenant_id));

CREATE POLICY "Tenants can manage their own email templates" ON email_templates
    FOR ALL USING (tenant_id IN (SELECT id FROM tenants WHERE id = tenant_id));

CREATE POLICY "Tenants can view their own email logs" ON email_logs
    FOR SELECT USING (tenant_id IN (SELECT id FROM tenants WHERE id = tenant_id));

CREATE POLICY "Tenants can manage their own CSS injections" ON css_injections
    FOR ALL USING (tenant_id IN (SELECT id FROM tenants WHERE id = tenant_id));

CREATE POLICY "Tenants can manage their own analytics config" ON tenant_analytics_config
    FOR ALL USING (tenant_id IN (SELECT id FROM tenants WHERE id = tenant_id));

CREATE POLICY "Tenants can view their own analytics events" ON analytics_events
    FOR SELECT USING (tenant_id IN (SELECT id FROM tenants WHERE id = tenant_id));

CREATE POLICY "Tenants can view their own conversion events" ON conversion_events
    FOR SELECT USING (tenant_id IN (SELECT id FROM tenants WHERE id = tenant_id));

CREATE POLICY "Tenants can manage their own API config" ON tenant_api_config
    FOR ALL USING (tenant_id IN (SELECT id FROM tenants WHERE id = tenant_id));

CREATE POLICY "Tenants can view their own API usage logs" ON api_usage_logs_white_label
    FOR SELECT USING (tenant_id IN (SELECT id FROM tenants WHERE id = tenant_id));

CREATE POLICY "Tenants can manage their own brand assets" ON brand_assets
    FOR ALL USING (tenant_id IN (SELECT id FROM tenants WHERE id = tenant_id));

-- Theme templates are public for reading
CREATE POLICY "Theme templates are publicly readable" ON theme_templates
    FOR SELECT USING (is_public = true);

-- Comments explaining the schema
COMMENT ON TABLE tenant_domains IS 'Custom domain configurations for white-label tenants';
COMMENT ON TABLE tenant_themes IS 'Theme configurations including colors, typography, and styling';
COMMENT ON TABLE theme_overrides IS 'Component-specific theme overrides and customizations';
COMMENT ON TABLE tenant_branding IS 'Brand assets and identity configuration';
COMMENT ON TABLE email_branding IS 'Email template branding and styling';
COMMENT ON TABLE email_templates IS 'Customizable email templates';
COMMENT ON TABLE css_injections IS 'Custom CSS injections for advanced styling';
COMMENT ON TABLE tenant_analytics_config IS 'Analytics and tracking configuration';
COMMENT ON TABLE analytics_events IS 'White-label analytics event tracking';
COMMENT ON TABLE conversion_events IS 'Conversion and goal tracking';
COMMENT ON TABLE tenant_api_config IS 'White-label API configuration';
COMMENT ON TABLE theme_templates IS 'Pre-built theme templates for quick setup';