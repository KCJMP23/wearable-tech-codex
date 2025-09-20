-- =============================================================================
-- Affiliate Network Integration Tables
-- =============================================================================

-- Create affiliate_network_configs table
CREATE TABLE IF NOT EXISTS public.affiliate_network_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  network_type TEXT NOT NULL CHECK (network_type IN ('shareasale', 'cj', 'impact', 'rakuten', 'amazon')),
  name TEXT NOT NULL,
  authentication_type TEXT NOT NULL CHECK (authentication_type IN ('oauth', 'api_key', 'token', 'credentials')),
  credentials_encrypted TEXT NOT NULL, -- Encrypted JSON of credentials
  settings JSONB NOT NULL DEFAULT '{
    "autoSync": false,
    "syncInterval": 60,
    "enableWebhooks": false
  }'::jsonb,
  status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'error')),
  last_sync_at TIMESTAMPTZ,
  next_sync_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure unique network per tenant
  UNIQUE(tenant_id, network_type)
);

-- Create indexes for affiliate_network_configs
CREATE INDEX idx_affiliate_network_configs_tenant ON public.affiliate_network_configs(tenant_id);
CREATE INDEX idx_affiliate_network_configs_network_type ON public.affiliate_network_configs(network_type);
CREATE INDEX idx_affiliate_network_configs_status ON public.affiliate_network_configs(status);
CREATE INDEX idx_affiliate_network_configs_next_sync ON public.affiliate_network_configs(next_sync_at) WHERE next_sync_at IS NOT NULL;

-- Create affiliate_products table
CREATE TABLE IF NOT EXISTS public.affiliate_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  network_type TEXT NOT NULL CHECK (network_type IN ('shareasale', 'cj', 'impact', 'rakuten', 'amazon')),
  network_product_id TEXT NOT NULL,
  merchant_id TEXT NOT NULL,
  merchant_name TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  brand TEXT,
  category TEXT NOT NULL,
  subcategory TEXT,
  sku TEXT,
  upc TEXT,
  images JSONB NOT NULL DEFAULT '[]'::jsonb,
  price JSONB NOT NULL DEFAULT '{
    "amount": 0,
    "currency": "USD"
  }'::jsonb,
  commission_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
  commission_type TEXT NOT NULL DEFAULT 'percentage' CHECK (commission_type IN ('percentage', 'fixed', 'tiered')),
  affiliate_url TEXT NOT NULL,
  tracking_url TEXT NOT NULL,
  deep_link TEXT,
  availability JSONB NOT NULL DEFAULT '{
    "inStock": true,
    "stockStatus": "active"
  }'::jsonb,
  specifications JSONB DEFAULT '[]'::jsonb,
  ratings JSONB,
  tags TEXT[] DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure unique product per network and tenant
  UNIQUE(tenant_id, network_type, network_product_id)
);

-- Create indexes for affiliate_products
CREATE INDEX idx_affiliate_products_tenant ON public.affiliate_products(tenant_id);
CREATE INDEX idx_affiliate_products_network_type ON public.affiliate_products(network_type);
CREATE INDEX idx_affiliate_products_merchant ON public.affiliate_products(merchant_id);
CREATE INDEX idx_affiliate_products_category ON public.affiliate_products(category);
CREATE INDEX idx_affiliate_products_brand ON public.affiliate_products(brand) WHERE brand IS NOT NULL;
CREATE INDEX idx_affiliate_products_active ON public.affiliate_products(is_active);
CREATE INDEX idx_affiliate_products_price ON public.affiliate_products USING GIN ((price->'amount'));
CREATE INDEX idx_affiliate_products_commission ON public.affiliate_products(commission_rate);
CREATE INDEX idx_affiliate_products_tags ON public.affiliate_products USING GIN (tags);
CREATE INDEX idx_affiliate_products_updated ON public.affiliate_products(last_updated_at);

-- Create full-text search index for products
CREATE INDEX idx_affiliate_products_search ON public.affiliate_products 
USING GIN (to_tsvector('english', title || ' ' || description || ' ' || coalesce(brand, '')));

