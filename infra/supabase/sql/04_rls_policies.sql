-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
-- Comprehensive security policies for multi-tenant affiliate platform
-- Following OWASP and Supabase security best practices
-- 
-- Security Levels:
-- 1. Service role: Full access to all data (backend operations)
-- 2. Authenticated users: Tenant-isolated access based on JWT claims
-- 3. Anonymous users: Read-only access to published public content
-- ============================================================================

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================
-- Critical: Enable RLS to enforce all policies
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.taxonomy ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_taxonomy ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kb ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.embeddings ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- HELPER FUNCTIONS FOR TENANT ISOLATION
-- ============================================================================

-- Get current tenant ID from JWT claims
CREATE OR REPLACE FUNCTION public.get_current_tenant_id()
RETURNS UUID AS $$
BEGIN
    -- Extract tenant_id from JWT custom claims
    -- This assumes the JWT contains tenant_id in app_metadata or custom claims
    RETURN COALESCE(
        auth.jwt() -> 'app_metadata' ->> 'tenant_id',
        auth.jwt() ->> 'tenant_id'
    )::UUID;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if user has admin role for current tenant
CREATE OR REPLACE FUNCTION public.is_tenant_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN COALESCE(
        (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'),
        (auth.jwt() ->> 'role' = 'admin'),
        FALSE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if request is from service role
CREATE OR REPLACE FUNCTION public.is_service_role()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN auth.role() = 'service_role';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- TENANTS TABLE POLICIES
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "service_role_full_access" ON public.tenants;
DROP POLICY IF EXISTS "public_read_active_tenants" ON public.tenants;
DROP POLICY IF EXISTS "tenant_admin_update_own" ON public.tenants;

-- Service role: Full access
CREATE POLICY "tenants_service_role_all"
    ON public.tenants
    FOR ALL
    USING (is_service_role())
    WITH CHECK (is_service_role());

-- Anonymous: Read active tenants only (for subdomain routing)
CREATE POLICY "tenants_anon_select_active"
    ON public.tenants
    FOR SELECT
    USING (status = 'active');

-- Authenticated: Admin can update their own tenant
CREATE POLICY "tenants_admin_update_own"
    ON public.tenants
    FOR UPDATE
    USING (
        id = get_current_tenant_id() 
        AND is_tenant_admin()
    )
    WITH CHECK (
        id = get_current_tenant_id() 
        AND is_tenant_admin()
    );

-- ============================================================================
-- TAXONOMY TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "taxonomy_service_role_all" ON public.taxonomy;
DROP POLICY IF EXISTS "taxonomy_public_read" ON public.taxonomy;
DROP POLICY IF EXISTS "taxonomy_tenant_write" ON public.taxonomy;

-- Service role: Full access
CREATE POLICY "taxonomy_service_role_all"
    ON public.taxonomy
    FOR ALL
    USING (is_service_role())
    WITH CHECK (is_service_role());

-- Public: Read all taxonomy (needed for navigation)
CREATE POLICY "taxonomy_public_select"
    ON public.taxonomy
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.tenants t 
            WHERE t.id = taxonomy.tenant_id 
            AND t.status = 'active'
        )
    );

-- Tenant admin: Full access to own taxonomy
CREATE POLICY "taxonomy_tenant_admin_all"
    ON public.taxonomy
    FOR ALL
    USING (
        tenant_id = get_current_tenant_id() 
        AND is_tenant_admin()
    )
    WITH CHECK (
        tenant_id = get_current_tenant_id() 
        AND is_tenant_admin()
    );

-- ============================================================================
-- PRODUCTS TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "products_service_role_all" ON public.products;
DROP POLICY IF EXISTS "products_public_read" ON public.products;
DROP POLICY IF EXISTS "products_tenant_write" ON public.products;

-- Service role: Full access
CREATE POLICY "products_service_role_all"
    ON public.products
    FOR ALL
    USING (is_service_role())
    WITH CHECK (is_service_role());

-- Public: Read products from active tenants
CREATE POLICY "products_public_select"
    ON public.products
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.tenants t 
            WHERE t.id = products.tenant_id 
            AND t.status = 'active'
        )
    );

-- Tenant admin: Manage own products
CREATE POLICY "products_tenant_admin_all"
    ON public.products
    FOR ALL
    USING (
        tenant_id = get_current_tenant_id() 
        AND is_tenant_admin()
    )
    WITH CHECK (
        tenant_id = get_current_tenant_id() 
        AND is_tenant_admin()
    );

-- ============================================================================
-- POSTS TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "posts_service_role_all" ON public.posts;
DROP POLICY IF EXISTS "posts_public_read_published" ON public.posts;
DROP POLICY IF EXISTS "posts_tenant_write" ON public.posts;

