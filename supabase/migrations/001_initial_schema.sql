-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create tenants table
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    domain VARCHAR(255),
    config JSONB DEFAULT '{}',
    amazon_tag VARCHAR(100),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create products table
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    asin VARCHAR(20) NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    price INTEGER,
    original_price INTEGER,
    currency VARCHAR(3) DEFAULT 'USD',
    rating DECIMAL(2,1),
    review_count INTEGER,
    category VARCHAR(255),
    subcategory VARCHAR(255),
    brand VARCHAR(255),
    images JSONB DEFAULT '[]',
    features TEXT[],
    affiliate_url TEXT,
    in_stock BOOLEAN DEFAULT true,
    is_prime BOOLEAN DEFAULT false,
    last_verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, asin)
);

-- Create posts table
CREATE TABLE IF NOT EXISTS posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    type VARCHAR(50) DEFAULT 'evergreen',
    title TEXT NOT NULL,
    slug VARCHAR(255) NOT NULL,
    excerpt TEXT,
    body_mdx TEXT,
    images JSONB DEFAULT '[]',
    status VARCHAR(20) DEFAULT 'draft',
    published_at TIMESTAMP WITH TIME ZONE,
    seo JSONB DEFAULT '{}',
    jsonld JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, slug)
);

-- Create insights table
CREATE TABLE IF NOT EXISTS insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    type VARCHAR(50),
    source VARCHAR(50),
    headline TEXT,
    body TEXT,
    kpi VARCHAR(100),
    value TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create agent_tasks table
CREATE TABLE IF NOT EXISTS agent_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    input JSONB DEFAULT '{}',
    output JSONB,
    error TEXT,
    attempts INTEGER DEFAULT 0,
    scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create webhook_logs table
CREATE TABLE IF NOT EXISTS webhook_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    webhook_type VARCHAR(50),
    payload JSONB,
    response JSONB,
    error TEXT,
    status VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Phase 2: Proprietary Affiliate Network Tables

-- Create brands table for direct partnerships
CREATE TABLE IF NOT EXISTS brands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    logo_url TEXT,
    website_url TEXT,
    commission_rate DECIMAL(5,2), -- Base commission rate
    exclusive_rate DECIMAL(5,2), -- Exclusive partner rate
    contact_email VARCHAR(255),
    api_endpoint TEXT,
    api_key_encrypted TEXT,
    status VARCHAR(20) DEFAULT 'pending', -- pending, active, suspended
    tier VARCHAR(20) DEFAULT 'standard', -- standard, premium, exclusive
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create brand_partnerships table
CREATE TABLE IF NOT EXISTS brand_partnerships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    commission_rate DECIMAL(5,2), -- Negotiated rate for this tenant
    status VARCHAR(20) DEFAULT 'pending',
    contract_start_date DATE,
    contract_end_date DATE,
    exclusive BOOLEAN DEFAULT false,
    performance_bonus JSONB DEFAULT '{}', -- Bonus structure
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, brand_id)
);

-- Create private_marketplace table for exclusive products
CREATE TABLE IF NOT EXISTS private_marketplace (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    product_id VARCHAR(255) NOT NULL, -- Brand's internal product ID
    title TEXT NOT NULL,
    description TEXT,
    price INTEGER NOT NULL,
    original_price INTEGER,
    currency VARCHAR(3) DEFAULT 'USD',
    images JSONB DEFAULT '[]',
    features TEXT[],
    category VARCHAR(255),
    commission_rate DECIMAL(5,2),
    exclusive BOOLEAN DEFAULT true,
    stock_quantity INTEGER,
    availability_start TIMESTAMP WITH TIME ZONE,
    availability_end TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(brand_id, product_id)
);

-- Create blockchain_transactions table for attribution
CREATE TABLE IF NOT EXISTS blockchain_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    transaction_hash VARCHAR(66) UNIQUE, -- Ethereum tx hash
    transaction_type VARCHAR(50) NOT NULL, -- click, conversion, commission, reward
    user_wallet VARCHAR(42), -- Ethereum wallet address
    amount_wei BIGINT, -- Amount in wei
    token_address VARCHAR(42), -- Token contract address
    product_id UUID,
    click_id UUID,
    conversion_id UUID,
    metadata JSONB DEFAULT '{}',
    block_number BIGINT,
    gas_used INTEGER,
    gas_price BIGINT,
    status VARCHAR(20) DEFAULT 'pending', -- pending, confirmed, failed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    confirmed_at TIMESTAMP WITH TIME ZONE
);

-- Create user_rewards table for loyalty program
CREATE TABLE IF NOT EXISTS user_rewards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_identifier VARCHAR(255) NOT NULL, -- email, wallet address, or user ID
    reward_type VARCHAR(50) NOT NULL, -- points, tokens, cashback
    amount DECIMAL(18,8) NOT NULL,
    source VARCHAR(100), -- purchase, referral, engagement
    reference_id UUID, -- Reference to transaction/action
    status VARCHAR(20) DEFAULT 'pending', -- pending, distributed, expired
    expires_at TIMESTAMP WITH TIME ZONE,
    distributed_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tenant_settings table for mobile notifications and other settings
