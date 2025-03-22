import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class FunnelProgressService {
  private readonly logger = new Logger(FunnelProgressService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Met u00e0 jour le progru00e8s du funnel pour un visiteur
   * @param params Paramu00e8tres de la mise u00e0 jour
   */
  async updateFunnelProgress(params: {
    visitor_id: string;
    current_stage: 'rdv_scheduled' | 'rdv_completed' | 'payment_succeeded';
    rdv_scheduled_at?: Date | string;
    rdv_completed_at?: Date | string;
    payment_at?: Date | string;
    amount?: number;
    product_id?: string;
    user_id: string;
  }) {
    const {
      visitor_id,
      current_stage,
      rdv_scheduled_at,
      rdv_completed_at,
      payment_at,
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

      // Pru00e9parer les donnu00e9es pour la mise u00e0 jour ou l'insertion
      const progressData: any = {
        current_stage,
        user_id,
        updated_at: currentTime,
      };

      // Ajouter les donnu00e9es spu00e9cifiques au stade en fonction du current_stage
      if (current_stage === 'rdv_scheduled' || rdv_scheduled_at) {
        progressData.rdv_scheduled_at = rdv_scheduled_at || currentTime;
      }

      if (current_stage === 'rdv_completed' || rdv_completed_at) {
        progressData.rdv_completed_at = rdv_completed_at || currentTime;
      }

      if (current_stage === 'payment_succeeded' || payment_at) {
        progressData.payment_at = payment_at || currentTime;
        if (amount) progressData.amount = amount;
        if (product_id) progressData.product_id = product_id;
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
