import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { LeadStatus } from '../enums/lead-status.enum';
import { Lead } from '../entities/lead.entity';
import { LeadStatusHistoryService } from './lead-status-history.service';

/**
 * Du00e9finition des transitions d'u00e9tat valides
 * Chaque clu00e9 repru00e9sente un u00e9tat de du00e9part et les valeurs sont les u00e9tats cibles autorisu00e9s
 */
const VALID_TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
  [LeadStatus.NEW]: [LeadStatus.CONTACTED, LeadStatus.LOST],
  [LeadStatus.CONTACTED]: [LeadStatus.QUALIFIED, LeadStatus.LOST],
  [LeadStatus.QUALIFIED]: [LeadStatus.NEGOTIATION, LeadStatus.LOST],
  [LeadStatus.NEGOTIATION]: [LeadStatus.WON, LeadStatus.LOST],
  [LeadStatus.WON]: [LeadStatus.LOST],  // Un lead gagnu00e9 peut u00eatre perdu ultu00e9rieurement
  [LeadStatus.LOST]: [LeadStatus.CONTACTED]  // Un lead perdu peut u00eatre recontactu00e9
};

@Injectable()
export class LeadStatusService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly statusHistoryService: LeadStatusHistoryService,
  ) {}

  /**
   * Vu00e9rifie si une transition d'u00e9tat est valide
   * @param fromStatus Statut de du00e9part
   * @param toStatus Statut cible
   * @returns true si la transition est valide, false sinon
   */
  isValidTransition(fromStatus: LeadStatus, toStatus: LeadStatus): boolean {
    // Si l'u00e9tat est le mu00eame, la transition est invalide
    if (fromStatus === toStatus) {
      return false;
    }
    
    // Vu00e9rifie si la transition est autorisu00e9e
    return VALID_TRANSITIONS[fromStatus].includes(toStatus);
  }

  /**
   * Change le statut d'un lead
   * @param userId ID de l'utilisateur effectuant la transition
   * @param leadId ID du lead u00e0 modifier
   * @param newStatus Nouveau statut du lead
   * @param comment Commentaire optionnel sur la transition
   * @returns Le lead mis u00e0 jour
   */
  async changeLeadStatus(
    userId: string, 
    leadId: string, 
    newStatus: LeadStatus, 
    comment?: string
  ): Promise<Lead> {
    // Ru00e9cupu00e9rer le lead et son statut actuel
    const { data: lead, error: fetchError } = await this.supabaseService
      .getClient()
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !lead) {
      throw new NotFoundException(`Lead avec l'ID ${leadId} non trouvu00e9`);
    }

    const currentStatus = lead.status as LeadStatus;

    // Vu00e9rifier que la transition est valide
    if (!this.isValidTransition(currentStatus, newStatus)) {
      throw new BadRequestException(
        `Transition invalide: impossible de passer de '${currentStatus}' u00e0 '${newStatus}'`
      );
    }

    // Mettre u00e0 jour le statut du lead
    const { data: updatedLead, error: updateError } = await this.supabaseService
      .getClient()
      .from('leads')
      .update({ 
        status: newStatus,
        updated_at: new Date()
      })
      .eq('id', leadId)
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // Ajouter une entru00e9e dans l'historique des statuts
    // Note: Pas besoin d'attendre cette opu00e9ration car le trigger PostgreSQL s'en charge du00e9ju00e0
    // Nous ajoutons une entru00e9e manuelle uniquement pour le commentaire si fourni
    if (comment) {
      await this.statusHistoryService.addStatusHistoryEntry(
        leadId,
        userId,
        newStatus,
        currentStatus,
        comment
      );
    }

    console.log(`Lead ${leadId} transitionnu00e9 de '${currentStatus}' u00e0 '${newStatus}'${comment ? ` avec commentaire: ${comment}` : ''}`);
    
    return updatedLead;
  }
}
