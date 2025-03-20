#!/bin/bash

echo "🔄 Redémarrage complet de FunnelDoctor (backend + frontend)..."

echo "🔍 Recherche des processus utilisant les ports 3000 et 3001..."

# Fonction pour tuer un processus sur un port spécifique
kill_process_on_port() {
  local port=$1
  local pid=$(lsof -ti:$port)
  if [ -n "$pid" ]; then
    echo "🛑 Port $port: Arrêt du processus $pid"
    kill -9 $pid
    sleep 1
  else
    echo "✅ Port $port: Aucun processus en cours d'exécution"
  fi
}

# Arrêter les processus sur les ports 3000 et 3001
kill_process_on_port 3000
kill_process_on_port 3001

# Tuer également les processus Node.js associés aux serveurs de développement
pkill -f "next dev" || true
pkill -f "nest start" || true

echo "⏳ Attente de la libération des ports..."
sleep 2

echo "🚀 Démarrage du backend..."
cd "$(dirname "$0")/backend" || exit 1
npm run start:dev & 
backend_pid=$!

echo "⏳ Attente du démarrage du backend (5 secondes)..."
sleep 5

echo "🚀 Démarrage du frontend..."
cd /Users/mehdi/CascadeProjects/FunnelDoctor/frontend || exit 1
npm run dev &
frontend_pid=$!

echo "✅ Serveurs démarrés:"
echo "   - Backend (PID: $backend_pid): http://localhost:3001"
echo "   - Frontend (PID: $frontend_pid): http://localhost:3000"
echo ""
echo "📝 Logs des serveurs disponibles dans les terminaux séparés"
echo "🔄 Pour redémarrer, exécutez simplement la commande: ./restart.sh"
echo "❌ Pour arrêter, utilisez: pkill -f 'node'"

wait
