-- Phase 1 – Tenant isolation policies for email subsystem
-- Ensures authenticated users only access data for tenants they belong to

-- Helper functions -----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.user_can_access_tenant(target_tenant UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tenant_members tm
    WHERE tm.tenant_id = target_tenant
      AND tm.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.user_can_manage_tenant(target_tenant UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tenant_members tm
    WHERE tm.tenant_id = target_tenant
      AND tm.user_id = auth.uid()
      AND tm.role IN ('admin', 'editor')
  );
$$;

-- Tenant membership table ---------------------------------------------------
ALTER TABLE public.tenant_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_members_service_role_all" ON public.tenant_members;
DROP POLICY IF EXISTS "tenant_members_self_select" ON public.tenant_members;

CREATE POLICY "tenant_members_service_role_all"
  ON public.tenant_members
  FOR ALL
  USING (is_service_role())
  WITH CHECK (is_service_role());

CREATE POLICY "tenant_members_self_select"
  ON public.tenant_members
  FOR SELECT
  USING (user_id = auth.uid());

-- Tenants table membership-aware select -------------------------------------
DROP POLICY IF EXISTS "tenants_member_select" ON public.tenants;
CREATE POLICY "tenants_member_select"
  ON public.tenants
  FOR SELECT
  USING (
    is_service_role() OR user_can_access_tenant(id)
  );

-- Email lists ----------------------------------------------------------------
ALTER TABLE public.email_lists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "email_lists_service_role_all" ON public.email_lists;
DROP POLICY IF EXISTS "email_lists_member_select" ON public.email_lists;
DROP POLICY IF EXISTS "email_lists_member_manage" ON public.email_lists;

CREATE POLICY "email_lists_service_role_all"
  ON public.email_lists
  FOR ALL
  USING (is_service_role())
  WITH CHECK (is_service_role());

CREATE POLICY "email_lists_member_select"
  ON public.email_lists
  FOR SELECT
  USING (user_can_access_tenant(tenant_id));

CREATE POLICY "email_lists_member_manage"
  ON public.email_lists
  FOR ALL
  USING (user_can_manage_tenant(tenant_id))
  WITH CHECK (user_can_manage_tenant(tenant_id));

-- Email subscribers ---------------------------------------------------------
ALTER TABLE public.email_subscribers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "email_subscribers_service_role_all" ON public.email_subscribers;
DROP POLICY IF EXISTS "email_subscribers_member_select" ON public.email_subscribers;
DROP POLICY IF EXISTS "email_subscribers_member_manage" ON public.email_subscribers;

CREATE POLICY "email_subscribers_service_role_all"
  ON public.email_subscribers
  FOR ALL
  USING (is_service_role())
  WITH CHECK (is_service_role());

CREATE POLICY "email_subscribers_member_select"
  ON public.email_subscribers
  FOR SELECT
  USING (user_can_access_tenant(tenant_id));

CREATE POLICY "email_subscribers_member_manage"
  ON public.email_subscribers
  FOR ALL
  USING (user_can_manage_tenant(tenant_id))
  WITH CHECK (user_can_manage_tenant(tenant_id));

-- Email list subscribers junction -------------------------------------------
ALTER TABLE public.email_list_subscribers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "email_list_subscribers_service_role_all" ON public.email_list_subscribers;
DROP POLICY IF EXISTS "email_list_subscribers_member_all" ON public.email_list_subscribers;

CREATE POLICY "email_list_subscribers_service_role_all"
  ON public.email_list_subscribers
  FOR ALL
  USING (is_service_role())
  WITH CHECK (is_service_role());

CREATE POLICY "email_list_subscribers_member_all"
  ON public.email_list_subscribers
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.email_lists el
      JOIN public.tenant_members tm ON tm.tenant_id = el.tenant_id
      WHERE el.id = email_list_subscribers.list_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('admin', 'editor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.email_lists el
      JOIN public.tenant_members tm ON tm.tenant_id = el.tenant_id
      WHERE el.id = email_list_subscribers.list_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('admin', 'editor')
    )
  );

-- Email templates -----------------------------------------------------------
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "email_templates_service_role_all" ON public.email_templates;
DROP POLICY IF EXISTS "email_templates_member_select" ON public.email_templates;
DROP POLICY IF EXISTS "email_templates_member_manage" ON public.email_templates;

CREATE POLICY "email_templates_service_role_all"
  ON public.email_templates
  FOR ALL
  USING (is_service_role())
  WITH CHECK (is_service_role());

