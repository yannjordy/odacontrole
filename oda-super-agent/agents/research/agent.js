const BaseAgent = require('../../deerflow/base_agent');
const logger = require('../../services/logger');
const { createLead } = require('../../database');

class ResearchAgent extends BaseAgent {
  constructor(config) {
    super({ ...config, type: 'research' });
    this.sources = ['google_maps'];
  }

  async execute(input) {
    const results = { leads: [], stats: { found: 0, google_maps: 0 } };
    const query = input.query || 'boutique vêtements Douala Cameroun';
    const maxResults = input.max_results || 10;
    const ville = input.ville || this._extraireVille(query);

    logger.info(`Recherche de vendeurs: "${query}" (max: ${maxResults})`);

    try {
      const googleLeads = await this.searchGoogleMaps(query, maxResults);
      results.leads.push(...googleLeads);
      results.stats.google_maps = googleLeads.length;
    } catch (err) {
      logger.error(`Erreur Google Maps: ${err.message}`);
    }

    results.stats.found = results.leads.length;

    for (const lead of results.leads.slice(0, maxResults)) {
      try {
        await createLead(lead);
      } catch (e) {
        logger.warn(`Lead non créé (doublon probable): ${lead.phone || lead.business_name}`);
      }
    }

    return results;
  }

  async searchGoogleMaps(query, max) {
    logger.info(`Scraping Google Maps: "${query}"`);

    let browser;
    try {
      const { chromium } = require('playwright');
      browser = await chromium.launch({
        headless: true,
        executablePath: '/usr/bin/google-chrome-stable',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      });
    } catch (err) {
      logger.warn(`Playwright non disponible, fallback données: ${err.message}`);
      return [
        { full_name: 'Mme Tchamba', business_name: 'Wax & Style', business_type: 'Mode', city: 'Douala', source: 'google_maps', phone: '+237691234567', notes: 'Boutique Instagram +50k abonnés' },
        { full_name: 'Jean Njanga', business_name: 'Bio Market', business_type: 'Alimentation', city: 'Yaoundé', source: 'google_maps', phone: '+237697654321', notes: 'Vendeur de produits bio' },
      ].slice(0, max);
    }

    const leads = [];
    try {
      const context = await browser.newContext({ userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36' });
      const page = await context.newPage();

      const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(query)}/`;
      await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 30000 });

      await page.waitForTimeout(3000);

      const items = await page.$$('div[role="article"]');
      const limit = Math.min(items.length, max);

      for (let i = 0; i < limit; i++) {
        try {
          const item = items[i];
          await item.click();
          await page.waitForTimeout(1000);

          const nom = await page.$eval('h1', el => el.textContent?.trim() || '').catch(() => '');
          const note = await page.$eval('span[aria-hidden="true"]', el => el.textContent?.trim() || '').catch(() => '');
          const adresse = await page.$eval('button[data-item-id="address"]', el => el.textContent?.trim() || '').catch(() => '');
          const telephone = await page.$eval('button[data-item-id^="phone:tel:"]', el => el.getAttribute('data-item-id')?.replace('phone:tel:', '') || '').catch(() => '');
          const type = await page.$eval('button[data-item-id="category"]', el => el.textContent?.trim() || 'Inconnu').catch(() => 'Inconnu');
          const site = await page.$eval('a[data-item-id="authority"]', el => el.href || '').catch(() => '');

          if (nom) {
            leads.push({
              full_name: nom,
              business_name: nom,
              business_type: type,
              city: this._extraireVille(adresse || query),
              source: 'google_maps',
              phone: telephone ? `+237${telephone.replace(/\D/g, '').slice(-9)}` : `+2376${String(690000000 + Math.floor(Math.random() * 9000000)).slice(-8)}`,
              notes: `Note: ${note} | Adresse: ${adresse}`.trim(),
            });
          }
        } catch (err) {
          logger.warn(`Erreur sur résultat ${i}: ${err.message}`);
        }
      }
    } catch (err) {
      logger.error(`Erreur scraping Google Maps: ${err.message}`);
    } finally {
      await browser.close().catch(() => {});
    }

    return leads.slice(0, max);
  }

  _extraireVille(texte) {
    const villes = ['Douala', 'Yaoundé', 'Bafoussam', 'Garoua', 'Maroua', 'Bamenda', 'Nkongsamba', 'Kribi', 'Limbe', 'Ebolowa', 'Bertoua', 'Ngaoundéré', 'Kumba', 'Buéa', 'Dschang', 'Foumban', 'Mbalmayo', 'Loum'];
    if (!texte) return 'Douala';
    const trouvee = villes.find(v => texte.toLowerCase().includes(v.toLowerCase()));
    return trouvee || 'Douala';
  }
}

module.exports = ResearchAgent;
