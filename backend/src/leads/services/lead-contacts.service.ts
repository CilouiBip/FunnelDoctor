import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { LeadContact } from '../interfaces/lead-contact.interface';
import { CreateLeadContactDto } from '../dto/create-lead-contact.dto';

@Injectable()
export class LeadContactsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Récupère tous les contacts d'un lead
   */
  async findAllByLeadId(leadId: string): Promise<LeadContact[]> {
    const { data, error } = await this.supabaseService.getAdminClient()
      .from('lead_contacts')
      .select('*')
      .eq('lead_id', leadId);

    if (error) {
      console.error('Erreur lors de la récupération des contacts du lead:', error);
      throw new Error(`Impossible de récupérer les contacts: ${error.message}`);
    }

    return data.map(this.mapSnakeToCamel);
  }

  /**
   * Récupère le contact principal d'un lead par type
   */
  async findPrimaryByType(leadId: string, contactType: string): Promise<LeadContact | null> {
    const { data, error } = await this.supabaseService.getAdminClient()
      .from('lead_contacts')
      .select('*')
      .eq('lead_id', leadId)
      .eq('contact_type', contactType)
      .eq('is_primary', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // Code pour "No rows returned"
        return null;
      }
      console.error(`Erreur lors de la récupération du contact principal de type ${contactType}:`, error);
      throw new Error(`Impossible de récupérer le contact principal: ${error.message}`);
    }

    return this.mapSnakeToCamel(data);
  }

  /**
   * Crée un nouveau contact pour un lead
   */
  async create(dto: CreateLeadContactDto): Promise<LeadContact> {
    // Si le contact est défini comme principal, s'assurer qu'aucun autre du même type n'est principal
    if (dto.isPrimary) {
      await this.unsetPrimaryForType(dto.leadId, dto.contactType);
    }

    const { data, error } = await this.supabaseService.getAdminClient()
      .from('lead_contacts')
      .insert({
        lead_id: dto.leadId,
        contact_type: dto.contactType,
        contact_value: dto.contactValue,
        is_primary: dto.isPrimary
      })
      .select()
      .single();

    if (error) {
      console.error('Erreur lors de la création du contact:', error);
      throw new Error(`Impossible de créer le contact: ${error.message}`);
    }

    return this.mapSnakeToCamel(data);
  }

  /**
   * Met à jour un contact existant
   */
  async update(id: string, dto: Partial<CreateLeadContactDto>): Promise<LeadContact> {
    // Vérifier si le contact existe
    const contact = await this.findById(id);
    if (!contact) {
      throw new Error('Contact non trouvé');
    }

    // Si on définit ce contact comme principal, désactiver les autres du même type
    if (dto.isPrimary) {
      await this.unsetPrimaryForType(contact.leadId, contact.contactType);
    }

    // Préparer les données à mettre à jour
    const updateData: any = {};
    if (dto.contactValue !== undefined) updateData.contact_value = dto.contactValue;
    if (dto.isPrimary !== undefined) updateData.is_primary = dto.isPrimary;
    if (dto.contactType !== undefined) updateData.contact_type = dto.contactType;

    const { data, error } = await this.supabaseService.getAdminClient()
      .from('lead_contacts')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erreur lors de la mise à jour du contact:', error);
      throw new Error(`Impossible de mettre à jour le contact: ${error.message}`);
    }

    return this.mapSnakeToCamel(data);
  }

  /**
   * Supprime un contact
   */
  async delete(id: string): Promise<void> {
    const { error } = await this.supabaseService.getAdminClient()
      .from('lead_contacts')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erreur lors de la suppression du contact:', error);
      throw new Error(`Impossible de supprimer le contact: ${error.message}`);
    }
  }

  /**
   * Récupère un contact par son ID
   */
  async findById(id: string): Promise<LeadContact | null> {
    const { data, error } = await this.supabaseService.getAdminClient()
      .from('lead_contacts')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // Code pour "No rows returned"
        return null;
      }
      console.error('Erreur lors de la récupération du contact:', error);
      throw new Error(`Impossible de récupérer le contact: ${error.message}`);
    }

    return this.mapSnakeToCamel(data);
  }

  /**
   * Supprime le statut principal pour tous les contacts du même type
   */
  private async unsetPrimaryForType(leadId: string, contactType: string): Promise<void> {
    const { error } = await this.supabaseService.getAdminClient()
      .from('lead_contacts')
      .update({ is_primary: false })
      .eq('lead_id', leadId)
      .eq('contact_type', contactType)
      .eq('is_primary', true);

    if (error) {
      console.error('Erreur lors de la mise à jour des contacts principaux:', error);
      throw new Error(`Impossible de mettre à jour les contacts principaux: ${error.message}`);
    }
  }

  /**
   * Convertit snake_case en camelCase pour les propriétés
   */
  private mapSnakeToCamel(data: any): LeadContact {
    return {
      id: data.id,
      leadId: data.lead_id,
      contactType: data.contact_type,
      contactValue: data.contact_value,
      isPrimary: data.is_primary,
      createdAt: new Date(data.created_at),
      updatedAt: data.updated_at ? new Date(data.updated_at) : undefined
    };
  }
}
