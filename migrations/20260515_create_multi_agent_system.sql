-- Migration ODAControl - Système multi-agents (exécuter chaque section séparément)
-- Copie et exécute UNE SEULE section à la fois dans Supabase SQL Editor

-- ========== SECTION 1/5 : TABLES PRINCIPALES ==========
CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('orchestrator','supervisor','research','contact','onboarding','account_creation','product_publishing','whatsapp_followup','marketing_optimization')),
  status TEXT NOT NULL DEFAULT 'idle' CHECK (status IN ('idle','running','waiting','retrying','success','failed','paused')),
  prompt_template TEXT,
  config JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_run_at TIMESTAMPTZ,
  total_runs INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  workflow_id UUID,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running','success','failed','cancelled')),
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  input_data JSONB DEFAULT '{}'::jsonb,
  output_data JSONB DEFAULT '{}'::jsonb,
  error TEXT,
  logs JSONB DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','paused','completed','failed')),
  steps JSONB DEFAULT '[]'::jsonb,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workflow_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id),
  step_order INTEGER NOT NULL,
  name TEXT,
  config JSONB DEFAULT '{}'::jsonb,
  depends_on UUID[] DEFAULT ARRAY[]::UUID[],
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','running','success','failed','skipped'))
);


-- ========== SECTION 2/5 : LEADS & PIPELINE ==========
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT,
  phone TEXT NOT NULL,
  email TEXT,
  city TEXT,
  business_name TEXT,
  business_type TEXT,
  source TEXT DEFAULT 'whatsapp' CHECK (source IN ('whatsapp','manual','referral','research','other')),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','consented','onboarding','shop_created','products_published','validated','rejected','inactive')),
  consent_given BOOLEAN DEFAULT false,
  consent_date TIMESTAMPTZ,
  consent_document_url TEXT,
  notes TEXT,
  assigned_agent_id UUID REFERENCES agents(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_contact_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS contact_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp','sms','call','email')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','delivered','read','replied','failed')),
  message_content TEXT,
  agent_id UUID REFERENCES agents(id),
  sent_at TIMESTAMPTZ DEFAULT now(),
  replied_at TIMESTAMPTZ,
  response_data JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL CHECK (consent_type IN ('gdpr','terms','marketing','data_sharing')),
  granted BOOLEAN NOT NULL DEFAULT true,
  ip_address TEXT,
  user_agent TEXT,
  recorded_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS onboarding_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  step INTEGER DEFAULT 0,
  max_steps INTEGER DEFAULT 6,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','completed','abandoned')),
  data JSONB DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  abandoned_at TIMESTAMPTZ
);


-- ========== SECTION 3/5 : BOUTIQUES, WHATSAPP & DISTRIBUTION ==========
CREATE TABLE IF NOT EXISTS shops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id),
  seller_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  description TEXT,
  logo_url TEXT,
  cover_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','suspended','rejected','inactive')),
  validation_status TEXT DEFAULT 'pending' CHECK (validation_status IN ('pending','approved','rejected')),
  validated_by UUID REFERENCES auth.users(id),
  validated_at TIMESTAMPTZ,
  products_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('outbound','inbound')),
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text','image','template','interactive','document')),
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  template_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','delivered','read','failed')),
  whatsapp_message_id TEXT,
  sent_at TIMESTAMPTZ DEFAULT now(),
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  cost DECIMAL(10,4) DEFAULT 0
);

CREATE TABLE IF NOT EXISTS distribution_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  app_type TEXT NOT NULL CHECK (app_type IN ('oda_market','oda_seller','oda_control')),
  target_url TEXT NOT NULL,
  qr_code_url TEXT,
  short_link TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','active','paused','completed')),
  channels JSONB DEFAULT '[]'::jsonb,
  total_clicks INTEGER DEFAULT 0,
  total_installs INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);


-- ========== SECTION 4/5 : AUDIT, METRIQUES & INDEXES ==========
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id),
  workflow_id UUID REFERENCES workflows(id),
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  severity TEXT DEFAULT 'info' CHECK (severity IN ('info','warning','error','critical')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name TEXT NOT NULL,
  metric_value DECIMAL(15,2) NOT NULL,
  metric_unit TEXT DEFAULT 'count',
  tags JSONB DEFAULT '{}'::jsonb,
  agent_id UUID REFERENCES agents(id),
  recorded_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone);
CREATE INDEX IF NOT EXISTS idx_agents_type ON agents(type);
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_agent_runs_agent ON agent_runs(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_runs_status ON agent_runs(status);
CREATE INDEX IF NOT EXISTS idx_workflows_status ON workflows(status);
CREATE INDEX IF NOT EXISTS idx_shops_status ON shops(status);
CREATE INDEX IF NOT EXISTS idx_shops_seller ON shops(seller_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_lead ON whatsapp_messages(lead_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_metrics_name ON metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_metrics_recorded ON metrics(recorded_at);


-- ========== SECTION 5/5 : TRIGGERS UPDATED_AT ==========
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_workflows_updated_at BEFORE UPDATE ON workflows FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_shops_updated_at BEFORE UPDATE ON shops FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_distribution_campaigns_updated_at BEFORE UPDATE ON distribution_campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
