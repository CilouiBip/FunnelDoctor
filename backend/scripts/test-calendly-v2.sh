#!/bin/bash

# Couleurs pour une meilleure lisibilité
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Test de Configuration Calendly v2 ===${NC}"
echo "Vérification des variables d'environnement..."

# Vérification des variables d'environnement
cd "$(dirname "$0")/.."
ENV_FILE=".env"

# Vérification du PAT
if grep -q "CALENDLY_PERSONAL_ACCESS_TOKEN" "$ENV_FILE"; then
  echo -e "${GREEN}✓ CALENDLY_PERSONAL_ACCESS_TOKEN trouvé dans $ENV_FILE${NC}"
else
  echo -e "${RED}✗ CALENDLY_PERSONAL_ACCESS_TOKEN non trouvé dans $ENV_FILE${NC}"
  echo "Veuillez ajouter cette variable à votre fichier .env"
  exit 1
fi

# Vérification de la clé de signature webhook
if grep -q "CALENDLY_WEBHOOK_SIGNING_KEY" "$ENV_FILE"; then
  echo -e "${GREEN}✓ CALENDLY_WEBHOOK_SIGNING_KEY trouvé dans $ENV_FILE${NC}"
else
  echo -e "${RED}✗ CALENDLY_WEBHOOK_SIGNING_KEY non trouvé dans $ENV_FILE${NC}"
  echo "Veuillez ajouter cette variable à votre fichier .env"
  exit 1
fi

echo -e "${YELLOW}=== Variables d'environnement vérifiées avec succès ===${NC}"
echo "Configuration Calendly v2 complète !"
