const BaseAgent = require('../../deerflow/base_agent');
const logger = require('../../services/logger');

class MarketingAgent extends BaseAgent {
  constructor(config) {
    super({ ...config, type: 'marketing_optimization' });
  }

  async execute(input) {
    const lead = input.lead;
    logger.info(`Optimisation marketing pour ${lead?.full_name || 'lead'}`);

    const templates = [
      { type: 'standard', ouverture: 45, conversion: 12, message: 'Offre de boutique gratuite ODA' },
      { type: 'personnalisé', ouverture: 62, conversion: 18, message: `${lead?.full_name?.split(' ')[0]}, votre boutique en ligne vous attend` },
      { type: 'urgence', ouverture: 55, conversion: 15, message: 'Dernière chance : boutique gratuite ODA' },
    ];

    const meilleur = templates.reduce((a, b) => a.conversion > b.conversion ? a : b);

    return {
      selected_template: meilleur.type,
      predicted_open_rate: meilleur.ouverture,
      predicted_conversion: meilleur.conversion,
      message_content: meilleur.message,
      suggestions: [
        'Ajouter le prénom du prospect dans le message',
        'Mentionner sa ville pour personnaliser',
        'Inclure un exemple de boutique similaire',
      ],
    };
  }
}

module.exports = MarketingAgent;
