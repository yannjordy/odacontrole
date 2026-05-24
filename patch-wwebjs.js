const fs = require('fs');
const path = require('path');

const clientPath = path.join(__dirname, 'node_modules', 'whatsapp-web.js', 'src', 'Client.js');

let content = fs.readFileSync(clientPath, 'utf-8');

let modified = false;

// Patch page.goto with retry + inject with retry
const oldGoto = `        await page.goto(WhatsWebURL, {
            waitUntil: 'load',
            timeout: 0,
            referer: 'https://whatsapp.com/',
        });

        await this.inject();`;

const newGoto = `        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                await page.goto(WhatsWebURL, {
                    waitUntil: 'load',
                    timeout: 120000,
                    referer: 'https://whatsapp.com/',
                });
                break;
            } catch (gotoErr) {
                console.log(\`[ODA] goto attempt \${attempt} failed:\`, gotoErr.message?.substring(0, 80));
                if (attempt === 3) throw gotoErr;
                await new Promise(r => setTimeout(r, 5000));
            }
        }

        for (let injectAttempt = 1; injectAttempt <= 3; injectAttempt++) {
            try {
                await this.inject();
                break;
            } catch (injectErr) {
                console.log(\`[ODA] inject attempt \${injectAttempt} failed:\`, injectErr.message?.substring(0, 80));
                if (injectAttempt === 3) throw injectErr;
                await new Promise(r => setTimeout(r, 3000));
            }
        }`;

if (content.includes(oldGoto)) {
  content = content.replace(oldGoto, newGoto);
  modified = true;
  console.log('✓ Patched page.goto + inject with retry (3 attempts each)');
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
