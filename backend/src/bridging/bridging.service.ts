import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { AssociateBridgeDto } from './dto/associate-bridge.dto';

/**
 * Service de bridging pour associer les visitor_id aux leads
 * Ce service centralisé est utilisé par les modules de paiement et RDV
 * et pour le stockage des associations email-visitor_id
 */
@Injectable()
export class BridgingService {
  private readonly logger = new Logger(BridgingService.name);

  constructor(private readonly supabaseService: SupabaseService) {}
  
  /**
   * Crée une association dans la table bridge_associations
   * @param dto Les données de l'association (email, visitor_id, etc.)
   * @param userId ID de l'utilisateur si disponible (optionnel)
   * @returns L'association créée
   */
  /**
   * Trouve un visitor_id associé à un email dans la table bridge_associations
   * Si une association est trouvée, elle est marquée comme traitée
   * 
   * @param email Email pour rechercher une association
   * @returns Le visitor_id associé, ou null si aucune association n'est trouvée
   */
  async findVisitorIdByEmail(email: string): Promise<string | null> {
    if (!email) return null;
    
    this.logger.log(`Recherche d'un visitor_id pour l'email: ${email}`);
    
    try {
      const supabase = this.supabaseService.getAdminClient();
      
      // Rechercher dans bridge_associations la dernière association non traitée pour cet email
      const { data, error } = await supabase
        .from('bridge_associations')
        .select('id, visitor_id')
        .eq('email', email)
        .eq('processed', false)
        .lt('expires_at', new Date().toISOString()) // Pas encore expirée
        .order('created_at', { ascending: false }) // La plus récente d'abord
        .limit(1)
        .maybeSingle();
        
      if (error) {
        this.logger.error(`Erreur lors de la recherche d'association: ${error.message}`, error);
        return null;
      }
      
      if (!data) {
        this.logger.log(`Aucune association trouvée pour l'email ${email}`);
        return null;
      }
      
      // Marquer l'association comme traitée
      const { error: updateError } = await supabase
        .from('bridge_associations')
        .update({ processed: true })
        .eq('id', data.id);
        
      if (updateError) {
        this.logger.error(`Erreur lors du marquage de l'association comme traitée: ${updateError.message}`);
        // On continue même si l'update échoue
      } else {
        this.logger.log(`Association marquée comme traitée: ${data.id}`);
      }
      
      this.logger.log(`Visitor ID trouvé: ${data.visitor_id}`);
      return data.visitor_id;
    } catch (error) {
      this.logger.error(`Exception lors de la recherche d'association: ${error.message}`, error);
      return null;
    }
  }

  async createAssociation(dto: AssociateBridgeDto, userId?: string) {
    this.logger.log(`Création association: email=${dto.email}, visitor_id=${dto.visitor_id}`);
    
    // Utiliser le client admin pour éviter les problèmes de RLS avec un appel public
    const supabase = this.supabaseService.getAdminClient();
    
    try {
      // Calcul de la date d'expiration (7 jours par défaut)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      
      // Insertion dans la table bridge_associations
      const { data, error } = await supabase
        .from('bridge_associations')
        .insert({
          email: dto.email,
          visitor_id: dto.visitor_id,
          user_id: userId || null,
          source_action: dto.source_action || 'api_bridge',
          event_data: dto.event_data || {},
          processed: false,
          expires_at: expiresAt.toISOString()
        })
        .select()
        .single();
        
      if (error) {
        this.logger.error('Erreur lors de la création de l\'association', error);
        throw new InternalServerErrorException(
          'Erreur lors de la création de l\'association',
          error.message
        );
      }
      
      this.logger.log(
        `Association créée avec succès: id=${data.id}, email=${data.email}, visitor_id=${data.visitor_id}`
      );
      
      return {
        success: true,
        association: data,
        message: 'Association créée avec succès',
      };
    } catch (error) {
      this.logger.error('Erreur inattendue lors de la création de l\'association', error);
      throw new InternalServerErrorException(
        'Erreur inattendue lors de la création de l\'association'
      );
    }
  }


}
