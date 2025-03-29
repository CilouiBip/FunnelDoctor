#!/bin/bash

cd "$(dirname "$0")/frontend"

echo "🔍 Vérification du port 3000..."
PORT_PID=$(lsof -ti:3000)

if [ -n "$PORT_PID" ]; then
  echo "⚠️ Port 3000 déjà utilisé par le processus $PORT_PID, arrêt du processus..."
  kill -9 $PORT_PID
  sleep 1
  echo "✅ Processus arrêté"
fi

echo "🚀 Démarrage du serveur frontend sur le port 3000..."
npm run dev
