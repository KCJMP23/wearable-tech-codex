-- Add missing columns to posts table
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS body_html TEXT,
ADD COLUMN IF NOT EXISTS seo_title VARCHAR(255),
ADD COLUMN IF NOT EXISTS seo_description TEXT,
ADD COLUMN IF NOT EXISTS seo_keywords TEXT[],
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Update existing posts table structure
UPDATE posts SET metadata = '{}' WHERE metadata IS NULL;

-- Create post_products junction table
CREATE TABLE IF NOT EXISTS post_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(post_id, product_id)
);

-- Add missing indexes
CREATE INDEX IF NOT EXISTS idx_post_products_post ON post_products(post_id);
CREATE INDEX IF NOT EXISTS idx_post_products_product ON post_products(product_id);
CREATE INDEX IF NOT EXISTS idx_posts_published ON posts(published_at);
CREATE INDEX IF NOT EXISTS idx_posts_type ON posts(type);

-- Update products table to match our script
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS name VARCHAR(255),
ADD COLUMN IF NOT EXISTS amazon_url TEXT;

-- Update existing products to have name from title if needed
UPDATE products SET name = title WHERE name IS NULL;