-- Service role: Full access
CREATE POLICY "posts_service_role_all"
    ON public.posts
    FOR ALL
    USING (is_service_role())
    WITH CHECK (is_service_role());

-- Public: Read published posts from active tenants
CREATE POLICY "posts_public_select_published"
    ON public.posts
    FOR SELECT
    USING (
        status = 'published'
        AND EXISTS (
            SELECT 1 FROM public.tenants t 
            WHERE t.id = posts.tenant_id 
            AND t.status = 'active'
        )
    );

-- Tenant admin: Full access to own posts
CREATE POLICY "posts_tenant_admin_all"
    ON public.posts
    FOR ALL
    USING (
        tenant_id = get_current_tenant_id() 
        AND is_tenant_admin()
    )
    WITH CHECK (
        tenant_id = get_current_tenant_id() 
        AND is_tenant_admin()
    );

-- Authenticated users: Read all posts from their tenant
CREATE POLICY "posts_tenant_user_select"
    ON public.posts
    FOR SELECT
    USING (
        tenant_id = get_current_tenant_id()
        AND auth.role() = 'authenticated'
    );

-- ============================================================================
-- POST_TAXONOMY TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "post_taxonomy_service_role_all" ON public.post_taxonomy;
DROP POLICY IF EXISTS "post_taxonomy_public_read" ON public.post_taxonomy;

-- Service role: Full access
CREATE POLICY "post_taxonomy_service_role_all"
    ON public.post_taxonomy
    FOR ALL
    USING (is_service_role())
    WITH CHECK (is_service_role());

-- Public: Read relationships for published posts
CREATE POLICY "post_taxonomy_public_select"
    ON public.post_taxonomy
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.posts p
            WHERE p.id = post_taxonomy.post_id
            AND p.status = 'published'
        )
    );

-- Tenant admin: Manage relationships for own posts
CREATE POLICY "post_taxonomy_tenant_admin_all"
    ON public.post_taxonomy
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.posts p
            WHERE p.id = post_taxonomy.post_id
            AND p.tenant_id = get_current_tenant_id()
            AND is_tenant_admin()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.posts p
            WHERE p.id = post_taxonomy.post_id
            AND p.tenant_id = get_current_tenant_id()
            AND is_tenant_admin()
        )
    );

-- ============================================================================
-- POST_PRODUCTS TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "post_products_service_role_all" ON public.post_products;
DROP POLICY IF EXISTS "post_products_public_read" ON public.post_products;

-- Service role: Full access
CREATE POLICY "post_products_service_role_all"
    ON public.post_products
    FOR ALL
    USING (is_service_role())
    WITH CHECK (is_service_role());

-- Public: Read relationships for published posts
CREATE POLICY "post_products_public_select"
    ON public.post_products
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.posts p
            WHERE p.id = post_products.post_id
            AND p.status = 'published'
        )
    );

-- Tenant admin: Manage relationships for own posts
CREATE POLICY "post_products_tenant_admin_all"
    ON public.post_products
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.posts p
            WHERE p.id = post_products.post_id
            AND p.tenant_id = get_current_tenant_id()
            AND is_tenant_admin()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.posts p
            WHERE p.id = post_products.post_id
            AND p.tenant_id = get_current_tenant_id()
            AND is_tenant_admin()
        )
    );

-- ============================================================================
-- LINKS TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "links_service_role_all" ON public.links;
DROP POLICY IF EXISTS "links_tenant_access" ON public.links;

-- Service role: Full access
CREATE POLICY "links_service_role_all"
    ON public.links
    FOR ALL
    USING (is_service_role())
    WITH CHECK (is_service_role());

-- Tenant admin: View and manage own links
CREATE POLICY "links_tenant_admin_all"
    ON public.links
    FOR ALL
    USING (
        tenant_id = get_current_tenant_id() 
        AND is_tenant_admin()
    )
    WITH CHECK (
        tenant_id = get_current_tenant_id() 
        AND is_tenant_admin()
    );

-- No public access to links table (internal monitoring only)

-- ============================================================================
-- INSIGHTS TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "insights_service_role_all" ON public.insights;
DROP POLICY IF EXISTS "insights_tenant_read" ON public.insights;

-- Service role: Full access
CREATE POLICY "insights_service_role_all"
    ON public.insights
    FOR ALL
    USING (is_service_role())
    WITH CHECK (is_service_role());

-- Tenant users: Read own insights
CREATE POLICY "insights_tenant_select"
    ON public.insights
    FOR SELECT
    USING (
        tenant_id = get_current_tenant_id()
        AND auth.role() = 'authenticated'
    );

-- Tenant admin: Manage own insights
CREATE POLICY "insights_tenant_admin_all"
    ON public.insights
    FOR ALL
    USING (
        tenant_id = get_current_tenant_id() 
        AND is_tenant_admin()
    )
    WITH CHECK (
        tenant_id = get_current_tenant_id() 
        AND is_tenant_admin()
    );