-- Create affiliate_clicks table
CREATE TABLE IF NOT EXISTS public.affiliate_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  network_type TEXT NOT NULL CHECK (network_type IN ('shareasale', 'cj', 'impact', 'rakuten', 'amazon')),
  network_click_id TEXT,
  product_id UUID REFERENCES public.affiliate_products(id) ON DELETE SET NULL,
  affiliate_url TEXT NOT NULL,
  referrer_url TEXT,
  user_agent TEXT,
  ip_address INET,
  device_type TEXT CHECK (device_type IN ('desktop', 'mobile', 'tablet')),
  clicked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  converted BOOLEAN DEFAULT false,
  conversion_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for affiliate_clicks
CREATE INDEX idx_affiliate_clicks_tenant ON public.affiliate_clicks(tenant_id);
CREATE INDEX idx_affiliate_clicks_network_type ON public.affiliate_clicks(network_type);
CREATE INDEX idx_affiliate_clicks_product ON public.affiliate_clicks(product_id) WHERE product_id IS NOT NULL;
CREATE INDEX idx_affiliate_clicks_clicked_at ON public.affiliate_clicks(clicked_at);
CREATE INDEX idx_affiliate_clicks_converted ON public.affiliate_clicks(converted);
CREATE INDEX idx_affiliate_clicks_device_type ON public.affiliate_clicks(device_type) WHERE device_type IS NOT NULL;

-- Create affiliate_conversions table
CREATE TABLE IF NOT EXISTS public.affiliate_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  network_type TEXT NOT NULL CHECK (network_type IN ('shareasale', 'cj', 'impact', 'rakuten', 'amazon')),
  network_conversion_id TEXT NOT NULL,
  click_id UUID REFERENCES public.affiliate_clicks(id) ON DELETE SET NULL,
  order_id TEXT NOT NULL,
  customer_id TEXT,
  product_id UUID REFERENCES public.affiliate_products(id) ON DELETE SET NULL,
  merchant_id TEXT NOT NULL,
  order_value DECIMAL(10,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  commission_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  commission_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'reversed')),
  conversion_date TIMESTAMPTZ NOT NULL,
  payout_date TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure unique conversion per network and tenant
  UNIQUE(tenant_id, network_type, network_conversion_id)
);

-- Create indexes for affiliate_conversions
CREATE INDEX idx_affiliate_conversions_tenant ON public.affiliate_conversions(tenant_id);
CREATE INDEX idx_affiliate_conversions_network_type ON public.affiliate_conversions(network_type);
CREATE INDEX idx_affiliate_conversions_click ON public.affiliate_conversions(click_id) WHERE click_id IS NOT NULL;
CREATE INDEX idx_affiliate_conversions_product ON public.affiliate_conversions(product_id) WHERE product_id IS NOT NULL;
CREATE INDEX idx_affiliate_conversions_merchant ON public.affiliate_conversions(merchant_id);
CREATE INDEX idx_affiliate_conversions_status ON public.affiliate_conversions(status);
CREATE INDEX idx_affiliate_conversions_conversion_date ON public.affiliate_conversions(conversion_date);
CREATE INDEX idx_affiliate_conversions_payout_date ON public.affiliate_conversions(payout_date) WHERE payout_date IS NOT NULL;
CREATE INDEX idx_affiliate_conversions_order_value ON public.affiliate_conversions(order_value);
CREATE INDEX idx_affiliate_conversions_commission ON public.affiliate_conversions(commission_amount);

