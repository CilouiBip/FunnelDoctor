import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateTouchpointDto } from './dto/create-touchpoint.dto';
import { Touchpoint } from './interfaces/touchpoint.interface';
import { VisitorsService } from '../visitors/visitors.service';

@Injectable()
export class TouchpointsService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly visitorsService: VisitorsService
  ) {}

  /**
   * Crée un nouveau touchpoint
   */
  async create(createTouchpointDto: CreateTouchpointDto): Promise<Touchpoint> {
    console.log(`Création d'un touchpoint: ${JSON.stringify(createTouchpointDto)}`);
    
    try {
      // Créer ou mettre à jour le visiteur avant de créer le touchpoint
      await this.visitorsService.createOrUpdate({
        visitor_id: createTouchpointDto.visitor_id,
        user_agent: createTouchpointDto.user_agent,
        ip_address: createTouchpointDto.ip_address,
        metadata: { 
          lastEventType: createTouchpointDto.event_type,
          lastPageUrl: createTouchpointDto.page_url
        }
      });
      
      console.log(`Visiteur créé ou mis à jour: ${createTouchpointDto.visitor_id}`);
    } catch (visitorError) {
      console.error(`Erreur lors de la création/mise à jour du visiteur:`, visitorError);
      // On continue même en cas d'erreur avec le visiteur
    }
    
    // Insertion du touchpoint dans la base de données
    const { data, error } = await this.supabaseService
      .getAdminClient() // Utiliser l'admin client pour contourner les RLS
      .from('touchpoints')
      .insert([{ ...createTouchpointDto }])
      .select()
      .single();
    
    if (error) {
      console.error(`Erreur lors de la création du touchpoint:`, error);
      throw error;
    }
    
    console.log(`Touchpoint créé avec succès: ${data.id}`);
    return data;
  }

  /**
   * Trouve tous les touchpoints avec pagination optionnelle
   */
  async findAll(page = 1, limit = 20): Promise<{ data: Touchpoint[]; count: number }> {
    console.log(`Récupération de tous les touchpoints, page: ${page}, limit: ${limit}`);
    
    // Calcul de l'offset pour la pagination
    const offset = (page - 1) * limit;
    
    // Récupération du nombre total de touchpoints
    const { data: countData, error: countError } = await this.supabaseService
      .getAdminClient()
      .from('touchpoints')
      .select('count');
    
    if (countError) {
      console.error(`Erreur lors du comptage des touchpoints:`, countError);
      throw countError;
    }
    
    // Récupération des touchpoints avec pagination
    const { data, error } = await this.supabaseService
      .getAdminClient()
      .from('touchpoints')
      .select('*')
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error(`Erreur lors de la récupération des touchpoints:`, error);
      throw error;
    }
    
    const totalCount = countData?.[0]?.count || 0;
    console.log(`${data.length} touchpoints récupérés sur un total de ${totalCount}`);
    return { data, count: totalCount };
  }

  /**
   * Trouve un touchpoint par son ID
   */
  async findOne(id: string): Promise<Touchpoint> {
    console.log(`Récupération du touchpoint: ${id}`);
    
    const { data, error } = await this.supabaseService
      .getAdminClient()
      .from('touchpoints')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error(`Erreur lors de la récupération du touchpoint:`, error);
      throw new NotFoundException(`Touchpoint with ID ${id} not found`);
    }
    
    return data;
  }

  /**
   * Trouve tous les touchpoints pour un visiteur spécifique
   */
  async findByVisitorId(visitorId: string): Promise<Touchpoint[]> {
    console.log(`Récupération des touchpoints pour le visiteur: ${visitorId}`);
    
    const { data, error } = await this.supabaseService
      .getAdminClient()
      .from('touchpoints')
      .select('*')
      .eq('visitor_id', visitorId)
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error(`Erreur lors de la récupération des touchpoints pour le visiteur:`, error);
      throw error;
    }
    
    console.log(`${data.length} touchpoints récupérés pour le visiteur: ${visitorId}`);
    return data;
  }
}
