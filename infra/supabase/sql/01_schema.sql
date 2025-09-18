-- Main database schema for affiliate-factory platform
-- Multi-tenant wearable tech affiliate platform with AI agents

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Tenant status types
CREATE TYPE tenant_status AS ENUM ('active', 'inactive', 'suspended');

-- Taxonomy hierarchy types
CREATE TYPE taxonomy_kind AS ENUM ('vertical', 'horizontal');

-- Post content types
CREATE TYPE post_type AS ENUM ('howto', 'listicle', 'answer', 'review', 'roundup', 'alternative', 'evergreen');

-- Content publishing status
CREATE TYPE content_status AS ENUM ('draft', 'scheduled', 'published', 'archived');

-- Link target types for tracking
CREATE TYPE link_target_type AS ENUM ('product', 'post', 'outbound');

-- Subscriber status types
CREATE TYPE subscriber_status AS ENUM ('active', 'unsubscribed', 'bounced');

-- Knowledge base content types
CREATE TYPE kb_kind AS ENUM ('doc', 'faq', 'policy', 'guide');

-- Agent task status
CREATE TYPE task_status AS ENUM ('queued', 'running', 'done', 'error');

-- Calendar item types
CREATE TYPE calendar_item_type AS ENUM ('post', 'newsletter', 'social', 'agent');

-- Calendar item status
CREATE TYPE calendar_status AS ENUM ('planned', 'scheduled', 'published', 'done', 'blocked');

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Tenants: Multi-tenant root table
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    domain TEXT NOT NULL UNIQUE,
    theme JSONB DEFAULT '{}'::jsonb,
    logo_url TEXT,
    color_tokens JSONB DEFAULT '{}'::jsonb,
    status tenant_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Constraints
    CONSTRAINT tenants_slug_format CHECK (slug ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?$'),
    CONSTRAINT tenants_domain_format CHECK (domain ~ '^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$')
);

-- Taxonomy: Hierarchical categorization using ltree
CREATE TABLE IF NOT EXISTS public.taxonomy (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    kind taxonomy_kind NOT NULL,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    parent_id UUID REFERENCES public.taxonomy(id) ON DELETE CASCADE,
    path LTREE,
    meta JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Constraints
    CONSTRAINT taxonomy_slug_format CHECK (slug ~ '^[a-z0-9]([a-z0-9_-]*[a-z0-9])?$'),
    CONSTRAINT taxonomy_no_self_reference CHECK (id != parent_id)
);

-- Products: Amazon and other affiliate products
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    asin TEXT NOT NULL,
    title TEXT NOT NULL,
    brand TEXT,
    images JSONB DEFAULT '[]'::jsonb,
    features JSONB DEFAULT '[]'::jsonb,
    rating NUMERIC(3,2) CHECK (rating >= 0 AND rating <= 5),
    review_count INTEGER CHECK (review_count >= 0),
    price_snapshot TEXT,
    currency TEXT DEFAULT 'USD',
    category TEXT,
    subcategory TEXT,
    device_type TEXT,
    compatibility JSONB DEFAULT '{}'::jsonb,
    regulatory_notes TEXT,
    health_metrics TEXT[] DEFAULT array[]::text[],
    battery_life_hours NUMERIC CHECK (battery_life_hours >= 0),
    water_resistance TEXT,
    affiliate_url TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'amazon',
    last_verified_at TIMESTAMPTZ,
    raw JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Constraints
    CONSTRAINT products_asin_format CHECK (asin ~ '^[A-Z0-9]{10}$'),
    CONSTRAINT products_currency_format CHECK (currency ~ '^[A-Z]{3}$'),
    CONSTRAINT products_affiliate_url_not_empty CHECK (length(trim(affiliate_url)) > 0)
);

-- Posts: Blog content with MDX support
CREATE TABLE IF NOT EXISTS public.posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    type post_type NOT NULL,
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    excerpt TEXT,
    body_mdx TEXT,
    images JSONB DEFAULT '[]'::jsonb,
    status content_status NOT NULL DEFAULT 'draft',
    published_at TIMESTAMPTZ,
    seo JSONB DEFAULT '{}'::jsonb,
    jsonld JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Constraints
    CONSTRAINT posts_slug_format CHECK (slug ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?$'),
    CONSTRAINT posts_published_at_check CHECK (
        (status = 'published' AND published_at IS NOT NULL) OR 
        (status != 'published')
    )
);

