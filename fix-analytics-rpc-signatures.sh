#!/bin/bash

# Script pour mettre u00e0 jour les signatures des appels RPC dans les services Analytics

# Chemins des fichiers u00e0 modifier
EVENTS_SERVICE="/Users/mehdi/CascadeProjects/FunnelDoctor/backend/src/analytics/services/events-analytics.service.ts"
FUNNEL_SERVICE="/Users/mehdi/CascadeProjects/FunnelDoctor/backend/src/analytics/services/funnel-analytics.service.ts"
LEADS_SERVICE="/Users/mehdi/CascadeProjects/FunnelDoctor/backend/src/analytics/services/leads-analytics.service.ts"

# 1. Correction du formatage des paramu00e8tres
echo "1. Correction du formatage des paramu00e8tres..."

sed -i '' 's/site_id: null, \/\/ Param requis par la signature SQL\(.*\)$/site_id: null, \/\/ Param requis par la signature SQL\n\1/g' "$EVENTS_SERVICE" "$FUNNEL_SERVICE" "$LEADS_SERVICE"

# 2. Renommer user_id en _user_id dans tous les appels RPC
echo "2. Renommage de user_id en _user_id dans tous les appels RPC..."

sed -i '' 's/user_id: params\.userId/_user_id: params.userId/g' "$EVENTS_SERVICE" "$FUNNEL_SERVICE" "$LEADS_SERVICE"

# 3. Mettre u00e0 jour les logs de du00e9bogage pour reflu00e9ter les changements
echo "3. Mise u00e0 jour des logs de du00e9bogage..."

sed -i '' 's/user_id=${params.userId}/_user_id=${params.userId}/g' "$EVENTS_SERVICE" "$FUNNEL_SERVICE" "$LEADS_SERVICE"

echo "Modification terminu00e9e. Tous les appels RPC ont u00e9tu00e9 mis u00e0 jour pour correspondre aux signatures SQL."
