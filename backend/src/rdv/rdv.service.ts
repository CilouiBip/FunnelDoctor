import { Injectable, Logger } from '@nestjs/common';
import { BridgingService } from '../bridging/bridging.service';
import { ConfigService } from '@nestjs/config';
import { TouchpointsService } from '../touchpoints/touchpoints.service';
import { SupabaseService } from '../supabase/supabase.service';
import { FunnelProgressService } from '../funnel-progress/funnel-progress.service';
import { MasterLeadService } from '../leads/services/master-lead.service';

@Injectable()
export class RdvService {
  private readonly logger = new Logger(RdvService.name);

  constructor(
    private readonly bridgingService: BridgingService,
    private readonly configService: ConfigService,
    private readonly touchpointsService: TouchpointsService,
    private readonly supabaseService: SupabaseService,
    private readonly funnelProgressService: FunnelProgressService,
    private readonly masterLeadService: MasterLeadService,
  ) {}

  /**
   * Traite les u00e9vu00e9nements webhook de Calendly
   * @param payload Donnu00e9es du webhook
   * @param signature Signature du webhook pour validation
   * @returns Ru00e9sultat du traitement
   */
  async handleWebhookEvent(payload: any, signature: string) {
    this.logger.log(`u00c9vu00e9nement webhook Calendly reu00e7u: ${payload.event}`);

    // Vu00e9rifier la signature du webhook
    const webhookSecret = this.configService.get<string>('CALENDLY_WEBHOOK_SECRET');
    if (webhookSecret) {
      try {
        this.verifySignature(payload, signature, webhookSecret);
      } catch (error) {
        this.logger.error('Erreur de validation webhook Calendly', error);
        throw new Error(`Webhook Error: ${error.message}`);
      }
    } else {
      this.logger.warn('CALENDLY_WEBHOOK_SECRET non du00e9finie, signature non vu00e9rifiu00e9e');
    }

    // Traiter diffu00e9rents types d'u00e9vu00e9nements
    try {
      switch (payload.event) {
        case 'invitee.created':
          return this.handleInviteeCreated(payload);
        default:
          this.logger.log(`u00c9vu00e9nement Calendly non gu00e9ru00e9: ${payload.event}`);
          return { received: true, type: payload.event, processed: false };
      }
    } catch (error) {
      this.logger.error(`Erreur lors du traitement de l'u00e9vu00e9nement ${payload.event}`, error);
      throw error;
    }
  }

  /**
   * Vu00e9rifie la signature du webhook Calendly
   * @param payload Contenu du webhook
   * @param signature Signature reu00e7ue
   * @param secret Secret pour la validation
   */
  private verifySignature(payload: any, signature: string, secret: string) {
    // Implu00e9mentation de la vu00e9rification selon la documentation Calendly
    // Note: Calendly utilise une approche diffu00e9rente de Stripe pour les signatures
    // Cette mu00e9thode doit u00eatre ajustu00e9e selon la mu00e9thode exacte utilisu00e9e par Calendly
    
    // Placeholder - implu00e9menter selon la documentation officielle
    if (!signature) {
      throw new Error('Signature manquante');
    }
    
    // Comme il s'agit d'un prototype et que Calendly n'utilise pas un mu00e9canisme standard
    // comme HMAC pour ses webhooks, nous laissons cette vu00e9rification simple pour le moment
    return true;
  }
  
