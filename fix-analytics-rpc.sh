#!/bin/bash

# Script pour ru00e9introduire le paramu00e8tre site_id (avec null) dans les appels RPC

# Chemins des fichiers u00e0 modifier
EVENTS_SERVICE="/Users/mehdi/CascadeProjects/FunnelDoctor/backend/src/analytics/services/events-analytics.service.ts"
FUNNEL_SERVICE="/Users/mehdi/CascadeProjects/FunnelDoctor/backend/src/analytics/services/funnel-analytics.service.ts"
LEADS_SERVICE="/Users/mehdi/CascadeProjects/FunnelDoctor/backend/src/analytics/services/leads-analytics.service.ts"

# Fonction pour ajouter site_id: null aprn00e8s les lignes user_id dans un fichier
add_site_id() {
  local file=$1
  
  # Rechercher les lignes avec user_id et ajouter site_id: null juste aprn00e8s
  sed -i '' '/user_id: params.userId || null,/a\
          site_id: null, // Param requis par la signature SQL' "$file"
  sed -i '' '/user_id: params.userId || null$/a\
          site_id: null, // Param requis par la signature SQL' "$file"
  
  echo "Modifications appliquu00e9es u00e0 $file"
}

# Appliquer les modifications u00e0 chaque service
add_site_id "$EVENTS_SERVICE"
add_site_id "$FUNNEL_SERVICE"
add_site_id "$LEADS_SERVICE"

echo "Modification terminu00e9e. site_id: null ru00e9introduit dans tous les appels RPC."
