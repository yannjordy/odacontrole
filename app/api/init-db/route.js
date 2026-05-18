import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SQL = `
CREATE TABLE IF NOT EXISTS agents (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, type TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'idle', config JSONB DEFAULT '{}'::jsonb, created_by UUID REFERENCES auth.users(id), created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now(), total_runs INTEGER DEFAULT 0, success_count INTEGER DEFAULT 0, error_count INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS agent_runs (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), agent_id UUID REFERENCES agents(id) ON DELETE CASCADE, status TEXT NOT NULL DEFAULT 'running', started_at TIMESTAMPTZ DEFAULT now(), completed_at TIMESTAMPTZ, duration_ms INTEGER, input_data JSONB DEFAULT '{}'::jsonb, output_data JSONB DEFAULT '{}'::jsonb, error TEXT);
CREATE TABLE IF NOT EXISTS workflows (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'draft', steps JSONB DEFAULT '[]'::jsonb, created_by UUID REFERENCES auth.users(id), created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now());
CREATE TABLE IF NOT EXISTS workflow_steps (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE, agent_id UUID REFERENCES agents(id), step_order INTEGER NOT NULL, name TEXT, config JSONB DEFAULT '{}'::jsonb, depends_on UUID[] DEFAULT ARRAY[]::UUID[], status TEXT DEFAULT 'pending');
CREATE TABLE IF NOT EXISTS leads (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), full_name TEXT, phone TEXT NOT NULL, email TEXT, city TEXT, business_name TEXT, business_type TEXT, source TEXT DEFAULT 'whatsapp', status TEXT NOT NULL DEFAULT 'new', consent_given BOOLEAN DEFAULT false, consent_date TIMESTAMPTZ, notes TEXT, assigned_agent_id UUID REFERENCES agents(id), created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now(), last_contact_at TIMESTAMPTZ);
CREATE TABLE IF NOT EXISTS contact_attempts (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), lead_id UUID REFERENCES leads(id) ON DELETE CASCADE, channel TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', message_content TEXT, agent_id UUID REFERENCES agents(id), sent_at TIMESTAMPTZ DEFAULT now());
CREATE TABLE IF NOT EXISTS consent_records (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), lead_id UUID REFERENCES leads(id) ON DELETE CASCADE, consent_type TEXT NOT NULL, granted BOOLEAN NOT NULL DEFAULT true, ip_address TEXT, user_agent TEXT, recorded_at TIMESTAMPTZ DEFAULT now(), expires_at TIMESTAMPTZ);
CREATE TABLE IF NOT EXISTS onboarding_sessions (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), lead_id UUID REFERENCES leads(id) ON DELETE CASCADE, user_id UUID REFERENCES auth.users(id), step INTEGER DEFAULT 0, max_steps INTEGER DEFAULT 6, status TEXT NOT NULL DEFAULT 'in_progress', data JSONB DEFAULT '{}'::jsonb, started_at TIMESTAMPTZ DEFAULT now(), completed_at TIMESTAMPTZ);
CREATE TABLE IF NOT EXISTS shops (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), lead_id UUID REFERENCES leads(id), seller_id UUID REFERENCES auth.users(id), name TEXT NOT NULL, slug TEXT UNIQUE, description TEXT, logo_url TEXT, cover_url TEXT, status TEXT NOT NULL DEFAULT 'pending', validation_status TEXT DEFAULT 'pending', validated_by UUID REFERENCES auth.users(id), validated_at TIMESTAMPTZ, products_count INTEGER DEFAULT 0, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now());
CREATE TABLE IF NOT EXISTS whatsapp_messages (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), lead_id UUID REFERENCES leads(id) ON DELETE CASCADE, direction TEXT NOT NULL, message_type TEXT DEFAULT 'text', content JSONB NOT NULL DEFAULT '{}'::jsonb, template_name TEXT, status TEXT NOT NULL DEFAULT 'pending', sent_at TIMESTAMPTZ DEFAULT now(), delivered_at TIMESTAMPTZ, read_at TIMESTAMPTZ, cost DECIMAL(10,4) DEFAULT 0);
CREATE TABLE IF NOT EXISTS distribution_campaigns (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, app_type TEXT NOT NULL, target_url TEXT NOT NULL, status TEXT DEFAULT 'draft', channels JSONB DEFAULT '[]'::jsonb, total_clicks INTEGER DEFAULT 0, total_installs INTEGER DEFAULT 0, created_by UUID REFERENCES auth.users(id), created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now());
CREATE TABLE IF NOT EXISTS audit_logs (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), agent_id UUID REFERENCES agents(id), workflow_id UUID REFERENCES workflows(id), action TEXT NOT NULL, entity_type TEXT, entity_id TEXT, details JSONB DEFAULT '{}'::jsonb, severity TEXT DEFAULT 'info', created_by UUID REFERENCES auth.users(id), created_at TIMESTAMPTZ DEFAULT now());
CREATE TABLE IF NOT EXISTS metrics (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), metric_name TEXT NOT NULL, metric_value DECIMAL(15,2) NOT NULL, tags JSONB DEFAULT '{}'::jsonb, agent_id UUID REFERENCES agents(id), recorded_at TIMESTAMPTZ DEFAULT now());
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_agents_type ON agents(type);
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_shops_status ON shops(status);
`.trim();

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const dbPass = process.env.SUPABASE_DB_PASSWORD;
  const ref = url?.replace('https://', '').replace('.supabase.co', '');

  if (dbPass && ref) {
    try {
      const { default: { Client } } = await import('pg');
      const client = new Client({
        host: `db.${ref}.supabase.co`,
        port: 5432,
        database: 'postgres',
        user: 'postgres',
        password: dbPass,
        connectionTimeoutMillis: 8000,
      });
      await client.connect();
      await client.query(SQL);
      await client.end();
      return NextResponse.json({ success: true, method: 'direct' });
    } catch (err) {
      return NextResponse.json({ error: `Échec connexion DB: ${err.message.slice(0, 100)}`, hint: 'Vérifie SUPABASE_DB_PASSWORD dans .env.local', sql: SQL, method: 'manual' }, { status: 400 });
    }
  }

  return NextResponse.json({
    error: 'SUPABASE_DB_PASSWORD manquant',
    hint: `Ajoute SUPABASE_DB_PASSWORD dans .env.local (trouvé dans Supabase > Settings > Database)`,
    sql: SQL,
    method: 'manual',
  }, { status: 400 });
}
