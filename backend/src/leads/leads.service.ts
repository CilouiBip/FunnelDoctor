import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { Lead } from './entities/lead.entity';

@Injectable()
export class LeadsService {
  constructor(private supabaseService: SupabaseService) {}

  async create(userId: string, createLeadDto: CreateLeadDto): Promise<Lead> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('leads')
      .insert([{ ...createLeadDto, user_id: userId }])
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    return data;
  }

  async findAll(userId: string): Promise<Lead[]> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('leads')
      .select('*')
      .eq('user_id', userId);
    
    if (error) {
      throw error;
    }
    
    return data;
  }

  async findOne(userId: string, id: string): Promise<Lead> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('leads')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();
    
    if (error || !data) {
      throw new NotFoundException(`Lead avec l'ID ${id} non trouvé`);
    }
    
    return data;
  }

  async update(userId: string, id: string, updateLeadDto: UpdateLeadDto): Promise<Lead> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('leads')
      .update(updateLeadDto)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();
    
    if (error || !data) {
      throw new NotFoundException(`Lead avec l'ID ${id} non trouvé`);
    }
    
    return data;
  }

  async remove(userId: string, id: string): Promise<void> {
    const { error } = await this.supabaseService
      .getClient()
      .from('leads')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    
    if (error) {
      throw error;
    }
  }
}
