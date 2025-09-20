-- =============================================================================
-- Sales Management System Database Migration
-- Comprehensive sales, order, commission, and customer management for multi-tenant affiliate platform
-- =============================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- ENUMS
-- =============================================================================

-- Order status workflow
CREATE TYPE order_status AS ENUM (
  'draft',           -- Order being built
  'pending',         -- Awaiting payment/processing
  'confirmed',       -- Payment confirmed, ready to fulfill
  'processing',      -- Being processed/packed
  'shipped',         -- Shipped to customer
  'delivered',       -- Delivered to customer
  'completed',       -- Transaction complete
  'cancelled',       -- Order cancelled
  'refunded',        -- Full refund issued
  'partially_refunded', -- Partial refund issued
  'disputed',        -- In dispute
  'failed'           -- Payment or processing failed
);

-- Order types
CREATE TYPE order_type AS ENUM (
  'affiliate',       -- Affiliate commission-based order
  'direct',          -- Direct sale
  'subscription',    -- Recurring subscription
  'bundle',          -- Product bundle
  'upgrade',         -- Product/service upgrade
  'refund'           -- Refund transaction
);

-- Payment status
CREATE TYPE payment_status AS ENUM (
  'pending',
  'processing', 
  'completed',
  'failed',
  'cancelled',
  'refunded',
  'partially_refunded',
  'disputed',
  'chargeback'
);

-- Payment methods
CREATE TYPE payment_method AS ENUM (
  'credit_card',
  'debit_card', 
  'paypal',
  'stripe',
  'bank_transfer',
  'crypto',
  'apple_pay',
  'google_pay',
  'klarna',
  'afterpay',
  'other'
);

-- Commission status
CREATE TYPE commission_status AS ENUM (
  'pending',         -- Commission earned but not yet validated
  'confirmed',       -- Commission confirmed and valid
  'paid',            -- Commission paid out
  'cancelled',       -- Commission cancelled (refund, etc.)
  'disputed',        -- Commission in dispute
  'on_hold',         -- Commission held for review
  'expired'          -- Commission expired unpaid
);

-- Commission types
CREATE TYPE commission_type AS ENUM (
  'percentage',      -- Percentage of order value
  'fixed',           -- Fixed amount per sale
  'tiered',          -- Tiered based on volume
  'recurring',       -- Recurring commission
  'bonus',           -- Bonus commission
  'override'         -- Management override commission
);

-- Shipping status
CREATE TYPE shipping_status AS ENUM (
  'pending',
  'preparing',
  'shipped',
  'in_transit',
  'out_for_delivery',
  'delivered',
  'failed_delivery',
  'returned',
  'lost'
);

-- Customer types
CREATE TYPE customer_type AS ENUM (
  'individual',      -- Individual consumer
  'business',        -- Business customer
  'affiliate',       -- Affiliate partner
  'influencer',      -- Influencer partner
  'employee',        -- Employee purchase
  'test'             -- Test customer
);

-- Transaction types for financial tracking
CREATE TYPE transaction_type AS ENUM (
  'sale',
  'refund',
  'commission_payout',
  'chargeback',
  'fee',
  'adjustment',
  'bonus'
);

-- =============================================================================
-- CORE CUSTOMER MANAGEMENT
-- =============================================================================

-- Customers table for comprehensive customer management
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- Customer identification
  customer_type customer_type NOT NULL DEFAULT 'individual',
  email TEXT NOT NULL,
  phone TEXT,
  external_id TEXT, -- ID from external system
  
  -- Personal/Business information
  first_name TEXT,
  last_name TEXT,
  company_name TEXT,
  tax_id TEXT, -- Business tax ID or SSN
  
  -- Preferences and settings
  marketing_consent BOOLEAN DEFAULT false,
  email_verified BOOLEAN DEFAULT false,
  phone_verified BOOLEAN DEFAULT false,
  preferred_language TEXT DEFAULT 'en',
  timezone TEXT DEFAULT 'UTC',
  currency TEXT DEFAULT 'USD',
  
  -- Customer metrics
  total_orders INTEGER DEFAULT 0,
  total_spent DECIMAL(12,2) DEFAULT 0,
  lifetime_value DECIMAL(12,2) DEFAULT 0,
  average_order_value DECIMAL(12,2) DEFAULT 0,
  last_order_at TIMESTAMPTZ,
  
  -- Customer status and segmentation
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blocked', 'deleted')),
  segment TEXT, -- VIP, regular, at-risk, etc.
  acquisition_source TEXT, -- How they found us
  acquisition_campaign TEXT,
  
  -- Metadata and notes
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT customers_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT customers_currency_format CHECK (currency ~ '^[A-Z]{3}$'),
  CONSTRAINT customers_total_spent_positive CHECK (total_spent >= 0),
  CONSTRAINT customers_total_orders_positive CHECK (total_orders >= 0)
);

-- Customer addresses for shipping and billing
CREATE TABLE IF NOT EXISTS public.customer_addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  
  -- Address type and details
  address_type TEXT NOT NULL CHECK (address_type IN ('billing', 'shipping', 'both')),
  is_default BOOLEAN DEFAULT false,
  
  -- Address fields
  first_name TEXT,
  last_name TEXT,
  company TEXT,
  address_line_1 TEXT NOT NULL,
  address_line_2 TEXT,
  city TEXT NOT NULL,
  state_province TEXT,
  postal_code TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'US',
  
  -- Contact information
  phone TEXT,
  delivery_instructions TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT customer_addresses_country_format CHECK (country ~ '^[A-Z]{2}$')
);

-- =============================================================================
-- ORDER MANAGEMENT
-- =============================================================================

-- Orders table - central order management
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  
  -- Order identification
  order_number TEXT NOT NULL, -- Human-readable order number
  order_type order_type NOT NULL DEFAULT 'direct',
  status order_status NOT NULL DEFAULT 'draft',
  
  -- Financial information
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  shipping_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  
  -- Affiliate tracking
  affiliate_id UUID, -- Reference to affiliate if applicable
  affiliate_click_id UUID, -- Track back to specific click
  affiliate_commission_rate DECIMAL(5,2), -- Commission rate for this order
  referrer_url TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_term TEXT,
  utm_content TEXT,
  
  -- Customer information snapshot
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  billing_address JSONB, -- Snapshot of billing address
  shipping_address JSONB, -- Snapshot of shipping address
  
  -- Order processing
  payment_method payment_method,
  payment_status payment_status DEFAULT 'pending',
  payment_reference TEXT, -- External payment reference
  shipping_method TEXT,
  shipping_tracking_number TEXT,
  estimated_delivery_date DATE,
  actual_delivery_date DATE,
  
  -- Discounts and promotions
  coupon_codes TEXT[] DEFAULT '{}',
  discount_codes TEXT[] DEFAULT '{}',
  promotional_campaign TEXT,
  
  -- Order metadata
  source_platform TEXT, -- web, mobile, api, etc.
  device_type TEXT,
  user_agent TEXT,
  ip_address INET,
  notes TEXT,
  internal_notes TEXT, -- Staff-only notes
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  
  -- Important timestamps
  ordered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMPTZ,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT orders_currency_format CHECK (currency ~ '^[A-Z]{3}$'),
  CONSTRAINT orders_amounts_positive CHECK (
    subtotal >= 0 AND 
    tax_amount >= 0 AND 
    shipping_amount >= 0 AND 
    discount_amount >= 0 AND 
    total_amount >= 0
  ),
  CONSTRAINT orders_commission_rate_valid CHECK (
    affiliate_commission_rate IS NULL OR 
    (affiliate_commission_rate >= 0 AND affiliate_commission_rate <= 100)
  ),
  CONSTRAINT orders_email_format CHECK (customer_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  
  -- Unique constraint on order number per tenant
  UNIQUE (tenant_id, order_number)
);

