import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function GET(req) {
  try {
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // First test basic connectivity
    const { data: health, error: healthErr } = await admin.from('_health').select('*').limit(1).maybeSingle();
    const connectionTest = healthErr ? `no_access (${healthErr.message || JSON.stringify(healthErr)})` : 'ok';
    const tables = ['agents','agent_runs','workflows','workflow_steps','leads','contact_attempts','consent_records','onboarding_sessions','shops','whatsapp_messages','distribution_campaigns','audit_logs','metrics'];
    const status = {};

    for (const table of tables) {
      try {
        const res = await admin.from(table).select('*', { count: 'exact', head: true });
        const { count, error, status: s } = res;
        if (error) {
          status[table] = `manquante (${error.message || JSON.stringify(error)} | http:${s})`;
        } else {
          status[table] = `OK (${count} lignes)`;
        }
      } catch (e) {
        status[table] = `manquante (${e?.message || e?.code || JSON.stringify(e).slice(0,120) || '?'})`;
      }
    }

    return NextResponse.json({ tables: status });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
