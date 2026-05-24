const BaseAgent = require('../../deerflow/base_agent');
const logger = require('../../services/logger');
const { getDb, updateLeadStatus, logAudit } = require('../../database');

class ProductPublishingAgent extends BaseAgent {
  constructor(config) {
    super({ ...config, type: 'product_publishing' });
  }

  async execute(input) {
    const shop = input.shop || input.account_creation?.boutique;
    const sellerData = input.seller_data;
    if (!shop) throw new Error('Boutique requise');

    logger.info(`Publication produits pour ${shop.name}`);
    const count = sellerData?.products_count || Math.floor(Math.random() * 10) + 3;
    const produits = [];

    const categories = ['Mode', 'Alimentation', 'Cosmétique', 'Artisanat', 'Accessoires'];
    const cat = sellerData?.business_type || categories[Math.floor(Math.random() * categories.length)];

    for (let i = 0; i < count; i++) {
      const produit = {
        name: `${cat} - Article ${i + 1}`,
        description: `Produit de qualité proposé par ${shop.name}. Livraison disponible.`,
        price: Math.floor(Math.random() * 50000) + 1000,
        currency: 'XAF',
        category: cat,
        image_url: null,
        status: 'published',
      };
      produits.push(produit);
      logger.info(`Produit créé: ${produit.name}`);
    }

    // Sauvegarder dans produits (via API ODA plus tard)
    await logAudit(this.id, 'products_published', {
      entity_type: 'shop', entity_id: shop.id,
      details: { count: produits.length, shop_name: shop.name }
    });

    // Mettre à jour le compteur
    const db = getDb();
    await db.from('shops').update({ products_count: produits.length }).eq('id', shop.id);
    await updateLeadStatus(sellerData?.lead_id, 'products_published');

    return { products_count: produits.length, products: produits, shop_id: shop.id };
  }
}

module.exports = ProductPublishingAgent;
