import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateConversionEventDto } from './dto/create-conversion-event.dto';
import { ConversionEventType } from './enums/conversion-event-type.enum';
import { LeadStatusService } from '../leads/services/lead-status.service';
import { ConversionEvent } from './interfaces/conversion-event.interface';
import { LeadStatus } from '../leads/enums/lead-status.enum';

@Injectable()
export class ConversionEventsService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly leadStatusService: LeadStatusService,
  ) {}

  /**
   * Cru00e9e un nouvel u00e9vu00e9nement de conversion et du00e9clenche potentiellement
   * un changement automatique de statut du lead en fonction du type d'u00e9vu00e9nement
   * @param dto Donnu00e9es de l'u00e9vu00e9nement
   * @param userId ID de l'utilisateur qui cru00e9e l'u00e9vu00e9nement
   * @returns L'u00e9vu00e9nement cru00e9u00e9
   */
  async create(dto: CreateConversionEventDto, userId: string): Promise<ConversionEvent> {
    const { data, error } = await this.supabaseService.getAdminClient()
      .from('conversion_events')
      .insert({
        lead_id: dto.leadId,
        event_type: dto.eventType,
        event_data: dto.eventData || {},
        amount: dto.amount,
        user_id: userId
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create conversion event: ${error.message}`);
    }

    // Transformation des noms de colonnes snake_case en camelCase
    const conversionEvent: ConversionEvent = {
      id: data.id,
      leadId: data.lead_id,
      eventType: data.event_type,
      eventData: data.event_data,
      amount: data.amount,
      userId: data.user_id,
      createdAt: new Date(data.created_at)
    };

    // Gestion des transitions automatiques de statut
    await this.handleAutomaticStatusTransition(dto.leadId, dto.eventType, dto.comment);

    return conversionEvent;
  }

  /**
   * Ru00e9cupu00e8re tous les u00e9vu00e9nements de conversion d'un lead
   * @param leadId ID du lead
   * @returns Liste des u00e9vu00e9nements de conversion
   */
  async findByLeadId(leadId: string): Promise<ConversionEvent[]> {
    const { data, error } = await this.supabaseService.getAdminClient()
      .from('conversion_events')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch conversion events: ${error.message}`);
    }

    // Transformation des noms de colonnes snake_case en camelCase
    return data.map(item => ({
      id: item.id,
      leadId: item.lead_id,
      eventType: item.event_type,
      eventData: item.event_data,
      amount: item.amount,
      userId: item.user_id,
      createdAt: new Date(item.created_at)
    }));
  }
  
  /**
   * Ru00e9cupu00e8re les statistiques d'u00e9vu00e9nements de conversion
   * @returns Statistiques agrégées
   */
  async getStats() {
    // Exemple de statistiques sur les u00e9vu00e9nements de conversion
    const { data, error } = await this.supabaseService.getAdminClient()
      .from('conversion_events')
      .select('event_type, count(*), sum(amount)');
    
    if (error) {
      throw new Error(`Failed to fetch conversion stats: ${error.message}`);
    }
    
    return data;
  }

  /**
   * Mu00e9thode privu00e9e pour gu00e9rer les transitions automatiques de statut
   * en fonction du type d'u00e9vu00e9nement de conversion
   * @param leadId ID du lead
   * @param eventType Type d'u00e9vu00e9nement de conversion
   * @param comment Commentaire optionnel 
   */
  private async handleAutomaticStatusTransition(
    leadId: string, 
    eventType: ConversionEventType,
    comment?: string
  ): Promise<void> {
    // Récupérer d'abord les données du lead pour obtenir son user_id
    const { data: lead, error: fetchError } = await this.supabaseService.getAdminClient()
      .from('leads')
      .select('user_id')
      .eq('id', leadId)
      .single();
      
    if (fetchError || !lead) {
      console.error(`Impossible de récupérer le lead ${leadId}: ${fetchError?.message || 'Lead non trouvé'}`);
      return;
    }

    const userId = lead.user_id;

    // Règles de transition automatiques basées sur les événements
    switch (eventType) {
      case ConversionEventType.PURCHASE_MADE:
        // Transition automatique vers "won" si un achat est effectué
        try {
          await this.leadStatusService.changeLeadStatus(
            userId,
            leadId, 
            LeadStatus.WON, 
            comment || 'Achat effectué - transition automatique'
          );
        } catch (error) {
          // Ignorer l'erreur si la transition n'est pas valide selon les ru00e8gles mu00e9tier
          console.log(`Transition automatique vers "won" impossible: ${error.message}`);
        }
        break;
      
      case ConversionEventType.DEMO_REQUEST:
        // Transition automatique vers "qualified" si une du00e9mo est demandu00e9e
        try {
          await this.leadStatusService.changeLeadStatus(
            userId,
            leadId, 
            LeadStatus.QUALIFIED,
            comment || 'Demande de démo - transition automatique'
          );
        } catch (error) {
          console.log(`Transition automatique vers "qualified" impossible: ${error.message}`);
        }
        break;
        
      case ConversionEventType.TRIAL_STARTED:
        // Transition automatique vers "negotiation" si un essai est démarré
        try {
          await this.leadStatusService.changeLeadStatus(
            userId,
            leadId, 
            LeadStatus.NEGOTIATION,
            comment || 'Essai démarré - transition automatique'
          );
        } catch (error) {
          console.log(`Transition automatique vers "negotiation" impossible: ${error.message}`);
        }
        break;
    }
  }
}
