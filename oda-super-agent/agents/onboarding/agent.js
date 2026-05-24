const BaseAgent = require('../../deerflow/base_agent');
const logger = require('../../services/logger');
const { getDb, updateLeadStatus } = require('../../database');

class OnboardingAgent extends BaseAgent {
  constructor(config) {
    super({ ...config, type: 'onboarding' });
  }

  async execute(input) {
    const lead = input.lead || input.consent?.lead_id;
    if (!lead) throw new Error('Lead requis pour onboarding');

    const db = getDb();
    const { data: leadData } = await db.from('leads').select('*').eq('id', typeof lead === 'object' ? lead.id : lead).single();
    if (!leadData) throw new Error('Lead introuvable');

    logger.info(`Onboarding de ${leadData.full_name || leadData.phone}`);

    // Simuler le questionnaire (en production: via WhatsApp)
    const sellerData = await this.questionnaire(leadData);

    await updateLeadStatus(leadData.id, 'onboarding', {
      business_name: sellerData.business_name,
      business_type: sellerData.business_type,
      city: sellerData.city,
      notes: `Onboarding complété: ${sellerData.products_count} produits`,
    });

    const sessionData = {
      lead_id: leadData.id,
      step: 6,
      max_steps: 6,
      status: 'completed',
      data: sellerData,
      completed_at: new Date().toISOString(),
    };
    await db.from('onboarding_sessions').insert(sessionData);

    return sellerData;
  }

  async questionnaire(lead) {
    // TODO: WhatsApp interactif réel
    logger.info('Questionnaire onboarding en cours...');
    return {
      full_name: lead.full_name || 'Nom non fourni',
      phone: lead.phone,
      business_name: lead.business_name || 'Boutique ' + lead.full_name?.split(' ')[0],
      business_type: lead.business_type || 'Mode',
      city: lead.city || 'Douala',
      products_count: Math.floor(Math.random() * 20) + 3,
      has_logo: Math.random() > 0.5,
      has_catalog: true,
      preferred_payment: 'mobile_money',
      delivery_cities: [lead.city || 'Douala', 'Yaoundé'],
    };
  }
}

module.exports = OnboardingAgent;