-- ============================================================================
-- RELATIONSHIP TABLES
-- ============================================================================

-- Post to taxonomy many-to-many relationship
CREATE TABLE IF NOT EXISTS public.post_taxonomy (
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    taxonomy_id UUID NOT NULL REFERENCES public.taxonomy(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    PRIMARY KEY (post_id, taxonomy_id)
);

-- Post to products many-to-many relationship with ordering
CREATE TABLE IF NOT EXISTS public.post_products (
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    PRIMARY KEY (post_id, product_id)
);

-- ============================================================================
-- TRACKING AND MONITORING
-- ============================================================================

-- Links: Track affiliate and internal links
CREATE TABLE IF NOT EXISTS public.links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    target_url TEXT NOT NULL,
    target_type link_target_type NOT NULL,
    status_code INTEGER,
    ok BOOLEAN DEFAULT true,
    checked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Constraints
    CONSTRAINT links_status_code_valid CHECK (status_code IS NULL OR (status_code >= 100 AND status_code < 600))
);

-- Insights: Analytics and KPI tracking
CREATE TABLE IF NOT EXISTS public.insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    kpi TEXT NOT NULL,
    value NUMERIC NOT NULL,
    window TEXT NOT NULL,
    meta JSONB DEFAULT '{}'::jsonb,
    computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Constraints
    CONSTRAINT insights_kpi_not_empty CHECK (length(trim(kpi)) > 0),
    CONSTRAINT insights_window_not_empty CHECK (length(trim(window)) > 0)
);

-- ============================================================================
-- USER ENGAGEMENT
-- ============================================================================

-- Quiz: Interactive product recommendation quizzes
CREATE TABLE IF NOT EXISTS public.quiz (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    schema JSONB NOT NULL,
    active BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Constraints
    CONSTRAINT quiz_title_not_empty CHECK (length(trim(title)) > 0)
);

-- Quiz results: Store user quiz responses and recommendations
CREATE TABLE IF NOT EXISTS public.quiz_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    quiz_id UUID REFERENCES public.quiz(id) ON DELETE SET NULL,
    answers JSONB NOT NULL,
    segments TEXT[] DEFAULT array[]::text[],
    recommended_product_ids UUID[] DEFAULT array[]::uuid[],
    email TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Constraints
    CONSTRAINT quiz_results_email_format CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Subscribers: Newsletter and email list management
CREATE TABLE IF NOT EXISTS public.subscribers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    status subscriber_status NOT NULL DEFAULT 'active',
    source TEXT,
    unsub_token TEXT DEFAULT encode(gen_random_bytes(16), 'hex'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Constraints
    CONSTRAINT subscribers_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT subscribers_unsub_token_length CHECK (length(unsub_token) = 32),
    
    -- Unique constraint
    UNIQUE (tenant_id, email)
);

-- ============================================================================
-- CONTENT MANAGEMENT
-- ============================================================================

-- Knowledge base: Documentation, FAQs, policies
CREATE TABLE IF NOT EXISTS public.kb (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    kind kb_kind NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Constraints
    CONSTRAINT kb_title_not_empty CHECK (length(trim(title)) > 0),
    CONSTRAINT kb_content_not_empty CHECK (length(trim(content)) > 0)
);

-- ============================================================================
-- AGENT SYSTEM
-- ============================================================================

-- Agent tasks: Queue for AI agent processing
CREATE TABLE IF NOT EXISTS public.agent_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    agent TEXT NOT NULL,
    input JSONB NOT NULL DEFAULT '{}'::jsonb,
    status task_status NOT NULL DEFAULT 'queued',
    result JSONB,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT agent_tasks_agent_not_empty CHECK (length(trim(agent)) > 0),
    CONSTRAINT agent_tasks_timing_check CHECK (
        (started_at IS NULL OR started_at >= created_at) AND
        (completed_at IS NULL OR completed_at >= created_at) AND
        (completed_at IS NULL OR started_at IS NOT NULL)
    )
);