-- Order items - individual products in orders
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  
  -- Product information snapshot (in case product is deleted)
  product_sku TEXT,
  product_name TEXT NOT NULL,
  product_description TEXT,
  product_image_url TEXT,
  product_category TEXT,
  product_brand TEXT,
  
  -- Pricing and quantity
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(12,2) NOT NULL,
  total_price DECIMAL(12,2) NOT NULL,
  cost_price DECIMAL(12,2), -- Cost for profit calculation
  
  -- Item-specific affiliate tracking
  affiliate_commission_rate DECIMAL(5,2),
  affiliate_commission_amount DECIMAL(12,2),
  
  -- Customization and variants
  variant_options JSONB DEFAULT '{}', -- Size, color, etc.
  customizations JSONB DEFAULT '{}', -- Personalization
  
  -- Fulfillment
  fulfillment_status TEXT DEFAULT 'pending' CHECK (
    fulfillment_status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled', 'returned')
  ),
  tracking_number TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT order_items_quantity_positive CHECK (quantity > 0),
  CONSTRAINT order_items_prices_positive CHECK (
    unit_price >= 0 AND 
    total_price >= 0 AND 
    (cost_price IS NULL OR cost_price >= 0)
  ),
  CONSTRAINT order_items_commission_valid CHECK (
    affiliate_commission_rate IS NULL OR 
    (affiliate_commission_rate >= 0 AND affiliate_commission_rate <= 100)
  )
);

-- =============================================================================
-- COMMISSION MANAGEMENT
-- =============================================================================

-- Commission tracking for affiliate sales
CREATE TABLE IF NOT EXISTS public.commissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- Order and affiliate references
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  order_item_id UUID REFERENCES public.order_items(id) ON DELETE CASCADE,
  affiliate_id UUID NOT NULL, -- Reference to affiliate
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  
  -- Commission details
  commission_type commission_type NOT NULL DEFAULT 'percentage',
  commission_rate DECIMAL(5,2),
  commission_amount DECIMAL(12,2) NOT NULL,
  base_amount DECIMAL(12,2) NOT NULL, -- Amount commission is calculated on
  currency TEXT NOT NULL DEFAULT 'USD',
  
  -- Commission status and lifecycle
  status commission_status NOT NULL DEFAULT 'pending',
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  
  -- Payout information
  payout_id UUID, -- Reference to payout batch
  payout_method TEXT,
  payout_reference TEXT,
  
  -- Commission tier/level information
  tier_level INTEGER DEFAULT 1,
  tier_multiplier DECIMAL(4,2) DEFAULT 1.00,
  
  -- Validation and hold information
  hold_reason TEXT,
  hold_until TIMESTAMPTZ,
  validation_notes TEXT,
  
  -- Metadata
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT commissions_currency_format CHECK (currency ~ '^[A-Z]{3}$'),
  CONSTRAINT commissions_amounts_positive CHECK (
    commission_amount >= 0 AND 
    base_amount >= 0
  ),
  CONSTRAINT commissions_rate_valid CHECK (
    commission_rate IS NULL OR 
    (commission_rate >= 0 AND commission_rate <= 100)
  ),
  CONSTRAINT commissions_tier_valid CHECK (tier_level >= 1),
  CONSTRAINT commissions_multiplier_positive CHECK (tier_multiplier > 0)
);

-- Commission structure definitions for different scenarios
CREATE TABLE IF NOT EXISTS public.commission_structures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- Structure identification
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  
  -- Applicability rules
  product_categories TEXT[] DEFAULT '{}',
  product_brands TEXT[] DEFAULT '{}',
  customer_segments TEXT[] DEFAULT '{}',
  affiliate_tiers TEXT[] DEFAULT '{}',
  
  -- Commission configuration
  commission_type commission_type NOT NULL DEFAULT 'percentage',
  base_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
  
  -- Tiered commission structure
  tiers JSONB DEFAULT '[]', -- Array of tier objects
  
  -- Minimum and maximum constraints
  minimum_order_value DECIMAL(12,2),
  maximum_commission DECIMAL(12,2),
  
  -- Time-based rules
  effective_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  effective_until TIMESTAMPTZ,
  
  -- Validation period (how long before commission is confirmed)
  validation_period_days INTEGER DEFAULT 30,
  
  -- Payment terms
  payment_schedule TEXT DEFAULT 'monthly', -- daily, weekly, monthly, quarterly
  payment_delay_days INTEGER DEFAULT 0,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT commission_structures_rate_valid CHECK (base_rate >= 0 AND base_rate <= 100),
  CONSTRAINT commission_structures_amounts_positive CHECK (
    (minimum_order_value IS NULL OR minimum_order_value >= 0) AND
    (maximum_commission IS NULL OR maximum_commission >= 0)
  ),
  CONSTRAINT commission_structures_dates_valid CHECK (
    effective_until IS NULL OR effective_until > effective_from
  ),
  CONSTRAINT commission_structures_periods_positive CHECK (
    validation_period_days >= 0 AND payment_delay_days >= 0
  ),
  
  -- Unique constraint on tenant and default structure
  UNIQUE (tenant_id, is_default) DEFERRABLE INITIALLY DEFERRED
);

-- =============================================================================
-- PAYMENT AND TRANSACTION MANAGEMENT
-- =============================================================================

-- Payments table for tracking all payment transactions
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  
  -- Payment identification
  payment_reference TEXT NOT NULL, -- External payment gateway reference
  transaction_id TEXT, -- Internal transaction ID
  
  -- Payment details
  amount DECIMAL(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  payment_method payment_method NOT NULL,
  payment_status payment_status NOT NULL DEFAULT 'pending',
  
  -- Payment gateway information
  gateway_provider TEXT, -- stripe, paypal, square, etc.
  gateway_transaction_id TEXT,
  gateway_fee DECIMAL(12,2),
  gateway_response JSONB,
  
  -- Card/payment method details (if applicable)
  payment_method_details JSONB DEFAULT '{}',
  
  -- Refund information
  refunded_amount DECIMAL(12,2) DEFAULT 0,
  refund_reason TEXT,
  
  -- Fraud and risk assessment
  fraud_score DECIMAL(3,2),
  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high')),
  fraud_checks JSONB DEFAULT '{}',
  
  -- Payment metadata
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  
  -- Important timestamps
  processed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT payments_currency_format CHECK (currency ~ '^[A-Z]{3}$'),
  CONSTRAINT payments_amount_positive CHECK (amount > 0),
  CONSTRAINT payments_refunded_amount_valid CHECK (
    refunded_amount >= 0 AND refunded_amount <= amount
  ),
  CONSTRAINT payments_fraud_score_valid CHECK (
    fraud_score IS NULL OR (fraud_score >= 0 AND fraud_score <= 1)
  ),
  
  -- Unique constraint on payment reference per tenant
  UNIQUE (tenant_id, payment_reference)
);

-- Transaction ledger for comprehensive financial tracking
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- Transaction references
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  commission_id UUID REFERENCES public.commissions(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  
  -- Transaction details
  transaction_type transaction_type NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  description TEXT NOT NULL,
  
  -- Account tracking (for double-entry bookkeeping)
  debit_account TEXT,
  credit_account TEXT,
  
  -- Reference information
  reference_number TEXT,
  external_reference TEXT,
  
  -- Transaction metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT transactions_currency_format CHECK (currency ~ '^[A-Z]{3}$')
);

-- =============================================================================
-- SHIPPING AND FULFILLMENT
-- =============================================================================

-- Shipments table for tracking order fulfillment
CREATE TABLE IF NOT EXISTS public.shipments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  
  -- Shipment identification
  shipment_number TEXT NOT NULL,
  tracking_number TEXT,
  carrier TEXT,
  service_level TEXT, -- standard, expedited, overnight, etc.
  
  -- Shipment details
  status shipping_status NOT NULL DEFAULT 'pending',
  package_count INTEGER DEFAULT 1,
  total_weight DECIMAL(8,2),
  weight_unit TEXT DEFAULT 'lbs',
  dimensions JSONB, -- length, width, height
  
  -- Shipping addresses
  origin_address JSONB NOT NULL,
  destination_address JSONB NOT NULL,
  
  -- Costs and pricing
  shipping_cost DECIMAL(12,2),
  insurance_cost DECIMAL(12,2),
  declared_value DECIMAL(12,2),
  currency TEXT NOT NULL DEFAULT 'USD',
  
  -- Tracking and status updates
  tracking_events JSONB DEFAULT '[]',
  estimated_delivery TIMESTAMPTZ,
  actual_delivery TIMESTAMPTZ,
  delivery_confirmation JSONB,
  
  -- Return information
  return_tracking_number TEXT,
  return_reason TEXT,
  return_status TEXT,
  
  -- Metadata
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT shipments_currency_format CHECK (currency ~ '^[A-Z]{3}$'),
  CONSTRAINT shipments_package_count_positive CHECK (package_count > 0),
  CONSTRAINT shipments_weight_positive CHECK (total_weight IS NULL OR total_weight > 0),
  CONSTRAINT shipments_costs_positive CHECK (
    (shipping_cost IS NULL OR shipping_cost >= 0) AND
    (insurance_cost IS NULL OR insurance_cost >= 0) AND
    (declared_value IS NULL OR declared_value >= 0)
  ),
  
  -- Unique constraint on shipment number per tenant
  UNIQUE (tenant_id, shipment_number)
);

