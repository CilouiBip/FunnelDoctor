import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { Lead } from '../interfaces/lead.interface';

/**
 * Interface pour les critères de recherche d'un master lead
 */
interface MasterLeadCriteria {
  email?: string;
  visitor_id?: string;
}

/**
 * Interface représentant un lead email
 */
interface LeadEmail {
  id: string;
  lead_id: string;
  email: string;
  is_primary: boolean;
  is_verified: boolean;
  source_system?: string;
  source_action?: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Interface représentant une association visitor-lead
 */
interface LeadVisitorId {
  id: string;
  lead_id: string;
  visitor_id: string;
  first_linked_at: Date;
  last_seen_at: Date;
  source?: string;
  created_at: Date;
  updated_at: Date;
}

@Injectable()
export class MasterLeadService {
  private readonly logger = new Logger(MasterLeadService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Trouve ou crée un master lead en fonction des critères fournis
   * Implémente la logique de stitching pour associer email et visitor_id
   * 
   * @param criteria Critères de recherche (email et/ou visitor_id)
   * @param userId ID du propriétaire (optionnel)
   * @param source Source de l'opération (ex: 'calendly', 'stripe', 'form')
   * @returns Le master lead (existant ou nouveau)
   */
  async findOrCreateMasterLead(
    criteria: MasterLeadCriteria,
    userId?: string,
    source = 'api'
  ): Promise<Lead> {
    this.logger.log(`Recherche ou création de master lead avec: ${JSON.stringify(criteria)}`);
    
    if (!criteria.email && !criteria.visitor_id) {
      throw new Error('Au moins un critère (email ou visitor_id) doit être fourni');
    }

    // Utiliser le client admin pour les opérations avancées
    const supabase = this.supabaseService.getAdminClient();
    
    // Variables pour stocker les résultats intermédiaires
    let masterLead: Lead | null = null;
    let leadId: string | null = null;
    
    // 1. Priorité à la recherche par email si disponible
    if (criteria.email) {
      try {
        // Rechercher dans lead_emails
        const { data: emailData, error: emailError } = await supabase
          .from('lead_emails')
          .select('lead_id, is_primary')
          .eq('email', criteria.email)
          .order('is_primary', { ascending: false }) // Prioriser les emails primaires
          .limit(1)
          .maybeSingle();
        
        if (emailError) {
          this.logger.error(`Erreur de recherche par email: ${emailError.message}`, emailError);
        } else if (emailData) {
          leadId = emailData.lead_id;
          this.logger.log(`Master lead trouvé via email: ${leadId}`);
          
          // Récupérer le master lead complet
          const { data: lead, error: leadError } = await supabase
            .from('leads')
            .select('*')
            .eq('id', leadId)
            .single();
            
          if (leadError) {
            this.logger.error(`Erreur lors de la récupération du master lead: ${leadError.message}`, leadError);
          } else {
            masterLead = lead as Lead;
          }
        }
      } catch (error) {
        this.logger.error(`Exception lors de la recherche par email: ${error.message}`, error);
      }
    }
    
    // 2. Si pas trouvé par email, essayer par visitor_id
    if (!masterLead && criteria.visitor_id) {
      try {
        // Rechercher dans lead_visitor_ids
        const { data: visitorData, error: visitorError } = await supabase
          .from('lead_visitor_ids')
          .select('lead_id')
          .eq('visitor_id', criteria.visitor_id)
          .maybeSingle();
          
        if (visitorError) {
          this.logger.error(`Erreur de recherche par visitor_id: ${visitorError.message}`, visitorError);
        } else if (visitorData) {
          leadId = visitorData.lead_id;
          this.logger.log(`Master lead trouvé via visitor_id: ${leadId}`);
          
          // Récupérer le master lead complet
          const { data: lead, error: leadError } = await supabase
            .from('leads')
            .select('*')
            .eq('id', leadId)
            .single();
            
          if (leadError) {
            this.logger.error(`Erreur lors de la récupération du master lead: ${leadError.message}`, leadError);
          } else {
            masterLead = lead as Lead;
          }
        }
      } catch (error) {
        this.logger.error(`Exception lors de la recherche par visitor_id: ${error.message}`, error);
      }
    }
    
    // 3. Si toujours pas trouvé, créer un nouveau master lead
    if (!masterLead) {
      try {
        this.logger.log('Aucun master lead trouvé, création en cours...');
        
        // Données de base pour le nouveau lead
        const newLeadData = {
          user_id: userId || null,
          status: 'new',
          source_system: source,
          created_at: new Date(),
          updated_at: new Date(),
        };
        
        // Si email est fourni, l'ajouter au master lead pour compatibilité legacy
        if (criteria.email) {
          newLeadData['email'] = criteria.email;
        }
        
        // Insérer le nouveau master lead
        const { data: newLead, error: newLeadError } = await supabase
          .from('leads')
          .insert([newLeadData])
          .select()
          .single();
          
        if (newLeadError) {
          this.logger.error(`Erreur lors de la création du master lead: ${newLeadError.message}`, newLeadError);
          throw new Error(`Échec de la création du master lead: ${newLeadError.message}`);
        }
        
        masterLead = newLead as Lead;
        leadId = masterLead.id;
        this.logger.log(`Nouveau master lead créé: ${leadId}`);
        
        // Si un email est fourni, créer l'entrée dans lead_emails
        if (criteria.email) {
          await this.addEmailToMasterLead(leadId, criteria.email, true, source);
        }
        
        // Si un visitor_id est fourni, créer l'entrée dans lead_visitor_ids
        if (criteria.visitor_id) {
          await this.addVisitorIdToMasterLead(leadId, criteria.visitor_id, source);
        }
      } catch (error) {
        this.logger.error(`Exception lors de la création du master lead: ${error.message}`, error);
        throw error;
      }
    } else {
      // 4. Le master lead existe, vérifier si des informations supplémentaires doivent être associées
      
      // Si un email est fourni et que le lead a été trouvé par visitor_id,
      // vérifier si cet email est déjà associé à ce lead
      if (criteria.email && leadId) {
        const { data: existingEmail } = await supabase
          .from('lead_emails')
          .select('id')
          .eq('lead_id', leadId)
          .eq('email', criteria.email)
          .maybeSingle();
          
        if (!existingEmail) {
          // Email pas encore associé à ce master lead, l'ajouter
          await this.addEmailToMasterLead(leadId, criteria.email, false, source);
        }
      }
      
      // Si un visitor_id est fourni et que le lead a été trouvé par email,
      // vérifier si ce visitor_id est déjà associé à ce lead
      if (criteria.visitor_id && leadId) {
        const { data: existingVisitorId } = await supabase
          .from('lead_visitor_ids')
          .select('id')
          .eq('lead_id', leadId)
          .eq('visitor_id', criteria.visitor_id)
          .maybeSingle();
          
        if (!existingVisitorId) {
          // Visitor ID pas encore associé à ce master lead, l'ajouter
          await this.addVisitorIdToMasterLead(leadId, criteria.visitor_id, source);
        }
      }
    }
    
    return masterLead;
  }
  
  /**
   * Ajoute un email à un master lead existant
   * 
   * @param leadId ID du master lead
   * @param email Email à associer
   * @param isPrimary Indique si c'est l'email principal
   * @param source Source de l'email
   * @returns L'entrée créée dans lead_emails
   */
  private async addEmailToMasterLead(
    leadId: string, 
    email: string, 
    isPrimary = false, 
    source = 'api'
  ): Promise<LeadEmail | null> {
    this.logger.log(`Association de l'email ${email} au master lead ${leadId} (primary=${isPrimary})`);
    
    try {
      const supabase = this.supabaseService.getAdminClient();
      
      // Si cet email doit être primaire, vérifier s'il existe déjà un email primaire
      if (isPrimary) {
        const { data: existingPrimary } = await supabase
          .from('lead_emails')
          .select('id')
          .eq('lead_id', leadId)
          .eq('is_primary', true)
          .maybeSingle();
          
        // Si un email primaire existe déjà, on ne marque pas celui-ci comme primaire
        if (existingPrimary) {
          isPrimary = false;
        }
      }
      
      // Insérer le nouveau lead_email
      const { data, error } = await supabase
        .from('lead_emails')
        .insert({
          lead_id: leadId,
          email: email,
          is_primary: isPrimary,
          is_verified: false,
          source_system: source,
          source_action: 'lead_stitching',
          created_at: new Date(),
          updated_at: new Date(),
        })
        .select()
        .single();
        
      if (error) {
        this.logger.error(`Erreur lors de l'association de l'email: ${error.message}`, error);
        return null;
      }
      
      return data as LeadEmail;
    } catch (error) {
      this.logger.error(`Exception lors de l'association de l'email: ${error.message}`, error);
      return null;
    }
  }
  
  /**
   * Ajoute un visitor_id à un master lead existant
   * 
   * @param leadId ID du master lead
   * @param visitorId Visitor ID à associer
   * @param source Source de l'association
   * @returns L'entrée créée dans lead_visitor_ids
   */
  private async addVisitorIdToMasterLead(
    leadId: string, 
    visitorId: string, 
    source = 'api'
  ): Promise<LeadVisitorId | null> {
    this.logger.log(`Association du visitor_id ${visitorId} au master lead ${leadId}`);
    
    try {
      const supabase = this.supabaseService.getAdminClient();
      
      // Insérer le nouveau lead_visitor_id
      const now = new Date();
      const { data, error } = await supabase
        .from('lead_visitor_ids')
        .insert({
          lead_id: leadId,
          visitor_id: visitorId,
          first_linked_at: now,
          last_seen_at: now,
          source: source,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();
        
      if (error) {
        this.logger.error(`Erreur lors de l'association du visitor_id: ${error.message}`, error);
        return null;
      }
      
      return data as LeadVisitorId;
    } catch (error) {
      this.logger.error(`Exception lors de l'association du visitor_id: ${error.message}`, error);
      return null;
    }
  }
}