  /**
   * Marque un rendez-vous comme complété
   * Crée un touchpoint 'rdv_completed' et met à jour les événements de conversion
   * @param eventId L'identifiant de l'événement Calendly
   * @param data Données complémentaires
   */
  async markAppointmentAsCompleted(eventId: string, data: { visitor_id?: string, notes?: string }) {
    this.logger.log(`Marquage du RDV ${eventId} comme complété`);
    
    try {
      // 1. Rechercher le touchpoint 'rdv_scheduled' correspondant
      const { data: scheduledEvents, error: searchError } = await this.supabaseService
        .getAdminClient()
        .from('touchpoints')
        .select('*')
        .eq('event_type', 'rdv_scheduled')
        .filter('event_data->event_id', 'eq', eventId);
        
      if (searchError) {
        this.logger.error('Erreur lors de la recherche du RDV programmé', searchError);
        throw searchError;
      }
      
      if (!scheduledEvents || scheduledEvents.length === 0) {
        this.logger.warn(`Aucun RDV programmé trouvé avec l'ID ${eventId}`);
        return { success: false, reason: 'appointment_not_found' };
      }
      
      const scheduledEvent = scheduledEvents[0];
      const visitor_id = data.visitor_id || scheduledEvent.visitor_id;
      
      // 2. Créer un touchpoint 'rdv_completed'
      const touchpointResult = await this.touchpointsService.create({
        visitor_id,
        event_type: 'rdv_completed',
        event_data: {
          ...scheduledEvent.event_data,
          completed_at: new Date().toISOString(),
          notes: data.notes,
          scheduled_touchpoint_id: scheduledEvent.id
        }
      });
      
      this.logger.log(`Touchpoint 'rdv_completed' créé avec succès: ${touchpointResult.id}`);
      
      // 3. Créer/mettre à jour l'événement de conversion
      try {
        // Rechercher s'il existe déjà un événement de conversion pour ce lead
        const leadId = scheduledEvent.event_data?.lead_id;
        if (leadId) {
          // Pour la table conversion_events, créer un nouvel événement CUSTOM
          const { data: conversionData, error: conversionError } = await this.supabaseService
            .getAdminClient()
            .from('conversion_events')
            .insert({
              lead_id: leadId,
              event_type: 'CUSTOM', // Utiliser CUSTOM car rdv_completed n'est pas dans l'enum
              event_data: {
                type: 'rdv_completed',
                event_id: eventId,
                completed_at: new Date().toISOString(),
                notes: data.notes
              }
            })
            .select()
            .single();
            
          if (conversionError) {
            this.logger.error("Erreur lors de la création de l'événement de conversion", conversionError);
          } else {
            this.logger.log(`Événement de conversion rdv_completed créé: ${conversionData.id}`);
          }
        }
      } catch (error) {
        this.logger.error("Erreur lors de la gestion de l'événement de conversion", error);
        // Continuer malgré l'erreur
      }
      
      // Mettre u00e0 jour la progression du funnel
      try {
        const funnelResult = await this.funnelProgressService.updateFunnelProgress({
          visitor_id,
          current_stage: 'rdv_completed',
          rdv_completed_at: new Date().toISOString(),
          user_id: 'system', // User ID par du00e9faut si non fourni
        });
        
        this.logger.log(`Progression du funnel mise u00e0 jour: ${funnelResult.id}, stage=${funnelResult.current_stage}`);
      } catch (funnelError) {
        this.logger.error('Erreur lors de la mise u00e0 jour de la progression du funnel', funnelError);
        // On continue mu00eame si l'enregistrement du funnel u00e9choue
      }
      
      return {
        success: true,
        touchpoint_id: touchpointResult.id,
        visitor_id,
        event_id: eventId
      };
      
    } catch (error) {
      this.logger.error('Erreur lors du marquage du RDV comme complété', error);
      throw error;
    }
  }
  
  /**
   * Récupère la liste des rendez-vous programmés
   * @returns Liste des RDV programmés avec leur statut
   */
  async getScheduledAppointments() {
    this.logger.log('Récupération des RDV programmés');
    
    try {
      // 1. Récupérer tous les touchpoints 'rdv_scheduled'
      const { data: scheduledEvents, error: scheduledError } = await this.supabaseService
        .getAdminClient()
        .from('touchpoints')
        .select('*')
        .eq('event_type', 'rdv_scheduled')
        .order('created_at', { ascending: false });
        
      if (scheduledError) {
        this.logger.error('Erreur lors de la récupération des RDV programmés', scheduledError);
        throw scheduledError;
      }
      
      // 2. Récupérer tous les touchpoints 'rdv_completed' pour vérifier les statuts
      const { data: completedEvents, error: completedError } = await this.supabaseService
        .getAdminClient()
        .from('touchpoints')
        .select('*')
        .eq('event_type', 'rdv_completed');
        
      if (completedError) {
        this.logger.error('Erreur lors de la récupération des RDV complétés', completedError);
        throw completedError;
      }
      
      // 3. Créer un map des événements complétés pour vérification rapide
      const completedMap = new Map();
      completedEvents.forEach(event => {
        if (event.event_data?.scheduled_touchpoint_id) {
          completedMap.set(event.event_data.scheduled_touchpoint_id, event);
        }
      });
      
      // 4. Enrichir les événements programmés avec leur statut de réalisation
      const enrichedEvents = scheduledEvents.map(event => {
        const completed = completedMap.has(event.id);
        const completedEvent = completed ? completedMap.get(event.id) : null;
        
        return {
          ...event,
          status: completed ? 'completed' : 'scheduled',
          completed_at: completed ? completedEvent.event_data.completed_at : null,
          completed_id: completed ? completedEvent.id : null
        };
      });
      
      return {
        success: true,
        appointments: enrichedEvents,
        total: enrichedEvents.length
      };
      
    } catch (error) {
      this.logger.error('Erreur lors de la récupération des RDV', error);
      throw error;
    }
  }

