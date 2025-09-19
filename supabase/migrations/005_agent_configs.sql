-- Create agent_configs table for storing per-tenant agent configurations
CREATE TABLE IF NOT EXISTS agent_configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  agent_name VARCHAR(100) NOT NULL,
  enabled BOOLEAN DEFAULT true,
  automation_level VARCHAR(20) DEFAULT 'full' CHECK (automation_level IN ('full', 'supervised', 'manual')),
  schedule_type VARCHAR(20) DEFAULT 'cron' CHECK (schedule_type IN ('cron', 'interval', 'manual')),
  schedule_value TEXT,
  priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
  max_retries INTEGER DEFAULT 3 CHECK (max_retries >= 0 AND max_retries <= 10),
  timeout INTEGER DEFAULT 300 CHECK (timeout >= 30 AND timeout <= 3600),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, agent_name)
);

-- Create indexes for performance
CREATE INDEX idx_agent_configs_tenant ON agent_configs(tenant_id);
CREATE INDEX idx_agent_configs_enabled ON agent_configs(tenant_id, enabled);
CREATE INDEX idx_agent_configs_automation ON agent_configs(tenant_id, automation_level);

-- Add RLS policies
ALTER TABLE agent_configs ENABLE ROW LEVEL SECURITY;

-- Policy for managing tenant's agent configs (simplified for now)
CREATE POLICY "Manage agent configs"
  ON agent_configs
  FOR ALL
  USING (true);

-- Create system_health table for self-healing orchestrator
CREATE TABLE IF NOT EXISTS system_health (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  overall_status VARCHAR(20) CHECK (overall_status IN ('optimal', 'degraded', 'critical')),
  agent_metrics JSONB,
  database_metrics JSONB,
  api_metrics JSONB,
  active_recoveries INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create system_recoveries table for tracking recovery actions
CREATE TABLE IF NOT EXISTS system_recoveries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action_type VARCHAR(50),
  target TEXT,
  params JSONB,
  confidence DECIMAL(3,2),
  status VARCHAR(20) DEFAULT 'pending',
  error TEXT,
  executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create system_alerts table for critical issues
CREATE TABLE IF NOT EXISTS system_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  severity VARCHAR(20) CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  message TEXT,
  error TEXT,
  requires_manual_intervention BOOLEAN DEFAULT false,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create agent_health table for tracking agent status
CREATE TABLE IF NOT EXISTS agent_health (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_name VARCHAR(100) NOT NULL,
  status VARCHAR(20),
  last_restart TIMESTAMPTZ,
  consecutive_failures INTEGER DEFAULT 0,
  last_success TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agent_name)
);

-- Create escalations table for issue tracking
CREATE TABLE IF NOT EXISTS escalations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  original_action JSONB,
  error TEXT,
  escalation_level INTEGER DEFAULT 1,
  assigned_to VARCHAR(100),
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for monitoring tables
CREATE INDEX idx_system_health_timestamp ON system_health(timestamp DESC);
CREATE INDEX idx_system_recoveries_status ON system_recoveries(status, created_at);
CREATE INDEX idx_system_alerts_unresolved ON system_alerts(resolved, severity, created_at);
CREATE INDEX idx_agent_health_name ON agent_health(agent_name);
CREATE INDEX idx_escalations_unresolved ON escalations(resolved, escalation_level);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_agent_configs_updated_at
  BEFORE UPDATE ON agent_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_health_updated_at
  BEFORE UPDATE ON agent_health
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();