const BaseAgent = require('../../deerflow/base_agent');
const logger = require('../../services/logger');
const { getDb, updateLeadStatus, logAudit } = require('../../database');

class AccountCreationAgent extends BaseAgent {
  constructor(config) {
    super({ ...config, type: 'account_creation' });
  }

  async execute(input) {
    const sellerData = input.seller_data || input.consent;
    if (!sellerData) throw new Error('Données vendeur requises');

    logger.info(`Création compte pour ${sellerData.full_name}`);

    const qaResult = await this.validationQA(sellerData);
    if (!qaResult.valid) {
      await logAudit(this.id, 'qa_rejected', { entity_type: 'lead', entity_id: sellerData.lead_id, details: qaResult.issues }, 'warning');
      return { status: 'qa_rejected', issues: qaResult.issues };
    }

    const compte = await this.creerCompteODA(sellerData);
    const boutique = await this.creerBoutique(sellerData, compte);

    const db = getDb();
    const { data: shop, error } = await db.from('shops').insert({
      lead_id: sellerData.lead_id,
      seller_id: compte.user_id,
      name: sellerData.business_name,
      slug: this.slugify(sellerData.business_name),
      status: 'pending',
      validation_status: 'pending',
      products_count: 0,
      seller_email: compte.email,
    }).select().single();

    if (error) {
      logger.error(`Erreur création boutique: ${error.message}`);
      throw error;
    }

    await updateLeadStatus(sellerData.lead_id, 'shop_created');

    await logAudit(this.id, 'shop_created', {
      entity_type: 'shop', entity_id: shop?.id,
      details: { business_name: sellerData.business_name, seller_email: compte.email }
    });

    return { compte, boutique: shop, temporary_password: compte.password };
  }

  async validationQA(data) {
    const issues = [];
    if (!data.business_name) issues.push('Nom de boutique requis');
    if (!data.phone) issues.push('Téléphone requis');
    if (!data.city) issues.push('Ville requise');
    return { valid: issues.length === 0, issues };
  }

  async creerCompteODA(sellerData) {
    logger.info(`Création compte Supabase pour ${sellerData.full_name}`);
    const password = Math.random().toString(36).slice(-8) + 'A1!';
    const email = `vendeur-${Date.now().toString(36)}@oda.cm`;

    try {
      const db = getDb();
      const { data: authUser, error } = await db.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: sellerData.full_name,
          phone: sellerData.phone,
          role: 'seller',
        },
      });

      if (error) {
        logger.warn(`Supabase Auth Admin non disponible, fallback: ${error.message}`);
        return {
          user_id: `user_${Date.now()}`,
          email,
          password,
          full_name: sellerData.full_name,
        };
      }

      logger.info(`Compte Supabase créé: ${authUser?.user?.id}`);
      return {
        user_id: authUser?.user?.id || `user_${Date.now()}`,
        email,
        password,
        full_name: sellerData.full_name,
      };
    } catch (err) {
      logger.warn(`Auth Admin API non accessible, fallback: ${err.message}`);
      return {
        user_id: `user_${Date.now()}`,
        email,
        password,
        full_name: sellerData.full_name,
      };
    }
  }

  async creerBoutique(sellerData, compte) {
    logger.info(`Création boutique: ${sellerData.business_name}`);
    return {
      name: sellerData.business_name,
      slug: this.slugify(sellerData.business_name),
      seller_email: compte.email,
    };
  }

  slugify(name) {
    return name.toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_]+/g, '-')
      .replace(/^-+|-+$/g, '') + '-' + Date.now().toString(36);
  }
}

module.exports = AccountCreationAgent;
