const { Client, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const cors = require('cors');
const qrcode = require('qrcode-terminal');
require('dotenv').config();

const app = express();
const PORT = process.env.WHATSAPP_PORT || 3001;

// Middleware
app.use(cors({ origin: process.env.NEXT_PUBLIC_SUPABASE_URL || '*' }));
app.use(express.json());

// WhatsApp client state
let client = null;
let qrCodeData = null;
let connectionStatus = 'disconnected';
let lastError = null;

// Create and configure WhatsApp client
function initClient() {
  client = new Client({
    authStrategy: new LocalAuth({ dataPath: './sessions' }),
    puppeteer: { headless: true, executablePath: '/usr/bin/google-chrome-stable', args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage'] },
  });

  client.on('qr', (qr) => {
    qrCodeData = qr;
    connectionStatus = 'scan_qr';
    qrcode.generate(qr, { small: true });
    console.log('📱 Scan the QR code above with WhatsApp');
  });

  client.on('ready', () => {
    connectionStatus = 'connected';
    qrCodeData = null;
    lastError = null;
    console.log('✅ WhatsApp connected');
    sendTestMessage();
  });

  client.on('disconnected', (reason) => {
    connectionStatus = 'disconnected';
    console.log('❌ WhatsApp disconnected:', reason);
    setTimeout(() => {
      console.log('🔄 Reconnecting...');
      client.initialize();
    }, 5000);
  });

  client.on('auth_failure', (msg) => {
    connectionStatus = 'auth_failure';
    lastError = msg;
    console.error('❌ Auth failure:', msg);
  });

  client.on('message', async (msg) => {
    console.log(`📩 From: ${msg.from} | Message: ${msg.body}`);
    try {
      await saveMessageToDB(msg);
    } catch (err) {
      console.error('Failed to save incoming message:', err.message);
    }
  });

  client.on('message_sent', (msg) => {
    console.log(`✅ Message sent to ${msg.to}: ${msg.body?.substring(0, 50)}`);
  });

  client.initialize();
}

// Save message to Supabase
async function saveMessageToDB(msg) {
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  await supabase.from('whatsapp_messages').insert({
    direction: msg.fromMe ? 'outbound' : 'inbound',
    message_type: 'text',
    content: { body: msg.body },
    status: msg.fromMe ? 'sent' : 'received',
    wamid: msg.id._serialized,
  });
}

// Send test message after connection
async function sendTestMessage() {
  const testNumber = process.env.WHATSAPP_TEST_NUMBER;
  if (!testNumber || testNumber === '237650000000') return;
  try {
    const formatted = `${testNumber}@c.us`;
    await client.sendMessage(formatted, '✅ ODA WhatsApp connecté et prêt !');
    console.log(`✅ Test message sent to ${testNumber}`);
  } catch (err) {
    console.error('❌ Failed to send test message:', err.message);
  }
}

// Helper to format phone number
function formatNumber(number) {
  let cleaned = number.replace(/[^0-9]/g, '');
  if (!cleaned.startsWith('237') && cleaned.length === 9) cleaned = '237' + cleaned;
  return `${cleaned}@c.us`;
}

// API routes
// POST /send-message
app.post('/send-message', async (req, res) => {
  try {
    const { number, message } = req.body;
    if (!number || !message) {
      return res.status(400).json({ error: 'Number and message are required' });
    }
    if (connectionStatus !== 'connected') {
      return res.status(503).json({ error: 'WhatsApp not connected', status: connectionStatus });
    }
    const formatted = formatNumber(number);
    const response = await client.sendMessage(formatted, message);
    res.json({ success: true, messageId: response.id._serialized });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /status
  app.get('/status', (req, res) => {
    res.json({
      connected: connectionStatus === 'connected',
      status: connectionStatus,
      hasQR: !!qrCodeData,
      qr: qrCodeData,
      lastError: lastError,
    });
  });

  // GET /qr (returns QR code)
  app.get('/qr', (req, res) => {
    if (!qrCodeData) {
      return res.json({ qr: null, status: connectionStatus });
    }
    res.json({ qr: qrCodeData, status: connectionStatus });
  });

  // POST /logout — force logout and generate new QR
  app.post('/logout', async (req, res) => {
    try {
      qrCodeData = null;
      connectionStatus = 'disconnected';
      if (client) {
        try { await client.destroy(); } catch {}
      }
      console.log('🔄 Generating new QR code...');
      initClient();
      res.json({ success: true, message: 'Nouveau QR code généré' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

// Start server
app.listen(PORT, () => {
  console.log(`🤖 ODA WhatsApp Server running on http://localhost:${PORT}`);
  initClient();
});
