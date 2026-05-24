import { NextResponse } from 'next/server';

const WHATSAPP_SERVER = process.env.WHATSAPP_SERVER_URL || 'http://localhost:3001';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const endpoint = searchParams.get('endpoint') || 'status';

    const res = await fetch(`${WHATSAPP_SERVER}/${endpoint}`, {
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      return NextResponse.json({ connected: false, status: 'unreachable', error: `HTTP ${res.status}` });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({
      connected: false,
      status: 'offline',
      error: err.message,
    });
  }
}

async function sendWa(number, message) {
  const res = await fetch(`${WHATSAPP_SERVER}/send-message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ number, message }),
    signal: AbortSignal.timeout(15000),
  });
  return { ok: res.ok, data: await res.json() };
}

const AGENT_MESSAGES = {
  contact: {
    agent: 'Farida (Agent Contact)',
    emoji: '🤝',
    messages: [
      (n) => `Bonjour ${n} ! 👋\n\nJe suis l'agent commercial ODA Marketplace.\n\nNous vous offrons la création GRATUITE d'une boutique professionnelle en ligne sur ODA :\n✅ Boutique personnalisée avec votre logo\n✅ Vos produits visibles par des milliers d'acheteurs\n✅ Paiement Mobile Money (MTN/Orange Money)\n✅ Pas de commission sur les ventes\n\nSouhaitez-vous que nous créions votre boutique gratuitement ? (OUI/NON)`,
      (n) => `Suite à notre précédent message, je voulais m'assurer que vous avez bien reçu notre offre ODA Marketplace. 🎯\n\nCréation gratuite de boutique en ligne, sans commission !\n\nBesoin de plus d'informations ?`,
      (n) => `Dernier rappel concernant l'offre ODA Marketplace ⏰\n\nCette offre de création gratuite de boutique est disponible pour une durée limitée.\n\n📱 Répondez OUI pour commencer maintenant !`,
    ],
  },
  followup: {
    agent: 'Oceane (Suivi WhatsApp)',
    emoji: '📋',
    messages: [
      (n, d) => `🎉 Félicitations ${n} !\n\nVotre boutique ODA est prête !\n📍 ${d?.shop || 'Votre boutique'}\n\n🔗 ${d?.link || 'https://oda-market.vercel.app'}\n📧 Email : ${d?.email || 'votre@email.com'}\n🔑 Mot de passe temporaire : ${d?.password || 'ODA2024!'}\n\n📱 Téléchargez l'app ODA Seller pour gérer votre boutique\n\nVotre boutique vous convient-elle ? (OUI/NON)`,
      (n, d) => `Bonjour ${n} ! Votre boutique est toujours active. Avez-vous eu le temps de la personnaliser ? 🛍️\n\nBesoin d'aide pour ajouter des produits ?`,
      (n, d) => `🌟 ${n}, saviez-vous que les boutiques ODA avec plus de 10 produits reçoivent en moyenne 3x plus de visites ?\n\nAjoutez vos produits maintenant depuis votre espace vendeur !`,
    ],
  },
  marketing: {
    agent: 'Eve (Agent Marketing)',
    emoji: '📢',
    messages: [
      (n) => `Bonjour ${n} ! 🚀\n\nNous avons remarqué que votre boutique ODA a du potentiel. Je suis Eve, votre conseillère marketing.\n\nJe peux vous aider à optimiser vos produits pour plus de ventes. Souhaitez-vous un audit gratuit de votre boutique ?`,
      (n) => `${n}, un conseil gratuit : les produits avec des photos de qualité vendent 60% plus sur ODA ! 📸\n\nSouhaitez-vous que je vous envoie notre guide photo gratuit ?`,
    ],
  },
};

export async function POST(req) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'send') {
      const result = await sendWa(body.number, body.message);
      return NextResponse.json(result.data, { status: result.ok ? 200 : 500 });
    }

    if (action === 'logout') {
      const res = await fetch(`${WHATSAPP_SERVER}/logout`, {
        method: 'POST',
        signal: AbortSignal.timeout(10000),
      });
      const data = await res.json();
      return NextResponse.json(data);
    }

    if (action === 'agent-test') {
      const { number, agent: agentKey } = body;
      if (!number) return NextResponse.json({ error: 'Numéro requis' }, { status: 400 });

      const agentsToRun = agentKey && agentKey !== 'all' ? [agentKey] : Object.keys(AGENT_MESSAGES);
      const log = [];
      const now = new Date();

      for (const key of agentsToRun) {
        const cfg = AGENT_MESSAGES[key];
        const name = number.replace(/[^0-9]/g, '').slice(-9);
        const data = {
          shop: 'Ma Boutique ODA',
          link: `https://oda-market.vercel.app/boutique?shop=ma-boutique`,
          email: `${name}@email.com`,
          password: 'ODA2024!',
        };

        for (let i = 0; i < cfg.messages.length; i++) {
          const msg = cfg.messages[i](name, data);
          const result = await sendWa(number, msg);
          log.push({
            agent: cfg.agent,
            emoji: cfg.emoji,
            step: i + 1,
            sent: result.ok,
            time: new Date(now.getTime() + i * 1000 + agentsToRun.indexOf(key) * 5000).toISOString(),
          });
          // Pause entre les messages
          await new Promise(r => setTimeout(r, 1500));
        }
      }

      return NextResponse.json({ success: true, log });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
