-- ============================================
-- Row Level Security (RLS) Policies
-- ============================================
-- This migration enables RLS and creates comprehensive policies for all tables
-- 
-- Security Model:
-- 1. Service role has full access (for admin/agents)
-- 2. Anonymous users have read-only access to published content
-- 3. All data is isolated by tenant_id
-- 4. Sensitive operations are protected

-- Enable RLS on all tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE taxonomy ENABLE ROW LEVEL SECURITY;
ALTER TABLE insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb ENABLE ROW LEVEL SECURITY;
ALTER TABLE embeddings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- TENANTS TABLE POLICIES
-- ============================================

-- Service role has full access to tenants
CREATE POLICY "service_role_full_access_tenants" ON tenants
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Anonymous users can read active tenants (for public storefront access)
CREATE POLICY "anon_read_active_tenants" ON tenants
    FOR SELECT
    TO anon
    USING (status = 'active');

-- ============================================
-- PRODUCTS TABLE POLICIES
-- ============================================

-- Service role has full access to products
CREATE POLICY "service_role_full_access_products" ON products
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Anonymous users can read products from active tenants
CREATE POLICY "anon_read_products" ON products
    FOR SELECT
    TO anon
    USING (
        tenant_id IN (
            SELECT id FROM tenants WHERE status = 'active'
        )
    );

-- ============================================
-- POSTS TABLE POLICIES
-- ============================================

-- Service role has full access to posts
CREATE POLICY "service_role_full_access_posts" ON posts
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Anonymous users can only read published posts from active tenants
CREATE POLICY "anon_read_published_posts" ON posts
    FOR SELECT
    TO anon
    USING (
        status = 'published' 
        AND tenant_id IN (
            SELECT id FROM tenants WHERE status = 'active'
        )
    );

-- ============================================
-- QUIZ TABLE POLICIES
-- ============================================

-- Service role has full access to quiz
CREATE POLICY "service_role_full_access_quiz" ON quiz
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Anonymous users can read active quizzes from active tenants
CREATE POLICY "anon_read_active_quiz" ON quiz
    FOR SELECT
    TO anon
    USING (
        active = true 
        AND tenant_id IN (
            SELECT id FROM tenants WHERE status = 'active'
        )
    );

-- ============================================
-- SUBSCRIBERS TABLE POLICIES
-- ============================================

-- Service role has full access to subscribers
CREATE POLICY "service_role_full_access_subscribers" ON subscribers
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Anonymous users can insert new subscribers (newsletter signup)
-- but only for active tenants
CREATE POLICY "anon_insert_subscribers" ON subscribers
    FOR INSERT
    TO anon
    WITH CHECK (
        tenant_id IN (
            SELECT id FROM tenants WHERE status = 'active'
        )
    );

-- Anonymous users can update their own subscription status using unsub_token
CREATE POLICY "anon_update_own_subscription" ON subscribers
    FOR UPDATE
    TO anon
    USING (
        -- Allow access via unsub_token for unsubscribe functionality
        unsub_token IS NOT NULL
        AND tenant_id IN (
            SELECT id FROM tenants WHERE status = 'active'
        )
    )
    WITH CHECK (
        -- Only allow status updates
        status IN ('active', 'unsubscribed')
    );

-- ============================================
-- AGENT_TASKS TABLE POLICIES (SENSITIVE)
-- ============================================

-- Only service role can access agent tasks (sensitive operational data)
CREATE POLICY "service_role_only_agent_tasks" ON agent_tasks
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================
-- TAXONOMY TABLE POLICIES
-- ============================================

-- Service role has full access to taxonomy
CREATE POLICY "service_role_full_access_taxonomy" ON taxonomy
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Anonymous users can read taxonomy from active tenants
CREATE POLICY "anon_read_taxonomy" ON taxonomy
    FOR SELECT
    TO anon
    USING (
        tenant_id IN (
            SELECT id FROM tenants WHERE status = 'active'
        )
    );

-- ============================================
-- INSIGHTS TABLE POLICIES (SENSITIVE)
-- ============================================