-- Create affiliate_sync_operations table
CREATE TABLE IF NOT EXISTS public.affiliate_sync_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  network_type TEXT NOT NULL CHECK (network_type IN ('shareasale', 'cj', 'impact', 'rakuten', 'amazon')),
  operation_type TEXT NOT NULL CHECK (operation_type IN ('full_sync', 'incremental_sync', 'product_update', 'commission_sync')),
  status TEXT NOT NULL DEFAULT 'syncing' CHECK (status IN ('idle', 'syncing', 'completed', 'error')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  records_processed INTEGER DEFAULT 0,
  records_succeeded INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  error_details JSONB DEFAULT '[]'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for affiliate_sync_operations
CREATE INDEX idx_affiliate_sync_operations_tenant ON public.affiliate_sync_operations(tenant_id);
CREATE INDEX idx_affiliate_sync_operations_network_type ON public.affiliate_sync_operations(network_type);
CREATE INDEX idx_affiliate_sync_operations_status ON public.affiliate_sync_operations(status);
CREATE INDEX idx_affiliate_sync_operations_started_at ON public.affiliate_sync_operations(started_at);
CREATE INDEX idx_affiliate_sync_operations_completed_at ON public.affiliate_sync_operations(completed_at) WHERE completed_at IS NOT NULL;

-- Create commission_structures table
CREATE TABLE IF NOT EXISTS public.commission_structures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  network_type TEXT NOT NULL CHECK (network_type IN ('shareasale', 'cj', 'impact', 'rakuten', 'amazon')),
  merchant_id TEXT NOT NULL,
  merchant_name TEXT NOT NULL,
  base_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
  commission_type TEXT NOT NULL DEFAULT 'percentage' CHECK (commission_type IN ('percentage', 'fixed', 'tiered')),
  tiers JSONB DEFAULT '[]'::jsonb,
  bonuses JSONB DEFAULT '[]'::jsonb,
  conditions JSONB DEFAULT '[]'::jsonb,
  effective_date TIMESTAMPTZ NOT NULL,
  expiration_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure unique commission structure per merchant and tenant
  UNIQUE(tenant_id, network_type, merchant_id, effective_date)
);

-- Create indexes for commission_structures
CREATE INDEX idx_commission_structures_tenant ON public.commission_structures(tenant_id);
CREATE INDEX idx_commission_structures_network_type ON public.commission_structures(network_type);
CREATE INDEX idx_commission_structures_merchant ON public.commission_structures(merchant_id);
CREATE INDEX idx_commission_structures_effective_date ON public.commission_structures(effective_date);
CREATE INDEX idx_commission_structures_expiration_date ON public.commission_structures(expiration_date) WHERE expiration_date IS NOT NULL;

-- =============================================================================
-- Row Level Security (RLS) Policies
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE public.affiliate_network_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_sync_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_structures ENABLE ROW LEVEL SECURITY;

-- Create policies for affiliate_network_configs
CREATE POLICY "Users can view their tenant's affiliate network configs"
  ON public.affiliate_network_configs FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.user_tenants WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage their tenant's affiliate network configs"
  ON public.affiliate_network_configs FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.user_tenants WHERE user_id = auth.uid()));

-- Create policies for affiliate_products
CREATE POLICY "Users can view their tenant's affiliate products"
  ON public.affiliate_products FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.user_tenants WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage their tenant's affiliate products"
  ON public.affiliate_products FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.user_tenants WHERE user_id = auth.uid()));

-- Create policies for affiliate_clicks
CREATE POLICY "Users can view their tenant's affiliate clicks"
  ON public.affiliate_clicks FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.user_tenants WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage their tenant's affiliate clicks"
  ON public.affiliate_clicks FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.user_tenants WHERE user_id = auth.uid()));

-- Create policies for affiliate_conversions
CREATE POLICY "Users can view their tenant's affiliate conversions"
  ON public.affiliate_conversions FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.user_tenants WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage their tenant's affiliate conversions"
  ON public.affiliate_conversions FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.user_tenants WHERE user_id = auth.uid()));

-- Create policies for affiliate_sync_operations
CREATE POLICY "Users can view their tenant's sync operations"
  ON public.affiliate_sync_operations FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.user_tenants WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage their tenant's sync operations"
  ON public.affiliate_sync_operations FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.user_tenants WHERE user_id = auth.uid()));

-- Create policies for commission_structures
CREATE POLICY "Users can view their tenant's commission structures"
  ON public.commission_structures FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.user_tenants WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage their tenant's commission structures"
  ON public.commission_structures FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.user_tenants WHERE user_id = auth.uid()));

-- =============================================================================
-- Triggers for updated_at columns
-- =============================================================================

