import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateFunnelStepDto, UpdateFunnelStepDto } from './funnel-steps.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class FunnelStepsService {
  private readonly logger = new Logger(FunnelStepsService.name);
  
  constructor(private readonly supabaseService: SupabaseService) {}

  // Tableau des étapes par défaut pour les infopreneurs
  private getDefaultFunnelSteps(userId: string) {
    return [
      {
        step_id: uuidv4(),
        user_id: userId,
        type: 'LANDING',
        slug: 'landing',
        label: 'Landing',
        description: 'Page d\'atterrissage initiale',
        color: '#FBBF24', // Jaune
        position: 1,
      },
      {
        step_id: uuidv4(),
        user_id: userId,
        type: 'OPTIN',
        slug: 'optin',
        label: 'Opt-in',
        description: 'Inscription à la newsletter ou capture de lead',
        color: '#60A5FA', // Bleu
        position: 2,
      },
      {
        step_id: uuidv4(),
        user_id: userId,
        type: 'VSL',
        slug: 'vsl',
        label: 'VSL',
        description: 'Vidéo de vente',
        color: '#F87171', // Rouge
        position: 3,
      },
      {
        step_id: uuidv4(),
        user_id: userId,
        type: 'CALENDLY',
        slug: 'calendly',
        label: 'Calendly',
        description: 'Prise de rendez-vous',
        color: '#818CF8', // Violet
        position: 4,
      },
      {
        step_id: uuidv4(),
        user_id: userId,
        type: 'CALL',
        slug: 'call',
        label: 'Call',
        description: 'Appel de découverte ou de vente',
        color: '#34D399', // Vert
        position: 5,
      },
      {
        step_id: uuidv4(),
        user_id: userId,
        type: 'PAYMENT',
        slug: 'payment',
        label: 'Payment',
        description: 'Page de paiement',
        color: '#10B981', // Vert foncé
        position: 6,
      },
      {
        step_id: uuidv4(),
        user_id: userId,
        type: 'POSTSALE',
        slug: 'postsale',
        label: 'PostSale',
        description: 'Après-vente et fidélisation',
        color: '#9CA3AF', // Gris
        position: 7,
      },
    ];
  }

  async findAll(userId: string) {
    console.log(`Récupération des étapes pour l'utilisateur ${userId}`);
    
    const { data, error } = await this.supabaseService
      .getClient()
      .from('funnel_steps')
      .select('*')
      .eq('user_id', userId)
      .order('position', { ascending: true });

    if (error) {
      console.error('Erreur lors de la récupération des étapes:', error);
      throw error;
    }
    
    // Si l'utilisateur n'a pas encore d'étapes, créer les étapes par défaut
    if (!data || data.length === 0) {
      console.log(`Aucune étape trouvée pour l'utilisateur ${userId}. Création des 7 étapes par défaut...`);
      
      const defaultSteps = this.getDefaultFunnelSteps(userId);
      
      console.log('Étapes par défaut à insérer:', defaultSteps);
      
      const { data: insertedData, error: insertError } = await this.supabaseService
        .getClient()
        .from('funnel_steps')
        .insert(defaultSteps)
        .select('*');
        
      if (insertError) {
        console.error('Erreur lors de l\'insertion des étapes par défaut:', insertError);
        throw insertError;
      }
      
      console.log(`${insertedData.length} étapes par défaut insérées avec succès`);
      return insertedData;
    }
    
    console.log(`${data.length} étapes trouvées pour l'utilisateur ${userId}`);
    return data;
  }

  async findOne(stepId: string) {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('funnel_steps')
      .select('*')
      .eq('step_id', stepId)
      .single();

    if (error) throw error;
    return data;
  }

  async create(dto: CreateFunnelStepDto, userId: string) {
    console.log(`Création d'une nouvelle étape pour l'utilisateur ${userId}:`, dto);
    
    // Vérification préalable des slugs existants
    if (dto.slug) {
      const { data: existingWithSlug } = await this.supabaseService
        .getClient()
        .from('funnel_steps')
        .select('slug')
        .eq('user_id', userId)
        .eq('slug', dto.slug)
        .maybeSingle();
      
      // Si le slug existe déjà, générer un slug unique avec timestamp
      if (existingWithSlug) {
        const timestamp = Date.now().toString().slice(-6);
        dto.slug = `${dto.slug}-${timestamp}`;
        console.log(`Slug déjà existant, nouveau slug généré: ${dto.slug}`);
      }
    }
    
    // Pour les steps custom, vérifier que le type n'est pas réservé
    if (dto.type === 'CUSTOM') {
      const reservedTypes = ['LANDING', 'OPTIN', 'VSL', 'CALENDLY', 'CALL', 'PAYMENT', 'POSTSALE'];
      if (reservedTypes.includes(dto.type)) {
        dto.type = 'CUSTOM'; // Forcer le type CUSTOM si un type réservé est utilisé
        console.log(`Type réservé modifié en CUSTOM`);
      }
    }
    
    // Générer un UUID si non fourni
    if (!dto.step_id) {
      dto.step_id = uuidv4();
    }
    
    // Calculer la position (dernière position + 1)
    if (!dto.position) {
      const { data: lastStep } = await this.supabaseService
        .getClient()
        .from('funnel_steps')
        .select('position')
        .eq('user_id', userId)
        .order('position', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      dto.position = lastStep ? lastStep.position + 1 : 1;
      console.log(`Position calculée: ${dto.position}`);
    }
    
    // Ensure the step has the correct user_id
    const step = { ...dto, user_id: userId };
    
    console.log('Étape à insérer:', step);
    
    const { data, error } = await this.supabaseService
      .getClient()
      .from('funnel_steps')
      .insert(step)
      .select('*')
      .single();

    if (error) {
      this.logger.error(`Error creating step for user ${userId}: ${error.message}`, error.stack);
      throw error;
    }
    
    this.logger.log(`Successfully created step (ID: ${data.step_id}) for user ${userId}`);
    return data;
  }

  async update(stepId: string, dto: UpdateFunnelStepDto, userId: string) {
    this.logger.log(`Updating step ${stepId} for user ${userId}`);
    this.logger.debug('Update data:', dto);
    
    // Verify the step belongs to the user before updating
    const { data: existingStep } = await this.supabaseService
      .getClient()
      .from('funnel_steps')
      .select('*')
      .eq('step_id', stepId)
      .eq('user_id', userId)
      .single();

    if (!existingStep) {
      console.error(`Étape ${stepId} non trouvée ou non autorisée pour l'utilisateur ${userId}`);
      throw new Error('Step not found or not authorized');
    }
    
    // Vérifier si c'est un step par défaut et empêcher la modification du slug
    const reservedTypes = ['LANDING', 'OPTIN', 'VSL', 'CALENDLY', 'CALL', 'PAYMENT', 'POSTSALE'];
    if (reservedTypes.includes(existingStep.type) && dto.slug && dto.slug !== existingStep.slug) {
      this.logger.warn(`Attempt to modify slug for reserved type (${existingStep.type}). Operation ignored.`);
      delete dto.slug; // Supprimer le slug du DTO pour ne pas le modifier
    }
    
    // Empêcher également la modification du type pour les steps par défaut
    if (reservedTypes.includes(existingStep.type) && dto.type && dto.type !== existingStep.type) {
      this.logger.warn(`Attempt to modify type for reserved step type (${existingStep.type}). Operation ignored.`);
      delete dto.type; // Supprimer le type du DTO pour ne pas le modifier
    }

    console.log('Mises à jour à appliquer:', dto);
    
    const { data, error } = await this.supabaseService
      .getClient()
      .from('funnel_steps')
      .update(dto)
      .eq('step_id', stepId)
      .eq('user_id', userId)
      .select('*')
      .single();

    if (error) {
      console.error('Erreur lors de la mise à jour de l\'étape:', error);
      throw error;
    }
    
    console.log('Étape mise à jour avec succès:', data);
    return data;
  }

  async remove(stepId: string, userId: string) {
    this.logger.log(`Deleting step ${stepId} for user ${userId}`);
    
    // Verify the step belongs to the user before deleting
    const { data: existingStep } = await this.supabaseService
      .getClient()
      .from('funnel_steps')
      .select('*')
      .eq('step_id', stepId)
      .eq('user_id', userId)
      .single();

    if (!existingStep) {
      console.error(`Étape ${stepId} non trouvée ou non autorisée pour l'utilisateur ${userId}`);
      throw new Error('Step not found or not authorized');
    }
    
    // Vérifier si c'est un step par défaut (pour logging uniquement, on autorise la suppression)
    const reservedTypes = ['LANDING', 'OPTIN', 'VSL', 'CALENDLY', 'CALL', 'PAYMENT', 'POSTSALE'];
    if (reservedTypes.includes(existingStep.type)) {
      console.warn(`Suppression d'un step par défaut de type ${existingStep.type}`);
    }

    const { error } = await this.supabaseService
      .getClient()
      .from('funnel_steps')
      .delete()
      .eq('step_id', stepId)
      .eq('user_id', userId);

    if (error) {
      console.error('Erreur lors de la suppression de l\'étape:', error);
      throw error;
    }
    
    console.log(`Étape ${stepId} supprimée avec succès`);
    return { success: true };
  }
  
  async updatePositions(positionUpdates: { step_id: string, position: number }[], userId: string) {
    this.logger.log(`Updating positions for user ${userId}: ${positionUpdates.length} steps affected`);
    this.logger.debug('Position updates details:', positionUpdates);
    
    const updates: { step_id: string, position: number }[] = [];
    
    // Vérifier que tous les steps appartiennent à l'utilisateur
    for (const update of positionUpdates) {
      const { data } = await this.supabaseService
        .getClient()
        .from('funnel_steps')
        .select('step_id')
        .eq('step_id', update.step_id)
        .eq('user_id', userId)
        .single();
        
      if (!data) {
        console.error(`Étape ${update.step_id} non trouvée ou non autorisée pour l'utilisateur ${userId}`);
        throw new Error(`Step ${update.step_id} not found or not authorized`);
      }
      
      // Ajouter à la liste des updates à effectuer
      updates.push({
        step_id: update.step_id,
        position: update.position
      });
    }
    
    console.log('Mises à jour de positions à appliquer:', updates);
    
    // Mise à jour des positions en une seule transaction
    for (const update of updates) {
      const { error } = await this.supabaseService
        .getClient()
        .from('funnel_steps')
        .update({ position: update.position })
        .eq('step_id', update.step_id)
        .eq('user_id', userId);
        
      if (error) {
        console.error(`Erreur lors de la mise à jour de la position pour l'étape ${update.step_id}:`, error);
        throw error;
      }
    }
    
    // Récupérer et retourner les étapes mises à jour
    const { data, error } = await this.supabaseService
      .getClient()
      .from('funnel_steps')
      .select('*')
      .eq('user_id', userId)
      .order('position', { ascending: true });
      
    if (error) {
      console.error('Erreur lors de la récupération des étapes après mise à jour des positions:', error);
      throw error;
    }
    
    console.log(`${data.length} étapes récupérées après mise à jour des positions`);
    return data;
  }
}
