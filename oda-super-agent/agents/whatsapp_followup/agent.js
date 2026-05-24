const BaseAgent = require('../../deerflow/base_agent');
const logger = require('../../services/logger');
const { getDb, updateLeadStatus, logAudit } = require('../../database');
const { envoyerMessage, attendreReponse } = require('../../services/whatsapp/client');

class WhatsAppFollowupAgent extends BaseAgent {
  constructor(config) {
    super({ ...config, type: 'whatsapp_followup' });
  }

  async execute(input) {
    const shop = input.shop || input.account_creation?.boutique;
    const sellerData = input.seller_data || {};
    const leadId = sellerData.lead_id;
    if (!leadId) throw new Error('lead_id requis');

    const db = getDb();
    const { data: lead } = await db.from('leads').select('*').eq('id', leadId).single();
    if (!lead) throw new Error('Lead introuvable');

    logger.info(`Suivi WhatsApp pour ${lead.full_name || lead.phone}`);

    await this.envoyerIdentifiants(lead, shop, input);
    const validation = await this.demanderValidation(lead, shop);

    if (validation.accepted) {
      await updateLeadStatus(leadId, 'validated');
      await db.from('shops').update({ status: 'active', validation_status: 'approved', validated_at: new Date().toISOString() }).eq('id', shop.id);

      await logAudit(this.id, 'shop_validated', {
        entity_type: 'shop', entity_id: shop.id,
        details: { message: 'Validation finale obtenue', lead_phone: lead.phone }
      });

      return { validated: true, shop_id: shop.id, message: validation.message };
    } else {
      await db.from('shops').update({ status: 'rejected' }).eq('id', shop.id);
      await updateLeadStatus(leadId, 'rejected');
      await logAudit(this.id, 'shop_rejected', {
        entity_type: 'shop', entity_id: shop.id,
        details: { message: 'Validation refusée - boutique supprimée' }
      }, 'warning');

      return { validated: false, shop_id: shop.id, message: validation.message };
    }
  }

  async envoyerIdentifiants(lead, shop, input) {
    const message = [
      `🎉 Félicitations ${lead.full_name?.split(' ')[0] || '!'} !`,
      ``,
      `Votre boutique ODA est prête !`,
      `📍 ${shop?.name || 'Votre boutique'}`,
      ``,
      `🔗 Lien de votre boutique : https://oda-market.vercel.app/boutique?shop=${shop?.slug || 'ma-boutique'}`,
      `📧 Email : ${lead.email || 'à définir'}`,
      `🔑 Mot de passe temporaire : ${input.account_creation?.temporary_password || 'ODA2024!'}`,
      ``,
      `📱 Téléchargez l'app ODA Seller :`,
      `https://oda-seller.vercel.app`,
      ``,
      `Votre boutique vous convient-elle ? (OUI/NON)`,
    ].join('\n');

    try {
      const resultat = await envoyerMessage(lead.phone, message);
      logger.info(`Identifiants envoyés à ${lead.phone} (id: ${resultat.messageId})`);
    } catch (err) {
      logger.error(`Échec envoi identifiants à ${lead.phone}: ${err.message}`);
      throw err;
    }
  }

  async demanderValidation(lead, shop) {
    logger.info(`Attente validation pour ${lead.full_name || lead.phone} (120s max)...`);
    const resultat = await attendreReponse(lead.id, 120000, 3000);
    if (resultat.reponse === 'oui') {
      return { accepted: true, message: resultat.message };
    }
    return { accepted: false, message: resultat.message };
  }
}

module.exports = WhatsAppFollowupAgent;
