-- Escrow System Database Migration
-- Creates all necessary tables, indexes, and security policies for the escrow marketplace

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create enum types
CREATE TYPE escrow_status AS ENUM (
  'pending',
  'funded',
  'in_progress',
  'dispute',
  'arbitration',
  'completed',
  'cancelled',
  'refunded'
);

CREATE TYPE milestone_status AS ENUM (
  'pending',
  'in_progress',
  'completed',
  'disputed',
  'approved',
  'rejected'
);

CREATE TYPE dispute_status AS ENUM (
  'open',
  'investigating',
  'arbitration',
  'resolved',
  'closed'
);

CREATE TYPE document_type AS ENUM (
  'contract',
  'due_diligence',
  'financial_statement',
  'legal_document',
  'verification',
  'screenshot',
  'other'
);

-- Escrow Transactions Table
CREATE TABLE escrow_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  buyer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  seller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  site_id UUID REFERENCES sites(id) ON DELETE RESTRICT,
  status escrow_status NOT NULL DEFAULT 'pending',
  total_amount DECIMAL(12,2) NOT NULL CHECK (total_amount > 0),
  platform_fee_percent DECIMAL(5,2) NOT NULL DEFAULT 5.00 CHECK (platform_fee_percent >= 0 AND platform_fee_percent <= 100),
  platform_fee_amount DECIMAL(12,2) NOT NULL CHECK (platform_fee_amount >= 0),
  seller_amount DECIMAL(12,2) NOT NULL CHECK (seller_amount >= 0),
  description TEXT NOT NULL CHECK (length(description) <= 1000),
  terms TEXT NOT NULL,
  escrow_period_days INTEGER NOT NULL DEFAULT 30 CHECK (escrow_period_days > 0),
  stripe_payment_intent_id VARCHAR(255),
  stripe_connect_account_id VARCHAR(255),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  
  -- Constraints
  CONSTRAINT escrow_buyer_seller_different CHECK (buyer_id != seller_id),
  CONSTRAINT escrow_amounts_consistent CHECK (platform_fee_amount + seller_amount = total_amount),
  CONSTRAINT escrow_expires_after_creation CHECK (expires_at > created_at)
);

-- Escrow Milestones Table
CREATE TABLE escrow_milestones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  escrow_id UUID NOT NULL REFERENCES escrow_transactions(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  status milestone_status NOT NULL DEFAULT 'pending',
  order_index INTEGER NOT NULL CHECK (order_index >= 0),
  due_date TIMESTAMPTZ,
  requires_approval BOOLEAN NOT NULL DEFAULT TRUE,
  completed_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  notes TEXT,
  attachments TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT milestone_completion_logic CHECK (
    (status != 'completed' AND completed_at IS NULL) OR
    (status = 'completed' AND completed_at IS NOT NULL)
  ),
  CONSTRAINT milestone_approval_logic CHECK (
    (status != 'approved' AND approved_at IS NULL) OR
    (status = 'approved' AND approved_at IS NOT NULL)
  ),
  UNIQUE (escrow_id, order_index)
);

-- Escrow Disputes Table
CREATE TABLE escrow_disputes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  escrow_id UUID NOT NULL REFERENCES escrow_transactions(id) ON DELETE CASCADE,
  milestone_id UUID REFERENCES escrow_milestones(id) ON DELETE SET NULL,
  initiator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  respondent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  arbitrator_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status dispute_status NOT NULL DEFAULT 'open',
  reason TEXT NOT NULL CHECK (length(reason) <= 1000),
  evidence TEXT[] DEFAULT '{}',
  requested_action VARCHAR(50) NOT NULL CHECK (requested_action IN ('refund', 'release', 'partial_refund', 'arbitration')),
  resolution TEXT,
  resolution_amount DECIMAL(12,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  
  -- Constraints
  CONSTRAINT dispute_initiator_respondent_different CHECK (initiator_id != respondent_id),
  CONSTRAINT dispute_resolution_logic CHECK (
    (status != 'resolved' AND resolved_at IS NULL AND resolution IS NULL) OR
    (status = 'resolved' AND resolved_at IS NOT NULL AND resolution IS NOT NULL)
  )
);

-- Escrow Documents Table
CREATE TABLE escrow_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  escrow_id UUID NOT NULL REFERENCES escrow_transactions(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  filename VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  type document_type NOT NULL,
  size_bytes INTEGER NOT NULL CHECK (size_bytes > 0),
  mime_type VARCHAR(100) NOT NULL,
  encryption_key VARCHAR(255) NOT NULL,
  storage_url TEXT NOT NULL,
  checksum VARCHAR(64) NOT NULL,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT document_expiry_logic CHECK (
    expires_at IS NULL OR expires_at > created_at
  )
);

