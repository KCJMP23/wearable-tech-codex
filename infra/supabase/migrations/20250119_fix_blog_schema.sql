-- Fix blog post schema and create missing tables/views

-- Create post_products table for product associations
CREATE TABLE IF NOT EXISTS public.post_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, product_id)
);

-- Create post_metadata table
CREATE TABLE IF NOT EXISTS public.post_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  meta_key TEXT NOT NULL,
  meta_value TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, meta_key)
);

-- Create taxonomy table for categories
CREATE TABLE IF NOT EXISTS public.taxonomy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('category', 'tag', 'collection')),
  parent_id UUID REFERENCES public.taxonomy(id) ON DELETE SET NULL,
  description TEXT,
  image_url TEXT,
  meta JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, slug, type)
);

-- Create post_taxonomy table for post categorization
CREATE TABLE IF NOT EXISTS public.post_taxonomy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  taxonomy_id UUID NOT NULL REFERENCES public.taxonomy(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, taxonomy_id)
);

-- Create user_roles table (needed for RLS policies)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, tenant_id)
);

-- Create newsletters table
CREATE TABLE IF NOT EXISTS public.newsletters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sent', 'failed')),
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create newsletter_subscribers table
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'unsubscribed', 'bounced')),
  subscribed_at TIMESTAMPTZ DEFAULT NOW(),
  unsubscribed_at TIMESTAMPTZ,
  UNIQUE(tenant_id, email)
);

-- Create trends table
CREATE TABLE IF NOT EXISTS public.trends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  trend_score DECIMAL(5,2),
  volume INT,
  category TEXT,
  source TEXT,
  data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create collections table
CREATE TABLE IF NOT EXISTS public.collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  featured BOOLEAN DEFAULT false,
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, slug)
);

-- Create collection_products table
CREATE TABLE IF NOT EXISTS public.collection_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(collection_id, product_id)
);

-- Add missing columns to posts table if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'posts' 
                AND column_name = 'excerpt') THEN
    ALTER TABLE public.posts ADD COLUMN excerpt TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'posts' 
                AND column_name = 'featured_image') THEN
    ALTER TABLE public.posts ADD COLUMN featured_image TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'posts' 
                AND column_name = 'meta_title') THEN
    ALTER TABLE public.posts ADD COLUMN meta_title TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'posts' 
                AND column_name = 'meta_description') THEN
    ALTER TABLE public.posts ADD COLUMN meta_description TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'posts' 
                AND column_name = 'status') THEN
    ALTER TABLE public.posts ADD COLUMN status TEXT DEFAULT 'published' 
      CHECK (status IN ('draft', 'published', 'archived'));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'posts' 
                AND column_name = 'author_id') THEN
    ALTER TABLE public.posts ADD COLUMN author_id UUID;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'posts' 
                AND column_name = 'view_count') THEN
    ALTER TABLE public.posts ADD COLUMN view_count INT DEFAULT 0;
  END IF;
END $$;

-- Add missing columns to products table
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'products' 
                AND column_name = 'description') THEN
    ALTER TABLE public.products ADD COLUMN description TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'products' 
                AND column_name = 'price') THEN
    ALTER TABLE public.products ADD COLUMN price DECIMAL(10,2);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'products' 
                AND column_name = 'rating') THEN
    ALTER TABLE public.products ADD COLUMN rating DECIMAL(3,2);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'products' 
                AND column_name = 'image_url') THEN
    ALTER TABLE public.products ADD COLUMN image_url TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'products' 
                AND column_name = 'affiliate_url') THEN
    ALTER TABLE public.products ADD COLUMN affiliate_url TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'products' 
                AND column_name = 'category') THEN
    ALTER TABLE public.products ADD COLUMN category TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'products' 
                AND column_name = 'brand') THEN
    ALTER TABLE public.products ADD COLUMN brand TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'products' 
                AND column_name = 'features') THEN
    ALTER TABLE public.products ADD COLUMN features JSONB DEFAULT '[]'::jsonb;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'products' 
                AND column_name = 'is_active') THEN
    ALTER TABLE public.products ADD COLUMN is_active BOOLEAN DEFAULT true;
  END IF;
END $$;

-- Create post_products_view for easier querying
CREATE OR REPLACE VIEW public.post_products_view AS
SELECT 
  pp.id,
  pp.post_id,
  pp.product_id,
  pp.display_order,
  p.name as product_name,
  p.slug as product_slug,
  p.description as product_description,
  p.price as product_price,
  p.rating as product_rating,
  p.image_url as product_image,
  p.affiliate_url as product_affiliate_url,
  p.category as product_category,
  p.brand as product_brand,
  pp.created_at
FROM public.post_products pp
JOIN public.products p ON pp.product_id = p.id
WHERE p.is_active = true;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_posts_tenant_id ON public.posts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_posts_slug ON public.posts(slug);
CREATE INDEX IF NOT EXISTS idx_posts_status ON public.posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_published_at ON public.posts(published_at);

CREATE INDEX IF NOT EXISTS idx_products_tenant_id ON public.products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products(slug);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON public.products(is_active);

CREATE INDEX IF NOT EXISTS idx_post_products_post_id ON public.post_products(post_id);
CREATE INDEX IF NOT EXISTS idx_post_products_product_id ON public.post_products(product_id);

CREATE INDEX IF NOT EXISTS idx_taxonomy_tenant_id ON public.taxonomy(tenant_id);
CREATE INDEX IF NOT EXISTS idx_taxonomy_slug ON public.taxonomy(slug);
CREATE INDEX IF NOT EXISTS idx_taxonomy_type ON public.taxonomy(type);

CREATE INDEX IF NOT EXISTS idx_collections_tenant_id ON public.collections(tenant_id);
CREATE INDEX IF NOT EXISTS idx_collections_slug ON public.collections(slug);

-- Grant permissions to agents for content manipulation
-- This allows AI agents to read and rewrite content

-- Enable RLS on all tables
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.taxonomy ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trends ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for public read access
CREATE POLICY "Allow public read access to posts" ON public.posts
  FOR SELECT USING (status = 'published');

CREATE POLICY "Allow public read access to products" ON public.products
  FOR SELECT USING (is_active = true);

CREATE POLICY "Allow public read access to post_products" ON public.post_products
  FOR SELECT USING (true);

CREATE POLICY "Allow public read access to taxonomy" ON public.taxonomy
  FOR SELECT USING (is_active = true);

CREATE POLICY "Allow public read access to collections" ON public.collections
  FOR SELECT USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add update triggers
CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_taxonomy_updated_at BEFORE UPDATE ON public.taxonomy
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_collections_updated_at BEFORE UPDATE ON public.collections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();