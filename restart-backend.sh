#!/bin/bash

# Script de redémarrage automatique du backend NestJS (port 3001)
# Auteur: Mehdi
# Date: 2025-04-08

# Couleurs pour meilleure lisibilité
GREEN="\033[0;32m"
YELLOW="\033[1;33m"
RED="\033[0;31m"
NC="\033[0m" # No Color

echo -e "${YELLOW}🔍 Vérification du port 3001...${NC}"

# Vérifier si le port 3001 est déjà utilisé
PORT_PID=$(lsof -ti:3001)

if [ ! -z "$PORT_PID" ]; then
    echo -e "${YELLOW}⚠️ Port 3001 déjà utilisé par le processus $PORT_PID, arrêt du processus...${NC}"
    kill $PORT_PID
    
    # Attendre que le port soit libéré
    sleep 1
    
    # Vérifier si le processus est toujours en cours d'exécution
    if ps -p $PORT_PID > /dev/null; then
        echo -e "${RED}❌ Le processus est toujours en cours d'exécution, forçage de l'arrêt...${NC}"
        kill -9 $PORT_PID
        sleep 1
    fi
    
    echo -e "${GREEN}✅ Processus arrêté${NC}"
else
    echo -e "${GREEN}✅ Port 3001 disponible${NC}"
fi

# Aller dans le répertoire backend
cd "$(dirname "$0")/backend"

# Démarrer le serveur backend
echo -e "${GREEN}🚀 Démarrage du serveur backend sur le port 3001...${NC}"
npm run start:dev
