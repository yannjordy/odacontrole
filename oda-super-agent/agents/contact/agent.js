const BaseAgent = require('../../deerflow/base_agent');
const logger = require('../../services/logger');
const { getDb, updateLeadStatus, logAudit } = require('../../database');
const { envoyerMessage, attendreReponse } = require('../../services/whatsapp/client');

class ContactAgent extends BaseAgent {
  constructor(config) {
    super({ ...config, type: 'contact' });
  }

  async execute(input) {
    const db = getDb();
    const lead = input.lead;
    if (!lead || !lead.id) {
      throw new Error('Lead requis pour le contact');
    }

    logger.info(`Contact du lead: ${lead.full_name || lead.phone}`);

    const messageEnvoye = await this.envoyerMessageWhatsApp(lead);
    await logAudit(this.id, 'contact_message_sent', { entity_type: 'lead', entity_id: lead.id, message: messageEnvoye });

    const reponse = await this.attendreReponse(lead);
    await logAudit(this.id, 'contact_response_received', { entity_type: 'lead', entity_id: lead.id, response: reponse });

    if (reponse.consent) {
      await updateLeadStatus(lead.id, 'contacted', {
        consent_given: true,
        consent_date: new Date().toISOString(),
        notes: `Consentement obtenu: ${reponse.message}`,
        last_contact_at: new Date().toISOString(),
      });
      logger.info(`Consentement obtenu pour ${lead.full_name || lead.phone}`);
      return { consent: true, message: reponse.message, lead_id: lead.id };
    } else {
      await updateLeadStatus(lead.id, 'rejected', {
        notes: `Refus: ${reponse.message}`,
        last_contact_at: new Date().toISOString(),
      });
      logger.info(`Refus de ${lead.full_name || lead.phone}: ${reponse.message}`);
      return { consent: false, message: reponse.message, lead_id: lead.id };
    }
  }

  async envoyerMessageWhatsApp(lead) {
    const message = this.genererMessageOffre(lead);
    try {
      const resultat = await envoyerMessage(lead.phone, message);
      logger.info(`Message WhatsApp envoyé à ${lead.phone} (id: ${resultat.messageId})`);
      return { template: 'oda_welcome', to: lead.phone, message, messageId: resultat.messageId };
    } catch (err) {
      logger.error(`Échec envoi WhatsApp à ${lead.phone}: ${err.message}`);
      throw err;
    }
  }

  async attendreReponse(lead) {
    logger.info(`Attente réponse pour ${lead.full_name || lead.phone} (120s max)...`);
    const resultat = await attendreReponse(lead.id, 120000, 3000);
    if (resultat.reponse === 'oui') {
      return { consent: true, message: resultat.message };
    } else {
      return { consent: false, message: resultat.message };
    }
  }

  genererMessageOffre(lead) {
    const prenom = lead.full_name?.split(' ')[0] || 'cher commerçant';
    return [
      `Bonjour ${prenom} ! 👋`,
      ``,
      `Je suis l'agent commercial ODA Marketplace.`,
      `Nous avons remarqué votre activité dans ${lead.city || 'le commerce au Cameroun'}.`,
      ``,
      `Nous vous offrons la création GRATUITE d'une boutique professionnelle en ligne sur ODA :`,
      `✅ Boutique personnalisée avec votre logo`,
      `✅ Vos produits visibles par des milliers d'acheteurs`,
      `✅ Paiement Mobile Money (MTN/Orange Money)`,
      `✅ Pas de commission sur les ventes`,
      ``,
      `Souhaitez-vous que nous créions votre boutique gratuitement ? (OUI/NON)`,
    ].join('\n');
  }
}

module.exports = ContactAgent;
