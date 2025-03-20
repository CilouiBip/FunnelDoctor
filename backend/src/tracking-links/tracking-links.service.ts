import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateTrackingLinkDto } from './dto/create-tracking-link.dto';
import { UpdateTrackingLinkDto } from './dto/update-tracking-link.dto';
import { TrackingLink } from './entities/tracking-link.entity';
import { randomBytes } from 'crypto';

@Injectable()
export class TrackingLinksService {
  constructor(private supabaseService: SupabaseService) {}

  /**
   * Génère un code court unique pour les liens de tracking
   * @param length Longueur du code court (défaut: 7)
   * @returns Code court unique
   */
  private generateShortCode(length: number = 7): string {
    return randomBytes(Math.ceil(length * 3 / 4))
      .toString('base64')
      .slice(0, length)
      .replace(/\//g, '_')
      .replace(/\+/g, '-');
  }

  /**
   * Crée un nouveau lien de tracking avec un code court unique
   */
  async create(userId: string, createTrackingLinkDto: CreateTrackingLinkDto): Promise<TrackingLink> {
    const shortCode = this.generateShortCode();
    
    console.log(`Création d'un lien de tracking pour l'utilisateur: ${userId}, shortCode: ${shortCode}`);
    
    // On utilise un UUID généré aléatoirement comme campaign_id par défaut si non fourni
    // Cette approche permet de satisfaire la contrainte NOT NULL sans modifier le schéma
    const DEFAULT_CAMPAIGN_ID = '00000000-0000-4000-a000-000000000000';
    
    const { data, error } = await this.supabaseService
      .getAdminClient() // Utiliser l'admin client pour contourner les RLS
      .from('tracking_links')
      .insert([{ 
        ...createTrackingLinkDto, 
        user_id: userId,
        short_code: shortCode,
        campaign_id: createTrackingLinkDto.campaign_id || DEFAULT_CAMPAIGN_ID,
      }])
      .select()
      .single();
    
    if (error) {
      console.error(`Erreur lors de la création du lien de tracking:`, error);
      throw error;
    }
    
    console.log(`Lien de tracking créé avec succès: ${data.id}, shortCode: ${data.short_code}`);
    return data;
  }

  async findAll(userId: string): Promise<TrackingLink[]> {
    console.log(`Recherche de tous les liens de tracking pour l'utilisateur: ${userId}`);
    
    const { data, error } = await this.supabaseService
      .getAdminClient() // Utiliser l'admin client pour contourner les RLS
      .from('tracking_links')
      .select('*')
      .eq('user_id', userId);
    
    if (error) {
      console.error(`Erreur lors de la recherche des liens de tracking:`, error);
      throw error;
    }
    
    console.log(`${data.length} liens de tracking trouvés pour l'utilisateur: ${userId}`);
    return data;
  }

  async findOne(userId: string, id: string): Promise<TrackingLink> {
    console.log(`Recherche du lien de tracking avec ID: ${id} pour l'utilisateur: ${userId}`);
    
    const { data, error } = await this.supabaseService
      .getAdminClient() // Utiliser l'admin client pour contourner les RLS
      .from('tracking_links')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();
    
    if (error || !data) {
      console.error(`Lien de tracking avec l'ID ${id} non trouvé pour l'utilisateur: ${userId}`);
      throw new NotFoundException(`Lien de tracking avec l'ID ${id} non trouvé`);
    }
    
    console.log(`Lien de tracking trouvé: ${id}`);
    return data;
  }

  async update(userId: string, id: string, updateTrackingLinkDto: UpdateTrackingLinkDto): Promise<TrackingLink> {
    console.log(`Mise à jour du lien de tracking avec ID: ${id} pour l'utilisateur: ${userId}`);
    
    const { data, error } = await this.supabaseService
      .getAdminClient() // Utiliser l'admin client pour contourner les RLS
      .from('tracking_links')
      .update(updateTrackingLinkDto)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();
    
    if (error || !data) {
      console.error(`Erreur lors de la mise à jour du lien de tracking:`, error);
      throw new NotFoundException(`Lien de tracking avec l'ID ${id} non trouvé`);
    }
    
    console.log(`Lien de tracking mis à jour avec succès: ${id}`);
    return data;
  }

  async remove(userId: string, id: string): Promise<void> {
    console.log(`Suppression du lien de tracking avec ID: ${id} pour l'utilisateur: ${userId}`);
    
    const { error } = await this.supabaseService
      .getAdminClient() // Utiliser l'admin client pour contourner les RLS
      .from('tracking_links')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    
    if (error) {
      console.error(`Erreur lors de la suppression du lien de tracking:`, error);
      throw error;
    }
    
    console.log(`Lien de tracking supprimé avec succès: ${id}`);
  }

  /**
   * Retrouve un lien de tracking par son code court
   * @param shortCode Code court du lien
   * @returns Lien de tracking ou null si non trouvé
   */
  async findByShortCode(shortCode: string): Promise<TrackingLink> {
    console.log(`Recherche du lien de tracking avec le code court: ${shortCode}`);
    
    const { data, error } = await this.supabaseService
      .getAdminClient() // Utiliser l'admin client pour contourner les RLS
      .from('tracking_links')
      .select('*')
      .eq('short_code', shortCode)
      .single();
    
    if (error || !data) {
      console.error(`Lien de tracking avec le code court ${shortCode} non trouvé`);
      throw new NotFoundException(`Lien de tracking avec le code ${shortCode} non trouvé`);
    }
    
    console.log(`Lien de tracking trouvé avec le code court: ${shortCode}`);
    return data;
  }
}
