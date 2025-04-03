import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class FunnelProgressService {
  private readonly logger = new Logger(FunnelProgressService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Trouve ou crée un enregistrement de progression de funnel pour un lead
   * @param leadId ID du master lead
   * @param userId ID de l'utilisateur propriétaire
   * @returns L'enregistrement de progression
   */
  async findOrCreateProgressForLead(leadId: string, userId?: string) {
    const { data: existingProgress, error: fetchError } = await this.supabaseService
      .getAdminClient()
      .from('funnel_progress')
      .select('*')
      .eq('lead_id', leadId)
      .single();
    
    if (fetchError && fetchError.code !== 'PGRST116') {
      this.logger.error(`Erreur lors de la recherche de progression: ${fetchError.message}`);
      throw new Error(`Erreur lors de la recherche de progression pour le lead ${leadId}`);
    }
    
    if (existingProgress) {
      return existingProgress;
    }
    
    // Créer un nouvel enregistrement de progression
    const { data: newProgress, error: insertError } = await this.supabaseService
      .getAdminClient()
      .from('funnel_progress')
      .insert({
        lead_id: leadId,
        stage: 'INITIAL',
        user_id: userId,
      })
      .select()
      .single();
    
    if (insertError) {
      this.logger.error(`Erreur lors de la création de progression: ${insertError.message}`);
      throw new Error(`Erreur lors de la création de progression pour le lead ${leadId}`);
    }
    
    return newProgress;
  }

  /**
   * Met à jour la progression du funnel avec un événement spécifique
   * @param progressId ID de l'enregistrement de progression
   * @param stage Nouvelle étape du funnel
   * @returns L'enregistrement de progression mis à jour
   */
  async updateProgressWithEvent(progressId: string, stage: string) {
    const { data: updatedProgress, error } = await this.supabaseService
      .getAdminClient()
      .from('funnel_progress')
      .update({
        stage,
        updated_at: new Date().toISOString(),
      })
      .eq('id', progressId)
      .select()
      .single();
    
    if (error) {
      this.logger.error(`Erreur lors de la mise à jour de progression: ${error.message}`);
      throw new Error(`Erreur lors de la mise à jour de progression ${progressId}`);
    }
    
    return updatedProgress;
  }

  /**
   * Met u00e0 jour le progru00e8s du funnel pour un visiteur
   * @param params Paramu00e8tres de la mise u00e0 jour
   */
  async updateFunnelProgress(params: {
    visitor_id: string;
    current_stage: 'rdv_scheduled' | 'rdv_completed' | 'payment_succeeded' | 'rdv_canceled';
    rdv_scheduled_at?: Date | string;
    rdv_completed_at?: Date | string;
    rdv_canceled_at?: Date | string;
    payment_at?: Date | string;
    payment_succeeded_at?: Date | string; // Alias pour payment_at
    payment_data?: any; // Données supplémentaires liées au paiement
    amount?: number;
    product_id?: string;
    user_id: string;
  }) {
    const {
      visitor_id,
      current_stage,
      rdv_scheduled_at,
      rdv_completed_at,
      rdv_canceled_at,
      payment_at,
      payment_succeeded_at,
      payment_data,
      amount,
      product_id,
      user_id,
    } = params;

    this.logger.log(
      `Mise u00e0 jour du funnel progress pour visitor_id=${visitor_id}, stage=${current_stage}`
    );

    try {
      // Vu00e9rifier si un enregistrement existe du00e9ju00e0 pour ce visiteur
      const { data: existingProgress, error: searchError } = await this.supabaseService
        .getAdminClient()
        .from('funnel_progress')
        .select('*')
        .eq('visitor_id', visitor_id)
        .maybeSingle();

      if (searchError) {
        this.logger.error('Erreur lors de la recherche du progru00e8s du funnel', searchError);
        throw searchError;
      }

      const currentTime = new Date().toISOString();

      /**
       * Fonction auxiliaire pour formater les dates en ISO 8601
       * @param dateInput Date en format Date, string, ou null/undefined
       * @returns Date au format ISO 8601 ou null
       */
      const formatToISODate = (dateInput: Date | string | null | undefined): string | null => {
        if (!dateInput) return null;
        try {
          // Si c'est déjà une chaîne au format ISO, la retourner telle quelle
          if (typeof dateInput === 'string') {
            // Vérifier si c'est déjà au format ISO
            if (dateInput.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
              return dateInput;
            }
            // Sinon, parser en Date puis convertir
            return new Date(dateInput).toISOString();
          }
          // C'est un objet Date, le convertir en ISO
          return dateInput.toISOString();
        } catch (error) {
          this.logger.warn(`Erreur de conversion de date: ${dateInput}`, error);
          return currentTime; // Utiliser la date actuelle en cas d'erreur
        }
      };

      // Pru00e9parer les donnu00e9es pour la mise u00e0 jour ou l'insertion
      const progressData: any = {
        current_stage,
        user_id,
        updated_at: currentTime,
      };

      // Ajouter les donnu00e9es spu00e9cifiques au stade en fonction du current_stage
      if (current_stage === 'rdv_scheduled' || rdv_scheduled_at) {
        progressData.rdv_scheduled_at = formatToISODate(rdv_scheduled_at) || currentTime;
      }

      if (current_stage === 'rdv_completed' || rdv_completed_at) {
        progressData.rdv_completed_at = formatToISODate(rdv_completed_at) || currentTime;
      }

      if (current_stage === 'rdv_canceled' || rdv_canceled_at) {
        progressData.rdv_canceled_at = formatToISODate(rdv_canceled_at) || currentTime;
      }

      if (current_stage === 'payment_succeeded' || payment_at || payment_succeeded_at) {
        progressData.payment_at = formatToISODate(payment_succeeded_at) || formatToISODate(payment_at) || currentTime;
        if (amount) progressData.amount = amount;
        if (product_id) progressData.product_id = product_id;
        if (payment_data) progressData.payment_data = payment_data;
      }

      let result;

      if (existingProgress) {
        // Mettre u00e0 jour l'enregistrement existant
        const { data, error: updateError } = await this.supabaseService
          .getAdminClient()
          .from('funnel_progress')
          .update(progressData)
          .eq('id', existingProgress.id)
          .select()
          .single();

        if (updateError) {
          this.logger.error('Erreur lors de la mise u00e0 jour du progru00e8s du funnel', updateError);
          throw updateError;
        }

        result = data;
        this.logger.log(`Progru00e8s du funnel mis u00e0 jour: ${result.id}`);
      } else {
        // Cru00e9er un nouvel enregistrement
        const { data, error: insertError } = await this.supabaseService
          .getAdminClient()
          .from('funnel_progress')
          .insert({
            ...progressData,
            visitor_id,
            created_at: currentTime,
          })
          .select()
          .single();

        if (insertError) {
          this.logger.error('Erreur lors de la cru00e9ation du progru00e8s du funnel', insertError);
          throw insertError;
        }

        result = data;
        this.logger.log(`Nouveau progru00e8s du funnel cru00e9u00e9: ${result.id}`);
      }

      return {
        success: true,
        id: result.id,
        current_stage: result.current_stage,
        visitor_id,
      };
    } catch (error) {
      this.logger.error('Erreur lors de la gestion du progru00e8s du funnel', error);
      throw error;
    }
  }

  /**
   * Ru00e9cupu00e8re le progru00e8s du funnel pour un visiteur
   * @param visitorId Identifiant du visiteur
   */
  async getFunnelProgress(visitorId: string) {
    this.logger.log(`Ru00e9cupu00e9ration du progru00e8s du funnel pour visitor_id=${visitorId}`);

    try {
      const { data, error } = await this.supabaseService
        .getAdminClient()
        .from('funnel_progress')
        .select('*')
        .eq('visitor_id', visitorId)
        .maybeSingle();

      if (error) {
        this.logger.error('Erreur lors de la ru00e9cupu00e9ration du progru00e8s du funnel', error);
        throw error;
      }

      return {
        success: true,
        progress: data,
      };
    } catch (error) {
      this.logger.error('Erreur lors de la ru00e9cupu00e9ration du progru00e8s du funnel', error);
      throw error;
    }
  }
}