CREATE TABLE IF NOT EXISTS tenant_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    setting_key VARCHAR(100) NOT NULL,
    setting_value JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, setting_key)
);

-- Phase 2: API Economy Tables

-- Create developer_profiles table
CREATE TABLE IF NOT EXISTS developer_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID, -- Reference to auth users if using Supabase Auth
    name VARCHAR(255) NOT NULL,
    company VARCHAR(255),
    email VARCHAR(255) NOT NULL,
    website VARCHAR(255),
    bio TEXT,
    avatar_url TEXT,
    verified BOOLEAN DEFAULT false,
    tier VARCHAR(20) DEFAULT 'free', -- free, pro, enterprise
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create developer_apps table
CREATE TABLE IF NOT EXISTS developer_apps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    developer_id UUID NOT NULL REFERENCES developer_profiles(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100), -- integration, analytics, content, automation
    api_key VARCHAR(100) NOT NULL UNIQUE,
    secret_key_hash VARCHAR(64) NOT NULL,
    webhook_url TEXT,
    webhook_secret VARCHAR(64),
    permissions TEXT[] DEFAULT '{}', -- read:products, write:content, etc.
    pricing_model VARCHAR(50) DEFAULT 'free', -- free, usage, subscription
    pricing_details JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'pending_review', -- pending_review, approved, suspended
    installs_count INTEGER DEFAULT 0,
    rating DECIMAL(2,1),
    rating_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create app_installations table
CREATE TABLE IF NOT EXISTS app_installations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    app_id UUID NOT NULL REFERENCES developer_apps(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'active', -- active, suspended, uninstalled
    config JSONB DEFAULT '{}',
    installed_by UUID, -- user who installed
    installed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used_at TIMESTAMP WITH TIME ZONE,
    usage_stats JSONB DEFAULT '{}',
    UNIQUE(tenant_id, app_id)
);

-- Create api_usage_logs table
CREATE TABLE IF NOT EXISTS api_usage_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    app_id UUID NOT NULL REFERENCES developer_apps(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    status_code INTEGER NOT NULL,
    response_time_ms INTEGER,
    request_size_bytes INTEGER,
    response_size_bytes INTEGER,
    user_agent TEXT,
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create webhooks table
CREATE TABLE IF NOT EXISTS webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    app_id UUID REFERENCES developer_apps(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    secret VARCHAR(64),
    events TEXT[] NOT NULL, -- tenant.created, content.published, etc.
    active BOOLEAN DEFAULT true,
    retry_count INTEGER DEFAULT 3,
    timeout_seconds INTEGER DEFAULT 30,
    headers JSONB DEFAULT '{}',
    last_triggered_at TIMESTAMP WITH TIME ZONE,
    last_status INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_products_tenant ON products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_asin ON products(asin);
CREATE INDEX IF NOT EXISTS idx_posts_tenant ON posts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug);
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_tenant ON agent_tasks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_status ON agent_tasks(status);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_scheduled ON agent_tasks(scheduled_for);

-- Phase 2 indexes
CREATE INDEX IF NOT EXISTS idx_brands_slug ON brands(slug);
CREATE INDEX IF NOT EXISTS idx_brands_status ON brands(status);
CREATE INDEX IF NOT EXISTS idx_brand_partnerships_tenant ON brand_partnerships(tenant_id);
CREATE INDEX IF NOT EXISTS idx_brand_partnerships_brand ON brand_partnerships(brand_id);
CREATE INDEX IF NOT EXISTS idx_private_marketplace_brand ON private_marketplace(brand_id);
CREATE INDEX IF NOT EXISTS idx_private_marketplace_category ON private_marketplace(category);
CREATE INDEX IF NOT EXISTS idx_blockchain_transactions_tenant ON blockchain_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_blockchain_transactions_hash ON blockchain_transactions(transaction_hash);
CREATE INDEX IF NOT EXISTS idx_user_rewards_tenant ON user_rewards(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_rewards_user ON user_rewards(user_identifier);
CREATE INDEX IF NOT EXISTS idx_tenant_settings_tenant ON tenant_settings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_settings_key ON tenant_settings(setting_key);

-- API Economy indexes
CREATE INDEX IF NOT EXISTS idx_developer_profiles_email ON developer_profiles(email);
CREATE INDEX IF NOT EXISTS idx_developer_apps_developer ON developer_apps(developer_id);
CREATE INDEX IF NOT EXISTS idx_developer_apps_api_key ON developer_apps(api_key);
CREATE INDEX IF NOT EXISTS idx_developer_apps_status ON developer_apps(status);
CREATE INDEX IF NOT EXISTS idx_app_installations_tenant ON app_installations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_app_installations_app ON app_installations(app_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_app ON api_usage_logs(app_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_created ON api_usage_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_webhooks_tenant ON webhooks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_app ON webhooks(app_id);