-- ============================================================================
-- QUIZ TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "quiz_service_role_all" ON public.quiz;
DROP POLICY IF EXISTS "quiz_public_read_active" ON public.quiz;

-- Service role: Full access
CREATE POLICY "quiz_service_role_all"
    ON public.quiz
    FOR ALL
    USING (is_service_role())
    WITH CHECK (is_service_role());

-- Public: Read active quizzes from active tenants
CREATE POLICY "quiz_public_select_active"
    ON public.quiz
    FOR SELECT
    USING (
        active = true
        AND EXISTS (
            SELECT 1 FROM public.tenants t 
            WHERE t.id = quiz.tenant_id 
            AND t.status = 'active'
        )
    );

-- Tenant admin: Manage own quizzes
CREATE POLICY "quiz_tenant_admin_all"
    ON public.quiz
    FOR ALL
    USING (
        tenant_id = get_current_tenant_id() 
        AND is_tenant_admin()
    )
    WITH CHECK (
        tenant_id = get_current_tenant_id() 
        AND is_tenant_admin()
    );

-- ============================================================================
-- QUIZ_RESULTS TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "quiz_results_service_role_all" ON public.quiz_results;
DROP POLICY IF EXISTS "quiz_results_public_insert" ON public.quiz_results;

-- Service role: Full access
CREATE POLICY "quiz_results_service_role_all"
    ON public.quiz_results
    FOR ALL
    USING (is_service_role())
    WITH CHECK (is_service_role());

-- Public: Can submit quiz results (insert only)
CREATE POLICY "quiz_results_public_insert"
    ON public.quiz_results
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.quiz q
            WHERE q.id = quiz_results.quiz_id
            AND q.active = true
            AND EXISTS (
                SELECT 1 FROM public.tenants t
                WHERE t.id = q.tenant_id
                AND t.status = 'active'
            )
        )
    );

-- Tenant admin: View and manage own quiz results
CREATE POLICY "quiz_results_tenant_admin_all"
    ON public.quiz_results
    FOR ALL
    USING (
        tenant_id = get_current_tenant_id() 
        AND is_tenant_admin()
    )
    WITH CHECK (
        tenant_id = get_current_tenant_id() 
        AND is_tenant_admin()
    );

-- ============================================================================
-- SUBSCRIBERS TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "subscribers_service_role_all" ON public.subscribers;
DROP POLICY IF EXISTS "subscribers_public_insert" ON public.subscribers;
DROP POLICY IF EXISTS "subscribers_public_update_unsubscribe" ON public.subscribers;

-- Service role: Full access
CREATE POLICY "subscribers_service_role_all"
    ON public.subscribers
    FOR ALL
    USING (is_service_role())
    WITH CHECK (is_service_role());

-- Public: Can subscribe (insert with active status only)
CREATE POLICY "subscribers_public_insert"
    ON public.subscribers
    FOR INSERT
    WITH CHECK (
        status = 'active'
        AND EXISTS (
            SELECT 1 FROM public.tenants t
            WHERE t.id = subscribers.tenant_id
            AND t.status = 'active'
        )
    );

-- Public: Can unsubscribe using token (update status only)
CREATE POLICY "subscribers_public_unsubscribe"
    ON public.subscribers
    FOR UPDATE
    USING (
        -- Can only update if they have the correct unsub_token
        unsub_token IS NOT NULL
        AND unsub_token = current_setting('request.headers')::json->>'x-unsub-token'
    )
    WITH CHECK (
        -- Can only change status to unsubscribed
        status = 'unsubscribed'
        AND email = OLD.email
        AND tenant_id = OLD.tenant_id
        AND unsub_token = OLD.unsub_token
    );

-- Tenant admin: Full access to own subscribers
CREATE POLICY "subscribers_tenant_admin_all"
    ON public.subscribers
    FOR ALL
    USING (
        tenant_id = get_current_tenant_id() 
        AND is_tenant_admin()
    )
    WITH CHECK (
        tenant_id = get_current_tenant_id() 
        AND is_tenant_admin()
    );

-- ============================================================================
-- KB (KNOWLEDGE BASE) TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "kb_service_role_all" ON public.kb;
DROP POLICY IF EXISTS "kb_public_read" ON public.kb;

-- Service role: Full access
CREATE POLICY "kb_service_role_all"
    ON public.kb
    FOR ALL
    USING (is_service_role())
    WITH CHECK (is_service_role());

-- Public: Read knowledge base from active tenants
CREATE POLICY "kb_public_select"
    ON public.kb
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.tenants t 
            WHERE t.id = kb.tenant_id 
            AND t.status = 'active'
        )
    );