-- Stripe Connect Accounts Table
CREATE TABLE stripe_connect_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_account_id VARCHAR(255) NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  has_completed_onboarding BOOLEAN NOT NULL DEFAULT FALSE,
  has_payouts_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  has_charges_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  capabilities TEXT[] DEFAULT '{}',
  country VARCHAR(2) NOT NULL DEFAULT 'US',
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- One Connect account per user
  UNIQUE (user_id)
);

-- Escrow Audit Logs Table
CREATE TABLE escrow_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  escrow_id UUID NOT NULL, -- Can reference system operations
  user_id UUID NOT NULL, -- Can be 'system' for automated actions
  action VARCHAR(100) NOT NULL,
  details JSONB NOT NULL DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_escrow_transactions_buyer_id ON escrow_transactions(buyer_id);
CREATE INDEX idx_escrow_transactions_seller_id ON escrow_transactions(seller_id);
CREATE INDEX idx_escrow_transactions_site_id ON escrow_transactions(site_id);
CREATE INDEX idx_escrow_transactions_status ON escrow_transactions(status);
CREATE INDEX idx_escrow_transactions_created_at ON escrow_transactions(created_at);
CREATE INDEX idx_escrow_transactions_expires_at ON escrow_transactions(expires_at);
CREATE INDEX idx_escrow_transactions_stripe_payment_intent ON escrow_transactions(stripe_payment_intent_id);

CREATE INDEX idx_escrow_milestones_escrow_id ON escrow_milestones(escrow_id);
CREATE INDEX idx_escrow_milestones_status ON escrow_milestones(status);
CREATE INDEX idx_escrow_milestones_due_date ON escrow_milestones(due_date);
CREATE INDEX idx_escrow_milestones_order ON escrow_milestones(escrow_id, order_index);

CREATE INDEX idx_escrow_disputes_escrow_id ON escrow_disputes(escrow_id);
CREATE INDEX idx_escrow_disputes_milestone_id ON escrow_disputes(milestone_id);
CREATE INDEX idx_escrow_disputes_initiator_id ON escrow_disputes(initiator_id);
CREATE INDEX idx_escrow_disputes_status ON escrow_disputes(status);
CREATE INDEX idx_escrow_disputes_created_at ON escrow_disputes(created_at);

CREATE INDEX idx_escrow_documents_escrow_id ON escrow_documents(escrow_id);
CREATE INDEX idx_escrow_documents_uploaded_by ON escrow_documents(uploaded_by);
CREATE INDEX idx_escrow_documents_type ON escrow_documents(type);
CREATE INDEX idx_escrow_documents_expires_at ON escrow_documents(expires_at);

CREATE INDEX idx_stripe_connect_accounts_user_id ON stripe_connect_accounts(user_id);
CREATE INDEX idx_stripe_connect_accounts_stripe_id ON stripe_connect_accounts(stripe_account_id);
CREATE INDEX idx_stripe_connect_accounts_active ON stripe_connect_accounts(is_active);

CREATE INDEX idx_escrow_audit_logs_escrow_id ON escrow_audit_logs(escrow_id);
CREATE INDEX idx_escrow_audit_logs_user_id ON escrow_audit_logs(user_id);
CREATE INDEX idx_escrow_audit_logs_action ON escrow_audit_logs(action);
CREATE INDEX idx_escrow_audit_logs_created_at ON escrow_audit_logs(created_at);

-- Create composite indexes for common queries
CREATE INDEX idx_escrow_user_status ON escrow_transactions(buyer_id, seller_id, status);
CREATE INDEX idx_milestones_escrow_status ON escrow_milestones(escrow_id, status);
CREATE INDEX idx_documents_escrow_public ON escrow_documents(escrow_id, is_public);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_escrow_transactions_updated_at 
  BEFORE UPDATE ON escrow_transactions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_escrow_milestones_updated_at 
  BEFORE UPDATE ON escrow_milestones 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_escrow_disputes_updated_at 
  BEFORE UPDATE ON escrow_disputes 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stripe_connect_accounts_updated_at 
  BEFORE UPDATE ON stripe_connect_accounts 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE escrow_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE escrow_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE escrow_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE escrow_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_connect_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE escrow_audit_logs ENABLE ROW LEVEL SECURITY;

-- Escrow Transactions Policies
CREATE POLICY "Users can view their own escrows" ON escrow_transactions
  FOR SELECT USING (
    auth.uid() = buyer_id OR 
    auth.uid() = seller_id OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'arbitrator')
    )
  );

CREATE POLICY "Buyers can create escrows" ON escrow_transactions
  FOR INSERT WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Parties can update their escrows" ON escrow_transactions
  FOR UPDATE USING (
    auth.uid() = buyer_id OR 
    auth.uid() = seller_id OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'arbitrator')
    )
  );

