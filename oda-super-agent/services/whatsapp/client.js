const { getDb } = require('../../database');

const WHATSAPP_SERVER = process.env.WHATSAPP_SERVER_URL || 'http://localhost:3001';

async function envoyerMessage(numero, message) {
  const res = await fetch(`${WHATSAPP_SERVER}/send-message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ number: numero, message }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`WhatsApp send failed (${res.status}): ${err.slice(0, 100)}`);
  }
  return res.json();
}

async function attendreReponse(leadId, timeoutMs = 120000, pollInterval = 3000) {
  const db = getDb();
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const { data } = await db
      .from('whatsapp_messages')
      .select('content,created_at')
      .eq('lead_id', leadId)
      .eq('direction', 'inbound')
      .order('created_at', { ascending: false })
      .limit(1);

    if (data?.length) {
      const msg = data[0].content?.body || '';
      const upper = msg.toUpperCase().trim();
      const estOui = /^(OUI|OUE|OAI|YES|OK)\b/.test(upper) || /^OUI/i.test(msg);
      const estNon = /^(NON|NO|NOP|NAN)\b/.test(upper) || /^NON/i.test(msg);

      if (estOui) return { reponse: 'oui', message: msg };
      if (estNon) return { reponse: 'non', message: msg };
    }

    await new Promise(r => setTimeout(r, pollInterval));
  }

  return { reponse: 'timeout', message: 'Aucune réponse dans le délai imparti' };
}

module.exports = { envoyerMessage, attendreReponse };
