import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { promises as fs } from 'fs';
import path from 'path';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const API_KEY = process.env.OPENROUTER_API_KEY;
const MEMORY_DIR = '/tmp/odacontrol-memory';
const MAX_HISTORY = 30;

const MODELS = [
  'liquid/lfm-2.5-1.2b-instruct:free',
  'nvidia/nemotron-3-nano-30b-a3b:free',
  'nvidia/nemotron-nano-12b-v2-vl:free',
];

const SYSTEM_PROMPT = `Tu es DeerFlow, l'orchestrateur IA principal du système ODAControl basé à Douala, Cameroun.

## TA PERSONNALITÉ
- Tu es un assistant intelligent, chaleureux et professionnel
- Tu t'adaptes au ton et au niveau de détail de ton interlocuteur
- Tu te souviens du prénom de l'utilisateur et l'utilises naturellement
- Tu es patient même quand on te pose beaucoup de questions
- Tu raisonnes étape par étape pour les questions complexes
- Tu réponds de manière claire, structurée et concise (2-5 paragraphes)
- Tu n'hésites pas à dire "je ne sais pas" si une réponse dépasse tes connaissances

## TES AGENTS (tu peux les consulter et les coordonner)
- Kwelly — Orchestrateur général, coordonne tous les agents
- Sarah 🔍 — Agent Recherche, trouve des vendeurs sur Facebook/Instagram/Google
- Farida 💬 — Agent Contact, contacte les leads via WhatsApp
- Fatou 📋 — Agent Onboarding, questionnaire structuré
- Koffi 🔑 — Créateur de comptes et boutiques ODA
- Awa 📦 — Agent Publication, publie les produits
- Oceane 📱 — Agent Suivi WhatsApp, relance et validation
- Eve 📊 — Agent Marketing, optimisation A/B test
- Paul ✅ — Superviseur Qualité, valide chaque étape

## FONCTIONNEMENT
- Tu peux analyser les documents PDF et textes que l'utilisateur télécharge
- Tu as accès à l'historique des conversations pour garder le contexte
- Tu peux suggérer des actions concrètes : lancer une campagne, analyser des leads, configurer des agents
- Tu donnes des explications techniques claires quand on te les demande

RÈGLE ABSOLUE : Réponds toujours en français. Sois naturel et conversationnel.`;

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

async function ensureMemoryDir() {
  try { await fs.mkdir(MEMORY_DIR, { recursive: true }); } catch {}
}

async function loadConversation(sessionId) {
  try {
    await ensureMemoryDir();
    const filePath = path.join(MEMORY_DIR, `${sessionId}.json`);
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function saveConversation(sessionId, messages) {
  try {
    await ensureMemoryDir();
    const filePath = path.join(MEMORY_DIR, `${sessionId}.json`);
    const keep = messages.slice(-MAX_HISTORY);
    await fs.writeFile(filePath, JSON.stringify(keep, null, 2), 'utf-8');
    // Prune old conversations
    pruneOldConversations();
  } catch {}
}

async function pruneOldConversations() {
  try {
    await ensureMemoryDir();
    const files = await fs.readdir(MEMORY_DIR);
    const now = Date.now();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      const filePath = path.join(MEMORY_DIR, file);
      const stat = await fs.stat(filePath);
      if (now - stat.mtimeMs > sevenDays) {
        await fs.unlink(filePath).catch(() => {});
      }
    }
  } catch {}
}

async function writeLog({ action, severity, agent_key, details }) {
  try {
    let agent_id = null;
    if (agent_key) {
      const { data: agent } = await supabase.from('agents').select('id').eq('key', agent_key).single();
      if (agent) agent_id = agent.id;
    }
    await supabase.from('audit_logs').insert({ action, severity, agent_id, details });
  } catch {}
}

async function tryModel(model, messages) {
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
      messages,
      stream: false,
      max_tokens: 2048,
      temperature: 0.8,
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    return { error: errText, status: res.status, isRateLimit: res.status === 429 };
  }
  const data = await res.json();
  const reply = data.choices?.[0]?.message?.content?.trim();
  if (!reply) return { error: 'Réponse vide', status: 502 };
  return { reply, model: data.model, tokens: data.usage?.total_tokens };
}

export async function POST(req) {
  try {
    const { message, sessionId, history, fileName, fileContent } = await req.json();
    if (!message && !fileContent) {
      return NextResponse.json({ error: 'Message requis' }, { status: 400 });
    }

    if (!API_KEY) {
      await writeLog({ action: 'chat_error', severity: 'critical', agent_key: 'orchestrator', details: { error: 'OPENROUTER_API_KEY manquante' } });
      return NextResponse.json({ error: 'Clé API OpenRouter manquante' }, { status: 500 });
    }

    const sid = sessionId || generateId();

    // Load server-side memory
    const serverHistory = await loadConversation(sid);
    // Merge client history + server memory, dedupe by keeping the longest
    const mergedHistory = history && history.length > serverHistory.length ? history : serverHistory;

    // Build messages array for the API
    const apiMessages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...mergedHistory.slice(-20).map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
      })),
    ];

    // If there's a file to analyze, inject it
    let userContent = message;
    if (fileContent && fileName) {
      const fileIntro = `\n\n[📄 Document joint: ${fileName}]\n\`\`\`\n${fileContent.slice(0, 15000)}\n\`\`\`\n`;
      if (userContent) {
        userContent = `${userContent}\n${fileIntro}`;
      } else {
        userContent = `Voici un document à analyser :${fileIntro}`;
      }
    }

    apiMessages.push({ role: 'user', content: userContent });

    let lastErr = null;
    let reply = null;
    let usedModel = null;

    for (const model of MODELS) {
      const result = await tryModel(model, apiMessages);
      if (result.reply) {
        reply = result.reply;
        usedModel = result.model;
        break;
      }
      lastErr = result;
      if (!result.isRateLimit) break;
    }

    if (!reply) {
      await writeLog({ action: 'openrouter_error', severity: 'error', agent_key: 'orchestrator', details: { error: lastErr?.error?.slice(0, 200) } });
      return NextResponse.json({
        reply: null,
        error: `OpenRouter: ${lastErr?.status || 'inconnu'}`,
        sessionId: sid,
      }, { status: 502 });
    }

    // Save to server memory
    const newMessages = [
      ...mergedHistory,
      { role: 'user', content: message || `[Analyse du fichier: ${fileName}]`, time: new Date().toISOString() },
      { role: 'assistant', content: reply, time: new Date().toISOString() },
    ];
    await saveConversation(sid, newMessages);

    await writeLog({ action: 'chat_reply', severity: 'info', agent_key: 'orchestrator', details: { model: usedModel } });

    return NextResponse.json({ reply, sessionId: sid, model: usedModel });
  } catch (err) {
    await writeLog({ action: 'chat_crash', severity: 'critical', agent_key: 'orchestrator', details: { error: err.message } });
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