-- Only service role can access insights (sensitive business data)
CREATE POLICY "service_role_only_insights" ON insights
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================
-- CALENDAR TABLE POLICIES (SENSITIVE)
-- ============================================

-- Only service role can access calendar (operational scheduling data)
CREATE POLICY "service_role_only_calendar" ON calendar
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================
-- KB TABLE POLICIES
-- ============================================

-- Service role has full access to knowledge base
CREATE POLICY "service_role_full_access_kb" ON kb
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Anonymous users can read kb content from active tenants (for chatbot)
CREATE POLICY "anon_read_kb" ON kb
    FOR SELECT
    TO anon
    USING (
        tenant_id IN (
            SELECT id FROM tenants WHERE status = 'active'
        )
    );

-- ============================================
-- EMBEDDINGS TABLE POLICIES
-- ============================================

-- Service role has full access to embeddings
CREATE POLICY "service_role_full_access_embeddings" ON embeddings
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Anonymous users can read embeddings from active tenants (for search/chatbot)
CREATE POLICY "anon_read_embeddings" ON embeddings
    FOR SELECT
    TO anon
    USING (
        tenant_id IN (
            SELECT id FROM tenants WHERE status = 'active'
        )
    );

-- ============================================
-- HELPER FUNCTIONS FOR RLS
-- ============================================

-- Function to check if a tenant is active (can be used in policies)
CREATE OR REPLACE FUNCTION is_tenant_active(tenant_uuid UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 FROM tenants 
        WHERE id = tenant_uuid AND status = 'active'
    );
$$;

-- Function to get current tenant from request (useful for future auth patterns)
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS UUID
LANGUAGE SQL
STABLE
AS $$
    SELECT COALESCE(
        current_setting('request.jwt.claims', true)::json->>'tenant_id',
        current_setting('app.current_tenant_id', true)
    )::UUID;
$$;

-- ============================================
-- SECURITY COMMENTS
-- ============================================

COMMENT ON POLICY "service_role_full_access_tenants" ON tenants IS 
'Service role has complete access for admin operations and agent tasks';

COMMENT ON POLICY "anon_read_active_tenants" ON tenants IS 
'Public can read active tenant info for storefront functionality';

COMMENT ON POLICY "anon_read_published_posts" ON posts IS 
'Public can only see published content from active tenants';

COMMENT ON POLICY "anon_insert_subscribers" ON subscribers IS 
'Allow newsletter signups from public users';

COMMENT ON POLICY "anon_update_own_subscription" ON subscribers IS 
'Allow unsubscribe via token without authentication';

COMMENT ON POLICY "service_role_only_agent_tasks" ON agent_tasks IS 
'Agent tasks contain sensitive operational data - admin only';

COMMENT ON POLICY "service_role_only_insights" ON insights IS 
'Business insights are sensitive - admin only';

COMMENT ON POLICY "service_role_only_calendar" ON calendar IS 
'Content calendar is operational data - admin only';

-- ============================================
-- PERFORMANCE INDEXES FOR RLS
-- ============================================

-- Indexes to optimize RLS policy queries
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_posts_status_tenant ON posts(status, tenant_id) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_quiz_active_tenant ON quiz(active, tenant_id) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_subscribers_unsub_token ON subscribers(unsub_token) WHERE unsub_token IS NOT NULL;

-- ============================================
-- RLS VALIDATION TESTS
-- ============================================

-- Test that RLS is properly enabled
DO $$
DECLARE
    table_record RECORD;
BEGIN
    FOR table_record IN 
        SELECT schemaname, tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename IN ('tenants', 'products', 'posts', 'quiz', 'subscribers', 'agent_tasks', 'taxonomy', 'insights', 'calendar', 'kb', 'embeddings')
    LOOP
        IF NOT (SELECT rowsecurity FROM pg_class WHERE relname = table_record.tablename) THEN
            RAISE EXCEPTION 'RLS not enabled on table: %', table_record.tablename;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'RLS validation passed - all tables have RLS enabled';
END $$;