-- Escrow Milestones Policies
CREATE POLICY "Users can view milestones for their escrows" ON escrow_milestones
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM escrow_transactions et
      WHERE et.id = escrow_id AND (
        et.buyer_id = auth.uid() OR 
        et.seller_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE id = auth.uid() AND role IN ('admin', 'arbitrator')
        )
      )
    )
  );

CREATE POLICY "System can manage milestones" ON escrow_milestones
  FOR ALL USING (TRUE); -- Service role has full access

-- Escrow Disputes Policies
CREATE POLICY "Users can view disputes for their escrows" ON escrow_disputes
  FOR SELECT USING (
    auth.uid() = initiator_id OR 
    auth.uid() = respondent_id OR
    auth.uid() = arbitrator_id OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'arbitrator')
    )
  );

CREATE POLICY "Escrow parties can create disputes" ON escrow_disputes
  FOR INSERT WITH CHECK (
    auth.uid() = initiator_id AND
    EXISTS (
      SELECT 1 FROM escrow_transactions et
      WHERE et.id = escrow_id AND (
        et.buyer_id = auth.uid() OR et.seller_id = auth.uid()
      )
    )
  );

-- Escrow Documents Policies
CREATE POLICY "Users can view documents for their escrows" ON escrow_documents
  FOR SELECT USING (
    is_public = true OR
    auth.uid() = uploaded_by OR
    EXISTS (
      SELECT 1 FROM escrow_transactions et
      WHERE et.id = escrow_id AND (
        et.buyer_id = auth.uid() OR 
        et.seller_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE id = auth.uid() AND role IN ('admin', 'arbitrator')
        )
      )
    )
  );

CREATE POLICY "Escrow parties can upload documents" ON escrow_documents
  FOR INSERT WITH CHECK (
    auth.uid() = uploaded_by AND
    EXISTS (
      SELECT 1 FROM escrow_transactions et
      WHERE et.id = escrow_id AND (
        et.buyer_id = auth.uid() OR et.seller_id = auth.uid()
      )
    )
  );

-- Stripe Connect Accounts Policies
CREATE POLICY "Users can view their own Connect accounts" ON stripe_connect_accounts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own Connect accounts" ON stripe_connect_accounts
  FOR ALL USING (auth.uid() = user_id);

-- Escrow Audit Logs Policies (Read-only for users, full access for service)
CREATE POLICY "Users can view audit logs for their escrows" ON escrow_audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM escrow_transactions et
      WHERE et.id = escrow_id::uuid AND (
        et.buyer_id = auth.uid() OR 
        et.seller_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE id = auth.uid() AND role IN ('admin', 'arbitrator')
        )
      )
    ) OR
    escrow_id IN ('system', 'webhook_system', 'security_system')
  );

-- Create functions for escrow business logic

