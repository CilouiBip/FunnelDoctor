#!/bin/bash

# Script pour neutraliser les appels RPC problématiques dans les services Analytics
# Stratégie: commenter les appels RPC et retourner des tableaux vides

# Chemins des fichiers à modifier
EVENTS_SERVICE="/Users/mehdi/CascadeProjects/FunnelDoctor/backend/src/analytics/services/events-analytics.service.ts"
FUNNEL_SERVICE="/Users/mehdi/CascadeProjects/FunnelDoctor/backend/src/analytics/services/funnel-analytics.service.ts"
LEADS_SERVICE="/Users/mehdi/CascadeProjects/FunnelDoctor/backend/src/analytics/services/leads-analytics.service.ts"

echo "1. Neutralisation des appels RPC dans EventsAnalyticsService..."

# Remplacer les blocs d'appel à getEventsByCategory
sed -i '' '/const.*data.*error.*await.*this\.supabaseService\.getClient().*rpc.*get_events_by_category/,/return data || \[\];/c\
      // TODO - MVP: Implement specific MVP logic instead of generic\/bugged function call\n      // const { data, error } = await this.supabaseService.getClient().rpc(...)\n      // if (error) {\n      //   this.logger.error(...)\n      //   throw new Error(...)\n      // }\n      \n      return []; // Renvoie un tableau vide pour éviter les erreurs 500' "$EVENTS_SERVICE"

# Remplacer les blocs d'appel à getEventsBySource
sed -i '' '/const.*data.*error.*await.*this\.supabaseService\.getClient().*rpc.*get_events_by_source/,/return data || \[\];/c\
      // TODO - MVP: Implement specific MVP logic instead of generic\/bugged function call\n      // const { data, error } = await this.supabaseService.getClient().rpc(...)\n      // if (error) {\n      //   this.logger.error(...)\n      //   throw new Error(...)\n      // }\n      \n      return []; // Renvoie un tableau vide pour éviter les erreurs 500' "$EVENTS_SERVICE"

# Remplacer les blocs d'appel à getEventsTimeline
sed -i '' '/const.*data.*error.*await.*this\.supabaseService\.getClient().*rpc.*get_events_timeline/,/return data || \[\];/c\
      // TODO - MVP: Implement specific MVP logic instead of generic\/bugged function call\n      // const { data, error } = await this.supabaseService.getClient().rpc(...)\n      // if (error) {\n      //   this.logger.error(...)\n      //   throw new Error(...)\n      // }\n      \n      return []; // Renvoie un tableau vide pour éviter les erreurs 500' "$EVENTS_SERVICE"

# Remplacer les blocs d'appel à getTotalEvents
sed -i '' '/const.*data.*error.*await.*this\.supabaseService\.getClient().*rpc.*get_total_events/,/return data || 0;/c\
      // TODO - MVP: Implement specific MVP logic instead of generic\/bugged function call\n      // const { data, error } = await this.supabaseService.getClient().rpc(...)\n      // if (error) {\n      //   this.logger.error(...)\n      //   throw new Error(...)\n      // }\n      \n      return 0; // Renvoie 0 pour éviter les erreurs 500' "$EVENTS_SERVICE"

echo "2. Neutralisation des appels RPC dans FunnelAnalyticsService..."

# Neutralisation des appels à getFunnelStagesAnalysis
sed -i '' '/const.*stages.*stagesError.*await.*this\.supabaseService\.getClient().*rpc.*get_funnel_stages_analysis/,/return stages || \[\];/c\
      // TODO - MVP: Implement specific MVP logic instead of generic\/bugged function call\n      // const { data: stages, error: stagesError } = await this.supabaseService.getClient().rpc(...)\n      // if (stagesError) {\n      //   this.logger.error(...)\n      //   throw new Error(...)\n      // }\n      \n      return []; // Renvoie un tableau vide pour éviter les erreurs 500' "$FUNNEL_SERVICE"

