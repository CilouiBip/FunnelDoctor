import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { CreateLeadDto } from '../dto/create-lead.dto';
import { UpdateLeadDto } from '../dto/update-lead.dto';
import { Lead } from '../interfaces/lead.interface';

@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Récupère tous les leads de l'utilisateur
   * @param userId ID de l'utilisateur propriétaire des leads
   * @returns Liste des leads
   */
  async findAll(userId: string): Promise<Lead[]> {
    this.logger.log(`Récupération de tous les leads pour l'utilisateur ${userId}`);
    
    const { data, error } = await this.supabaseService
      .getAdminClient()
      .from('leads')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      this.logger.error(`Erreur lors de la récupération des leads: ${error.message}`, error.stack);
      throw new BadRequestException(`Erreur lors de la récupération des leads: ${error.message}`);
    }
    
    return data || [];
  }

  /**
   * Récupère un lead spécifique
   * @param id ID du lead à récupérer
   * @param userId ID de l'utilisateur propriétaire du lead (pour sécurité)
   * @returns Le lead trouvé
   */
  async findOne(id: string, userId?: string): Promise<Lead> {
    this.logger.log(`Récupération du lead ${id}${userId ? ` pour l'utilisateur ${userId}` : ''}`);
    
    let query = this.supabaseService
      .getAdminClient()
      .from('leads')
      .select('*')
      .eq('id', id);
    
    // Si userId est fourni, filtrer par utilisateur également (sécurité)
    if (userId) {
      query = query.eq('user_id', userId);
    }
    
    const { data, error } = await query.single();
    
    if (error) {
      this.logger.error(`Erreur lors de la récupération du lead ${id}: ${error.message}`, error.stack);
      throw new NotFoundException(`Lead avec l'ID ${id} non trouvé`);
    }
    
    return data;
  }

  /**
   * Crée un nouveau lead
   * @param userId ID de l'utilisateur créant le lead
   * @param createLeadDto DTO contenant les informations du lead
   * @returns Le lead créé
   */
  async create(userId: string, createLeadDto: CreateLeadDto): Promise<Lead> {
    this.logger.log(`Création d'un nouveau lead pour l'utilisateur ${userId}`);
    
    const now = new Date();
    const fullName = [createLeadDto.first_name, createLeadDto.last_name].filter(Boolean).join(' ');
    
    const leadData = {
      email: createLeadDto.email,
      full_name: fullName,
      status: createLeadDto.status || 'new',
      source: createLeadDto.source || {},
      created_at: now,
      updated_at: now,
      user_id: userId
    };
    
    const { data, error } = await this.supabaseService
      .getAdminClient()
      .from('leads')
      .insert([leadData])
      .select()
      .single();
    
    if (error) {
      this.logger.error(`Erreur lors de la création du lead: ${error.message}`, error.stack);
      throw new BadRequestException(`Erreur lors de la création du lead: ${error.message}`);
    }
    
    this.logger.log(`Lead créé avec succès: ${data.id}`);
    return data;
  }

  /**
   * Met à jour un lead existant
   * @param id ID du lead à mettre à jour
   * @param userId ID de l'utilisateur propriétaire du lead (pour sécurité)
   * @param updateLeadDto DTO contenant les informations à mettre à jour
   * @returns Le lead mis à jour
   */
  async update(id: string, userId: string, updateLeadDto: UpdateLeadDto): Promise<Lead> {
    this.logger.log(`Mise à jour du lead ${id} pour l'utilisateur ${userId}`);
    
    // Vérifier que le lead existe et appartient à l'utilisateur
    await this.findOne(id, userId);
    
    // L'interface UpdateLeadDto ne contient pas full_name, nous devons donc utiliser une interface étendue
    const updateData: Record<string, any> = {
      ...updateLeadDto,
      updated_at: new Date()
    };
    
    // Si first_name ou last_name sont fournis, mettre à jour full_name
    if (updateLeadDto.first_name || updateLeadDto.last_name) {
      const existingLead = await this.findOne(id, userId);
      const firstName = updateLeadDto.first_name || existingLead.first_name || '';
      const lastName = updateLeadDto.last_name || existingLead.last_name || '';
      updateData.full_name = [firstName, lastName].filter(Boolean).join(' ');
    }
    
    const { data, error } = await this.supabaseService
      .getAdminClient()
      .from('leads')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();
    
    if (error) {
      this.logger.error(`Erreur lors de la mise à jour du lead ${id}: ${error.message}`, error.stack);
      throw new BadRequestException(`Erreur lors de la mise à jour du lead: ${error.message}`);
    }
    
    this.logger.log(`Lead ${id} mis à jour avec succès`);
    return data;
  }

  /**
   * Supprime un lead
   * @param id ID du lead à supprimer
   * @param userId ID de l'utilisateur propriétaire du lead (pour sécurité)
   * @returns Vrai si la suppression a réussi
   */
  async remove(id: string, userId: string): Promise<{ success: boolean }> {
    this.logger.log(`Suppression du lead ${id} pour l'utilisateur ${userId}`);
    
    // Vérifier que le lead existe et appartient à l'utilisateur
    await this.findOne(id, userId);
    
    const { error } = await this.supabaseService
      .getAdminClient()
      .from('leads')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    
    if (error) {
      this.logger.error(`Erreur lors de la suppression du lead ${id}: ${error.message}`, error.stack);
      throw new BadRequestException(`Erreur lors de la suppression du lead: ${error.message}`);
    }
    
    this.logger.log(`Lead ${id} supprimé avec succès`);
    return { success: true };
  }
}