  /**
   * Gu00e8re l'u00e9vu00e9nement de cru00e9ation d'un invitu00e9 Calendly
   * Association du visitor_id au lead
   * @param payload Donnu00e9es de l'u00e9vu00e9nement
   */
  private async handleInviteeCreated(payload: any) {
    const { invitee, tracking } = payload.payload;
    if (!invitee || !invitee.email) {
      this.logger.warn('Données invitee.created incomplètes');
      return { success: false, reason: 'incomplete_data' };
    }
    
    this.logger.log(`Détail complet de l'événement invitee.created: ${JSON.stringify(payload)}`);


    // Extraire le visitor_id des paramètres UTM
    let visitor_id = null;
    
    // Chercher dans les paramètres UTM standards
    if (tracking) {
      // Méthode 1: format visitor_id/value dans utm_source/utm_medium
      if (tracking.utm_source === 'visitor_id' && tracking.utm_medium) {
        visitor_id = tracking.utm_medium;
        this.logger.log(`Visitor ID trouvé dans utm_medium: ${visitor_id}`);
      }
      // Méthode 2: valeur directe dans utm_content
      else if (tracking.utm_content && tracking.utm_content.startsWith('visitor_')) {
        visitor_id = tracking.utm_content;
        this.logger.log(`Visitor ID trouvé dans utm_content: ${visitor_id}`);
      }
      // Méthode 3: paramètre fd_tlid personnalisé
      else if (payload.payload.tracking.fd_tlid) {
        visitor_id = payload.payload.tracking.fd_tlid;
        this.logger.log(`Visitor ID trouvé dans fd_tlid: ${visitor_id}`);
      }
    }

    if (!visitor_id) {
      this.logger.warn('Aucun visitor_id trouvu00e9 dans les paramu00e8tres UTM');
      return { success: false, reason: 'no_visitor_id' };
    }

    // Extraire l'ID utilisateur (propriu00e9taire du calendrier)
    // Pour un systu00e8me ru00e9el, cela nu00e9cessiterait une table de mappage entre
    // les IDs Calendly et les IDs utilisateurs de l'application
    const userId = this.extractUserIdFromCalendlyEvent(payload);
    if (!userId) {
      this.logger.warn('Impossible de du00e9terminer l\'utilisateur pour cet u00e9vu00e9nement Calendly');
      return { success: false, reason: 'unknown_user' };
    }

    try {
      const result = await this.bridgingService.createAssociation({
        visitor_id,
        email: invitee.email,
        source_action: 'calendly',
        event_data: {
          event_type: payload.payload.event_type?.name,
          invitee_name: invitee.name,
          invitee_timezone: invitee.timezone,
          scheduled_time: payload.payload.scheduled_event?.start_time,
          event_status: 'scheduled',
          utm_source: tracking?.utm_source,
          utm_medium: tracking?.utm_medium,
          utm_campaign: tracking?.utm_campaign,
          calendly_event_uri: payload.payload.scheduled_event?.uri,
          rdv_time: new Date().toISOString(),
        },
      });
      
      // Créer ou récupérer le MasterLead à partir de l'email et visitor_id
      const masterLead = await this.masterLeadService.findOrCreateMasterLead(
        { email: invitee.email, visitor_id },
        userId,
        'rdv_service'
      );

      this.logger.log(
        `Bridging réussi pour RDV Calendly: visitor_id=${visitor_id} -> MasterLead ID=${masterLead.id}`
      );
      
      // Créer un touchpoint pour l'événement rdv_scheduled
      try {
        const touchpointResult = await this.touchpointsService.create({
          master_lead_id: masterLead.id, // Utiliser l'ID du MasterLead
          visitor_id,
          event_type: 'rdv_scheduled',
          event_data: {
            // Suppression de lead_id qui faisait référence à result.lead_id
            calendly_event_uri: payload.payload.scheduled_event?.uri,
            scheduled_time: payload.payload.scheduled_event?.start_time,
            invitee_email: invitee.email,
            invitee_name: invitee.name,
            event_name: payload.payload.event_type?.name,
            event_id: payload.payload.scheduled_event?.uuid || payload.payload.scheduled_event?.id,
          },
          page_url: payload.payload.tracking?.utm_source ? `utm_source=${payload.payload.tracking.utm_source}` : undefined,
        });
        
        this.logger.log(`Touchpoint 'rdv_scheduled' créé avec succès: ${touchpointResult.id}`);
      } catch (touchpointError) {
        this.logger.error('Erreur lors de la création du touchpoint rdv_scheduled', touchpointError);
        // On continue même en cas d'erreur de création du touchpoint
      }
      
      // Créer un événement de conversion pour conserver la compatibilité
      try {
        const { data, error } = await this.supabaseService
          .getAdminClient()
          .from('conversion_events')
          .insert({
            lead_id: masterLead.id, // Utiliser l'ID du MasterLead
            event_type: 'DEMO_REQUEST',
            event_data: {
              source: 'calendly',
              event_name: payload.payload.event_type?.name,
              scheduled_time: payload.payload.scheduled_event?.start_time,
            },
            created_by: userId
          })
          .select()
          .single();
          
        if (error) {
          this.logger.error("Erreur lors de la création de l'événement de conversion", error);
        } else {
          this.logger.log(`Événement de conversion créé avec succès: ${data.id}`);
        }
      } catch (conversionError) {
        this.logger.error("Erreur lors de la création de l'événement de conversion", conversionError);
        // On continue même en cas d'erreur
      }
      
      // Mettre u00e0 jour la progression du funnel
      try {
        const funnelResult = await this.funnelProgressService.updateFunnelProgress({
          visitor_id,
          current_stage: 'rdv_scheduled',
          rdv_scheduled_at: payload.payload.scheduled_event?.start_time || new Date().toISOString(),
          user_id: userId,
        });
        
        this.logger.log(`Progression du funnel mise u00e0 jour: ${funnelResult.id}, stage=${funnelResult.current_stage}`);
      } catch (funnelError) {
        this.logger.error('Erreur lors de la mise u00e0 jour de la progression du funnel', funnelError);
        // On continue mu00eame si l'enregistrement du funnel u00e9choue
      }
      
      return {
        success: true, 
        masterLeadId: masterLead.id, // Utiliser l'ID du MasterLead avec un nom plus explicite
        visitor_id,
        association_id: result.association.id, // Conserver aussi l'ID de l'association
      };
    } catch (error) {
      this.logger.error('Erreur lors du bridging pour RDV Calendly', error);
      throw error;
    }
  }

