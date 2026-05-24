const BaseAgent = require('../../deerflow/base_agent');
const logger = require('../../services/logger');
const { logAudit } = require('../../database');

class SupervisorAgent extends BaseAgent {
  constructor(config) {
    super({ ...config, type: 'supervisor' });
  }

  async execute(input) {
    const step = input.step || 'final';
    const data = input.data || {};
    const results = input.workflow_results || [];

    logger.info(`Validation SA-P pour l'étape: ${step}`);

    const validations = [];
    let globalValid = true;

    for (const result of results) {
      const v = await this.validerEtape(result);
      validations.push(v);
      if (!v.valid) globalValid = false;
    }

    await logAudit(this.id, 'qa_validation', {
      entity_type: 'workflow',
      details: { step, valid: globalValid, validations_count: validations.length, errors: validations.filter(v => !v.valid).length }
    });

    return {
      valid: globalValid,
      step,
      validations,
      rapport: this.genererRapport(validations, globalValid),
    };
  }

  async validerEtape(result) {
    const checks = [];
    if (result.data) {
      if (result.data.consent === false) checks.push({ check: 'consentement', pass: false, detail: 'Consentement refusé' });
      if (result.data.products_count === 0) checks.push({ check: 'produits', pass: false, detail: 'Aucun produit publié' });
    }
    const pass = checks.every(c => c.pass !== false);
    return { step: result.step || 'inconnu', valid: pass, checks };
  }

  genererRapport(validations, globalValid) {
    const passed = validations.filter(v => v.valid).length;
    return [
      `═══ RAPPORT DE VALIDATION SA-P ═══`,
      `Étapes validées: ${passed}/${validations.length}`,
      `Statut global: ${globalValid ? '✅ ACCEPTÉ' : '❌ REJETÉ'}`,
      ...validations.map(v => `  ${v.valid ? '✅' : '❌'} ${v.step}`),
      `════════════════════════════════`,
    ].join('\n');
  }
}

module.exports = SupervisorAgent;
