const fs = require('fs');
const path = require('path');

const clientPath = path.join(__dirname, 'node_modules', 'whatsapp-web.js', 'src', 'Client.js');

let content = fs.readFileSync(clientPath, 'utf-8');

let modified = false;

// Patch waitUntil: 'load' → 'domcontentloaded' avec try-catch sur inject()
const oldGoto = `await page.goto(WhatsWebURL, {
            waitUntil: 'load',
            timeout: 0,
            referer: 'https://whatsapp.com/',
        });

        await this.inject();`;

const newGoto = `await page.goto(WhatsWebURL, {
            waitUntil: 'domcontentloaded',
            timeout: 120000,
            referer: 'https://whatsapp.com/',
        });

        try {
            await this.inject();
        } catch (injectErr) {
            console.log('[ODA] inject() failed (non-blocking):', injectErr.message?.substring(0, 100));
        }`;

if (content.includes(oldGoto)) {
  content = content.replace(oldGoto, newGoto);
  modified = true;
  console.log('✓ Patched page.goto waitUntil → domcontentloaded');
}

// Patch framenavigated inject() with try-catch
const oldFrameNav = `this.pupPage.on('framenavigated', async (frame) => {
            if (frame.url().includes('post_logout=1') || this.lastLoggedOut) {
                this.emit(Events.DISCONNECTED, 'LOGOUT');
                await this.authStrategy.logout();
                await this.authStrategy.beforeBrowserInitialized();
                await this.authStrategy.afterBrowserInitialized();
                this.lastLoggedOut = false;
            }
            await this.inject();
        });`;

const newFrameNav = `this.pupPage.on('framenavigated', async (frame) => {
            if (frame.url().includes('post_logout=1') || this.lastLoggedOut) {
                this.emit(Events.DISCONNECTED, 'LOGOUT');
                await this.authStrategy.logout();
                await this.authStrategy.beforeBrowserInitialized();
                await this.authStrategy.afterBrowserInitialized();
                this.lastLoggedOut = false;
            }
            try {
                await this.inject();
            } catch (injectErr) {
                console.log('[ODA] framenavigated inject() failed:', injectErr.message?.substring(0, 100));
            }
        });`;

if (content.includes(oldFrameNav)) {
  content = content.replace(oldFrameNav, newFrameNav);
  modified = true;
  console.log('✓ Patched framenavigated inject() with try-catch');
}

if (modified) {
  fs.writeFileSync(clientPath, content, 'utf-8');
  console.log('✓ whatsapp-web.js Client.js patched successfully');
} else {
  console.log('✓ Already patched, no changes needed');
}