-- Calendar: Content scheduling and planning
CREATE TABLE IF NOT EXISTS public.calendar (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    item_type calendar_item_type NOT NULL,
    ref_id UUID,
    title TEXT NOT NULL,
    status calendar_status NOT NULL DEFAULT 'planned',
    run_at TIMESTAMPTZ NOT NULL,
    meta JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Constraints
    CONSTRAINT calendar_title_not_empty CHECK (length(trim(title)) > 0)
);

-- ============================================================================
-- VECTOR EMBEDDINGS
-- ============================================================================

-- Embeddings: Vector storage for RAG and semantic search
CREATE TABLE IF NOT EXISTS public.embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    ref_table TEXT NOT NULL,
    ref_id UUID NOT NULL,
    content TEXT NOT NULL,
    embedding VECTOR(3072) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Constraints
    CONSTRAINT embeddings_ref_table_valid CHECK (ref_table IN ('posts', 'products', 'kb')),
    CONSTRAINT embeddings_content_not_empty CHECK (length(trim(content)) > 0)
);

-- ============================================================================
-- VIEWS
-- ============================================================================

-- Insights view for admin dashboard
CREATE OR REPLACE VIEW public.insights_view AS
SELECT
    id,
    tenant_id,
    kpi,
    value,
    window,
    meta ->> 'headline' AS headline,
    meta ->> 'body' AS body,
    (meta -> 'action') ->> 'label' AS action_label,
    meta -> 'action' AS action_payload,
    computed_at
FROM public.insights;

-- Post products view with ordering
CREATE OR REPLACE VIEW public.post_products_view AS
SELECT
    pp.post_id,
    pp.position,
    prod.*
FROM public.post_products pp
JOIN public.products prod ON prod.id = pp.product_id
ORDER BY pp.post_id, pp.position;

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Get posts by taxonomy slug
CREATE OR REPLACE FUNCTION public.get_posts_by_taxonomy(tenant_uuid UUID, taxonomy_slug TEXT)
RETURNS SETOF public.posts AS $$
BEGIN
    RETURN QUERY
    SELECT p.*
    FROM public.posts p
    JOIN public.post_taxonomy pt ON pt.post_id = p.id
    JOIN public.taxonomy t ON t.id = pt.taxonomy_id
    WHERE p.tenant_id = tenant_uuid
        AND t.slug = taxonomy_slug
        AND p.status = 'published'
    ORDER BY p.published_at DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql STABLE;

-- Get embedding sources for RAG system
CREATE OR REPLACE FUNCTION public.get_embedding_sources()
RETURNS TABLE(tenant_id UUID, ref_table TEXT, ref_id UUID, title TEXT, content TEXT) AS $$
    SELECT tenant_id, 'posts'::text AS ref_table, id AS ref_id, title, COALESCE(body_mdx, '') AS content
    FROM public.posts
    WHERE status = 'published'
    UNION ALL
    SELECT tenant_id, 'products', id, title, COALESCE(raw::text, '')
    FROM public.products
    UNION ALL
    SELECT tenant_id, 'kb', id, title, content
    FROM public.kb;
$$ LANGUAGE sql STABLE;

-- Search function using embeddings
CREATE OR REPLACE FUNCTION public.search_content(
    tenant_uuid UUID,
    query_embedding VECTOR(3072),
    match_threshold FLOAT DEFAULT 0.7,
    match_count INT DEFAULT 10
)
RETURNS TABLE(
    id UUID,
    ref_table TEXT,
    ref_id UUID,
    content TEXT,
    similarity FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        e.id,
        e.ref_table,
        e.ref_id,
        e.content,
        1 - (e.embedding <=> query_embedding) AS similarity
    FROM public.embeddings e
    WHERE e.tenant_id = tenant_uuid
        AND 1 - (e.embedding <=> query_embedding) > match_threshold
    ORDER BY e.embedding <=> query_embedding
    LIMIT match_count;
END;
$$ LANGUAGE plpgsql STABLE;