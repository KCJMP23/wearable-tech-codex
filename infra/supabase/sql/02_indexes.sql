-- Performance indexes for affiliate-factory platform
-- Optimized for multi-tenant queries and common access patterns

-- ============================================================================
-- TENANT-SCOPED INDEXES
-- ============================================================================

-- Taxonomy indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_taxonomy_tenant_id ON public.taxonomy(tenant_id);
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_taxonomy_tenant_slug ON public.taxonomy(tenant_id, slug);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_taxonomy_parent_id ON public.taxonomy(parent_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_taxonomy_path ON public.taxonomy USING GIST(path);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_taxonomy_kind ON public.taxonomy(kind);

-- Products indexes
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_products_tenant_asin ON public.products(tenant_id, asin);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_tenant_id ON public.products(tenant_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_brand ON public.products(brand);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_category ON public.products(category, subcategory);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_device_type ON public.products(device_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_rating ON public.products(rating DESC) WHERE rating IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_last_verified ON public.products(last_verified_at DESC NULLS LAST);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_health_metrics ON public.products USING GIN(health_metrics);

-- Posts indexes
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_tenant_slug ON public.posts(tenant_id, slug);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_tenant_id ON public.posts(tenant_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_status ON public.posts(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_published_at ON public.posts(published_at DESC NULLS LAST);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_type ON public.posts(type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_tenant_status_published ON public.posts(tenant_id, status, published_at DESC NULLS LAST);

-- ============================================================================
-- RELATIONSHIP TABLE INDEXES
-- ============================================================================

-- Post taxonomy relationships
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_post_taxonomy_post_id ON public.post_taxonomy(post_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_post_taxonomy_taxonomy_id ON public.post_taxonomy(taxonomy_id);

-- Post products relationships
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_post_products_post_id ON public.post_products(post_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_post_products_product_id ON public.post_products(product_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_post_products_position ON public.post_products(post_id, position);

-- ============================================================================
-- TRACKING AND MONITORING INDEXES
-- ============================================================================

-- Links indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_links_tenant_id ON public.links(tenant_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_links_target_type ON public.links(target_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_links_status_code ON public.links(status_code);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_links_ok ON public.links(ok);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_links_checked_at ON public.links(checked_at DESC NULLS LAST);

-- Insights indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_insights_tenant_id ON public.insights(tenant_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_insights_kpi ON public.insights(kpi);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_insights_window ON public.insights(window);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_insights_computed_at ON public.insights(computed_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_insights_tenant_kpi_window ON public.insights(tenant_id, kpi, window, computed_at DESC);

-- ============================================================================
-- USER ENGAGEMENT INDEXES
-- ============================================================================

-- Quiz indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quiz_tenant_id ON public.quiz(tenant_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quiz_active ON public.quiz(active);

-- Quiz results indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quiz_results_tenant_id ON public.quiz_results(tenant_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quiz_results_quiz_id ON public.quiz_results(quiz_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quiz_results_email ON public.quiz_results(email);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quiz_results_created_at ON public.quiz_results(created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quiz_results_segments ON public.quiz_results USING GIN(segments);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quiz_results_product_ids ON public.quiz_results USING GIN(recommended_product_ids);

-- Subscribers indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscribers_tenant_id ON public.subscribers(tenant_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscribers_status ON public.subscribers(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscribers_source ON public.subscribers(source);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscribers_created_at ON public.subscribers(created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscribers_unsub_token ON public.subscribers(unsub_token);

-- ============================================================================
-- CONTENT MANAGEMENT INDEXES
-- ============================================================================

-- Knowledge base indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_kb_tenant_id ON public.kb(tenant_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_kb_kind ON public.kb(kind);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_kb_updated_at ON public.kb(updated_at DESC);

-- Full-text search indexes for KB content
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_kb_title_search ON public.kb USING GIN(to_tsvector('english', title));
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_kb_content_search ON public.kb USING GIN(to_tsvector('english', content));

-- ============================================================================
-- AGENT SYSTEM INDEXES
-- ============================================================================

-- Agent tasks indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agent_tasks_tenant_status ON public.agent_tasks(tenant_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agent_tasks_agent ON public.agent_tasks(agent);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agent_tasks_status ON public.agent_tasks(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agent_tasks_created_at ON public.agent_tasks(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agent_tasks_completed_at ON public.agent_tasks(completed_at DESC NULLS LAST);

-- Calendar indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_calendar_tenant_id ON public.calendar(tenant_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_calendar_item_type ON public.calendar(item_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_calendar_ref_id ON public.calendar(ref_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_calendar_status ON public.calendar(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_calendar_run_at ON public.calendar(run_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_calendar_tenant_run_at ON public.calendar(tenant_id, run_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_calendar_tenant_status_run_at ON public.calendar(tenant_id, status, run_at);

-- ============================================================================
-- VECTOR EMBEDDINGS INDEXES
-- ============================================================================

-- Embeddings indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_embeddings_tenant_ref ON public.embeddings(tenant_id, ref_table, ref_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_embeddings_ref_table ON public.embeddings(ref_table);

-- Vector similarity index using IVFFlat for cosine distance
-- Lists parameter should be approximately sqrt(total_rows) but at least 10
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_embeddings_vector_cosine 
ON public.embeddings USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

-- Alternative vector index using HNSW (if available in your Supabase version)
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_embeddings_vector_hnsw 
-- ON public.embeddings USING hnsw (embedding vector_cosine_ops);

-- ============================================================================
-- FULL-TEXT SEARCH INDEXES
-- ============================================================================

-- Post content search
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_title_search ON public.posts USING GIN(to_tsvector('english', title));
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_content_search ON public.posts USING GIN(to_tsvector('english', COALESCE(body_mdx, '')));

-- Product search
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_title_search ON public.products USING GIN(to_tsvector('english', title));
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_brand_search ON public.products USING GIN(to_tsvector('english', COALESCE(brand, '')));

-- ============================================================================
-- COMPOSITE INDEXES FOR COMMON QUERIES
-- ============================================================================

-- Published posts by tenant with date ordering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_published_by_tenant 
ON public.posts(tenant_id, published_at DESC NULLS LAST) 
WHERE status = 'published';

-- Active subscribers by tenant
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscribers_active_by_tenant 
ON public.subscribers(tenant_id, created_at DESC) 
WHERE status = 'active';

-- Queued tasks by tenant for agent processing
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agent_tasks_queued_by_tenant 
ON public.agent_tasks(tenant_id, created_at) 
WHERE status = 'queued';

-- Upcoming calendar items by tenant
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_calendar_upcoming_by_tenant 
ON public.calendar(tenant_id, run_at) 
WHERE status IN ('planned', 'scheduled');

-- ============================================================================
-- TRIGRAM INDEXES FOR FUZZY SEARCH
-- ============================================================================

-- Enable fuzzy search on product titles and brands
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_title_trgm ON public.products USING GIN(title gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_brand_trgm ON public.products USING GIN(brand gin_trgm_ops);

-- Enable fuzzy search on post titles
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_title_trgm ON public.posts USING GIN(title gin_trgm_ops);

-- ============================================================================
-- PARTIAL INDEXES FOR OPTIMIZATION
-- ============================================================================

-- Index only on active tenants
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tenants_active 
ON public.tenants(created_at DESC) 
WHERE status = 'active';

-- Index only on verified products
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_verified 
ON public.products(tenant_id, last_verified_at DESC) 
WHERE last_verified_at IS NOT NULL;

-- Index only on broken links
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_links_broken 
ON public.links(tenant_id, checked_at DESC) 
WHERE ok = false;

-- Index only on recent insights (last 90 days)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_insights_recent 
ON public.insights(tenant_id, kpi, computed_at DESC) 
WHERE computed_at > now() - interval '90 days';