  /**
   * Extrait l'ID utilisateur d'un u00e9vu00e9nement Calendly
   * Dans une implu00e9mentation ru00e9elle, ce serait une table de mappage
   * @param payload Donnu00e9es de l'u00e9vu00e9nement Calendly
   */
  private extractUserIdFromCalendlyEvent(payload: any): string | null {
    // Implu00e9mentation temporaire
    // Dans un systu00e8me ru00e9el, nous aurions une table de mappage
    // entre les ID Calendly et les ID utilisateurs
    
    // Pour le prototype, nous pouvons extraire l'ID u00e0 partir des custom_questions
    // ou d'un autre champ dans lequel l'infopreneur aurait mis son ID utilisateur
    
    // Chercher dans les questions personnalisu00e9es
    const customQuestions = payload.payload.questions_and_answers;
    if (customQuestions) {
      for (const qa of customQuestions) {
        if (qa.question.toLowerCase().includes('user_id') || qa.question.toLowerCase().includes('utilisateur')) {
          return qa.answer;
        }
      }
    }
    
    // Chercher dans les utm_parameters
    if (payload.payload.tracking?.utm_content) {
      // Parfois les infopreneurs stockent l'ID utilisateur dans utm_content
      return payload.payload.tracking.utm_content;
    }
    
    // Fallback : utiliser un ID utilisateur par du00e9faut
    // En production, il faudrait implu00e9menter une solution plus robuste
    return process.env.DEFAULT_USER_ID || null;
  }
}
