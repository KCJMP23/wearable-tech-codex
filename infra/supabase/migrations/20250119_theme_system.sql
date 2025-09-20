-- Theme System Tables

-- Theme registry for available themes
CREATE TABLE IF NOT EXISTS public.themes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  theme_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  version TEXT NOT NULL DEFAULT '1.0.0',
  author TEXT,
  category TEXT CHECK (category IN ('minimal', 'magazine', 'boutique', 'professional', 'playful', 'custom')),
  thumbnail_url TEXT,
  screenshots JSONB DEFAULT '[]'::jsonb,
  tags TEXT[] DEFAULT '{}',
  config JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  price DECIMAL(10,2) DEFAULT 0,
  downloads INTEGER DEFAULT 0,
  rating DECIMAL(2,1) DEFAULT 0,
  reviews_count INTEGER DEFAULT 0,
  compatible_versions JSONB DEFAULT '{"min": "1.0.0"}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Theme installations per tenant
CREATE TABLE IF NOT EXISTS public.theme_installations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  theme_id UUID NOT NULL REFERENCES public.themes(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT false,
  customizations JSONB DEFAULT '{}'::jsonb,
  installed_at TIMESTAMPTZ DEFAULT NOW(),
  activated_at TIMESTAMPTZ,
  UNIQUE(tenant_id, theme_id)
);

-- Theme customizations history
CREATE TABLE IF NOT EXISTS public.theme_customizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  installation_id UUID NOT NULL REFERENCES public.theme_installations(id) ON DELETE CASCADE,
  customizations JSONB NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Theme ratings and reviews
CREATE TABLE IF NOT EXISTS public.theme_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  theme_id UUID NOT NULL REFERENCES public.themes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(theme_id, user_id)
);

-- Plugin System Tables

-- Plugin registry
CREATE TABLE IF NOT EXISTS public.plugins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plugin_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  version TEXT NOT NULL DEFAULT '1.0.0',
  author TEXT,
  category TEXT CHECK (category IN ('analytics', 'marketing', 'seo', 'social', 'content', 'commerce', 'utility', 'integration')),
  thumbnail_url TEXT,
  screenshots JSONB DEFAULT '[]'::jsonb,
  tags TEXT[] DEFAULT '{}',
  manifest JSONB NOT NULL,
  permissions TEXT[] DEFAULT '{}',
  hooks TEXT[] DEFAULT '{}',
  settings_schema JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  price DECIMAL(10,2) DEFAULT 0,
  downloads INTEGER DEFAULT 0,
  rating DECIMAL(2,1) DEFAULT 0,
  reviews_count INTEGER DEFAULT 0,
  compatible_versions JSONB DEFAULT '{"min": "1.0.0"}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Plugin installations per tenant
CREATE TABLE IF NOT EXISTS public.plugin_installations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  plugin_id UUID NOT NULL REFERENCES public.plugins(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  settings JSONB DEFAULT '{}'::jsonb,
  installed_at TIMESTAMPTZ DEFAULT NOW(),
  activated_at TIMESTAMPTZ,
  last_executed_at TIMESTAMPTZ,
  execution_count INTEGER DEFAULT 0,
  UNIQUE(tenant_id, plugin_id)
);

-- Plugin execution logs
CREATE TABLE IF NOT EXISTS public.plugin_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  installation_id UUID NOT NULL REFERENCES public.plugin_installations(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}'::jsonb,
  error TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Plugin reviews
CREATE TABLE IF NOT EXISTS public.plugin_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plugin_id UUID NOT NULL REFERENCES public.plugins(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(plugin_id, user_id)
);

-- Developer profiles for theme/plugin creators
CREATE TABLE IF NOT EXISTS public.developers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  bio TEXT,
  avatar_url TEXT,
  website TEXT,
  github_username TEXT,
  twitter_username TEXT,
  revenue_share DECIMAL(3,2) DEFAULT 0.70,
  total_revenue DECIMAL(10,2) DEFAULT 0,
  total_downloads INTEGER DEFAULT 0,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Marketplace transactions
CREATE TABLE IF NOT EXISTS public.marketplace_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  item_type TEXT CHECK (item_type IN ('theme', 'plugin')),
  item_id UUID NOT NULL,
  developer_id UUID REFERENCES public.developers(id),
  amount DECIMAL(10,2) NOT NULL,
  developer_revenue DECIMAL(10,2),
  platform_revenue DECIMAL(10,2),
  stripe_payment_intent TEXT,
  status TEXT CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default themes
