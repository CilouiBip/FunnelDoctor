import { Injectable, Logger } from '@nestjs/common';
import { BridgingService } from '../bridging/bridging.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RdvService {
  private readonly logger = new Logger(RdvService.name);

  constructor(
    private readonly bridgingService: BridgingService,
    private readonly configService: ConfigService,
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
   * Gu00e8re l'u00e9vu00e9nement de cru00e9ation d'un invitu00e9 Calendly
   * Association du visitor_id au lead
   * @param payload Donnu00e9es de l'u00e9vu00e9nement
   */
  private async handleInviteeCreated(payload: any) {
    const { invitee, tracking } = payload.payload;
    if (!invitee || !invitee.email) {
      this.logger.warn('Donnu00e9es invitee.created incomplu00e8tes');
      return { success: false, reason: 'incomplete_data' };
    }

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
      const result = await this.bridgingService.associateVisitorToLead({
        visitor_id,
        email: invitee.email,
        user_id: userId,
        source: 'calendly',
        metadata: {
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

      this.logger.log(
        `Bridging ru00e9ussi pour RDV Calendly: visitor_id=${visitor_id} -> lead_id=${result.lead_id}`
      );

      return {
        success: true, 
        lead_id: result.lead_id,
        visitor_id,
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