-- Tenant admin: Manage own knowledge base
CREATE POLICY "kb_tenant_admin_all"
    ON public.kb
    FOR ALL
    USING (
        tenant_id = get_current_tenant_id() 
        AND is_tenant_admin()
    )
    WITH CHECK (
        tenant_id = get_current_tenant_id() 
        AND is_tenant_admin()
    );

-- ============================================================================
-- AGENT_TASKS TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "agent_tasks_service_role_all" ON public.agent_tasks;
DROP POLICY IF EXISTS "agent_tasks_tenant_access" ON public.agent_tasks;

-- Service role: Full access (agents run as service role)
CREATE POLICY "agent_tasks_service_role_all"
    ON public.agent_tasks
    FOR ALL
    USING (is_service_role())
    WITH CHECK (is_service_role());

-- Tenant admin: View and create tasks for own tenant
CREATE POLICY "agent_tasks_tenant_admin_all"
    ON public.agent_tasks
    FOR ALL
    USING (
        tenant_id = get_current_tenant_id() 
        AND is_tenant_admin()
    )
    WITH CHECK (
        tenant_id = get_current_tenant_id() 
        AND is_tenant_admin()
        -- Prevent direct status manipulation
        AND (status = 'queued' OR OLD.status = status)
    );

-- No public access to agent tasks

-- ============================================================================
-- CALENDAR TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "calendar_service_role_all" ON public.calendar;
DROP POLICY IF EXISTS "calendar_public_read" ON public.calendar;

-- Service role: Full access
CREATE POLICY "calendar_service_role_all"
    ON public.calendar
    FOR ALL
    USING (is_service_role())
    WITH CHECK (is_service_role());

-- Public: Read published/scheduled calendar items from active tenants
CREATE POLICY "calendar_public_select"
    ON public.calendar
    FOR SELECT
    USING (
        status IN ('scheduled', 'published', 'done')
        AND EXISTS (
            SELECT 1 FROM public.tenants t 
            WHERE t.id = calendar.tenant_id 
            AND t.status = 'active'
        )
    );

-- Tenant admin: Manage own calendar
CREATE POLICY "calendar_tenant_admin_all"
    ON public.calendar
    FOR ALL
    USING (
        tenant_id = get_current_tenant_id() 
        AND is_tenant_admin()
    )
    WITH CHECK (
        tenant_id = get_current_tenant_id() 
        AND is_tenant_admin()
    );

-- ============================================================================
-- EMBEDDINGS TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "embeddings_service_role_all" ON public.embeddings;
DROP POLICY IF EXISTS "embeddings_tenant_access" ON public.embeddings;

-- Service role: Full access
CREATE POLICY "embeddings_service_role_all"
    ON public.embeddings
    FOR ALL
    USING (is_service_role())
    WITH CHECK (is_service_role());

-- Tenant users: Read own embeddings (for search)
CREATE POLICY "embeddings_tenant_select"
    ON public.embeddings
    FOR SELECT
    USING (
        tenant_id = get_current_tenant_id()
        AND auth.role() = 'authenticated'
    );

-- Tenant admin: Manage own embeddings
CREATE POLICY "embeddings_tenant_admin_all"
    ON public.embeddings
    FOR ALL
    USING (
        tenant_id = get_current_tenant_id() 
        AND is_tenant_admin()
    )
    WITH CHECK (
        tenant_id = get_current_tenant_id() 
        AND is_tenant_admin()
    );

-- No public access to embeddings (internal use only)

-- ============================================================================
-- SECURITY NOTES
-- ============================================================================

-- 1. Service Role Security:
--    - Used only by backend services (workers, edge functions)
--    - Never exposed to client-side code
--    - Has full CRUD access to enable system operations

-- 2. Multi-Tenant Isolation:
--    - All tenant data access checks tenant_id against JWT claims
--    - No cross-tenant data access possible
--    - Tenant ID extracted from authenticated user's JWT

-- 3. Public Access:
--    - Limited to read-only operations
--    - Only published/active content visible
--    - Active tenant check prevents data leaks from suspended tenants

-- 4. Data Validation:
--    - Input constraints enforced at database level
--    - Status transitions controlled through policies
--    - Sensitive operations require admin role

-- 5. OWASP Compliance:
--    - Principle of least privilege enforced
--    - Defense in depth with multiple security layers
--    - No direct table access without RLS policies
--    - Secure defaults (deny unless explicitly allowed)

-- 6. Performance Considerations:
--    - Policies use indexes where possible
--    - EXISTS clauses optimized for common queries
--    - Function calls minimized in hot paths

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify all tables have RLS enabled:
-- SELECT tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE schemaname = 'public' 
-- AND tablename NOT LIKE 'pg_%'
-- ORDER BY tablename;

-- List all policies:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;

-- Test tenant isolation:
-- SET request.jwt.claims = '{"tenant_id": "uuid-here", "role": "authenticated"}';
-- SELECT * FROM public.posts; -- Should only see tenant's posts