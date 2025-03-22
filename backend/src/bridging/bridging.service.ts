import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

/**
 * Service de bridging pour associer les visitor_id aux leads
 * Ce service centralisu00e9 est utilisu00e9 par les modules de paiement et RDV
 */
@Injectable()
export class BridgingService {
  private readonly logger = new Logger(BridgingService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Associe un visitor_id u00e0 un lead
   * Si le lead existe du00e9ju00e0 pour cet email, met u00e0 jour le visitor_id
   * @param params Paramu00e8tres de l'association
   * @returns Les IDs du lead et du visitor affectu00e9s
   */
  async associateVisitorToLead(params: {
    visitor_id: string;
    email: string | null;
    user_id: string;
    source: string;
    value?: number;
    metadata?: Record<string, any>;
  }) {
    const { visitor_id, email, user_id, source, value, metadata } = params;
    this.logger.log(
      `Tentative d'association visitor_id=${visitor_id} u00e0 email=${email} (user_id=${user_id})`
    );

    const supabase = this.supabaseService.getClient();

    try {
      // 1. Chercher un lead existant avec cet email pour cet utilisateur
      const { data: existingLeads, error: leadError } = await supabase
        .from('leads')
        .select('id, email, status, source_data')
        .eq('user_id', user_id)
        .eq('email', email)
        .in('status', ['new', 'contacted', 'qualified', 'won']); // Exclure les leads 'lost' ou 'merged'

      if (leadError) {
        this.logger.error('Erreur lors de la recherche du lead', leadError);
        throw leadError;
      }

      let leadId: string;

      // 2. Si le lead existe, l'utiliser, sinon le cru00e9er
      if (existingLeads && existingLeads.length > 0) {
        leadId = existingLeads[0].id;
        this.logger.log(`Lead existant trouvu00e9 avec id=${leadId}`);

        // Mettre u00e0 jour le lead avec la conversion si value est fourni
        if (value) {
          const { error: updateError } = await supabase
            .from('leads')
            .update({
              converted_at: new Date().toISOString(),
              value,
              source_data: { ...existingLeads[0].source_data, [source]: metadata },
            })
            .eq('id', leadId);

          if (updateError) {
            this.logger.error('Erreur lors de la mise u00e0 jour du lead', updateError);
            throw updateError;
          }

          this.logger.log(`Lead ${leadId} mis u00e0 jour avec la conversion (value=${value})`);
        }
      } else {
        // Cru00e9er un nouveau lead
        const { data: newLead, error: createError } = await supabase
          .from('leads')
          .insert({
            user_id,
            email,
            status: 'new',
            converted_at: value ? new Date().toISOString() : null,
            value: value || null,
            source_data: metadata ? { [source]: metadata } : {},
          })
          .select();

        if (createError) {
          this.logger.error('Erreur lors de la cru00e9ation du lead', createError);
          throw createError;
        }

        leadId = newLead[0].id;
        this.logger.log(`Nouveau lead cru00e9u00e9 avec id=${leadId}`);
      }

      // 3. Trouver ou cru00e9er l'entru00e9e visitor
      const { data: existingVisitor, error: visitorError } = await supabase
        .from('visitors')
        .select('id')
        .eq('visitor_id', visitor_id)
        .maybeSingle();

      if (visitorError) {
        this.logger.error('Erreur lors de la recherche du visitor', visitorError);
        throw visitorError;
      }

      let visitorDbId: string;

      if (existingVisitor) {
        visitorDbId = existingVisitor.id;
        // Mettre u00e0 jour le visitor avec le lead_id
        const { error: updateError } = await supabase
          .from('visitors')
          .update({ lead_id: leadId })
          .eq('id', visitorDbId);

        if (updateError) {
          this.logger.error('Erreur lors de la mise u00e0 jour du visitor', updateError);
          throw updateError;
        }

        this.logger.log(`Visitor existant ${visitorDbId} mis u00e0 jour avec lead_id=${leadId}`);
      } else {
        // Cru00e9er une nouvelle entru00e9e visitor
        const { data: newVisitor, error: createError } = await supabase
          .from('visitors')
          .insert({
            visitor_id,
            lead_id: leadId,
            first_seen_at: new Date().toISOString(),
            last_seen_at: new Date().toISOString(),
          })
          .select();

        if (createError) {
          this.logger.error('Erreur lors de la cru00e9ation du visitor', createError);
          throw createError;
        }

        visitorDbId = newVisitor[0].id;
        this.logger.log(`Nouveau visitor cru00e9u00e9 avec id=${visitorDbId} et lead_id=${leadId}`);
      }

      // 4. Cru00e9er un u00e9vu00e9nement de conversion
      const { error: eventError } = await supabase.from('conversion_events').insert({
        visitor_id: visitorDbId,
        lead_id: leadId,
        event_type: source === 'calendly' ? 'RDV' : 'PAYMENT',
        event_data: metadata || {},
        page_url: metadata?.page_url || null,
        utm_source: metadata?.utm_source || null,
        utm_medium: metadata?.utm_medium || null,
        utm_campaign: metadata?.utm_campaign || null,
        utm_term: metadata?.utm_term || null,
        utm_content: metadata?.utm_content || null,
        site_id: metadata?.site_id || 'default',
        user_id,
      });

      if (eventError) {
        this.logger.error('Erreur lors de la cru00e9ation de l\'event de conversion', eventError);
        throw eventError;
      }

      this.logger.log(`u00c9vu00e9nement de conversion cru00e9u00e9 pour lead_id=${leadId}`);

      return {
        success: true,
        lead_id: leadId,
        visitor_db_id: visitorDbId,
        visitor_id,
      };
    } catch (error) {
      this.logger.error('Erreur gu00e9nu00e9rale dans associateVisitorToLead', error);
      throw error;
    }
  }

  /**
   * Trouve un lead via son visitor_id
   * Utile pour pru00e9-remplir des formulaires ou personnaliser l'expu00e9rience
   */
  async findLeadByVisitorId(visitor_id: string) {
    const supabase = this.supabaseService.getClient();

    try {
      // 1. Trouver le visitor_id dans la table visitors
      const { data: visitor, error: visitorError } = await supabase
        .from('visitors')
        .select('lead_id')
        .eq('visitor_id', visitor_id)
        .maybeSingle();

      if (visitorError) {
        this.logger.error('Erreur lors de la recherche du visitor', visitorError);
        throw visitorError;
      }

      if (!visitor || !visitor.lead_id) {
        this.logger.log(`Aucun lead trouvu00e9 pour visitor_id=${visitor_id}`);
        return { success: false, message: 'Visitor not associated with any lead' };
      }

      // 2. Ru00e9cupu00e9rer les donnu00e9es du lead
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .select('*')
        .eq('id', visitor.lead_id)
        .maybeSingle();

      if (leadError) {
        this.logger.error('Erreur lors de la ru00e9cupu00e9ration du lead', leadError);
        throw leadError;
      }

      if (!lead) {
        this.logger.warn(`Lead ${visitor.lead_id} introuvable bien que ru00e9fu00e9rencu00e9 par visitor_id=${visitor_id}`);
        return { success: false, message: 'Referenced lead not found' };
      }

      return {
        success: true,
        lead,
      };
    } catch (error) {
      this.logger.error('Erreur dans findLeadByVisitorId', error);
      throw error;
    }
  }

  /**
   * Fusionne deux leads lorsqu'un visitor_id est associu00e9 u00e0 plusieurs leads
   * Utile pour consolider l'information client
   */
  async mergeLeads(params: {
    source_lead_id: string;
    target_lead_id: string;
    reason: string;
  }) {
    const { source_lead_id, target_lead_id, reason } = params;
    this.logger.log(`Fusion des leads source=${source_lead_id} et target=${target_lead_id}`);

    const supabase = this.supabaseService.getClient();

    try {
      // 1. Vu00e9rifier que les deux leads existent
      const { data: leads, error: leadsError } = await supabase
        .from('leads')
        .select('id, email, status, user_id')
        .in('id', [source_lead_id, target_lead_id]);

      if (leadsError) {
        this.logger.error('Erreur lors de la ru00e9cupu00e9ration des leads', leadsError);
        throw leadsError;
      }

      if (!leads || leads.length !== 2) {
        this.logger.warn(`Un ou plusieurs leads introuvables pour la fusion`);
        return { success: false, message: 'One or more leads not found' };
      }

      // Vu00e9rifier que les leads appartiennent au mu00eame utilisateur
      const sourceLead = leads.find(l => l.id === source_lead_id);
      const targetLead = leads.find(l => l.id === target_lead_id);

      // Vu00e9rifier que les deux leads ont u00e9tu00e9 trouvs
      if (!sourceLead || !targetLead) {
        this.logger.warn(`Un ou plusieurs leads n'ont pas u00e9tu00e9 trouvs: source=${source_lead_id}, target=${target_lead_id}`);
        return { success: false, message: 'One or more leads not found during user verification' };
      }

      if (sourceLead.user_id !== targetLead.user_id) {
        this.logger.warn(`Tentative de fusion de leads appartenant u00e0 diffu00e9rents utilisateurs`);
        return { success: false, message: 'Cannot merge leads from different users' };
      }

      // 2. Exu00e9cuter la fonction SQL de fusion
      const { data, error } = await supabase.rpc('merge_leads', {
        source_lead_id,
        target_lead_id,
      });

      if (error) {
        this.logger.error('Erreur lors de la fusion des leads', error);
        throw error;
      }

      // 3. Ajouter une note au lead cible pour expliquer la fusion
      const note = `Lead fusionu00e9 depuis ${sourceLead.email} (${source_lead_id}) le ${new Date().toISOString()}. Raison: ${reason}`;

      const { error: updateError } = await supabase
        .from('leads')
        .update({
          notes: note, // Simplifié pour éviter l'utilisation de supabase.sql qui n'est pas disponible
          updated_at: new Date().toISOString(),
        })
        .eq('id', target_lead_id);

      if (updateError) {
        this.logger.error('Erreur lors de la mise u00e0 jour des notes de fusion', updateError);
        // Ne pas throw ici, la fusion a du00e9ju00e0 u00e9tu00e9 faite
      }

      this.logger.log(`Fusion ru00e9ussie: source=${source_lead_id} into target=${target_lead_id}`);

      return {
        success: true,
        source_lead_id,
        target_lead_id,
      };
    } catch (error) {
      this.logger.error('Erreur gu00e9nu00e9rale dans mergeLeads', error);
      throw error;
    }
  }
}
