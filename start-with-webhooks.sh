#!/bin/bash

# Configuration des couleurs
GREEN="\033[0;32m"
YELLOW="\033[0;33m"
RED="\033[0;31m"
BLUE="\033[0;34m"
NC="\033[0m" # No Color

# Chemins absolus
PROJECT_ROOT="/Users/mehdi/CascadeProjects/FunnelDoctor"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
SCRIPTS_DIR="$PROJECT_ROOT/scripts"
BACKEND_PORT=3001
FRONTEND_PORT=3000

echo -e "${BLUE}🚀 Démarrage complet de FunnelDoctor avec webhooks et ngrok...${NC}"

# 1. Vérifier les dépendances nécessaires
echo -e "${BLUE}🔍 Vérification des dépendances...${NC}"
if ! command -v npx &> /dev/null; then
    echo -e "${RED}❌ npx n'est pas installé. Veuillez installer Node.js et npm.${NC}"
    exit 1
fi

if ! command -v ngrok &> /dev/null; then
    echo -e "${RED}❌ ngrok n'est pas installé. Veuillez l'installer: brew install ngrok/ngrok/ngrok${NC}"
    exit 1
fi

# 2. Installer les dépendances pour les scripts de webhook
echo -e "${BLUE}📦 Installation des dépendances pour les scripts...${NC}"
cd "$PROJECT_ROOT" || exit 1
if [ ! -d "$PROJECT_ROOT/node_modules" ]; then
  echo -e "${YELLOW}⚙️ Installation des dépendances au niveau du projet...${NC}"
  npm init -y > /dev/null 2>&1
  npm install dotenv axios stripe --save > /dev/null 2>&1
fi

# 3. Redémarrer l'application (backend + frontend) avec le script existant
echo -e "${BLUE}🔄 Redémarrage de l'application...${NC}"
"$PROJECT_ROOT/restart.sh" > /dev/null 2>&1 &
restart_pid=$!

# Attendre que le backend soit prêt
echo -e "${BLUE}⏳ Attente du démarrage du backend...${NC}"
max_attempts=30
attempt=0
while ! lsof -ti:$BACKEND_PORT >/dev/null 2>&1; do
  attempt=$((attempt+1))
  if [ $attempt -ge $max_attempts ]; then
    echo -e "${RED}❌ Timeout: Le backend n'a pas démarré après $max_attempts tentatives${NC}"
    exit 1
  fi
  echo -n "."
  sleep 1
done
echo -e "\n${GREEN}✅ Backend démarré avec succès sur le port $BACKEND_PORT${NC}"

# 4. Démarrer ngrok avec la configuration spécifiée
echo -e "${BLUE}🌐 Démarrage de ngrok avec le domaine payant...${NC}"
pkill -f ngrok > /dev/null 2>&1 || true
sleep 1
ngrok start --config="$PROJECT_ROOT/ngrok.yml" funnel-doctor-backend > /tmp/funnel-doctor-ngrok.log 2>&1 &
ngrok_pid=$!

# Attendre que ngrok soit prêt
echo -e "${BLUE}⏳ Attente du démarrage de ngrok...${NC}"
sleep 5
if ! curl -s http://localhost:4040/api/tunnels > /dev/null; then
  echo -e "${RED}❌ ngrok n'a pas démarré correctement${NC}"
  echo -e "${YELLOW}📋 Logs de ngrok:${NC}"
  tail -n 20 /tmp/funnel-doctor-ngrok.log
  exit 1
fi

# Récupérer l'URL ngrok
ngrok_url=$(curl -s http://localhost:4040/api/tunnels | grep -o 'https://[^"]*' | head -1)
echo -e "${GREEN}✅ ngrok démarré avec succès: ${ngrok_url}${NC}"

# 5. Configurer les webhooks Calendly et Stripe
echo -e "${BLUE}⚙️ Configuration des webhooks...${NC}"

# Configurer webhook Calendly
echo -e "${BLUE}📅 Configuration du webhook Calendly...${NC}"
node "$SCRIPTS_DIR/setup-calendly-webhook.js"

# Configurer webhook Stripe
echo -e "${BLUE}💳 Configuration du webhook Stripe...${NC}"
node "$SCRIPTS_DIR/setup-stripe-webhook.js"

# 6. Afficher les informations sur les services démarrés
echo -e "\n${GREEN}🎉 FunnelDoctor est maintenant opérationnel avec tunneling et webhooks!${NC}"
echo -e "${BLUE}📊 Informations:${NC}"
echo -e "   ${GREEN}✓${NC} Backend: http://localhost:$BACKEND_PORT"
echo -e "   ${GREEN}✓${NC} Frontend: http://localhost:$FRONTEND_PORT"
echo -e "   ${GREEN}✓${NC} ngrok: ${ngrok_url} (Admin: http://localhost:4040)"
echo -e "   ${GREEN}✓${NC} Webhooks configurés: Calendly et Stripe"

echo -e "\n${BLUE}📝 Logs:${NC}"
echo -e "   ${YELLOW}→${NC} Backend: tail -f /tmp/funnel-doctor-backend.log"
echo -e "   ${YELLOW}→${NC} Frontend: tail -f /tmp/funnel-doctor-frontend.log"
echo -e "   ${YELLOW}→${NC} ngrok: tail -f /tmp/funnel-doctor-ngrok.log"

echo -e "\n${BLUE}📑 Endpoints:${NC}"
echo -e "   ${YELLOW}→${NC} Calendly webhook: ${ngrok_url}/api/rdv/webhook"
echo -e "   ${YELLOW}→${NC} Stripe webhook: ${ngrok_url}/api/payments/webhook"
echo -e "   ${YELLOW}→${NC} Scripts statiques:"
echo -e "      - ${ngrok_url}/funnel-doctor.js"
echo -e "      - ${ngrok_url}/bridging.js"

echo -e "\n${YELLOW}⚠️ Appuyez sur Ctrl+C pour arrêter tous les services${NC}"
trap "echo -e '\n${RED}🛑 Arrêt des services...${NC}'; pkill -P $$; pkill -f ngrok; kill $restart_pid $ngrok_pid 2>/dev/null; exit 0" INT
wait