INSERT INTO public.themes (theme_id, name, description, category, author, tags, config, is_featured) VALUES
('minimal', 'Minimal', 'Clean and minimalist design focused on content clarity', 'minimal', 'AffiliateOS', ARRAY['minimal', 'clean', 'simple'], '{"id": "minimal"}'::jsonb, true),
('magazine', 'Magazine', 'Editorial-style layout perfect for content-rich affiliate sites', 'magazine', 'AffiliateOS', ARRAY['editorial', 'content', 'blog'], '{"id": "magazine"}'::jsonb, true),
('boutique', 'Boutique', 'Elegant and sophisticated design for premium affiliate sites', 'boutique', 'AffiliateOS', ARRAY['elegant', 'premium', 'luxury'], '{"id": "boutique"}'::jsonb, true),
('professional', 'Professional', 'Corporate and trustworthy design for B2B affiliate sites', 'professional', 'AffiliateOS', ARRAY['corporate', 'business', 'enterprise'], '{"id": "professional"}'::jsonb, true),
('playful', 'Playful', 'Fun and vibrant design for lifestyle and entertainment niches', 'playful', 'AffiliateOS', ARRAY['fun', 'vibrant', 'colorful'], '{"id": "playful"}'::jsonb, true);

-- Create indexes for performance
CREATE INDEX idx_theme_installations_tenant ON public.theme_installations(tenant_id);
CREATE INDEX idx_theme_installations_active ON public.theme_installations(tenant_id, is_active);
CREATE INDEX idx_plugin_installations_tenant ON public.plugin_installations(tenant_id);
CREATE INDEX idx_plugin_installations_active ON public.plugin_installations(tenant_id, is_active);
CREATE INDEX idx_themes_category ON public.themes(category);
CREATE INDEX idx_plugins_category ON public.plugins(category);
CREATE INDEX idx_plugin_logs_installation ON public.plugin_logs(installation_id);
CREATE INDEX idx_marketplace_transactions_tenant ON public.marketplace_transactions(tenant_id);

-- RLS Policies
ALTER TABLE public.themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.theme_installations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.theme_customizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.theme_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plugins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plugin_installations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plugin_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plugin_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.developers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_transactions ENABLE ROW LEVEL SECURITY;

-- Themes are publicly viewable
CREATE POLICY "Themes are viewable by everyone" ON public.themes
  FOR SELECT USING (true);

-- Theme installations are viewable by tenant members
CREATE POLICY "Theme installations are viewable by tenant members" ON public.theme_installations
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_users 
      WHERE user_id = auth.uid()
    )
  );

-- Plugins are publicly viewable
CREATE POLICY "Plugins are viewable by everyone" ON public.plugins
  FOR SELECT USING (true);

-- Plugin installations are viewable by tenant members
CREATE POLICY "Plugin installations are viewable by tenant members" ON public.plugin_installations
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_users 
      WHERE user_id = auth.uid()
    )
  );

-- Functions for theme/plugin management
CREATE OR REPLACE FUNCTION install_theme(
  p_tenant_id UUID,
  p_theme_id UUID
) RETURNS UUID AS $$
DECLARE
  v_installation_id UUID;
BEGIN
  -- Deactivate current theme
  UPDATE public.theme_installations 
  SET is_active = false 
  WHERE tenant_id = p_tenant_id AND is_active = true;
  
  -- Install and activate new theme
  INSERT INTO public.theme_installations (tenant_id, theme_id, is_active, activated_at)
  VALUES (p_tenant_id, p_theme_id, true, NOW())
  ON CONFLICT (tenant_id, theme_id) 
  DO UPDATE SET is_active = true, activated_at = NOW()
  RETURNING id INTO v_installation_id;
  
  -- Increment download count
  UPDATE public.themes 
  SET downloads = downloads + 1 
  WHERE id = p_theme_id;
  
  RETURN v_installation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION install_plugin(
  p_tenant_id UUID,
  p_plugin_id UUID,
  p_settings JSONB DEFAULT '{}'::jsonb
) RETURNS UUID AS $$
DECLARE
  v_installation_id UUID;
BEGIN
  -- Install plugin
  INSERT INTO public.plugin_installations (tenant_id, plugin_id, settings, activated_at)
  VALUES (p_tenant_id, p_plugin_id, p_settings, NOW())
  ON CONFLICT (tenant_id, plugin_id) 
  DO UPDATE SET is_active = true, settings = p_settings, activated_at = NOW()
  RETURNING id INTO v_installation_id;
  
  -- Increment download count
  UPDATE public.plugins 
  SET downloads = downloads + 1 
  WHERE id = p_plugin_id;
  
  RETURN v_installation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;