-- Function to check if all milestones are completed
CREATE OR REPLACE FUNCTION check_escrow_completion(escrow_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  total_milestones INTEGER;
  completed_milestones INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_milestones
  FROM escrow_milestones
  WHERE escrow_id = escrow_uuid;
  
  SELECT COUNT(*) INTO completed_milestones
  FROM escrow_milestones
  WHERE escrow_id = escrow_uuid AND status = 'completed';
  
  RETURN total_milestones > 0 AND total_milestones = completed_milestones;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate escrow metrics
CREATE OR REPLACE FUNCTION get_escrow_metrics(
  start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_escrows', COUNT(*),
    'completed_escrows', COUNT(*) FILTER (WHERE status = 'completed'),
    'disputed_escrows', COUNT(*) FILTER (WHERE status IN ('dispute', 'arbitration')),
    'total_volume', COALESCE(SUM(total_amount), 0),
    'platform_fees', COALESCE(SUM(platform_fee_amount), 0),
    'average_escrow_amount', COALESCE(AVG(total_amount), 0),
    'completion_rate', 
      CASE 
        WHEN COUNT(*) > 0 THEN 
          ROUND((COUNT(*) FILTER (WHERE status = 'completed')::NUMERIC / COUNT(*)) * 100, 2)
        ELSE 0
      END
  ) INTO result
  FROM escrow_transactions
  WHERE created_at BETWEEN start_date AND end_date;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user escrow summary
CREATE OR REPLACE FUNCTION get_user_escrow_summary(user_uuid UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'as_buyer', json_build_object(
      'total_escrows', COUNT(*) FILTER (WHERE buyer_id = user_uuid),
      'active_escrows', COUNT(*) FILTER (WHERE buyer_id = user_uuid AND status IN ('funded', 'in_progress')),
      'completed_escrows', COUNT(*) FILTER (WHERE buyer_id = user_uuid AND status = 'completed'),
      'total_spent', COALESCE(SUM(total_amount) FILTER (WHERE buyer_id = user_uuid AND status = 'completed'), 0)
    ),
    'as_seller', json_build_object(
      'total_escrows', COUNT(*) FILTER (WHERE seller_id = user_uuid),
      'active_escrows', COUNT(*) FILTER (WHERE seller_id = user_uuid AND status IN ('funded', 'in_progress')),
      'completed_escrows', COUNT(*) FILTER (WHERE seller_id = user_uuid AND status = 'completed'),
      'total_earned', COALESCE(SUM(seller_amount) FILTER (WHERE seller_id = user_uuid AND status = 'completed'), 0)
    )
  ) INTO result
  FROM escrow_transactions;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create views for common queries

-- Active escrows view
CREATE VIEW active_escrows AS
SELECT 
  et.*,
  bp.email as buyer_email,
  sp.email as seller_email,
  COUNT(em.id) as total_milestones,
  COUNT(em.id) FILTER (WHERE em.status = 'completed') as completed_milestones,
  COUNT(ed.id) FILTER (WHERE ed.status IN ('open', 'investigating', 'arbitration')) as active_disputes
FROM escrow_transactions et
LEFT JOIN profiles bp ON et.buyer_id = bp.id
LEFT JOIN profiles sp ON et.seller_id = sp.id
LEFT JOIN escrow_milestones em ON et.id = em.escrow_id
LEFT JOIN escrow_disputes ed ON et.id = ed.escrow_id
WHERE et.status IN ('funded', 'in_progress', 'dispute', 'arbitration')
GROUP BY et.id, bp.email, sp.email;

-- Overdue milestones view
CREATE VIEW overdue_milestones AS
SELECT 
  em.*,
  et.buyer_id,
  et.seller_id,
  et.total_amount as escrow_amount
FROM escrow_milestones em
JOIN escrow_transactions et ON em.escrow_id = et.id
WHERE em.due_date < NOW()
  AND em.status IN ('pending', 'in_progress')
  AND et.status IN ('funded', 'in_progress');

-- Grant permissions to service role
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Grant appropriate permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON escrow_transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON escrow_milestones TO authenticated;
GRANT SELECT, INSERT, UPDATE ON escrow_disputes TO authenticated;
GRANT SELECT, INSERT, UPDATE ON escrow_documents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON stripe_connect_accounts TO authenticated;
GRANT SELECT ON escrow_audit_logs TO authenticated;

-- Insert default admin profile if it doesn't exist (for testing)
INSERT INTO profiles (id, email, role, created_at, updated_at)
VALUES (
  'system-admin-uuid'::uuid,
  'admin@affiliatefactory.com',
  'admin',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE escrow_transactions IS 'Main escrow transactions table storing all escrow agreements';
COMMENT ON TABLE escrow_milestones IS 'Milestones for escrow transactions with payment releases';
COMMENT ON TABLE escrow_disputes IS 'Dispute management for escrow transactions';
COMMENT ON TABLE escrow_documents IS 'Encrypted document storage for escrow due diligence';
COMMENT ON TABLE stripe_connect_accounts IS 'Stripe Connect account information for sellers';
COMMENT ON TABLE escrow_audit_logs IS 'Comprehensive audit trail for all escrow operations';

COMMENT ON COLUMN escrow_transactions.platform_fee_percent IS 'Platform fee percentage (0-100)';
COMMENT ON COLUMN escrow_transactions.escrow_period_days IS 'Number of days before escrow expires';
COMMENT ON COLUMN escrow_milestones.requires_approval IS 'Whether milestone completion requires buyer approval';
COMMENT ON COLUMN escrow_documents.encryption_key IS 'AES encryption key for document content';
COMMENT ON COLUMN escrow_documents.checksum IS 'SHA-256 checksum for document integrity verification';

-- Create notification triggers (would integrate with notification system)
CREATE OR REPLACE FUNCTION notify_escrow_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- This would integrate with a notification service
  -- For now, just log the change
  INSERT INTO escrow_audit_logs (escrow_id, user_id, action, details)
  VALUES (
    NEW.id::text,
    'system',
    'STATUS_CHANGED',
    json_build_object(
      'old_status', COALESCE(OLD.status::text, 'null'),
      'new_status', NEW.status::text,
      'changed_at', NOW()
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER escrow_status_change_trigger
  AFTER UPDATE OF status ON escrow_transactions
  FOR EACH ROW
  EXECUTE FUNCTION notify_escrow_status_change();

-- Final validation
DO $$
BEGIN
  ASSERT (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'escrow_%') >= 5,
    'Not all escrow tables were created successfully';
  
  ASSERT (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public' AND indexname LIKE 'idx_escrow_%') >= 10,
    'Not all escrow indexes were created successfully';
    
  RAISE NOTICE 'Escrow system migration completed successfully!';
END $$;