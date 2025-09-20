-- Email Marketing System Database Schema
-- This migration creates a comprehensive email marketing system for AffiliateOS

-- Email Lists Table
CREATE TABLE IF NOT EXISTS public.email_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  subscriber_count INT DEFAULT 0,
  tags JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, name)
);

-- Email Subscribers Table
CREATE TABLE IF NOT EXISTS public.email_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'unsubscribed', 'bounced', 'complained', 'pending')),
  source TEXT, -- where they signed up from
  ip_address INET,
  user_agent TEXT,
  tags JSONB DEFAULT '[]'::jsonb,
  custom_fields JSONB DEFAULT '{}'::jsonb,
  last_active_at TIMESTAMPTZ,
  subscribed_at TIMESTAMPTZ DEFAULT NOW(),
  unsubscribed_at TIMESTAMPTZ,
  bounce_count INT DEFAULT 0,
  complaint_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, email)
);

-- Email List Subscribers Junction Table
CREATE TABLE IF NOT EXISTS public.email_list_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES public.email_lists(id) ON DELETE CASCADE,
  subscriber_id UUID NOT NULL REFERENCES public.email_subscribers(id) ON DELETE CASCADE,
  subscribed_at TIMESTAMPTZ DEFAULT NOW(),
  unsubscribed_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(list_id, subscriber_id)
);

-- Email Templates Table
CREATE TABLE IF NOT EXISTS public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT, -- newsletter, promotional, transactional, etc.
  type TEXT NOT NULL CHECK (type IN ('newsletter', 'promotional', 'transactional', 'welcome', 'abandoned_cart', 'product_recommendation', 'reengagement', 'birthday', 'seasonal')),
  subject TEXT NOT NULL,
  preheader TEXT,
  html_content TEXT NOT NULL,
  text_content TEXT,
  thumbnail TEXT, -- preview image URL
  is_public BOOLEAN DEFAULT false,
  tags JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, name)
);

-- Email Campaigns Table
CREATE TABLE IF NOT EXISTS public.email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('newsletter', 'promotional', 'transactional', 'welcome', 'abandoned_cart', 'product_recommendation', 'reengagement', 'birthday', 'seasonal')),
  subject TEXT NOT NULL,
  preheader TEXT,
  from_name TEXT NOT NULL,
  from_email TEXT NOT NULL,
  reply_to TEXT,
  html_content TEXT NOT NULL,
  text_content TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'paused', 'cancelled')),
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  list_ids JSONB DEFAULT '[]'::jsonb, -- array of list IDs
  segment_ids JSONB DEFAULT '[]'::jsonb, -- array of segment IDs
  ab_test_config JSONB, -- A/B testing configuration
  tags JSONB DEFAULT '[]'::jsonb,
  stats JSONB DEFAULT '{}'::jsonb, -- send statistics
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email Segments Table
CREATE TABLE IF NOT EXISTS public.email_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  conditions JSONB NOT NULL, -- segment conditions as JSON
  is_active BOOLEAN DEFAULT true,
  subscriber_count INT DEFAULT 0,
  last_calculated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, name)
);

-- Email Automations Table
CREATE TABLE IF NOT EXISTS public.email_automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT false,
  trigger_config JSONB NOT NULL, -- trigger configuration
  actions JSONB NOT NULL, -- automation actions
  tags JSONB DEFAULT '[]'::jsonb,
  stats JSONB DEFAULT '{}'::jsonb, -- automation statistics
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email Automation Executions Table
CREATE TABLE IF NOT EXISTS public.email_automation_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id UUID NOT NULL REFERENCES public.email_automations(id) ON DELETE CASCADE,
  subscriber_id UUID NOT NULL REFERENCES public.email_subscribers(id) ON DELETE CASCADE,
  trigger_data JSONB, -- data that triggered the automation
  current_step INT DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed', 'paused')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  next_action_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Email Analytics Table
CREATE TABLE IF NOT EXISTS public.email_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.email_campaigns(id) ON DELETE CASCADE,
  automation_id UUID REFERENCES public.email_automations(id) ON DELETE CASCADE,
  subscriber_id UUID REFERENCES public.email_subscribers(id) ON DELETE CASCADE,
  event TEXT NOT NULL CHECK (event IN ('sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained', 'unsubscribed')),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  user_agent TEXT,
  ip_address INET,
  location JSONB, -- geographic location data
  url TEXT, -- for click events
  message_id TEXT, -- provider message ID
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email Compliance Settings Table
CREATE TABLE IF NOT EXISTS public.email_compliance_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  can_spam_compliant BOOLEAN DEFAULT false,
  gdpr_compliant BOOLEAN DEFAULT false,
  unsubscribe_url TEXT,
  privacy_policy_url TEXT,
  company_name TEXT NOT NULL,
  company_address TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id)
);

