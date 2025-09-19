-- Create seasonal_showcases table
CREATE TABLE IF NOT EXISTS public.seasonal_showcases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subtitle TEXT NOT NULL,
  description TEXT NOT NULL,
  cta_text TEXT NOT NULL,
  cta_link TEXT NOT NULL,
  badge_text TEXT NOT NULL,
  badge_emoji TEXT,
  gradient_from TEXT NOT NULL,
  gradient_to TEXT NOT NULL,
  highlight_products TEXT[],
  season_type TEXT CHECK (season_type IN ('winter', 'spring', 'summer', 'fall', 'holiday', 'special')) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_seasonal_showcases_tenant_id ON public.seasonal_showcases(tenant_id);
CREATE INDEX idx_seasonal_showcases_active ON public.seasonal_showcases(is_active);
CREATE INDEX idx_seasonal_showcases_dates ON public.seasonal_showcases(valid_from, valid_until);

-- Enable Row Level Security
ALTER TABLE public.seasonal_showcases ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow read access to seasonal showcases" ON public.seasonal_showcases
  FOR SELECT
  USING (true);

CREATE POLICY "Allow admin users to manage seasonal showcases" ON public.seasonal_showcases
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.tenant_id = seasonal_showcases.tenant_id
      AND ur.role IN ('owner', 'admin')
    )
  );

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_seasonal_showcases_updated_at
  BEFORE UPDATE ON public.seasonal_showcases
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();