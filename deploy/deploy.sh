#!/usr/bin/env bash
set -euo pipefail
cd /home/jordy/Documents/odacontrole

echo "=== ODA Control Production Deploy ==="

# 1. Pull latest code
echo ">>> Pulling latest code..."
git pull origin main

# 2. Install deps
echo ">>> Installing npm dependencies..."
npm install 2>&1

# 3. Build Next.js
echo ">>> Building Next.js..."
npm run build 2>&1

# 4. Restart WhatsApp server
echo ">>> Restarting WhatsApp server..."
# Kill any existing whatsapp-server process
pkill -f "whatsapp-server.js" 2>/dev/null || true
sleep 2
# Start with nohup
nohup node whatsapp-server.js > logs/whatsapp-server.log 2>&1 &
echo "WhatsApp server PID: $!"

# 5. Restart Next.js (if running via nohup)
echo ">>> Restarting Next.js..."
pkill -f "next start" 2>/dev/null || true
sleep 2
NODE_ENV=production nohup npx next start -p 3000 > logs/nextjs.log 2>&1 &
echo "Next.js PID: $!"

# 6. Verify
sleep 3
echo ">>> Checking WhatsApp server..."
curl -s http://localhost:3001/status | head -c 200 || echo "Not responding yet"
echo ""
echo ">>> Checking Next.js..."
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 || echo "Not responding yet"
echo ""

echo "=== Deploy complete ==="
echo "Next.js: http://localhost:3000"
echo "WhatsApp: http://localhost:3001"
echo "Logs: logs/whatsapp-server.log, logs/nextjs.log"
