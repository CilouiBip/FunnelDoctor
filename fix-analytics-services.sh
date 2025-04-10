#!/bin/bash

# Script pour supprimer les ru00e9fu00e9rences u00e0 site_id dans les services d'analytics

# Chemins des fichiers u00e0 modifier
EVENTS_SERVICE="/Users/mehdi/CascadeProjects/FunnelDoctor/backend/src/analytics/services/events-analytics.service.ts"
FUNNEL_SERVICE="/Users/mehdi/CascadeProjects/FunnelDoctor/backend/src/analytics/services/funnel-analytics.service.ts"
LEADS_SERVICE="/Users/mehdi/CascadeProjects/FunnelDoctor/backend/src/analytics/services/leads-analytics.service.ts"

# Fonction pour supprimer les ru00e9fu00e9rences u00e0 site_id dans un fichier
remove_site_id() {
  local file=$1
  # Utiliser sed pour supprimer les lignes contenant 'site_id: null'
  sed -i '' '/site_id: null/d' "$file"
  echo "Modifications appliquu00e9es u00e0 $file"
}

# Appliquer les modifications u00e0 chaque service
remove_site_id "$EVENTS_SERVICE"
remove_site_id "$FUNNEL_SERVICE"
remove_site_id "$LEADS_SERVICE"

echo "Modification terminu00e9e. Suppression des ru00e9fu00e9rences u00e0 site_id dans tous les services d'analytics."
