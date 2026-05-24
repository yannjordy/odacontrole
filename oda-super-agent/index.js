require('dotenv').config();
const logger = require('./services/logger');
const Orchestrator = require('./deerflow/orchestrator');
const { getDb } = require('./database');

const ResearchAgent = require('./agents/research/agent');
const ContactAgent = require('./agents/contact/agent');
const OnboardingAgent = require('./agents/onboarding/agent');
const AccountCreationAgent = require('./agents/account_creation/agent');
const ProductPublishingAgent = require('./agents/product_publishing/agent');
const WhatsAppFollowupAgent = require('./agents/whatsapp_followup/agent');
const MarketingAgent = require('./agents/marketing/agent');
const SupervisorAgent = require('./agents/supervisor/agent');

async function getAgentId(key) {
  try {
    const db = getDb();
    const { data } = await db.from('agents').select('id').eq('key', key).single();
    return data?.id || null;
  } catch {
    return null;
  }
}

async function main() {
  logger.info('══════════════════════════════════╗');
  logger.info('  ODA Super Agent — v1.0.0');
  logger.info('  Système multi-agents');
  logger.info('  Acquisition automatisée vendeurs');
  logger.info('  Cameroun');
  logger.info('╚══════════════════════════════════');

  const orchestrator = new Orchestrator();

  const agentIds = {
    research: await getAgentId('research'),
    contact: await getAgentId('contact'),
    onboarding: await getAgentId('onboarding'),
    account_creation: await getAgentId('account_creation'),
    product_publishing: await getAgentId('product_publishing'),
    whatsapp_followup: await getAgentId('whatsapp_followup'),
    marketing: await getAgentId('marketing'),
    supervisor: await getAgentId('supervisor'),
  };

  orchestrator.registerAgent(new ResearchAgent({ id: agentIds.research, name: 'Agent Recherche' }));
  orchestrator.registerAgent(new ContactAgent({ id: agentIds.contact, name: 'Agent Contact' }));
  orchestrator.registerAgent(new OnboardingAgent({ id: agentIds.onboarding, name: 'Agent Onboarding' }));
  orchestrator.registerAgent(new AccountCreationAgent({ id: agentIds.account_creation, name: 'Agent Création Compte' }));
  orchestrator.registerAgent(new ProductPublishingAgent({ id: agentIds.product_publishing, name: 'Agent Publication' }));
  orchestrator.registerAgent(new WhatsAppFollowupAgent({ id: agentIds.whatsapp_followup, name: 'Agent Suivi WhatsApp' }));
  orchestrator.registerAgent(new MarketingAgent({ id: agentIds.marketing, name: 'Agent Marketing' }));
  orchestrator.registerAgent(new SupervisorAgent({ id: agentIds.supervisor, name: 'Superviseur SA-P' }));

  const args = process.argv.slice(2);
  const mode = args[0] || 'test';

  if (mode === 'pipeline') {
    const leadData = {
      query: args[1] || 'vendeur mode Douala Cameroun',
      max_results: parseInt(args[2]) || 5,
    };

    logger.info(`Pipeline d'acquisition démarré`, leadData);
    const result = await orchestrator.runAcquisitionPipeline(leadData);
    logger.info('Pipeline terminé', { results: result.results.map(r => ({ step: r.step, status: r.status })) });

  } else if (mode === 'agent') {
    const agentName = args[1];
    const agent = orchestrator.agents.get(agentName);
    if (!agent) {
      logger.error(`Agent "${agentName}" non trouvé. Agents disponibles: ${[...orchestrator.agents.keys()].join(', ')}`);
      process.exit(1);
    }
    const result = await agent.run({ query: args[2] || 'test' });
    console.log(JSON.stringify(result, null, 2));

  } else {
    logger.info('Mode test: exécution pipeline réduit...');
    const result = await orchestrator.runAcquisitionPipeline({
      query: 'vendeur test Douala',
      max_results: 2,
    });
    logger.info('Test terminé');
    console.log('\n═══ RÉSULTATS ═══');
    result.results.forEach(r => {
      const icon = r.status === 'success' ? '✅' : '❌';
      console.log(`  ${icon} ${r.step}: ${r.status}`);
      if (r.error) console.log(`     Erreur: ${r.error}`);
    });
  }

  logger.info('ODA Super Agent terminé');
}

main().catch(err => {
  logger.error('Erreur fatale:', err);
  process.exit(1);
});
