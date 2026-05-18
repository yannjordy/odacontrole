import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const API_KEY = process.env.OPENROUTER_API_KEY;
const MODELS = [
  'liquid/lfm-2.5-1.2b-instruct:free',
  'nvidia/nemotron-3-nano-30b-a3b:free',
  'nvidia/nemotron-nano-12b-v2-vl:free',
];

async function writeLog({ action, severity, agent_key, details }) {
  try {
    let agent_id = null;
    if (agent_key) {
      const { data: agent } = await supabase.from('agents').select('id').eq('key', agent_key).single();
      if (agent) agent_id = agent.id;
    }
    await supabase.from('audit_logs').insert({ action, severity, agent_id, details });
  } catch (e) {
    console.error('Failed to write log:', e);
  }
}

async function tryModel(model, system, message) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
      'HTTP-Referer': 'https://odacontrol.vercel.app',
      'X-Title': 'ODAControl',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: message },
      ],
      stream: false,
      max_tokens: 1024,
      temperature: 0.7,
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    const isRateLimit = res.status === 429;
    return { error: errText, status: res.status, isRateLimit };
  }
  const data = await res.json();
  const reply = data.choices?.[0]?.message?.content?.trim();
  if (!reply) return { error: 'Réponse vide', status: 502 };
  return { reply, model: data.model, tokens: data.usage?.total_tokens };
}

export async function POST(req) {
  try {
    const { message } = await req.json();
    if (!message) return NextResponse.json({ error: 'Message requis' }, { status: 400 });

    if (!API_KEY) {
      await writeLog({ action: 'chat_error', severity: 'critical', agent_key: 'orchestrator', details: { error: 'OPENROUTER_API_KEY manquante' } });
      return NextResponse.json({ error: 'Clé API OpenRouter manquante. Ajoutez OPENROUTER_API_KEY dans .env.local' }, { status: 500 });
    }

    const system = `Tu es DeerFlow, orchestrateur du système multi-agents ODAControl au Cameroun.

Agents : Sarah (recherche), Marc (contact WhatsApp), Fatou (onboarding), Koffi (comptes), Awa (publication), Yann (suivi WhatsApp), Paul (supervision qualité), Eve (marketing).

Règles : réponds en français, sois concis (2-4 paragraphes), aide sur le technique si demandé.`;

    let lastErr = null;
    for (const model of MODELS) {
      const result = await tryModel(model, system, message);
      if (result.reply) {
        await writeLog({ action: 'chat_reply', severity: 'info', agent_key: 'orchestrator', details: { model: result.model, tokens: result.tokens } });
        return NextResponse.json({ reply: result.reply });
      }
      lastErr = result;
      if (!result.isRateLimit) break;
    }

    await writeLog({ action: 'openrouter_error', severity: 'error', agent_key: 'orchestrator', details: { error: lastErr?.error?.slice(0, 200), status: lastErr?.status } });
    return NextResponse.json({ error: `OpenRouter: ${lastErr?.status || 'inconnu'}` }, { status: 502 });
  } catch (err) {
    await writeLog({ action: 'chat_crash', severity: 'critical', agent_key: 'orchestrator', details: { error: err.message } });
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
