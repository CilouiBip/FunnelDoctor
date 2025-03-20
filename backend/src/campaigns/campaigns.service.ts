import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { Campaign } from './entities/campaign.entity';

@Injectable()
export class CampaignsService {
  constructor(private supabaseService: SupabaseService) {}

  async create(userId: string, createCampaignDto: CreateCampaignDto): Promise<Campaign> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('campaigns')
      .insert([{ ...createCampaignDto, user_id: userId }])
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    return data;
  }

  async findAll(userId: string): Promise<Campaign[]> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('campaigns')
      .select('*')
      .eq('user_id', userId);
    
    if (error) {
      throw error;
    }
    
    return data;
  }

  async findOne(userId: string, id: string): Promise<Campaign> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('campaigns')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();
    
    if (error || !data) {
      throw new NotFoundException(`Campagne avec l'ID ${id} non trouvée`);
    }
    
    return data;
  }

  async update(userId: string, id: string, updateCampaignDto: UpdateCampaignDto): Promise<Campaign> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('campaigns')
      .update(updateCampaignDto)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();
    
    if (error || !data) {
      throw new NotFoundException(`Campagne avec l'ID ${id} non trouvée`);
    }
    
    return data;
  }

  async remove(userId: string, id: string): Promise<void> {
    const { error } = await this.supabaseService
      .getClient()
      .from('campaigns')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    
    if (error) {
      throw error;
    }
  }
}
