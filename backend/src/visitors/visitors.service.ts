import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateVisitorDto } from './dto/create-visitor.dto';
import { Visitor } from './interfaces/visitor.interface';
import { LeadsService } from '../leads/leads.service';

@Injectable()
export class VisitorsService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly leadsService: LeadsService
  ) {}

  /**
   * Crée ou met à jour un visiteur
   */
  async createOrUpdate(createVisitorDto: CreateVisitorDto): Promise<Visitor> {
    const { visitor_id } = createVisitorDto;
    
    // Vérifier si le visiteur existe déjà
    const existingVisitor = await this.findByVisitorId(visitor_id);
    
    if (existingVisitor) {
      // Mettre à jour last_seen_at et autres informations
      const { data, error } = await this.supabaseService
        .getAdminClient()
        .from('visitors')
        .update({ 
          last_seen_at: new Date(),
          user_agent: createVisitorDto.user_agent || existingVisitor.user_agent,
          ip_address: createVisitorDto.ip_address || existingVisitor.ip_address,
          metadata: { ...existingVisitor.metadata, ...createVisitorDto.metadata },
          updated_at: new Date()
        })
        .eq('visitor_id', visitor_id)
        .select()
        .single();
        
      if (error) {
        console.error('Erreur lors de la mise à jour du visiteur:', error);
        throw error;
      }
      
      return data;
    } else {
      // Créer un nouveau visiteur
      const { data, error } = await this.supabaseService
        .getAdminClient()
        .from('visitors')
        .insert([{ 
          ...createVisitorDto,
          first_seen_at: new Date(),
          last_seen_at: new Date()
        }])
        .select()
        .single();
        
      if (error) {
        console.error('Erreur lors de la création du visiteur:', error);
        throw error;
      }
      
      console.log(`Visiteur créé avec succès: ${data.id}`);
      return data;
    }
  }

  /**
   * Trouve un visiteur par son visitor_id
   */
  async findByVisitorId(visitorId: string): Promise<Visitor | null> {
    const { data, error } = await this.supabaseService
      .getAdminClient()
      .from('visitors')
      .select('*')
      .eq('visitor_id', visitorId)
      .single();
      
    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      console.error('Erreur lors de la recherche du visiteur:', error);
      throw error;
    }
    
    return data || null;
  }

  /**
   * Convertit un visiteur en lead
   * 
   * Requiert que le lead existe déjà dans la base de données.
   * Le lead doit être créé via l'API /api/leads avant d'appeler cette méthode.
   * 
   * @param visitorId L'identifiant du visiteur à convertir
   * @param leadId L'identifiant du lead existant à associer au visiteur
   * @returns Le visiteur mis à jour avec l'ID du lead
   * @throws NotFoundException si le visiteur n'existe pas
   * @throws BadRequestException si le lead n'existe pas
   */
  async convertToLead(visitorId: string, leadId: string): Promise<Visitor> {
    console.log(`Tentative de conversion du visiteur ${visitorId} en lead ${leadId}`);
    
    // Vérifier que le visiteur existe
    const visitor = await this.findByVisitorId(visitorId);
    if (!visitor) {
      throw new NotFoundException(`Visiteur avec l'ID ${visitorId} non trouvé`);
    }
    
    // Vérifier que le lead existe déjà
    const { data: existingLead, error: checkError } = await this.supabaseService
      .getAdminClient()
      .from('leads')
      .select('id')
      .eq('id', leadId)
      .single();
      
    // Si le lead n'existe pas, renvoyer une erreur explicite
    if (checkError) {
      console.error(`Lead ${leadId} non trouvé lors de la tentative de conversion du visiteur ${visitorId}:`, checkError);
      throw new BadRequestException(
        `Le lead avec l'ID ${leadId} n'existe pas. Veuillez d'abord créer le lead via l'API /api/leads avant de tenter la conversion.`
      );
    }
    
    console.log(`Lead ${leadId} trouvé, procédant à la conversion du visiteur ${visitorId}`);
    
    // Associer le visiteur au lead
    const { data, error } = await this.supabaseService
      .getAdminClient()
      .from('visitors')
      .update({ 
        lead_id: leadId,
        updated_at: new Date()
      })
      .eq('visitor_id', visitorId)
      .select()
      .single();
      
    if (error) {
      console.error('Erreur lors de la conversion du visiteur en lead:', error);
      throw error;
    }
    
    console.log(`Visiteur ${visitorId} converti en lead ${leadId} avec succès`);
    return data;
  }
  
  /**
   * Récupère tous les touchpoints d'un visiteur
   */
  async getTouchpoints(visitorId: string): Promise<any[]> {
    const { data, error } = await this.supabaseService
      .getAdminClient()
      .from('touchpoints')
      .select('*')
      .eq('visitor_id', visitorId)
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('Erreur lors de la récupération des touchpoints du visiteur:', error);
      throw error;
    }
    
    return data || [];
  }
}