-- Create updated_at triggers
CREATE TRIGGER update_affiliate_network_configs_updated_at
  BEFORE UPDATE ON public.affiliate_network_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_affiliate_products_updated_at
  BEFORE UPDATE ON public.affiliate_products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_affiliate_conversions_updated_at
  BEFORE UPDATE ON public.affiliate_conversions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_commission_structures_updated_at
  BEFORE UPDATE ON public.commission_structures
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- Views for Analytics and Reporting
-- =============================================================================

-- Create view for affiliate performance analytics
CREATE OR REPLACE VIEW public.affiliate_performance_summary AS
SELECT 
  t.slug AS tenant_slug,
  anc.network_type,
  anc.name AS network_name,
  COUNT(DISTINCT ap.id) AS total_products,
  COUNT(DISTINCT ac.id) AS total_clicks,
  COUNT(DISTINCT acv.id) AS total_conversions,
  COALESCE(SUM(acv.order_value), 0) AS total_order_value,
  COALESCE(SUM(acv.commission_amount), 0) AS total_commission,
  CASE 
    WHEN COUNT(DISTINCT ac.id) > 0 
    THEN (COUNT(DISTINCT acv.id)::DECIMAL / COUNT(DISTINCT ac.id) * 100)
    ELSE 0 
  END AS conversion_rate,
  CASE 
    WHEN COUNT(DISTINCT acv.id) > 0 
    THEN (SUM(acv.order_value) / COUNT(DISTINCT acv.id))
    ELSE 0 
  END AS avg_order_value,
  anc.last_sync_at,
  anc.status AS network_status
FROM public.tenants t
LEFT JOIN public.affiliate_network_configs anc ON t.id = anc.tenant_id
LEFT JOIN public.affiliate_products ap ON anc.tenant_id = ap.tenant_id AND anc.network_type = ap.network_type
LEFT JOIN public.affiliate_clicks ac ON anc.tenant_id = ac.tenant_id AND anc.network_type = ac.network_type
LEFT JOIN public.affiliate_conversions acv ON anc.tenant_id = acv.tenant_id AND anc.network_type = acv.network_type
WHERE anc.id IS NOT NULL
GROUP BY t.slug, anc.network_type, anc.name, anc.last_sync_at, anc.status;

-- Create view for product performance
CREATE OR REPLACE VIEW public.affiliate_product_performance AS
SELECT 
  ap.id,
  ap.tenant_id,
  ap.network_type,
  ap.network_product_id,
  ap.title,
  ap.brand,
  ap.category,
  ap.merchant_name,
  (ap.price->>'amount')::DECIMAL AS price,
  ap.commission_rate,
  COUNT(DISTINCT ac.id) AS clicks,
  COUNT(DISTINCT acv.id) AS conversions,
  COALESCE(SUM(acv.order_value), 0) AS revenue,
  COALESCE(SUM(acv.commission_amount), 0) AS commission_earned,
  CASE 
    WHEN COUNT(DISTINCT ac.id) > 0 
    THEN (COUNT(DISTINCT acv.id)::DECIMAL / COUNT(DISTINCT ac.id) * 100)
    ELSE 0 
  END AS conversion_rate,
  ap.last_updated_at,
  ap.is_active
FROM public.affiliate_products ap
LEFT JOIN public.affiliate_clicks ac ON ap.id = ac.product_id
LEFT JOIN public.affiliate_conversions acv ON ap.id = acv.product_id
GROUP BY ap.id, ap.tenant_id, ap.network_type, ap.network_product_id, 
         ap.title, ap.brand, ap.category, ap.merchant_name, 
         ap.price, ap.commission_rate, ap.last_updated_at, ap.is_active;

-- =============================================================================
-- Functions for Sync Management
-- =============================================================================

-- Function to schedule next sync for a network configuration
CREATE OR REPLACE FUNCTION schedule_next_sync(config_id UUID)
RETURNS TIMESTAMPTZ AS $$
DECLARE
  sync_interval INTEGER;
  next_sync TIMESTAMPTZ;
BEGIN
  -- Get sync interval from configuration
  SELECT (settings->>'syncInterval')::INTEGER INTO sync_interval
  FROM public.affiliate_network_configs
  WHERE id = config_id AND status = 'active';
  
  IF sync_interval IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Calculate next sync time
  next_sync := NOW() + (sync_interval || ' minutes')::INTERVAL;
  
  -- Update the configuration
  UPDATE public.affiliate_network_configs
  SET next_sync_at = next_sync,
      updated_at = NOW()
  WHERE id = config_id;
  
  RETURN next_sync;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get networks ready for sync
