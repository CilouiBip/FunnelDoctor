#!/bin/bash

# Configuration
API_URL="http://localhost:3001/api"
TIMESTAMP=$(date +%s)
EMAIL="test.lead.${TIMESTAMP}@example.com"

# 1. Login pour récupérer un token JWT
echo "Étape 1: Login et récupération du token JWT"
LOGIN_RESPONSE=$(curl -s -X POST "${API_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
)

JWT_TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"access_token":"[^"]*"' | cut -d':' -f2 | tr -d '",' | tr -d ' ')
echo "Token JWT récupéré: ${JWT_TOKEN:0:20}..."

if [ -z "$JWT_TOKEN" ]; then
  echo "Erreur: Impossible de récupérer le token JWT. Vérifiez les identifiants."
  exit 1
fi

# 2. Créer un nouveau lead
echo -e "\nÉtape 2: Création d'un nouveau lead"
LEAD_RESPONSE=$(curl -s -X POST "${API_URL}/leads" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -d '{"email":"'"${EMAIL}"'","first_name":"Test","last_name":"Lead"}' \
)

LEAD_ID=$(echo $LEAD_RESPONSE | grep -o '"id":"[^"]*"' | cut -d':' -f2 | tr -d '",' | tr -d ' ')
echo "Lead créé avec l'ID: ${LEAD_ID}"

if [ -z "$LEAD_ID" ]; then
  echo "Erreur: Impossible de créer le lead. Réponse: $LEAD_RESPONSE"
  exit 1
fi

# 3. Vérifier le statut initial du lead
echo -e "\nÉtape 3: Vérification du statut initial du lead"
LEAD_STATUS_RESPONSE=$(curl -s -X GET "${API_URL}/leads/${LEAD_ID}" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
)

LEAD_STATUS=$(echo $LEAD_STATUS_RESPONSE | grep -o '"status":"[^"]*"' | cut -d':' -f2 | tr -d '",' | tr -d ' ')
echo "Statut initial du lead: ${LEAD_STATUS}"

# 4. Effectuer une transition valide (new -> contacted)
echo -e "\nÉtape 4: Transition valide (new -> contacted)"
TRANSITION_RESPONSE=$(curl -s -X POST "${API_URL}/leads/${LEAD_ID}/transition" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -d '{"status":"contacted","comment":"Premier contact par email"}' \
)

NEW_STATUS=$(echo $TRANSITION_RESPONSE | grep -o '"status":"[^"]*"' | cut -d':' -f2 | tr -d '",' | tr -d ' ')
echo "Nouvelle statut du lead: ${NEW_STATUS}"

if [ "$NEW_STATUS" != "contacted" ]; then
  echo "Erreur: La transition a échoué. Réponse: $TRANSITION_RESPONSE"
  exit 1
fi

# 5. Tenter une transition invalide (contacted -> won)
echo -e "\nÉtape 5: Tentative de transition invalide (contacted -> won)"
INVALID_TRANSITION_RESPONSE=$(curl -s -X POST "${API_URL}/leads/${LEAD_ID}/transition" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -d '{"status":"won","comment":"Tentative de transition invalide"}' \
)

ERROR_MESSAGE=$(echo $INVALID_TRANSITION_RESPONSE | grep -o '"message":"[^"]*"' | cut -d':' -f2 | tr -d '",' | tr -d ' ')
echo "Réponse d'erreur attendue: $INVALID_TRANSITION_RESPONSE"

if [[ $INVALID_TRANSITION_RESPONSE != *"Transition invalide"* ]]; then
  echo "Erreur: La validation de transition ne fonctionne pas correctement."
  exit 1
fi

# 6. Vérifier l'historique des statuts
echo -e "\nÉtape 6: Vérification de l'historique des statuts"
HISTORY_RESPONSE=$(curl -s -X GET "${API_URL}/leads/${LEAD_ID}/status-history" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
)

echo "Historique des statuts: $HISTORY_RESPONSE"

if [[ $HISTORY_RESPONSE != *"new_status"* ]] || [[ $HISTORY_RESPONSE != *"old_status"* ]]; then
  echo "Erreur: L'historique des statuts n'est pas correctement enregistré."
  exit 1
fi

# 7. Transition valide supplémentaire (contacted -> qualified)
echo -e "\nÉtape 7: Transition valide supplémentaire (contacted -> qualified)"
QUALIFIED_RESPONSE=$(curl -s -X POST "${API_URL}/leads/${LEAD_ID}/transition" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -d '{"status":"qualified","comment":"Lead qualifié après discussion"}' \
)

QUALIFIED_STATUS=$(echo $QUALIFIED_RESPONSE | grep -o '"status":"[^"]*"' | cut -d':' -f2 | tr -d '",' | tr -d ' ')
echo "Nouvelle statut du lead: ${QUALIFIED_STATUS}"

if [ "$QUALIFIED_STATUS" != "qualified" ]; then
  echo "Erreur: La deuxième transition a échoué. Réponse: $QUALIFIED_RESPONSE"
  exit 1
fi

# 8. Vérifier l'historique des statuts mis à jour
echo -e "\nÉtape 8: Vérification de l'historique mis à jour"
UPDATED_HISTORY=$(curl -s -X GET "${API_URL}/leads/${LEAD_ID}/status-history" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
)

echo "Historique mis à jour: $UPDATED_HISTORY"

if [[ $UPDATED_HISTORY != *"qualified"* ]]; then
  echo "Erreur: La deuxième transition n'est pas dans l'historique."
  exit 1
fi

echo -e "\n✅ Test end-to-end réussi! Le système de gestion des statuts de leads fonctionne correctement."