-- Shipment items - link order items to shipments
CREATE TABLE IF NOT EXISTS public.shipment_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  shipment_id UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  order_item_id UUID NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
  
  -- Item details
  quantity_shipped INTEGER NOT NULL,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT shipment_items_quantity_positive CHECK (quantity_shipped > 0),
  
  -- Unique constraint to prevent duplicate shipment items
  UNIQUE (shipment_id, order_item_id)
);

-- =============================================================================
-- ANALYTICS AND REPORTING TABLES
-- =============================================================================

-- Sales metrics aggregation table for performance
CREATE TABLE IF NOT EXISTS public.sales_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- Time period and dimensions
  period_type TEXT NOT NULL CHECK (period_type IN ('hour', 'day', 'week', 'month', 'quarter', 'year')),
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  
  -- Dimensional grouping
  product_category TEXT,
  affiliate_id UUID,
  customer_segment TEXT,
  
  -- Sales metrics
  total_orders INTEGER DEFAULT 0,
  total_revenue DECIMAL(12,2) DEFAULT 0,
  total_commissions DECIMAL(12,2) DEFAULT 0,
  average_order_value DECIMAL(12,2) DEFAULT 0,
  conversion_rate DECIMAL(5,4) DEFAULT 0,
  
  -- Customer metrics
  new_customers INTEGER DEFAULT 0,
  returning_customers INTEGER DEFAULT 0,
  customer_acquisition_cost DECIMAL(12,2) DEFAULT 0,
  customer_lifetime_value DECIMAL(12,2) DEFAULT 0,
  
  -- Product metrics
  units_sold INTEGER DEFAULT 0,
  refund_rate DECIMAL(5,4) DEFAULT 0,
  return_rate DECIMAL(5,4) DEFAULT 0,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT sales_metrics_period_valid CHECK (period_end > period_start),
  CONSTRAINT sales_metrics_values_positive CHECK (
    total_orders >= 0 AND 
    total_revenue >= 0 AND 
    total_commissions >= 0 AND
    average_order_value >= 0 AND
    conversion_rate >= 0 AND conversion_rate <= 1 AND
    new_customers >= 0 AND
    returning_customers >= 0 AND
    customer_acquisition_cost >= 0 AND
    customer_lifetime_value >= 0 AND
    units_sold >= 0 AND
    refund_rate >= 0 AND refund_rate <= 1 AND
    return_rate >= 0 AND return_rate <= 1
  ),
  
  -- Unique constraint on time period and dimensions
  UNIQUE (tenant_id, period_type, period_start, product_category, affiliate_id, customer_segment)
);

-- =============================================================================
-- AUDIT AND ACTIVITY LOGGING
-- =============================================================================

-- Sales audit log for tracking all changes
CREATE TABLE IF NOT EXISTS public.sales_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- What was changed
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  
  -- Who made the change
  user_id UUID, -- Reference to user if available
  user_email TEXT,
  user_role TEXT,
  
  -- Change details
  old_values JSONB,
  new_values JSONB,
  changed_fields TEXT[],
  
  -- Context
  source TEXT, -- api, admin, system, etc.
  reason TEXT,
  ip_address INET,
  user_agent TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT sales_audit_log_table_valid CHECK (
    table_name IN ('customers', 'orders', 'order_items', 'payments', 'commissions', 'shipments')
  )
);

-- =============================================================================
-- PERFORMANCE INDEXES
-- =============================================================================

-- Customers table indexes
CREATE INDEX idx_customers_tenant_id ON public.customers(tenant_id);
CREATE INDEX idx_customers_email ON public.customers(email);
CREATE INDEX idx_customers_phone ON public.customers(phone) WHERE phone IS NOT NULL;
CREATE INDEX idx_customers_status ON public.customers(status);
CREATE INDEX idx_customers_type ON public.customers(customer_type);
CREATE INDEX idx_customers_segment ON public.customers(segment) WHERE segment IS NOT NULL;
CREATE INDEX idx_customers_created_at ON public.customers(created_at);
CREATE INDEX idx_customers_last_order_at ON public.customers(last_order_at) WHERE last_order_at IS NOT NULL;
CREATE INDEX idx_customers_total_spent ON public.customers(total_spent);
CREATE INDEX idx_customers_total_orders ON public.customers(total_orders);
CREATE INDEX idx_customers_external_id ON public.customers(external_id) WHERE external_id IS NOT NULL;

-- Customer addresses indexes
CREATE INDEX idx_customer_addresses_tenant_id ON public.customer_addresses(tenant_id);
CREATE INDEX idx_customer_addresses_customer_id ON public.customer_addresses(customer_id);
CREATE INDEX idx_customer_addresses_type ON public.customer_addresses(address_type);
CREATE INDEX idx_customer_addresses_default ON public.customer_addresses(is_default) WHERE is_default = true;
CREATE INDEX idx_customer_addresses_country ON public.customer_addresses(country);

-- Orders table indexes
CREATE INDEX idx_orders_tenant_id ON public.orders(tenant_id);
CREATE INDEX idx_orders_customer_id ON public.orders(customer_id);
CREATE INDEX idx_orders_order_number ON public.orders(order_number);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_type ON public.orders(order_type);
CREATE INDEX idx_orders_payment_status ON public.orders(payment_status);
CREATE INDEX idx_orders_affiliate_id ON public.orders(affiliate_id) WHERE affiliate_id IS NOT NULL;
CREATE INDEX idx_orders_affiliate_click_id ON public.orders(affiliate_click_id) WHERE affiliate_click_id IS NOT NULL;
CREATE INDEX idx_orders_total_amount ON public.orders(total_amount);
CREATE INDEX idx_orders_currency ON public.orders(currency);
CREATE INDEX idx_orders_ordered_at ON public.orders(ordered_at);
CREATE INDEX idx_orders_confirmed_at ON public.orders(confirmed_at) WHERE confirmed_at IS NOT NULL;
CREATE INDEX idx_orders_shipped_at ON public.orders(shipped_at) WHERE shipped_at IS NOT NULL;
CREATE INDEX idx_orders_delivered_at ON public.orders(delivered_at) WHERE delivered_at IS NOT NULL;
CREATE INDEX idx_orders_payment_reference ON public.orders(payment_reference) WHERE payment_reference IS NOT NULL;
CREATE INDEX idx_orders_utm_source ON public.orders(utm_source) WHERE utm_source IS NOT NULL;
CREATE INDEX idx_orders_utm_campaign ON public.orders(utm_campaign) WHERE utm_campaign IS NOT NULL;
CREATE INDEX idx_orders_created_at ON public.orders(created_at);

-- Composite indexes for common order queries
CREATE INDEX idx_orders_tenant_status_created ON public.orders(tenant_id, status, created_at);
CREATE INDEX idx_orders_customer_status ON public.orders(customer_id, status);
CREATE INDEX idx_orders_affiliate_status ON public.orders(affiliate_id, status) WHERE affiliate_id IS NOT NULL;
CREATE INDEX idx_orders_date_range ON public.orders(ordered_at, status);

-- Order items indexes
CREATE INDEX idx_order_items_tenant_id ON public.order_items(tenant_id);
CREATE INDEX idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX idx_order_items_product_id ON public.order_items(product_id) WHERE product_id IS NOT NULL;
CREATE INDEX idx_order_items_fulfillment_status ON public.order_items(fulfillment_status);
CREATE INDEX idx_order_items_product_sku ON public.order_items(product_sku) WHERE product_sku IS NOT NULL;
CREATE INDEX idx_order_items_product_category ON public.order_items(product_category) WHERE product_category IS NOT NULL;
CREATE INDEX idx_order_items_total_price ON public.order_items(total_price);
CREATE INDEX idx_order_items_created_at ON public.order_items(created_at);

