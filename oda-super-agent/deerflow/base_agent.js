const logger = require('../services/logger');
const { createAgentRun, completeAgentRun, logAudit } = require('../database');

class BaseAgent {
  constructor(config) {
    this.id = config.id;
    this.name = config.name;
    this.type = config.type;
    this.config = config;
    this.running = false;
  }

  async run(input = {}) {
    this.running = true;
    const startTime = Date.now();
    logger.info(`${this.name} démarré`, { input: JSON.stringify(input).slice(0, 200) });

    let runRecord = null;
    try {
      if (this.id) {
        runRecord = await createAgentRun(this.id, { ...input, _started_at: startTime });
      }

      const result = await this.execute(input);

      if (runRecord) {
        await completeAgentRun(runRecord.id, 'success', result);
      }
      await logAudit(this.id, `${this.type}_success`, { entity_type: 'agent_run', entity_id: runRecord?.id, duration_ms: Date.now() - startTime });

      logger.info(`${this.name} terminé avec succès`, { duration: `${((Date.now() - startTime) / 1000).toFixed(1)}s` });
      this.running = false;
      return { success: true, data: result };
    } catch (error) {
      logger.error(`${this.name} échoué: ${error.message}`);
      if (runRecord) {
        await completeAgentRun(runRecord.id, 'failed', {}, error.message);
      }
      await logAudit(this.id, `${this.type}_failed`, { entity_type: 'agent_run', entity_id: runRecord?.id, error: error.message }, 'error');
      this.running = false;
      return { success: false, error: error.message };
    }
  }

  async execute(input) {
    throw new Error('Méthode execute() doit être implémentée par le sous-agent');
  }

  async validate(output) {
    return { valid: true, issues: [] };
  }
}

module.exports = BaseAgent;
