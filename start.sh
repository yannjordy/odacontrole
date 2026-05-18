#!/bin/bash
cd "$(dirname "$0")"
echo "🚀 Démarrage de ODA Contrôle..."

if [ ! -d "node_modules/next" ]; then
  echo "📦 Installation des dépendances..."
  npm install --no-audit --no-fund 2>&1
fi

echo "🔨 Build de production..."
npx next build --webpack 2>&1

echo "🌐 Lancement du serveur sur http://localhost:3000"
echo "🔄 Redémarrage automatique en cas de crash"

while true; do
  echo "[$(date)] Serveur démarré"
  npx next start --port 3000 2>&1
  echo "[$(date)] Serveur arrêté — redémarrage dans 3s..."
  sleep 3
done
