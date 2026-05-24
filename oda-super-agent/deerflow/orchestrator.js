require('dotenv').config();
const logger = require('../services/logger');
const { getDb, logAudit } = require('../database');

class Orchestrator {
  constructor() {
    this.agents = new Map();
    this.workflows = new Map();
    this.db = getDb();
  }

  registerAgent(agent) {
    this.agents.set(agent.type, agent);
    logger.info(`Agent enregistré: ${agent.name} (${agent.type})`);
  }

  async startWorkflow(name, steps, context = {}) {
    const workflowId = require('uuid').v4();
    logger.info(`Workflow démarré: ${name}`, { workflow_id: workflowId, steps: steps.length });
    const results = [];

    for (const step of steps) {
      const agent = this.agents.get(step.agent);
      if (!agent) {
        logger.error(`Agent ${step.agent} non trouvé`);
        results.push({ step: step.name, status: 'failed', error: `Agent ${step.agent} non trouvé` });
        continue;
      }

      logger.info(`Étape: ${step.name} (${step.agent})`);
      const result = await agent.run({ ...context, ...step.input });
      results.push({ step: step.name, agent: step.agent, status: result.success ? 'success' : 'failed', data: result.data, error: result.error });

      if (!result.success) {
        logger.warn(`Workflow arrêté à l'étape: ${step.name}`);
        break;
      }

      if (step.output_key) {
        context[step.output_key] = result.data;
      }
    }

    await logAudit(null, 'workflow_completed', {
      entity_type: 'workflow',
      entity_id: workflowId,
      workflow_name: name,
      results: results.map(r => ({ step: r.step, status: r.status })),
    });

    return { workflow_id: workflowId, name, results, context };
  }

  async runAcquisitionPipeline(leadData) {
    return this.startWorkflow('Acquisition vendeur', [
      { name: 'Recherche & Qualification', agent: 'research', input: leadData, output_key: 'lead' },
      { name: 'Contact & Consentement', agent: 'contact', input: {}, output_key: 'consent' },
      { name: 'Onboarding', agent: 'onboarding', input: {}, output_key: 'seller_data' },
      { name: 'Création compte & boutique', agent: 'account_creation', input: {}, output_key: 'shop' },
      { name: 'Publication produits', agent: 'product_publishing', input: {}, output_key: 'products' },
      { name: 'Suivi WhatsApp & validation', agent: 'whatsapp_followup', input: {}, output_key: 'validation' },
    ], leadData);
  }
}

module.exports = Orchestrator;