CREATE POLICY "email_templates_member_select"
  ON public.email_templates
  FOR SELECT
  USING (
    user_can_access_tenant(tenant_id)
    OR is_public
  );

CREATE POLICY "email_templates_member_manage"
  ON public.email_templates
  FOR ALL
  USING (user_can_manage_tenant(tenant_id))
  WITH CHECK (user_can_manage_tenant(tenant_id));

-- Email campaigns -----------------------------------------------------------
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "email_campaigns_service_role_all" ON public.email_campaigns;
DROP POLICY IF EXISTS "email_campaigns_member_select" ON public.email_campaigns;
DROP POLICY IF EXISTS "email_campaigns_member_manage" ON public.email_campaigns;

CREATE POLICY "email_campaigns_service_role_all"
  ON public.email_campaigns
  FOR ALL
  USING (is_service_role())
  WITH CHECK (is_service_role());

CREATE POLICY "email_campaigns_member_select"
  ON public.email_campaigns
  FOR SELECT
  USING (user_can_access_tenant(tenant_id));

CREATE POLICY "email_campaigns_member_manage"
  ON public.email_campaigns
  FOR ALL
  USING (user_can_manage_tenant(tenant_id))
  WITH CHECK (user_can_manage_tenant(tenant_id));

-- Email segments -----------------------------------------------------------
ALTER TABLE public.email_segments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "email_segments_service_role_all" ON public.email_segments;
DROP POLICY IF EXISTS "email_segments_member_select" ON public.email_segments;
DROP POLICY IF EXISTS "email_segments_member_manage" ON public.email_segments;

CREATE POLICY "email_segments_service_role_all"
  ON public.email_segments
  FOR ALL
  USING (is_service_role())
  WITH CHECK (is_service_role());

CREATE POLICY "email_segments_member_select"
  ON public.email_segments
  FOR SELECT
  USING (user_can_access_tenant(tenant_id));

CREATE POLICY "email_segments_member_manage"
  ON public.email_segments
  FOR ALL
  USING (user_can_manage_tenant(tenant_id))
  WITH CHECK (user_can_manage_tenant(tenant_id));

-- Email analytics -----------------------------------------------------------
ALTER TABLE public.email_analytics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "email_analytics_service_role_all" ON public.email_analytics;
DROP POLICY IF EXISTS "email_analytics_member_select" ON public.email_analytics;

CREATE POLICY "email_analytics_service_role_all"
  ON public.email_analytics
  FOR ALL
  USING (is_service_role())
  WITH CHECK (is_service_role());

CREATE POLICY "email_analytics_member_select"
  ON public.email_analytics
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.email_campaigns ec
      JOIN public.tenant_members tm ON tm.tenant_id = ec.tenant_id
      WHERE ec.id = email_analytics.campaign_id
        AND tm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.email_automations ea
      JOIN public.tenant_members tm ON tm.tenant_id = ea.tenant_id
      WHERE ea.id = email_analytics.automation_id
        AND tm.user_id = auth.uid()
    )
  );

-- Email automations ---------------------------------------------------------
ALTER TABLE public.email_automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_automation_executions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "email_automations_service_role_all" ON public.email_automations;
DROP POLICY IF EXISTS "email_automations_member_select" ON public.email_automations;
DROP POLICY IF EXISTS "email_automations_member_manage" ON public.email_automations;

CREATE POLICY "email_automations_service_role_all"
  ON public.email_automations
  FOR ALL
  USING (is_service_role())
  WITH CHECK (is_service_role());

CREATE POLICY "email_automations_member_select"
  ON public.email_automations
  FOR SELECT
  USING (user_can_access_tenant(tenant_id));

CREATE POLICY "email_automations_member_manage"
  ON public.email_automations
  FOR ALL
  USING (user_can_manage_tenant(tenant_id))
  WITH CHECK (user_can_manage_tenant(tenant_id));

DROP POLICY IF EXISTS "email_automation_exec_service_role_all" ON public.email_automation_executions;
DROP POLICY IF EXISTS "email_automation_exec_member_select" ON public.email_automation_executions;

CREATE POLICY "email_automation_exec_service_role_all"
  ON public.email_automation_executions
  FOR ALL
  USING (is_service_role())
  WITH CHECK (is_service_role());

CREATE POLICY "email_automation_exec_member_select"
  ON public.email_automation_executions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.email_automations ea
      JOIN public.tenant_members tm ON tm.tenant_id = ea.tenant_id
      WHERE ea.id = email_automation_executions.automation_id
        AND tm.user_id = auth.uid()
    )
  );