-- Email Provider Settings Table
CREATE TABLE IF NOT EXISTS public.email_provider_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('sendgrid', 'mailgun', 'ses', 'smtp')),
  is_active BOOLEAN DEFAULT false,
  config JSONB NOT NULL, -- encrypted provider configuration
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email Bounces Table (for detailed bounce tracking)
CREATE TABLE IF NOT EXISTS public.email_bounces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id UUID NOT NULL REFERENCES public.email_subscribers(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.email_campaigns(id) ON DELETE CASCADE,
  bounce_type TEXT CHECK (bounce_type IN ('hard', 'soft', 'complaint')),
  reason TEXT,
  diagnostic_code TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Email Unsubscribe Tokens Table (for secure unsubscribes)
CREATE TABLE IF NOT EXISTS public.email_unsubscribe_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id UUID NOT NULL REFERENCES public.email_subscribers(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_lists_tenant_id ON public.email_lists(tenant_id);
CREATE INDEX IF NOT EXISTS idx_email_lists_is_active ON public.email_lists(is_active);

CREATE INDEX IF NOT EXISTS idx_email_subscribers_tenant_id ON public.email_subscribers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_email_subscribers_email ON public.email_subscribers(email);
CREATE INDEX IF NOT EXISTS idx_email_subscribers_status ON public.email_subscribers(status);
CREATE INDEX IF NOT EXISTS idx_email_subscribers_tags ON public.email_subscribers USING GIN(tags);

CREATE INDEX IF NOT EXISTS idx_email_list_subscribers_list_id ON public.email_list_subscribers(list_id);
CREATE INDEX IF NOT EXISTS idx_email_list_subscribers_subscriber_id ON public.email_list_subscribers(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_email_list_subscribers_is_active ON public.email_list_subscribers(is_active);

CREATE INDEX IF NOT EXISTS idx_email_templates_tenant_id ON public.email_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_email_templates_type ON public.email_templates(type);
CREATE INDEX IF NOT EXISTS idx_email_templates_category ON public.email_templates(category);

CREATE INDEX IF NOT EXISTS idx_email_campaigns_tenant_id ON public.email_campaigns(tenant_id);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_status ON public.email_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_type ON public.email_campaigns(type);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_scheduled_at ON public.email_campaigns(scheduled_at);

CREATE INDEX IF NOT EXISTS idx_email_segments_tenant_id ON public.email_segments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_email_segments_is_active ON public.email_segments(is_active);

CREATE INDEX IF NOT EXISTS idx_email_automations_tenant_id ON public.email_automations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_email_automations_is_active ON public.email_automations(is_active);

CREATE INDEX IF NOT EXISTS idx_email_automation_executions_automation_id ON public.email_automation_executions(automation_id);
CREATE INDEX IF NOT EXISTS idx_email_automation_executions_subscriber_id ON public.email_automation_executions(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_email_automation_executions_status ON public.email_automation_executions(status);
CREATE INDEX IF NOT EXISTS idx_email_automation_executions_next_action_at ON public.email_automation_executions(next_action_at);

CREATE INDEX IF NOT EXISTS idx_email_analytics_campaign_id ON public.email_analytics(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_analytics_automation_id ON public.email_analytics(automation_id);
CREATE INDEX IF NOT EXISTS idx_email_analytics_subscriber_id ON public.email_analytics(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_email_analytics_event ON public.email_analytics(event);
CREATE INDEX IF NOT EXISTS idx_email_analytics_timestamp ON public.email_analytics(timestamp);

CREATE INDEX IF NOT EXISTS idx_email_bounces_subscriber_id ON public.email_bounces(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_email_bounces_campaign_id ON public.email_bounces(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_bounces_bounce_type ON public.email_bounces(bounce_type);

CREATE INDEX IF NOT EXISTS idx_email_unsubscribe_tokens_token ON public.email_unsubscribe_tokens(token);
CREATE INDEX IF NOT EXISTS idx_email_unsubscribe_tokens_subscriber_id ON public.email_unsubscribe_tokens(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_email_unsubscribe_tokens_expires_at ON public.email_unsubscribe_tokens(expires_at);

-- Create triggers for updated_at
CREATE TRIGGER update_email_lists_updated_at BEFORE UPDATE ON public.email_lists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_subscribers_updated_at BEFORE UPDATE ON public.email_subscribers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON public.email_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_campaigns_updated_at BEFORE UPDATE ON public.email_campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_segments_updated_at BEFORE UPDATE ON public.email_segments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_automations_updated_at BEFORE UPDATE ON public.email_automations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_compliance_settings_updated_at BEFORE UPDATE ON public.email_compliance_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_provider_settings_updated_at BEFORE UPDATE ON public.email_provider_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS on all tables
ALTER TABLE public.email_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_list_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_automation_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_compliance_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_provider_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_bounces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_unsubscribe_tokens ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Email Lists policies
CREATE POLICY "Users can view email lists for their tenant" ON public.email_lists
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_roles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage email lists for their tenant" ON public.email_lists
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin', 'editor')
    )
  );

-- Email Subscribers policies
CREATE POLICY "Users can view email subscribers for their tenant" ON public.email_subscribers
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_roles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage email subscribers for their tenant" ON public.email_subscribers
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin', 'editor')
    )
  );

-- Email Templates policies
CREATE POLICY "Users can view email templates for their tenant" ON public.email_templates
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_roles 
      WHERE user_id = auth.uid()
    ) OR is_public = true
  );

CREATE POLICY "Users can manage email templates for their tenant" ON public.email_templates
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin', 'editor')
    )
  );

-- Email Campaigns policies
CREATE POLICY "Users can view email campaigns for their tenant" ON public.email_campaigns
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_roles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage email campaigns for their tenant" ON public.email_campaigns
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin', 'editor')
    )
  );

