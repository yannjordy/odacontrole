import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  try {
    const { action, severity, agent_key, entity_type, entity_id, details } = await req.json();
    if (!action || !severity) {
      return NextResponse.json({ error: 'action et severity requis' }, { status: 400 });
    }

    let agent_id = null;
    if (agent_key) {
      const { data: agent } = await supabase.from('agents').select('id').eq('key', agent_key).single();
      if (agent) agent_id = agent.id;
    }

    const { data, error } = await supabase.from('audit_logs').insert({
      action,
      severity,
      agent_id,
      entity_type: entity_type || null,
      entity_id: entity_id || null,
      details: details || null,
    }).select().single();

    if (error) {
      console.error('Log insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, log: data });
  } catch (err) {
    console.error('Logs API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
