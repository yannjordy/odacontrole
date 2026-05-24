const { createClient } = require('@supabase/supabase-js');
const logger = require('../services/logger');

let client = null;

function getDb() {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL et SUPABASE_SERVICE_KEY requis dans .env');
  client = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  logger.info('Connexion Supabase établie');
  return client;
}

async function createLead(data) {
  const db = getDb();
  const { data: lead, error } = await db.from('leads').insert({
    full_name: data.full_name,
    phone: data.phone,
    email: data.email,
    city: data.city,
    business_name: data.business_name,
    business_type: data.business_type,
    source: data.source || 'research',
    status: 'new',
    notes: data.notes,
  }).select().single();
  if (error) throw error;
  logger.info(`Lead créé: ${lead.full_name || lead.phone}`, { lead_id: lead.id });
  return lead;
}

async function updateLeadStatus(id, status, extra = {}) {
  const db = getDb();
  const { error } = await db.from('leads').update({ status, updated_at: new Date().toISOString(), ...extra }).eq('id', id);
  if (error) throw error;
  logger.info(`Lead ${id} → ${status}`);
}

async function createAgentRun(agentId, input = {}) {
  const db = getDb();
  const { data, error } = await db.from('agent_runs').insert({
    agent_id: agentId,
    status: 'running',
    input_data: input,
    started_at: new Date().toISOString(),
  }).select().single();
  if (error) throw error;
  return data;
}

async function completeAgentRun(runId, status, output = {}, errorMsg = null) {
  const db = getDb();
  const update = {
    status,
    completed_at: new Date().toISOString(),
    output_data: output,
    error: errorMsg,
    duration_ms: Date.now() - new Date(output._started_at || Date.now()).getTime(),
  };
  delete update.output._started_at;
  const { error } = await db.from('agent_runs').update(update).eq('id', runId);
  if (error) throw error;
}

async function logAudit(agentId, action, details = {}, severity = 'info') {
  const db = getDb();
  const { error } = await db.from('audit_logs').insert({
    agent_id: agentId,
    action,
    entity_type: details.entity_type,
    entity_id: details.entity_id,
    details,
    severity,
  });
  if (error) logger.error('Erreur audit log:', error.message);
}

module.exports = { getDb, createLead, updateLeadStatus, createAgentRun, completeAgentRun, logAudit };