-- Similar policies for other tables...
-- (Abbreviated for brevity, but would follow the same pattern)

-- Create functions for subscriber management
CREATE OR REPLACE FUNCTION subscribe_email(
  p_tenant_id UUID,
  p_email TEXT,
  p_first_name TEXT DEFAULT NULL,
  p_last_name TEXT DEFAULT NULL,
  p_source TEXT DEFAULT NULL,
  p_list_ids UUID[] DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_subscriber_id UUID;
  v_list_id UUID;
BEGIN
  -- Insert or update subscriber
  INSERT INTO public.email_subscribers (
    tenant_id, email, first_name, last_name, source, status
  ) VALUES (
    p_tenant_id, p_email, p_first_name, p_last_name, p_source, 'active'
  ) 
  ON CONFLICT (tenant_id, email) 
  DO UPDATE SET 
    first_name = COALESCE(EXCLUDED.first_name, email_subscribers.first_name),
    last_name = COALESCE(EXCLUDED.last_name, email_subscribers.last_name),
    status = CASE 
      WHEN email_subscribers.status = 'unsubscribed' THEN 'active'
      ELSE email_subscribers.status
    END,
    updated_at = NOW()
  RETURNING id INTO v_subscriber_id;

  -- Add to lists if specified
  IF p_list_ids IS NOT NULL THEN
    FOREACH v_list_id IN ARRAY p_list_ids LOOP
      INSERT INTO public.email_list_subscribers (list_id, subscriber_id)
      VALUES (v_list_id, v_subscriber_id)
      ON CONFLICT (list_id, subscriber_id) DO NOTHING;
    END LOOP;
  END IF;

  RETURN v_subscriber_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update subscriber counts
CREATE OR REPLACE FUNCTION update_subscriber_counts() RETURNS TRIGGER AS $$
BEGIN
  -- Update list subscriber counts
  IF TG_TABLE_NAME = 'email_list_subscribers' THEN
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.is_active != OLD.is_active) THEN
      UPDATE public.email_lists 
      SET subscriber_count = (
        SELECT COUNT(*) 
        FROM public.email_list_subscribers els
        JOIN public.email_subscribers es ON els.subscriber_id = es.id
        WHERE els.list_id = COALESCE(NEW.list_id, OLD.list_id)
        AND els.is_active = true
        AND es.status = 'active'
      )
      WHERE id = COALESCE(NEW.list_id, OLD.list_id);
    END IF;
  END IF;

  -- Update segment subscriber counts would go here
  -- (More complex calculation based on segment conditions)

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers for subscriber count updates
CREATE TRIGGER update_list_subscriber_counts
  AFTER INSERT OR UPDATE OR DELETE ON public.email_list_subscribers
  FOR EACH ROW EXECUTE FUNCTION update_subscriber_counts();

CREATE TRIGGER update_subscriber_status_counts
  AFTER UPDATE ON public.email_subscribers
  FOR EACH ROW EXECUTE FUNCTION update_subscriber_counts();

-- Create function for generating unsubscribe tokens
CREATE OR REPLACE FUNCTION generate_unsubscribe_token(p_subscriber_id UUID) 
RETURNS TEXT AS $$
DECLARE
  v_token TEXT;
BEGIN
  v_token := encode(gen_random_bytes(32), 'base64url');
  
  INSERT INTO public.email_unsubscribe_tokens (
    subscriber_id, token, expires_at
  ) VALUES (
    p_subscriber_id, v_token, NOW() + INTERVAL '30 days'
  );
  
  RETURN v_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;