CREATE OR REPLACE FUNCTION get_networks_ready_for_sync()
RETURNS TABLE(
  id UUID,
  tenant_id UUID,
  network_type TEXT,
  name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT anc.id, anc.tenant_id, anc.network_type, anc.name
  FROM public.affiliate_network_configs anc
  WHERE anc.status = 'active'
    AND (anc.settings->>'autoSync')::BOOLEAN = true
    AND (anc.next_sync_at IS NULL OR anc.next_sync_at <= NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update product from affiliate network data
CREATE OR REPLACE FUNCTION upsert_affiliate_product(
  p_tenant_id UUID,
  p_network_type TEXT,
  p_network_product_id TEXT,
  p_product_data JSONB
)
RETURNS UUID AS $$
DECLARE
  product_id UUID;
BEGIN
  INSERT INTO public.affiliate_products (
    tenant_id,
    network_type,
    network_product_id,
    merchant_id,
    merchant_name,
    title,
    description,
    brand,
    category,
    subcategory,
    sku,
    upc,
    images,
    price,
    commission_rate,
    commission_type,
    affiliate_url,
    tracking_url,
    deep_link,
    availability,
    specifications,
    ratings,
    tags,
    metadata,
    last_updated_at,
    is_active
  ) VALUES (
    p_tenant_id,
    p_network_type,
    p_network_product_id,
    p_product_data->>'merchantId',
    p_product_data->>'merchantName',
    p_product_data->>'title',
    COALESCE(p_product_data->>'description', ''),
    p_product_data->>'brand',
    p_product_data->>'category',
    p_product_data->>'subcategory',
    p_product_data->>'sku',
    p_product_data->>'upc',
    COALESCE(p_product_data->'images', '[]'::jsonb),
    p_product_data->'price',
    (p_product_data->>'commissionRate')::DECIMAL,
    COALESCE(p_product_data->>'commissionType', 'percentage'),
    p_product_data->>'affiliateUrl',
    p_product_data->>'trackingUrl',
    p_product_data->>'deepLink',
    COALESCE(p_product_data->'availability', '{"inStock": true, "stockStatus": "active"}'::jsonb),
    COALESCE(p_product_data->'specifications', '[]'::jsonb),
    p_product_data->'ratings',
    COALESCE(
      ARRAY(SELECT jsonb_array_elements_text(p_product_data->'tags')), 
      '{}'::TEXT[]
    ),
    COALESCE(p_product_data->'metadata', '{}'::jsonb),
    COALESCE(
      (p_product_data->>'lastUpdatedAt')::TIMESTAMPTZ,
      NOW()
    ),
    COALESCE((p_product_data->>'isActive')::BOOLEAN, true)
  )
  ON CONFLICT (tenant_id, network_type, network_product_id)
  DO UPDATE SET
    merchant_id = EXCLUDED.merchant_id,
    merchant_name = EXCLUDED.merchant_name,
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    brand = EXCLUDED.brand,
    category = EXCLUDED.category,
    subcategory = EXCLUDED.subcategory,
    sku = EXCLUDED.sku,
    upc = EXCLUDED.upc,
    images = EXCLUDED.images,
    price = EXCLUDED.price,
    commission_rate = EXCLUDED.commission_rate,
    commission_type = EXCLUDED.commission_type,
    affiliate_url = EXCLUDED.affiliate_url,
    tracking_url = EXCLUDED.tracking_url,
    deep_link = EXCLUDED.deep_link,
    availability = EXCLUDED.availability,
    specifications = EXCLUDED.specifications,
    ratings = EXCLUDED.ratings,
    tags = EXCLUDED.tags,
    metadata = EXCLUDED.metadata,
    last_updated_at = EXCLUDED.last_updated_at,
    is_active = EXCLUDED.is_active,
    updated_at = NOW()
  RETURNING id INTO product_id;
  
  RETURN product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;