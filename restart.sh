#!/bin/bash

# Configuration des couleurs
GREEN="\033[0;32m"
YELLOW="\033[0;33m"
RED="\033[0;31m"
BLUE="\033[0;34m"
NC="\033[0m" # No Color

# Chemins absolus pour éviter tout problème de navigation
PROJECT_ROOT="/Users/mehdi/CascadeProjects/FunnelDoctor"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
BACKEND_PORT=3001
FRONTEND_PORT=3000

echo -e "${BLUE}🔄 Redémarrage complet de FunnelDoctor (backend + frontend)...${NC}"

# Fonction pour tuer un processus sur un port spécifique
kill_process_on_port() {
  local port=$1
  local pid=$(lsof -ti:$port)
  if [ -n "$pid" ]; then
    echo -e "${YELLOW}🛑 Port $port: Arrêt du processus $pid${NC}"
    kill -9 $pid 2>/dev/null
    sleep 1
    # Vérifier si le processus est toujours en cours d'exécution
    if lsof -ti:$port >/dev/null 2>&1; then
      echo -e "${RED}❌ Impossible d'arrêter le processus sur le port $port${NC}"
      return 1
    else
      echo -e "${GREEN}✅ Port $port libéré${NC}"
    fi
  else
    echo -e "${GREEN}✅ Port $port: Aucun processus en cours d'exécution${NC}"
  fi
  return 0
}

# Nettoyer tous les processus potentiellement en cours
echo -e "${BLUE}🔍 Nettoyage des processus existants...${NC}"

# Tuer les processus sur une plage de ports (pour attraper les ports alternatifs comme 3002)
for port in {3000..3005}; do
  kill_process_on_port $port
done

# Tuer les processus Node.js associés aux serveurs de développement
echo -e "${BLUE}🔪 Arrêt des processus Node.js liés aux serveurs de développement...${NC}"
pkill -f "next dev" || true
pkill -f "npm run dev" || true
pkill -f "nest start" || true
pkill -f "npm run start:dev" || true

# Attendre un peu pour s'assurer que tous les ports sont libres
echo -e "${BLUE}⏳ Attente de la libération complète des ressources...${NC}"
sleep 2

# Vérifier que les ports sont bien libérés
if lsof -ti:$BACKEND_PORT >/dev/null 2>&1 || lsof -ti:$FRONTEND_PORT >/dev/null 2>&1; then
  echo -e "${RED}❌ Les ports ne sont pas tous libérés. Essayez de relancer le script.${NC}"
  exit 1
fi

# Démarrer le backend
echo -e "${BLUE}🚀 Démarrage du backend...${NC}"
cd "$BACKEND_DIR" || {
  echo -e "${RED}❌ Impossible d'accéder au répertoire backend${NC}"
  exit 1
}

# Démarrer le backend en arrière-plan
npm run start:dev > /tmp/funnel-doctor-backend.log 2>&1 &
backend_pid=$!

# Attendre que le backend soit prêt en vérifiant le port
echo -e "${BLUE}⏳ Attente du démarrage du backend...${NC}"
max_attempts=30
attempt=0
while ! lsof -ti:$BACKEND_PORT >/dev/null 2>&1; do
  attempt=$((attempt+1))
  if [ $attempt -ge $max_attempts ]; then
    echo -e "${RED}❌ Timeout: Le backend n'a pas démarré après $max_attempts tentatives${NC}"
    echo -e "${YELLOW}📋 Logs du backend:${NC}"
    tail -n 20 /tmp/funnel-doctor-backend.log
    exit 1
  fi
  echo -n "."
  sleep 1
done
echo -e "\n${GREEN}✅ Backend démarré avec succès sur le port $BACKEND_PORT (PID: $backend_pid)${NC}"

# Démarrer le frontend
echo -e "${BLUE}🚀 Démarrage du frontend...${NC}"
cd "$FRONTEND_DIR" || {
  echo -e "${RED}❌ Impossible d'accéder au répertoire frontend${NC}"
  exit 1
}

# Démarrer le frontend en arrière-plan
npm run dev > /tmp/funnel-doctor-frontend.log 2>&1 &
frontend_pid=$!

# Attendre que le frontend soit prêt en vérifiant le port
echo -e "${BLUE}⏳ Attente du démarrage du frontend...${NC}"
attempt=0
while ! lsof -ti:$FRONTEND_PORT >/dev/null 2>&1; do
  attempt=$((attempt+1))
  if [ $attempt -ge $max_attempts ]; then
    echo -e "${RED}❌ Timeout: Le frontend n'a pas démarré après $max_attempts tentatives${NC}"
    echo -e "${YELLOW}📋 Logs du frontend:${NC}"
    tail -n 20 /tmp/funnel-doctor-frontend.log
    exit 1
  fi
  echo -n "."
  sleep 1
done
echo -e "\n${GREEN}✅ Frontend démarré avec succès sur le port $FRONTEND_PORT (PID: $frontend_pid)${NC}"

# Afficher un résumé
echo -e "\n${GREEN}🎉 FunnelDoctor est maintenant opérationnel!${NC}"
echo -e "${BLUE}📊 Informations:${NC}"
echo -e "   ${GREEN}✓${NC} Backend: http://localhost:$BACKEND_PORT (PID: $backend_pid)"
echo -e "   ${GREEN}✓${NC} Frontend: http://localhost:$FRONTEND_PORT (PID: $frontend_pid)"
echo -e "   ${GREEN}✓${NC} App: http://localhost:$FRONTEND_PORT/dashboard/funnel-mapping"
echo -e "\n${BLUE}📝 Logs:${NC}"
echo -e "   ${YELLOW}→${NC} Backend: tail -f /tmp/funnel-doctor-backend.log"
echo -e "   ${YELLOW}→${NC} Frontend: tail -f /tmp/funnel-doctor-frontend.log"
echo -e "\n${BLUE}⚙️ Commandes utiles:${NC}"
echo -e "   ${YELLOW}→${NC} Redémarrer: ./restart.sh"
echo -e "   ${YELLOW}→${NC} Arrêter: pkill -f 'node' ou Ctrl+C"

# Maintenir le script en vie pour pouvoir l'arrêter facilement avec Ctrl+C
echo -e "\n${YELLOW}⚠️ Appuyez sur Ctrl+C pour arrêter les serveurs${NC}"
trap "echo -e '\n${RED}🛑 Arrêt des serveurs...${NC}'; pkill -P $$; exit 0" INT
wait
