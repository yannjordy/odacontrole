import { NextResponse } from 'next/server';
import { getAdminClient, verifierAdmin } from '@/lib/admin';

export async function GET(req) {
  try {
    const adminId = req.headers.get('x-admin-id');
    if (!adminId || !(await verifierAdmin(adminId))) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    const supabase = getAdminClient();
    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'list';

    if (action === 'list') {
      const { data: agents } = await supabase.from('agents').select('*').order('created_at', { ascending: false });
      return NextResponse.json({ agents: agents || [] });
    }

    if (action === 'runs') {
      const agentId = url.searchParams.get('agent_id');
      let q = supabase.from('agent_runs').select('*, agents(name)').order('started_at', { ascending: false }).limit(50);
      if (agentId) q = q.eq('agent_id', agentId);
      const { data: runs } = await q;
      return NextResponse.json({ runs: runs || [] });
    }

    if (action === 'stats') {
      const { data: agents } = await supabase.from('agents').select('status');
      const { data: leads } = await supabase.from('leads').select('status');
      const { data: shops } = await supabase.from('shops').select('status');
      const { data: recentRuns } = await supabase.from('agent_runs').select('*').order('started_at', { ascending: false }).limit(10);

      const agentStats = { idle: 0, running: 0, failed: 0, paused: 0, success: 0 };
      (agents || []).forEach(a => { if (agentStats[a.status] !== undefined) agentStats[a.status]++; });

      const leadStats = {};
      (leads || []).forEach(l => { leadStats[l.status] = (leadStats[l.status] || 0) + 1; });

      const shopStats = { pending: 0, active: 0, suspended: 0 };
      (shops || []).forEach(s => { if (shopStats[s.status] !== undefined) shopStats[s.status]++; });

      return NextResponse.json({ agents: agentStats, leads: leadStats, shops: shopStats, recentRuns: recentRuns || [] });
    }

    return NextResponse.json({ error: 'Action inconnue' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const adminId = req.headers.get('x-admin-id');
    if (!adminId || !(await verifierAdmin(adminId))) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    const supabase = getAdminClient();
    const body = await req.json();
    const { action, agent_id, config } = body;

    if (action === 'run') {
      if (!agent_id) return NextResponse.json({ error: 'agent_id requis' }, { status: 400 });

      const { data: agent } = await supabase.from('agents').select('*').eq('id', agent_id).single();
      if (!agent) return NextResponse.json({ error: 'Agent introuvable' }, { status: 404 });

      // Mark agent as running
      await supabase.from('agents').update({ status: 'running', last_run_at: new Date().toISOString() }).eq('id', agent_id);

      // Create run record
      const { data: run } = await supabase.from('agent_runs').insert({
        agent_id,
        status: 'running',
        input_data: config || {},
        started_at: new Date().toISOString(),
      }).select().single();

      // Simulate agent execution
      const startTime = Date.now();
      const success = Math.random() > 0.2;
      const duration = 2000 + Math.random() * 3000;

      await new Promise(r => setTimeout(r, duration));

      const result = success
        ? { status: 'success', output_data: { message: `Agent ${agent.name} exécuté avec succès`, tasks_completed: Math.floor(Math.random() * 5) + 1 } }
        : { status: 'failed', error: 'Erreur lors de l\'exécution de l\'agent' };

      await supabase.from('agent_runs').update({
        status: result.status,
        completed_at: new Date().toISOString(),
        duration_ms: Date.now() - startTime,
        output_data: result.output_data || null,
        error: result.error || null,
      }).eq('id', run.id);

      await supabase.from('agents').update({
        status: result.status === 'success' ? 'success' : 'failed',
        total_runs: (agent.total_runs || 0) + 1,
        success_count: (agent.success_count || 0) + (result.status === 'success' ? 1 : 0),
        error_count: (agent.error_count || 0) + (result.status === 'failed' ? 1 : 0),
      }).eq('id', agent_id);

      // Log
      await supabase.from('audit_logs').insert({
        agent_id,
        action: `agent_execute_${result.status}`,
        entity_type: 'agent',
        entity_id: agent_id,
        details: { agent_name: agent.name, duration_ms: Date.now() - startTime },
        severity: result.status === 'success' ? 'info' : 'error',
        created_by: adminId,
      });

      return NextResponse.json({ success: true, run: { ...run, ...result }, agent: agent.name });
    }

    if (action === 'create') {
      const { name, type, description, prompt_template } = body;
      if (!name || !type) return NextResponse.json({ error: 'name et type requis' }, { status: 400 });

      const { data, error } = await supabase.from('agents').insert({
        name, type, description: description || '', prompt_template: prompt_template || '',
        config: {}, status: 'idle', created_by: adminId,
      }).select().single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, agent: data });
    }

    if (action === 'toggle') {
      if (!agent_id) return NextResponse.json({ error: 'agent_id requis' }, { status: 400 });

      const { data: agent } = await supabase.from('agents').select('status').eq('id', agent_id).single();
      if (!agent) return NextResponse.json({ error: 'Agent introuvable' }, { status: 404 });

      const newStatus = agent.status === 'running' ? 'paused' : 'running';
      await supabase.from('agents').update({ status: newStatus }).eq('id', agent_id);

      return NextResponse.json({ success: true, status: newStatus, agent_id });
    }

    if (action === 'delete') {
      if (!agent_id) return NextResponse.json({ error: 'agent_id requis' }, { status: 400 });
      await supabase.from('agent_runs').delete().eq('agent_id', agent_id);
      await supabase.from('agents').delete().eq('id', agent_id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Action inconnue' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
