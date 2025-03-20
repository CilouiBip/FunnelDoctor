import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    private supabaseService: SupabaseService,
    private configService: ConfigService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const { password, ...userData } = createUserDto;
    
    // Hash the password
    const salt = await bcrypt.genSalt();
    const password_hash = await bcrypt.hash(password, salt);
    
    // Assign default plan_id if not provided
    const userDataWithPlan = {
      ...userData,
      plan_id: userData.plan_id || this.configService.get<string>('DEFAULT_PLAN_ID')
    };
    
    console.log('Creating user with data:', { ...userDataWithPlan, password_hash: '[REDACTED]' });
    
    // Utiliser l'admin client pour contourner les restrictions RLS
    const { data, error } = await this.supabaseService
      .getAdminClient()
      .from('users')
      .insert([{ ...userDataWithPlan, password_hash }])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating user:', error);
      throw error;
    }
    
    console.log('User created successfully:', { id: data.id, email: data.email });
    return data;
  }

  /**
   * Crée un utilisateur avec un mot de passe déjà hashé.
   * Cette méthode est utilisée par AuthService pour éviter le double hachage du mot de passe.
   */
  async createWithHash(userData: { 
    email: string; 
    full_name: string; 
    company_name?: string; 
    plan_id?: string; 
    password_hash: string;
  }): Promise<User> {
    // Assign default plan_id if not provided
    const userDataWithPlan = {
      ...userData,
      plan_id: userData.plan_id || this.configService.get<string>('DEFAULT_PLAN_ID')
    };
    
    console.log('Creating user with pre-hashed password for:', { email: userData.email });
    
    // Utiliser l'admin client pour contourner les restrictions RLS
    const { data, error } = await this.supabaseService
      .getAdminClient()
      .from('users')
      .insert([userDataWithPlan])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating user with pre-hashed password:', error);
      throw error;
    }
    
    console.log('User created successfully with pre-hashed password:', { id: data.id, email: data.email });
    return data;
  }

  async findAll(): Promise<User[]> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('users')
      .select('*');
    
    if (error) {
      throw error;
    }
    
    return data;
  }

  async findOne(id: string): Promise<User> {
    console.log(`Recherche utilisateur avec ID: ${id}`);

    const { data, error } = await this.supabaseService
      .getAdminClient() // Utiliser l'admin client pour contourner les RLS
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error(`Erreur lors de la recherche utilisateur avec ID ${id}:`, error);
      throw error;
    }
    
    if (!data) {
      console.error(`Utilisateur avec l'ID ${id} non trouvé`);
      throw new NotFoundException(`Utilisateur avec l'ID ${id} non trouvé`);
    }
    
    console.log(`Utilisateur trouvé: ${id}, ${data.email}`);
    return data;
  }

  async findByEmail(email: string): Promise<User | null> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error) {
      return null;
    }
    
    return data;
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    // Check if password update is requested
    if (updateUserDto.password) {
      const salt = await bcrypt.genSalt();
      const password_hash = await bcrypt.hash(updateUserDto.password, salt);
      
      // Replace password field with password_hash
      const { password, ...userData } = updateUserDto;
      // Utilisez un objet temporaire avec le bon format pour Supabase
      const userDataForUpdate = { ...userData, password_hash };
      
      const { data, error } = await this.supabaseService
        .getClient()
        .from('users')
        .update(userDataForUpdate)
        .eq('id', id)
        .select()
        .single();

      if (error) throw new Error(`Erreur lors de la mise à jour de l'utilisateur: ${error.message}`);
      return data;
    }
    
    // Si pas de mise à jour de mot de passe, on met à jour directement
    const { data, error } = await this.supabaseService
      .getClient()
      .from('users')
      .update(updateUserDto)
      .eq('id', id)
      .select()
      .single();
    
    if (error || !data) {
      throw new NotFoundException(`Utilisateur avec l'ID ${id} non trouvé`);
    }
    
    return data;
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.supabaseService
      .getClient()
      .from('users')
      .delete()
      .eq('id', id);
    
    if (error) {
      throw error;
    }
  }
}
