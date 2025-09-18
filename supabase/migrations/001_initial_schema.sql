-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgvector";
CREATE EXTENSION IF NOT EXISTS "ltree";

-- Create tenants table
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    domain TEXT UNIQUE,
    theme JSONB DEFAULT '{}',
    logo_url TEXT,
    color_tokens JSONB DEFAULT '{}',
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create products table
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    asin TEXT NOT NULL,
    title TEXT NOT NULL,
    brand TEXT,
    images JSONB DEFAULT '[]',
    features JSONB DEFAULT '[]',
    rating NUMERIC(3, 2),
    review_count INTEGER,
    price_snapshot TEXT,
    currency TEXT,
    category TEXT,
    subcategory TEXT,
    device_type TEXT,
    compatibility JSONB DEFAULT '{}',
    regulatory_notes TEXT,
    health_metrics TEXT[],
    battery_life_hours NUMERIC,
    water_resistance TEXT,
    affiliate_url TEXT,
    source TEXT DEFAULT 'amazon',
    last_verified_at TIMESTAMPTZ,
    raw JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create posts table
CREATE TABLE IF NOT EXISTS posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('howto', 'listicle', 'answer', 'review', 'roundup', 'alternative', 'evergreen')),
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    excerpt TEXT,
    body_mdx TEXT,
    images JSONB DEFAULT '[]',
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published')),
    published_at TIMESTAMPTZ,
    seo JSONB DEFAULT '{}',
    jsonld JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, slug)
);

-- Create quiz table
CREATE TABLE IF NOT EXISTS quiz (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    schema JSONB NOT NULL,
    active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create subscribers table
CREATE TABLE IF NOT EXISTS subscribers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'unsubscribed', 'bounced')),
    source TEXT,
    unsub_token TEXT UNIQUE DEFAULT gen_random_uuid()::TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, email)
);

-- Create agent_tasks table
CREATE TABLE IF NOT EXISTS agent_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    agent TEXT NOT NULL,
    input JSONB DEFAULT '{}',
    status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'done', 'error')),
    result JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Create taxonomy table
CREATE TABLE IF NOT EXISTS taxonomy (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    kind TEXT NOT NULL CHECK (kind IN ('vertical', 'horizontal')),
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    parent_id UUID REFERENCES taxonomy(id) ON DELETE CASCADE,
    path LTREE,
    meta JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, slug)
);

-- Create insights table
CREATE TABLE IF NOT EXISTS insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    kpi TEXT NOT NULL,
    value NUMERIC,
    window TEXT,
    meta JSONB DEFAULT '{}',
    computed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create calendar table
CREATE TABLE IF NOT EXISTS calendar (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    item_type TEXT NOT NULL CHECK (item_type IN ('post', 'newsletter', 'social', 'agent')),
    ref_id UUID,
    title TEXT NOT NULL,
    status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'scheduled', 'published', 'done', 'blocked')),
    run_at TIMESTAMPTZ NOT NULL,
    meta JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create kb table
CREATE TABLE IF NOT EXISTS kb (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    kind TEXT NOT NULL CHECK (kind IN ('doc', 'faq', 'policy', 'guide')),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create embeddings table
CREATE TABLE IF NOT EXISTS embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    ref_table TEXT NOT NULL,
    ref_id UUID NOT NULL,
    content TEXT NOT NULL,
    embedding vector(3072),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_tenant_id ON products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_posts_tenant_id ON posts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_published_at ON posts(published_at);
CREATE INDEX IF NOT EXISTS idx_taxonomy_tenant_id ON taxonomy(tenant_id);
CREATE INDEX IF NOT EXISTS idx_taxonomy_path ON taxonomy USING GIST(path);
CREATE INDEX IF NOT EXISTS idx_embeddings_tenant_id ON embeddings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_embedding ON embeddings USING ivfflat(embedding vector_cosine_ops);

-- Insert a sample tenant for testing
INSERT INTO tenants (name, slug, domain, theme, status)
VALUES ('Nectar & Heat', 'nectarheat', 'nectarheat.localhost:3006', 
        '{"tagline": "Wearables that balance energy and recovery"}', 'active')
ON CONFLICT (slug) DO NOTHING;

-- Insert sample products (for the sample tenant)
WITH tenant AS (SELECT id FROM tenants WHERE slug = 'nectarheat')
INSERT INTO products (tenant_id, asin, title, brand, rating, price_snapshot, category, device_type)
SELECT 
    tenant.id,
    'B0' || LPAD(generate_series::text, 6, '0'),
    'Smart Recovery Device ' || generate_series,
    CASE WHEN generate_series % 3 = 0 THEN 'TheraBrand' 
         WHEN generate_series % 3 = 1 THEN 'HeatTech' 
         ELSE 'RecoveryPro' END,
    4 + random(),
    '$' || (100 + random() * 400)::integer::text,
    'Wearable Technology',
    CASE WHEN generate_series % 3 = 0 THEN 'Heat Therapy' 
         WHEN generate_series % 3 = 1 THEN 'Recovery Device' 
         ELSE 'Smart Wearable' END
FROM tenant, generate_series(1, 6)
ON CONFLICT DO NOTHING;

-- Insert sample posts
WITH tenant AS (SELECT id FROM tenants WHERE slug = 'nectarheat')
INSERT INTO posts (tenant_id, type, title, slug, excerpt, status, published_at)
SELECT 
    tenant.id,
    CASE WHEN generate_series % 3 = 0 THEN 'review' 
         WHEN generate_series % 3 = 1 THEN 'howto' 
         ELSE 'listicle' END,
    'Blog Post Title ' || generate_series,
    'blog-post-' || generate_series,
    'This is an excerpt for blog post ' || generate_series,
    'published',
    NOW() - INTERVAL '1 day' * generate_series
FROM tenant, generate_series(1, 3)
ON CONFLICT DO NOTHING;