# Neutralisation des appels à getFunnelOverallConversion
sed -i '' '/const.*overall.*overallError.*await.*this\.supabaseService\.getClient().*rpc.*get_funnel_overall_conversion/,/return overall\?\[0\] || null;/c\
      // TODO - MVP: Implement specific MVP logic instead of generic\/bugged function call\n      // const { data: overall, error: overallError } = await this.supabaseService.getClient().rpc(...)\n      // if (overallError) {\n      //   this.logger.error(...)\n      //   throw new Error(...)\n      // }\n      \n      return { total_visitors: 0, total_leads: 0, conversion_rate: 0 }; // Renvoie des valeurs par défaut pour éviter les erreurs 500' "$FUNNEL_SERVICE"

# Neutralisation des appels à getFunnelTimeAnalysis
sed -i '' '/const.*timeData.*timeError.*await.*this\.supabaseService\.getClient().*rpc.*get_funnel_time_analysis/,/return timeData || \[\];/c\
      // TODO - MVP: Implement specific MVP logic instead of generic\/bugged function call\n      // const { data: timeData, error: timeError } = await this.supabaseService.getClient().rpc(...)\n      // if (timeError) {\n      //   this.logger.error(...)\n      //   throw new Error(...)\n      // }\n      \n      return []; // Renvoie un tableau vide pour éviter les erreurs 500' "$FUNNEL_SERVICE"

echo "3. Neutralisation des appels RPC dans LeadsAnalyticsService..."

# Neutralisation des appels à getTotalLeads
sed -i '' '/const.*data.*error.*await.*this\.supabaseService\.getClient().*rpc.*get_total_leads/,/return data || 0;/c\
      // TODO - MVP: Implement specific MVP logic instead of generic\/bugged function call\n      // const { data, error } = await this.supabaseService.getClient().rpc(...)\n      // if (error) {\n      //   this.logger.error(...)\n      //   throw new Error(...)\n      // }\n      \n      return 0; // Renvoie 0 pour éviter les erreurs 500' "$LEADS_SERVICE"

# Neutralisation des appels à getLeadsConversionRate
sed -i '' '/const.*data.*error.*await.*this\.supabaseService\.getClient().*rpc.*get_leads_conversion_rate/,/return data\?\[0\] || { conversion_rate: 0 };/c\
      // TODO - MVP: Implement specific MVP logic instead of generic\/bugged function call\n      // const { data, error } = await this.supabaseService.getClient().rpc(...)\n      // if (error) {\n      //   this.logger.error(...)\n      //   throw new Error(...)\n      // }\n      \n      return { conversion_rate: 0 }; // Renvoie une valeur par défaut pour éviter les erreurs 500' "$LEADS_SERVICE"

# Neutralisation des appels à getLeadsBySource
sed -i '' '/const.*data.*error.*await.*this\.supabaseService\.getClient().*rpc.*get_leads_by_source/,/return data || \[\];/c\
      // TODO - MVP: Implement specific MVP logic instead of generic\/bugged function call\n      // const { data, error } = await this.supabaseService.getClient().rpc(...)\n      // if (error) {\n      //   this.logger.error(...)\n      //   throw new Error(...)\n      // }\n      \n      return []; // Renvoie un tableau vide pour éviter les erreurs 500' "$LEADS_SERVICE"

# Neutralisation des appels à getLeadsTimeline
sed -i '' '/const.*data.*error.*await.*this\.supabaseService\.getClient().*rpc.*get_leads_timeline/,/return data || \[\];/c\
      // TODO - MVP: Implement specific MVP logic instead of generic\/bugged function call\n      // const { data, error } = await this.supabaseService.getClient().rpc(...)\n      // if (error) {\n      //   this.logger.error(...)\n      //   throw new Error(...)\n      // }\n      \n      return []; // Renvoie un tableau vide pour éviter les erreurs 500' "$LEADS_SERVICE"

echo "Neutralisation terminée. Tous les appels RPC problématiques ont été commentés et remplacés par des valeurs par défaut."