-- Commissions table indexes
CREATE INDEX idx_commissions_tenant_id ON public.commissions(tenant_id);
CREATE INDEX idx_commissions_order_id ON public.commissions(order_id);
CREATE INDEX idx_commissions_order_item_id ON public.commissions(order_item_id) WHERE order_item_id IS NOT NULL;
CREATE INDEX idx_commissions_affiliate_id ON public.commissions(affiliate_id);
CREATE INDEX idx_commissions_customer_id ON public.commissions(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX idx_commissions_status ON public.commissions(status);
CREATE INDEX idx_commissions_type ON public.commissions(commission_type);
CREATE INDEX idx_commissions_earned_at ON public.commissions(earned_at);
CREATE INDEX idx_commissions_confirmed_at ON public.commissions(confirmed_at) WHERE confirmed_at IS NOT NULL;
CREATE INDEX idx_commissions_paid_at ON public.commissions(paid_at) WHERE paid_at IS NOT NULL;
CREATE INDEX idx_commissions_payout_id ON public.commissions(payout_id) WHERE payout_id IS NOT NULL;
CREATE INDEX idx_commissions_amount ON public.commissions(commission_amount);
CREATE INDEX idx_commissions_tier_level ON public.commissions(tier_level);

-- Composite indexes for commission queries
CREATE INDEX idx_commissions_affiliate_status ON public.commissions(affiliate_id, status);
CREATE INDEX idx_commissions_status_earned ON public.commissions(status, earned_at);
CREATE INDEX idx_commissions_tenant_status_earned ON public.commissions(tenant_id, status, earned_at);

-- Commission structures indexes
CREATE INDEX idx_commission_structures_tenant_id ON public.commission_structures(tenant_id);
CREATE INDEX idx_commission_structures_active ON public.commission_structures(is_active);
CREATE INDEX idx_commission_structures_default ON public.commission_structures(is_default) WHERE is_default = true;
CREATE INDEX idx_commission_structures_effective ON public.commission_structures(effective_from, effective_until);
CREATE INDEX idx_commission_structures_type ON public.commission_structures(commission_type);

-- Payments table indexes
CREATE INDEX idx_payments_tenant_id ON public.payments(tenant_id);
CREATE INDEX idx_payments_order_id ON public.payments(order_id) WHERE order_id IS NOT NULL;
CREATE INDEX idx_payments_customer_id ON public.payments(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX idx_payments_reference ON public.payments(payment_reference);
CREATE INDEX idx_payments_transaction_id ON public.payments(transaction_id) WHERE transaction_id IS NOT NULL;
CREATE INDEX idx_payments_status ON public.payments(payment_status);
CREATE INDEX idx_payments_method ON public.payments(payment_method);
CREATE INDEX idx_payments_gateway_provider ON public.payments(gateway_provider) WHERE gateway_provider IS NOT NULL;
CREATE INDEX idx_payments_gateway_transaction_id ON public.payments(gateway_transaction_id) WHERE gateway_transaction_id IS NOT NULL;
CREATE INDEX idx_payments_amount ON public.payments(amount);
CREATE INDEX idx_payments_processed_at ON public.payments(processed_at) WHERE processed_at IS NOT NULL;
CREATE INDEX idx_payments_created_at ON public.payments(created_at);
CREATE INDEX idx_payments_risk_level ON public.payments(risk_level) WHERE risk_level IS NOT NULL;

-- Transactions table indexes
CREATE INDEX idx_transactions_tenant_id ON public.transactions(tenant_id);
CREATE INDEX idx_transactions_order_id ON public.transactions(order_id) WHERE order_id IS NOT NULL;
CREATE INDEX idx_transactions_payment_id ON public.transactions(payment_id) WHERE payment_id IS NOT NULL;
CREATE INDEX idx_transactions_commission_id ON public.transactions(commission_id) WHERE commission_id IS NOT NULL;
CREATE INDEX idx_transactions_customer_id ON public.transactions(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX idx_transactions_type ON public.transactions(transaction_type);
CREATE INDEX idx_transactions_amount ON public.transactions(amount);
CREATE INDEX idx_transactions_reference ON public.transactions(reference_number) WHERE reference_number IS NOT NULL;
CREATE INDEX idx_transactions_external_reference ON public.transactions(external_reference) WHERE external_reference IS NOT NULL;
CREATE INDEX idx_transactions_created_at ON public.transactions(created_at);

-- Shipments table indexes
CREATE INDEX idx_shipments_tenant_id ON public.shipments(tenant_id);
CREATE INDEX idx_shipments_order_id ON public.shipments(order_id);
CREATE INDEX idx_shipments_number ON public.shipments(shipment_number);
CREATE INDEX idx_shipments_tracking_number ON public.shipments(tracking_number) WHERE tracking_number IS NOT NULL;
CREATE INDEX idx_shipments_status ON public.shipments(status);
CREATE INDEX idx_shipments_carrier ON public.shipments(carrier) WHERE carrier IS NOT NULL;
CREATE INDEX idx_shipments_created_at ON public.shipments(created_at);
CREATE INDEX idx_shipments_shipped_at ON public.shipments(shipped_at) WHERE shipped_at IS NOT NULL;
CREATE INDEX idx_shipments_delivered_at ON public.shipments(delivered_at) WHERE delivered_at IS NOT NULL;
CREATE INDEX idx_shipments_estimated_delivery ON public.shipments(estimated_delivery) WHERE estimated_delivery IS NOT NULL;

-- Shipment items indexes
CREATE INDEX idx_shipment_items_tenant_id ON public.shipment_items(tenant_id);
CREATE INDEX idx_shipment_items_shipment_id ON public.shipment_items(shipment_id);
CREATE INDEX idx_shipment_items_order_item_id ON public.shipment_items(order_item_id);

-- Sales metrics indexes
CREATE INDEX idx_sales_metrics_tenant_id ON public.sales_metrics(tenant_id);
CREATE INDEX idx_sales_metrics_period ON public.sales_metrics(period_type, period_start, period_end);
CREATE INDEX idx_sales_metrics_product_category ON public.sales_metrics(product_category) WHERE product_category IS NOT NULL;
CREATE INDEX idx_sales_metrics_affiliate_id ON public.sales_metrics(affiliate_id) WHERE affiliate_id IS NOT NULL;
CREATE INDEX idx_sales_metrics_customer_segment ON public.sales_metrics(customer_segment) WHERE customer_segment IS NOT NULL;
CREATE INDEX idx_sales_metrics_computed_at ON public.sales_metrics(computed_at);

-- Sales audit log indexes
CREATE INDEX idx_sales_audit_log_tenant_id ON public.sales_audit_log(tenant_id);
CREATE INDEX idx_sales_audit_log_table_record ON public.sales_audit_log(table_name, record_id);
CREATE INDEX idx_sales_audit_log_action ON public.sales_audit_log(action);
CREATE INDEX idx_sales_audit_log_user_id ON public.sales_audit_log(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_sales_audit_log_created_at ON public.sales_audit_log(created_at);
CREATE INDEX idx_sales_audit_log_source ON public.sales_audit_log(source) WHERE source IS NOT NULL;

-- Full-text search indexes
CREATE INDEX idx_customers_search ON public.customers USING GIN (
  to_tsvector('english', 
    COALESCE(first_name, '') || ' ' || 
    COALESCE(last_name, '') || ' ' || 
    COALESCE(company_name, '') || ' ' || 
    email
  )
);

CREATE INDEX idx_orders_search ON public.orders USING GIN (
  to_tsvector('english', 
    order_number || ' ' || 
    customer_email || ' ' || 
    COALESCE(notes, '')
  )
);

-- JSONB indexes for metadata searches
CREATE INDEX idx_customers_metadata ON public.customers USING GIN (metadata);
CREATE INDEX idx_orders_metadata ON public.orders USING GIN (metadata);
CREATE INDEX idx_order_items_metadata ON public.order_items USING GIN (metadata);
CREATE INDEX idx_payments_gateway_response ON public.payments USING GIN (gateway_response);
CREATE INDEX idx_shipments_tracking_events ON public.shipments USING GIN (tracking_events);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- Enable RLS on all sales management tables
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_audit_log ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is service role
CREATE OR REPLACE FUNCTION is_service_role() 
RETURNS BOOLEAN AS $$
BEGIN
  RETURN COALESCE(current_setting('role', true), '') = 'service_role';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get user's tenant ID from JWT
CREATE OR REPLACE FUNCTION get_user_tenant_id()
RETURNS UUID AS $$
BEGIN
  RETURN (auth.jwt() ->> 'tenant_id')::UUID;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- CUSTOMERS TABLE POLICIES
-- =============================================================================

-- Service role: Full access to all customer data
CREATE POLICY "customers_service_role_all"
  ON public.customers
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated users: Access to customers in their tenant only
CREATE POLICY "customers_tenant_access"
  ON public.customers
  FOR ALL
  TO authenticated
  USING (tenant_id = get_user_tenant_id())
  WITH CHECK (tenant_id = get_user_tenant_id());

-- Anonymous users: No access to customer data
-- (No policy needed - default is to deny)

-- =============================================================================
-- CUSTOMER ADDRESSES TABLE POLICIES
-- =============================================================================

-- Service role: Full access
CREATE POLICY "customer_addresses_service_role_all"
  ON public.customer_addresses
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated users: Access to addresses in their tenant only
CREATE POLICY "customer_addresses_tenant_access"
  ON public.customer_addresses
  FOR ALL
  TO authenticated
  USING (tenant_id = get_user_tenant_id())
  WITH CHECK (tenant_id = get_user_tenant_id());

-- =============================================================================
-- ORDERS TABLE POLICIES
-- =============================================================================

-- Service role: Full access
CREATE POLICY "orders_service_role_all"
  ON public.orders
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated users: Access to orders in their tenant only
CREATE POLICY "orders_tenant_access"
  ON public.orders
  FOR ALL
  TO authenticated
  USING (tenant_id = get_user_tenant_id())
  WITH CHECK (tenant_id = get_user_tenant_id());

-- Anonymous users: No access to order data
-- (No policy needed - default is to deny)

-- =============================================================================
-- ORDER ITEMS TABLE POLICIES
-- =============================================================================

-- Service role: Full access
CREATE POLICY "order_items_service_role_all"
  ON public.order_items
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated users: Access to order items in their tenant only
CREATE POLICY "order_items_tenant_access"
  ON public.order_items
  FOR ALL
  TO authenticated
  USING (tenant_id = get_user_tenant_id())
  WITH CHECK (tenant_id = get_user_tenant_id());

-- =============================================================================
-- COMMISSIONS TABLE POLICIES
-- =============================================================================

-- Service role: Full access
CREATE POLICY "commissions_service_role_all"
  ON public.commissions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated users: Access to commissions in their tenant only
CREATE POLICY "commissions_tenant_access"
  ON public.commissions
  FOR ALL
  TO authenticated
  USING (tenant_id = get_user_tenant_id())
  WITH CHECK (tenant_id = get_user_tenant_id());

-- =============================================================================
-- COMMISSION STRUCTURES TABLE POLICIES
-- =============================================================================

-- Service role: Full access
CREATE POLICY "commission_structures_service_role_all"
  ON public.commission_structures
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated users: Access to commission structures in their tenant only
CREATE POLICY "commission_structures_tenant_access"
  ON public.commission_structures
  FOR ALL
  TO authenticated
  USING (tenant_id = get_user_tenant_id())
  WITH CHECK (tenant_id = get_user_tenant_id());

-- =============================================================================
-- PAYMENTS TABLE POLICIES
-- =============================================================================

-- Service role: Full access
CREATE POLICY "payments_service_role_all"
  ON public.payments
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated users: Access to payments in their tenant only
CREATE POLICY "payments_tenant_access"
  ON public.payments
  FOR ALL
  TO authenticated
  USING (tenant_id = get_user_tenant_id())
  WITH CHECK (tenant_id = get_user_tenant_id());

-- =============================================================================
-- TRANSACTIONS TABLE POLICIES
-- =============================================================================

-- Service role: Full access
CREATE POLICY "transactions_service_role_all"
  ON public.transactions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated users: Access to transactions in their tenant only
CREATE POLICY "transactions_tenant_access"
  ON public.transactions
  FOR ALL
  TO authenticated
  USING (tenant_id = get_user_tenant_id())
  WITH CHECK (tenant_id = get_user_tenant_id());

-- =============================================================================
-- SHIPMENTS TABLE POLICIES
-- =============================================================================

-- Service role: Full access
CREATE POLICY "shipments_service_role_all"
  ON public.shipments
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated users: Access to shipments in their tenant only
CREATE POLICY "shipments_tenant_access"
  ON public.shipments
  FOR ALL
  TO authenticated
  USING (tenant_id = get_user_tenant_id())
  WITH CHECK (tenant_id = get_user_tenant_id());

-- =============================================================================
-- SHIPMENT ITEMS TABLE POLICIES
-- =============================================================================

-- Service role: Full access
CREATE POLICY "shipment_items_service_role_all"
  ON public.shipment_items
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated users: Access to shipment items in their tenant only
CREATE POLICY "shipment_items_tenant_access"
  ON public.shipment_items
  FOR ALL
  TO authenticated
  USING (tenant_id = get_user_tenant_id())
  WITH CHECK (tenant_id = get_user_tenant_id());

-- =============================================================================
-- SALES METRICS TABLE POLICIES
-- =============================================================================

-- Service role: Full access
CREATE POLICY "sales_metrics_service_role_all"
  ON public.sales_metrics
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated users: Read access to metrics in their tenant only
CREATE POLICY "sales_metrics_tenant_read"
  ON public.sales_metrics
  FOR SELECT
  TO authenticated
  USING (tenant_id = get_user_tenant_id());

-- Only service role can insert/update/delete metrics (computed by system)
CREATE POLICY "sales_metrics_service_write"
  ON public.sales_metrics
  FOR INSERT, UPDATE, DELETE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- SALES AUDIT LOG TABLE POLICIES
-- =============================================================================

-- Service role: Full access
CREATE POLICY "sales_audit_log_service_role_all"
  ON public.sales_audit_log
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated users: Read access to audit logs in their tenant only
CREATE POLICY "sales_audit_log_tenant_read"
  ON public.sales_audit_log
  FOR SELECT
  TO authenticated
  USING (tenant_id = get_user_tenant_id());

-- Only service role can insert audit logs (system-generated)
CREATE POLICY "sales_audit_log_service_write"
  ON public.sales_audit_log
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- =============================================================================
-- GRANT PERMISSIONS TO ROLES
-- =============================================================================

-- Grant appropriate permissions to service role
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON public.customers TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.customer_addresses TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.order_items TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.commissions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.commission_structures TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.payments TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.shipments TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.shipment_items TO authenticated;
GRANT SELECT ON public.sales_metrics TO authenticated;
GRANT SELECT ON public.sales_audit_log TO authenticated;

-- Grant permissions to anonymous users (very limited)
-- Only allow reading published product information through existing policies
-- No direct access to sales management tables

-- =============================================================================
-- BUSINESS LOGIC FUNCTIONS
-- =============================================================================

-- Function to generate unique order numbers
CREATE OR REPLACE FUNCTION generate_order_number(p_tenant_id UUID)
RETURNS TEXT AS $$
DECLARE
  prefix TEXT;
  sequence_num INTEGER;
  order_number TEXT;
BEGIN
  -- Get tenant slug for prefix
  SELECT UPPER(LEFT(slug, 3)) INTO prefix
  FROM public.tenants
  WHERE id = p_tenant_id;
  
  -- If no tenant found, use default prefix
  IF prefix IS NULL THEN
    prefix := 'ORD';
  END IF;
  
  -- Get next sequence number for this tenant
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(order_number FROM '[0-9]+$') AS INTEGER)
  ), 0) + 1 INTO sequence_num
  FROM public.orders
  WHERE tenant_id = p_tenant_id;
  
  -- Format order number with zero padding
  order_number := prefix || '-' || LPAD(sequence_num::TEXT, 6, '0');
  
  RETURN order_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate commission amount based on structure
CREATE OR REPLACE FUNCTION calculate_commission(
  p_tenant_id UUID,
  p_order_amount DECIMAL,
  p_product_category TEXT DEFAULT NULL,
  p_customer_segment TEXT DEFAULT NULL,
  p_affiliate_tier TEXT DEFAULT NULL
)
RETURNS TABLE(
  commission_amount DECIMAL,
  commission_rate DECIMAL,
  commission_type commission_type,
  structure_id UUID
) AS $$
DECLARE
  structure RECORD;
  calculated_amount DECIMAL;
  calculated_rate DECIMAL;
BEGIN
  -- Find applicable commission structure
  SELECT cs.* INTO structure
  FROM public.commission_structures cs
  WHERE cs.tenant_id = p_tenant_id
    AND cs.is_active = true
    AND cs.effective_from <= NOW()
    AND (cs.effective_until IS NULL OR cs.effective_until > NOW())
    AND (cs.minimum_order_value IS NULL OR p_order_amount >= cs.minimum_order_value)
    AND (cardinality(cs.product_categories) = 0 OR p_product_category = ANY(cs.product_categories))
    AND (cardinality(cs.customer_segments) = 0 OR p_customer_segment = ANY(cs.customer_segments))
    AND (cardinality(cs.affiliate_tiers) = 0 OR p_affiliate_tier = ANY(cs.affiliate_tiers))
  ORDER BY 
    CASE WHEN cs.is_default THEN 1 ELSE 0 END,
    cs.created_at DESC
  LIMIT 1;
  
  -- If no structure found, return zero commission
  IF structure IS NULL THEN
    RETURN QUERY SELECT 0::DECIMAL, 0::DECIMAL, 'percentage'::commission_type, NULL::UUID;
    RETURN;
  END IF;
  
  calculated_rate := structure.base_rate;
  
  -- Handle tiered commission calculation
  IF structure.commission_type = 'tiered' AND structure.tiers IS NOT NULL THEN
    -- Calculate tiered commission (implementation depends on tier structure)
    -- For now, use base rate
    calculated_rate := structure.base_rate;
  END IF;
  
  -- Calculate commission amount
  IF structure.commission_type = 'percentage' THEN
    calculated_amount := p_order_amount * (calculated_rate / 100);
  ELSIF structure.commission_type = 'fixed' THEN
    calculated_amount := calculated_rate;
  ELSE
    calculated_amount := p_order_amount * (calculated_rate / 100);
  END IF;
  
  -- Apply maximum commission limit
  IF structure.maximum_commission IS NOT NULL AND calculated_amount > structure.maximum_commission THEN
    calculated_amount := structure.maximum_commission;
  END IF;
  
  RETURN QUERY SELECT 
    calculated_amount,
    calculated_rate,
    structure.commission_type,
    structure.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update customer metrics after order changes
CREATE OR REPLACE FUNCTION update_customer_metrics(p_customer_id UUID)
RETURNS VOID AS $$
DECLARE
  metrics RECORD;
BEGIN
  -- Calculate customer metrics
  SELECT 
    COUNT(*) as order_count,
    COALESCE(SUM(total_amount), 0) as total_spent,
    COALESCE(AVG(total_amount), 0) as avg_order_value,
    MAX(ordered_at) as last_order_date
  INTO metrics
  FROM public.orders
  WHERE customer_id = p_customer_id
    AND status IN ('confirmed', 'processing', 'shipped', 'delivered', 'completed');
  
  -- Update customer record
  UPDATE public.customers
  SET 
    total_orders = metrics.order_count,
    total_spent = metrics.total_spent,
    average_order_value = metrics.avg_order_value,
    last_order_at = metrics.last_order_date,
    lifetime_value = metrics.total_spent, -- Simple LTV calculation
    updated_at = NOW()
  WHERE id = p_customer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create commission records for an order
CREATE OR REPLACE FUNCTION create_order_commissions(p_order_id UUID)
RETURNS INTEGER AS $$
DECLARE
  order_rec RECORD;
  item_rec RECORD;
  commission_calc RECORD;
  commissions_created INTEGER := 0;
BEGIN
  -- Get order details
  SELECT * INTO order_rec
  FROM public.orders
  WHERE id = p_order_id;
  
  -- Only create commissions for affiliate orders
  IF order_rec.affiliate_id IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Process each order item
  FOR item_rec IN 
    SELECT * FROM public.order_items 
    WHERE order_id = p_order_id
  LOOP
    -- Calculate commission for this item
    SELECT * INTO commission_calc
    FROM calculate_commission(
      order_rec.tenant_id,
      item_rec.total_price,
      item_rec.product_category,
      NULL, -- customer segment (could be added later)
      NULL  -- affiliate tier (could be added later)
    );
    
    -- Create commission record if amount > 0
    IF commission_calc.commission_amount > 0 THEN
      INSERT INTO public.commissions (
        tenant_id,
        order_id,
        order_item_id,
        affiliate_id,
        customer_id,
        commission_type,
        commission_rate,
        commission_amount,
        base_amount,
        currency,
        status,
        earned_at
      ) VALUES (
        order_rec.tenant_id,
        p_order_id,
        item_rec.id,
        order_rec.affiliate_id,
        order_rec.customer_id,
        commission_calc.commission_type,
        commission_calc.commission_rate,
        commission_calc.commission_amount,
        item_rec.total_price,
        order_rec.currency,
        'pending',
        NOW()
      );
      
      commissions_created := commissions_created + 1;
    END IF;
  END LOOP;
  
  RETURN commissions_created;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get sales analytics for a tenant
CREATE OR REPLACE FUNCTION get_sales_analytics(
  p_tenant_id UUID,
  p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  p_end_date TIMESTAMPTZ DEFAULT NOW(),
  p_group_by TEXT DEFAULT 'day'
)
RETURNS TABLE(
  period_label TEXT,
  period_start TIMESTAMPTZ,
  total_orders BIGINT,
  total_revenue DECIMAL,
  total_commissions DECIMAL,
  avg_order_value DECIMAL,
  new_customers BIGINT,
  conversion_rate DECIMAL
) AS $$
DECLARE
  date_trunc_format TEXT;
BEGIN
  -- Set date truncation format based on grouping
  CASE p_group_by
    WHEN 'hour' THEN date_trunc_format := 'hour';
    WHEN 'day' THEN date_trunc_format := 'day';
    WHEN 'week' THEN date_trunc_format := 'week';
    WHEN 'month' THEN date_trunc_format := 'month';
    ELSE date_trunc_format := 'day';
  END CASE;
  
  RETURN QUERY
  WITH order_stats AS (
    SELECT 
      date_trunc(date_trunc_format, o.ordered_at) as period,
      COUNT(*) as orders,
      SUM(o.total_amount) as revenue,
      AVG(o.total_amount) as avg_value,
      COUNT(DISTINCT o.customer_id) as customers
    FROM public.orders o
    WHERE o.tenant_id = p_tenant_id
      AND o.ordered_at BETWEEN p_start_date AND p_end_date
      AND o.status NOT IN ('cancelled', 'failed')
    GROUP BY date_trunc(date_trunc_format, o.ordered_at)
  ),
  commission_stats AS (
    SELECT 
      date_trunc(date_trunc_format, c.earned_at) as period,
      SUM(c.commission_amount) as commissions
    FROM public.commissions c
    JOIN public.orders o ON c.order_id = o.id
    WHERE c.tenant_id = p_tenant_id
      AND c.earned_at BETWEEN p_start_date AND p_end_date
      AND c.status != 'cancelled'
    GROUP BY date_trunc(date_trunc_format, c.earned_at)
  ),
  new_customer_stats AS (
    SELECT 
      date_trunc(date_trunc_format, c.created_at) as period,
      COUNT(*) as new_customers
    FROM public.customers c
    WHERE c.tenant_id = p_tenant_id
      AND c.created_at BETWEEN p_start_date AND p_end_date
    GROUP BY date_trunc(date_trunc_format, c.created_at)
  )
  SELECT 
    to_char(os.period, 'YYYY-MM-DD HH24:MI') as period_label,
    os.period as period_start,
    COALESCE(os.orders, 0) as total_orders,
    COALESCE(os.revenue, 0) as total_revenue,
    COALESCE(cs.commissions, 0) as total_commissions,
    COALESCE(os.avg_value, 0) as avg_order_value,
    COALESCE(ncs.new_customers, 0) as new_customers,
    CASE 
      WHEN os.customers > 0 THEN (os.orders::DECIMAL / os.customers)
      ELSE 0 
    END as conversion_rate
  FROM order_stats os
  LEFT JOIN commission_stats cs ON os.period = cs.period
  LEFT JOIN new_customer_stats ncs ON os.period = ncs.period
  ORDER BY os.period;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get commission summary for an affiliate
CREATE OR REPLACE FUNCTION get_affiliate_commission_summary(
  p_tenant_id UUID,
  p_affiliate_id UUID,
  p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  p_end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE(
  total_commissions DECIMAL,
  pending_commissions DECIMAL,
  confirmed_commissions DECIMAL,
  paid_commissions DECIMAL,
  commission_count BIGINT,
  orders_count BIGINT,
  total_sales DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(c.commission_amount), 0) as total_commissions,
    COALESCE(SUM(CASE WHEN c.status = 'pending' THEN c.commission_amount ELSE 0 END), 0) as pending_commissions,
    COALESCE(SUM(CASE WHEN c.status = 'confirmed' THEN c.commission_amount ELSE 0 END), 0) as confirmed_commissions,
    COALESCE(SUM(CASE WHEN c.status = 'paid' THEN c.commission_amount ELSE 0 END), 0) as paid_commissions,
    COUNT(c.id) as commission_count,
    COUNT(DISTINCT c.order_id) as orders_count,
    COALESCE(SUM(c.base_amount), 0) as total_sales
  FROM public.commissions c
  WHERE c.tenant_id = p_tenant_id
    AND c.affiliate_id = p_affiliate_id
    AND c.earned_at BETWEEN p_start_date AND p_end_date
    AND c.status != 'cancelled';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to process commission confirmations (called after validation period)
CREATE OR REPLACE FUNCTION confirm_eligible_commissions(p_tenant_id UUID)
RETURNS INTEGER AS $$
DECLARE
  confirmed_count INTEGER := 0;
  commission_rec RECORD;
BEGIN
  -- Find commissions eligible for confirmation
  FOR commission_rec IN
    SELECT c.id, cs.validation_period_days
    FROM public.commissions c
    JOIN public.commission_structures cs ON c.tenant_id = cs.tenant_id
    JOIN public.orders o ON c.order_id = o.id
    WHERE c.tenant_id = p_tenant_id
      AND c.status = 'pending'
      AND o.status IN ('delivered', 'completed')
      AND c.earned_at + (cs.validation_period_days || ' days')::INTERVAL <= NOW()
  LOOP
    -- Confirm the commission
    UPDATE public.commissions
    SET 
      status = 'confirmed',
      confirmed_at = NOW(),
      updated_at = NOW()
    WHERE id = commission_rec.id;
    
    confirmed_count := confirmed_count + 1;
  END LOOP;
  
  RETURN confirmed_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update order totals when items change
CREATE OR REPLACE FUNCTION update_order_totals(p_order_id UUID)
RETURNS VOID AS $$
DECLARE
  order_totals RECORD;
BEGIN
  -- Calculate totals from order items
  SELECT 
    COALESCE(SUM(total_price), 0) as subtotal,
    COUNT(*) as item_count
  INTO order_totals
  FROM public.order_items
  WHERE order_id = p_order_id;
  
  -- Update order with calculated totals
  UPDATE public.orders
  SET 
    subtotal = order_totals.subtotal,
    -- Note: total_amount should include tax, shipping, discounts
    -- This is a simplified calculation
    total_amount = subtotal + tax_amount + shipping_amount - discount_amount,
    updated_at = NOW()
  WHERE id = p_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create financial transaction records
CREATE OR REPLACE FUNCTION create_transaction_record(
  p_tenant_id UUID,
  p_transaction_type transaction_type,
  p_amount DECIMAL,
  p_currency TEXT,
  p_description TEXT,
  p_order_id UUID DEFAULT NULL,
  p_payment_id UUID DEFAULT NULL,
  p_commission_id UUID DEFAULT NULL,
  p_customer_id UUID DEFAULT NULL,
  p_reference_number TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  transaction_id UUID;
BEGIN
  INSERT INTO public.transactions (
    tenant_id,
    transaction_type,
    amount,
    currency,
    description,
    order_id,
    payment_id,
    commission_id,
    customer_id,
    reference_number,
    metadata
  ) VALUES (
    p_tenant_id,
    p_transaction_type,
    p_amount,
    p_currency,
    p_description,
    p_order_id,
    p_payment_id,
    p_commission_id,
    p_customer_id,
    p_reference_number,
    p_metadata
  ) RETURNING id INTO transaction_id;
  
  RETURN transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- AUDIT TRIGGERS AND LOGGING
-- =============================================================================

-- Generic audit function that can be used by all tables
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
  tenant_id_val UUID;
  user_id_val UUID;
  user_email_val TEXT;
  old_values JSONB;
  new_values JSONB;
  changed_fields TEXT[];
BEGIN
  -- Get tenant_id from the record
  IF TG_OP = 'DELETE' THEN
    tenant_id_val := OLD.tenant_id;
  ELSE
    tenant_id_val := NEW.tenant_id;
  END IF;
  
  -- Get user information from JWT
  BEGIN
    user_id_val := auth.uid();
    user_email_val := auth.email();
  EXCEPTION
    WHEN OTHERS THEN
      user_id_val := NULL;
      user_email_val := 'system';
  END;
  
  -- Prepare audit data based on operation
  IF TG_OP = 'DELETE' THEN
    old_values := to_jsonb(OLD);
    new_values := NULL;
    changed_fields := NULL;
  ELSIF TG_OP = 'INSERT' THEN
    old_values := NULL;
    new_values := to_jsonb(NEW);
    changed_fields := NULL;
  ELSIF TG_OP = 'UPDATE' THEN
    old_values := to_jsonb(OLD);
    new_values := to_jsonb(NEW);
    
    -- Calculate changed fields
    SELECT array_agg(key) INTO changed_fields
    FROM (
      SELECT key 
      FROM jsonb_each(old_values) o
      FULL OUTER JOIN jsonb_each(new_values) n USING (key)
      WHERE o.value IS DISTINCT FROM n.value
    ) fields;
  END IF;
  
  -- Insert audit record
  INSERT INTO public.sales_audit_log (
    tenant_id,
    table_name,
    record_id,
    action,
    user_id,
    user_email,
    old_values,
    new_values,
    changed_fields,
    source,
    metadata
  ) VALUES (
    tenant_id_val,
    TG_TABLE_NAME,
    CASE 
      WHEN TG_OP = 'DELETE' THEN OLD.id
      ELSE NEW.id
    END,
    TG_OP,
    user_id_val,
    user_email_val,
    old_values,
    new_values,
    changed_fields,
    'database_trigger',
    jsonb_build_object(
      'table_schema', TG_TABLE_SCHEMA,
      'trigger_name', TG_NAME,
      'timestamp', NOW()
    )
  );
  
  -- Return appropriate record
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create audit triggers for all sales management tables
CREATE TRIGGER customers_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER customer_addresses_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.customer_addresses
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER orders_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER order_items_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER commissions_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.commissions
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER payments_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER shipments_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.shipments
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Updated_at trigger function (reuse existing or create new)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create updated_at triggers for all relevant tables
CREATE TRIGGER customers_updated_at_trigger
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER customer_addresses_updated_at_trigger
  BEFORE UPDATE ON public.customer_addresses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER orders_updated_at_trigger
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER order_items_updated_at_trigger
  BEFORE UPDATE ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER commissions_updated_at_trigger
  BEFORE UPDATE ON public.commissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER commission_structures_updated_at_trigger
  BEFORE UPDATE ON public.commission_structures
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER payments_updated_at_trigger
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER shipments_updated_at_trigger
  BEFORE UPDATE ON public.shipments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Business logic triggers

-- Trigger to automatically update order totals when order items change
CREATE OR REPLACE FUNCTION order_items_change_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- Update order totals whenever order items are modified
  IF TG_OP = 'DELETE' THEN
    PERFORM update_order_totals(OLD.order_id);
    RETURN OLD;
  ELSE
    PERFORM update_order_totals(NEW.order_id);
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER order_items_change_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION order_items_change_trigger();

-- Trigger to automatically update customer metrics when orders change
CREATE OR REPLACE FUNCTION orders_customer_metrics_trigger()
RETURNS TRIGGER AS $$
DECLARE
  customer_id_to_update UUID;
BEGIN
  -- Determine which customer to update
  IF TG_OP = 'DELETE' THEN
    customer_id_to_update := OLD.customer_id;
  ELSE
    customer_id_to_update := NEW.customer_id;
  END IF;
  
  -- Update customer metrics (use pg_notify for async processing in production)
  PERFORM update_customer_metrics(customer_id_to_update);
  
  -- If customer changed on update, update both
  IF TG_OP = 'UPDATE' AND OLD.customer_id != NEW.customer_id THEN
    PERFORM update_customer_metrics(OLD.customer_id);
  END IF;
  
  -- Return appropriate record
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER orders_customer_metrics_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION orders_customer_metrics_trigger();

-- Trigger to automatically create commissions when orders are confirmed
CREATE OR REPLACE FUNCTION orders_commission_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- Create commissions when order status changes to confirmed
  IF TG_OP = 'UPDATE' AND 
     OLD.status != 'confirmed' AND 
     NEW.status = 'confirmed' AND 
     NEW.affiliate_id IS NOT NULL THEN
    
    PERFORM create_order_commissions(NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER orders_commission_trigger
  AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION orders_commission_trigger();

-- Trigger to automatically set order numbers
CREATE OR REPLACE FUNCTION orders_number_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- Set order number if not provided
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := generate_order_number(NEW.tenant_id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER orders_number_trigger
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION orders_number_trigger();

-- Trigger to create transaction records for payments
CREATE OR REPLACE FUNCTION payments_transaction_trigger()
RETURNS TRIGGER AS $$
DECLARE
  transaction_desc TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    transaction_desc := 'Payment for order';
    
    PERFORM create_transaction_record(
      NEW.tenant_id,
      'sale'::transaction_type,
      NEW.amount,
      NEW.currency,
      transaction_desc,
      NEW.order_id,
      NEW.id,
      NULL,
      NEW.customer_id,
      NEW.payment_reference,
      jsonb_build_object(
        'payment_method', NEW.payment_method,
        'gateway_provider', NEW.gateway_provider
      )
    );
  ELSIF TG_OP = 'UPDATE' AND NEW.refunded_amount > OLD.refunded_amount THEN
    transaction_desc := 'Refund for order';
    
    PERFORM create_transaction_record(
      NEW.tenant_id,
      'refund'::transaction_type,
      -(NEW.refunded_amount - OLD.refunded_amount),
      NEW.currency,
      transaction_desc,
      NEW.order_id,
      NEW.id,
      NULL,
      NEW.customer_id,
      NEW.payment_reference || '-refund',
      jsonb_build_object(
        'refund_reason', NEW.refund_reason,
        'original_amount', NEW.amount
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER payments_transaction_trigger
  AFTER INSERT OR UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION payments_transaction_trigger();

-- =============================================================================
-- VIEWS FOR ANALYTICS AND REPORTING
-- =============================================================================

-- Comprehensive order view with related data
CREATE OR REPLACE VIEW public.orders_detailed AS
SELECT 
  o.*,
  c.first_name as customer_first_name,
  c.last_name as customer_last_name,
  c.company_name as customer_company,
  c.customer_type,
  COUNT(oi.id) as item_count,
  COALESCE(SUM(oi.total_price), 0) as items_total,
  COALESCE(SUM(comm.commission_amount), 0) as total_commissions,
  p.payment_status as latest_payment_status,
  p.payment_method as latest_payment_method,
  s.status as shipping_status,
  s.tracking_number as shipping_tracking
FROM public.orders o
LEFT JOIN public.customers c ON o.customer_id = c.id
LEFT JOIN public.order_items oi ON o.id = oi.order_id
LEFT JOIN public.commissions comm ON o.id = comm.order_id
LEFT JOIN public.payments p ON o.id = p.order_id
LEFT JOIN public.shipments s ON o.id = s.order_id
GROUP BY o.id, c.id, p.id, s.id;

-- Commission summary view
CREATE OR REPLACE VIEW public.commissions_summary AS
SELECT 
  c.*,
  o.order_number,
  o.customer_email,
  o.total_amount as order_total,
  cust.first_name as customer_first_name,
  cust.last_name as customer_last_name,
  oi.product_name,
  oi.product_category
FROM public.commissions c
JOIN public.orders o ON c.order_id = o.id
LEFT JOIN public.customers cust ON c.customer_id = cust.id
LEFT JOIN public.order_items oi ON c.order_item_id = oi.id;

-- Customer analytics view
CREATE OR REPLACE VIEW public.customer_analytics AS
SELECT 
  c.*,
  COUNT(DISTINCT o.id) as actual_order_count,
  COALESCE(SUM(o.total_amount), 0) as actual_total_spent,
  COALESCE(AVG(o.total_amount), 0) as actual_avg_order_value,
  COUNT(DISTINCT CASE WHEN o.ordered_at >= NOW() - INTERVAL '30 days' THEN o.id END) as orders_last_30_days,
  COALESCE(SUM(CASE WHEN o.ordered_at >= NOW() - INTERVAL '30 days' THEN o.total_amount ELSE 0 END), 0) as spent_last_30_days,
  MAX(o.ordered_at) as actual_last_order_date,
  CASE 
    WHEN MAX(o.ordered_at) >= NOW() - INTERVAL '30 days' THEN 'active'
    WHEN MAX(o.ordered_at) >= NOW() - INTERVAL '90 days' THEN 'at_risk'
    WHEN MAX(o.ordered_at) IS NOT NULL THEN 'inactive'
    ELSE 'new'
  END as activity_status
FROM public.customers c
LEFT JOIN public.orders o ON c.id = o.customer_id 
  AND o.status NOT IN ('cancelled', 'failed')
GROUP BY c.id;

-- Sales performance dashboard view
CREATE OR REPLACE VIEW public.sales_dashboard AS
SELECT 
  t.id as tenant_id,
  t.name as tenant_name,
  COUNT(DISTINCT o.id) as total_orders,
  COUNT(DISTINCT c.id) as total_customers,
  COALESCE(SUM(o.total_amount), 0) as total_revenue,
  COALESCE(SUM(comm.commission_amount), 0) as total_commissions,
  COALESCE(AVG(o.total_amount), 0) as avg_order_value,
  COUNT(DISTINCT CASE WHEN o.ordered_at >= NOW() - INTERVAL '30 days' THEN o.id END) as orders_last_30_days,
  COALESCE(SUM(CASE WHEN o.ordered_at >= NOW() - INTERVAL '30 days' THEN o.total_amount ELSE 0 END), 0) as revenue_last_30_days,
  COUNT(DISTINCT CASE WHEN c.created_at >= NOW() - INTERVAL '30 days' THEN c.id END) as new_customers_last_30_days
FROM public.tenants t
LEFT JOIN public.orders o ON t.id = o.tenant_id AND o.status NOT IN ('cancelled', 'failed')
LEFT JOIN public.customers c ON t.id = c.tenant_id
LEFT JOIN public.commissions comm ON t.id = comm.tenant_id AND comm.status != 'cancelled'
GROUP BY t.id, t.name;

-- =============================================================================
-- MIGRATION COMPLETION AND VALIDATION
-- =============================================================================

-- Insert initial commission structure template
INSERT INTO public.commission_structures (
  tenant_id,
  name,
  description,
  commission_type,
  base_rate,
  is_default,
  validation_period_days,
  payment_schedule
) 
SELECT 
  id as tenant_id,
  'Default Commission Structure',
  'Default 5% commission on all affiliate sales',
  'percentage',
  5.00,
  true,
  30,
  'monthly'
FROM public.tenants 
ON CONFLICT DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE customers IS 'Comprehensive customer management with analytics and segmentation';
COMMENT ON TABLE customer_addresses IS 'Customer shipping and billing addresses';
COMMENT ON TABLE orders IS 'Central orders table supporting both affiliate and direct sales';
COMMENT ON TABLE order_items IS 'Individual line items within orders';
COMMENT ON TABLE commissions IS 'Affiliate commission tracking and management';
COMMENT ON TABLE commission_structures IS 'Configurable commission rules and rates';
COMMENT ON TABLE payments IS 'Payment transaction tracking with gateway integration';
COMMENT ON TABLE transactions IS 'Double-entry transaction ledger for financial reconciliation';
COMMENT ON TABLE shipments IS 'Shipment and fulfillment tracking';
COMMENT ON TABLE shipment_items IS 'Items within each shipment';
COMMENT ON TABLE sales_metrics IS 'Pre-aggregated sales metrics for analytics performance';
COMMENT ON TABLE sales_audit_log IS 'Comprehensive audit trail for all sales-related changes';

-- Validation check
DO $$
BEGIN
  ASSERT (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND tablename IN (
    'customers', 'customer_addresses', 'orders', 'order_items', 'commissions', 
    'commission_structures', 'payments', 'transactions', 'shipments', 
    'shipment_items', 'sales_metrics', 'sales_audit_log'
  )) = 12, 'Not all sales management tables were created successfully';
  
  RAISE NOTICE 'Sales management system tables created successfully!';
END $$;