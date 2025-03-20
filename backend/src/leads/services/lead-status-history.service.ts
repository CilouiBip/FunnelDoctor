import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { LeadStatus } from '../enums/lead-status.enum';
import { LeadStatusHistory } from '../interfaces/lead-status-history.interface';

@Injectable()
export class LeadStatusHistoryService {
  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Ajoute une nouvelle entrée dans l'historique des statuts d'un lead
   * @param leadId ID du lead concerné
   * @param userId ID de l'utilisateur effectuant la transition
   * @param newStatus Nouveau statut du lead
   * @param oldStatus Ancien statut du lead (optionnel)
   * @param comment Commentaire sur la transition (optionnel)
   * @returns L'entrée créée dans l'historique
   */
  async addStatusHistoryEntry(
    leadId: string,
    userId: string,
    newStatus: LeadStatus,
    oldStatus?: LeadStatus,
    comment?: string,
  ): Promise<LeadStatusHistory> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('lead_status_history')
      .insert([
        {
          lead_id: leadId,
          user_id: userId,
          old_status: oldStatus,
          new_status: newStatus,
          comment,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Erreur lors de l\'ajout d\'une entrée dans l\'historique des statuts:', error);
      throw error;
    }

    return data;
  }

  /**
   * Récupère l'historique des statuts d'un lead
   * @param userId ID de l'utilisateur propriétaire du lead
   * @param leadId ID du lead
   * @returns Liste des transitions de statut du lead
   */
  async getLeadStatusHistory(userId: string, leadId: string): Promise<LeadStatusHistory[]> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('lead_status_history')
      .select('*')
      .eq('lead_id', leadId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erreur lors de la récupération de l\'historique des statuts:', error);
      throw error;
    }

    return data;
  }
}
